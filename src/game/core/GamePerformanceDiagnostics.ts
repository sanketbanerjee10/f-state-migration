import type { GameState } from './GameState';

export interface GamePerformanceTimings {
  frameCallbackMs: number;
  previousCallbackDurationMs: number;
  rafSchedulingGapMs: number;
  updateMs: number;
  renderMs: number;
  renderLayersMs: number;
  actorSortMs: number;
  arenaRenderMs: number;
  arenaFloorMs: number;
  projectileCollisionMs: number;
  zombieCollisionMs: number;
  swarmProjectileAvoidanceMs: number;
  events: GamePerformanceFrameEvents;
}

export const GAME_PERFORMANCE_EVENT_NAMES = [
  'projectileProcessing',
  'enemyCandidateScan',
  'arenaCandidateScan',
  'enemyDamage',
  'enemyDeathRemoval',
  'splitterOffspringCreation',
  'arenaObjectDestruction',
  'explosionHazardCreation',
  'orbGeneration',
  'orbCollection',
  'impactEffectCreation',
  'damageNumberCreation',
] as const;

export type GamePerformanceEventName =
  (typeof GAME_PERFORMANCE_EVENT_NAMES)[number];

export const GAME_PERFORMANCE_EVENT_COUNT_NAMES = [
  'projectilesProcessed',
  'hitEvents',
  'enemyDamageEvents',
  'enemyDeathEvents',
  'splitterOffspringCreated',
  'arenaObjectDestructionEvents',
  'explosionsCreated',
  'hazardsCreated',
  'orbsGenerated',
  'orbsCollected',
  'impactEffectsCreated',
  'damageNumbersCreated',
  'collectionEffectsCreated',
  'temporaryEffectsCreated',
] as const;

export type GamePerformanceEventCountName =
  (typeof GAME_PERFORMANCE_EVENT_COUNT_NAMES)[number];

export interface GamePerformanceFrameEvents {
  counts: Record<GamePerformanceEventCountName, number>;
  durationCounts: Record<GamePerformanceEventName, number>;
  totalMs: Record<GamePerformanceEventName, number>;
  maxMs: Record<GamePerformanceEventName, number>;
  samplesMs: Record<GamePerformanceEventName, number[]>;
}

export interface GamePerformanceEventTiming {
  name: GamePerformanceEventName;
  sampleCount: number;
  totalMs: number;
  maxMs: number;
  p95Ms: number;
}

export interface GamePerformanceTimingStatistics {
  sampleCount: number;
  averageMs: number;
  p95Ms: number;
  p99Ms: number;
  maxMs: number;
}

export interface GamePerformanceSpikeEvents {
  counts: Record<GamePerformanceEventCountName, number>;
  totalMs: Record<GamePerformanceEventName, number>;
  maxMs: Record<GamePerformanceEventName, number>;
}

function createEmptyEventCounts(): Record<GamePerformanceEventCountName, number> {
  return Object.fromEntries(
    GAME_PERFORMANCE_EVENT_COUNT_NAMES.map((name) => [name, 0]),
  ) as Record<GamePerformanceEventCountName, number>;
}

interface PerformanceEntryWithAttribution extends PerformanceEntry {
  readonly attribution?: readonly {
    readonly containerType?: string;
    readonly containerName?: string;
    readonly containerId?: string;
    readonly containerSrc?: string;
    readonly name?: string;
  }[];
  readonly detail?: { readonly kind?: number; readonly flags?: number };
}

function getActivityAttribution(entry: PerformanceEntryWithAttribution): string[] {
  return entry.attribution?.map((attribution) =>
    [
      attribution.name,
      attribution.containerType,
      attribution.containerName,
      attribution.containerId,
      attribution.containerSrc,
    ].filter(Boolean).join(':'),
  ) ?? [];
}

export interface GamePerformanceUiTimings {
  snapshotBuildMs: number;
  pollWorkMs: number;
}

export interface GamePerformanceCanvasMetrics {
  width: number;
  height: number;
  cssWidth: number;
  cssHeight: number;
  devicePixelRatio: number;
  resizeCount: number;
}

export interface GamePerformanceBackgroundCacheMetrics {
  generationCount: number;
  cacheRebuildCount: number;
}

export interface PerformanceActivityEntry {
  startTime: number;
  durationMs: number;
  name: string;
  attribution: readonly string[];
}

export interface GamePerformanceUiPoll extends GamePerformanceUiTimings {
  startTime: number;
  endTime: number;
}

export interface GamePerformanceBrowserMetrics {
  longTaskSupport: 'available' | 'unavailable';
  longTaskCount: number;
  totalLongTaskDurationMs: number;
  longestLongTaskMs: number;
  longTasks: readonly PerformanceActivityEntry[];
  garbageCollectionSupport: 'available' | 'unavailable';
  garbageCollectionCount: number;
  totalGarbageCollectionDurationMs: number;
  longestGarbageCollectionMs: number;
  garbageCollections: readonly PerformanceActivityEntry[];
  paintTimingSupport: 'available' | 'unavailable';
  latestRafSchedulingGapMs: number;
  averageRafSchedulingGapMs: number;
  p95RafSchedulingGapMs: number;
  consecutiveDelayedFrames: number;
  maximumConsecutiveDelayedFrames: number;
}

export function createGamePerformanceTimings(): GamePerformanceTimings {
  return {
    frameCallbackMs: 0,
    previousCallbackDurationMs: 0,
    rafSchedulingGapMs: 0,
    updateMs: 0,
    renderMs: 0,
    renderLayersMs: 0,
    actorSortMs: 0,
    arenaRenderMs: 0,
    arenaFloorMs: 0,
    projectileCollisionMs: 0,
    zombieCollisionMs: 0,
    swarmProjectileAvoidanceMs: 0,
    events: createGamePerformanceFrameEvents(),
  };
}

function createGamePerformanceFrameEvents(): GamePerformanceFrameEvents {
  return {
    counts: Object.fromEntries(
      GAME_PERFORMANCE_EVENT_COUNT_NAMES.map((name) => [name, 0]),
    ) as Record<GamePerformanceEventCountName, number>,
    durationCounts: Object.fromEntries(
      GAME_PERFORMANCE_EVENT_NAMES.map((name) => [name, 0]),
    ) as Record<GamePerformanceEventName, number>,
    totalMs: Object.fromEntries(
      GAME_PERFORMANCE_EVENT_NAMES.map((name) => [name, 0]),
    ) as Record<GamePerformanceEventName, number>,
    maxMs: Object.fromEntries(
      GAME_PERFORMANCE_EVENT_NAMES.map((name) => [name, 0]),
    ) as Record<GamePerformanceEventName, number>,
    samplesMs: Object.fromEntries(
      GAME_PERFORMANCE_EVENT_NAMES.map((name) => [name, [] as number[]]),
    ) as Record<GamePerformanceEventName, number[]>,
  };
}

export interface GamePerformanceCounts {
  zombies: number;
  arenaObjects: number;
  playerProjectiles: number;
  enemyProjectiles: number;
  turretProjectiles: number;
  arenaObstacles: number;
  militaryObjects: number;
  industrialObjects: number;
  contaminatedObjects: number;
  destructibleObjects: number;
  movingObjects: number;
  explosions: number;
  activeEffects: number;
  hazards: number;
  items: number;
  totalActiveEntities: number;
}

export interface GamePerformanceSpike {
  timestamp: number;
  intervalStartTimestamp: number;
  wallClockTimestamp: string;
  frameTimeMs: number;
  frameCallbackMs: number;
  followingFrameTimesMs: number[];
  previousCallbackDurationMs: number;
  estimatedSchedulingGapMs: number;
  delayedFrameStreak: number;
  updateMs: number;
  renderMs: number;
  collisionMs: number;
  projectileCollisionMs: number;
  zombieCollisionMs: number;
  swarmProjectileAvoidanceMs: number;
  renderLayersMs: number;
  actorSortMs: number;
  arenaRenderMs: number;
  arenaFloorMs: number;
  arena: string;
  gameMode: string;
  wave: number;
  counts: GamePerformanceCounts;
  events: GamePerformanceSpikeEvents;
  precedingFrameTimesMs: number[];
  correlatedLongTasks: readonly PerformanceActivityEntry[];
  correlatedGarbageCollections: readonly PerformanceActivityEntry[];
  correlatedUiPolls: readonly GamePerformanceUiPoll[];
}

export interface GamePerformanceSnapshot {
  enabled: boolean;
  captureDurationMs: number;
  currentFps: number;
  averageFps: number;
  frameTimeMs: number;
  frameTimeP95Ms: number;
  frameTimeP99Ms: number;
  framesOverThreshold1: number;
  framesOverThreshold2: number;
  framesOverThreshold3: number;
  frameCount: number;
  rollingFrameCount: number;
  thresholdsMs: readonly [number, number, number];
  timings: GamePerformanceTimings;
  timingStatisticsMs: Record<
    (typeof TIMING_KEYS)[number],
    GamePerformanceTimingStatistics
  >;
  eventTimings: readonly GamePerformanceEventTiming[];
  eventCountTotals: Record<GamePerformanceEventCountName, number>;
  uiTimings: GamePerformanceUiTimings;
  browserMetrics: GamePerformanceBrowserMetrics;
  canvasMetrics: GamePerformanceCanvasMetrics;
  arenaBackgroundCache: GamePerformanceBackgroundCacheMetrics;
  collisionMs: number;
  counts: GamePerformanceCounts;
  peakCounts: GamePerformanceCounts;
  memoryUsageBytes: number | null;
  memoryTrend: 'increasing' | 'decreasing' | 'stable' | 'unavailable';
  memorySamples: readonly { timestamp: number; usedBytes: number }[];
  spikes: readonly GamePerformanceSpike[];
}

const FRAME_CAPACITY = 600;
const SPIKE_CAPACITY = 50;
const MEMORY_CAPACITY = 120;
const PRE_SPIKE_FRAME_COUNT = 10;
const POST_SPIKE_FRAME_COUNT = 3;
const FRAME_TIME_SLOT = 0;
const TIMING_KEYS = [
  'frameCallbackMs',
  'previousCallbackDurationMs',
  'rafSchedulingGapMs',
  'updateMs',
  'renderMs',
  'renderLayersMs',
  'actorSortMs',
  'arenaRenderMs',
  'arenaFloorMs',
  'projectileCollisionMs',
  'zombieCollisionMs',
  'swarmProjectileAvoidanceMs',
] as const satisfies readonly (keyof GamePerformanceTimings)[];
const TIMING_SLOT_COUNT = TIMING_KEYS.length;
const COUNT_KEYS = [
  'zombies',
  'arenaObjects',
  'playerProjectiles',
  'enemyProjectiles',
  'turretProjectiles',
  'arenaObstacles',
  'militaryObjects',
  'industrialObjects',
  'contaminatedObjects',
  'destructibleObjects',
  'movingObjects',
  'explosions',
  'activeEffects',
  'hazards',
  'items',
  'totalActiveEntities',
] as const satisfies readonly (keyof GamePerformanceCounts)[];
const COUNT_SLOT_START = 1 + TIMING_SLOT_COUNT;
const EVENT_COUNT_SLOT_START = COUNT_SLOT_START + COUNT_KEYS.length;
const EVENT_TOTAL_SLOT_START =
  EVENT_COUNT_SLOT_START + GAME_PERFORMANCE_EVENT_COUNT_NAMES.length;
const EVENT_MAX_SLOT_START =
  EVENT_TOTAL_SLOT_START + GAME_PERFORMANCE_EVENT_NAMES.length;
const FRAME_SLOT_COUNT =
  EVENT_MAX_SLOT_START + GAME_PERFORMANCE_EVENT_NAMES.length;
const ACTIVITY_CAPACITY = 200;
const UI_POLL_CAPACITY = 120;
const EVENT_SAMPLE_CAPACITY = 4096;

const createEmptyCounts = (): GamePerformanceCounts => ({
  zombies: 0,
  arenaObjects: 0,
  playerProjectiles: 0,
  enemyProjectiles: 0,
  turretProjectiles: 0,
  arenaObstacles: 0,
  militaryObjects: 0,
  industrialObjects: 0,
  contaminatedObjects: 0,
  destructibleObjects: 0,
  movingObjects: 0,
  explosions: 0,
  activeEffects: 0,
  hazards: 0,
  items: 0,
  totalActiveEntities: 0,
});

export function resetGamePerformanceTimings(timings: GamePerformanceTimings): void {
  for (const key of TIMING_KEYS) timings[key] = 0;
  for (const key of GAME_PERFORMANCE_EVENT_COUNT_NAMES) {
    timings.events.counts[key] = 0;
  }
  for (const key of GAME_PERFORMANCE_EVENT_NAMES) {
    timings.events.durationCounts[key] = 0;
    timings.events.totalMs[key] = 0;
    timings.events.maxMs[key] = 0;
    timings.events.samplesMs[key].length = 0;
  }
}

export function recordGamePerformanceEvent(
  timings: GamePerformanceTimings | undefined,
  name: GamePerformanceEventName,
  durationMs: number,
): void {
  if (!timings || !Number.isFinite(durationMs) || durationMs < 0) return;
  const events = timings.events;
  events.durationCounts[name] += 1;
  events.totalMs[name] += durationMs;
  events.maxMs[name] = Math.max(events.maxMs[name], durationMs);
  events.samplesMs[name].push(durationMs);
}

export function incrementGamePerformanceEventCount(
  timings: GamePerformanceTimings | undefined,
  name: GamePerformanceEventCountName,
  amount = 1,
): void {
  if (!timings || amount <= 0) return;
  timings.events.counts[name] += amount;
}

function getGamePerformanceCounts(state: GameState): GamePerformanceCounts {
  let playerProjectiles = 0;
  let enemyProjectiles = 0;
  let turretProjectiles = 0;
  for (const projectile of state.projectiles) {
    if (projectile.owner === 'player') playerProjectiles += 1;
    else if (projectile.owner === 'enemy') enemyProjectiles += 1;
    else turretProjectiles += 1;
  }

  let destructibleObjects = 0;
  for (const obstacle of state.arenaObstacles) {
    if (obstacle.health !== undefined && obstacle.health > 0) {
      destructibleObjects += 1;
    }
  }
  for (const barrel of state.barrels) {
    if (barrel.health > 0) destructibleObjects += 1;
  }
  for (const object of state.militaryObjects) {
    if ('health' in object && object.health > 0) destructibleObjects += 1;
  }
  for (const object of state.contaminatedObjects) {
    if ('health' in object && object.health > 0 && !object.destroyed) {
      destructibleObjects += 1;
    }
  }

  let movingObjects = 0;
  for (const obstacle of state.arenaObstacles) {
    if (obstacle.industrialMotion) movingObjects += 1;
  }
  for (const cylinder of state.gasCylinders) {
    if (cylinder.phase === 'flying') movingObjects += 1;
  }

  let explosions = state.impacts.reduce(
    (count, impact) => count + (impact.kind === 'bomb' ? 1 : 0),
    0,
  );
  for (const object of state.militaryObjects) {
    if (
      (object.kind === 'military-ammo-crate' &&
        object.explosionRemainingSeconds > 0) ||
      (object.kind === 'fuel-drum' && object.phase === 'blast')
    ) {
      explosions += 1;
    }
  }

  const activeEffects =
    state.activeEffects.length +
    state.impacts.length +
    state.damageNumbers.length +
    state.collectionEffects.length;
  const industrialObjects =
    state.gasCylinders.length + state.oilFirePatches.length;
  const totalActiveEntities =
    1 +
    state.zombies.length +
    state.projectiles.length +
    state.items.length +
    state.hazards.length +
    state.arenaObstacles.length +
    state.militaryObjects.length +
    state.barrels.length +
    state.gasCylinders.length +
    state.oilFirePatches.length +
    state.contaminatedObjects.length +
    state.impacts.length +
    state.damageNumbers.length +
    state.collectionEffects.length +
    state.supportTurrets.length;

  return {
    zombies: state.zombies.length,
    arenaObjects:
      state.arenaObstacles.length +
      state.barrels.length +
      state.militaryObjects.length +
      state.gasCylinders.length +
      state.contaminatedObjects.length,
    playerProjectiles,
    enemyProjectiles,
    turretProjectiles,
    arenaObstacles: state.arenaObstacles.length,
    militaryObjects: state.militaryObjects.length,
    industrialObjects,
    contaminatedObjects: state.contaminatedObjects.length,
    destructibleObjects,
    movingObjects,
    explosions,
    activeEffects,
    hazards: state.hazards.length,
    items: state.items.length,
    totalActiveEntities,
  };
}

interface MemoryInfo {
  readonly usedJSHeapSize: number;
}

function getUsedHeapSize(): number | null {
  const memory = (performance as Performance & { memory?: MemoryInfo }).memory;
  return memory && Number.isFinite(memory.usedJSHeapSize)
    ? memory.usedJSHeapSize
    : null;
}

export class GamePerformanceRecorder {
  private readonly frameData = new Float64Array(FRAME_CAPACITY * FRAME_SLOT_COUNT);
  private readonly frameTimestamps = new Float64Array(FRAME_CAPACITY);
  private readonly spikeTimestamps = new Float64Array(SPIKE_CAPACITY);
  private readonly spikeWallClockTimestamps: string[] = new Array(SPIKE_CAPACITY);
  private readonly spikeData = new Float64Array(
    SPIKE_CAPACITY * (FRAME_SLOT_COUNT + PRE_SPIKE_FRAME_COUNT),
  );
  private readonly spikeArena: string[] = new Array(SPIKE_CAPACITY);
  private readonly spikeGameMode: string[] = new Array(SPIKE_CAPACITY);
  private readonly spikeWave = new Int32Array(SPIKE_CAPACITY);
  private readonly spikeDelayedFrameStreak = new Int32Array(SPIKE_CAPACITY);
  private readonly spikeFollowingFrameTimes = new Float64Array(
    SPIKE_CAPACITY * POST_SPIKE_FRAME_COUNT,
  );
  private readonly spikeFollowingFrameCounts = new Uint8Array(SPIKE_CAPACITY);
  private readonly memoryTimestamps = new Float64Array(MEMORY_CAPACITY);
  private readonly memoryValues = new Float64Array(MEMORY_CAPACITY);
  private readonly peakValues = new Float64Array(COUNT_KEYS.length);
  private readonly eventDurationSamples = new Float64Array(
    GAME_PERFORMANCE_EVENT_NAMES.length * EVENT_SAMPLE_CAPACITY,
  );
  private readonly eventSampleCounts = new Uint32Array(
    GAME_PERFORMANCE_EVENT_NAMES.length,
  );
  private readonly eventSampleWriteIndices = new Uint32Array(
    GAME_PERFORMANCE_EVENT_NAMES.length,
  );
  private readonly eventTotalCounts = new Float64Array(
    GAME_PERFORMANCE_EVENT_NAMES.length,
  );
  private readonly eventTotalDurations = new Float64Array(
    GAME_PERFORMANCE_EVENT_NAMES.length,
  );
  private readonly eventMaxDurations = new Float64Array(
    GAME_PERFORMANCE_EVENT_NAMES.length,
  );
  private readonly eventCountTotals = createEmptyEventCounts();
  private readonly longTaskStarts = new Float64Array(ACTIVITY_CAPACITY);
  private readonly longTaskDurations = new Float64Array(ACTIVITY_CAPACITY);
  private readonly longTaskNames: string[] = new Array(ACTIVITY_CAPACITY);
  private readonly longTaskAttributions: string[][] =
    new Array(ACTIVITY_CAPACITY);
  private readonly gcStarts = new Float64Array(ACTIVITY_CAPACITY);
  private readonly gcDurations = new Float64Array(ACTIVITY_CAPACITY);
  private readonly gcNames: string[] = new Array(ACTIVITY_CAPACITY);
  private readonly gcAttributions: string[][] = new Array(ACTIVITY_CAPACITY);
  private readonly uiPollStarts = new Float64Array(UI_POLL_CAPACITY);
  private readonly uiPollEnds = new Float64Array(UI_POLL_CAPACITY);
  private readonly uiSnapshotDurations = new Float64Array(UI_POLL_CAPACITY);
  private readonly uiPollDurations = new Float64Array(UI_POLL_CAPACITY);
  private longTaskObserver: PerformanceObserver | null = null;
  private gcObserver: PerformanceObserver | null = null;
  private longTaskSupport: 'available' | 'unavailable' = 'unavailable';
  private garbageCollectionSupport: 'available' | 'unavailable' = 'unavailable';
  private paintTimingSupport: 'available' | 'unavailable' = 'unavailable';
  private longTaskWriteIndex = 0;
  private longTaskCount = 0;
  private totalLongTaskCount = 0;
  private totalLongTaskDurationMs = 0;
  private longestLongTaskMs = 0;
  private gcWriteIndex = 0;
  private gcCount = 0;
  private totalGarbageCollectionCount = 0;
  private totalGarbageCollectionDurationMs = 0;
  private longestGarbageCollectionMs = 0;
  private uiPollWriteIndex = 0;
  private uiPollCount = 0;
  private totalRafSchedulingGapMs = 0;
  private rafSchedulingGapCount = 0;
  private latestRafSchedulingGapMs = 0;
  private consecutiveDelayedFrames = 0;
  private maximumConsecutiveDelayedFrames = 0;
  private frameWriteIndex = 0;
  private frameCount = 0;
  private spikeWriteIndex = 0;
  private spikeCount = 0;
  private memoryWriteIndex = 0;
  private memoryCount = 0;
  private totalFrameCount = 0;
  private totalFrameIntervalMs = 0;
  private totalFrameIntervalCount = 0;
  private startedAt = 0;
  private hasStarted = false;
  private lastFrameTimestamp: number | null = null;
  private lastMemorySampleAt = 0;
  private lastSpikeAt = Number.NEGATIVE_INFINITY;
  private thresholds = [16.7, 33, 50];
  private latestCounts = createEmptyCounts();
  private readonly latestTimings = createGamePerformanceTimings();
  private readonly latestUiTimings: GamePerformanceUiTimings = {
    snapshotBuildMs: 0,
    pollWorkMs: 0,
  };
  private latestCanvasMetrics: GamePerformanceCanvasMetrics = {
    width: 0,
    height: 0,
    cssWidth: 0,
    cssHeight: 0,
    devicePixelRatio: 0,
    resizeCount: 0,
  };
  private latestArenaBackgroundCache: GamePerformanceBackgroundCacheMetrics = {
    generationCount: 0,
    cacheRebuildCount: 0,
  };

  startBrowserMonitoring(): void {
    this.disconnectBrowserMonitoring();
    this.longTaskSupport = 'unavailable';
    this.garbageCollectionSupport = 'unavailable';
    this.paintTimingSupport = 'unavailable';
    if (typeof PerformanceObserver === 'undefined') return;

    const supportedTypes = PerformanceObserver.supportedEntryTypes ?? [];
    this.paintTimingSupport = supportedTypes.includes('paint')
      ? 'available'
      : 'unavailable';
    if (supportedTypes.includes('longtask')) {
      try {
        this.longTaskObserver = new PerformanceObserver((list) => {
          for (const rawEntry of list.getEntries()) {
            if (rawEntry.duration <= 50) continue;
            this.recordActivityEntry(rawEntry as PerformanceEntryWithAttribution, 'longtask');
          }
        });
        this.longTaskObserver.observe({ type: 'longtask', buffered: false });
        this.longTaskSupport = 'available';
      } catch {
        this.longTaskObserver = null;
        this.longTaskSupport = 'unavailable';
      }
    }

    if (supportedTypes.includes('gc')) {
      try {
        this.gcObserver = new PerformanceObserver((list) => {
          for (const rawEntry of list.getEntries()) {
            this.recordActivityEntry(rawEntry as PerformanceEntryWithAttribution, 'gc');
          }
        });
        this.gcObserver.observe({ type: 'gc', buffered: false });
        this.garbageCollectionSupport = 'available';
      } catch {
        this.gcObserver = null;
        this.garbageCollectionSupport = 'unavailable';
      }
    }
  }

  disconnectBrowserMonitoring(): void {
    this.longTaskObserver?.disconnect();
    this.gcObserver?.disconnect();
    this.longTaskObserver = null;
    this.gcObserver = null;
  }

  reset(): void {
    this.frameWriteIndex = 0;
    this.frameCount = 0;
    this.spikeWriteIndex = 0;
    this.spikeCount = 0;
    this.memoryWriteIndex = 0;
    this.memoryCount = 0;
    this.totalFrameCount = 0;
    this.totalFrameIntervalMs = 0;
    this.totalFrameIntervalCount = 0;
    this.longTaskWriteIndex = 0;
    this.longTaskCount = 0;
    this.totalLongTaskCount = 0;
    this.totalLongTaskDurationMs = 0;
    this.longestLongTaskMs = 0;
    this.gcWriteIndex = 0;
    this.gcCount = 0;
    this.totalGarbageCollectionCount = 0;
    this.totalGarbageCollectionDurationMs = 0;
    this.longestGarbageCollectionMs = 0;
    this.uiPollWriteIndex = 0;
    this.uiPollCount = 0;
    this.totalRafSchedulingGapMs = 0;
    this.rafSchedulingGapCount = 0;
    this.latestRafSchedulingGapMs = 0;
    this.consecutiveDelayedFrames = 0;
    this.maximumConsecutiveDelayedFrames = 0;
    this.startedAt = 0;
    this.hasStarted = false;
    this.lastFrameTimestamp = null;
    this.lastMemorySampleAt = 0;
    this.lastSpikeAt = Number.NEGATIVE_INFINITY;
    this.peakValues.fill(0);
    this.eventDurationSamples.fill(0);
    this.eventSampleCounts.fill(0);
    this.eventSampleWriteIndices.fill(0);
    this.eventTotalCounts.fill(0);
    this.eventTotalDurations.fill(0);
    this.eventMaxDurations.fill(0);
    for (const key of GAME_PERFORMANCE_EVENT_COUNT_NAMES) {
      this.eventCountTotals[key] = 0;
    }
    this.latestCounts = createEmptyCounts();
    resetGamePerformanceTimings(this.latestTimings);
    this.latestUiTimings.snapshotBuildMs = 0;
    this.latestUiTimings.pollWorkMs = 0;
    this.latestCanvasMetrics = {
      width: 0,
      height: 0,
      cssWidth: 0,
      cssHeight: 0,
      devicePixelRatio: 0,
      resizeCount: 0,
    };
    this.latestArenaBackgroundCache = {
      generationCount: 0,
      cacheRebuildCount: 0,
    };
  }

  recordUiPoll(
    snapshotBuildMs: number,
    pollWorkMs: number,
    startTime = performance.now() - pollWorkMs,
    endTime = performance.now(),
  ): void {
    this.latestUiTimings.snapshotBuildMs = snapshotBuildMs;
    this.latestUiTimings.pollWorkMs = pollWorkMs;
    this.uiPollStarts[this.uiPollWriteIndex] = startTime;
    this.uiPollEnds[this.uiPollWriteIndex] = endTime;
    this.uiSnapshotDurations[this.uiPollWriteIndex] = snapshotBuildMs;
    this.uiPollDurations[this.uiPollWriteIndex] = pollWorkMs;
    this.uiPollWriteIndex = (this.uiPollWriteIndex + 1) % UI_POLL_CAPACITY;
    this.uiPollCount = Math.min(UI_POLL_CAPACITY, this.uiPollCount + 1);
  }

  setCanvasMetrics(metrics: GamePerformanceCanvasMetrics): void {
    this.latestCanvasMetrics.width = metrics.width;
    this.latestCanvasMetrics.height = metrics.height;
    this.latestCanvasMetrics.cssWidth = metrics.cssWidth;
    this.latestCanvasMetrics.cssHeight = metrics.cssHeight;
    this.latestCanvasMetrics.devicePixelRatio = metrics.devicePixelRatio;
    this.latestCanvasMetrics.resizeCount = metrics.resizeCount;
  }

  setArenaBackgroundCacheMetrics(
    metrics: GamePerformanceBackgroundCacheMetrics,
  ): void {
    this.latestArenaBackgroundCache = { ...metrics };
  }

  private recordActivityEntry(
    entry: PerformanceEntryWithAttribution,
    type: 'longtask' | 'gc',
  ): void {
    if (type === 'longtask') {
      const index = this.longTaskWriteIndex;
      this.longTaskStarts[index] = entry.startTime;
      this.longTaskDurations[index] = entry.duration;
      this.longTaskNames[index] = entry.name;
      this.longTaskAttributions[index] = getActivityAttribution(entry);
      this.longTaskWriteIndex = (index + 1) % ACTIVITY_CAPACITY;
      this.longTaskCount = Math.min(ACTIVITY_CAPACITY, this.longTaskCount + 1);
      this.totalLongTaskCount += 1;
      this.totalLongTaskDurationMs += entry.duration;
      this.longestLongTaskMs = Math.max(this.longestLongTaskMs, entry.duration);
      return;
    }

    const index = this.gcWriteIndex;
    this.gcStarts[index] = entry.startTime;
    this.gcDurations[index] = entry.duration;
    this.gcNames[index] = entry.name;
    const detail = entry.detail;
    this.gcAttributions[index] = [
      ...(detail?.kind === undefined ? [] : [`kind=${detail.kind}`]),
      ...(detail?.flags === undefined ? [] : [`flags=${detail.flags}`]),
    ];
    this.gcWriteIndex = (index + 1) % ACTIVITY_CAPACITY;
    this.gcCount = Math.min(ACTIVITY_CAPACITY, this.gcCount + 1);
    this.totalGarbageCollectionCount += 1;
    this.totalGarbageCollectionDurationMs += entry.duration;
    this.longestGarbageCollectionMs = Math.max(
      this.longestGarbageCollectionMs,
      entry.duration,
    );
  }

  setThresholds(thresholds: readonly [number, number, number]): void {
    const [frame16_7, frame33, frame50] = thresholds;
    if (
      !Number.isFinite(frame16_7) ||
      !Number.isFinite(frame33) ||
      !Number.isFinite(frame50) ||
      frame16_7 <= 0 ||
      frame16_7 >= frame33 ||
      frame33 >= frame50
    ) {
      throw new RangeError('Frame thresholds must be positive and strictly increasing.');
    }
    this.thresholds = [frame16_7, frame33, frame50];
  }

  recordFrame(
    timestamp: number,
    frameTimeMs: number,
    timings: GamePerformanceTimings,
    state: GameState | null,
    callbackStartedAt = performance.now(),
    canvasMetrics?: GamePerformanceCanvasMetrics,
  ): void {
    if (!this.hasStarted) {
      this.startedAt = timestamp;
      this.hasStarted = true;
    }
    const counts = state ? getGamePerformanceCounts(state) : createEmptyCounts();
    timings.frameCallbackMs = performance.now() - callbackStartedAt;
    if (canvasMetrics) this.setCanvasMetrics(canvasMetrics);
    const frameIndex = this.frameWriteIndex;
    const rowStart = frameIndex * FRAME_SLOT_COUNT;
    this.frameTimestamps[frameIndex] = timestamp;
    this.frameData[rowStart + FRAME_TIME_SLOT] = frameTimeMs;
    for (let index = 0; index < TIMING_KEYS.length; index += 1) {
      const key = TIMING_KEYS[index]!;
      this.frameData[rowStart + 1 + index] = timings[key];
    }
    for (let index = 0; index < COUNT_KEYS.length; index += 1) {
      const key = COUNT_KEYS[index]!;
      const count = counts[key];
      this.frameData[rowStart + COUNT_SLOT_START + index] = count;
      this.peakValues[index] = Math.max(this.peakValues[index]!, count);
    }
    for (let index = 0; index < GAME_PERFORMANCE_EVENT_COUNT_NAMES.length; index += 1) {
      const name = GAME_PERFORMANCE_EVENT_COUNT_NAMES[index]!;
      this.eventCountTotals[name] += timings.events.counts[name];
      this.frameData[
        rowStart + EVENT_COUNT_SLOT_START + index
      ] = timings.events.counts[name];
    }
    for (let index = 0; index < GAME_PERFORMANCE_EVENT_NAMES.length; index += 1) {
      const name = GAME_PERFORMANCE_EVENT_NAMES[index]!;
      this.frameData[rowStart + EVENT_TOTAL_SLOT_START + index] =
        timings.events.totalMs[name];
      this.frameData[rowStart + EVENT_MAX_SLOT_START + index] =
        timings.events.maxMs[name];
      this.recordEventSamples(index, timings, name);
    }

    this.latestCounts = counts;
    for (const key of TIMING_KEYS) this.latestTimings[key] = timings[key];
    for (const key of GAME_PERFORMANCE_EVENT_COUNT_NAMES) {
    this.latestTimings.events.counts[key] = timings.events.counts[key];
    }
    for (const key of GAME_PERFORMANCE_EVENT_NAMES) {
    this.latestTimings.events.durationCounts[key] =
      timings.events.durationCounts[key];
    this.latestTimings.events.totalMs[key] = timings.events.totalMs[key];
    this.latestTimings.events.maxMs[key] = timings.events.maxMs[key];
    this.latestTimings.events.samplesMs[key].length = 0;
    }
    this.frameWriteIndex = (this.frameWriteIndex + 1) % FRAME_CAPACITY;
    this.frameCount = Math.min(FRAME_CAPACITY, this.frameCount + 1);
    this.totalFrameCount += 1;
    if (frameTimeMs > 0) {
      this.totalFrameIntervalMs += frameTimeMs;
      this.totalFrameIntervalCount += 1;
    }
    this.latestRafSchedulingGapMs = timings.rafSchedulingGapMs;
    if (timings.rafSchedulingGapMs > 0) {
      this.totalRafSchedulingGapMs += timings.rafSchedulingGapMs;
      this.rafSchedulingGapCount += 1;
    }
    if (frameTimeMs > this.thresholds[0]!) {
      this.consecutiveDelayedFrames += 1;
      this.maximumConsecutiveDelayedFrames = Math.max(
        this.maximumConsecutiveDelayedFrames,
        this.consecutiveDelayedFrames,
      );
    } else {
      this.consecutiveDelayedFrames = 0;
    }
    this.lastFrameTimestamp = timestamp;
    this.appendFollowingFrameTime(timestamp, frameTimeMs);

    if (timestamp - this.lastMemorySampleAt >= 1000) {
      const heapSize = getUsedHeapSize();
      if (heapSize !== null) {
        this.memoryTimestamps[this.memoryWriteIndex] = timestamp;
        this.memoryValues[this.memoryWriteIndex] = heapSize;
        this.memoryWriteIndex = (this.memoryWriteIndex + 1) % MEMORY_CAPACITY;
        this.memoryCount = Math.min(MEMORY_CAPACITY, this.memoryCount + 1);
      }
      this.lastMemorySampleAt = timestamp;
    }

    const frame33Threshold = this.thresholds[1]!;
    if (
      frameTimeMs > frame33Threshold &&
      timestamp - this.lastSpikeAt >= 1000
    ) {
      const spikeIndex = this.spikeWriteIndex;
      this.spikeTimestamps[spikeIndex] = timestamp;
      this.spikeFollowingFrameCounts[spikeIndex] = 0;
      this.spikeFollowingFrameTimes.fill(
        0,
        spikeIndex * POST_SPIKE_FRAME_COUNT,
        (spikeIndex + 1) * POST_SPIKE_FRAME_COUNT,
      );
      this.spikeWallClockTimestamps[spikeIndex] = new Date().toISOString();
      this.spikeArena[spikeIndex] = state?.arenaTheme ?? 'unavailable';
      this.spikeGameMode[spikeIndex] = state?.gameMode ?? 'unavailable';
      this.spikeWave[spikeIndex] = state?.wave.currentWave ?? 0;
      this.spikeDelayedFrameStreak[spikeIndex] =
        this.consecutiveDelayedFrames;
      const spikeDataStart = spikeIndex * (FRAME_SLOT_COUNT + PRE_SPIKE_FRAME_COUNT);
      this.spikeData.set(
        this.frameData.subarray(rowStart, rowStart + FRAME_SLOT_COUNT),
        spikeDataStart,
      );
      for (let back = PRE_SPIKE_FRAME_COUNT; back >= 1; back -= 1) {
        const previousRow =
          (frameIndex - back + FRAME_CAPACITY) % FRAME_CAPACITY;
        const previousOffset = this.frameCount > back
          ? this.frameData[previousRow * FRAME_SLOT_COUNT + FRAME_TIME_SLOT]!
          : 0;
        const previousSlot = PRE_SPIKE_FRAME_COUNT - back;
        this.spikeData[
          spikeDataStart + FRAME_SLOT_COUNT + previousSlot
        ] = previousOffset;
      }
      this.spikeWriteIndex = (this.spikeWriteIndex + 1) % SPIKE_CAPACITY;
      this.spikeCount = Math.min(SPIKE_CAPACITY, this.spikeCount + 1);
      this.lastSpikeAt = timestamp;
    }
  }

  getSnapshot(): GamePerformanceSnapshot {
    const frameTimes = new Float64Array(this.frameCount);
    let totalFrameTime = 0;
    let framesOverThreshold1 = 0;
    let framesOverThreshold2 = 0;
    let framesOverThreshold3 = 0;
    const schedulingGaps = new Float64Array(this.frameCount);
    const schedulingGapSlot = 1 + TIMING_KEYS.indexOf('rafSchedulingGapMs');
    for (let offset = 0; offset < this.frameCount; offset += 1) {
      const rowIndex =
        (this.frameWriteIndex - this.frameCount + offset + FRAME_CAPACITY) %
        FRAME_CAPACITY;
      const value = this.frameData[rowIndex * FRAME_SLOT_COUNT + FRAME_TIME_SLOT]!;
      schedulingGaps[offset] =
        this.frameData[rowIndex * FRAME_SLOT_COUNT + schedulingGapSlot]!;
      frameTimes[offset] = value;
      totalFrameTime += value;
      if (value > this.thresholds[0]!) framesOverThreshold1 += 1;
      if (value > this.thresholds[1]!) framesOverThreshold2 += 1;
      if (value > this.thresholds[2]!) framesOverThreshold3 += 1;
    }
    const sortedFrameTimes = [...frameTimes].sort((left, right) => left - right);
    const sortedSchedulingGaps = [...schedulingGaps].sort(
      (left, right) => left - right,
    );
    const frameTimeMs = frameTimes.at(-1) ?? 0;
    const averageFrameTime = this.frameCount > 0
      ? totalFrameTime / this.frameCount
      : 0;
    const collisionMs =
      this.latestTimings.projectileCollisionMs +
      this.latestTimings.swarmProjectileAvoidanceMs;
    const timings = { ...this.latestTimings };
    const frameCount = this.totalFrameCount;
    const durationMs = this.hasStarted && frameTimes.length > 1
      ? Math.max(0, (this.lastFrameTimestamp ?? this.startedAt) - this.startedAt)
      : 0;
    const memorySamples = this.getMemorySamples();
    const currentHeap = memorySamples.at(-1)?.usedBytes ?? null;
    const firstHeap = memorySamples[0]?.usedBytes ?? null;
    const memoryTrend = currentHeap === null || firstHeap === null
      ? 'unavailable'
      : currentHeap > firstHeap * 1.05
        ? 'increasing'
        : currentHeap < firstHeap * 0.95
          ? 'decreasing'
          : 'stable';

    return {
      enabled: true,
      captureDurationMs: durationMs,
      currentFps: frameTimeMs > 0 ? 1000 / frameTimeMs : 0,
      averageFps: this.totalFrameIntervalMs > 0
        ? (this.totalFrameIntervalCount * 1000) / this.totalFrameIntervalMs
        : 0,
      frameTimeMs,
      frameTimeP95Ms: this.getPercentile(sortedFrameTimes, 0.95),
      frameTimeP99Ms: this.getPercentile(sortedFrameTimes, 0.99),
      framesOverThreshold1,
      framesOverThreshold2,
      framesOverThreshold3,
      frameCount,
      rollingFrameCount: this.frameCount,
      thresholdsMs: [
        this.thresholds[0]!,
        this.thresholds[1]!,
        this.thresholds[2]!,
      ],
      timings,
      timingStatisticsMs: this.getTimingStatistics(),
      eventTimings: this.getEventTimings(),
      eventCountTotals: { ...this.eventCountTotals },
      uiTimings: { ...this.latestUiTimings },
      browserMetrics: {
        longTaskSupport: this.longTaskSupport,
        longTaskCount: this.totalLongTaskCount,
        totalLongTaskDurationMs: this.totalLongTaskDurationMs,
        longestLongTaskMs: this.longestLongTaskMs,
        longTasks: this.getActivityEntries('longtask'),
        garbageCollectionSupport: this.garbageCollectionSupport,
        garbageCollectionCount: this.totalGarbageCollectionCount,
        totalGarbageCollectionDurationMs:
          this.totalGarbageCollectionDurationMs,
        longestGarbageCollectionMs: this.longestGarbageCollectionMs,
        garbageCollections: this.getActivityEntries('gc'),
        paintTimingSupport: this.paintTimingSupport,
        latestRafSchedulingGapMs: this.latestRafSchedulingGapMs,
        averageRafSchedulingGapMs: this.rafSchedulingGapCount > 0
          ? this.totalRafSchedulingGapMs / this.rafSchedulingGapCount
          : 0,
        p95RafSchedulingGapMs: this.getPercentile(sortedSchedulingGaps, 0.95),
        consecutiveDelayedFrames: this.consecutiveDelayedFrames,
        maximumConsecutiveDelayedFrames: this.maximumConsecutiveDelayedFrames,
      },
      canvasMetrics: { ...this.latestCanvasMetrics },
      arenaBackgroundCache: { ...this.latestArenaBackgroundCache },
      collisionMs,
      counts: { ...this.latestCounts },
      peakCounts: this.getPeakCounts(),
      memoryUsageBytes: currentHeap,
      memoryTrend,
      memorySamples,
      spikes: this.getSpikes(),
    };
  }

  exportReport(
    canvas: HTMLCanvasElement,
    devicePixelRatio: number,
    resizeCount = 0,
  ): object {
    const snapshot = this.getSnapshot();
    const rows = this.getChronologicalFrameRows();
    const processingStatisticsMs = Object.fromEntries(
      TIMING_KEYS.map((key, timingIndex) => {
        const values = rows.map((row) => row[1 + timingIndex] ?? 0);
        const sortedValues = [...values].sort((left, right) => left - right);
        const averageMs = values.length > 0
          ? values.reduce((total, value) => total + value, 0) / values.length
          : 0;
        const percentile = (ratio: number) => sortedValues.length > 0
          ? sortedValues[
              Math.min(
                sortedValues.length - 1,
                Math.ceil(sortedValues.length * ratio) - 1,
              )
            ] ?? 0
          : 0;
        return [
          key,
          {
            currentMs: snapshot.timings[key],
            averageMs,
            p95Ms: percentile(0.95),
            p99Ms: percentile(0.99),
          },
        ];
      }),
    );
    return {
      reportType: 'last-z-performance-diagnostics',
      schemaVersion: 1,
      capturedAt: new Date().toISOString(),
      browser: navigator.userAgent,
      application: 'LAST Z: AFTERHOURS',
      buildMode: import.meta.env.DEV ? 'development' : 'production',
      canvas: {
        width: canvas.width,
        height: canvas.height,
        cssWidth: canvas.clientWidth,
        cssHeight: canvas.clientHeight,
        devicePixelRatio,
        resizeCount,
      },
      thresholdsMs: [...this.thresholds],
      captureDurationMs: snapshot.captureDurationMs,
      frameStatistics: {
        currentFps: snapshot.currentFps,
        averageFps: snapshot.averageFps,
        frameTimeMs: snapshot.frameTimeMs,
        p95Ms: snapshot.frameTimeP95Ms,
        p99Ms: snapshot.frameTimeP99Ms,
        framesOverThreshold1: snapshot.framesOverThreshold1,
        framesOverThreshold2: snapshot.framesOverThreshold2,
        framesOverThreshold3: snapshot.framesOverThreshold3,
        thresholdsMs: snapshot.thresholdsMs,
        frameCount: snapshot.frameCount,
        rollingFrameCount: snapshot.rollingFrameCount,
      },
      latestProcessingTimingsMs: snapshot.timings,
      processingTimingStatisticsMs: snapshot.timingStatisticsMs,
      eventTimings: snapshot.eventTimings,
      eventCountTotals: snapshot.eventCountTotals,
      latestUiTimingsMs: snapshot.uiTimings,
      browserMetrics: snapshot.browserMetrics,
      canvasMetrics: {
        width: canvas.width,
        height: canvas.height,
        cssWidth: canvas.clientWidth,
        cssHeight: canvas.clientHeight,
        devicePixelRatio,
        resizeCount,
      },
      arenaBackgroundCache: snapshot.arenaBackgroundCache,
      processingStatisticsMs,
      collisionMs: snapshot.collisionMs,
      latestCounts: snapshot.counts,
      peakCounts: snapshot.peakCounts,
      memory: {
        latestUsedHeapBytes: snapshot.memoryUsageBytes,
        trend: snapshot.memoryTrend,
        samples: snapshot.memorySamples,
      },
      spikes: snapshot.spikes,
      frameHistory: rows.map((row) => ({
        frameTimeMs: row[FRAME_TIME_SLOT],
        timingsMs: Object.fromEntries(
          TIMING_KEYS.map((key, index) => [key, row[1 + index]]),
        ),
        counts: Object.fromEntries(
          COUNT_KEYS.map((key, index) => [
            key,
            row[COUNT_SLOT_START + index],
          ]),
        ),
        eventCounts: Object.fromEntries(
          GAME_PERFORMANCE_EVENT_COUNT_NAMES.map((key, index) => [
            key,
            row[EVENT_COUNT_SLOT_START + index],
          ]),
        ),
        eventTimingsMs: Object.fromEntries(
          GAME_PERFORMANCE_EVENT_NAMES.map((key, index) => [
            key,
            {
              totalMs: row[EVENT_TOTAL_SLOT_START + index],
              maxMs: row[EVENT_MAX_SLOT_START + index],
            },
          ]),
        ),
      })),
      metricDefinitions: {
        frameTime: 'requestAnimationFrame timestamp delta; callback pacing, not presentation timing.',
        rafSchedulingGapMs: 'performance.now() at the next RAF callback entry minus performance.now() recorded after the previous callback scheduled its successor; approximate callback-to-callback idle gap, not GPU or browser-paint time.',
        previousCallbackDurationMs: 'Measured game callback body duration stored with the following RAF interval for temporal alignment; excludes recorder writes and RAF scheduling.',
        consecutiveDelayedFrames: 'Consecutive RAF timestamp intervals strictly over threshold 1; reset when an interval is at or below threshold 1.',
        longTasks: 'PerformanceObserver longtask entries strictly over 50 ms; browser support and attribution detail vary.',
        garbageCollections: 'PerformanceObserver gc entries when supported by the browser; unavailable is not evidence that no collection occurred.',
        spikeCorrelations: 'Long tasks, GC entries, and UI polls whose monotonic-time ranges overlap the recorded RAF interval; correlation does not establish causation.',
        canvasPipeline: 'Canvas JavaScript draw duration and backing/CSS dimensions are measured; style, layout, paint, raster, compositor, and GPU per-frame durations are not available through this page instrumentation.',
        arenaBackgroundCache: 'Counts actual static-background generations and cache builds since the page loaded; a cache hit draws the stored bitmap without regenerating the floor/frame. Cache contents include static floor/frame only, not interactive arena objects.',
        reactCommit: 'React commit duration and component render counts are not instrumented; use React DevTools Profiler for those measurements.',
        averageFps: 'Average over non-zero recorded requestAnimationFrame intervals; p95/p99 and threshold counts use the rolling frame buffer.',
        uiTimings: 'snapshotBuildMs measures createGameStateSnapshot including its cloning; pollWorkMs includes snapshot cloning, event/discovery/audio polling, and React state scheduling, but not React commit/render duration.',
        frameCallbackMs: 'Time from callback entry through update, render, FPS callback, and workload counting; excludes recorder buffer writes and requestAnimationFrame scheduling.',
        updateMs: 'Includes simulation and render-layer construction; do not add nested renderLayersMs.',
        renderMs: 'Includes arena rendering; do not add nested arenaRenderMs or arenaFloorMs.',
        collisionMs: 'Projectile collision plus swarm projectile avoidance. Zombie collision is nested inside projectile collision.',
        zombieCollisionMs: 'Zombie candidate filtering/sorting subset of projectile collision; not additive.',
        arenaFloorMs: 'Arena floor draw subset of arenaRenderMs and renderMs.',
        activeEffects: 'Active temporary effects + impacts + damage numbers + collection effects.',
        totalActiveEntities: 'Unique ownership-array entries plus the player; category metrics can overlap and should not be summed.',
        industrialObjects: 'Gas cylinders and oil-fire patches; industrial arena obstacles remain counted as arena obstacles.',
        memory: 'performance.memory JS heap value when the browser exposes it; not total process or GPU memory.',
        renderOperationCounts: 'Not instrumented; native Canvas APIs are not monkey-patched.',
        processingCoverage: 'Collision timing covers projectile collision and swarm projectile avoidance, not every actor overlap or hazard contact.',
        eventTimings: 'Event duration p95 and max use the latest bounded event-sample window; counts and total duration cover the full capture. Frame-history event counts and event duration maxima are captured per RAF frame.',
        eventDurationNesting: 'Enemy damage includes its death and splitter consequences; explosion/hazard creation may include nested damage and effect creation. Event timings are overlapping measurements and must not be summed.',
      },
      measurementLimitations: [
        'Instrumentation is developer-only and adds timing and count work while enabled.',
        'Percentiles cover the rolling frame buffer, not the full capture session.',
        'Spike recording is throttled to one event per second during sustained slowdowns.',
        'Memory trend compares sparse JavaScript heap samples and is not a leak detector.',
        'PerformanceObserver task, GC, and Paint Timing capabilities are browser-dependent; Paint Timing entries are page-level and do not measure each Canvas frame.',
        'The callback-to-callback scheduling gap is an estimate based on monotonic callback timestamps and cannot attribute time to browser scheduling, other tasks, Electron, the OS, or the GPU.',
        'React commit duration and component render counts require React DevTools Profiler; this panel reports them as not instrumented.',
      ],
    };
  }

  private getChronologicalFrameRows(): number[][] {
    const rows: number[][] = [];
    const firstIndex =
      (this.frameWriteIndex - this.frameCount + FRAME_CAPACITY) % FRAME_CAPACITY;
    for (let offset = 0; offset < this.frameCount; offset += 1) {
      const rowIndex = (firstIndex + offset) % FRAME_CAPACITY;
      const rowStart = rowIndex * FRAME_SLOT_COUNT;
      rows.push(Array.from(
        this.frameData.subarray(rowStart, rowStart + FRAME_SLOT_COUNT),
      ));
    }
    return rows;
  }

  private recordEventSamples(
    eventIndex: number,
    timings: GamePerformanceTimings,
    name: GamePerformanceEventName,
  ): void {
    const samples = timings.events.samplesMs[name];
    this.eventTotalCounts[eventIndex] += timings.events.durationCounts[name];
    this.eventTotalDurations[eventIndex] += timings.events.totalMs[name];
    this.eventMaxDurations[eventIndex] = Math.max(
      this.eventMaxDurations[eventIndex]!,
      timings.events.maxMs[name],
    );
    const baseIndex = eventIndex * EVENT_SAMPLE_CAPACITY;
    for (const sample of samples) {
      const writeIndex = this.eventSampleWriteIndices[eventIndex]!;
      this.eventDurationSamples[baseIndex + writeIndex] = sample;
      this.eventSampleWriteIndices[eventIndex] =
        (writeIndex + 1) % EVENT_SAMPLE_CAPACITY;
      this.eventSampleCounts[eventIndex] = Math.min(
        EVENT_SAMPLE_CAPACITY,
        this.eventSampleCounts[eventIndex]! + 1,
      );
    }
  }

  private getEventTimings(): GamePerformanceEventTiming[] {
    return GAME_PERFORMANCE_EVENT_NAMES.map((name, eventIndex) => {
      const count = this.eventSampleCounts[eventIndex]!;
      const baseIndex = eventIndex * EVENT_SAMPLE_CAPACITY;
      const values = Array.from(
        this.eventDurationSamples.subarray(baseIndex, baseIndex + count),
      );
      values.sort((left, right) => left - right);
      return {
        name,
        sampleCount: this.eventTotalCounts[eventIndex]!,
        totalMs: this.eventTotalDurations[eventIndex]!,
        maxMs: this.eventMaxDurations[eventIndex]!,
        p95Ms: this.getPercentile(values, 0.95),
      };
    });
  }

  private getTimingStatistics(): GamePerformanceSnapshot['timingStatisticsMs'] {
    const statistics = {} as GamePerformanceSnapshot['timingStatisticsMs'];
    for (let timingIndex = 0; timingIndex < TIMING_KEYS.length; timingIndex += 1) {
      const key = TIMING_KEYS[timingIndex]!;
      const values = new Array<number>(this.frameCount);
      let totalMs = 0;
      for (let offset = 0; offset < this.frameCount; offset += 1) {
        const rowIndex =
          (this.frameWriteIndex - this.frameCount + offset + FRAME_CAPACITY) %
          FRAME_CAPACITY;
        const value = this.frameData[
          rowIndex * FRAME_SLOT_COUNT + 1 + timingIndex
        ]!;
        values[offset] = value;
        totalMs += value;
      }
      values.sort((left, right) => left - right);
      const percentile = (ratio: number) => values.length > 0
        ? values[
            Math.min(
              values.length - 1,
              Math.ceil(values.length * ratio) - 1,
            )
          ] ?? 0
        : 0;
      statistics[key] = {
        sampleCount: values.length,
        averageMs: values.length > 0 ? totalMs / values.length : 0,
        p95Ms: percentile(0.95),
        p99Ms: percentile(0.99),
        maxMs: values.at(-1) ?? 0,
      };
    }
    return statistics;
  }

  private getMemorySamples(): { timestamp: number; usedBytes: number }[] {
    const samples: { timestamp: number; usedBytes: number }[] = [];
    const firstIndex =
      (this.memoryWriteIndex - this.memoryCount + MEMORY_CAPACITY) % MEMORY_CAPACITY;
    for (let offset = 0; offset < this.memoryCount; offset += 1) {
      const index = (firstIndex + offset) % MEMORY_CAPACITY;
      samples.push({
        timestamp: this.memoryTimestamps[index]!,
        usedBytes: this.memoryValues[index]!,
      });
    }
    return samples;
  }

  private getSpikes(): GamePerformanceSpike[] {
    const spikes: GamePerformanceSpike[] = [];
    const firstIndex =
      (this.spikeWriteIndex - this.spikeCount + SPIKE_CAPACITY) % SPIKE_CAPACITY;
    for (let offset = 0; offset < this.spikeCount; offset += 1) {
      const index = (firstIndex + offset) % SPIKE_CAPACITY;
      const rowStart = index * (FRAME_SLOT_COUNT + PRE_SPIKE_FRAME_COUNT);
      const getTiming = (key: keyof GamePerformanceTimings) =>
        this.spikeData[
          rowStart + 1 + TIMING_KEYS.indexOf(key as typeof TIMING_KEYS[number])
        ] ?? 0;
      const counts = createEmptyCounts();
      for (let countIndex = 0; countIndex < COUNT_KEYS.length; countIndex += 1) {
        const key = COUNT_KEYS[countIndex]!;
        counts[key] = this.spikeData[rowStart + COUNT_SLOT_START + countIndex]!;
      }
      const eventCounts = Object.fromEntries(
        GAME_PERFORMANCE_EVENT_COUNT_NAMES.map((key, eventIndex) => [
          key,
          this.spikeData[
            rowStart + EVENT_COUNT_SLOT_START + eventIndex
          ]!,
        ]),
      ) as Record<GamePerformanceEventCountName, number>;
      const eventTotalMs = Object.fromEntries(
        GAME_PERFORMANCE_EVENT_NAMES.map((key, eventIndex) => [
          key,
          this.spikeData[
            rowStart + EVENT_TOTAL_SLOT_START + eventIndex
          ]!,
        ]),
      ) as Record<GamePerformanceEventName, number>;
      const eventMaxMs = Object.fromEntries(
        GAME_PERFORMANCE_EVENT_NAMES.map((key, eventIndex) => [
          key,
          this.spikeData[
            rowStart + EVENT_MAX_SLOT_START + eventIndex
          ]!,
        ]),
      ) as Record<GamePerformanceEventName, number>;
      const precedingFrameTimesMs: number[] = [];
      for (let slot = 0; slot < PRE_SPIKE_FRAME_COUNT; slot += 1) {
        const value = this.spikeData[rowStart + FRAME_SLOT_COUNT + slot]!;
        if (value > 0) precedingFrameTimesMs.push(value);
      }
      const timings = {
        frameCallbackMs: getTiming('frameCallbackMs'),
        updateMs: getTiming('updateMs'),
        renderMs: getTiming('renderMs'),
        renderLayersMs: getTiming('renderLayersMs'),
        actorSortMs: getTiming('actorSortMs'),
        arenaRenderMs: getTiming('arenaRenderMs'),
        arenaFloorMs: getTiming('arenaFloorMs'),
        projectileCollisionMs: getTiming('projectileCollisionMs'),
        zombieCollisionMs: getTiming('zombieCollisionMs'),
        swarmProjectileAvoidanceMs: getTiming('swarmProjectileAvoidanceMs'),
      };
      spikes.push({
        timestamp: this.spikeTimestamps[index]!,
        intervalStartTimestamp:
          this.spikeTimestamps[index]! -
          this.spikeData[rowStart + FRAME_TIME_SLOT]!,
        wallClockTimestamp: this.spikeWallClockTimestamps[index] ?? '',
        frameTimeMs: this.spikeData[rowStart + FRAME_TIME_SLOT]!,
        followingFrameTimesMs: this.getFollowingFrameTimes(
          this.spikeTimestamps[index]!,
        ),
        previousCallbackDurationMs: getTiming('previousCallbackDurationMs'),
        estimatedSchedulingGapMs: getTiming('rafSchedulingGapMs'),
        delayedFrameStreak: this.spikeDelayedFrameStreak[index]!,
        ...timings,
        collisionMs:
          timings.projectileCollisionMs + timings.swarmProjectileAvoidanceMs,
        arena: this.spikeArena[index] ?? 'unavailable',
        gameMode: this.spikeGameMode[index] ?? 'unavailable',
        wave: this.spikeWave[index]!,
        counts,
        events: {
          counts: eventCounts,
          totalMs: eventTotalMs,
          maxMs: eventMaxMs,
        },
        precedingFrameTimesMs,
        correlatedLongTasks: this.getActivityEntries('longtask').filter(
          (entry) =>
            entry.startTime < this.spikeTimestamps[index]! &&
            entry.startTime + entry.durationMs >
              this.spikeTimestamps[index]! -
                this.spikeData[rowStart + FRAME_TIME_SLOT]!,
        ),
        correlatedGarbageCollections: this.getActivityEntries('gc').filter(
          (entry) =>
            entry.startTime < this.spikeTimestamps[index]! &&
            entry.startTime + entry.durationMs >
              this.spikeTimestamps[index]! -
                this.spikeData[rowStart + FRAME_TIME_SLOT]!,
        ),
        correlatedUiPolls: this.getUiPolls().filter(
          (poll) =>
            poll.startTime < this.spikeTimestamps[index]! &&
            poll.endTime >
              this.spikeTimestamps[index]! -
                this.spikeData[rowStart + FRAME_TIME_SLOT]!,
        ),
      });
    }
    return spikes;
  }

  private getActivityEntries(type: 'longtask' | 'gc'): PerformanceActivityEntry[] {
    const starts = type === 'longtask' ? this.longTaskStarts : this.gcStarts;
    const durations =
      type === 'longtask' ? this.longTaskDurations : this.gcDurations;
    const names = type === 'longtask' ? this.longTaskNames : this.gcNames;
    const attributions =
      type === 'longtask' ? this.longTaskAttributions : this.gcAttributions;
    const writeIndex =
      type === 'longtask' ? this.longTaskWriteIndex : this.gcWriteIndex;
    const count = type === 'longtask' ? this.longTaskCount : this.gcCount;
    const firstIndex = (writeIndex - count + ACTIVITY_CAPACITY) % ACTIVITY_CAPACITY;
    const entries: PerformanceActivityEntry[] = [];
    for (let offset = 0; offset < count; offset += 1) {
      const index = (firstIndex + offset) % ACTIVITY_CAPACITY;
      entries.push({
        startTime: starts[index]!,
        durationMs: durations[index]!,
        name: names[index] ?? type,
        attribution: attributions[index] ?? [],
      });
    }
    return entries;
  }

  private getUiPolls(): GamePerformanceUiPoll[] {
    const firstIndex =
      (this.uiPollWriteIndex - this.uiPollCount + UI_POLL_CAPACITY) %
      UI_POLL_CAPACITY;
    const polls: GamePerformanceUiPoll[] = [];
    for (let offset = 0; offset < this.uiPollCount; offset += 1) {
      const index = (firstIndex + offset) % UI_POLL_CAPACITY;
      polls.push({
        startTime: this.uiPollStarts[index]!,
        endTime: this.uiPollEnds[index]!,
        snapshotBuildMs: this.uiSnapshotDurations[index]!,
        pollWorkMs: this.uiPollDurations[index]!,
      });
    }
    return polls;
  }

  private getFollowingFrameTimes(timestamp: number): number[] {
    const following: number[] = [];
    for (let index = 0; index < this.spikeCount; index += 1) {
      const spikeIndex =
        (this.spikeWriteIndex - this.spikeCount + index + SPIKE_CAPACITY) %
        SPIKE_CAPACITY;
      if (this.spikeTimestamps[spikeIndex] !== timestamp) continue;
      const start = spikeIndex * POST_SPIKE_FRAME_COUNT;
      for (
        let frameIndex = 0;
        frameIndex < this.spikeFollowingFrameCounts[spikeIndex]!;
        frameIndex += 1
      ) {
        following.push(this.spikeFollowingFrameTimes[start + frameIndex]!);
      }
      break;
    }
    return following;
  }

  private appendFollowingFrameTime(timestamp: number, frameTimeMs: number): void {
    if (frameTimeMs <= 0) return;
    for (let index = 0; index < this.spikeCount; index += 1) {
      const spikeIndex =
        (this.spikeWriteIndex - this.spikeCount + index + SPIKE_CAPACITY) %
        SPIKE_CAPACITY;
      const count = this.spikeFollowingFrameCounts[spikeIndex]!;
      if (
        count >= POST_SPIKE_FRAME_COUNT ||
        timestamp <= this.spikeTimestamps[spikeIndex]!
      ) {
        continue;
      }
      this.spikeFollowingFrameTimes[
        spikeIndex * POST_SPIKE_FRAME_COUNT + count
      ] = frameTimeMs;
      this.spikeFollowingFrameCounts[spikeIndex] = count + 1;
    }
  }

  private getPeakCounts(): GamePerformanceCounts {
    const counts = createEmptyCounts();
    for (let index = 0; index < COUNT_KEYS.length; index += 1) {
      counts[COUNT_KEYS[index]!] = this.peakValues[index]!;
    }
    return counts;
  }

  private getPercentile(sortedValues: readonly number[], percentile: number): number {
    if (sortedValues.length === 0) return 0;
    const index = Math.min(
      sortedValues.length - 1,
      Math.ceil(sortedValues.length * percentile) - 1,
    );
    return sortedValues[index]!;
  }
}
