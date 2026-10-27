import { formatWithCommas, normalizeOcrNumber } from './normalizeOcrNumbers';
import { readHeader, splitMergedNumbers } from './headerNumbers';

export interface OcrBox {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

export interface OcrWord {
  text: string;
  bbox: OcrBox;
}

export const POWER_TABLE_KEYS = [
  'structurePower',
  'techPower',
  'troopPower',
  'heroPower',
  'modVehiclePower',
] as const;

export type PowerTableKey = (typeof POWER_TABLE_KEYS)[number];

export interface LayoutResult {
  /** Formatted with commas, e.g. "234,142,924" */
  powerBesideName: string;
  kills: string;
  table: Partial<Record<PowerTableKey, string>>;
  tableRows: number;
  /** True when the five table rows add up exactly to powerBesideName. */
  sumMatches: boolean;
  powerBox: OcrBox;
  killsBox: OcrBox;
}

interface Tok {
  value: number;
  box: OcrBox;
  text: string;
}

const midY = (b: OcrBox) => (b.y0 + b.y1) / 2;

function median(xs: number[]): number {
  const s = [...xs].sort((a, b) => a - b);
  return s[Math.floor(s.length / 2)] ?? 0;
}

function toTokens(words: OcrWord[]): Tok[] {
  const toks: Tok[] = [];
  for (const w of words) {
    if (!w?.bbox || typeof w.text !== 'string') continue;
    // Real numbers only: skips labels in any language and icon noise.
    if ((w.text.match(/\d/g) ?? []).length < 3) continue;
    const normalized = normalizeOcrNumber(w.text);
    const digits = w.text.replace(/\D/g, '');
    const value = normalized
      ? Number(normalized.replace(/\D/g, ''))
      : digits.length <= 16
        ? Number(digits)
        : Number.NaN;
    if (Number.isSafeInteger(value)) toks.push({ value, box: w.bbox, text: w.text });
  }
  return toks;
}

function groupRows(toks: Tok[]): Tok[][] {
  if (!toks.length) return [];
  const tol = median(toks.map((t) => t.box.y1 - t.box.y0)) * 0.6;
  const rows: Tok[][] = [];
  for (const t of [...toks].sort((a, b) => midY(a.box) - midY(b.box))) {
    const row = rows.find((r) => Math.abs(midY(r[0].box) - midY(t.box)) < tol);
    if (row) row.push(t);
    else rows.push([t]);
  }
  rows.forEach((r) => r.sort((a, b) => a.box.x0 - b.box.x0));
  return rows;
}

/**
 * Reads the Player Details card by position, not by label, so it works in any UI language.
 *
 *   header row : [power beside name]  [kills]     <- the first row with two numbers
 *   table rows : structure, tech, troop, hero, mod vehicle  <- five single-number rows below it
 */
export function extractByLayout(words: OcrWord[]): LayoutResult | null {
  const rows = groupRows(toTokens(words));

  let hi = -1;
  for (let i = 0; i < rows.length; i++) {
    if (rows[i].length < 2) continue;
    const next = rows.slice(i + 1, i + 6);
    if (next.length === 5 && next.every((r) => r.length === 1)) {
      hi = i;
      break;
    }
    if (hi < 0) hi = i; // fallback: first two-number row
  }
  if (hi < 0) {
    for (let i = 0; i < rows.length; i++) {
      const headerRow = rows[i];
      const followingRows = rows.slice(i + 1, i + 6);
      if (headerRow.length !== 1 || followingRows.length !== POWER_TABLE_KEYS.length) continue;
      if (!followingRows.every((row) => row.length === 1)) continue;

      const tableToks = followingRows.map((row) => row[0]);
      const sum = tableToks.reduce((total, token) => total + token.value, 0);
      const headerRead = readHeader(headerRow[0].text, sum);
      if (!headerRead.power || !headerRead.kills || splitMergedNumbers(headerRow[0].text).length < 2) continue;

      const table: LayoutResult['table'] = {};
      tableToks.forEach((token, index) => {
        table[POWER_TABLE_KEYS[index]] = formatWithCommas(String(token.value));
      });
      return {
        powerBesideName: formatWithCommas(headerRead.power),
        kills: formatWithCommas(headerRead.kills),
        table,
        tableRows: tableToks.length,
        sumMatches: headerRead.matched,
        powerBox: headerRow[0].box,
        killsBox: headerRow[0].box,
      };
    }
    return null;
  }

  const header = rows[hi];
  const power = header[0];
  const kills = header[header.length - 1];

  const tableToks = rows
    .slice(hi + 1)
    .filter((r) => r.length === 1)
    .slice(0, POWER_TABLE_KEYS.length)
    .map((r) => r[0]);

  const sum = tableToks.reduce((a, t) => a + t.value, 0);
  let powerDigits = String(power.value);
  let sumMatches = tableToks.length === POWER_TABLE_KEYS.length && power.value === sum;

  if (!sumMatches && tableToks.length === POWER_TABLE_KEYS.length) {
    // Shield icon glued onto the front of the number: drop leading chars until it matches the sum.
    let d = powerDigits;
    while (d.length > 1 && d.length >= String(sum).length) {
      d = d.slice(1);
      if (Number(d) === sum) {
        powerDigits = d;
        sumMatches = true;
        break;
      }
    }
  }
  if (!sumMatches) {
    // Previous heuristic: a leading "1" on a number longer than 9 digits is icon noise.
    while (powerDigits.startsWith('1') && powerDigits.length > 9) {
      powerDigits = powerDigits.slice(1);
    }
  }

  const table: LayoutResult['table'] = {};
  tableToks.forEach((t, i) => {
    table[POWER_TABLE_KEYS[i]] = formatWithCommas(String(t.value));
  });

  return {
    powerBesideName: formatWithCommas(powerDigits),
    kills: formatWithCommas(String(kills.value)),
    table,
    tableRows: tableToks.length,
    sumMatches,
    powerBox: power.box,
    killsBox: kills.box,
  };
}

/**
 * Crop rectangle for the player name, derived from where the header numbers were found.
 * The ratios are tuned to the sample screenshot; adjust them if your other screenshots differ.
 */
export function nameCropRect(layout: LayoutResult, imgW: number, imgH: number) {
  const p = layout.powerBox;
  const h = Math.max(1, p.y1 - p.y0);
  const x0 = Math.max(0, Math.floor(p.x0 - 5.2 * h));
  const y0 = Math.max(0, Math.floor(p.y0 - 2.4 * h));
  const x1 = Math.min(imgW, Math.ceil(layout.killsBox.x1 + 2 * h));
  const y1 = Math.min(imgH, Math.ceil(p.y0 - 0.7 * h));
  return { x: x0, y: y0, w: Math.max(1, x1 - x0), h: Math.max(1, y1 - y0) };
}
