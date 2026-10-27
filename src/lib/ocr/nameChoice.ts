export type NameSource = 'tesseract' | 'paddle';

export interface NameCandidate {
  text: string;
  /** Confidence on a 0-100 scale. */
  conf: number;
  source: NameSource;
}

export const TESSERACT_TRUSTED = 90;
export const TESSERACT_MIN = 60;
export const PADDLE_TRUSTED = 85;
export const PADDLE_ONLY_MIN = 80;

export function nameKey(value: string): string {
  return value
    .normalize('NFC')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]/gu, '');
}

function baseLetters(value: string): string {
  return value
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/[ıİ]/g, 'i')
    .replace(/[đĐ]/g, 'd')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]/gu, '');
}

function usable(candidate: NameCandidate | null | undefined): candidate is NameCandidate {
  return !!candidate && candidate.text.trim().length > 0;
}

function accentCount(value: string): number {
  return (value.normalize('NFD').match(/\p{M}/gu) ?? []).length + (value.match(/[đĐıİ]/g) ?? []).length;
}

function findAgreement(tesseract: NameCandidate | null, paddle: NameCandidate[]): NameCandidate | null {
  if (!usable(tesseract)) return null;
  const key = baseLetters(tesseract.text);
  if (!key) return null;
  const matches = paddle.filter((candidate) => usable(candidate) && baseLetters(candidate.text) === key);
  return matches.find((candidate) => nameKey(candidate.text) === nameKey(tesseract.text)) ?? matches[0] ?? null;
}

export function needMoreNameReads(tesseract: NameCandidate | null, paddle: NameCandidate[]): boolean {
  if (findAgreement(tesseract, paddle)) return false;
  if (usable(tesseract) && tesseract.conf >= TESSERACT_TRUSTED) return false;
  if (paddle.some((candidate) => usable(candidate) && candidate.conf >= PADDLE_TRUSTED)) return false;
  return true;
}

export function chooseName(tesseract: NameCandidate | null, paddle: NameCandidate[]): string {
  const selectedTesseract = usable(tesseract) ? tesseract : null;
  const candidates = paddle.filter(usable).sort((a, b) => b.conf - a.conf);
  const bestPaddle = candidates[0] ?? null;
  const agreed = findAgreement(selectedTesseract, candidates);

  if (selectedTesseract && agreed) {
    return accentCount(agreed.text) > accentCount(selectedTesseract.text)
      ? agreed.text
      : selectedTesseract.text;
  }
  if (selectedTesseract && selectedTesseract.conf >= TESSERACT_TRUSTED) return selectedTesseract.text;
  if (bestPaddle && bestPaddle.conf >= PADDLE_TRUSTED) return bestPaddle.text;
  if (selectedTesseract && selectedTesseract.conf >= TESSERACT_MIN) return selectedTesseract.text;
  if (bestPaddle && bestPaddle.conf >= PADDLE_ONLY_MIN) return bestPaddle.text;
  return '';
}