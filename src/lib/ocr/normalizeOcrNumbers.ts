/**
 * Normalizes numbers extracted from OCR text.
 * Corrects typical OCR letter/separator confusions and formats as standard comma-separated integers.
 */

export function cleanOcrDigits(raw: string): string {
  if (!raw) return '';
  return raw
    .trim()
    // Replace common OCR character misreads when appearing in number positions
    .replace(/[Oo]/g, '0')
    .replace(/[Il|!]/g, '1')
    .replace(/[Ss](?=\d|\b)/g, '5')
    .replace(/[B](?=\d|\b)/g, '8')
    // Remove extraneous non-numeric, non-separator symbols
    .replace(/[^\d,./}\]\[\- ]/g, '');
}

/**
 * Formats a numeric value or digit string with comma thousands separators.
 * Preserves exact numeric precision without rounding or converting to millions.
 */
export function formatWithCommas(value: number | string | bigint): string {
  const digitsOnly = String(value).replace(/\D/g, '');
  if (!digitsOnly) return '';
  return digitsOnly.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

/**
 * Normalizes an OCR number string into a clean comma-separated integer string.
 * Example inputs:
 *  "242/242,381" -> "242,242,381"
 *  "84,785,628"  -> "84,785,628"
 *  "5,453,196"   -> "5,453,196"
 *  "281.459.207" -> "281,459,207"
 */
export function normalizeOcrNumber(raw: string): string | null {
  if (!raw || typeof raw !== 'string') return null;

  // 1. Clean up characters
  const cleaned = cleanOcrDigits(raw);
  if (!cleaned) return null;

  // 2. Extract consecutive digits after stripping separators
  const digits = cleaned.replace(/[^0-9]/g, '');
  if (!digits || digits.length < 1) return null;

  // Sanity check: reasonable game stats between 1 and 100,000,000,000
  if (digits.length > 12) return null;

  return formatWithCommas(digits);
}

/**
 * Parses a normalized OCR number string into an integer number.
 */
export function parseOcrNumberToInteger(raw: string): number | null {
  const normalized = normalizeOcrNumber(raw);
  if (!normalized) return null;
  const num = Number(normalized.replace(/,/g, ''));
  return Number.isSafeInteger(num) && num >= 0 ? num : null;
}
