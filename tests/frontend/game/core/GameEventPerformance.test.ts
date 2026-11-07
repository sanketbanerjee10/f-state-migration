import { afterAll, describe, expect, it } from 'vitest';
import {
  createGameState,
  createZombie,
  type GameState,
} from '@/game/core/GameState';
import {
  createGamePerformanceTimings,
  GamePerformanceRecorder,
  resetGamePerformanceTimings,
  type GamePerformanceSnapshot,
} from '@/game/core/GamePerformanceDiagnostics';
import { updateGameState } from '@/game/core/GameSimulation';

const scenarioReports: Record<string, unknown> = {};

function createScenarioState(): GameState {
  const state = createGameState();
  state.player.x = 80;
  state.player.y = 270;
  state.player.fireCooldownSeconds = 10_000;
  state.wave.spawnCooldownSeconds = 10_000;
  state.arenaObstacles = [];
  state.barrels = [];
  state.militaryObjects = [];
  state.gasCylinders = [];
  state.oilFirePatches = [];
  state.contaminatedObjects = [];
  state.hazards = [];
  state.items = [];
  state.supportTurrets = [];
  state.impacts = [];
  state.damageNumbers = [];
  state.collectionEffects = [];
  return state;
}

function makeProjectile(
  id: number,
  x: number,
  y: number,
  damage = 1,
  speed = 2_500,
) {
  return {
    id,
    x,
    y,
    directionX: 1,
    directionY: 0,
    radius: 4,
    damage,
    speed,
    remainingSeconds: 2,
    owner: 'player' as const,
  };
}

function runFrames(
  state: GameState,
  frameCount: number,
  prepareFrame?: (frame: number) => void,
): GamePerformanceSnapshot {
  const timings = createGamePerformanceTimings();
  const recorder = new GamePerformanceRecorder();
  for (let frame = 0; frame < frameCount; frame += 1) {
    prepareFrame?.(frame);
    resetGamePerformanceTimings(timings);
    const startedAt = performance.now();
    updateGameState(
      state,
      { movementX: 0, movementY: 0, aimAngle: 0 },
      0.05,
      timings,
    );
    timings.updateMs = performance.now() - startedAt;
    recorder.recordFrame(
      (frame + 1) * 16.67,
      16.67,
      timings,
      state,
      startedAt,
    );
  }
  return recorder.getSnapshot();
}

function recordScenario(
  name: string,
  snapshot: GamePerformanceSnapshot,
): void {
  scenarioReports[name] = {
    frames: snapshot.frameCount,
    frameTimeP95Ms: snapshot.frameTimeP95Ms,
    updateP95Ms: snapshot.timingStatisticsMs.updateMs.p95Ms,
    events: snapshot.eventTimings
      .filter((event) => event.sampleCount > 0)
      .map((event) => ({
        name: event.name,
        samples: event.sampleCount,
        totalMs: event.totalMs,
        p95Ms: event.p95Ms,
        maxMs: event.maxMs,
      })),
  };
}

describe('gameplay event performance scenarios', () => {
  afterAll(() => {
    console.info('GAMEPLAY_EVENT_SCENARIO_SUMMARY', JSON.stringify(scenarioReports));
  });

  it('measures continuous shooting against a dense enemy group', () => {
    const state = createScenarioState();
    state.zombies = Array.from({ length: 30 }, (_, index) =>
      createZombie(index + 1, 'walker', 320 + index * 3, 270),
    );
    const snapshot = runFrames(state, 40, (frame) => {
      state.projectiles = Array.from({ length: 6 }, (_, index) =>
        makeProjectile(frame * 6 + index + 10_000, 250, 270, 0.001, 1_500),
      );
    });

    recordScenario('continuous-dense-enemies', snapshot);
    expect(snapshot.eventTimings.find((event) => event.name === 'enemyCandidateScan')?.sampleCount)
      .toBeGreaterThanOrEqual(20);
    expect(snapshot.eventTimings.find((event) => event.name === 'projectileProcessing')?.sampleCount)
      .toBe(40);
  });

  it('measures multiple enemy hits in the same frame', () => {
    const state = createScenarioState();
    state.zombies = [createZombie(1, 'walker', 170, 270)];
    const snapshot = runFrames(state, 30, (frame) => {
      state.projectiles = Array.from({ length: 4 }, (_, index) =>
        makeProjectile(frame * 4 + index + 20_000, 90, 270, 0.01, 2_000),
      );
    });

    recordScenario('multiple-same-frame-hits', snapshot);
    expect(snapshot.eventCountTotals.hitEvents).toBe(120);
    expect(snapshot.eventCountTotals.enemyDamageEvents).toBe(120);
    expect(snapshot.eventTimings.find((event) => event.name === 'enemyDamage')?.sampleCount)
      .toBeGreaterThanOrEqual(20);
  });

  it('measures projectile damage and destruction of arena obstacles', () => {
    const state = createScenarioState();
    const snapshot = runFrames(state, 25, (frame) => {
      state.arenaObstacles = [{
        xFraction: 0.22,
        yFraction: 0.5,
        width: 30,
        height: 40,
        kind: 'barricade',
        health: 1,
      }];
      state.projectiles = [makeProjectile(frame + 30_000, 100, 270, 100, 2_500)];
    });

    recordScenario('destructible-arena-objects', snapshot);
    expect(snapshot.eventTimings.find((event) => event.name === 'arenaCandidateScan')?.sampleCount)
      .toBeGreaterThanOrEqual(20);
    expect(snapshot.eventCountTotals.arenaObjectDestructionEvents).toBe(25);
  });

  it('measures explosive barrel destruction and hazard creation', () => {
    const state = createScenarioState();
    state.arenaTheme = 'industrial';
    const snapshot = runFrames(state, 25, (frame) => {
      state.barrels = [{
        id: `test-barrel-${frame}`,
        xFraction: 0.3,
        yFraction: 0.5,
        radius: 18,
        health: 1,
        maxHealth: 1,
      }];
      state.projectiles = [makeProjectile(frame + 40_000, 100, 270, 100, 5_000)];
    });

    recordScenario('explosive-barrels', snapshot);
    expect(snapshot.eventCountTotals.explosionsCreated).toBeGreaterThan(0);
    expect(snapshot.eventCountTotals.hazardsCreated).toBeGreaterThan(0);
    expect(snapshot.eventTimings.find((event) => event.name === 'explosionHazardCreation')?.sampleCount)
      .toBeGreaterThanOrEqual(20);
  });

  it('measures Splitter deaths and offspring creation', () => {
    const state = createScenarioState();
    const snapshot = runFrames(state, 20, (frame) => {
      state.zombies = [createZombie(frame + 1, 'splitter', 260, 270)];
      state.projectiles = [
        makeProjectile(frame + 50_000, 100, 270, 1_000, 4_000),
      ];
    });

    recordScenario('splitter-offspring', snapshot);
    expect(snapshot.eventCountTotals.enemyDeathEvents).toBe(20);
    expect(snapshot.eventCountTotals.splitterOffspringCreated).toBe(80);
    expect(snapshot.eventTimings.find((event) => event.name === 'splitterOffspringCreation')?.sampleCount)
      .toBe(20);
  });

  it('measures combat with hazards, turrets, effects, and impacts', () => {
    const state = createScenarioState();
    state.zombies = Array.from({ length: 8 }, (_, index) =>
      createZombie(index + 1, 'walker', 260 + index * 8, 270),
    );
    state.hazards = [{
      id: 1,
      x: 290,
      y: 270,
      radius: 90,
      damage: 1,
      durationSeconds: 10,
      remainingSeconds: 10,
      kind: 'pulse',
    }];
    state.supportTurrets = [{
      id: 1,
      x: 180,
      y: 270,
      aimAngle: 0,
      durationSeconds: 10,
      remainingSeconds: 10,
      attackCooldownSeconds: 0,
    }];
    state.activeEffects = [{
      type: 'damage',
      durationSeconds: 10,
      remainingSeconds: 10,
    }];
    const snapshot = runFrames(state, 30, (frame) => {
      state.projectiles = [makeProjectile(frame + 60_000, 200, 270, 0.01, 1_500)];
    });

    recordScenario('hazards-turrets-effects', snapshot);
    expect(snapshot.counts.hazards).toBe(1);
    expect(snapshot.counts.activeEffects).toBeGreaterThan(0);
    expect(snapshot.eventTimings.find((event) => event.name === 'enemyDamage')?.sampleCount)
      .toBeGreaterThan(0);
  });

  it('measures orb generation and collection during combat', () => {
    const state = createScenarioState();
    state.zombiesKilled = 1;
    state.player.health = 50;
    state.zombies = [createZombie(1, 'walker', 145, 270)];
    let collected = false;
    const snapshot = runFrames(state, 3, (frame) => {
      if (frame === 0) {
        state.projectiles = [makeProjectile(70_000, 90, 270, 1_000, 2_000)];
      } else {
        state.projectiles = [];
        if (!collected && state.items[0]) {
          state.player.x = state.items[0].x;
          state.player.y = state.items[0].y;
          collected = true;
        }
      }
    });

    recordScenario('orb-generation-collection', snapshot);
    expect(snapshot.eventCountTotals.orbsGenerated).toBe(1);
    expect(snapshot.eventCountTotals.orbsCollected).toBe(1);
    expect(snapshot.eventTimings.find((event) => event.name === 'orbGeneration')?.sampleCount)
      .toBe(1);
    expect(snapshot.eventTimings.find((event) => event.name === 'orbCollection')?.sampleCount)
      .toBe(1);
  });
});
