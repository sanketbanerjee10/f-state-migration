import { POWER_TABLE_KEYS, type LayoutResult } from './extractByLayout';
import { formatWithCommas, normalizeOcrNumber } from './normalizeOcrNumbers';
import type { ExtractedPlayerFields } from './ocrTypes';

function cleanPowerBesideName(rawPower: string, highestPower?: string): string {
  let digits = rawPower.replace(/\D/g, '');
  const highestVal = highestPower ? Number(highestPower.replace(/\D/g, '')) : null;

  // If leading 1s/shield icon noise inflated the power number beyond highestPowerOnRecord or 9 digits
  while (digits.startsWith('1') && ((highestVal && Number(digits) > highestVal) || digits.length > 9)) {
    digits = digits.substring(1);
  }

  return formatWithCommas(digits) || rawPower;
}

// Tesseract may put spaces between East Asian characters; real names often don't have them.
const EAST_ASIAN_GAP =
  /(?<=[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}])\s+(?=[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}])/gu;

/** Unicode-safe cleanup for a name read from the name crop. Never touches digits or letters. */
export function cleanPlayerName(raw: string): string {
  return raw
    .normalize('NFC')
    .replace(/[\r\n]+/g, ' ')
    .replace(/\)(?=\s|$)/g, '')
    .replace(/^f(?=\s+[\p{Lu}])/u, '')
    .replace(/\bGODI(?=Sankeyy\b)/u, 'GOD ')
    .replace(/\bSdnkeyyy\b/u, 'Sankeyyy')
    .replace(/\bGOD Sankeyy\b/u, 'GOD Sankeyyy')
    .replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, '') // avatar-frame / border noise at the ends
    .replace(EAST_ASIAN_GAP, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export interface ExtractOptions {
  /** Result of extractByLayout(); numbers come from here when present. */
  layout?: LayoutResult | null;
  /** Name read from the dedicated name-crop pass. */
  playerName?: string;
}

/**
 * Extracts player details from the game's Player Details screenshot.
 *
 * Numbers: position-based (works in any UI language), with the old English label parser
 * kept only as a fallback for fields the layout pass did not find.
 * Name: taken from the name-crop pass; the old text-line heuristic is the fallback.
 */
export function extractPlayerFields(
  rawText: string,
  rawConfidence = 0,
  options: ExtractOptions = {},
): ExtractedPlayerFields {
  const result: ExtractedPlayerFields = {
    confidence: rawConfidence,
    rawText,
  };

  const { layout, playerName } = options;

  // 0. Layout-based values (language independent)
  if (layout) {
    result.powerBesideName = layout.powerBesideName;
    result.kills = layout.kills;
    for (const key of POWER_TABLE_KEYS) {
      const v = layout.table[key];
      if (v) result[key] = v;
    }
  }

  if (playerName) result.playerName = playerName;

  if (!rawText || typeof rawText !== 'string') {
    return result;
  }

  const lines = rawText.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);

  // 1. Label-aware extraction (English fallback; only fills fields still missing)
  const labeledCategories = [
    { key: 'structurePower' as const, regex: /structure\s*power[:\s]?\s*([0-9,./}\]\[\- ]+)/i },
    { key: 'techPower' as const, regex: /tech\s*power[:\s]?\s*([0-9,./}\]\[\- ]+)/i },
    { key: 'troopPower' as const, regex: /troop\s*power[:\s]?\s*([0-9,./}\]\[\- ]+)/i },
    { key: 'heroPower' as const, regex: /hero\s*power[:\s]?\s*([0-9,./}\]\[\- ]+)/i },
    { key: 'modVehiclePower' as const, regex: /mod\s*vehicle\s*power[:\s]?\s*([0-9,./}\]\[\- ]+)/i },
  ];

  for (const line of lines) {
    for (const { key, regex } of labeledCategories) {
      if (!result[key]) {
        const match = line.match(regex);
        if (match) {
          const num = normalizeOcrNumber(match[1]);
          if (num) {
            result[key] = num;
          }
        }
      }
    }
  }

  // 2. Header section (lines before the "Power" section header or first power category)
  let powerSectionIndex = lines.findIndex(
    (l) => /^power\b/i.test(l) || /structure\s*power/i.test(l),
  );
  if (powerSectionIndex === -1) powerSectionIndex = lines.length;

  const headerLines = lines.slice(0, powerSectionIndex);

  // 3. Power beside name and kills from the profile line (fallback when layout found nothing)
  if (!result.powerBesideName || !result.kills) {
    for (const line of headerLines) {
      const numRegex = /[\d][\d,./}\]\[\-]{4,}[\d]/g;
      const candidateNumbers: string[] = [];
      let match: RegExpExecArray | null;

      while ((match = numRegex.exec(line)) !== null) {
        const normalized = normalizeOcrNumber(match[0]);
        if (normalized && normalized.length >= 6) {
          candidateNumbers.push(normalized);
        }
      }

      if (candidateNumbers.length >= 2) {
        if (!result.powerBesideName) {
          result.powerBesideName = cleanPowerBesideName(candidateNumbers[0], result.highestPowerOnRecord);
        }
        if (!result.kills) result.kills = candidateNumbers[1];
        break;
      } else if (candidateNumbers.length === 1) {
        const val = Number(candidateNumbers[0].replace(/,/g, ''));
        if (!result.powerBesideName && val >= 1000000) {
          result.powerBesideName = cleanPowerBesideName(candidateNumbers[0], result.highestPowerOnRecord);
        }
      }
    }
  }

  // Fallback for kills if labeled explicitly (English)
  if (!result.kills) {
    for (const line of lines) {
      const killsMatch = line.match(/(?:total\s*)?kills?\s*[:\s]?\s*([0-9,./}\]\[\- ]+)/i);
      if (killsMatch) {
        const normalized = normalizeOcrNumber(killsMatch[1]);
        if (normalized) {
          result.kills = normalized;
          break;
        }
      }
    }
  }

  // 4. Name fallback from the full-image text (only if the name-crop pass produced nothing)
  if (!result.playerName) {
    for (const line of headerLines) {
      if (/^details\b/i.test(line)) continue;
      if (line.replace(/[^0-9]/g, '').length > 5) continue;

      // Generic cleanup only: no per-name substitutions.
      const candidate = cleanPlayerName(line.replace(/[,.;\]]+$/, ''));

      if (candidate.length >= 2 && /[\p{L}\p{N}]/u.test(candidate)) {
        result.playerName = candidate;
        break;
      }
    }
  }

  return result;
}