import { describe, expect, it } from 'vitest';
import {
  circleOverlapsRectangle,
  findNextPathWaypointInArena,
  getArenaObstacles,
  segmentIntersectsRectangle,
} from '@/game/core/ArenaGeometry';
import {
  createGameState,
  createGameStateSnapshot,
  createZombie,
  resizeGameState,
} from '@/game/core/GameState';
import {
  CONTAMINATED_OBJECT_CONFIG,
  MILITARY_OBJECT_CONFIG,
} from '@/game/core/GameConfig';
import { updateGameState } from '@/game/core/GameSimulation';

describe('game simulation', () => {
  function suppressWaveSpawns(
    state: ReturnType<typeof createGameState>,
  ): void {
    state.wave.spawnCooldownSeconds = 10_000;
  }

  function getMilitaryTurret(state: ReturnType<typeof createGameState>) {
    const turret = state.militaryObjects.find(
      (object) => object.kind === 'abandoned-turret',
    );
    if (!turret || turret.kind !== 'abandoned-turret') {
      throw new Error('Military arena must contain an abandoned turret.');
    }
    return turret;
  }

  it('destroys a toxic barrel once and spawns a single fading puddle', () => {
    const state = createGameState();
    suppressWaveSpawns(state);
    state.arenaTheme = 'contaminated';
    state.militaryObjects = [];
    state.player.x = 180;
    state.player.y = 160;
    state.player.fireCooldownSeconds = 10_000;
    state.projectiles = [];

    const barrel: any = {
      id: 'test-toxic-barrel',
      kind: 'toxic-barrel',
      x: 280,
      y: 220,
      width: 30,
      height: 42,
      rotation: 0,
      health: 100,
      maxHealth: 100,
      destroyed: false,
      ruptureRemainingSeconds: 0,
      ruptureDurationSeconds: 0.6,
    };
    state.contaminatedObjects = [barrel];
    state.projectiles.push({
      id: 505,
      x: barrel.x,
      y: barrel.y - 90,
      directionX: 0,
      directionY: 1,
      radius: 4,
      damage: 999,
      speed: 500,
      remainingSeconds: 2,
      owner: 'player',
    });

    updateGameState(state, { movementX: 0, movementY: 0, aimAngle: 0 }, 1);

    expect(barrel.destroyed).toBe(true);
    expect(barrel.puddleId).toBeDefined();
    const puddles = state.contaminatedObjects.filter(
      (entity) => entity.kind === 'contaminated-puddle',
    );
    expect(puddles).toHaveLength(1);
    expect(puddles[0]).toMatchObject({
      x: barrel.x,
      y: barrel.y,
      damage: CONTAMINATED_OBJECT_CONFIG.toxicBarrel.puddleDamage,
      slowMultiplier: CONTAMINATED_OBJECT_CONFIG.toxicBarrel.zombieSlowMultiplier,
    });

    updateGameState(
      state,
      { movementX: 0, movementY: 0, aimAngle: 0 },
      CONTAMINATED_OBJECT_CONFIG.toxicBarrel.puddleDurationSeconds + 1,
    );

    expect(state.contaminatedObjects.filter(
      (entity) => entity.kind === 'contaminated-puddle',
    )).toHaveLength(0);
  });

  it('keeps turret barbed wire harmless to players while damaging zombies', () => {
    const state = createGameState();
    suppressWaveSpawns(state);
    const turret = getMilitaryTurret(state);
    const wireX = state.arenaWidth * turret.xFraction +
      turret.width / 2 + MILITARY_OBJECT_CONFIG.abandonedTurret.wireOffset;
    const wireY = state.arenaHeight * turret.yFraction;
    state.player.x = wireX;
    state.player.y = wireY;
    state.player.fireCooldownSeconds = 10_000;
    const zombie = createZombie(10, 'walker', wireX, wireY);
    const playerHealth = state.player.health;

    updateGameState(state, { movementX: 0, movementY: 0, aimAngle: 0 }, 0);
    expect(state.player.health).toBe(playerHealth);

    state.player.x = state.arenaWidth / 2;
    state.player.y = state.arenaHeight / 2;
    state.zombies = [zombie];
    const zombieHealth = zombie.health;

    updateGameState(state, { movementX: 0, movementY: 0, aimAngle: 0 }, 0);

    expect(zombie.health).toBeLessThan(zombieHealth);
  });

  it('does not let player projectiles damage the abandoned turret', () => {
    const state = createGameState();
    suppressWaveSpawns(state);
    const turret = getMilitaryTurret(state);
    state.militaryObjects = [turret];
    const turretX = state.arenaWidth * turret.xFraction;
    const turretY = state.arenaHeight * turret.yFraction;
    turret.state = 'active';
    state.player.fireCooldownSeconds = 10_000;
    state.projectiles.push({
      id: 20,
      x: turretX - 60,
      y: turretY,
      directionX: 1,
      directionY: 0,
      radius: 4,
      damage: 100,
      speed: 1_200,
      remainingSeconds: 1,
      owner: 'player',
    });

    updateGameState(state, { movementX: 0, movementY: 0, aimAngle: 0 }, 0.1);

    expect(turret.health).toBe(turret.maxHealth);
    expect(turret.state).toBe('active');
  });

  it('damages only the nearest zombie along a projectile segment', () => {
    const state = createGameState();
    suppressWaveSpawns(state);
    state.player.x = 80;
    state.player.y = 200;
    state.player.fireCooldownSeconds = 10_000;
    state.arenaObstacles = [];
    state.barrels = [];
    state.militaryObjects = [];
    state.contaminatedObjects = [];
    const fartherZombie = createZombie(12, 'walker', 180, 200);
    const nearerZombie = createZombie(11, 'walker', 150, 200);
    state.zombies = [fartherZombie, nearerZombie];
    const fartherHealth = fartherZombie.health;
    const nearerHealth = nearerZombie.health;
    state.projectiles = [{
      id: 21,
      x: 100,
      y: 200,
      directionX: 1,
      directionY: 0,
      radius: 4,
      damage: 25,
      speed: 1_000,
      remainingSeconds: 1,
      owner: 'player',
    }];

    updateGameState(state, { movementX: 0, movementY: 0, aimAngle: 0 }, 0.1);

    expect(nearerZombie.health).toBeLessThan(nearerHealth);
    expect(fartherZombie.health).toBe(fartherHealth);
  });

  it('damages the first of equally near arena obstacles', () => {
    const state = createGameState();
    suppressWaveSpawns(state);
    state.player.x = 80;
    state.player.y = 200;
    state.player.fireCooldownSeconds = 10_000;
    state.zombies = [];
    state.barrels = [];
    state.militaryObjects = [];
    state.contaminatedObjects = [];
    state.arenaObstacles = [
      {
        xFraction: 0.15,
        yFraction: 200 / state.arenaHeight,
        width: 24,
        height: 40,
        kind: 'barricade',
        health: 100,
      },
      {
        xFraction: 0.15,
        yFraction: 200 / state.arenaHeight,
        width: 24,
        height: 40,
        kind: 'barricade',
        health: 100,
      },
      {
        xFraction: 0.19,
        yFraction: 200 / state.arenaHeight,
        width: 24,
        height: 40,
        kind: 'barricade',
        health: 100,
      },
    ];
    state.projectiles = [{
      id: 22,
      x: 100,
      y: 200,
      directionX: 1,
      directionY: 0,
      radius: 4,
      damage: 25,
      speed: 1_000,
      remainingSeconds: 1,
      owner: 'player',
    }];

    updateGameState(state, { movementX: 0, movementY: 0, aimAngle: 0 }, 0.1);

    expect(state.arenaObstacles.map((obstacle) => obstacle.health))
      .toEqual([75, 100, 100]);
  });

  it('activates the turret in four seconds and rebuilds it after enemy destruction in six', () => {
    const state = createGameState();
    suppressWaveSpawns(state);
    const turret = getMilitaryTurret(state);
    const turretX = state.arenaWidth * turret.xFraction;
    const turretY = state.arenaHeight * turret.yFraction;
    state.player.x = turretX + turret.width / 2 + 26;
    state.player.y = turretY;
    state.player.fireCooldownSeconds = 10_000;

    updateGameState(state, { movementX: 0, movementY: 0, aimAngle: 0 }, 3.99);
    expect(turret.state).toBe('reviving');
    updateGameState(state, { movementX: 0, movementY: 0, aimAngle: 0 }, 0.01);
    expect(turret.state).toBe('active');

    turret.health = 1;
    const zombie = createZombie(
      11,
      'walker',
      turretX + turret.width / 2 + 15,
      turretY,
    );
    zombie.targetMilitaryTurretId = turret.id;
    zombie.militaryTurretTargetChecked = true;
    state.zombies = [zombie];
    updateGameState(state, { movementX: 0, movementY: 0, aimAngle: 0 }, 0);
    expect(turret.state).toBe('destroyed');
    state.zombies = [];

    updateGameState(state, { movementX: 0, movementY: 0, aimAngle: 0 }, 5.99);
    expect(turret.state).toBe('reviving');
    expect(turret.health).toBe(0);
    updateGameState(state, { movementX: 0, movementY: 0, aimAngle: 0 }, 0.01);
    expect(turret.state).toBe('active');
    expect(turret.health).toBe(turret.maxHealth);
  });

  it('creates typed player and walker/runner entities with independent snapshots', () => {
    const state = createGameState();
    const snapshot = createGameStateSnapshot(state);

    expect(snapshot.player).toMatchObject({
      x: state.player.x,
      y: state.player.y,
      health: 100,
      alive: true,
    });
    expect(getArenaObstacles(state.arenaWidth, state.arenaHeight, state.arenaObstacles)
      .some((obstacle) =>
        circleOverlapsRectangle(state.player, state.player.radius, obstacle),
      )).toBe(false);
    expect(snapshot.player.movementSpeed).toBe(state.player.movementSpeed);
    expect(snapshot.wave).toMatchObject({
      currentWave: 1,
      phase: 'combat',
      enemyBudget: state.wave.enemyBudget,
      enemiesSpawned: 0,
    });
    expect(snapshot.zombies).toHaveLength(0);

    state.player.health = 75;
    expect(snapshot.player.health).toBe(100);
  });

  it('updates ordinary Screamer summons during gameplay', () => {
    const state = createGameState();
    suppressWaveSpawns(state);
    const screamer = createZombie(10, 'screamer', 200, 200, 13);
    state.zombies = [screamer];

    updateGameState(state, { movementX: 0, movementY: 0, aimAngle: 0 }, 0);

    expect(state.zombies.some(
      (zombie) => zombie.screamerSummonedBy === screamer.id,
    )).toBe(true);
  });

  it('constrains player movement to arena bounds and slides against obstacles', () => {
    const state = createGameState();
    suppressWaveSpawns(state);
    state.militaryObjects = [];
    state.player.x = 340;
    state.player.y = 180;

    updateGameState(
      state,
      { movementX: -1, movementY: 0, aimAngle: 0 },
      0.05,
    );
    expect(state.player.x).toBeLessThan(340);
    expect(
      circleOverlapsRectangle(
        state.player,
        state.player.radius,
        getArenaObstacles(state.arenaWidth, state.arenaHeight)[0]!,
      ),
    ).toBe(false);

    state.player.x = 480;
    state.player.y = 270;
    for (let frame = 0; frame < 5; frame += 1) {
      updateGameState(
        state,
        { movementX: -1, movementY: 0, aimAngle: 0 },
        1,
      );
    }
    expect(state.player.x).toBeLessThan(480);
    expect(state.player.x).toBeGreaterThan(0);
    expect(getArenaObstacles(state.arenaWidth, state.arenaHeight).some(
      (obstacle) =>
        circleOverlapsRectangle(state.player, state.player.radius, obstacle),
    )).toBe(false);
  });

  it('repeats the runner dash after six seconds and dashes for two seconds at double speed', () => {
    const state = createGameState();
    suppressWaveSpawns(state);
    state.militaryObjects = [];
    state.player.x = 100;
    state.player.y = 60;
    state.player.fireCooldownSeconds = 1_000;
    const runner = createZombie(10, 'runner', 350, 60);
    state.zombies = [runner];

    const advanceRunner = (): number => {
      runner.x = 350;
      runner.y = 60;
      updateGameState(
        state,
        { movementX: 0, movementY: 0, aimAngle: 0 },
        0.25,
      );
      return 350 - runner.x;
    };

    for (let frame = 0; frame < 23; frame += 1) advanceRunner();
    expect(advanceRunner()).toBeCloseTo(runner.movementSpeed * 2 * 0.25);

    for (let frame = 0; frame < 7; frame += 1) advanceRunner();
    expect(advanceRunner()).toBeCloseTo(runner.movementSpeed * 0.25);

    for (let frame = 0; frame < 23; frame += 1) advanceRunner();
    expect(advanceRunner()).toBeCloseTo(runner.movementSpeed * 2 * 0.25);
  });

  it('dodges incoming player shots at double speed and recovers from half speed', () => {
    const state = createGameState();
    suppressWaveSpawns(state);
    state.militaryObjects = [];
    state.player.x = 80;
    state.player.y = 270;
    state.player.fireCooldownSeconds = 1_000;
    const swarm = createZombie(10, 'swarm', 300, 270);
    state.zombies = [swarm];
    state.projectiles.push({
      id: 20,
      x: 200,
      y: 270,
      directionX: 1,
      directionY: 0,
      radius: 4,
      damage: 1,
      speed: 560,
      remainingSeconds: 1,
      owner: 'player',
    });

    const startX = swarm.x;
    const startY = swarm.y;
    updateGameState(
      state,
      { movementX: 0, movementY: 0, aimAngle: 0 },
      0.1,
    );

    expect(swarm.movementSpeed).toBeGreaterThan(
      createZombie(11, 'runner', 0, 0).movementSpeed,
    );
    expect(Math.hypot(swarm.x - startX, swarm.y - startY)).toBeCloseTo(
      swarm.movementSpeed * 2 * 0.1,
    );
    expect(Math.abs(swarm.y - startY)).toBeGreaterThan(0);
    expect(swarm.swarmLastDodgedProjectileId).toBe(20);
    expect(swarm.swarmDodgeCooldownSeconds).toBe(3);

    state.projectiles.push({
      id: 21,
      x: swarm.x - 100,
      y: swarm.y,
      directionX: 1,
      directionY: 0,
      radius: 4,
      damage: 1,
      speed: 560,
      remainingSeconds: 1,
      owner: 'player',
    });
    for (let frame = 0; frame < 5; frame += 1) {
      updateGameState(
        state,
        { movementX: 0, movementY: 0, aimAngle: 0 },
        0.05,
      );
    }
    expect(swarm.swarmDodgeRemainingSeconds).toBe(0);
    expect(swarm.swarmRecoveryRemainingSeconds).toBe(2);
    expect(swarm.swarmLastDodgedProjectileId).toBe(20);
    expect(swarm.swarmDodgeCooldownSeconds).toBeGreaterThan(0);

    const recoveryState = createGameState();
    suppressWaveSpawns(recoveryState);
    recoveryState.militaryObjects = [];
    recoveryState.player.x = 100;
    recoveryState.player.y = 80;
    recoveryState.player.fireCooldownSeconds = 1_000;
    const recoveringSwarm = createZombie(12, 'swarm', 400, 80);
    recoveringSwarm.swarmRecoveryRemainingSeconds = 2;
    recoveryState.zombies = [recoveringSwarm];

    const recoveryStartX = recoveringSwarm.x;
    updateGameState(
      recoveryState,
      { movementX: 0, movementY: 0, aimAngle: 0 },
      0.1,
    );
    expect(recoveryStartX - recoveringSwarm.x).toBeCloseTo(
      recoveringSwarm.movementSpeed * 0.5 * 0.1,
    );

    for (let frame = 0; frame < 9; frame += 1) {
      updateGameState(
        recoveryState,
        { movementX: 0, movementY: 0, aimAngle: 0 },
        0.1,
      );
    }
    const halfRecoveryX = recoveringSwarm.x;
    updateGameState(
      recoveryState,
      { movementX: 0, movementY: 0, aimAngle: 0 },
      0.1,
    );
    expect(halfRecoveryX - recoveringSwarm.x).toBeCloseTo(
      recoveringSwarm.movementSpeed * 0.75 * 0.1,
    );

    for (let frame = 0; frame < 9; frame += 1) {
      updateGameState(
        recoveryState,
        { movementX: 0, movementY: 0, aimAngle: 0 },
        0.1,
      );
    }
    const fullSpeedX = recoveringSwarm.x;
    updateGameState(
      recoveryState,
      { movementX: 0, movementY: 0, aimAngle: 0 },
      0.1,
    );
    expect(fullSpeedX - recoveringSwarm.x).toBeCloseTo(
      recoveringSwarm.movementSpeed * 0.1,
    );
  });

  it('keeps actors out of obstacles after an arena resize', () => {
    const state = createGameState();
    state.player.x = 280;
    state.player.y = 200;
    resizeGameState(state, 800, 540);

    expect(
      getArenaObstacles(
        state.arenaWidth,
        state.arenaHeight,
        state.arenaObstacles,
      ).some((obstacle) =>
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
    state.arenaObstacles = [];
    state.barrels = [];
    state.militaryObjects = [];
    state.contaminatedObjects = [];
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
    expect(state.projectiles[0].remainingSeconds).toBeCloseTo(1.05);

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
      0.15,
    );
    updateGameState(
      state,
      { movementX: 0, movementY: 0, aimAngle: 0 },
      0.2,
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
    expect(state.player.x).toBeGreaterThan(playerX);
    expect(
      circleOverlapsRectangle(
        state.player,
        state.player.radius,
        getArenaObstacles(
          state.arenaWidth,
          state.arenaHeight,
          state.arenaObstacles,
        )[5]!,
      ),
    ).toBe(false);
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
    blockedState.arenaObstacles = [{
      xFraction: 230 / blockedState.arenaWidth,
      yFraction: 180 / blockedState.arenaHeight,
      width: 100,
      height: 50,
      kind: 'crate',
      health: 100,
    }];
    blockedState.barrels = [];
    blockedState.militaryObjects = [];
    blockedState.contaminatedObjects = [];
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

  it('deals 50 contact damage when a brute attacks', () => {
    const state = createGameState();
    suppressWaveSpawns(state);
    state.zombies = [
      createZombie(10, 'brute', state.player.x + 30, state.player.y),
    ];

    updateGameState(
      state,
      { movementX: 0, movementY: 0, aimAngle: 0 },
      0,
    );

    expect(state.player.health).toBe(50);
  });

  it('keeps spitters at range behind cover instead of pursuing the player', () => {
    const state = createGameState();
    suppressWaveSpawns(state);
    state.arenaObstacles = [{
      xFraction: 0.5,
      yFraction: 0.5,
      width: 50,
      height: 70,
      kind: 'wall',
    }];
    state.barrels = [];
    state.player.x = 300;
    state.player.y = 270;
    state.player.fireCooldownSeconds = 1_000;
    const spitter = createZombie(10, 'spitter', 600, 270);
    spitter.attackCooldownSeconds = 1_000;
    state.zombies = [spitter];

    for (let frame = 0; frame < 100; frame += 1) {
      updateGameState(
        state,
        { movementX: 0, movementY: 0, aimAngle: 0 },
        0.05,
      );
    }

    expect(Math.hypot(spitter.x - state.player.x, spitter.y - state.player.y))
      .toBeGreaterThanOrEqual(180);
    expect(Math.hypot(spitter.x - state.player.x, spitter.y - state.player.y))
      .toBeLessThanOrEqual(260);
    expect(
      segmentIntersectsRectangle(
        state.player,
        spitter,
        getArenaObstacles(state.arenaWidth, state.arenaHeight, state.arenaObstacles)[0],
      ),
    ).toBe(true);
  });

  it('fires spit every five seconds through cover and poisons a hit player', () => {
    const state = createGameState();
    suppressWaveSpawns(state);
    state.militaryObjects = [];
    state.arenaTheme = 'industrial';
    state.arenaObstacles = [{
      xFraction: 0.5,
      yFraction: 0.5,
      width: 45,
      height: 80,
      kind: 'wall',
    }];
    state.barrels = [];
    state.player.x = 300;
    state.player.y = 270;
    state.player.aimAngle = Math.PI;
    state.player.fireCooldownSeconds = 1_000;
    const spitter = createZombie(10, 'spitter', 600, 270);
    state.zombies = [spitter];

    updateGameState(
      state,
      { movementX: 0, movementY: 0, aimAngle: Math.PI },
      0,
    );
    expect(state.projectiles[0]).toMatchObject({
      owner: 'enemy',
      kind: 'spitter',
      directionX: -1,
      directionY: 0,
    });
    expect(spitter.attackCooldownSeconds).toBe(5);

    updateGameState(
      state,
      { movementX: 0, movementY: 0, aimAngle: Math.PI },
      1.5,
    );
    expect(state.player.health).toBe(92);
    expect(state.player.spitterPoisonRemainingSeconds).toBe(5);

    updateGameState(
      state,
      { movementX: 0, movementY: 0, aimAngle: Math.PI },
      3.4,
    );
    expect(state.projectiles.filter((projectile) => projectile.kind === 'spitter'))
      .toHaveLength(0);
    updateGameState(
      state,
      { movementX: 0, movementY: 0, aimAngle: Math.PI },
      0.2,
    );
    expect(state.projectiles.some((projectile) => projectile.kind === 'spitter'))
      .toBe(true);

    spitter.attackCooldownSeconds = 1_000;
    state.projectiles = [];
    updateGameState(
      state,
      { movementX: 0, movementY: 0, aimAngle: Math.PI },
      1.4,
    );

    expect(state.player.health).toBeCloseTo(84);
    expect(state.player.spitterPoisonRemainingSeconds).toBe(0);
    expect(state.statistics.totalDamageReceived).toBeCloseTo(16);
  });

  it('prevents protected players from receiving projectile or contact damage effects', () => {
    const state = createGameState();
    suppressWaveSpawns(state);
    state.arenaTheme = 'industrial';
    state.player.spawnProtectionSeconds = 1;
    state.player.fireCooldownSeconds = 1_000;
    const zombie = createZombie(
      11,
      'walker',
      state.player.x,
      state.player.y,
    );
    state.zombies = [zombie];
    state.projectiles = [{
      id: 12,
      x: state.player.x + 40,
      y: state.player.y,
      directionX: -1,
      directionY: 0,
      radius: 5,
      damage: 10,
      speed: 600,
      remainingSeconds: 1,
      owner: 'enemy',
      kind: 'spitter',
    }];

    updateGameState(
      state,
      { movementX: 0, movementY: 0, aimAngle: 0 },
      0.1,
    );

    expect(state.player.health).toBe(100);
    expect(state.player.spitterPoisonRemainingSeconds).toBe(0);
    expect(state.player.damageCooldownSeconds).toBe(0);
    expect(state.player.hitFlashSeconds).toBe(0);
    expect(state.statistics.totalDamageReceived).toBe(0);
    expect(zombie.attackCooldownSeconds).toBe(0);
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

  it('keeps health orbs available while the player is at maximum health', () => {
    const state = createGameState();
    suppressWaveSpawns(state);
    state.player.health = state.player.maxHealth;
    state.items = [{
      id: 22,
      type: 'health',
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

    expect(state.player.health).toBe(state.player.maxHealth);
    expect(state.items).toHaveLength(1);
    expect(state.statistics.orbsCollected).toBe(0);
    expect(state.collectionEffects).toHaveLength(0);
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
    expect(state.player.fireCooldownSeconds).toBeCloseTo(0.25);
    expect(state.statistics.highestShotsPerSecond).toBe(4);

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

  it('stores bombs until requested, expires orbs, and tracks kill score', () => {
    const state = createGameState();
    suppressWaveSpawns(state);
    const nearby = createZombie(50, 'walker', state.player.x + 90, state.player.y);
    const distant = createZombie(51, 'runner', state.player.x + 240, state.player.y);
    const nearbyHealth = nearby.health;
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
    expect(state.bombs).toBe(1);
    expect(state.zombies.map((zombie) => zombie.id)).toEqual([50, 51]);
    expect(state.impacts.some((impact) => impact.kind === 'bomb')).toBe(false);

    updateGameState(
      state,
      { movementX: 0, movementY: 0, aimAngle: 0, useBomb: true },
      0,
    );
    expect(state.zombies.map((zombie) => zombie.id)).toEqual([51]);
    expect(state.bombs).toBe(0);
    expect(state.zombiesKilled).toBe(1);
    expect(state.statistics.walkerKills).toBe(1);
    expect(state.statistics.totalDamageDealt).toBe(nearbyHealth);
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

  it('caps bomb inventory at five and collects a waiting bomb after one is used', () => {
    const state = createGameState();
    suppressWaveSpawns(state);
    state.bombs = 5;
    state.items = [{
      id: 54,
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
    expect(state.bombs).toBe(5);
    expect(state.items).toHaveLength(1);

    updateGameState(
      state,
      { movementX: 0, movementY: 0, aimAngle: 0, useBomb: true },
      0,
    );
    expect(state.bombs).toBe(5);
    expect(state.items).toHaveLength(0);
    expect(state.impacts.some((impact) => impact.kind === 'bomb')).toBe(true);
  });

  it('drops deterministic collectible orbs and records weighted kill score', () => {
    const state = createGameState();
    suppressWaveSpawns(state);
    state.player.x = 100;
    state.player.y = 270;
    state.arenaObstacles = [];
    state.barrels = [];
    state.militaryObjects = [];
    state.contaminatedObjects = [];
    state.player.fireCooldownSeconds = 1_000;
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

  it('keeps combat and timed effects running during a wave notification', () => {
    const state = createGameState();
    const zombie = createZombie(70, 'walker', 100, 100);
    state.zombies = [zombie];
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

    expect({ x: zombie.x, y: zombie.y }).not.toEqual(before);
    expect(state.player.x).toBeGreaterThan(480);
    expect(state.activeEffects[0].remainingSeconds).toBeLessThan(4);
    expect(state.statistics.survivalSeconds).toBeGreaterThan(12);
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

  it('replays a fixed movement vector sequence frame by frame (determinism proxy)', () => {
    const replay = () => {
      const state = createGameState(960, 540);
      state.player.x = 480;
      state.player.y = 270;
      state.zombies = [];
      state.items = [];
      state.wave.spawnCooldownSeconds = 10_000;
      const vectors = [
        { movementX: 1, movementY: 0 },
        { movementX: 0, movementY: 1 },
        {
          movementX: -Math.SQRT1_2,
          movementY: -Math.SQRT1_2,
        },
        { movementX: 0, movementY: 0 },
      ];

      return vectors.map((vector) => {
        updateGameState(
          state,
          { ...vector, aimAngle: 0 },
          1 / 60,
        );
        return { x: state.player.x, y: state.player.y };
      });
    };

    expect(replay()).toEqual(replay());
  });
});
