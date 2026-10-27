import { cleanPlayerName } from './extractPlayerFields';
import type { NameCandidate } from './nameChoice';

type PaddleModule = typeof import('ppu-paddle-ocr/web');
type PaddleService = InstanceType<PaddleModule['PaddleOcrService']>;
type FlatResult = import('ppu-paddle-ocr/web').FlattenedPaddleOcrResult;

export const paddleConfig: { enabled: boolean; wasmPaths?: string } = { enabled: true };

export type PaddleModelId = 'v6' | 'korean' | 'cyrillic';

export function extraModelOrder(): PaddleModelId[] {
  const languages = typeof navigator !== 'undefined' ? [...(navigator.languages ?? [navigator.language])] : [];
  const wantsCyrillic = languages.some((language) => /^(ru|uk|be|bg|sr|kk)/i.test(language || ''));
  return wantsCyrillic ? ['cyrillic', 'korean'] : ['korean', 'cyrillic'];
}

export function cropToCanvas(
  bmp: ImageBitmap,
  rect: { x: number; y: number; w: number; h: number },
  scale = 2,
): HTMLCanvasElement {
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
  private readonly broken = new Set<PaddleModelId>();

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
      const service = new this.mod.PaddleOcrService({ model });
      await service.initialize();
      this.services.set(id, service);
      return service;
    } catch {
      this.broken.add(id);
      return null;
    }
  }

  private async read(id: PaddleModelId, canvas: HTMLCanvasElement): Promise<FlatResult | null> {
    const service = await this.service(id);
    if (!service) return null;
    try {
      return (await service.recognize(canvas, { flatten: true, noCache: true })) as FlatResult;
    } catch {
      return null;
    }
  }

  async readStats(canvas: HTMLCanvasElement): Promise<string | null> {
    const result = await this.read('v6', canvas);
    const text = result?.text?.trim();
    return text || null;
  }

  async readName(canvas: HTMLCanvasElement, model: PaddleModelId): Promise<NameCandidate | null> {
    const result = await this.read(model, canvas);
    if (!result) return null;
    const text = cleanPlayerName(result.text ?? '');
    if (!text) return null;
    return { text, conf: Math.round((result.confidence ?? 0) * 100), source: 'paddle' };
  }

  async destroy(): Promise<void> {
    await Promise.all([...this.services.values()].map((service) => service.destroy().catch(() => undefined)));
    this.services.clear();
  }
}