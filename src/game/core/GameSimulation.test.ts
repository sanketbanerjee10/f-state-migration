import { describe, expect, it } from 'vitest';
import {
  circleOverlapsRectangle,
  findNextPathWaypointInArena,
  getArenaObstacles,
  segmentIntersectsRectangle,
} from './ArenaGeometry';
import {
  createGameState,
  createGameStateSnapshot,
  createZombie,
  resizeGameState,
} from './GameState';
import { updateGameState } from './GameSimulation';

describe('game simulation', () => {
  function suppressWaveSpawns(
    state: ReturnType<typeof createGameState>,
  ): void {
    state.wave.spawnCooldownSeconds = 10_000;
  }

  it('creates typed player and walker/runner entities with independent snapshots', () => {
    const state = createGameState();
    const snapshot = createGameStateSnapshot(state);

    expect(snapshot.player).toMatchObject({
      x: 480,
      y: 270,
      health: 100,
      alive: true,
    });
    expect(snapshot.wave).toMatchObject({
      currentWave: 1,
      phase: 'combat',
      enemyBudget: 4,
      enemiesSpawned: 0,
    });
    expect(snapshot.zombies).toHaveLength(0);

    state.player.health = 75;
    expect(snapshot.player.health).toBe(100);
  });

  it('constrains player movement to arena bounds and slides against obstacles', () => {
    const state = createGameState();
    suppressWaveSpawns(state);
    state.player.x = 280;
    state.player.y = 180;

    updateGameState(
      state,
      { movementX: -1, movementY: 0, aimAngle: 0 },
      0.05,
    );
    expect(state.player.x).toBe(280);

    state.player.x = 480;
    state.player.y = 270;
    for (let frame = 0; frame < 5; frame += 1) {
      updateGameState(
        state,
        { movementX: -1, movementY: 0, aimAngle: 0 },
        1,
      );
    }
    expect(state.player.x).toBe(18);
  });

  it('keeps actors out of obstacles after an arena resize', () => {
    const state = createGameState();
    state.player.x = 280;
    state.player.y = 200;
    resizeGameState(state, 800, 540);

    expect(
      getArenaObstacles(state.arenaWidth, state.arenaHeight).some((obstacle) =>
        circleOverlapsRectangle(state.player, state.player.radius, obstacle),
      ),
    ).toBe(false);
  });

  it('routes zombies around obstacles instead of leaving them pressed against a crate', () => {
    const state = createGameState();
    suppressWaveSpawns(state);
    state.player.x = 340;
    state.player.y = 184;
    state.player.fireCooldownSeconds = 1_000;
    const zombie = createZombie(10, 'walker', 180, 184);
    state.zombies = [zombie];

    const obstacle = getArenaObstacles(state.arenaWidth, state.arenaHeight)[0];
    const waypoint = findNextPathWaypointInArena(
      zombie,
      state.player,
      zombie.radius,
      state.arenaWidth,
      state.arenaHeight,
    );
    expect(waypoint).not.toEqual(state.player);

    for (let frame = 0; frame < 200; frame += 1) {
      updateGameState(
        state,
        { movementX: 0, movementY: 0, aimAngle: Math.PI },
        0.05,
      );
    }

    expect(
      zombie.x > obstacle.x + obstacle.width + zombie.radius ||
      zombie.y < obstacle.y - zombie.radius ||
      zombie.y > obstacle.y + obstacle.height + zombie.radius,
    ).toBe(true);
    expect(
      getArenaObstacles(state.arenaWidth, state.arenaHeight).some((bounds) =>
        circleOverlapsRectangle(zombie, zombie.radius, bounds),
      ),
    ).toBe(false);
  });

  it('fires in the selected direction and damages then defeats a pursuing zombie', () => {
    const state = createGameState();
    suppressWaveSpawns(state);
    const zombie = createZombie(10, 'walker', 220, 270);
    state.zombies = [zombie];
    state.player.x = 100;
    state.player.y = 270;

    updateGameState(
      state,
      { movementX: 0, movementY: 0, aimAngle: 0 },
      0,
    );
    expect(state.projectiles[0]).toMatchObject({
      directionX: 1,
      directionY: 0,
    });

    updateGameState(
      state,
      { movementX: 0, movementY: 0, aimAngle: 0 },
      0.2,
    );
    expect(state.zombies[0].health).toBe(25);
    expect(state.damageNumbers[0].amount).toBe(25);
    expect(state.impacts.at(-1)?.kind).toBe('hit');

    updateGameState(
      state,
      { movementX: 0, movementY: 0, aimAngle: 0 },
      0.05,
    );
    updateGameState(
      state,
      { movementX: 0, movementY: 0, aimAngle: 0 },
      0.1,
    );
    expect(state.zombies).toHaveLength(0);
    expect(state.zombiesKilled).toBe(1);
    expect(state.impacts.some((impact) => impact.critical)).toBe(true);
  });

  it('keeps automatic fire on the stored aim instead of tracking a nearby zombie', () => {
    const state = createGameState();
    suppressWaveSpawns(state);
    const playerX = state.player.x;
    const playerY = state.player.y;
    const nearbyZombie = createZombie(10, 'walker', playerX + 180, playerY);
    state.zombies = [nearbyZombie];
    const manualAimAngle = -Math.PI / 2;

    updateGameState(
      state,
      { movementX: 0, movementY: 0, aimAngle: manualAimAngle },
      0,
    );

    expect(state.player.aimAngle).toBe(manualAimAngle);
    expect(state.zombies[0].facingAngle).toBeCloseTo(Math.PI);
    expect(state.projectiles[0].directionX).toBeCloseTo(0);
    expect(state.projectiles[0].directionY).toBeCloseTo(-1);

    updateGameState(
      state,
      { movementX: 1, movementY: 0, aimAngle: manualAimAngle },
      0.25,
    );

    expect(state.player.aimAngle).toBe(manualAimAngle);
    const newestProjectile = state.projectiles[state.projectiles.length - 1];
    expect(newestProjectile.directionX).toBeCloseTo(0);
    expect(newestProjectile.directionY).toBeCloseTo(-1);
    expect(state.player.x).toBeGreaterThan(playerX);
  });

  it('blocks projectiles at obstacles and applies cooldown-limited contact damage', () => {
    const firstCrate = getArenaObstacles(960, 540)[0];
    expect(
      segmentIntersectsRectangle(
        { x: 124, y: 180 },
        { x: 236, y: 180 },
        firstCrate,
        4,
      ),
    ).toBe(true);

    const blockedState = createGameState();
    suppressWaveSpawns(blockedState);
    blockedState.player.x = 100;
    blockedState.player.y = 180;
    updateGameState(
      blockedState,
      { movementX: 0, movementY: 0, aimAngle: 0 },
      0,
    );
    updateGameState(
      blockedState,
      { movementX: 0, movementY: 0, aimAngle: 0 },
      0.2,
    );
    expect(blockedState.projectiles).toHaveLength(0);
    expect(blockedState.impacts.length).toBeGreaterThan(0);

    const contactState = createGameState();
    suppressWaveSpawns(contactState);
    const zombie = createZombie(
      10,
      'walker',
      contactState.player.x + 30,
      contactState.player.y,
    );
    contactState.zombies = [zombie];
    updateGameState(
      contactState,
      { movementX: 0, movementY: 0, aimAngle: 0 },
      0,
    );
    expect(contactState.player.health).toBe(90);

    updateGameState(
      contactState,
      { movementX: 0, movementY: 0, aimAngle: 0 },
      0.2,
    );
    expect(contactState.player.health).toBe(90);
  });

  it('collects health orbs and refreshes duplicate temporary damage effects', () => {
    const state = createGameState();
    suppressWaveSpawns(state);
    state.player.health = 40;
    state.items = [
      {
        id: 20,
        type: 'health',
        x: state.player.x,
        y: state.player.y,
        radius: 16,
        durationSeconds: 12,
        remainingSeconds: 12,
      },
      {
        id: 21,
        type: 'damage',
        x: state.player.x,
        y: state.player.y,
        radius: 16,
        durationSeconds: 12,
        remainingSeconds: 12,
      },
    ];
    state.activeEffects = [
      { type: 'damage', durationSeconds: 10, remainingSeconds: 1 },
    ];
    state.player.fireCooldownSeconds = 1;

    updateGameState(
      state,
      { movementX: 0, movementY: 0, aimAngle: 0 },
      0.25,
    );

    expect(state.player.health).toBe(65);
    expect(state.items).toHaveLength(0);
    expect(state.activeEffects).toHaveLength(1);
    expect(state.activeEffects[0].remainingSeconds).toBe(10);
    expect(state.statistics.orbsCollected).toBe(2);
    expect(state.collectionEffects).toHaveLength(2);

    state.player.fireCooldownSeconds = 0;
    updateGameState(
      state,
      { movementX: 0, movementY: 0, aimAngle: 0 },
      0,
    );
    expect(state.projectiles.at(-1)?.damage).toBe(50);
  });

  it('applies rapid-fire and shield effects and expires their timers', () => {
    const state = createGameState();
    suppressWaveSpawns(state);
    state.items = [{
      id: 30,
      type: 'rapidFire',
      x: state.player.x,
      y: state.player.y,
      radius: 16,
      durationSeconds: 12,
      remainingSeconds: 12,
    }];
    state.player.fireCooldownSeconds = 1;
    updateGameState(
      state,
      { movementX: 0, movementY: 0, aimAngle: 0 },
      0,
    );
    state.player.fireCooldownSeconds = 0.04;
    updateGameState(
      state,
      { movementX: 0, movementY: 0, aimAngle: 0 },
      0.05,
    );
    expect(state.player.fireCooldownSeconds).toBeCloseTo(0.125);
    expect(state.statistics.highestShotsPerSecond).toBe(8);

    state.activeEffects = [{
      type: 'shield',
      durationSeconds: 12,
      remainingSeconds: 0.1,
      remainingShield: 60,
    }];
    state.player.shieldStrength = 1;
    updateGameState(
      state,
      { movementX: 0, movementY: 0, aimAngle: 0 },
      0.2,
    );
    expect(state.activeEffects).toHaveLength(0);
    expect(state.player.shieldStrength).toBe(0);
  });

  it('uses shield before health, tracks received damage, and ends a run at zero health', () => {
    const state = createGameState();
    suppressWaveSpawns(state);
    const zombie = createZombie(40, 'walker', state.player.x + 30, state.player.y);
    state.zombies = [zombie];
    state.activeEffects = [{
      type: 'shield',
      durationSeconds: 12,
      remainingSeconds: 12,
      remainingShield: 10,
    }];

    updateGameState(
      state,
      { movementX: 0, movementY: 0, aimAngle: 0 },
      0,
    );
    expect(state.player.health).toBe(100);
    expect(state.player.shieldStrength).toBe(0);
    expect(state.statistics.totalDamageReceived).toBe(10);

    state.activeEffects = [];
    state.player.health = 1;
    state.player.damageCooldownSeconds = 0;
    zombie.attackCooldownSeconds = 0;
    updateGameState(
      state,
      { movementX: 0, movementY: 0, aimAngle: 0 },
      0,
    );
    expect(state.player.health).toBe(0);
    expect(state.player.alive).toBe(false);
    expect(state.wave.phase).toBe('gameOver');
  });

  it('damages nearby enemies with bombs, expires uncollected orbs, and tracks kill score', () => {
    const state = createGameState();
    suppressWaveSpawns(state);
    const nearby = createZombie(50, 'walker', state.player.x + 90, state.player.y);
    const distant = createZombie(51, 'runner', state.player.x + 240, state.player.y);
    state.zombies = [nearby, distant];
    state.items = [{
      id: 52,
      type: 'bomb',
      x: state.player.x,
      y: state.player.y,
      radius: 16,
      durationSeconds: 12,
      remainingSeconds: 12,
    }];

    updateGameState(
      state,
      { movementX: 0, movementY: 0, aimAngle: 0 },
      0,
    );
    expect(state.zombies.map((zombie) => zombie.id)).toEqual([51]);
    expect(state.zombiesKilled).toBe(1);
    expect(state.statistics.walkerKills).toBe(1);
    expect(state.statistics.totalDamageDealt).toBe(50);
    expect(state.impacts.some((impact) => impact.kind === 'bomb')).toBe(true);

    state.items = [{
      id: 53,
      type: 'shield',
      x: 100,
      y: 100,
      radius: 16,
      durationSeconds: 0.1,
      remainingSeconds: 0.1,
    }];
    updateGameState(
      state,
      { movementX: 0, movementY: 0, aimAngle: 0 },
      0.2,
    );
    expect(state.items).toHaveLength(0);
    expect(state.impacts.some((impact) => impact.kind === 'orbExpiry')).toBe(true);
  });

  it('drops deterministic collectible orbs and records weighted kill score', () => {
    const state = createGameState();
    suppressWaveSpawns(state);
    state.player.x = 100;
    state.player.y = 270;
    state.zombies = [
      createZombie(60, 'walker', 130, 270),
      createZombie(61, 'walker', 130, 270),
    ];
    for (const id of [62, 63]) {
      state.projectiles.push({
        id,
        x: 124,
        y: 270,
        directionX: 1,
        directionY: 0,
        radius: 4,
        damage: 1,
        speed: 560,
        remainingSeconds: 1,
      });
    }

    state.zombies[0].health = 1;
    state.zombies[1].health = 1;
    updateGameState(
      state,
      { movementX: 0, movementY: 0, aimAngle: 0 },
      0,
    );

    expect(state.zombiesKilled).toBe(2);
    expect(state.statistics.walkerKills).toBe(2);
    expect(state.items).toHaveLength(1);
    expect(state.items[0].type).toBe('health');
    expect(state.items[0].remainingSeconds).toBe(12);
    expect(state.impacts.some((impact) => impact.kind === 'death')).toBe(true);
    expect(state.impacts.some((impact) => impact.kind === 'spawn')).toBe(true);
    expect(createGameStateSnapshot(state).score).toBe(200);
  });

  it('pauses combat and timed effects while an upgrade is pending', () => {
    const state = createGameState();
    const zombie = createZombie(70, 'walker', 100, 100);
    state.zombies = [zombie];
    state.wave.phase = 'upgrade';
    state.statistics.survivalSeconds = 12;
    state.activeEffects = [
      { type: 'damage', durationSeconds: 10, remainingSeconds: 4 },
    ];
    const before = { x: zombie.x, y: zombie.y };

    updateGameState(
      state,
      { movementX: 1, movementY: 0, aimAngle: 0 },
      2,
    );

    expect({ x: zombie.x, y: zombie.y }).toEqual(before);
    expect(state.player.x).toBe(480);
    expect(state.activeEffects[0].remainingSeconds).toBe(4);
    expect(state.statistics.survivalSeconds).toBe(12);
  });

  it('rejects invalid time and input values', () => {
    const state = createGameState();
    expect(() =>
      updateGameState(
        state,
        { movementX: 0, movementY: 0, aimAngle: 0 },
        Number.NaN,
      ),
    ).toThrow(RangeError);
    expect(() =>
      updateGameState(
        state,
        { movementX: Number.POSITIVE_INFINITY, movementY: 0, aimAngle: 0 },
        0.016,
      ),
    ).toThrow(RangeError);
  });
});
