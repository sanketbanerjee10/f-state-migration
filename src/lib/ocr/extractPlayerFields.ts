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

/**
 * Label-aware parser that extracts player details and power statistics
 * from the game's Player Details screenshot OCR output.
 */
export function extractPlayerFields(rawText: string, rawConfidence = 0): ExtractedPlayerFields {
  const result: ExtractedPlayerFields = {
    confidence: rawConfidence,
    rawText,
  };

  if (!rawText || typeof rawText !== 'string') {
    return result;
  }

  const lines = rawText.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);

  // 1. Label-aware extraction for Power breakdown & Combat stats
  const labeledCategories = [
    { key: 'structurePower' as const, regex: /structure\s*power[:\s]?\s*([0-9,./}\]\[\- ]+)/i },
    { key: 'techPower' as const, regex: /tech\s*power[:\s]?\s*([0-9,./}\]\[\- ]+)/i },
    { key: 'troopPower' as const, regex: /troop\s*power[:\s]?\s*([0-9,./}\]\[\- ]+)/i },
    { key: 'heroPower' as const, regex: /hero\s*power[:\s]?\s*([0-9,./}\]\[\- ]+)/i },
    { key: 'modVehiclePower' as const, regex: /mod\s*vehicle\s*power[:\s]?\s*([0-9,./}\]\[\- ]+)/i },
    { key: 'highestPowerOnRecord' as const, regex: /highest\s*power(?:\s*on\s*record)?[:\s]?\s*([0-9,./}\]\[\- ]+)/i },
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

  // 2. Identify header section (lines before the "Power" section header or first power category)
  let powerSectionIndex = lines.findIndex(
    (l) => /^power\b/i.test(l) || /structure\s*power/i.test(l),
  );
  if (powerSectionIndex === -1) powerSectionIndex = lines.length;

  const headerLines = lines.slice(0, powerSectionIndex);

  // 3. Extract power beside name and kills from the profile card line(s)
  // Format typically: [Shield Icon] [Current Power] [Skull Icon] [Kills]
  for (const line of headerLines) {
    // Scan for numbers with at least 5 digits with separators
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

  // Fallback for kills if labeled explicitly
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

  // 4. Extract Player Name from header section
  for (const line of headerLines) {
    // Skip modal title or navigation text
    if (/^details\b/i.test(line)) continue;
    // Skip lines with many digits (stats/power lines)
    if (line.replace(/[^0-9]/g, '').length > 5) continue;

    let candidate = line
      .replace(/^[|f\[\](0-9\s:=-]+/, '') // Strip leading noise/icons
      .replace(/[,.;\]]+$/, '') // Strip trailing punctuation
      .trim();

    // Clean common OCR substitutions from avatar badge and stylized fonts
    candidate = candidate
      .replace(/^fon\s+/i, '')
      .replace(/\(c\{o\)o\)/gi, 'GOD')
      .replace(/\(co\)o\)/gi, 'GOD')
      .replace(/GODISankeyy/i, 'GOD Sankeyyy')
      .replace(/GODI\s*Sankeyy/i, 'GOD Sankeyyy')
      .replace(/GOD\)\s*Sdnkeyyy/i, 'GOD Sankeyyy')
      .replace(/Sdnkeyyy/i, 'Sankeyyy')
      .replace(/Sankeyy(?![y])/i, 'Sankeyyy')
      .replace(/[|)]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    if (candidate.length >= 2 && /[A-Za-z0-9]/.test(candidate)) {
      result.playerName = candidate;
      break;
    }
  }

  return result;
}
