/**
 * Image helpers for the Player Details card.
 *
 * The player name and the header numbers are WHITE text with a dark outline on a tan banner.
 * Reading the plain grayscale image gives garbage; keeping only near-white pixels gives clean glyphs.
 * Everything here is language independent: it works on pixels, not on words.
 */

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface Raster {
  /** RGBA pixels of the (scaled) crop */
  data: Uint8ClampedArray;
  width: number;
  height: number;
  /** Where the crop came from in the source image, and how much it was enlarged */
  originX: number;
  originY: number;
  scale: number;
}

export interface Box {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

/** Crop a region of the screenshot and enlarge it (smooth) so thin glyphs survive thresholding. */
export function cropRaster(bmp: ImageBitmap, rect: Rect, scale: number): Raster {
  const x = Math.max(0, Math.floor(rect.x));
  const y = Math.max(0, Math.floor(rect.y));
  const w = Math.max(1, Math.min(bmp.width - x, Math.ceil(rect.w)));
  const h = Math.max(1, Math.min(bmp.height - y, Math.ceil(rect.h)));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(w * scale);
  canvas.height = Math.round(h * scale);
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) throw new Error('Canvas unavailable');
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(bmp, x, y, w, h, 0, 0, canvas.width, canvas.height);
  const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
  return { data: img.data, width: canvas.width, height: canvas.height, originX: x, originY: y, scale };
}

/** 1 where the pixel is near-white (text), 0 elsewhere. Uses the minimum channel so tan/gold stays out. */
export function whiteTextMask(r: Raster, threshold = 175): Uint8Array {
  const n = r.width * r.height;
  const mask = new Uint8Array(n);
  const d = r.data;
  for (let i = 0; i < n; i++) {
    const p = i * 4;
    mask[i] = Math.min(d[p], d[p + 1], d[p + 2]) > threshold ? 1 : 0;
  }
  return mask;
}

/**
 * Contiguous vertical bands (inclusive row ranges) that contain text.
 * Rows that are lit across most of the width are background (the light panel under the banner), not text.
 */
export function rowBands(mask: Uint8Array, width: number, height: number, maxGap = 3): Array<[number, number]> {
  const minInk = Math.max(2, Math.round(width * 0.004));
  const maxInk = width * 0.5;
  const ink = new Uint32Array(height);
  for (let y = 0; y < height; y++) {
    let c = 0;
    for (let x = 0; x < width; x++) c += mask[y * width + x];
    ink[y] = c > maxInk ? 0 : c;
  }
  const bands: Array<[number, number]> = [];
  let start = -1;
  let gap = 0;
  for (let y = 0; y < height; y++) {
    if (ink[y] >= minInk) {
      if (start < 0) start = y;
      gap = 0;
    } else if (start >= 0 && ++gap > maxGap) {
      bands.push([start, y - gap]);
      start = -1;
      gap = 0;
    }
  }
  if (start >= 0) bands.push([start, height - 1 - gap]);
  return bands;
}

/**
 * Word spans (inclusive x ranges) inside a band.
 *
 * Columns with ink form runs. Two runs belong to the same word unless the gap between them is clearly a space:
 * at least `minGapRatio` of the text height AND `medianFactor` times this name's own typical letter gap.
 * Measured on real cards: letter gaps are never above 1.8x the median, word spaces are 2.6x or more.
 * Because the rule is relative, kana/kanji/Hangul runs (even spacing) stay whole while "Long pro310" splits once.
 * Tiny specks (flower petals, JPEG noise) are dropped.
 */
export function colSpans(
  mask: Uint8Array,
  width: number,
  y0: number,
  y1: number,
  opts: { minGapRatio?: number; medianFactor?: number } = {},
): Array<[number, number]> {
  const { minGapRatio = 0.2, medianFactor = 2.2 } = opts;
  const bandH = y1 - y0 + 1;
  const col = new Uint32Array(width);
  for (let y = y0; y <= y1; y++) for (let x = 0; x < width; x++) col[x] += mask[y * width + x];

  const minArea = 0.003 * bandH * bandH; // small enough to keep underscores, hyphens and dots
  const runs: Array<[number, number]> = [];
  let s = -1;
  for (let x = 0; x <= width; x++) {
    const on = x < width && col[x] > 0;
    if (on && s < 0) s = x;
    if (!on && s >= 0) {
      let area = 0;
      for (let k = s; k < x; k++) area += col[k];
      if (area >= minArea) runs.push([s, x - 1]);
      s = -1;
    }
  }
  if (runs.length === 0) return [];

  const gaps = runs.slice(1).map((r, i) => r[0] - runs[i][1] - 1);
  const sorted = [...gaps].sort((a, b) => a - b);
  const median = sorted.length ? sorted[Math.floor(sorted.length / 2)] : 0;
  const wordGap = Math.max(minGapRatio * bandH, medianFactor * median);

  const merged: Array<[number, number]> = [];
  for (const r of runs) {
    const last = merged[merged.length - 1];
    if (last && r[0] - last[1] - 1 < wordGap) last[1] = r[1];
    else merged.push([r[0], r[1]]);
  }
  return merged;
}

/** Render a mask region as black text on white with a white margin, ready for Tesseract. */
export function maskToCanvas(mask: Uint8Array, width: number, box: Box, pad = 14): HTMLCanvasElement {
  const w = box.x1 - box.x0 + 1 + pad * 2;
  const h = box.y1 - box.y0 + 1 + pad * 2;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas unavailable');
  const img = ctx.createImageData(w, h);
  img.data.fill(255);
  for (let y = box.y0; y <= box.y1; y++) {
    for (let x = box.x0; x <= box.x1; x++) {
      if (!mask[y * width + x]) continue;
      const p = ((y - box.y0 + pad) * w + (x - box.x0 + pad)) * 4;
      img.data[p] = img.data[p + 1] = img.data[p + 2] = 0;
    }
  }
  ctx.putImageData(img, 0, 0);
  return canvas;
}
