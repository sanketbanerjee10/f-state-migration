import { cleanPlayerName } from './extractPlayerFields';
import type { NameCandidate } from './nameChoice';
import type { Rect } from './rasterOps';

/**
 * PaddleOCR (ONNX, runs entirely in the browser) used as a second reader for the banner:
 *   - the stats line  (power beside name + kills)  -> text that is added to the Tesseract reads
 *   - the name line                                -> a candidate name with a confidence
 *
 * Safety design: every public method catches its own errors and returns null/false/[].
 * If PaddleOCR cannot load (offline, blocked host, old browser) the app behaves exactly as Tesseract-only.
 * The library and models are downloaded lazily, only when a user actually uploads a screenshot.
 */

type PaddleModule = typeof import('ppu-paddle-ocr/web');
type PaddleService = InstanceType<PaddleModule['PaddleOcrService']>;
type FlatResult = import('ppu-paddle-ocr/web').FlattenedPaddleOcrResult;

/** Turn PaddleOCR off (false) or self-host the onnxruntime-web .wasm files (wasmPaths, e.g. '/ort/'). */
export const paddleConfig: { enabled: boolean; wasmPaths?: string } = { enabled: true };

/**
 * v6      : PP-OCRv6 tiny, one multilingual model (Chinese, English, Japanese, Latin-script languages). ~6 MB, always used.
 * korean  : PP-OCRv5 Korean.   Only downloaded when the name is still doubtful after the v6 read.
 * cyrillic: PP-OCRv5 Cyrillic. Same rule.
 */
export type PaddleModelId = 'v6' | 'korean' | 'cyrillic';

export function extraModelOrder(): PaddleModelId[] {
  const langs = typeof navigator !== 'undefined' ? [...(navigator.languages ?? [navigator.language])] : [];
  const wantsCyrillic = langs.some((l) => /^(ru|uk|be|bg|sr|kk)/i.test(l || ''));
  return wantsCyrillic ? ['cyrillic', 'korean'] : ['korean', 'cyrillic'];
}

/** Crop a region of the screenshot into a canvas, enlarged by `scale`, original colours (PaddleOCR wants colour). */
export function cropToCanvas(bmp: ImageBitmap, rect: Rect, scale = 2): HTMLCanvasElement {
  const x = Math.max(0, Math.floor(rect.x));
  const y = Math.max(0, Math.floor(rect.y));
  const w = Math.max(1, Math.min(bmp.width - x, Math.ceil(rect.w)));
  const h = Math.max(1, Math.min(bmp.height - y, Math.ceil(rect.h)));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(w * scale);
  canvas.height = Math.round(h * scale);
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas unavailable');
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(bmp, x, y, w, h, 0, 0, canvas.width, canvas.height);
  return canvas;
}

export class PaddleBanner {
  private mod: PaddleModule | null = null;
  private readonly services = new Map<PaddleModelId, PaddleService>();
  /** Models that failed to load in this run; never retried, so one failure costs one attempt. */
  private readonly broken = new Set<PaddleModelId>();

  /** Loads the library (code-split: users who never upload a screenshot never download it). */
  async load(): Promise<boolean> {
    if (!paddleConfig.enabled) return false;
    try {
      if (paddleConfig.wasmPaths) {
        const ort = await import('onnxruntime-web');
        ort.env.wasm.wasmPaths = paddleConfig.wasmPaths;
      }
      this.mod = await import('ppu-paddle-ocr/web');
      return true;
    } catch {
      this.mod = null;
      return false;
    }
  }

  private async service(id: PaddleModelId): Promise<PaddleService | null> {
    if (!this.mod || this.broken.has(id)) return null;
    const cached = this.services.get(id);
    if (cached) return cached;
    try {
      const model =
        id === 'v6'
          ? this.mod.V6_TINY_MODEL
          : id === 'korean'
            ? this.mod.V5_KOREAN_MOBILE_MODEL
            : this.mod.V5_CYRILLIC_MOBILE_MODEL;
      const svc = new this.mod.PaddleOcrService({ model }); // defaults pause ~10 ms between inferences so the page stays responsive
      await svc.initialize();
      this.services.set(id, svc);
      return svc;
    } catch {
      this.broken.add(id);
      return null;
    }
  }

  private async read(id: PaddleModelId, canvas: HTMLCanvasElement): Promise<FlatResult | null> {
    const svc = await this.service(id);
    if (!svc) return null;
    try {
      // noCache: the library caches results by image bytes; we never want a stale answer between uploads
      return (await svc.recognize(canvas, { flatten: true, noCache: true })) as FlatResult;
    } catch {
      return null;
    }
  }

  /** Text of the stats line, e.g. "249,058,746 4,089,882". Parsed later by headerNumbers.readHeader(). */
  async readStats(canvas: HTMLCanvasElement): Promise<string | null> {
    const r = await this.read('v6', canvas);
    const text = r?.text?.trim();
    return text ? text : null;
  }

  /** One candidate name from one model, or null when the model found no text. */
  async readName(canvas: HTMLCanvasElement, id: PaddleModelId): Promise<NameCandidate | null> {
    const r = await this.read(id, canvas);
    if (!r) return null;
    const text = cleanPlayerName(r.text ?? '');
    if (!text) return null;
    return { text, conf: Math.round((r.confidence ?? 0) * 100), source: 'paddle' };
  }

  async destroy(): Promise<void> {
    await Promise.all([...this.services.values()].map((s) => s.destroy().catch(() => undefined)));
    this.services.clear();
  }
}
