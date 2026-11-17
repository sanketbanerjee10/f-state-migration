import type { ArenaThemeId } from '../arena/ArenaSystem';
import { drawImpactEffect } from '../rendering/EffectsRenderer';
import { GAME_PALETTE } from '../rendering/GamePalette';
import { drawPlayer } from '../rendering/PlayerRenderer';
import { drawProjectile } from '../rendering/ProjectileRenderer';
import { drawCircle, drawLine, drawRoundedRectangle } from '../rendering/ShapeLibrary';
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
  type SiegeDifficulty,
  type SiegeDifficultyData,
  type SiegeGateRow,
  type SiegeLevel,
  type SiegeSection,
} from './SiegeRules';

export type SiegeRunPhase = 'running' | 'wall' | 'paused' | 'won' | 'lost';

export interface SiegeMovementVector {
  readonly x: number;
  readonly y: number;
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

const MAX_PLAYER_VISUALS = 30;
const PLAYER_RADIUS = 18;
const PLAYER_SPEED = 400;
const PLAYER_FORMATION_COLUMNS = 5;
const PLAYER_FORMATION_HORIZONTAL_SPACING = 36;
const PLAYER_FORMATION_VERTICAL_SPACING = 28;
const PLAYER_FORMATION_TRAIL_OFFSET = 28;
const PLAYER_FORMATION_TANK_SCALE = 0.55;
const MIN_SIEGE_SHOT_INTERVAL_SECONDS = 0.25;
const PLAYER_START_Y_FRACTION = 0.72;
const GATE_HEIGHT = 56;
const DEFAULT_GATE_SCROLL_SPEED_PER_VIEWPORT = 0.32;
const BACKGROUND_TILE_SIZE = 264;
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

export function getSiegeDisplayedUnitCount(troops: number): number {
  if (!Number.isSafeInteger(troops) || troops < 0) {
    throw new RangeError('Siege troop count must be a non-negative safe integer.');
  }
  return Math.min(troops, MAX_PLAYER_VISUALS);
}

export interface SiegeTankOffset {
  readonly x: number;
  readonly y: number;
}

export function getSiegeTankFormation(count: number): readonly SiegeTankOffset[] {
  if (!Number.isSafeInteger(count) || count < 1 || count > MAX_PLAYER_VISUALS) {
    throw new RangeError(`Siege tank count must be between 1 and ${MAX_PLAYER_VISUALS}.`);
  }

  return Array.from({ length: count }, (_, index) => {
    if (index === 0) return { x: 0, y: 0 };
    const formationIndex = index - 1;
    const row = Math.floor(formationIndex / PLAYER_FORMATION_COLUMNS);
    const rowStart = row * PLAYER_FORMATION_COLUMNS;
    const rowLength = Math.min(PLAYER_FORMATION_COLUMNS, count - 1 - rowStart);
    const column = formationIndex - rowStart;
    return {
      x: (column - (rowLength - 1) / 2) * PLAYER_FORMATION_HORIZONTAL_SPACING,
      y: PLAYER_FORMATION_TRAIL_OFFSET + row * PLAYER_FORMATION_VERTICAL_SPACING,
    };
  });
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

export function getSiegeVolleyDamage(troops: number): number {
  if (!Number.isSafeInteger(troops) || troops < 1) {
    throw new RangeError('Siege troops must be a positive safe integer.');
  }
  const bulletCount = getSiegeDisplayedUnitCount(troops);
  if (troops <= MAX_PLAYER_VISUALS) return troops;
  return Math.round(
    bulletCount * Math.pow(troops / bulletCount, 0.6),
  );
}

export function getSiegeBulletDamage(troops: number, bulletIndex: number): number {
  const bulletCount = getSiegeDisplayedUnitCount(troops);
  if (
    bulletCount < 1 ||
    !Number.isSafeInteger(bulletIndex) ||
    bulletIndex < 0 ||
    bulletIndex >= bulletCount
  ) {
    throw new RangeError('Siege bullet index must identify a visible tank.');
  }
  const baseDamage = Math.floor(getSiegeVolleyDamage(troops) / bulletCount);
  const extraDamageBullets = getSiegeVolleyDamage(troops) % bulletCount;
  return baseDamage + Number(bulletIndex < extraDamageBullets);
}

export function getSiegeCombatHordeCount(
  baseZombieCount: number,
  troops: number,
  difficulty: SiegeDifficulty,
  levelIndex: number,
  levelCount: number,
): number {
  const difficultyIndex = SIEGE_DIFFICULTIES.indexOf(difficulty);
  if (
    !Number.isSafeInteger(baseZombieCount) ||
    baseZombieCount < 1 ||
    !Number.isSafeInteger(troops) ||
    troops < 1 ||
    difficultyIndex < 0 ||
    !Number.isSafeInteger(levelIndex) ||
    !Number.isSafeInteger(levelCount) ||
    levelCount < 1 ||
    levelIndex < 0 ||
    levelIndex >= levelCount
  ) {
    throw new RangeError('Siege combat horde inputs are invalid.');
  }
  const levelProgress = levelCount === 1 ? 0 : levelIndex / (levelCount - 1);
  const targetVolleys = 3 + levelProgress * 1.5 + difficultyIndex * 0.25;
  return Math.max(
    baseZombieCount,
    Math.ceil(getSiegeVolleyDamage(troops) * targetVolleys),
  );
}

export function moveSiegePlayer(
  x: number,
  y: number,
  movementX: number,
  movementY: number,
  deltaSeconds: number,
  width: number,
  height: number,
  speed = PLAYER_SPEED,
): { readonly x: number; readonly y: number } {
  if (
    ![x, y, movementX, movementY, deltaSeconds, width, height, speed]
      .every(Number.isFinite) ||
    deltaSeconds < 0 ||
    width <= PLAYER_RADIUS * 2 ||
    height <= PLAYER_RADIUS * 2 ||
    speed < 0
  ) {
    throw new RangeError('Siege player movement requires finite values and a positive viewport.');
  }
  let dx = movementX;
  let dy = movementY;
  const magnitude = Math.hypot(dx, dy);
  if (magnitude > 1) {
    dx /= magnitude;
    dy /= magnitude;
  }
  return {
    x: Math.max(PLAYER_RADIUS, Math.min(width - PLAYER_RADIUS, x + dx * speed * deltaSeconds)),
    y: Math.max(PLAYER_RADIUS, Math.min(height - PLAYER_RADIUS, y + dy * speed * deltaSeconds)),
  };
}

export function getSiegeShotInterval(
  troops: number,
  difficulty: SiegeDifficulty,
): number {
  if (!Number.isSafeInteger(troops) || troops < 1) {
    throw new RangeError('Siege troops must be a positive safe integer.');
  }
  const difficultyIndex = SIEGE_DIFFICULTIES.indexOf(difficulty);
  return Math.max(
    MIN_SIEGE_SHOT_INTERVAL_SECONDS,
    0.42 -
      Math.log2(getSiegeDisplayedUnitCount(troops) + 1) * 0.025 -
      difficultyIndex * 0.015,
  );
}

function getTheme(theme: string): ArenaThemeId {
  return ARENA_THEMES[theme] ?? 'military';
}

function getOperationColor(op: SiegeGateRow['gates'][number]['op']): string {
  switch (op) {
    case 'add':
      return GAME_PALETTE.player.fill;
    case 'sub':
      return GAME_PALETTE.combat.damage;
    case 'mul':
      return GAME_PALETTE.orbs.rapidFire;
    case 'div':
      return GAME_PALETTE.combat.turretProjectile;
  }
}

function drawCountBadge(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  count: number,
  color: string,
): void {
  const label = String(count);
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
): void {
  const gateWidth = getSiegeGateWidth(width, laneCount);
  const itemWidth = gateWidth;
  for (const gate of row.gates) {
    const x = itemWidth * (gate.lane + 0.5);
    const color = getOperationColor(gate.op);
    drawRoundedRectangle(
      context,
      x - gateWidth / 2,
      y - GATE_HEIGHT / 2,
      gateWidth,
      GATE_HEIGHT,
      8,
      { fill: 'rgba(20, 30, 27, 0.92)', stroke: color, lineWidth: 3 },
    );
    context.save();
    context.fillStyle = color;
    context.font = '700 20px sans-serif';
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    const symbol = gate.op === 'add'
      ? '+'
      : gate.op === 'sub'
        ? '−'
        : gate.op === 'mul'
          ? '×'
          : '÷';
    context.fillText(`${symbol} ${gate.value}`, x, y);
    context.restore();
  }
}

function drawScrollingGround(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  scrollDistance: number,
): void {
  const offset = scrollDistance % BACKGROUND_TILE_SIZE;
  context.save();
  context.beginPath();
  context.rect(0, 0, width, height);
  context.clip();
  for (
    let tile = -1;
    tile <= Math.ceil(height / BACKGROUND_TILE_SIZE);
    tile += 1
  ) {
    const tileTop = tile * BACKGROUND_TILE_SIZE + offset;
    for (let mark = 0; mark < 14; mark += 1) {
      const x = (mark * 137 + tile * 67 + width) % width;
      const y = tileTop + ((mark * 47 + 23) % BACKGROUND_TILE_SIZE);
      const radius = 1 + (mark % 3) * 0.7;
      drawCircle(context, x, y, radius, {
        fill: mark % 2 === 0
          ? 'rgba(214, 205, 166, 0.18)'
          : 'rgba(5, 12, 10, 0.22)',
      });
      if (mark % 4 === 0) {
        const length = 5 + mark % 5;
        drawLine(
          context,
          { x: x + 7, y: y + 5 },
          { x: x + 7 + length, y: y + 4 },
          GAME_PALETTE.arena.marking,
          1,
        );
      }
    }
  }
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
  private spawnGroups: Array<SiegeZombieSpawnGroup & { remaining: number }> = [];
  private phase: SiegeRunPhase = 'running';
  private phaseBeforePause: 'running' | 'wall' = 'running';
  private sectionIndex = 0;
  private rowIndex = 0;
  private troops: number;
  private playerX = 0;
  private playerY = 0;
  private movementInput: SiegeMovementVector = { x: 0, y: 0 };
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
    this.pressedKeys.add(key);
  };
  private readonly handleKeyUp = (event: KeyboardEvent): void => {
    this.pressedKeys.delete(event.key.toLowerCase());
  };
  private readonly handleWindowBlur = (): void => {
    this.pressedKeys.clear();
    this.setMovementInput({ x: 0, y: 0 });
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
      y: Number.isFinite(vector.y) ? vector.y : 0,
    };
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
    this.backgroundScrollDistance += deltaSeconds * 94;
    const keyboardX =
      Number(this.pressedKeys.has('arrowright') || this.pressedKeys.has('d')) -
      Number(this.pressedKeys.has('arrowleft') || this.pressedKeys.has('a'));
    const keyboardY =
      Number(this.pressedKeys.has('arrowdown') || this.pressedKeys.has('s')) -
      Number(this.pressedKeys.has('arrowup') || this.pressedKeys.has('w'));
    const movement = {
      x: keyboardX + this.movementInput.x,
      y: keyboardY + this.movementInput.y,
    };
    const moved = moveSiegePlayer(
      this.playerX,
      this.playerY,
      movement.x,
      movement.y,
      deltaSeconds,
      this.viewportWidth,
      this.viewportHeight,
    );
    this.playerX = moved.x;
    this.playerY = moved.y;
    if (this.phase === 'running') this.updateGates(deltaSeconds);
    else if (this.phase === 'wall') this.updateWall(deltaSeconds);
    this.publishState();
  }

  private updateGates(deltaSeconds: number): void {
    const section = this.getSection();
    const gateY = getSiegeTimedGateY(
      -GATE_HEIGHT,
      this.elapsedSeconds - this.sectionStartElapsedSeconds,
      this.rowIndex,
      this.data.rules.gateSpawnIntervalSeconds,
      getSiegeGateScrollSpeed(
        this.viewportHeight,
        this.data.rules.gateScrollSpeedPerViewport,
      ),
    );
    if (gateY === null) return;
    if (gateY < this.playerY - GATE_HEIGHT / 2) return;
    const row = section.elements[this.rowIndex];
    if (!row) throw new RangeError('Siege gate row is out of range.');
    const gateWidth = getSiegeGateWidth(this.viewportWidth, this.laneCount);
    const itemWidth = gateWidth;
    const gate = row.gates.find((candidate) => {
      const gateX = itemWidth * (candidate.lane + 0.5);
      return Math.abs(gateX - this.playerX) <= gateWidth / 2 + PLAYER_RADIUS;
    });
    if (gate && Math.abs(gateY - this.playerY) <= GATE_HEIGHT / 2 + PLAYER_RADIUS) {
      this.troops = applySiegeGate(this.troops, gate);
    }
    this.rowIndex += 1;
    if (this.troops < 1) {
      this.finish(false);
    } else if (this.rowIndex >= section.elements.length) {
      this.startWall(section);
    }
    this.publishState(true);
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
    let remainingZombieCount = targetZombieCount;
    this.spawnGroups = section.wall.zombies.map((group, index) => {
      const count = index === section.wall.zombies.length - 1
        ? remainingZombieCount
        : Math.floor(group.count * targetZombieCount / baseZombieCount);
      remainingZombieCount -= count;
      return {
        kind: group.kind,
        count,
        remaining: count,
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
            drawScrollingGround(
              context,
              this.viewportWidth,
              this.viewportHeight,
              this.backgroundScrollDistance,
            );
            if (this.phase !== 'running' || !section) return;
            const initialY = -GATE_HEIGHT;
            for (let index = this.rowIndex; index < section.elements.length; index += 1) {
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
              const row = section.elements[index];
              if (row) drawGate(context, this.viewportWidth, this.laneCount, y, row);
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
      foregroundEffects: [],
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
