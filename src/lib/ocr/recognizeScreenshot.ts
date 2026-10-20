import { createWorker, PSM } from 'tesseract.js';
import { extractPlayerFields } from './extractPlayerFields';
import type { OcrProgressInfo, OcrRecognitionResult } from './ocrTypes';

/**
 * Browser-only OCR execution using Tesseract.js.
 * The screenshot is processed entirely on the client's device; no image is transmitted.
 */
export async function recognizeScreenshot(
  file: File,
  onProgress?: (progress: OcrProgressInfo) => void,
  signal?: AbortSignal,
): Promise<OcrRecognitionResult> {
  if (signal?.aborted) {
    throw new DOMException('OCR cancelled', 'AbortError');
  }

  const worker = await createWorker('eng', 1, {
    logger: (message: { status?: string; progress?: number }) => {
      if (onProgress) {
        onProgress({
          status: message.status || 'Analyzing image',
          progress: Math.min(100, Math.max(0, Math.round((message.progress || 0) * 100))),
        });
      }
    },
  });

  const stopWorker = () => {
    void worker.terminate();
  };
  if (signal) {
    signal.addEventListener('abort', stopWorker, { once: true });
  }

  try {
    if (signal?.aborted) {
      throw new DOMException('OCR cancelled', 'AbortError');
    }

    // Set page segmentation mode to SINGLE_COLUMN for clean vertical stat card layout
    await worker.setParameters({
      tessedit_pageseg_mode: PSM.SINGLE_COLUMN,
    });

    const { data } = await worker.recognize(file);
    if (signal?.aborted) {
      throw new DOMException('OCR cancelled', 'AbortError');
    }

    const text = data.text || '';
    const confidence = data.confidence || 0;
    const extracted = extractPlayerFields(text, confidence);

    return {
      text,
      confidence,
      extracted,
    };
  } finally {
    if (signal) {
      signal.removeEventListener('abort', stopWorker);
    }
    await worker.terminate();
  }
}
