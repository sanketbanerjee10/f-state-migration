export * from './ocr/ocrTypes';
export * from './ocr/normalizeOcrNumbers';
export * from './ocr/extractPlayerFields';
export * from './ocr/recognizeScreenshot';

// Backward-compatible alias for existing imports
export { extractPlayerFields as extractLikelyFields } from './ocr/extractPlayerFields';
export type { OcrProgressInfo as OcrProgress } from './ocr/ocrTypes';
