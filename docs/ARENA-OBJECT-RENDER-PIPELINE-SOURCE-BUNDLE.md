# Arena Object Render Pipeline Source Bundle

Complete current source code follows. These files define the render-layer contract, convert game state into render commands, and draw visual effects.

## Arena renderer structure

Arena rendering is organized by responsibility under `src/game/arenas`:

- `core/ArenaRenderer.ts` coordinates floor, obstacles, and arena transitions.
- `core/ArenaFloorRenderer.ts` owns shared theme-based floor and frame drawing.
- `core/ArenaObjectRenderer.ts` draws themed obstacles and barrels.
- `core/ArenaRenderTypes.ts` defines the renderer's input contract.
- `environments/industrial/environment/` contains industrial-specific floor
  rendering; `environments/industrial/index.ts` is its public entry point.

`src/game/arenas/index.ts` is the public arena-rendering entry point.
`src/game/rendering/ArenaRenderer.ts` remains a compatibility entry point for
existing callers. Keep environment-specific visuals in that environment's
folder and expose each environment through its `index.ts`.

## RenderScene.ts

Defines render command, actor, and layer types.

`src/game/rendering/RenderScene.ts`

```ts
import type {
  ArenaObstacleEntity,
  ArenaThemeId,
  ExplosiveBarrelEntity,
} from '../arena/ArenaSystem';

export interface RenderFrame {
  readonly elapsedSeconds: number;
}

export interface RenderCommand {
  readonly draw: (
    context: CanvasRenderingContext2D,
    frame: RenderFrame,
  ) => void;
}

export interface RenderActor extends RenderCommand {
  readonly y: number;
}

export interface RenderLayers {
  readonly visibility?: {
    readonly x: number;
    readonly y: number;
    readonly radius: number;
  };
  readonly arena?: {
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
  };
  readonly groundShadows: readonly RenderCommand[];
  readonly pickups: readonly RenderCommand[];
  readonly projectiles: readonly RenderCommand[];
  readonly actors: readonly RenderActor[];
  readonly foregroundEffects: readonly RenderCommand[];
  readonly feedback: readonly RenderCommand[];
  readonly debugOverlays: readonly RenderCommand[];
}

export const EMPTY_RENDER_LAYERS: RenderLayers = {
  groundShadows: [],
  pickups: [],
  projectiles: [],
  actors: [],
  foregroundEffects: [],
  feedback: [],
  debugOverlays: [],
};
```

## GameStateRenderer.ts

Builds render layers from current game state.

`src/game/rendering/GameStateRenderer.ts`

```ts
import { createGroundShadowCommand } from './EntityRenderer';
import { GAME_PALETTE } from './GamePalette';
import { GAME_VISUAL_CONFIG } from './VisualConfig';
import {
  drawCollectionBurst,
  drawDamageNumber,
  drawImpactEffect,
  drawMuzzleFlash,
} from './EffectsRenderer';
import { drawOrb } from './OrbRenderer';
import { drawCircle, drawLine, drawRing, drawSymbol } from './ShapeLibrary';
import { drawPlayer } from './PlayerRenderer';
import { drawProjectile } from './ProjectileRenderer';
import type { RenderActor, RenderCommand, RenderLayers } from './RenderScene';
import { drawZombie } from './ZombieRenderer';
import type { GameState } from '../core/GameState';
import {
  ARENA_TRANSITION_SECONDS,
  WAVE_MODIFIER_CONFIG,
} from '../core/GameConfig';

export function createGameStateRenderLayers(state: GameState): RenderLayers {
  const { player } = state;
  const visibilityRadiusMultiplier =
    state.wave.activeModifier === 'reducedVisibility'
      ? WAVE_MODIFIER_CONFIG.definitions.reducedVisibility
        .visibilityRadiusMultiplier
      : undefined;
  const actors: RenderActor[] = [
    {
      y: player.y,
      draw: (context, frame) => drawPlayer(
        context,
        {
          x: player.x,
          y: player.y,
          aimAngle: player.aimAngle,
          movementFactor: player.movementFactor,
          hitFlash: Math.min(1, player.hitFlashSeconds / 0.22),
          shieldStrength: player.shieldStrength,
        },
        frame.elapsedSeconds,
      ),
    },
    ...state.zombies.map((zombie): RenderActor => ({
      y: zombie.y,
      draw: (context, frame) => drawZombie(
        context,
        {
          x: zombie.x,
          y: zombie.y,
          type: zombie.type,
          facingAngle: zombie.facingAngle,
          hitFlash: Math.min(1, zombie.hitFlashSeconds / 0.16),
          healthFraction: zombie.health / zombie.maxHealth,
          isElite: zombie.isElite,
          eliteModifier: zombie.eliteModifier,
          shieldFraction: zombie.eliteMaxShieldHealth
            ? (zombie.eliteShieldHealth ?? 0) / zombie.eliteMaxShieldHealth
            : 0,
          eliteExplosionFraction: zombie.eliteExplosionSeconds === undefined
            ? undefined
            : zombie.eliteExplosionSeconds /
              (zombie.eliteExplosionDurationSeconds ?? 1),
          radius: zombie.radius,
          isBoss: zombie.isBoss,
          bossType: zombie.bossType,
          bossShielded: zombie.bossShielded,
          bossPhase: zombie.bossPhase,
          bossChargeAngle: zombie.bossChargeAngle,
        },
        frame.elapsedSeconds,
      ),
    })),
    ...state.supportTurrets.map((turret): RenderActor => ({
      y: turret.y,
      draw: (context, frame) => {
        const pulse = 1 + Math.sin(frame.elapsedSeconds * 5 + turret.id) * 0.04;
        const aimAngle = turret.aimAngle ?? 0;
        drawLine(
          context,
          { x: turret.x, y: turret.y },
          {
            x: turret.x + Math.cos(aimAngle) * 20,
            y: turret.y + Math.sin(aimAngle) * 20,
          },
          GAME_PALETTE.combat.turretProjectile,
          4,
        );
        drawCircle(
          context,
          turret.x,
          turret.y,
          GAME_VISUAL_CONFIG.entity.supportTurretRadius * pulse,
          {
            fill: GAME_PALETTE.orbs.turret,
            stroke: GAME_PALETTE.arena.boundary,
            lineWidth: 2,
          },
        );
        drawSymbol(
          context,
          'crosshair',
          turret.x,
          turret.y,
          8,
          GAME_PALETTE.arena.floor,
          1.5,
        );
        drawRing(
          context,
          turret.x,
          turret.y,
          17 * pulse,
          GAME_PALETTE.orbs.turret,
          1,
        );
      },
    })),
  ];
  const groundShadows: RenderCommand[] = [
    createGroundShadowCommand(player, player.radius),
    ...state.hazards.map((hazard): RenderCommand => ({
      draw: (context, frame) => {
        context.save();
        try {
          if (hazard.kind === 'bloater') {
            const colors = GAME_PALETTE.hazards;
            context.globalAlpha = 0.9;
            drawCircle(context, hazard.x, hazard.y, hazard.radius, {
              fill: colors.bloaterFill,
            });
            drawRing(
              context,
              hazard.x,
              hazard.y,
              hazard.radius,
              colors.bloaterEdge,
              2,
            );
          } else {
            context.globalAlpha = 0.35;
            drawCircle(context, hazard.x, hazard.y, hazard.radius, {
              fill: GAME_PALETTE.hazards.acidFill,
            });
            drawRing(
              context,
              hazard.x,
              hazard.y,
              hazard.radius,
              GAME_PALETTE.hazards.acidEdge,
              2,
            );
          }
        } finally {
          context.restore();
        }
      },
    })),
    ...state.zombies.map((zombie) =>
      createGroundShadowCommand(zombie, zombie.radius),
    ),
    ...state.items.map((item) =>
      createGroundShadowCommand(item, item.radius),
    ),
    ...state.supportTurrets.map((turret) =>
      createGroundShadowCommand(
        turret,
        GAME_VISUAL_CONFIG.entity.supportTurretRadius,
      ),
    ),
  ];
  const projectiles: RenderCommand[] = state.projectiles.map((projectile) => ({
    draw: (context) => drawProjectile(context, {
      x: projectile.x,
      y: projectile.y,
      directionX: projectile.directionX,
      directionY: projectile.directionY,
      radius: projectile.radius,
      type: projectile.kind === 'turret'
        ? 'turret'
        : projectile.kind === 'spitter'
          ? 'spitter'
          : projectile.kind === 'acid'
            ? 'acid'
            : projectile.kind === 'heavy' || projectile.kind === 'critical'
              ? projectile.kind
              : 'standard',
    }),
  }));
  const foregroundEffects: RenderCommand[] = [
    ...(player.muzzleFlashSeconds > 0
      ? [{
          draw: (context: CanvasRenderingContext2D) => drawMuzzleFlash(context, {
            x: player.x + Math.cos(player.aimAngle) * (player.radius + 5),
            y: player.y + Math.sin(player.aimAngle) * (player.radius + 5),
            angle: player.aimAngle,
            intensity: player.muzzleFlashSeconds / 0.075,
          }),
        }]
      : []),
    ...state.hazards.filter((hazard) => hazard.kind === 'bloater').map(
      (hazard): RenderCommand => ({
        draw: (context, frame) => {
          context.save();
          try {
            for (let particle = 0; particle < 10; particle += 1) {
              const phase =
                (frame.elapsedSeconds * 0.55 + particle * 0.137 +
                  hazard.id * 0.031) % 1;
              const angle = particle * 2.4 + hazard.id;
              const distance = hazard.radius * (0.18 + (particle % 4) * 0.17);
              const x = hazard.x + Math.cos(angle) * distance;
              const y = hazard.y + Math.sin(angle) * distance -
                phase * hazard.radius * 0.35;
              context.globalAlpha = 0.9 * (1 - phase * 0.65);
              drawCircle(context, x, y, 1.5 + (particle % 3) * 0.55, {
                fill: GAME_PALETTE.hazards.bloaterParticle,
              });
            }
          } finally {
            context.restore();
          }
        },
      }),
    ),
  ];
  const feedback: RenderCommand[] = [
    ...state.collectionEffects.map((effect): RenderCommand => ({
      draw: (context) => drawCollectionBurst(context, {
        x: effect.x,
        y: effect.y,
        color: effect.color,
        progress: 1 - effect.remainingSeconds / effect.durationSeconds,
      }),
    })),
    ...state.impacts.map((impact): RenderCommand => ({
      draw: (context) => drawImpactEffect(context, {
        x: impact.x,
        y: impact.y,
        progress: 1 - impact.remainingSeconds / impact.durationSeconds,
        critical: impact.critical,
        kind: impact.kind,
        color: impact.color,
        radius: impact.radius,
      }),
    })),
    ...state.damageNumbers.map((damage): RenderCommand => ({
      draw: (context) => drawDamageNumber(context, {
        x: damage.x,
        y: damage.y,
        progress: 1 - damage.remainingSeconds / damage.durationSeconds,
        amount: damage.amount,
      }),
    })),
  ];

  return {
    visibility: visibilityRadiusMultiplier !== undefined
      ? {
          x: player.x,
          y: player.y,
          radius: Math.min(state.arenaWidth, state.arenaHeight) *
            visibilityRadiusMultiplier,
        }
      : undefined,
    arena: {
      obstacles: state.arenaObstacles,
      barrels: state.barrels,
      theme: state.arenaTheme,
      ...(state.wave.phase === 'intermission' && state.arenaTransitionFrom
        ? {
            transition: {
              from: state.arenaTransitionFrom,
              progress: Math.max(
                0,
                Math.min(
                  1,
                  1 - state.wave.transitionCountdownSeconds /
                    ARENA_TRANSITION_SECONDS,
                ),
              ),
            },
          }
        : {}),
    },
    groundShadows,
    pickups: state.items.map((item) => ({
      draw: (context, frame) => drawOrb(context, {
        x: item.x,
        y: item.y,
        type: item.type,
        rarity: item.rarity,
        radius: item.radius,
        remainingFraction: item.remainingSeconds / item.durationSeconds,
      }, frame.elapsedSeconds),
    })),
    projectiles,
    actors,
    foregroundEffects,
    feedback,
    debugOverlays: [],
  };
}

export function getGameEntityCount(state: GameState): number {
  return (
    1 +
    state.zombies.length +
    state.items.length +
    state.supportTurrets.length +
    state.projectiles.length +
    state.impacts.length +
    state.damageNumbers.length +
    state.collectionEffects.length
  );
}
```

## EffectsRenderer.ts

Contains procedural Canvas rendering for visual effects and feedback.

`src/game/rendering/EffectsRenderer.ts`

```ts
import { GAME_PALETTE } from './GamePalette';
import { GAME_VISUAL_CONFIG } from './VisualConfig';
import { clampVisualValue } from './EntityRenderer';
import type { WorldPoint } from './EntityRenderer';
import { drawCircle, drawLine, drawPolygon, drawRing, drawStarburst } from './ShapeLibrary';

export interface MuzzleFlashVisualState extends WorldPoint {
  readonly angle: number;
  readonly intensity: number;
}

export interface ImpactVisualState extends WorldPoint {
  readonly progress: number;
  readonly critical?: boolean;
  readonly kind?: 'hit' | 'death' | 'bomb' | 'orbExpiry' | 'spawn' | 'playerDamage' | 'telegraph' | 'acid';
  readonly color?: string;
  readonly radius?: number;
}

export interface CollectionBurstVisualState extends WorldPoint {
  readonly progress: number;
  readonly color: string;
}

export interface DamageNumberVisualState extends WorldPoint {
  readonly progress: number;
  readonly amount: number;
  readonly critical?: boolean;
}

export function drawMuzzleFlash(
  context: CanvasRenderingContext2D,
  flash: MuzzleFlashVisualState,
): void {
  const intensity = clampVisualValue(flash.intensity);
  if (intensity === 0) return;

  const direction = { x: Math.cos(flash.angle), y: Math.sin(flash.angle) };
  const perpendicular = { x: -direction.y, y: direction.x };
  const length = GAME_VISUAL_CONFIG.effects.muzzleFlashLength * intensity;
  const points = [
    { x: flash.x + direction.x * 2, y: flash.y + direction.y * 2 },
    {
      x: flash.x + direction.x * length + perpendicular.x * length * 0.32,
      y: flash.y + direction.y * length + perpendicular.y * length * 0.32,
    },
    {
      x: flash.x + direction.x * length * 0.74,
      y: flash.y + direction.y * length * 0.74,
    },
    {
      x: flash.x + direction.x * length - perpendicular.x * length * 0.32,
      y: flash.y + direction.y * length - perpendicular.y * length * 0.32,
    },
  ];

  context.save();
  try {
    context.globalAlpha = intensity;
    drawPolygon(context, points, {
      fill: GAME_PALETTE.combat.muzzleFlash,
      stroke: GAME_PALETTE.combat.muzzleFlashOutline,
      lineWidth: 1,
    });
  } finally {
    context.restore();
  }
}

export function drawImpactEffect(
  context: CanvasRenderingContext2D,
  effect: ImpactVisualState,
): void {
  const progress = clampVisualValue(effect.progress);
  const color = effect.color ?? (
    effect.kind === 'telegraph'
      ? GAME_PALETTE.enemies.chargerTelegraph
      : effect.kind === 'acid'
        ? GAME_PALETTE.hazards.acidImpact
        : effect.critical
          ? GAME_PALETTE.combat.critical
          : GAME_PALETTE.combat.impact
  );
  const baseRadius = effect.radius ?? GAME_VISUAL_CONFIG.effects.impactRingRadius;
  const radius = 3 + progress * baseRadius;
  const particleCount = effect.kind === 'death'
    ? GAME_VISUAL_CONFIG.effects.impactParticleCount + 5
    : GAME_VISUAL_CONFIG.effects.impactParticleCount;
  const ringWidth = effect.kind === 'bomb' ? 3 : effect.kind === 'death' ? 2.5 : 1.5;

  context.save();
  try {
    context.globalAlpha = 1 - progress;
    drawRing(context, effect.x, effect.y, radius, color, ringWidth);
    for (let particle = 0; particle < particleCount; particle += 1) {
      const angle = (particle * Math.PI * 2) / particleCount;
      const innerRadius = effect.kind === 'death' ? radius * 0.25 : radius * 0.62;
      const outerRadius = innerRadius + progress * (
        effect.kind === 'bomb' ? 18 : effect.kind === 'death' ? 16 : 8
      );
      drawLine(
        context,
        {
          x: effect.x + Math.cos(angle) * innerRadius,
          y: effect.y + Math.sin(angle) * innerRadius,
        },
        {
          x: effect.x + Math.cos(angle) * outerRadius,
          y: effect.y + Math.sin(angle) * outerRadius,
        },
        color,
        1.5,
      );
    }
  } finally {
    context.restore();
  }
}

export function drawCollectionBurst(
  context: CanvasRenderingContext2D,
  burst: CollectionBurstVisualState,
): void {
  const progress = clampVisualValue(burst.progress);
  const radius = progress * GAME_VISUAL_CONFIG.effects.collectionBurstLength;

  context.save();
  try {
    context.globalAlpha = 1 - progress;
    drawStarburst(
      context,
      burst.x,
      burst.y,
      Math.max(1, radius),
      Math.max(0.5, radius * 0.48),
      8,
      { stroke: burst.color, lineWidth: 2 },
      Math.PI / 8,
    );
    drawCircle(context, burst.x, burst.y, Math.max(0.5, 3 * (1 - progress)), {
      fill: burst.color,
    });
  } finally {
    context.restore();
  }
}

export function drawDamageNumber(
  context: CanvasRenderingContext2D,
  damage: DamageNumberVisualState,
): void {
  const progress = clampVisualValue(damage.progress);
  context.save();
  try {
    context.globalAlpha = 1 - progress;
    context.fillStyle = damage.critical
      ? GAME_PALETTE.combat.critical
      : GAME_PALETTE.combat.damageText;
    context.font = '600 12px sans-serif';
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillText(
      `${Math.max(0, Math.round(damage.amount))}`,
      damage.x,
      damage.y - progress * 18,
    );
  } finally {
    context.restore();
  }
}
```
