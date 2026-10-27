/**
 * Decides the final player name from the Tesseract read and the PaddleOCR reads.
 * Pure functions with no browser dependencies, so they can be unit tested.
 *
 * Confidence is always on a 0-100 scale here (PaddleOCR's 0-1 scores are multiplied by 100 before they get here).
 */

export type NameSource = 'tesseract' | 'paddle';

export interface NameCandidate {
  text: string;
  /** 0-100. For Tesseract this is the LOWEST word confidence in the name. */
  conf: number;
  source: NameSource;
}

/** A Tesseract name at or above this is trusted even if PaddleOCR disagrees (measured: correct reads were 90+). */
export const TESSERACT_TRUSTED = 90;
/** Lowest Tesseract confidence still accepted when nothing better exists. */
export const TESSERACT_MIN = 60;
/** A PaddleOCR name at or above this is trusted (measured: correct 0.99, wrong-language junk 0.69). */
export const PADDLE_TRUSTED = 85;
/** Lowest PaddleOCR confidence accepted when Tesseract produced nothing. */
export const PADDLE_ONLY_MIN = 80;

/** Comparison key: letters and digits only, lowercase, so "Long pro310" equals "Longpro310". */
export function nameKey(s: string): string {
  return s
    .normalize('NFC')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]/gu, '');
}

/** Lowercase text without accents; punctuation and spaces are kept ("Trần Đức" -> "tran duc", "x_y" stays "x_y"). */
export function stripAccents(s: string): string {
  return s
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/ı/g, 'i')
    .replace(/İ/g, 'I')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase();
}

/** Like nameKey but also without accents: "Şaban" and "Saban", "Trần Đức" and "Tran Duc" give the same key. */
export function baseLetters(s: string): string {
  return stripAccents(s).replace(/[^\p{L}\p{N}]/gu, '');
}

/** Number of accent marks in a text (used to prefer "Şaban" over "Saban" when both engines agree on the letters). */
function accentCount(s: string): number {
  return (s.normalize('NFD').match(/\p{M}/gu) ?? []).length + (s.match(/[đĐıİ]/g) ?? []).length;
}

function usable(c: NameCandidate | null | undefined): c is NameCandidate {
  return !!c && c.text.trim().length > 0;
}

/** The PaddleOCR candidate that has the same letters as the Tesseract name (accents ignored), if any. */
function findAgreement(tess: NameCandidate | null, paddle: NameCandidate[]): NameCandidate | null {
  if (!usable(tess)) return null;
  const key = baseLetters(tess.text);
  if (key.length === 0) return null;
  const same = paddle.filter((p) => usable(p) && baseLetters(p.text) === key);
  // prefer an exact match (accents included) when there is one
  return same.find((p) => nameKey(p.text) === nameKey(tess.text)) ?? same[0] ?? null;
}

/** True when it is worth downloading and running the extra PaddleOCR language models (Korean, Cyrillic). */
export function needMoreNameReads(tess: NameCandidate | null, paddle: NameCandidate[]): boolean {
  if (findAgreement(tess, paddle)) return false;
  if (usable(tess) && tess.conf >= TESSERACT_TRUSTED) return false;
  if (paddle.some((p) => usable(p) && p.conf >= PADDLE_TRUSTED)) return false;
  return true;
}

/**
 * Final decision, in this order:
 *  1. Tesseract and PaddleOCR agree on the letters -> that name (the version with more accents if they differ)
 *  2. Tesseract is confident (>= 90)               -> Tesseract
 *  3. PaddleOCR is confident (>= 85)               -> PaddleOCR (the most confident one)
 *  4. Tesseract is acceptable (>= 60)              -> Tesseract
 *  5. PaddleOCR is acceptable (>= 80)              -> PaddleOCR
 *  6. otherwise                                    -> '' (the applicant types it; the form is marked uncertain)
 */
export function chooseName(tess: NameCandidate | null, paddle: NameCandidate[]): string {
  const t = usable(tess) ? tess : null;
  const ps = paddle.filter(usable).sort((a, b) => b.conf - a.conf);
  const bestPaddle = ps[0] ?? null;

  const agreed = t ? findAgreement(t, ps) : null;
  if (t && agreed) return accentCount(agreed.text) > accentCount(t.text) ? agreed.text : t.text;
  if (t && t.conf >= TESSERACT_TRUSTED) return t.text;
  if (bestPaddle && bestPaddle.conf >= PADDLE_TRUSTED) return bestPaddle.text;
  if (t && t.conf >= TESSERACT_MIN) return t.text;
  if (bestPaddle && bestPaddle.conf >= PADDLE_ONLY_MIN) return bestPaddle.text;
  return '';
}
