import type { GameItemType } from '../core/GameState';

/**
 * Orb icons: data-driven, soft "lofi sticker" style.
 *
 * Every glyph is authored on the same 24x24 grid centred on (0, 0), as SVG path
 * strings, so all icons share one visual size, one corner softness and one
 * stroke weight. `size` passed to drawOrbSymbol is the half-extent of that grid
 * (glyphs fill about +-10.5 of the +-12 grid, i.e. ~0.87 * size).
 *
 * Colour roles (same arguments the old API used):
 *   glyph  -> `color`         main near-white shape
 *   ink    -> `outlineColor`  dark tint of the orb colour (details, seams, eyes)
 *   accent -> `accentColor`   one small pop of colour per icon
 */

type Role = 'glyph' | 'ink' | 'accent';

interface Layer {
  d: string;
  fill?: Role;
  stroke?: Role;
  width?: number;
  alpha?: number;
  cap?: CanvasLineCap;
}

interface IconDef {
  /** Optical centring offsets, in grid units. */
  ox?: number;
  oy?: number;
  layers: Layer[];
}

const HALF = 12;
const SHADOW_OFFSET_Y = 0.9;
const SHADOW_ALPHA = 0.3;
const SOFTEN = 1.4; // glyph-coloured stroke that rounds off sharp polygon corners

function circle(cx: number, cy: number, r: number): string {
  return `M${cx - r} ${cy}A${r} ${r} 0 1 0 ${cx + r} ${cy}A${r} ${r} 0 1 0 ${cx - r} ${cy}Z`;
}

function star(points: number, outer: number, inner: number, cx = 0, cy = 0): string {
  const cmds: string[] = [];
  for (let i = 0; i < points * 2; i++) {
    const r = i % 2 === 0 ? outer : inner;
    const a = -Math.PI / 2 + (i * Math.PI) / points;
    const px = (cx + Math.cos(a) * r).toFixed(2);
    const py = (cy + Math.sin(a) * r).toFixed(2);
    cmds.push(`${i === 0 ? 'M' : 'L'}${px} ${py}`);
  }
  return `${cmds.join('')}Z`;
}

const SHIELD =
  'M0 -10.5C3 -8.6 6.3 -7.9 9 -7.9V-1.5C9 4.5 5.2 8.6 0 10.8C-5.2 8.6 -9 4.5 -9 -1.5V-7.9C-6.3 -7.9 -3 -8.6 0 -10.5Z';
const SHIELD_RIGHT_HALF =
  'M0 -10.5C3 -8.6 6.3 -7.9 9 -7.9V-1.5C9 4.5 5.2 8.6 0 10.8Z';
const SKULL =
  'M0 -10.5C5.8 -10.5 9.5 -6.6 9.5 -2C9.5 1.4 7.9 3.7 6 5V8C6 9.1 5.3 9.9 4.2 9.9H-4.2C-5.3 9.9 -6 9.1 -6 8V5C-7.9 3.7 -9.5 1.4 -9.5 -2C-9.5 -6.6 -5.8 -10.5 0 -10.5Z';

const ICONS: Record<GameItemType, IconDef> = {
  // Soft rounded plus.
  health: {
    layers: [{ d: 'M0 -7V7M-7 0H7', stroke: 'glyph', width: 7.5, cap: 'round' }],
  },

  // Classic lightning bolt.
  damage: {
    layers: [
      {
        d: 'M3 -10.5L-6.5 1.5H-1L-3.5 10.5L7 -2.5H1.5Z',
        fill: 'glyph',
        stroke: 'glyph',
        width: SOFTEN,
      },
    ],
  },

  // One big bullet + speed lines (three tiny bullets turned to mush at small sizes).
  rapidFire: {
    layers: [
      { d: 'M-6.5 -3.4H-10.5M-6.5 0H-9M-6.5 3.4H-10.5', stroke: 'glyph', width: 2.2, cap: 'round' },
      {
        d: 'M-3 -5H2.5C6 -5 9 -2.5 11 0C9 2.5 6 5 2.5 5H-3Z',
        fill: 'glyph',
        stroke: 'glyph',
        width: 1.2,
      },
      { d: 'M0 -4.6V4.6', stroke: 'ink', width: 1.3, alpha: 0.55, cap: 'butt' },
    ],
  },

  // Heater shield, two-tone (right half shaded) instead of a hard seam line.
  shield: {
    layers: [
      { d: SHIELD, fill: 'glyph', stroke: 'glyph', width: SOFTEN },
      { d: SHIELD_RIGHT_HALF, fill: 'ink', alpha: 0.2 },
    ],
  },

  // Round bomb, stubby neck, curled fuse, gold spark.
  bomb: {
    ox: -1,
    layers: [
      { d: circle(-2.5, 3, 7.5), fill: 'glyph' },
      { d: 'M2.4 -2.2L4.4 -4.8', stroke: 'glyph', width: 4, cap: 'round' },
      { d: 'M4.4 -4.8Q6.4 -7.2 8.6 -6.6', stroke: 'ink', width: 1.5, cap: 'round' },
      { d: circle(-5.2, 0.6, 1.7), fill: 'ink', alpha: 0.22 },
      { d: star(4, 3.4, 1, 9, -8), fill: 'accent' },
    ],
  },

  // Horseshoe magnet with two contrasting pole tips.
  magnet: {
    oy: -0.9,
    layers: [
      { d: 'M-6 -8V1A6 6 0 0 0 6 1V-8', stroke: 'glyph', width: 5.5, cap: 'butt' },
      { d: 'M-6 -8V-4', stroke: 'accent', width: 5.5, cap: 'butt' },
      { d: 'M6 -8V-4', stroke: 'ink', width: 5.5, cap: 'butt', alpha: 0.75 },
    ],
  },

  // Dome head + barrel on a two-tone pedestal.
  turret: {
    ox: -1.5,
    oy: -1.6,
    layers: [
      { d: 'M-8 7.5H8V10.5H-8Z', fill: 'glyph', alpha: 0.72 },
      { d: 'M-4.5 7.5L-3.2 2.5H3.2L4.5 7.5Z', fill: 'glyph', alpha: 0.72 },
      { d: circle(-1, -1.5, 5.8), fill: 'glyph' },
      { d: 'M3 -4.4H10.5V-0.6H3Z', fill: 'glyph', stroke: 'glyph', width: 1.2 },
      { d: 'M8.6 -4.6V-0.4', stroke: 'ink', width: 1.2, alpha: 0.6, cap: 'butt' },
      { d: circle(-1.6, -1.2, 1.5), fill: 'ink' },
    ],
  },

  // Skull: reads instantly as "dangerous" (the old spiky face turned muddy).
  cursed: {
    layers: [
      { d: SKULL, fill: 'glyph', stroke: 'glyph', width: 1.2 },
      { d: `${circle(-3.6, -1.2, 2.7)}${circle(3.6, -1.2, 2.7)}`, fill: 'ink' },
      { d: `${circle(-3.6, -1.2, 1)}${circle(3.6, -1.2, 1)}`, fill: 'accent' },
      { d: 'M0 2.4L-1.5 5.3H1.5Z', fill: 'ink', stroke: 'ink', width: 0.8 },
      { d: 'M-2 7.2V9.9M2 7.2V9.9', stroke: 'ink', width: 1, alpha: 0.5, cap: 'butt' },
    ],
  },

  // Rounded five-point star with a faint inner facet.
  rareGold: {
    layers: [
      { d: star(5, 10.5, 4.7, 0, 0.8), fill: 'glyph', stroke: 'glyph', width: 2 },
      { d: star(5, 5.2, 2.3, 0, 0.8), fill: 'ink', alpha: 0.18 },
    ],
  },
};

// Path2D objects are built lazily (keeps SSR / test environments without Path2D happy).
const pathCache = new Map<GameItemType, Path2D[]>();

function getPaths(type: GameItemType): Path2D[] {
  let paths = pathCache.get(type);
  if (!paths) {
    paths = ICONS[type].layers.map((layer) => new Path2D(layer.d));
    pathCache.set(type, paths);
  }
  return paths;
}

function paintLayer(
  context: CanvasRenderingContext2D,
  layer: Layer,
  path: Path2D,
  colors: Record<Role, string>,
  shadow: boolean,
): void {
  context.globalAlpha = shadow ? SHADOW_ALPHA : (layer.alpha ?? 1);
  if (layer.fill) {
    context.fillStyle = shadow ? colors.ink : colors[layer.fill];
    context.fill(path);
  }
  if (layer.stroke) {
    context.strokeStyle = shadow ? colors.ink : colors[layer.stroke];
    context.lineWidth = layer.width ?? SOFTEN;
    context.lineCap = layer.cap ?? 'round';
    context.stroke(path);
  }
}

export function drawOrbSymbol(
  context: CanvasRenderingContext2D,
  type: GameItemType,
  x: number,
  y: number,
  size: number,
  color: string,
  outlineColor: string,
  accentColor: string,
): void {
  const icon = ICONS[type];
  const paths = getPaths(type);
  const colors: Record<Role, string> = {
    glyph: color,
    ink: outlineColor,
    accent: accentColor,
  };

  context.save();
  try {
    context.translate(x, y);
    context.scale(size / HALF, size / HALF);
    context.translate(icon.ox ?? 0, icon.oy ?? 0);
    context.lineJoin = 'round';

    // Pass 1: soft offset shadow of the glyph-coloured shapes.
    context.save();
    context.translate(0, SHADOW_OFFSET_Y);
    icon.layers.forEach((layer, i) => {
      if (layer.fill === 'glyph' || layer.stroke === 'glyph') {
        paintLayer(context, layer, paths[i], colors, true);
      }
    });
    context.restore();

    // Pass 2: the glyph itself.
    icon.layers.forEach((layer, i) => paintLayer(context, layer, paths[i], colors, false));
  } finally {
    context.restore();
  }
}