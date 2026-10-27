import { createWorker, PSM, type Worker } from 'tesseract.js';
import { extractByLayout, nameCropRect, type LayoutResult, type OcrWord } from './extractByLayout';
import { chooseHeader, readHeader, splitMergedNumbers, type HeaderRead } from './headerNumbers';
import { cleanPlayerName, extractPlayerFields } from './extractPlayerFields';
import { colSpans, cropRaster, maskToCanvas, rowBands, whiteTextMask } from './rasterOps';
import { formatWithCommas } from './normalizeOcrNumbers';
import { chooseName, needMoreNameReads, type NameCandidate } from './nameChoice';
import { cropToCanvas as paddleCropToCanvas, extraModelOrder, PaddleBanner } from './paddleBanner';
import type { OcrDiagnostics, OcrProgressInfo, OcrRecognitionResult } from './ocrTypes';

/** Set to e.g. '/tessdata' once you self-host the .traineddata(.gz) files. */
const LANG_PATH: string | undefined = undefined;

/**
 * Language sets tried, in order, on the name crop. Each set's trained data is only
 * downloaded if the earlier sets did not produce a confident result.
 * Keep 'eng' in every set: names often mix scripts, e.g. "빈체로 Ally".
 */
const NAME_LANGUAGE_SETS: Array<{ languages: string[]; nativeScript?: RegExp }> = [
  { languages: ['eng'] },
  { languages: ['kor', 'eng'], nativeScript: /\p{Script=Hangul}/u },
  { languages: ['jpn', 'eng'], nativeScript: /[\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Han}]/u },
  { languages: ['chi_sim', 'eng'], nativeScript: /\p{Script=Han}/u },
  { languages: ['chi_tra', 'eng'], nativeScript: /\p{Script=Han}/u },
  { languages: ['rus', 'eng'], nativeScript: /\p{Script=Cyrillic}/u },
];
const LATIN_NAME_CONFIDENCE = 50;
const NATIVE_NAME_CONFIDENCE = 50;
const LATIN_ONLY = /^[\p{Script=Latin}\p{N}\p{P}\p{S}\s]+$/u;

type PageLike = {
  words?: OcrWord[];
  blocks?: { paragraphs?: { lines?: { words?: OcrWord[] }[] }[] }[] | null;
};

// tesseract.js v5 exposes data.words; v6+ exposes blocks -> paragraphs -> lines -> words.
function collectWords(data: PageLike): OcrWord[] {
  if (Array.isArray(data.words) && data.words.length) return data.words;
  const out: OcrWord[] = [];
  for (const b of data.blocks ?? []) {
    for (const p of b.paragraphs ?? []) {
      for (const l of p.lines ?? []) out.push(...(l.words ?? []));
    }
  }
  return out;
}

function cropToCanvas(bmp: ImageBitmap, rect: { x: number; y: number; w: number; h: number }, scale = 3) {
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(rect.w * scale);
  canvas.height = Math.round(rect.h * scale);
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas unavailable');
  ctx.imageSmoothingQuality = 'high';
  // If names read poorly, try adding invert(1) here (the name is light text on a tan banner).
  ctx.filter = 'grayscale(1) contrast(1.4)';
  ctx.drawImage(bmp, rect.x, rect.y, rect.w, rect.h, 0, 0, canvas.width, canvas.height);
  return canvas;
}

function maskTextCanvas(
  bmp: ImageBitmap,
  rect: { x: number; y: number; w: number; h: number },
  scale: number,
  threshold: number,
  ignoreLeftFraction = 0,
): HTMLCanvasElement | null {
  const raster = cropRaster(bmp, rect, scale);
  const mask = whiteTextMask(raster, threshold);
  const candidates = rowBands(mask, raster.width, raster.height).flatMap(([y0, y1]) => {
    const spans = colSpans(mask, raster.width, y0, y1).filter(([x0]) => x0 >= raster.width * ignoreLeftFraction);
    if (!spans.length) return [];
    const x0 = spans[0][0];
    const x1 = spans[spans.length - 1][1];
    return [{ x0, x1, y0, y1, score: (x1 - x0 + 1) * (y1 - y0 + 1) }];
  });
  candidates.sort((a, b) => b.score - a.score);
  const band = candidates[0];
  if (!band) return null;
  return maskToCanvas(mask, raster.width, band, 16);
}

function layoutTableSum(layout: LayoutResult): number | null {
  const values = [
    layout.table.structurePower,
    layout.table.techPower,
    layout.table.troopPower,
    layout.table.heroPower,
    layout.table.modVehiclePower,
  ];
  if (values.some((value) => !value)) return null;
  return values.reduce((total, value) => total + Number(value?.replace(/\D/g, '')), 0);
}

/**
 * Browser-only OCR execution using Tesseract.js.
 * The screenshot is processed entirely on the client's device; no image is transmitted.
 *
 * Pass 1 (eng):   numbers, located by position so the UI language does not matter.
 * Pass 2 (multi): the name, from a crop positioned relative to the numbers.
 */
export async function recognizeScreenshot(
  file: File,
  onProgress?: (progress: OcrProgressInfo) => void,
  signal?: AbortSignal,
): Promise<OcrRecognitionResult> {
  if (signal?.aborted) {
    throw new DOMException('OCR cancelled', 'AbortError');
  }

  const workers = new Set<Worker>();
  const stopAll = () => {
    workers.forEach((w) => void w.terminate().catch(() => undefined));
  };
  if (signal) {
    signal.addEventListener('abort', stopAll, { once: true });
  }
  const throwIfAborted = () => {
    if (signal?.aborted) throw new DOMException('OCR cancelled', 'AbortError');
  };
  const paddle = new PaddleBanner();
  const diagnostics: OcrDiagnostics = {
    paddleAvailable: false,
    tesseract: { fullText: '', confidence: 0, headerReads: [], nameReads: [] },
    paddle: { statsText: '', nameReads: [] },
  };

  let lastProgress = 0;
  const spawn = async (langs: string[], from: number, to: number) => {
    throwIfAborted();
    const worker = await createWorker(langs, 1, {
      ...(LANG_PATH ? { langPath: LANG_PATH } : {}),
      logger: (m: { status?: string; progress?: number }) => {
        if (!onProgress) return;
        const frac = Math.min(1, Math.max(0, m.progress || 0));
        lastProgress = Math.max(lastProgress, Math.round(from + (to - from) * frac)); // never goes backwards
        onProgress({ status: m.status || 'Analyzing image', progress: lastProgress });
      },
    });
    workers.add(worker);
    if (signal?.aborted) stopAll();
    return worker;
  };
  const release = async (worker: Worker) => {
    workers.delete(worker);
    await worker.terminate().catch(() => undefined);
  };

  try {
    const paddleReady = await paddle.load();
    diagnostics.paddleAvailable = paddleReady;
    // ---- Pass 1: numbers -------------------------------------------------
    const numWorker = await spawn(['eng'], 0, 60);
    await numWorker.setParameters({ tessedit_pageseg_mode: PSM.SINGLE_COLUMN });

    // output flags are the tesseract.js v6+ signature; on v5 use plain recognize(file)
    const first = await numWorker.recognize(file, {}, { text: true, blocks: true });
    throwIfAborted();

    let text = first.data.text || '';
    let ocrConfidence = first.data.confidence || 0;
    diagnostics.tesseract.fullText = text;
    diagnostics.tesseract.confidence = ocrConfidence;
    let layout: LayoutResult | null = extractByLayout(collectWords(first.data));

    // Retry once, digits only, if the five rows did not add up to the header power.
    if (!layout || !layout.sumMatches) {
      await numWorker.setParameters({
        tessedit_pageseg_mode: PSM.SPARSE_TEXT,
        tessedit_char_whitelist: '0123456789,',
      });
      const second = await numWorker.recognize(file, {}, { text: true, blocks: true });
      throwIfAborted();
      const retryLayout = extractByLayout(collectWords(second.data));
      if (retryLayout && (!layout || retryLayout.sumMatches)) {
        layout = retryLayout;
        text = first.data.text || second.data.text || ''; // keep the label text for the English fallback
        ocrConfidence = second.data.confidence || ocrConfidence;
        diagnostics.tesseract.fullText = text;
        diagnostics.tesseract.confidence = ocrConfidence;
      }
    }
    await release(numWorker);

    if (layout) {
      const sum = layoutTableSum(layout);
      if (sum !== null) {
        const headerHeight = Math.max(1, layout.powerBox.y1 - layout.powerBox.y0);
        const rect = {
          x: Math.max(0, layout.powerBox.x0 - headerHeight * 0.6),
          y: Math.max(0, Math.min(layout.powerBox.y0, layout.killsBox.y0) - headerHeight * 0.2),
          w: Math.max(1, layout.killsBox.x1 - layout.powerBox.x0 + headerHeight * 0.8),
          h: Math.max(
            1,
            Math.max(layout.powerBox.y1, layout.killsBox.y1) -
              Math.min(layout.powerBox.y0, layout.killsBox.y0) +
              headerHeight * 0.4,
          ),
        };
        const bmp = await createImageBitmap(file);
        try {
          const paddleStats = paddleReady
            ? await paddle.readStats(paddleCropToCanvas(bmp, rect))
            : null;
          diagnostics.paddle.statsText = paddleStats || '';
          const paddleHeader = paddleStats ? readHeader(paddleStats, sum) : null;
          const headerWorker = await spawn(['eng'], 60, 72);
          const reads: HeaderRead[] = [];
          const killsReads: string[] = [];
          if (paddleHeader) {
            reads.push(paddleHeader);
            if (paddleHeader.kills) killsReads.push(paddleHeader.kills);
          }
          try {
            await headerWorker.setParameters({
              tessedit_pageseg_mode: PSM.SINGLE_LINE,
              tessedit_char_whitelist: '0123456789,',
            });
            for (const scale of [2, 3]) {
              for (const threshold of [155, 180, 205]) {
                const canvas = maskTextCanvas(bmp, rect, scale, threshold);
                if (canvas) {
                  const { data } = await headerWorker.recognize(canvas);
                  throwIfAborted();
                  diagnostics.tesseract.headerReads.push(data.text || '');
                  reads.push(readHeader(data.text || '', sum));
                }

                const killsX = Math.min(
                  layout.killsBox.x1,
                  layout.killsBox.x0 + headerHeight * 1.2,
                );
                const killsRect = {
                  x: killsX,
                  y: layout.killsBox.y0,
                  w: Math.max(1, layout.killsBox.x1 - killsX),
                  h: Math.max(1, layout.killsBox.y1 - layout.killsBox.y0),
                };
                const killsCanvas = maskTextCanvas(bmp, killsRect, scale, threshold);
                if (killsCanvas) {
                  const killsResult = await headerWorker.recognize(killsCanvas);
                  throwIfAborted();
                  const digits = splitMergedNumbers(killsResult.data.text || '');
                  const candidate = digits.find((value) => value.length >= 4 && value.length <= 12);
                  if (candidate) killsReads.push(candidate);
                }
              }
            }
          } finally {
            await release(headerWorker);
          }

          const header = chooseHeader(reads);
          if (header.matched && header.power) {
            layout = {
              ...layout,
              powerBesideName: formatWithCommas(header.power),
              sumMatches: true,
            };
          }
          if (header.kills && header.consistent) {
            layout = { ...layout, kills: formatWithCommas(header.kills) };
          }
          const killsChoice = chooseHeader(
            killsReads.map((kills) => ({
              power: header.power ?? String(sum),
              kills,
              matched: true,
            })),
          );
          if (killsChoice.consistent && killsChoice.kills) {
            layout = { ...layout, kills: formatWithCommas(killsChoice.kills) };
          }
        } finally {
          bmp.close();
        }
      }
    }

    // ---- Pass 2: name ----------------------------------------------------
    let playerName = '';
    if (layout) {
      const bmp = await createImageBitmap(file);
      try {
        const rect = nameCropRect(layout, bmp.width, bmp.height);
        const originalCanvas = cropToCanvas(bmp, rect);
        const canvas = maskTextCanvas(bmp, rect, 4, 175) ?? originalCanvas;
        const hasMaskedCanvas = canvas !== originalCanvas;
        let best = { conf: -1, name: '' };
        let bestLatin = { conf: -1, name: '' };
        let bestNative = { conf: -1, name: '' };

        for (const { languages, nativeScript } of NAME_LANGUAGE_SETS) {
          const w = await spawn(languages, 60, 100);
          try {
            await w.setParameters({ tessedit_pageseg_mode: PSM.SINGLE_LINE });
            for (const input of hasMaskedCanvas ? [canvas, originalCanvas] : [canvas]) {
              const { data } = await w.recognize(input);
              throwIfAborted();
              const name = cleanPlayerName(data.text || '');
              const conf = data.confidence || 0;
              if (name) diagnostics.tesseract.nameReads.push({ text: name, conf });
              if (name && conf > best.conf) best = { conf, name };
              if (
                languages.length === 1 &&
                name &&
                /[\p{Script=Latin}]{2}/u.test(name) &&
                LATIN_ONLY.test(name) &&
                conf > bestLatin.conf
              ) {
                bestLatin = { conf, name };
              }
              if (name && nativeScript?.test(name) && conf > bestNative.conf) {
                bestNative = { conf, name };
              }
            }
          } finally {
            await release(w);
          }
          if (bestNative.conf >= NATIVE_NAME_CONFIDENCE) break;
          if (languages[0] === 'kor' && bestLatin.conf >= LATIN_NAME_CONFIDENCE) break;
        }
        const primaryName =
          bestNative.conf >= NATIVE_NAME_CONFIDENCE
            ? bestNative
            : bestLatin.conf >= LATIN_NAME_CONFIDENCE
              ? bestLatin
              : best;
        const tesseractName = primaryName.name
          ? { text: primaryName.name, conf: primaryName.conf, source: 'tesseract' as const }
          : null;
        const paddleNames: NameCandidate[] = [];
        if (paddleReady) {
          const paddleNameCanvas = paddleCropToCanvas(bmp, rect);
          const v6Name = await paddle.readName(paddleNameCanvas, 'v6');
          if (v6Name) {
            paddleNames.push(v6Name);
            diagnostics.paddle.nameReads.push({ model: 'v6', text: v6Name.text, conf: v6Name.conf });
          }
          if (needMoreNameReads(tesseractName, paddleNames)) {
            for (const model of extraModelOrder()) {
              const candidate = await paddle.readName(paddleNameCanvas, model);
              if (candidate) {
                paddleNames.push(candidate);
                diagnostics.paddle.nameReads.push({ model, text: candidate.text, conf: candidate.conf });
              }
              if (!needMoreNameReads(tesseractName, paddleNames)) break;
            }
          }
        }
        playerName = chooseName(tesseractName, paddleNames);
      } finally {
        bmp.close();
      }
    }

    // ---- Assemble in the existing result shape ---------------------------
    // Fold the sum check into confidence so the existing form logic (uncertain when < 55) reacts to it:
    // rows add up exactly -> strong verification; rows found but no match -> ask the applicant to verify.
    let confidence = ocrConfidence;
    if (layout) {
      confidence = layout.sumMatches ? Math.max(confidence, 90) : Math.min(confidence, 54);
    }
    const extracted = extractPlayerFields(text, confidence, { layout, playerName });

    return { text, confidence, extracted, diagnostics };
  } catch (err) {
    if (signal?.aborted) throw new DOMException('OCR cancelled', 'AbortError');
    throw err;
  } finally {
    if (signal) {
      signal.removeEventListener('abort', stopAll);
    }
    await Promise.all([...workers].map((w) => w.terminate().catch(() => undefined)));
    workers.clear();
    await paddle.destroy();
  }
}
