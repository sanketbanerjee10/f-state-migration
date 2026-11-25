import type { ArenaThemeId } from '../arena/ArenaSystem';
import { drawImpactEffect } from '../rendering/EffectsRenderer';
import { GAME_PALETTE } from '../rendering/GamePalette';
import { drawPlayer } from '../rendering/PlayerRenderer';
import { drawProjectile } from '../rendering/ProjectileRenderer';
import { drawRoundedRectangle } from '../rendering/ShapeLibrary';
import { renderGameScene } from '../rendering/Renderer';
import type { RenderActor, RenderCommand, RenderLayers } from '../rendering/RenderScene';
import { drawZombie } from '../rendering/ZombieRenderer';
import type { ZombieVisualState } from '../rendering/ZombieRenderer';
import {
  advanceSiegeHordeDeaths,
  applySiegeHordeDamage,
  createSiegeHordeVisuals,
  hasSiegeHordeDeathAnimation,
  SIEGE_ZOMBIE_DEATH_DURATION_SECONDS,
  type SiegeHordeVisual,
  type SiegeZombieSpawnGroup,
} from './SiegeHorde';
import {
  SIEGE_DIFFICULTIES,
  ZOMBIE_BASE_STRENGTH,
  applySiegeGate,
  applySiegeHazard,
  getSiegeCombatHordeCount,
  type SiegeGate,
  type SiegeDifficulty,
  type SiegeDifficultyData,
  type SiegeGateRow,
  type SiegeOperation,
  type SiegeHazard,
  type SiegeLevel,
  type SiegeSection,
} from './SiegeRules';
import { formatSiegeCount } from './SiegeFormatting';
import {
  MAX_PLAYER_VISUALS,
  getSiegeBulletDamage,
  getSiegeCombatSpawnGroups,
  getSiegeDisplayedUnitCount,
  getSiegeShotInterval,
  getSiegeTankFormation,
} from './SiegeCombat';
import { drawSiegeBattlefield } from './SiegeMapRenderer';

export {
  MAX_PLAYER_VISUALS,
  getSiegeBulletDamage,
  getSiegeCombatSpawnGroups,
  getSiegeDisplayedUnitCount,
  getSiegeShotInterval,
  getSiegeTankFormation,
  getSiegeVolleyDamage,
  type SiegeTankOffset,
} from './SiegeCombat';
export { getSiegeCombatHordeCount } from './SiegeRules';

export type SiegeRunPhase = 'running' | 'wall' | 'paused' | 'won' | 'lost';

export interface SiegeMovementVector {
  readonly x: number;
}

interface ActiveToxicPuddle {
  readonly value: number;
  readonly duration: number;
  elapsedSeconds: number;
  damageApplied: number;
}

interface ActiveSiegeGateEffect {
  readonly x: number;
  readonly y: number;
  readonly troopChange: number;
  elapsedSeconds: number;
}

export interface SiegeRuntimeState {
  readonly phase: SiegeRunPhase;
  readonly troops: number;
  readonly playerX: number;
  readonly playerY: number;
  readonly sectionIndex: number;
  readonly rowIndex: number;
  readonly rowCount: number;
  readonly zombiesRemaining: number;
  readonly elapsedSeconds: number;
}

export interface SiegeRunResult {
  readonly won: boolean;
  readonly finalTroops: number;
}

interface SiegeEngineOptions {
  readonly canvas: HTMLCanvasElement;
  readonly data: SiegeDifficultyData;
  readonly level: SiegeLevel;
  readonly onState: (state: SiegeRuntimeState) => void;
  readonly onComplete: (result: SiegeRunResult) => void;
  readonly onPauseRequest: () => void;
}

interface SiegeBullet {
  readonly id: number;
  x: number;
  y: number;
  readonly directionX: number;
  readonly directionY: number;
  readonly damage: number;
}

const PLAYER_RADIUS = 18;
const PLAYER_SPEED = 400;
const PLAYER_SPEED_INCREASE = 2;
const PLAYER_SPEED_REFERENCE_WIDTH = 1280;
const PLAYER_FORMATION_TRAIL_OFFSET = 28;
const PLAYER_FORMATION_TANK_SCALE = 0.55;
const PLAYER_START_Y_FRACTION = 0.72;
const GATE_HEIGHT = 56;
const HAZARD_HEIGHT = 56;
const GATE_EFFECT_DURATION_SECONDS = 0.85;
const DEFAULT_GATE_SCROLL_SPEED_PER_VIEWPORT = 0.32;
const BACKGROUND_SCROLL_SPEED_RATIO = 0.4;
const DIFFICULTY_SPACING_FRACTIONS: Readonly<Record<SiegeDifficulty, number>> = {
  easy: 0.8,
  medium: 0.64,
  difficult: 0.48,
  impossible: 0.34,
};
const ARENA_THEMES: Readonly<Record<string, ArenaThemeId>> = {
  military_outpost: 'military',
  industrial_complex: 'industrial',
  contaminated_zone: 'contaminated',
  urban_ruins: 'urban',
  underground_bunker: 'bunker',
};

export function getSiegeGateSpacing(
  height: number,
  difficulty: SiegeDifficulty,
): number {
  if (!Number.isFinite(height) || height <= 0) {
    throw new RangeError('Siege viewport height must be greater than zero.');
  }
  return height * DIFFICULTY_SPACING_FRACTIONS[difficulty];
}

export function getSiegeGateWidth(width: number, laneCount: number): number {
  if (
    !Number.isFinite(width) ||
    width <= 0 ||
    !Number.isSafeInteger(laneCount) ||
    laneCount < 1
  ) {
    throw new RangeError('Siege gate width requires a positive viewport and column count.');
  }
  return width / laneCount;
}

export interface SiegeGateBounds {
  readonly left: number;
  readonly width: number;
  readonly center: number;
}

export function getSiegeGateBounds(
  width: number,
  laneCount: number,
  gate: Pick<SiegeGate, 'lane' | 'span'>,
): SiegeGateBounds {
  const laneWidth = getSiegeGateWidth(width, laneCount);
  const span = gate.span ?? 1;
  if (
    !Number.isSafeInteger(gate.lane) ||
    gate.lane < 0 ||
    !Number.isSafeInteger(span) ||
    span < 1 ||
    gate.lane + span > laneCount
  ) {
    throw new RangeError('Siege gate bounds require a valid lane and span.');
  }
  const gateWidth = laneWidth * span;
  const left = laneWidth * gate.lane;
  return { left, width: gateWidth, center: left + gateWidth / 2 };
}

export function getSiegeGateScrollSpeed(
  height: number,
  speedPerViewport = DEFAULT_GATE_SCROLL_SPEED_PER_VIEWPORT,
): number {
  if (
    !Number.isFinite(height) ||
    height <= 0 ||
    !Number.isFinite(speedPerViewport) ||
    speedPerViewport <= 0
  ) {
    throw new RangeError('Siege gate speed requires a positive viewport and speed.');
  }
  return height * speedPerViewport;
}

export function getSiegeBackgroundScrollSpeed(
  height: number,
  gateSpeedPerViewport = DEFAULT_GATE_SCROLL_SPEED_PER_VIEWPORT,
): number {
  return getSiegeGateScrollSpeed(height, gateSpeedPerViewport) *
    BACKGROUND_SCROLL_SPEED_RATIO;
}

export function getSiegeKeyboardMovementX(
  pressedKeys: ReadonlySet<string>,
  enabled: boolean,
): number {
  if (!enabled) return 0;
  return Number(pressedKeys.has('arrowright') || pressedKeys.has('d')) -
    Number(pressedKeys.has('arrowleft') || pressedKeys.has('a'));
}

export function getSiegeGateY(
  initialY: number,
  rowIndex: number,
  spacing: number,
  scrollDistance: number,
): number {
  return initialY - rowIndex * spacing + scrollDistance;
}

export function getSiegeTimedGateY(
  initialY: number,
  elapsedSeconds: number,
  rowIndex: number,
  spawnIntervalSeconds: number,
  scrollSpeed: number,
): number | null {
  if (
    !Number.isFinite(initialY) ||
    !Number.isFinite(elapsedSeconds) ||
    elapsedSeconds < 0 ||
    !Number.isSafeInteger(rowIndex) ||
    rowIndex < 0 ||
    !Number.isFinite(spawnIntervalSeconds) ||
    spawnIntervalSeconds <= 0 ||
    !Number.isFinite(scrollSpeed) ||
    scrollSpeed <= 0
  ) {
    throw new RangeError('Siege gate timing values must be finite and positive where required.');
  }
  const spawnTime = (rowIndex + 1) * spawnIntervalSeconds;
  if (elapsedSeconds < spawnTime) return null;
  return initialY + (elapsedSeconds - spawnTime) * scrollSpeed;
}

export function getSiegeHordeWins(troops: number, zombies: number): boolean {
  if (
    !Number.isSafeInteger(troops) ||
    troops < 0 ||
    !Number.isSafeInteger(zombies) ||
    zombies < 0
  ) {
    throw new RangeError('Siege army and horde counts must be non-negative safe integers.');
  }
  return troops >= zombies;
}

export function getSiegeRemainingTroops(troops: number, zombies: number): number {
  if (
    !Number.isSafeInteger(troops) ||
    troops < 0 ||
    !Number.isSafeInteger(zombies) ||
    zombies < 0
  ) {
    throw new RangeError('Siege army and horde counts must be non-negative safe integers.');
  }
  return Math.max(0, troops - zombies);
}

export function moveSiegePlayer(
  x: number,
  y: number,
  movementX: number,
  deltaSeconds: number,
  width: number,
  height: number,
  speed = PLAYER_SPEED,
): { readonly x: number; readonly y: number } {
  if (
    ![x, y, movementX, deltaSeconds, width, height, speed]
      .every(Number.isFinite) ||
    deltaSeconds < 0 ||
    width <= PLAYER_RADIUS * 2 ||
    height <= PLAYER_RADIUS * 2 ||
    speed < 0
  ) {
    throw new RangeError('Siege player movement requires finite values and a positive viewport.');
  }
  const dx = Math.max(-1, Math.min(1, movementX));
  const scaledSpeed = speed * PLAYER_SPEED_INCREASE *
    Math.max(1, width / PLAYER_SPEED_REFERENCE_WIDTH);
  return {
    x: Math.max(PLAYER_RADIUS, Math.min(width - PLAYER_RADIUS, x + dx * scaledSpeed * deltaSeconds)),
    y: Math.max(PLAYER_RADIUS, Math.min(height - PLAYER_RADIUS, y)),
  };
}

export function moveSiegePlayerByTouch(
  x: number,
  deltaX: number,
  width: number,
): number {
  if (
    ![x, deltaX, width].every(Number.isFinite) ||
    width <= PLAYER_RADIUS * 2
  ) {
    throw new RangeError('Siege touch movement requires finite values and a positive viewport.');
  }
  return Math.max(PLAYER_RADIUS, Math.min(width - PLAYER_RADIUS, x + deltaX));
}

function getTheme(theme: string): ArenaThemeId {
  return ARENA_THEMES[theme] ?? 'military';
}

const DEFAULT_GATE_COLORS: Readonly<Record<SiegeOperation, string>> = {
  add: '#22C55E',
  sub: '#FDA4AF',
  mul: '#FACC15',
  div: '#FF1744',
};

export function getSiegeGateColor(
  op: SiegeOperation,
  gateColors?: Partial<Record<SiegeOperation, string>>,
  gateColor?: string,
): string {
  return gateColor ?? gateColors?.[op] ?? DEFAULT_GATE_COLORS[op];
}

export function getSiegeGateSymbol(op: SiegeOperation): string {
  switch (op) {
    case 'add':
      return '+';
    case 'sub':
      return '−';
    case 'mul':
      return '×';
    case 'div':
      return '/';
  }
}

function drawCountBadge(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  count: number,
  color: string,
): void {
  const label = formatSiegeCount(count);
  context.save();
  context.font = '800 15px sans-serif';
  const width = Math.max(42, context.measureText(label).width + 20);
  context.restore();
  drawRoundedRectangle(
    context,
    x - width / 2,
    y - 13,
    width,
    26,
    9,
    { fill: 'rgba(13, 19, 20, 0.94)', stroke: color, lineWidth: 2 },
  );
  context.save();
  context.fillStyle = '#F0F3DB';
  context.font = '800 15px sans-serif';
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.fillText(label, x, y);
  context.restore();
}

function drawGate(
  context: CanvasRenderingContext2D,
  width: number,
  laneCount: number,
  y: number,
  row: SiegeGateRow,
  elapsedSeconds: number,
  gateColors?: Partial<Record<SiegeOperation, string>>,
): void {
  for (const gate of row.gates) {
    const bounds = getSiegeGateBounds(width, laneCount, gate);
    const { left, width: gateWidth, center: x } = bounds;
    const color = getSiegeGateColor(gate.op, gateColors, gate.color);
    const top = y - GATE_HEIGHT / 2;
    const pulse = 0.5 + Math.sin(elapsedSeconds * 4 + gate.lane) * 0.5;
    const symbol = getSiegeGateSymbol(gate.op);

    context.save();
    context.shadowColor = color;
    context.shadowBlur = 8 + pulse * 8;
    drawRoundedRectangle(
      context,
      left + 3,
      top + 2,
      gateWidth - 6,
      GATE_HEIGHT - 4,
      10,
      { fill: 'rgba(255, 255, 255, 0.06)', stroke: color, lineWidth: 2 },
    );
    context.restore();

    const panelGradient = context.createLinearGradient(
      left + 6,
      0,
      left + gateWidth - 6,
      0,
    );
    panelGradient.addColorStop(0, 'transparent');
    panelGradient.addColorStop(0.28, color);
    panelGradient.addColorStop(0.72, color);
    panelGradient.addColorStop(1, 'transparent');
    context.save();
    context.globalAlpha = 0.34;
    drawRoundedRectangle(
      context,
      left + 6,
      top + 5,
      gateWidth - 12,
      GATE_HEIGHT - 10,
      7,
      { fill: panelGradient, stroke: 'rgba(255, 255, 255, 0.14)', lineWidth: 1 },
    );
    context.restore();

    context.save();
    context.globalAlpha = 0.35 + pulse * 0.4;
    context.fillStyle = color;
    context.fillRect(left + 8, top + 5, gateWidth - 16, 2);
    context.fillRect(left + 8, top + GATE_HEIGHT - 7, gateWidth - 16, 2);
    context.restore();

    context.save();
    context.fillStyle = color;
    context.shadowColor = color;
    context.shadowBlur = 7;
    for (let particle = 0; particle < 8; particle += 1) {
      const edge = particle % 4;
      const progress = (
        elapsedSeconds * (0.3 + (particle % 3) * 0.08) +
        particle * 0.19 +
        gate.lane * 0.11
      ) % 1;
      const horizontalTravel = Math.max(1, gateWidth - 28);
      const verticalTravel = GATE_HEIGHT - 24;
      const particleX = edge < 2
        ? left + 14 + progress * horizontalTravel
        : edge === 2
          ? left + 8
          : left + gateWidth - 8;
      const particleY = edge < 2
        ? top + (edge === 0 ? 8 : GATE_HEIGHT - 8)
        : top + 12 + progress * verticalTravel;
      const radius = 1.2 + (particle % 3) * 0.45;
      context.globalAlpha = 0.45 + (1 - progress) * 0.45;
      context.beginPath();
      context.arc(particleX, particleY, radius, 0, Math.PI * 2);
      context.fill();
    }
    context.restore();

    context.save();
    context.fillStyle = color;
    context.globalAlpha = 0.18;
    context.strokeStyle = color;
    context.lineWidth = 2;
    context.beginPath();
    context.arc(x - 20, y, 15, 0, Math.PI * 2);
    context.fill();
    context.globalAlpha = 1;
    context.globalAlpha = 0.7 + pulse * 0.3;
    context.stroke();
    context.fillStyle = color;
    context.font = '900 22px sans-serif';
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillText(symbol, x - 20, y + 1);
    context.restore();

    context.save();
    context.fillStyle = '#F0F3DB';
    context.shadowColor = color;
    context.shadowBlur = 6;
    context.font = `900 ${Math.min(26, Math.max(18, gateWidth * 0.22))}px sans-serif`;
    context.textAlign = 'left';
    context.textBaseline = 'middle';
    context.fillText(String(gate.value), x + 3, y + 1, Math.max(20, gateWidth / 2 - 20));
    context.restore();

    context.save();
    context.fillStyle = color;
    context.globalAlpha = 0.9;
    for (const side of [-1, 1]) {
      const markerX = x + side * (gateWidth / 2 - 11);
      context.beginPath();
      context.moveTo(markerX - side * 3, y - 5);
      context.lineTo(markerX + side * 2, y);
      context.lineTo(markerX - side * 3, y + 5);
      context.strokeStyle = color;
      context.lineWidth = 2;
      context.stroke();
    }
    context.restore();
  }
}

function drawHazard(
  context: CanvasRenderingContext2D,
  width: number,
  laneCount: number,
  y: number,
  hazard: SiegeHazard,
): void {
  const bounds = getSiegeGateBounds(width, laneCount, hazard);
  const color = hazard.kind === 'fuel_drum'
    ? '#F59E0B'
    : hazard.kind === 'toxic_puddle'
      ? '#84CC16'
      : '#EF4444';
  const label = hazard.kind === 'fuel_drum'
    ? `FUEL -${hazard.value}%`
    : hazard.kind === 'toxic_puddle'
      ? `TOXIC -${hazard.value}/s`
      : `WIRE -${hazard.value}`;

  context.save();
  drawRoundedRectangle(
    context,
    bounds.left + 3,
    y - HAZARD_HEIGHT / 2 + 3,
    bounds.width - 6,
    HAZARD_HEIGHT - 6,
    8,
    { fill: `${color}33`, stroke: color, lineWidth: 3 },
  );
  context.fillStyle = color;
  context.font = '800 14px sans-serif';
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.fillText(label, bounds.center, y, Math.max(24, bounds.width - 20));
  context.restore();
}

function drawSiegeGateEffect(
  context: CanvasRenderingContext2D,
  effect: ActiveSiegeGateEffect,
): void {
  const progress = Math.min(1, effect.elapsedSeconds / GATE_EFFECT_DURATION_SECONDS);
  const color = effect.troopChange > 0
    ? '#22C55E'
    : effect.troopChange < 0
      ? '#FF1744'
      : '#FACC15';
  const fade = 1 - progress;
  const label = effect.troopChange > 0
    ? `+${effect.troopChange} TROOPS`
    : effect.troopChange < 0
      ? `-${Math.abs(effect.troopChange)} TROOPS`
      : 'NO CHANGE';
  const labelY = effect.y - 78 - progress * 28;
  const pop = 1 + Math.sin(Math.min(1, progress / 0.22) * Math.PI) * 0.12;

  drawImpactEffect(context, {
    x: effect.x,
    y: effect.y,
    progress,
    color,
    radius: 68,
  });

  context.save();
  context.globalAlpha = fade;
  context.translate(effect.x, labelY);
  context.scale(pop, pop);
  drawRoundedRectangle(context, -82, -15, 164, 30, 12, {
    fill: 'rgba(8, 15, 20, 0.92)',
    stroke: color,
    lineWidth: 1.5,
  });
  context.fillStyle = color;
  context.shadowColor = color;
  context.shadowBlur = 12;
  context.font = '900 16px sans-serif';
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.fillText(label, 0, 0, 150);
  context.restore();
}

export class SiegeEngine {
  private readonly context: CanvasRenderingContext2D;
  private readonly canvas: HTMLCanvasElement;
  private readonly data: SiegeDifficultyData;
  private readonly level: SiegeLevel;
  private readonly onState: (state: SiegeRuntimeState) => void;
  private readonly onComplete: (result: SiegeRunResult) => void;
  private readonly onPauseRequest: () => void;
  private readonly laneCount: number;
  private readonly difficultyIndex: number;
  private readonly theme: ArenaThemeId;
  private readonly pressedKeys = new Set<string>();
  private readonly zombies: SiegeHordeVisual[] = [];
  private readonly bullets: SiegeBullet[] = [];
  private readonly toxicPuddles: ActiveToxicPuddle[] = [];
  private readonly gateEffects: ActiveSiegeGateEffect[] = [];
  private spawnGroups: Array<SiegeZombieSpawnGroup & { remaining: number }> = [];
  private phase: SiegeRunPhase = 'running';
  private phaseBeforePause: 'running' | 'wall' = 'running';
  private sectionIndex = 0;
  private rowIndex = 0;
  private troops: number;
  private playerX = 0;
  private playerY = 0;
  private movementInput: SiegeMovementVector = { x: 0 };
  private hordeX = 0;
  private hordeY = -80;
  private hordeCount = 0;
  private backgroundScrollDistance = 0;
  private elapsedSeconds = 0;
  private sectionStartElapsedSeconds = 0;
  private frameId = 0;
  private lastFrameTime = 0;
  private lastStatePublishTime = 0;
  private lastShotTime = 0;
  private nextEntityId = 1;
  private viewportWidth = 0;
  private viewportHeight = 0;
  private pixelRatio = 1;
  private completed = false;
  private keyboardMovementEnabled = false;
  private readonly handleKeyDown = (event: KeyboardEvent): void => {
    const key = event.key.toLowerCase();
    if (event.key === 'Escape' || key === 'p') {
      event.preventDefault();
      if (this.phase !== 'paused') this.onPauseRequest();
      return;
    }
    if (!['arrowleft', 'arrowright', 'arrowup', 'arrowdown', 'a', 'd', 'w', 's'].includes(key)) {
      return;
    }
    event.preventDefault();
    if (this.keyboardMovementEnabled) this.pressedKeys.add(key);
  };
  private readonly handleKeyUp = (event: KeyboardEvent): void => {
    this.pressedKeys.delete(event.key.toLowerCase());
  };
  private readonly handleWindowBlur = (): void => {
    this.pressedKeys.clear();
    this.setMovementInput({ x: 0 });
  };
  private readonly tick = (timestamp: number): void => {
    if (this.phase !== 'won' && this.phase !== 'lost') {
      const deltaSeconds = this.lastFrameTime === 0
        ? 0
        : Math.min(0.05, (timestamp - this.lastFrameTime) / 1000);
      this.lastFrameTime = timestamp;
      if (this.phase !== 'paused') this.update(deltaSeconds);
      this.render();
      this.frameId = requestAnimationFrame(this.tick);
    } else {
      this.render();
    }
  };

  constructor(options: SiegeEngineOptions) {
    this.canvas = options.canvas;
    const context = this.canvas.getContext('2d');
    if (!context) throw new Error('Unable to create the Siege canvas context.');
    this.context = context;
    this.data = options.data;
    this.level = options.level;
    this.onState = options.onState;
    this.onComplete = options.onComplete;
    this.onPauseRequest = options.onPauseRequest;
    this.laneCount = this.level.laneCount ?? 3;
    this.difficultyIndex = SIEGE_DIFFICULTIES.indexOf(this.data.difficulty);
    this.theme = getTheme(this.level.theme);
    this.troops = this.level.startTroops ?? this.data.rules.startTroops;

    window.addEventListener('keydown', this.handleKeyDown);
    window.addEventListener('keyup', this.handleKeyUp);
    window.addEventListener('blur', this.handleWindowBlur);
    this.resize();
    this.publishState(true);
    this.frameId = requestAnimationFrame(this.tick);
  }

  setMovementInput(vector: SiegeMovementVector): void {
    this.movementInput = {
      x: Number.isFinite(vector.x) ? vector.x : 0,
    };
  }

  movePlayerByTouch(deltaX: number): void {
    this.playerX = moveSiegePlayerByTouch(
      this.playerX,
      deltaX,
      this.viewportWidth,
    );
  }

  setKeyboardMovementEnabled(enabled: boolean): void {
    this.keyboardMovementEnabled = enabled;
    if (!enabled) this.pressedKeys.clear();
  }

  pause(): void {
    if (this.phase !== 'running' && this.phase !== 'wall') return;
    this.phaseBeforePause = this.phase;
    this.phase = 'paused';
    this.handleWindowBlur();
    this.publishState(true);
  }

  resume(): void {
    if (this.phase !== 'paused') return;
    this.phase = this.phaseBeforePause;
    this.lastFrameTime = 0;
    this.publishState(true);
  }

  resize(): void {
    const bounds = this.canvas.getBoundingClientRect();
    if (bounds.width <= 0 || bounds.height <= 0) return;
    const previousWidth = this.viewportWidth;
    const previousHeight = this.viewportHeight;
    this.viewportWidth = bounds.width;
    this.viewportHeight = bounds.height;
    if (previousWidth > 0 && previousHeight > 0) {
      this.playerX *= this.viewportWidth / previousWidth;
      this.playerY *= this.viewportHeight / previousHeight;
    } else {
      this.playerX = this.viewportWidth / 2;
      this.playerY = this.viewportHeight * PLAYER_START_Y_FRACTION;
      this.hordeX = this.viewportWidth / 2;
    }
    this.pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
    this.canvas.width = Math.round(this.viewportWidth * this.pixelRatio);
    this.canvas.height = Math.round(this.viewportHeight * this.pixelRatio);
    this.context.setTransform(this.pixelRatio, 0, 0, this.pixelRatio, 0, 0);
    this.render();
  }

  dispose(): void {
    cancelAnimationFrame(this.frameId);
    window.removeEventListener('keydown', this.handleKeyDown);
    window.removeEventListener('keyup', this.handleKeyUp);
    window.removeEventListener('blur', this.handleWindowBlur);
  }

  private update(deltaSeconds: number): void {
    if (deltaSeconds === 0 || this.viewportHeight <= 0) return;
    this.elapsedSeconds += deltaSeconds;
    this.updateGateEffects(deltaSeconds);
    this.backgroundScrollDistance += deltaSeconds * getSiegeBackgroundScrollSpeed(
      this.viewportHeight,
      this.data.rules.gateScrollSpeedPerViewport,
    );
    const keyboardX = getSiegeKeyboardMovementX(
      this.pressedKeys,
      this.keyboardMovementEnabled,
    );
    const movementX = keyboardX + this.movementInput.x;
    const moved = moveSiegePlayer(
      this.playerX,
      this.playerY,
      movementX,
      deltaSeconds,
      this.viewportWidth,
      this.viewportHeight,
    );
    this.playerX = moved.x;
    this.playerY = moved.y;
    if (this.phase === 'wall') this.updateWall(deltaSeconds);
    if (this.phase === 'running' || this.phase === 'wall') {
      this.updateToxicPuddles(deltaSeconds);
    }
    if (this.phase === 'running') this.updateGates(deltaSeconds);
    this.publishState();
  }

  private updateGates(deltaSeconds: number): void {
    const section = this.getSection();
    const elementY = getSiegeTimedGateY(
      -GATE_HEIGHT,
      this.elapsedSeconds - this.sectionStartElapsedSeconds,
      this.rowIndex,
      this.data.rules.gateSpawnIntervalSeconds,
      getSiegeGateScrollSpeed(
        this.viewportHeight,
        this.data.rules.gateScrollSpeedPerViewport,
      ),
    );
    if (elementY === null) return;
    const element = section.elements[this.rowIndex];
    if (!element) throw new RangeError('Siege element index is out of range.');
    const elementHeight = element.type === 'hazard' ? HAZARD_HEIGHT : GATE_HEIGHT;
    if (elementY < this.playerY - elementHeight / 2) return;

    if (
      Math.abs(elementY - this.playerY) <= elementHeight / 2 + PLAYER_RADIUS
    ) {
      if (element.type === 'gateRow') {
        const gate = element.gates.find((candidate) => {
          const bounds = getSiegeGateBounds(this.viewportWidth, this.laneCount, candidate);
          return this.playerX >= bounds.left - PLAYER_RADIUS &&
            this.playerX <= bounds.left + bounds.width + PLAYER_RADIUS;
        });
        if (gate) {
          const previousTroops = this.troops;
          this.troops = applySiegeGate(this.troops, gate);
          this.gateEffects.push({
            x: this.playerX,
            y: this.playerY,
            troopChange: this.troops - previousTroops,
            elapsedSeconds: 0,
          });
        }
      } else {
        const bounds = getSiegeGateBounds(this.viewportWidth, this.laneCount, element);
        const intersectsHazard = this.playerX >= bounds.left - PLAYER_RADIUS &&
          this.playerX <= bounds.left + bounds.width + PLAYER_RADIUS;
        if (intersectsHazard) {
          if (element.kind === 'toxic_puddle') {
            this.toxicPuddles.push({
              value: element.value,
              duration: element.duration ?? 2,
              elapsedSeconds: 0,
              damageApplied: 0,
            });
          } else {
            this.troops = applySiegeHazard(this.troops, element);
          }
        }
      }
    }

    this.rowIndex += 1;
    if (this.troops < 1) {
      this.finish(false);
    } else if (this.rowIndex >= section.elements.length) {
      this.startWall(section);
    }
    this.publishState(true);
  }

  private updateGateEffects(deltaSeconds: number): void {
    for (let index = this.gateEffects.length - 1; index >= 0; index -= 1) {
      const effect = this.gateEffects[index]!;
      effect.elapsedSeconds += deltaSeconds;
      if (effect.elapsedSeconds >= GATE_EFFECT_DURATION_SECONDS) {
        this.gateEffects.splice(index, 1);
      }
    }
  }

  private updateToxicPuddles(deltaSeconds: number): void {
    for (let index = this.toxicPuddles.length - 1; index >= 0; index -= 1) {
      const puddle = this.toxicPuddles[index]!;
      const elapsed = Math.min(
        deltaSeconds,
        puddle.duration - puddle.elapsedSeconds,
      );
      puddle.elapsedSeconds += elapsed;
      const totalDamage = Math.floor(puddle.value * puddle.elapsedSeconds + 1e-9);
      const damage = totalDamage - puddle.damageApplied;
      if (damage > 0) {
        this.troops = Math.max(0, this.troops - damage);
        puddle.damageApplied = totalDamage;
      }
      if (this.troops < 1) {
        this.finish(false);
        return;
      }
      if (puddle.elapsedSeconds >= puddle.duration) {
        this.toxicPuddles.splice(index, 1);
      }
    }
  }

  private startWall(section: SiegeSection): void {
    this.phase = 'wall';
    const levelIndex = this.data.levels.findIndex(
      (level) => level.id === this.level.id,
    );
    if (levelIndex < 0) {
      throw new Error(`Siege level "${this.level.id}" is missing from its difficulty data.`);
    }
    const baseZombieCount = section.wall.zombies.reduce(
      (total, group) => total + group.count,
      0,
    );
    const targetZombieCount = getSiegeCombatHordeCount(
      baseZombieCount,
      this.troops,
      this.data.difficulty,
      levelIndex,
      this.data.levels.length,
    );
    this.spawnGroups = getSiegeCombatSpawnGroups(
      section.wall.zombies,
      targetZombieCount,
    ).map((group) => {
      return {
        kind: group.kind,
        count: group.count,
        remaining: group.count,
      };
    });
    this.hordeCount = targetZombieCount;
    this.zombies.splice(0, this.zombies.length, ...createSiegeHordeVisuals(this.spawnGroups));
    this.bullets.length = 0;
    this.hordeX = this.viewportWidth / 2;
    this.hordeY = -Math.max(80, this.viewportHeight * 0.12);
    this.lastShotTime = this.elapsedSeconds;
  }

  private updateWall(deltaSeconds: number): void {
    if (this.hordeCount > 0) {
      const dx = this.playerX - this.hordeX;
      const dy = this.playerY - this.hordeY;
      const distance = Math.hypot(dx, dy);
      const hordeSpeed = 280 + this.difficultyIndex * 24;
      if (distance > 0) {
        const travel = Math.min(distance, hordeSpeed * deltaSeconds);
        this.hordeX += dx / distance * travel;
        this.hordeY += dy / distance * travel;
      }

      const shotInterval = getSiegeShotInterval(this.troops, this.data.difficulty);
      if (this.elapsedSeconds - this.lastShotTime >= shotInterval) {
        this.fireAtHorde();
        this.lastShotTime = this.elapsedSeconds;
      }
      for (const bullet of this.bullets) {
        bullet.x += bullet.directionX * 720 * deltaSeconds;
        bullet.y += bullet.directionY * 720 * deltaSeconds;
      }
      this.resolveBulletHits();
      for (let index = this.bullets.length - 1; index >= 0; index -= 1) {
        const bullet = this.bullets[index]!;
        if (
          bullet.x < -24 || bullet.x > this.viewportWidth + 24 ||
          bullet.y < -24 || bullet.y > this.viewportHeight + 24
        ) {
          this.bullets.splice(index, 1);
        }
      }
    }
    advanceSiegeHordeDeaths(this.zombies, deltaSeconds);

    if (this.hordeCount === 0) {
      if (!hasSiegeHordeDeathAnimation(this.zombies)) this.completeSection();
      return;
    }
    if (Math.hypot(this.playerX - this.hordeX, this.playerY - this.hordeY) <= 66) {
      this.troops = getSiegeRemainingTroops(this.troops, this.hordeCount);
      if (this.troops > 0) this.completeSection();
      else this.finish(false);
    }
  }

  private fireAtHorde(): void {
    const tankOffsets = getSiegeTankFormation(getSiegeDisplayedUnitCount(this.troops));
    for (const [index, offset] of tankOffsets.entries()) {
      const x = this.playerX + offset.x;
      const y = this.playerY + offset.y;
      const dx = this.hordeX - x;
      const dy = this.hordeY - y;
      const distance = Math.hypot(dx, dy);
      this.bullets.push({
        id: this.nextEntityId++,
        x,
        y,
        directionX: distance === 0 ? 0 : dx / distance,
        directionY: distance === 0 ? 0 : dy / distance,
        damage: getSiegeBulletDamage(this.troops, index),
      });
    }
  }

  private resolveBulletHits(): void {
    const activeVisualCount = this.zombies.reduce(
      (count, zombie) => count + Number(zombie.remainingCount > 0),
      0,
    );
    const hordeRadius = Math.max(48, Math.sqrt(activeVisualCount) * 14);
    for (let index = this.bullets.length - 1; index >= 0; index -= 1) {
      if (this.hordeCount === 0) {
        this.bullets.length = 0;
        break;
      }
      const bullet = this.bullets[index]!;
      if (Math.hypot(bullet.x - this.hordeX, bullet.y - this.hordeY) > hordeRadius) {
        continue;
      }
      const damage = Math.min(this.hordeCount, bullet.damage);
      this.hordeCount -= damage;
      this.bullets.splice(index, 1);
      this.consumeZombieGroupCount(damage);
      const visualDamage = applySiegeHordeDamage(this.zombies, damage);
      if (visualDamage !== damage) {
        throw new Error('Siege horde visuals are out of sync with the enemy count.');
      }
    }
  }

  private consumeZombieGroupCount(count: number): void {
    let remaining = count;
    for (const group of this.spawnGroups) {
      if (remaining <= 0) break;
      const defeated = Math.min(group.remaining, remaining);
      group.remaining -= defeated;
      remaining -= defeated;
    }
    if (remaining > 0) {
      throw new Error('Siege horde groups are out of sync with the enemy count.');
    }
  }

  private completeSection(): void {
    if (this.sectionIndex + 1 >= this.level.sections.length) {
      this.finish(true);
      return;
    }
    this.sectionIndex += 1;
    this.rowIndex = 0;
    this.sectionStartElapsedSeconds = this.elapsedSeconds;
    this.zombies.length = 0;
    this.bullets.length = 0;
    this.phase = 'running';
    this.publishState(true);
  }

  private finish(won: boolean): void {
    this.phase = won ? 'won' : 'lost';
    if (this.completed) return;
    this.completed = true;
    this.publishState(true);
    this.onComplete({ won, finalTroops: this.troops });
  }

  private getSection(): SiegeSection {
    const section = this.level.sections[this.sectionIndex];
    if (!section) throw new RangeError('Siege section is out of range.');
    return section;
  }

  private publishState(force = false): void {
    const now = performance.now();
    if (!force && now - this.lastStatePublishTime < 150) return;
    this.lastStatePublishTime = now;
    const section = this.level.sections[this.sectionIndex];
    this.onState({
      phase: this.phase,
      troops: this.troops,
      playerX: this.playerX,
      playerY: this.playerY,
      sectionIndex: this.sectionIndex,
      rowIndex: this.rowIndex,
      rowCount: section?.elements.length ?? 0,
      zombiesRemaining: this.hordeCount,
      elapsedSeconds: this.elapsedSeconds,
    });
  }

  private getPlayerMovementActors(elapsedSeconds: number): RenderActor[] {
    const formation = getSiegeTankFormation(
      getSiegeDisplayedUnitCount(this.troops),
    );
    const aimAngle = this.phase === 'wall'
      ? Math.atan2(this.hordeY - this.playerY, this.hordeX - this.playerX)
      : -Math.PI / 2;
    return formation.map((offset, index) => {
      const x = this.playerX + offset.x;
      const y = this.playerY + offset.y;
      const scale = index === 0 ? 1 : PLAYER_FORMATION_TANK_SCALE;
      return {
        y,
        draw: (context, frame) => {
          context.save();
          context.translate(x, y);
          context.scale(scale, scale);
          drawPlayer(context, {
            x: 0,
            y: 0,
            aimAngle,
            movementFactor: index === 0 ? 0.3 : 0.2,
          }, frame.elapsedSeconds);
          context.restore();
        },
      };
    });
  }

  private render(): void {
    if (this.viewportWidth <= 0 || this.viewportHeight <= 0) return;
    const section = this.level.sections[this.sectionIndex];
    const layers: RenderLayers = {
      arena: {
        obstacles: [],
        barrels: [],
        theme: this.theme,
        elapsedSeconds: this.elapsedSeconds,
      },
      groundShadows: [
        {
          draw: (context) => {
            drawSiegeBattlefield(
              context,
              this.viewportWidth,
              this.viewportHeight,
              this.backgroundScrollDistance,
            );
            if (!section) return;
            const initialY = -GATE_HEIGHT;
            for (let index = 0; index < section.elements.length; index += 1) {
              const y = getSiegeTimedGateY(
                initialY,
                this.elapsedSeconds - this.sectionStartElapsedSeconds,
                index,
                this.data.rules.gateSpawnIntervalSeconds,
                getSiegeGateScrollSpeed(
                  this.viewportHeight,
                  this.data.rules.gateScrollSpeedPerViewport,
                ),
              );
              if (y === null) continue;
              if (y < -GATE_HEIGHT || y > this.viewportHeight + GATE_HEIGHT) continue;
              const element = section.elements[index];
              if (!element) continue;
              if (index < this.rowIndex && element.type !== 'gateRow') continue;
              if (element.type === 'gateRow') {
                drawGate(
                  context,
                  this.viewportWidth,
                  this.laneCount,
                  y,
                  element,
                  this.elapsedSeconds,
                  this.level.gateColors,
                );
              } else {
                drawHazard(
                  context,
                  this.viewportWidth,
                  this.laneCount,
                  y,
                  element,
                );
              }
            }
          },
        },
      ],
      pickups: [],
      projectiles: this.bullets.map((bullet) => ({
        draw: (context) => drawProjectile(context, {
          x: bullet.x,
          y: bullet.y,
          directionX: bullet.directionX,
          directionY: bullet.directionY,
          type: 'standard',
          radius: 4,
        }),
      })),
      actors: [
        ...this.zombies.map((zombie): RenderActor => {
          const deathProgress = zombie.deathElapsed === null
            ? 0
            : Math.min(
                1,
                zombie.deathElapsed / SIEGE_ZOMBIE_DEATH_DURATION_SECONDS,
              );
          const popScale = deathProgress === 0
            ? 1
            : deathProgress < 0.18
              ? 1 + (deathProgress / 0.18) * 0.32
              : Math.max(0, 1.32 * (1 - (deathProgress - 0.18) / 0.82));
          const x = this.hordeX + zombie.offsetX;
          const y = this.hordeY + zombie.offsetY;
          return {
            y,
            draw: (context, frame) => {
              context.save();
              try {
                context.translate(x, y);
                if (deathProgress > 0) {
                  drawImpactEffect(context, {
                    x: 0,
                    y: 0,
                    progress: deathProgress,
                    kind: 'death',
                    color: GAME_PALETTE.enemies[zombie.type],
                    radius: 28,
                  });
                }
                context.scale(popScale, popScale);
                const visual: ZombieVisualState = {
                  x: 0,
                  y: 0,
                  type: zombie.type,
                  radius: 12 + Math.min(5, ZOMBIE_BASE_STRENGTH[zombie.type]),
                  movementFactor: zombie.deathElapsed === null ? 0.15 : 0,
                };
                drawZombie(context, visual, frame.elapsedSeconds);
              } finally {
                context.restore();
              }
            },
          };
        }),
        ...this.getPlayerMovementActors(this.elapsedSeconds),
      ],
      foregroundEffects: this.gateEffects.map((effect) => ({
        draw: (context) => drawSiegeGateEffect(context, effect),
      })),
      feedback: [
        {
          draw: (context) => {
            if (this.troops > 0) {
              drawCountBadge(
                context,
                this.playerX,
                this.playerY - 38,
                this.troops,
                GAME_PALETTE.player.outline,
              );
            }
            if (this.phase === 'wall' && this.hordeCount > 0) {
              drawCountBadge(
                context,
                this.hordeX,
                this.hordeY - 64,
                this.hordeCount,
                GAME_PALETTE.enemies.healthFill,
              );
            }
          },
        },
      ],
      debugOverlays: [],
    };
    this.context.setTransform(this.pixelRatio, 0, 0, this.pixelRatio, 0, 0);
    this.context.clearRect(0, 0, this.viewportWidth, this.viewportHeight);
    renderGameScene(
      this.context,
      this.viewportWidth,
      this.viewportHeight,
      this.elapsedSeconds,
      layers,
    );
  }
}
