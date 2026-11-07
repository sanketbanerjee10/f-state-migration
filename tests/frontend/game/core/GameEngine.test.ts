import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
vi.mock('@/game/rendering/Renderer', () => ({ renderGameScene: vi.fn() }));

import { GameEngine } from '@/game/core/GameEngine';

function createCanvas() {
  const context = {
    arc: vi.fn(),
    beginPath: vi.fn(),
    closePath: vi.fn(),
    fill: vi.fn(),
    fillRect: vi.fn(),
    fillText: vi.fn(),
    lineTo: vi.fn(),
    moveTo: vi.fn(),
    quadraticCurveTo: vi.fn(),
    restore: vi.fn(),
    save: vi.fn(),
    setTransform: vi.fn(),
    stroke: vi.fn(),
    strokeRect: vi.fn(),
  };
  const canvasTarget = new EventTarget();
  const canvas = Object.assign(canvasTarget, {
    width: 0,
    height: 0,
    getContext: vi.fn(() => context),
    getBoundingClientRect: vi.fn(() => ({
      left: 0,
      top: 0,
      width: 960,
      height: 540,
    }) as DOMRect),
  }) as unknown as HTMLCanvasElement;
  return { canvas, context };
}

function dispatchKey(
  target: EventTarget,
  type: 'keydown' | 'keyup',
  code: string,
): KeyboardEvent {
  const event = new Event(type, { cancelable: true }) as KeyboardEvent;
  Object.defineProperty(event, 'code', { value: code });
  target.dispatchEvent(event);
  return event;
}

function dispatchMouse(
  target: EventTarget,
  type: 'mousemove' | 'mousedown',
  clientX: number,
  clientY: number,
): void {
  const event = new Event(type) as MouseEvent;
  Object.defineProperties(event, {
    clientX: { value: clientX },
    clientY: { value: clientY },
  });
  target.dispatchEvent(event);
}

function dispatchMouseAtWorldPosition(
  canvas: HTMLCanvasElement,
  engine: GameEngine,
  x: number,
  y: number,
): void {
  const state = engine.getGameState();
  if (!state) throw new Error('Game state must exist before aiming.');
  const bounds = canvas.getBoundingClientRect();
  dispatchMouse(
    canvas,
    'mousemove',
    bounds.left + (x / state.arenaWidth) * bounds.width,
    bounds.top + (y / state.arenaHeight) * bounds.height,
  );
}

function createJoystickTarget(left = 0): HTMLElement {
  const target = new EventTarget();
  const capturedPointers = new Set<number>();
  return Object.assign(target, {
    style: { setProperty: vi.fn() },
    getBoundingClientRect: vi.fn(
      () =>
        ({
          left,
          top: 0,
          width: 100,
          height: 100,
        }) as DOMRect,
    ),
    setPointerCapture: vi.fn((pointerId: number) =>
      capturedPointers.add(pointerId),
    ),
    hasPointerCapture: vi.fn((pointerId: number) =>
      capturedPointers.has(pointerId),
    ),
    releasePointerCapture: vi.fn((pointerId: number) =>
      capturedPointers.delete(pointerId),
    ),
  }) as unknown as HTMLElement;
}

function dispatchPointer(
  target: EventTarget,
  type: 'pointerdown' | 'pointermove' | 'pointerup' | 'pointercancel',
  pointerId: number,
  clientX: number,
  clientY: number,
): PointerEvent {
  const event = new Event(type, { cancelable: true }) as PointerEvent;
  Object.defineProperties(event, {
    pointerId: { value: pointerId },
    clientX: { value: clientX },
    clientY: { value: clientY },
  });
  target.dispatchEvent(event);
  return event;
}

describe('GameEngine', () => {
  let nextFrameId: number;
  let callbacks: Map<number, FrameRequestCallback>;
  let hidden: boolean;
  let documentListeners: Map<string, EventListener>;
  let windowListeners: Map<string, EventListener>;

  beforeEach(() => {
    nextFrameId = 0;
    callbacks = new Map();
    hidden = false;
    documentListeners = new Map();
    windowListeners = new Map();

    vi.stubGlobal('window', {
      addEventListener: vi.fn((type: string, listener: EventListener) => {
        windowListeners.set(type, listener);
      }),
      removeEventListener: vi.fn((type: string) => {
        windowListeners.delete(type);
      }),
      requestAnimationFrame: vi.fn((callback: FrameRequestCallback) => {
        const id = ++nextFrameId;
        callbacks.set(id, callback);
        return id;
      }),
      cancelAnimationFrame: vi.fn((id: number) => callbacks.delete(id)),
    });
    vi.stubGlobal('document', {
      get hidden() {
        return hidden;
      },
      addEventListener: vi.fn((type: string, listener: EventListener) => {
        documentListeners.set(type, listener);
      }),
      removeEventListener: vi.fn((type: string) => {
        documentListeners.delete(type);
      }),
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('creates a high-DPI canvas while preserving the logical arena aspect ratio', () => {
    const { canvas, context } = createCanvas();
    const engine = new GameEngine(canvas);

    engine.initialize();
    engine.resize(960, 540, 3);

    expect(canvas.width).toBe(1920);
    expect(canvas.height).toBe(1080);
    const state = engine.getGameState();
    if (!state) throw new Error('Game state must exist after resize.');
    const scaleX = canvas.width / state.arenaWidth;
    const scaleY = canvas.height / state.arenaHeight;
    expect(scaleX).toBeCloseTo(scaleY);
    expect(context.setTransform).toHaveBeenLastCalledWith(
      scaleX,
      0,
      0,
      scaleY,
      0,
      0,
    );

    engine.destroy();
  });

  it('keeps only one animation loop scheduled and clamps long frame delays', () => {
    const { canvas } = createCanvas();
    const engine = new GameEngine(canvas);
    engine.initialize();
    engine.resize(960, 540, 1);

    engine.start();
    engine.start();
    expect(callbacks.size).toBe(1);

    const first = callbacks.entries().next().value as [number, FrameRequestCallback];
    callbacks.delete(first[0]);
    first[1](0);
    const second = callbacks.entries().next().value as [number, FrameRequestCallback];
    callbacks.delete(second[0]);
    second[1](10_000);
    expect(callbacks.size).toBe(1);
    expect(engine.getElapsedSeconds()).toBe(0.05);

    engine.pause();
    expect(callbacks.size).toBe(0);
    engine.destroy();
  });

  it('suspends while hidden and resumes without a duplicate frame loop', () => {
    const { canvas } = createCanvas();
    const engine = new GameEngine(canvas);
    engine.initialize();
    engine.resize(960, 540, 1);
    engine.start();
    expect(callbacks.size).toBe(1);

    hidden = true;
    documentListeners.get('visibilitychange')?.(new Event('visibilitychange'));
    expect(callbacks.size).toBe(0);

    hidden = false;
    documentListeners.get('visibilitychange')?.(new Event('visibilitychange'));
    documentListeners.get('visibilitychange')?.(new Event('visibilitychange'));
    expect(callbacks.size).toBe(1);

    engine.destroy();
    expect(documentListeners.has('visibilitychange')).toBe(false);
    expect(callbacks.size).toBe(0);
  });

  it('keeps keyboard and joystick input disabled when started in a hidden tab', () => {
    hidden = true;
    const { canvas } = createCanvas();
    const movementJoystick = createJoystickTarget();
    const aimJoystick = createJoystickTarget(200);
    const engine = new GameEngine(canvas);
    engine.initialize({
      movement: movementJoystick,
      aim: aimJoystick,
    });
    engine.resize(960, 540, 1);
    engine.start();

    const hiddenKey = dispatchKey(canvas, 'keydown', 'KeyD');
    const hiddenPointer = dispatchPointer(
      movementJoystick,
      'pointerdown',
      1,
      100,
      50,
    );
    expect(hiddenKey.defaultPrevented).toBe(false);
    expect(hiddenPointer.defaultPrevented).toBe(false);
    expect(engine.getMovementInput()).toEqual({ x: 0, y: 0 });
    expect(callbacks.size).toBe(0);

    hidden = false;
    documentListeners.get('visibilitychange')?.(new Event('visibilitychange'));
    const visibleKey = dispatchKey(canvas, 'keydown', 'KeyD');
    const visiblePointer = dispatchPointer(
      movementJoystick,
      'pointerdown',
      2,
      100,
      50,
    );
    expect(visibleKey.defaultPrevented).toBe(true);
    expect(visiblePointer.defaultPrevented).toBe(true);
    expect(engine.getMovementInput()).toEqual({ x: 1, y: 0 });
    engine.destroy();
  });

  it('reports the current gameplay entity count in development diagnostics', () => {
    const { canvas } = createCanvas();
    const onDiagnostics = vi.fn();
    const engine = new GameEngine(canvas, onDiagnostics);
    engine.initialize();
    engine.resize(960, 540, 1);
    engine.start();

    const first = callbacks.entries().next().value as [number, FrameRequestCallback];
    callbacks.delete(first[0]);
    first[1](0);
    const second = callbacks.entries().next().value as [number, FrameRequestCallback];
    callbacks.delete(second[0]);
    second[1](1000);

    const state = engine.getGameState();
    if (!state) throw new Error('Game state must exist while running.');
    const expectedEntityCount = 1 +
      state.zombies.length +
      state.items.length +
      state.gasCylinders.length +
      state.oilFirePatches.length +
      state.contaminatedObjects.length +
      state.militaryObjects.length +
      state.supportTurrets.length +
      state.projectiles.length +
      state.impacts.length +
      state.damageNumbers.length +
      state.collectionEffects.length;
    expect(onDiagnostics).toHaveBeenCalledWith(
      expect.objectContaining({ entityCount: expectedEntityCount }),
    );
    engine.destroy();
  });

  it('exposes stat allocation and resets all run state for a retry', () => {
    const { canvas } = createCanvas();
    const engine = new GameEngine(canvas);
    engine.initialize();
    engine.resize(960, 540, 1);
    expect(() => engine.adjustStat('damage', 1)).toThrow(RangeError);

    engine.start();
    const first = callbacks.entries().next().value as [number, FrameRequestCallback];
    callbacks.delete(first[0]);
    first[1](0);
    expect(engine.getGameState()?.wave.enemiesSpawned).toBe(1);

    engine.reset();
    expect(engine.getGameState()).toMatchObject({
      elapsedSeconds: 0,
      zombies: [],
      items: [],
      score: 0,
      statistics: {
        highestWaveReached: 1,
        highestWaveCleared: 0,
        zombiesKilled: 0,
        orbsCollected: 0,
        upgradesSelected: 0,
      },
      wave: {
        currentWave: 1,
        phase: 'combat',
        enemiesSpawned: 0,
      },
    });
    engine.destroy();
  });

  it('moves the preview player with focused WASD/arrow input at a normalized diagonal speed', () => {
    const { canvas } = createCanvas();
    const engine = new GameEngine(canvas);
    engine.initialize();
    engine.resize(960, 540, 1);
    engine.start();

    const initialPosition = engine.getPlayerPosition();
    const up = dispatchKey(canvas, 'keydown', 'KeyW');
    const right = dispatchKey(canvas, 'keydown', 'ArrowRight');
    expect(up.defaultPrevented).toBe(true);
    expect(right.defaultPrevented).toBe(true);
    expect(engine.getMovementInput().x).toBeCloseTo(Math.SQRT1_2);
    expect(engine.getMovementInput().y).toBeCloseTo(-Math.SQRT1_2);

    const first = callbacks.entries().next().value as [number, FrameRequestCallback];
    callbacks.delete(first[0]);
    first[1](0);
    const second = callbacks.entries().next().value as [number, FrameRequestCallback];
    callbacks.delete(second[0]);
    second[1](50);

    const movedPosition = engine.getPlayerPosition();
    const movementSpeed = engine.getGameState()?.player.movementSpeed;
    if (movementSpeed === undefined) {
      throw new Error('Player movement speed must be available while running.');
    }
    expect(movedPosition.x - initialPosition.x).toBeCloseTo(
      movementSpeed * 0.05 / Math.SQRT2,
    );
    expect(initialPosition.y - movedPosition.y).toBeCloseTo(
      movementSpeed * 0.05 / Math.SQRT2,
    );

    dispatchKey(canvas, 'keyup', 'ArrowRight');
    expect(engine.getMovementInput()).toEqual({ x: 0, y: -1 });
    engine.pause();
    expect(engine.getMovementInput()).toEqual({ x: 0, y: 0 });
    dispatchKey(canvas, 'keydown', 'ArrowRight');
    expect(engine.getMovementInput()).toEqual({ x: 0, y: 0 });
    engine.resume();
    dispatchKey(canvas, 'keydown', 'ArrowRight');
    expect(engine.getMovementInput()).toEqual({ x: 1, y: 0 });
    engine.destroy();
  });

  it('clears held keys on canvas/window blur and detaches keyboard listeners on destroy', () => {
    const { canvas } = createCanvas();
    const engine = new GameEngine(canvas);
    engine.initialize();
    engine.start();

    dispatchKey(canvas, 'keydown', 'KeyD');
    expect(engine.getMovementInput()).toEqual({ x: 1, y: 0 });
    canvas.dispatchEvent(new Event('blur'));
    expect(engine.getMovementInput()).toEqual({ x: 0, y: 0 });

    dispatchKey(canvas, 'keydown', 'ArrowDown');
    expect(engine.getMovementInput()).toEqual({ x: 0, y: 1 });
    windowListeners.get('blur')?.(new Event('blur'));
    expect(engine.getMovementInput()).toEqual({ x: 0, y: 0 });

    engine.destroy();
    dispatchKey(canvas, 'keydown', 'KeyA');
    expect(engine.getMovementInput()).toEqual({ x: 0, y: 0 });
    expect(windowListeners.has('blur')).toBe(false);
  });

  it('keeps player movement inside the visible arena bounds', () => {
    const { canvas } = createCanvas();
    const engine = new GameEngine(canvas);
    engine.initialize();
    engine.resize(960, 540, 1);
    engine.start();
    const initialPosition = engine.getPlayerPosition();
    const state = engine.getGameState();
    if (!state) throw new Error('Game state must exist after starting.');
    dispatchKey(canvas, 'keydown', 'ArrowLeft');

    for (let frame = 0; frame < 100; frame += 1) {
      const next = callbacks.entries().next().value as [number, FrameRequestCallback];
      callbacks.delete(next[0]);
      next[1](frame * 50);
    }

    const position = engine.getPlayerPosition();
    expect(position.x).toBeLessThanOrEqual(initialPosition.x);
    expect(position.x).toBeGreaterThanOrEqual(state.player.radius);
    expect(position.x).toBeLessThanOrEqual(state.arenaWidth - state.player.radius);
    expect(position.y).toBeGreaterThanOrEqual(state.player.radius);
    expect(position.y).toBeLessThanOrEqual(state.arenaHeight - state.player.radius);
    engine.destroy();
  });

  it('aims from the mouse in logical coordinates independently from movement', () => {
    const { canvas } = createCanvas();
    vi.mocked(canvas.getBoundingClientRect).mockReturnValue({
      left: 100,
      top: 50,
      width: 480,
      height: 270,
    } as DOMRect);
    const engine = new GameEngine(canvas);
    engine.initialize();
    engine.resize(480, 270, 2);
    engine.start();

    const before = engine.getPlayerPosition();
    const state = engine.getGameState();
    if (!state) throw new Error('Game state must exist before aiming.');
    const targetX = state.player.x < state.arenaWidth / 2
      ? state.player.x + 120
      : state.player.x - 120;
    const targetY = state.player.y < state.arenaHeight / 2
      ? state.player.y + 80
      : state.player.y - 80;
    const expectedAngle = Math.atan2(
      targetY - state.player.y,
      targetX - state.player.x,
    );
    dispatchMouseAtWorldPosition(canvas, engine, targetX, targetY);

    expect(engine.getAimAngle()).toBeCloseTo(expectedAngle);
    expect(engine.getPlayerPosition()).toEqual(before);

    const first = callbacks.entries().next().value as [number, FrameRequestCallback];
    callbacks.delete(first[0]);
    first[1](0);
    const shot = engine.getGameState()?.projectiles[0];
    expect(shot?.directionX).toBeCloseTo(Math.cos(expectedAngle));
    expect(shot?.directionY).toBeCloseTo(Math.sin(expectedAngle));
    expect(engine.getPlayerPosition()).toEqual(before);

    dispatchKey(canvas, 'keydown', 'KeyD');
    expect(engine.getMovementInput()).toEqual({ x: 1, y: 0 });
    expect(engine.getAimAngle()).toBeCloseTo(expectedAngle);

    engine.pause();
    const pausedAngle = engine.getAimAngle();
    dispatchMouse(canvas, 'mousemove', 100, 145);
    expect(engine.getAimAngle()).toBe(pausedAngle);
    engine.destroy();
  });

  it('preserves the last valid mouse aim at the player and after mouse leave', () => {
    const { canvas } = createCanvas();
    const engine = new GameEngine(canvas);
    engine.initialize();
    engine.resize(960, 540, 1);
    engine.start();

    const state = engine.getGameState();
    if (!state) throw new Error('Game state must exist before aiming.');
    const targetX = state.player.x < state.arenaWidth / 2
      ? state.player.x + 80
      : state.player.x - 80;
    const targetY = state.player.y;
    dispatchMouseAtWorldPosition(canvas, engine, targetX, targetY);
    const aimedRight = engine.getAimAngle();
    expect(aimedRight).toBeCloseTo(targetX > state.player.x ? 0 : Math.PI);

    dispatchMouseAtWorldPosition(
      canvas,
      engine,
      state.player.x,
      state.player.y,
    );
    expect(engine.getAimAngle()).toBe(aimedRight);

    canvas.dispatchEvent(new Event('mouseleave'));
    expect(engine.getAimAngle()).toBe(aimedRight);
    engine.destroy();
  });

  it('detaches mouse listeners on destroy', () => {
    const { canvas } = createCanvas();
    const engine = new GameEngine(canvas);
    engine.initialize();
    engine.resize(960, 540, 1);
    engine.start();
    engine.destroy();

    dispatchMouse(canvas, 'mousemove', 760, 270);
    expect(engine.getAimAngle()).toBe(-0.22);
  });

  it('integrates independent mobile movement and aim while preserving aim on release', () => {
    const { canvas } = createCanvas();
    const movementJoystick = createJoystickTarget();
    const aimJoystick = createJoystickTarget(200);
    const engine = new GameEngine(canvas);
    engine.initialize({
      movement: movementJoystick,
      aim: aimJoystick,
    });
    engine.resize(960, 540, 1);
    engine.start();

    const initialPosition = engine.getPlayerPosition();
    dispatchPointer(movementJoystick, 'pointerdown', 1, 100, 50);
    dispatchPointer(aimJoystick, 'pointerdown', 2, 250, 100);
    expect(engine.getMovementInput()).toEqual({ x: 1, y: 0 });
    expect(engine.getAimAngle()).toBeCloseTo(Math.PI / 2);

    const first = callbacks.entries().next().value as [number, FrameRequestCallback];
    callbacks.delete(first[0]);
    first[1](0);
    const second = callbacks.entries().next().value as [number, FrameRequestCallback];
    callbacks.delete(second[0]);
    second[1](50);
    expect(engine.getPlayerPosition().x).toBeGreaterThan(initialPosition.x);

    dispatchPointer(movementJoystick, 'pointerup', 1, 100, 50);
    dispatchPointer(aimJoystick, 'pointerup', 2, 250, 100);
    expect(engine.getMovementInput()).toEqual({ x: 0, y: 0 });
    expect(engine.getAimAngle()).toBeCloseTo(Math.PI / 2);

    engine.pause();
    dispatchPointer(movementJoystick, 'pointerdown', 3, 100, 50);
    expect(engine.getMovementInput()).toEqual({ x: 0, y: 0 });
    engine.resume();
    dispatchPointer(movementJoystick, 'pointerdown', 4, 100, 50);
    expect(engine.getMovementInput()).toEqual({ x: 1, y: 0 });
    engine.destroy();

    const priorCalls = movementJoystick.setPointerCapture;
    dispatchPointer(movementJoystick, 'pointerdown', 5, 100, 50);
    expect(priorCalls).toHaveBeenCalledTimes(2);
  });
});
