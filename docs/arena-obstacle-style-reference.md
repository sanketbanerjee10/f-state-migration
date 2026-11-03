# Arena and obstacle visual handoff

This is a self-contained visual handoff for an AI that cannot inspect the project repository. It describes the arena and every visible obstacle type, then includes the source code needed to understand and modify their appearance. The code blocks below are copied from the project and grouped by original source file; they are excerpts only where explicitly labelled.

The visual implementation is Canvas 2D. Obstacle positions and dimensions are supplied by arena layout data; the renderer draws all instances of a given kind using the same visual treatment.

## What the arena looks like

The game draws a rectangular, dark, flat-shaded playfield. Its default logical size is 960 × 540 pixels, although the renderer accepts the current canvas width and height. The arena renderer paints, in order:

1. A solid theme-specific floor color over the entire canvas.
2. A low-opacity square grid, with vertical and horizontal lines every 24 pixels.
3. Eight short diagonal surface markings distributed across the playfield.
4. Obstacles and explosive barrels from the current arena state.

The five arena themes change the floor, grid, and marking colors. Theme data also contains boundary, inner-boundary, accent, detail, and shadow colors, but the current arena renderer does not draw the boundary or inner-boundary, and does not apply the theme-specific accent/detail/shadow colors to obstacles. Obstacle materials use the shared palette instead. Those fields are available if the redesign adds visible per-theme edging, vignettes, or material variation.

The floor is intentionally simple in the current code: no textures, lighting gradients, floor perspective, tile variation, vignettes, or decorations are drawn. A redesign of those elements belongs in `renderArenaLayer`.

## What each obstacle looks like

All rectangular props have a dark offset shadow, currently shifted 4 pixels right and 6 pixels down. Coordinates and dimensions are pixels after the layout center is converted to the current arena size.

### Crate

A solid blue-green rectangle, with a thin muted-teal outer edge, a darker inset rectangular border, two diagonal braces crossing as an X, and four tiny pale corner bolts. The X and inset use the same dark teal tone. Crates return immediately after drawing, so they do not get the generic wall/barricade treatment or visible damage marks.

### Barricade

A muted green-grey rectangle with a thin sand-grey edge and repeated amber vertical stripes. Stripe positions are spaced 20 pixels apart and inset from the ends and top/bottom. Damaged barricades gain up to three thin diagonal crack marks; the number increases with the missing-health fraction. At zero health, the normal barricade is replaced by two small broken fragments.

### Wall

A solid muted green-grey rectangle with a thin sand-grey border and one thicker horizontal amber seam through its center. It shares the barricade material colors but has no repeated vertical stripes or damage cracks.

### Cover

Cover currently uses exactly the same drawing branch and colors as a wall: a solid muted green-grey rectangle, thin sand-grey border, and one horizontal amber seam. It is not visually distinguishable from a wall except by its layout dimensions and position.

### Explosive barrel

A small circle centered at its fractional arena position. The current view is top-down: the barrel has a 16-pixel radius, a filled muted green-grey disk with a purple bomb-colored outline, a dark offset circular shadow, and two short horizontal pale amber bands. A damaged living barrel gets one small diagonal pale projectile-colored crack. A destroyed barrel becomes a dark disk with a muted outline; the two bands are still drawn. The radius is provided by runtime barrel setup; the renderer draws whichever radius it receives.

### Layout arrangement

The same crate, barricade, wall, cover, and barrel styles are reused across every map. Layouts change only their object kinds, center positions, pixel dimensions, and theme. Positions are stored as fractions of arena width/height; obstacle width and height remain pixel dimensions. Therefore, a redesign to the object materials affects every layout, while changing `THEME_LAYOUTS` changes a map's composition and spacing.

## Visual code

The following blocks provide the current appearance implementation and its rendering dependencies. To change actual visuals, edit the `ArenaRenderer.ts` code and the arena/obstacle values in `VisualConfig.ts`, `GamePalette.ts`, or `ARENA_THEME_CYCLE`. The layout data is included after the renderer because it determines which objects appear where.

### `ArenaRenderer.ts` — complete file

```ts
import { ARENA_OBSTACLES, type ArenaObstacle } from '../core/GameConfig';
import { getArenaObstacleBounds } from '../core/ArenaGeometry';
import { GAME_PALETTE } from './GamePalette';
import { GAME_VISUAL_CONFIG } from './VisualConfig';
import {
  drawCircle,
  drawLine,
  drawRect,
} from './ShapeLibrary';
import {
  ARENA_THEME_CYCLE,
  type ArenaObstacleEntity,
  type ArenaThemeId,
  type ExplosiveBarrelEntity,
} from '../arena/ArenaSystem';

interface ArenaRenderState {
  readonly obstacles: readonly Readonly<ArenaObstacleEntity>[];
  readonly barrels: readonly Readonly<ExplosiveBarrelEntity>[];
  readonly theme: ArenaThemeId;
  readonly transition?: {
    readonly from: {
      readonly obstacles: readonly Readonly<ArenaObstacleEntity>[];
      readonly barrels: readonly Readonly<ExplosiveBarrelEntity>[];
      readonly theme: ArenaThemeId;
    };
    readonly progress: number;
  };
}

function drawObstacle(
  context: CanvasRenderingContext2D,
  obstacle: ArenaObstacle | ArenaObstacleEntity,
  arenaWidth: number,
  arenaHeight: number,
): void {
  const { obstacle: dimensions } = GAME_VISUAL_CONFIG;
  const { arena: colors } = GAME_PALETTE;
  const { x, y, width, height } = getArenaObstacleBounds(
    obstacle,
    arenaWidth,
    arenaHeight,
  );

  drawRect(
    context,
    x + dimensions.shadowOffsetX,
    y + dimensions.shadowOffsetY,
    width,
    height,
    { fill: colors.obstacleShadow },
  );

  if (obstacle.kind === 'crate') {
    drawRect(context, x, y, width, height, { fill: colors.crate.fill });
    drawRect(context, x + 1, y + 1, width - 2, height - 2, {
      stroke: colors.crate.edge,
      lineWidth: dimensions.crateEdgeWidth,
    });

    const inset = dimensions.crateInset;
    drawRect(context, x + inset, y + inset, width - inset * 2, height - inset * 2, {
      stroke: colors.crate.inset,
      lineWidth: dimensions.crateInsetWidth,
    });

    const diagonalInset = dimensions.crateDiagonalInset;
    drawLine(
      context,
      { x: x + diagonalInset, y: y + diagonalInset },
      { x: x + width - diagonalInset, y: y + height - diagonalInset },
      colors.crate.inset,
      dimensions.crateInsetWidth,
    );
    drawLine(
      context,
      { x: x + width - diagonalInset, y: y + diagonalInset },
      { x: x + diagonalInset, y: y + height - diagonalInset },
      colors.crate.inset,
      dimensions.crateInsetWidth,
    );

    const boltInset = dimensions.crateBoltInset;
    const boltSize = dimensions.crateBoltSize;
    for (const [boltX, boltY] of [
      [x + boltInset, y + boltInset],
      [x + width - boltInset, y + boltInset],
      [x + boltInset, y + height - boltInset],
      [x + width - boltInset, y + height - boltInset],
    ]) {
      drawRect(context, boltX - 1, boltY - 1, boltSize, boltSize, {
        fill: colors.crate.detail,
      });
    }
    return;
  }

  if (
    'health' in obstacle &&
    obstacle.health === 0 &&
    obstacle.kind === 'barricade'
  ) {
    drawRect(context, x + 3, y + height * 0.55, width * 0.38, height * 0.3, {
      fill: colors.barricade.fill,
    });
    drawRect(context, x + width * 0.58, y + height * 0.2, width * 0.32, height * 0.3, {
      fill: colors.barricade.fill,
    });
    return;
  }

  if (obstacle.kind === 'cover' || obstacle.kind === 'wall') {
    drawRect(context, x, y, width, height, { fill: colors.barricade.fill });
    drawRect(context, x + 1, y + 1, width - 2, height - 2, {
      stroke: colors.barricade.edge,
      lineWidth: dimensions.barricadeEdgeWidth,
    });
    drawLine(
      context,
      { x: x + 4, y: y + height / 2 },
      { x: x + width - 4, y: y + height / 2 },
      colors.barricade.detail,
      dimensions.barricadeMarkWidth,
    );
    return;
  }

  drawRect(context, x, y, width, height, { fill: colors.barricade.fill });
  drawRect(context, x + 1, y + 1, width - 2, height - 2, {
    stroke: colors.barricade.edge,
    lineWidth: dimensions.barricadeEdgeWidth,
  });

  for (
    let markX = x + dimensions.barricadeMarkStart;
    markX < x + width - dimensions.barricadeMarkEndInset;
    markX += dimensions.barricadeMarkSpacing
  ) {
    drawLine(
      context,
      { x: markX, y: y + dimensions.barricadeMarkVerticalInset },
      { x: markX, y: y + height - dimensions.barricadeMarkVerticalInset },
      colors.barricade.detail,
      dimensions.barricadeMarkWidth,
    );
  }

  if (
    'health' in obstacle &&
    obstacle.health !== undefined &&
    obstacle.maxHealth !== undefined &&
    obstacle.health < obstacle.maxHealth
  ) {
    const damageFraction = 1 - obstacle.health / obstacle.maxHealth;
    for (let crack = 0; crack < Math.ceil(damageFraction * 3); crack += 1) {
      const startX = x + width * (0.25 + crack * 0.22);
      drawLine(
        context,
        { x: startX, y: y + 3 },
        { x: startX - 5, y: y + height - 3 },
        colors.barricade.detail,
        1,
      );
    }
  }
}

function drawBarrel(
  context: CanvasRenderingContext2D,
  barrel: Readonly<ExplosiveBarrelEntity>,
  arenaWidth: number,
  arenaHeight: number,
): void {
  const x = arenaWidth * barrel.xFraction;
  const y = arenaHeight * barrel.yFraction;
  const { arena: colors } = GAME_PALETTE;
  const fill = barrel.health > 0
    ? colors.barricade.fill
    : colors.obstacleShadow;
  drawCircle(context, x, y + 3, barrel.radius + 2, {
    fill: colors.obstacleShadow,
  });
  drawCircle(context, x, y, barrel.radius, {
    fill,
    stroke: barrel.health > 0
      ? GAME_PALETTE.orbs.bomb
      : colors.barricade.edge,
    lineWidth: 2,
  });
  drawLine(
    context,
    { x: x - barrel.radius * 0.7, y: y - 4 },
    { x: x + barrel.radius * 0.7, y: y - 4 },
    colors.barricade.detail,
    2,
  );
  drawLine(
    context,
    { x: x - barrel.radius * 0.7, y: y + 5 },
    { x: x + barrel.radius * 0.7, y: y + 5 },
    colors.barricade.detail,
    2,
  );
  if (barrel.health > 0 && barrel.health < barrel.maxHealth) {
    drawLine(
      context,
      { x: x - 2, y: y - barrel.radius * 0.55 },
      { x: x + 4, y: y - 1 },
      GAME_PALETTE.combat.projectileOutline,
      1.5,
    );
  }
}

function renderArenaLayer(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  arena?: ArenaRenderState,
  alpha = 1,
  scale = 1,
  includeObstacles = true,
): void {
  const { arena: dimensions } = GAME_VISUAL_CONFIG;
  const baseColors = GAME_PALETTE.arena;
  const theme = ARENA_THEME_CYCLE.find(({ id }) => id === arena?.theme) ??
    ARENA_THEME_CYCLE[0]!;
  const colors = {
    ...baseColors,
    floor: theme.floor,
    grid: theme.grid,
    boundary: theme.boundary,
    innerBoundary: theme.innerBoundary,
    marking: theme.marking,
  };

  context.save();
  try {
    context.globalAlpha *= alpha;
    context.translate(width / 2, height / 2);
    context.scale(scale, scale);
    context.translate(-width / 2, -height / 2);
    drawRect(context, 0, 0, width, height, { fill: colors.floor });

    context.save();
    try {
      context.strokeStyle = colors.grid;
      context.lineWidth = 1;
      context.beginPath();
      for (let x = 0; x <= width; x += dimensions.gridSpacing) {
        context.moveTo(x, 0);
        context.lineTo(x, height);
      }
      for (let y = 0; y <= height; y += dimensions.gridSpacing) {
        context.moveTo(0, y);
        context.lineTo(width, y);
      }
      context.stroke();
    } finally {
      context.restore();
    }

    context.save();
    try {
      context.strokeStyle = colors.marking;
      context.lineWidth = 1;
      for (let line = 0; line < 8; line += 1) {
        const offset = (line + 1) * (width / 9);
        const y = (line % 2 === 0 ? height * 0.2 : height * 0.74) + ((line % 3) * 18);
        const startX = Math.max(26, offset - 18);
        const endX = Math.min(width - 26, offset + 18);
        context.beginPath();
        context.moveTo(startX, y);
        context.lineTo(endX, y + (line % 2 === 0 ? 10 : -10));
        context.stroke();
      }
    } finally {
      context.restore();
    }

    if (includeObstacles) {
      renderArenaObstacles(context, width, height, arena);
    }
  } finally {
    context.restore();
  }
}

function renderArenaObstacles(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  arena?: ArenaRenderState,
  alpha = 1,
  scale = 1,
): void {
  const obstacles = arena?.obstacles ?? ARENA_OBSTACLES;
  for (const obstacle of obstacles) {
    const centerX = width * obstacle.xFraction;
    const centerY = height * obstacle.yFraction;
    context.save();
    try {
      context.globalAlpha *= alpha;
      context.translate(centerX, centerY);
      context.scale(scale, scale);
      context.translate(-centerX, -centerY);
      drawObstacle(context, obstacle, width, height);
    } finally {
      context.restore();
    }

  }
  for (const barrel of arena?.barrels ?? []) {
    const centerX = width * barrel.xFraction;
    const centerY = height * barrel.yFraction;
    context.save();
    try {
      context.globalAlpha *= alpha;
      context.translate(centerX, centerY);
      context.scale(scale, scale);
      context.translate(-centerX, -centerY);
      drawBarrel(context, barrel, width, height);
    } finally {
      context.restore();
    }
  }
}

export function renderArena(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  arena?: ArenaRenderState,
): void {
  if (!arena?.transition) {
    renderArenaLayer(context, width, height, arena);
    return;
  }

  const transition = arena.transition;
  const progress = Math.max(0, Math.min(1, transition.progress));
  renderArenaLayer(context, width, height, arena, 1, 1, false);
  if (progress < 0.5) {
    const phaseProgress = progress * 2;
    const zoomOut = phaseProgress * phaseProgress * (3 - 2 * phaseProgress);
    renderArenaObstacles(
      context,
      width,
      height,
      transition.from,
      1 - zoomOut,
      1 - zoomOut,
    );
    return;
  }

  const phaseProgress = (progress - 0.5) * 2;
  const zoomIn = phaseProgress * phaseProgress * (3 - 2 * phaseProgress);
  renderArenaObstacles(context, width, height, arena, zoomIn, zoomIn);
}
```

### Visual configuration — relevant `GAME_VISUAL_CONFIG` fields

These are the complete `arena` and `obstacle` properties from the visual config. Other properties in the source file configure actors and effects and are not used by the arena renderer.

```ts
arena: {
  gridSpacing: 24,
  centerMarkingHalfLength: 54,
  centerMarkingWidth: 2,
},
obstacle: {
  shadowOffsetX: 4,
  shadowOffsetY: 6,
  crateEdgeWidth: 2,
  crateInset: 7,
  crateInsetWidth: 3,
  crateDiagonalInset: 9,
  crateBoltInset: 5,
  crateBoltSize: 2,
  barricadeEdgeWidth: 2,
  barricadeMarkWidth: 4,
  barricadeMarkStart: 12,
  barricadeMarkEndInset: 8,
  barricadeMarkSpacing: 20,
  barricadeMarkVerticalInset: 5,
},
```

`centerMarkingHalfLength` and `centerMarkingWidth` are present in configuration but are not used by the current arena renderer. The eight surface markings are generated directly in `renderArenaLayer`.

### Palette — complete arena palette and renderer color dependencies

`GAME_PALETTE.arena` supplies the floor defaults, grid/boundary defaults, obstacle shadows, crate material, and shared barricade/wall/cover material. The barrel also reads the bomb orb outline and projectile outline shown below.

```ts
arena: {
  floor: '#142328',
  grid: 'rgba(157, 191, 173, 0.055)',
  boundary: '#42636a',
  innerBoundary: 'rgba(7, 17, 20, 0.62)',
  marking: 'rgba(164, 185, 181, 0.1)',
  obstacleShadow: 'rgba(3, 12, 15, 0.3)',
  entityShadow: 'rgba(3, 12, 15, 0.3)',
  crate: {
    fill: '#30474d',
    edge: '#819a99',
    inset: '#20343a',
    detail: 'rgba(213, 226, 218, 0.28)',
  },
  barricade: {
    fill: '#3b4d49',
    edge: '#9a9178',
    detail: '#d6b77f',
  },
},
```

```ts
// GAME_PALETTE.orbs.bomb
bomb: '#8540b6',

// GAME_PALETTE.combat.projectileOutline
projectileOutline: '#f0e4cc',
```

### Theme type and complete arena theme data

Theme properties are defined in the arena system and consumed by `renderArenaLayer`. Only floor, grid, and marking currently change pixels on screen; the remaining theme properties are data ready for additional styling.

```ts
export type ArenaThemeId =
  | 'military'
  | 'industrial'
  | 'contaminated'
  | 'urban'
  | 'bunker';

export interface ArenaTheme {
  readonly id: ArenaThemeId;
  readonly name: string;
  readonly floor: string;
  readonly grid: string;
  readonly boundary: string;
  readonly innerBoundary: string;
  readonly marking: string;
  readonly accent: string;
  readonly detail: string;
  readonly shadow: string;
}

export const ARENA_THEME_CYCLE: readonly ArenaTheme[] = [
  {
    id: 'military',
    name: 'Military Outpost',
    floor: '#142328',
    grid: 'rgba(157, 191, 173, 0.055)',
    boundary: '#42636a',
    innerBoundary: 'rgba(7, 17, 20, 0.62)',
    marking: 'rgba(164, 185, 181, 0.1)',
    accent: '#819a99',
    detail: '#b8d3c3',
    shadow: 'rgba(6, 14, 17, 0.42)',
  },
  {
    id: 'industrial',
    name: 'Industrial Complex',
    floor: '#202321',
    grid: 'rgba(198, 169, 119, 0.07)',
    boundary: '#77664d',
    innerBoundary: 'rgba(12, 14, 13, 0.68)',
    marking: 'rgba(214, 183, 127, 0.14)',
    accent: '#d6b77f',
    detail: '#e6cc96',
    shadow: 'rgba(8, 8, 7, 0.46)',
  },
  {
    id: 'contaminated',
    name: 'Contaminated Zone',
    floor: '#1b251e',
    grid: 'rgba(155, 190, 113, 0.065)',
    boundary: '#617b55',
    innerBoundary: 'rgba(8, 17, 10, 0.66)',
    marking: 'rgba(163, 195, 115, 0.12)',
    accent: '#a3c373',
    detail: '#cfe4a5',
    shadow: 'rgba(7, 15, 9, 0.46)',
  },
  {
    id: 'urban',
    name: 'Urban Ruins',
    floor: '#252324',
    grid: 'rgba(188, 156, 148, 0.06)',
    boundary: '#765b58',
    innerBoundary: 'rgba(16, 11, 12, 0.66)',
    marking: 'rgba(208, 164, 153, 0.12)',
    accent: '#c99486',
    detail: '#e2b2a8',
    shadow: 'rgba(17, 12, 13, 0.46)',
  },
  {
    id: 'bunker',
    name: 'Underground Bunker',
    floor: '#1b2229',
    grid: 'rgba(135, 168, 188, 0.065)',
    boundary: '#536b7d',
    innerBoundary: 'rgba(8, 12, 17, 0.68)',
    marking: 'rgba(142, 175, 194, 0.12)',
    accent: '#8eafc2',
    detail: '#bdd8ea',
    shadow: 'rgba(7, 12, 17, 0.48)',
  },
];
```

### Visual entity and layout data types

These types explain the fields the renderer reads. `health`/`maxHealth` are used only to change a barricade or barrel's visible damage state.

```ts
export interface ArenaObstacle {
  readonly xFraction: number;
  readonly yFraction: number;
  readonly width: number;
  readonly height: number;
  readonly kind: 'crate' | 'barricade' | 'wall' | 'cover' | 'barrel';
}

export interface ArenaObstacleEntity extends ArenaObstacle {
  health?: number;
  readonly maxHealth?: number;
}

export interface ExplosiveBarrelEntity {
  readonly id: string;
  readonly xFraction: number;
  readonly yFraction: number;
  readonly radius: number;
  health: number;
  readonly maxHealth: number;
}

export interface ArenaLayoutDefinition {
  readonly id: string;
  readonly name: string;
  readonly theme: ArenaThemeId;
  readonly obstacles: ArenaObstacle[];
  readonly barrels: ReadonlyArray<
    Pick<ExplosiveBarrelEntity, 'id' | 'xFraction' | 'yFraction'>
  >;
}
```

### Obstacle position conversion used by drawing

The layout coordinates are centers expressed as fractions. This exact helper turns them into a top-left rectangle for `drawObstacle`. It is included so the standalone visual code can be understood without access to the project.

```ts
export interface ArenaRectangle {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

export function getArenaObstacleBounds(
  obstacle: ArenaObstacle,
  width: number,
  height: number,
): ArenaRectangle {
  return {
    x: width * obstacle.xFraction - obstacle.width / 2,
    y: height * obstacle.yFraction - obstacle.height / 2,
    width: obstacle.width,
    height: obstacle.height,
  };
}
```

### Canvas shape helpers used by `ArenaRenderer.ts`

These are the shape helper definitions required by the complete renderer above. They preserve and restore canvas state around each primitive.

```ts
export interface Point {
  x: number;
  y: number;
}

export interface ShapeStyle {
  fill?: string;
  stroke?: string;
  lineWidth?: number;
}

function withCanvasState(
  context: CanvasRenderingContext2D,
  draw: () => void,
): void {
  context.save();
  try {
    draw();
  } finally {
    context.restore();
  }
}

function applyShapeStyle(
  context: CanvasRenderingContext2D,
  style: ShapeStyle,
): void {
  if (style.fill !== undefined) context.fillStyle = style.fill;
  if (style.stroke !== undefined) context.strokeStyle = style.stroke;
  if (style.lineWidth !== undefined) context.lineWidth = style.lineWidth;
}

export function drawCircle(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
  style: ShapeStyle = {},
): void {
  withCanvasState(context, () => {
    applyShapeStyle(context, style);
    context.beginPath();
    context.arc(x, y, Math.max(0, radius), 0, Math.PI * 2);
    if (style.fill !== undefined) context.fill();
    if (style.stroke !== undefined) context.stroke();
  });
}

export function drawLine(
  context: CanvasRenderingContext2D,
  from: Point,
  to: Point,
  stroke: string,
  lineWidth = 1,
): void {
  withCanvasState(context, () => {
    context.strokeStyle = stroke;
    context.lineWidth = lineWidth;
    context.beginPath();
    context.moveTo(from.x, from.y);
    context.lineTo(to.x, to.y);
    context.stroke();
  });
}

export function drawRect(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  style: ShapeStyle = {},
): void {
  withCanvasState(context, () => {
    applyShapeStyle(context, style);
    if (style.fill !== undefined) context.fillRect(x, y, width, height);
    if (style.stroke !== undefined) context.strokeRect(x, y, width, height);
  });
}
```

### Fallback obstacle arrangement

When `renderArena` receives no arena state, `renderArenaObstacles` uses this fallback arrangement. Normal game states supply one of the themed layouts below.

```ts
export const ARENA_OBSTACLES: readonly ArenaObstacle[] = [
  { xFraction: 0.24, yFraction: 0.34, width: 58, height: 48, kind: 'crate' },
  { xFraction: 0.73, yFraction: 0.67, width: 66, height: 54, kind: 'crate' },
  { xFraction: 0.73, yFraction: 0.3, width: 92, height: 24, kind: 'barricade' },
  { xFraction: 0.3, yFraction: 0.72, width: 82, height: 24, kind: 'barricade' },
  { xFraction: 0.42, yFraction: 0.55, width: 46, height: 20, kind: 'wall' },
  { xFraction: 0.58, yFraction: 0.45, width: 46, height: 20, kind: 'cover' },
];
```

### Complete themed layout composition

This is the visual placement data for all 20 arena layouts. Each `xFraction` and `yFraction` positions an object's center relative to the arena; `width` and `height` are pixels. Barrel positions are centers and use a circular visual radius provided at runtime.

```ts
const THEME_LAYOUTS: Readonly<Record<ArenaThemeId, readonly ArenaLayoutDefinition[]>> = {
  military: [
    { id: 'military-open-centre', name: 'Open Centre', theme: 'military', obstacles: [
      { xFraction: 0.18, yFraction: 0.25, width: 62, height: 74, kind: 'crate' },
      { xFraction: 0.82, yFraction: 0.2, width: 74, height: 62, kind: 'crate' },
      { xFraction: 0.82, yFraction: 0.77, width: 68, height: 60, kind: 'crate' },
      { xFraction: 0.2, yFraction: 0.8, width: 70, height: 64, kind: 'crate' },
      { xFraction: 0.48, yFraction: 0.21, width: 108, height: 20, kind: 'barricade' },
      { xFraction: 0.52, yFraction: 0.79, width: 112, height: 20, kind: 'barricade' },
      { xFraction: 0.5, yFraction: 0.5, width: 36, height: 22, kind: 'cover' },
    ], barrels: [{ id: 'military-barrel-1', xFraction: 0.64, yFraction: 0.43 }, { id: 'military-barrel-2', xFraction: 0.36, yFraction: 0.57 }] },
    { id: 'military-corridor-network', name: 'Corridor Network', theme: 'military', obstacles: [
      { xFraction: 0.27, yFraction: 0.28, width: 72, height: 18, kind: 'barricade' },
      { xFraction: 0.72, yFraction: 0.28, width: 72, height: 18, kind: 'barricade' },
      { xFraction: 0.27, yFraction: 0.72, width: 72, height: 18, kind: 'barricade' },
      { xFraction: 0.72, yFraction: 0.72, width: 72, height: 18, kind: 'barricade' },
      { xFraction: 0.45, yFraction: 0.5, width: 50, height: 44, kind: 'crate' },
      { xFraction: 0.55, yFraction: 0.5, width: 50, height: 44, kind: 'crate' },
      { xFraction: 0.5, yFraction: 0.28, width: 90, height: 26, kind: 'wall' },
      { xFraction: 0.5, yFraction: 0.72, width: 90, height: 26, kind: 'wall' },
    ], barrels: [{ id: 'military-barrel-1', xFraction: 0.36, yFraction: 0.5 }, { id: 'military-barrel-2', xFraction: 0.64, yFraction: 0.5 }] },
    { id: 'military-scattered-cover', name: 'Scattered Cover', theme: 'military', obstacles: [
      { xFraction: 0.18, yFraction: 0.35, width: 52, height: 34, kind: 'cover' },
      { xFraction: 0.36, yFraction: 0.18, width: 42, height: 28, kind: 'crate' },
      { xFraction: 0.68, yFraction: 0.26, width: 56, height: 42, kind: 'cover' },
      { xFraction: 0.8, yFraction: 0.64, width: 54, height: 38, kind: 'crate' },
      { xFraction: 0.26, yFraction: 0.75, width: 58, height: 34, kind: 'cover' },
      { xFraction: 0.5, yFraction: 0.48, width: 90, height: 16, kind: 'barricade' },
    ], barrels: [{ id: 'military-barrel-1', xFraction: 0.44, yFraction: 0.18 }, { id: 'military-barrel-2', xFraction: 0.58, yFraction: 0.84 }] },
    { id: 'military-central-structure', name: 'Central Structure', theme: 'military', obstacles: [
      { xFraction: 0.5, yFraction: 0.5, width: 150, height: 110, kind: 'wall' },
      { xFraction: 0.25, yFraction: 0.24, width: 76, height: 18, kind: 'barricade' },
      { xFraction: 0.75, yFraction: 0.24, width: 76, height: 18, kind: 'barricade' },
      { xFraction: 0.25, yFraction: 0.76, width: 76, height: 18, kind: 'barricade' },
      { xFraction: 0.75, yFraction: 0.76, width: 76, height: 18, kind: 'barricade' },
      { xFraction: 0.5, yFraction: 0.18, width: 54, height: 44, kind: 'crate' },
      { xFraction: 0.5, yFraction: 0.82, width: 54, height: 44, kind: 'crate' },
    ], barrels: [{ id: 'military-barrel-1', xFraction: 0.38, yFraction: 0.5 }, { id: 'military-barrel-2', xFraction: 0.62, yFraction: 0.5 }] },
  ],
  industrial: [
    { id: 'industrial-open-centre', name: 'Open Centre', theme: 'industrial', obstacles: [
      { xFraction: 0.16, yFraction: 0.23, width: 88, height: 62, kind: 'wall' },
      { xFraction: 0.84, yFraction: 0.23, width: 80, height: 52, kind: 'wall' },
      { xFraction: 0.16, yFraction: 0.78, width: 82, height: 56, kind: 'wall' },
      { xFraction: 0.84, yFraction: 0.78, width: 90, height: 58, kind: 'wall' },
      { xFraction: 0.5, yFraction: 0.22, width: 110, height: 18, kind: 'barricade' },
      { xFraction: 0.5, yFraction: 0.78, width: 104, height: 18, kind: 'barricade' },
      { xFraction: 0.5, yFraction: 0.5, width: 44, height: 28, kind: 'cover' },
    ], barrels: [{ id: 'ind-barrel-1', xFraction: 0.34, yFraction: 0.5 }, { id: 'ind-barrel-2', xFraction: 0.66, yFraction: 0.5 }] },
    { id: 'industrial-cluster-split', name: 'Industrial Cluster', theme: 'industrial', obstacles: [
      { xFraction: 0.3, yFraction: 0.3, width: 84, height: 70, kind: 'wall' },
      { xFraction: 0.7, yFraction: 0.3, width: 84, height: 70, kind: 'wall' },
      { xFraction: 0.3, yFraction: 0.7, width: 84, height: 70, kind: 'wall' },
      { xFraction: 0.7, yFraction: 0.7, width: 84, height: 70, kind: 'wall' },
      { xFraction: 0.5, yFraction: 0.5, width: 52, height: 52, kind: 'cover' },
      { xFraction: 0.5, yFraction: 0.18, width: 110, height: 20, kind: 'barricade' },
      { xFraction: 0.5, yFraction: 0.82, width: 110, height: 20, kind: 'barricade' },
    ], barrels: [{ id: 'ind-barrel-1', xFraction: 0.5, yFraction: 0.32 }, { id: 'ind-barrel-2', xFraction: 0.5, yFraction: 0.68 }] },
    { id: 'industrial-corridor', name: 'Corridor Grid', theme: 'industrial', obstacles: [
      { xFraction: 0.24, yFraction: 0.25, width: 66, height: 18, kind: 'barricade' },
      { xFraction: 0.76, yFraction: 0.25, width: 66, height: 18, kind: 'barricade' },
      { xFraction: 0.24, yFraction: 0.75, width: 66, height: 18, kind: 'barricade' },
      { xFraction: 0.76, yFraction: 0.75, width: 66, height: 18, kind: 'barricade' },
      { xFraction: 0.5, yFraction: 0.26, width: 90, height: 22, kind: 'wall' },
      { xFraction: 0.5, yFraction: 0.74, width: 90, height: 22, kind: 'wall' },
      { xFraction: 0.5, yFraction: 0.5, width: 60, height: 62, kind: 'crate' },
    ], barrels: [{ id: 'ind-barrel-1', xFraction: 0.38, yFraction: 0.5 }, { id: 'ind-barrel-2', xFraction: 0.62, yFraction: 0.5 }] },
    { id: 'industrial-rust-scrap', name: 'Rust Scrap', theme: 'industrial', obstacles: [
      { xFraction: 0.2, yFraction: 0.18, width: 54, height: 44, kind: 'crate' },
      { xFraction: 0.8, yFraction: 0.18, width: 54, height: 44, kind: 'crate' },
      { xFraction: 0.2, yFraction: 0.82, width: 54, height: 44, kind: 'crate' },
      { xFraction: 0.8, yFraction: 0.82, width: 54, height: 44, kind: 'crate' },
      { xFraction: 0.5, yFraction: 0.5, width: 120, height: 30, kind: 'barricade' },
      { xFraction: 0.5, yFraction: 0.33, width: 66, height: 26, kind: 'cover' },
      { xFraction: 0.5, yFraction: 0.67, width: 66, height: 26, kind: 'cover' },
    ], barrels: [{ id: 'ind-barrel-1', xFraction: 0.42, yFraction: 0.42 }, { id: 'ind-barrel-2', xFraction: 0.58, yFraction: 0.58 }] },
  ],
  contaminated: [
    { id: 'contaminated-open-lab', name: 'Open Lab', theme: 'contaminated', obstacles: [
      { xFraction: 0.25, yFraction: 0.26, width: 52, height: 50, kind: 'crate' },
      { xFraction: 0.75, yFraction: 0.26, width: 52, height: 50, kind: 'crate' },
      { xFraction: 0.25, yFraction: 0.74, width: 52, height: 50, kind: 'crate' },
      { xFraction: 0.75, yFraction: 0.74, width: 52, height: 50, kind: 'crate' },
      { xFraction: 0.5, yFraction: 0.3, width: 100, height: 14, kind: 'barricade' },
      { xFraction: 0.5, yFraction: 0.7, width: 100, height: 14, kind: 'barricade' },
      { xFraction: 0.5, yFraction: 0.5, width: 34, height: 30, kind: 'cover' },
    ], barrels: [{ id: 'cont-barrel-1', xFraction: 0.36, yFraction: 0.5 }, { id: 'cont-barrel-2', xFraction: 0.64, yFraction: 0.5 }] },
    { id: 'contaminated-split-lab', name: 'Split Laboratory', theme: 'contaminated', obstacles: [
      { xFraction: 0.34, yFraction: 0.32, width: 72, height: 18, kind: 'barricade' },
      { xFraction: 0.66, yFraction: 0.68, width: 72, height: 18, kind: 'barricade' },
      { xFraction: 0.65, yFraction: 0.32, width: 72, height: 18, kind: 'barricade' },
      { xFraction: 0.35, yFraction: 0.68, width: 72, height: 18, kind: 'barricade' },
      { xFraction: 0.5, yFraction: 0.5, width: 22, height: 150, kind: 'wall' },
      { xFraction: 0.28, yFraction: 0.5, width: 42, height: 42, kind: 'crate' },
      { xFraction: 0.72, yFraction: 0.5, width: 42, height: 42, kind: 'crate' },
    ], barrels: [{ id: 'cont-barrel-1', xFraction: 0.5, yFraction: 0.18 }, { id: 'cont-barrel-2', xFraction: 0.5, yFraction: 0.82 }] },
    { id: 'contaminated-scattered-tanks', name: 'Scattered Tanks', theme: 'contaminated', obstacles: [
      { xFraction: 0.2, yFraction: 0.2, width: 54, height: 46, kind: 'cover' },
      { xFraction: 0.82, yFraction: 0.2, width: 54, height: 46, kind: 'cover' },
      { xFraction: 0.2, yFraction: 0.8, width: 54, height: 46, kind: 'cover' },
      { xFraction: 0.82, yFraction: 0.8, width: 54, height: 46, kind: 'cover' },
      { xFraction: 0.5, yFraction: 0.25, width: 84, height: 16, kind: 'barricade' },
      { xFraction: 0.5, yFraction: 0.75, width: 84, height: 16, kind: 'barricade' },
      { xFraction: 0.5, yFraction: 0.5, width: 58, height: 58, kind: 'crate' },
    ], barrels: [{ id: 'cont-barrel-1', xFraction: 0.44, yFraction: 0.5 }, { id: 'cont-barrel-2', xFraction: 0.56, yFraction: 0.5 }] },
    { id: 'contaminated-central-structure', name: 'Central Containment', theme: 'contaminated', obstacles: [
      { xFraction: 0.5, yFraction: 0.5, width: 126, height: 104, kind: 'wall' },
      { xFraction: 0.2, yFraction: 0.5, width: 42, height: 42, kind: 'crate' },
      { xFraction: 0.8, yFraction: 0.5, width: 42, height: 42, kind: 'crate' },
      { xFraction: 0.5, yFraction: 0.18, width: 68, height: 18, kind: 'barricade' },
      { xFraction: 0.5, yFraction: 0.82, width: 68, height: 18, kind: 'barricade' },
      { xFraction: 0.5, yFraction: 0.34, width: 20, height: 90, kind: 'cover' },
      { xFraction: 0.5, yFraction: 0.66, width: 20, height: 90, kind: 'cover' },
    ], barrels: [{ id: 'cont-barrel-1', xFraction: 0.38, yFraction: 0.34 }, { id: 'cont-barrel-2', xFraction: 0.62, yFraction: 0.66 }] },
  ],
  urban: [
    { id: 'urban-open-road', name: 'Open Road', theme: 'urban', obstacles: [
      { xFraction: 0.18, yFraction: 0.3, width: 64, height: 54, kind: 'crate' },
      { xFraction: 0.82, yFraction: 0.3, width: 64, height: 54, kind: 'crate' },
      { xFraction: 0.18, yFraction: 0.7, width: 64, height: 54, kind: 'crate' },
      { xFraction: 0.82, yFraction: 0.7, width: 64, height: 54, kind: 'crate' },
      { xFraction: 0.5, yFraction: 0.25, width: 108, height: 18, kind: 'barricade' },
      { xFraction: 0.5, yFraction: 0.75, width: 108, height: 18, kind: 'barricade' },
      { xFraction: 0.5, yFraction: 0.5, width: 52, height: 18, kind: 'cover' },
    ], barrels: [{ id: 'urban-barrel-1', xFraction: 0.5, yFraction: 0.5 }] },
    { id: 'urban-rubble-lane', name: 'Rubble Lane', theme: 'urban', obstacles: [
      { xFraction: 0.25, yFraction: 0.25, width: 90, height: 18, kind: 'barricade' },
      { xFraction: 0.75, yFraction: 0.25, width: 90, height: 18, kind: 'barricade' },
      { xFraction: 0.25, yFraction: 0.75, width: 90, height: 18, kind: 'barricade' },
      { xFraction: 0.75, yFraction: 0.75, width: 90, height: 18, kind: 'barricade' },
      { xFraction: 0.35, yFraction: 0.5, width: 60, height: 52, kind: 'crate' },
      { xFraction: 0.65, yFraction: 0.5, width: 60, height: 52, kind: 'crate' },
      { xFraction: 0.5, yFraction: 0.5, width: 22, height: 120, kind: 'wall' },
    ], barrels: [{ id: 'urban-barrel-1', xFraction: 0.44, yFraction: 0.5 }, { id: 'urban-barrel-2', xFraction: 0.56, yFraction: 0.5 }] },
    { id: 'urban-ruined-block', name: 'Ruined Block', theme: 'urban', obstacles: [
      { xFraction: 0.2, yFraction: 0.2, width: 82, height: 70, kind: 'wall' },
      { xFraction: 0.8, yFraction: 0.2, width: 82, height: 70, kind: 'wall' },
      { xFraction: 0.2, yFraction: 0.8, width: 82, height: 70, kind: 'wall' },
      { xFraction: 0.8, yFraction: 0.8, width: 82, height: 70, kind: 'wall' },
      { xFraction: 0.5, yFraction: 0.5, width: 70, height: 26, kind: 'barricade' },
      { xFraction: 0.5, yFraction: 0.35, width: 40, height: 28, kind: 'cover' },
      { xFraction: 0.5, yFraction: 0.65, width: 40, height: 28, kind: 'cover' },
    ], barrels: [{ id: 'urban-barrel-1', xFraction: 0.5, yFraction: 0.18 }, { id: 'urban-barrel-2', xFraction: 0.5, yFraction: 0.82 }] },
    { id: 'urban-roadblock-loop', name: 'Roadblock Loop', theme: 'urban', obstacles: [
      { xFraction: 0.25, yFraction: 0.5, width: 54, height: 62, kind: 'crate' },
      { xFraction: 0.75, yFraction: 0.5, width: 54, height: 62, kind: 'crate' },
      { xFraction: 0.5, yFraction: 0.23, width: 110, height: 18, kind: 'barricade' },
      { xFraction: 0.5, yFraction: 0.77, width: 110, height: 18, kind: 'barricade' },
      { xFraction: 0.42, yFraction: 0.5, width: 20, height: 100, kind: 'wall' },
      { xFraction: 0.58, yFraction: 0.5, width: 20, height: 100, kind: 'wall' },
      { xFraction: 0.5, yFraction: 0.5, width: 36, height: 28, kind: 'cover' },
    ], barrels: [{ id: 'urban-barrel-1', xFraction: 0.5, yFraction: 0.34 }, { id: 'urban-barrel-2', xFraction: 0.5, yFraction: 0.66 }] },
  ],
  bunker: [
    { id: 'bunker-open-bay', name: 'Open Bay', theme: 'bunker', obstacles: [
      { xFraction: 0.2, yFraction: 0.28, width: 76, height: 54, kind: 'wall' },
      { xFraction: 0.8, yFraction: 0.28, width: 76, height: 54, kind: 'wall' },
      { xFraction: 0.2, yFraction: 0.72, width: 76, height: 54, kind: 'wall' },
      { xFraction: 0.8, yFraction: 0.72, width: 76, height: 54, kind: 'wall' },
      { xFraction: 0.5, yFraction: 0.2, width: 120, height: 20, kind: 'barricade' },
      { xFraction: 0.5, yFraction: 0.8, width: 120, height: 20, kind: 'barricade' },
      { xFraction: 0.5, yFraction: 0.5, width: 46, height: 34, kind: 'cover' },
    ], barrels: [{ id: 'bunker-barrel-1', xFraction: 0.38, yFraction: 0.5 }, { id: 'bunker-barrel-2', xFraction: 0.62, yFraction: 0.5 }] },
    { id: 'bunker-split-hall', name: 'Split Hall', theme: 'bunker', obstacles: [
      { xFraction: 0.34, yFraction: 0.34, width: 52, height: 94, kind: 'wall' },
      { xFraction: 0.66, yFraction: 0.66, width: 52, height: 94, kind: 'wall' },
      { xFraction: 0.66, yFraction: 0.34, width: 52, height: 94, kind: 'wall' },
      { xFraction: 0.34, yFraction: 0.66, width: 52, height: 94, kind: 'wall' },
      { xFraction: 0.5, yFraction: 0.5, width: 110, height: 30, kind: 'barricade' },
      { xFraction: 0.5, yFraction: 0.18, width: 90, height: 18, kind: 'barricade' },
      { xFraction: 0.5, yFraction: 0.82, width: 90, height: 18, kind: 'barricade' },
    ], barrels: [{ id: 'bunker-barrel-1', xFraction: 0.5, yFraction: 0.22 }, { id: 'bunker-barrel-2', xFraction: 0.5, yFraction: 0.78 }] },
    { id: 'bunker-core-structure', name: 'Core Structure', theme: 'bunker', obstacles: [
      { xFraction: 0.5, yFraction: 0.5, width: 176, height: 132, kind: 'wall' },
      { xFraction: 0.25, yFraction: 0.32, width: 66, height: 18, kind: 'barricade' },
      { xFraction: 0.75, yFraction: 0.32, width: 66, height: 18, kind: 'barricade' },
      { xFraction: 0.25, yFraction: 0.68, width: 66, height: 18, kind: 'barricade' },
      { xFraction: 0.75, yFraction: 0.68, width: 66, height: 18, kind: 'barricade' },
      { xFraction: 0.5, yFraction: 0.2, width: 48, height: 40, kind: 'crate' },
      { xFraction: 0.5, yFraction: 0.8, width: 48, height: 40, kind: 'crate' },
    ], barrels: [{ id: 'bunker-barrel-1', xFraction: 0.38, yFraction: 0.5 }, { id: 'bunker-barrel-2', xFraction: 0.62, yFraction: 0.5 }] },
    { id: 'bunker-perimeter-defence', name: 'Perimeter Defence', theme: 'bunker', obstacles: [
      { xFraction: 0.16, yFraction: 0.2, width: 54, height: 40, kind: 'cover' },
      { xFraction: 0.84, yFraction: 0.2, width: 54, height: 40, kind: 'cover' },
      { xFraction: 0.16, yFraction: 0.8, width: 54, height: 40, kind: 'cover' },
      { xFraction: 0.84, yFraction: 0.8, width: 54, height: 40, kind: 'cover' },
      { xFraction: 0.5, yFraction: 0.25, width: 120, height: 17, kind: 'barricade' },
      { xFraction: 0.5, yFraction: 0.75, width: 120, height: 17, kind: 'barricade' },
      { xFraction: 0.5, yFraction: 0.5, width: 80, height: 16, kind: 'wall' },
    ], barrels: [{ id: 'bunker-barrel-1', xFraction: 0.5, yFraction: 0.38 }, { id: 'bunker-barrel-2', xFraction: 0.5, yFraction: 0.62 }] },
  ],
} as const;
```

## Appearance change guide

- **Change the floor, grid, or markings:** modify `ARENA_THEME_CYCLE` and/or `renderArenaLayer`.
- **Add a visible perimeter, inner frame, vignette, or central floor insignia:** implement it in `renderArenaLayer`. The current `boundary`, `innerBoundary`, `centerMarkingHalfLength`, and `centerMarkingWidth` values are not currently rendered.
- **Change the look of a crate, barricade, wall, cover, or barrel:** modify `drawObstacle` or `drawBarrel`.
- **Change shared material colors:** modify the provided `GAME_PALETTE.arena` values. Barrel-specific outline/fissure colors are read from `GAME_PALETTE.orbs.bomb` and `GAME_PALETTE.combat.projectileOutline`.
- **Change detail sizes, stripe spacing, and shadow direction:** modify the provided `GAME_VISUAL_CONFIG` arena/obstacle values.
- **Change which props appear and their positions/sizes:** modify `THEME_LAYOUTS`. Keep each center as `xFraction`/`yFraction` and dimensions as pixel values.
- **Change zoom behavior during arena transitions:** modify the `renderArena` implementation.

The code here intentionally excludes collision and damage algorithms. Visual edits should preserve the existing geometry inputs, object `kind` values, health fields, and public `renderArena` parameters so the current game can continue supplying positions and damaged/destroyed states.
