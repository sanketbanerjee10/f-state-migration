import {
  GAME_VIEWPORT,
  GAME_RUNTIME_CONFIG,
  GAME_RESPONSIVE_ZOOM_CONFIG,
} from './GameConfig';
import { KeyboardInput, type MovementVector } from './KeyboardInput';
import type { GameKeyBindings } from './GameSettings';
import { MouseAimInput, type ClientPointerPosition } from './MouseAimInput';
import {
  DualJoystickInput,
  type JoystickVector,
} from './DualJoystickInput';
import { renderGameScene } from '../rendering/Renderer';
import { getArenaBackgroundCacheMetrics } from '../arenas/core/ArenaRenderer';
import { EMPTY_RENDER_LAYERS, type RenderLayers } from '../rendering/RenderScene';
import {
  createGameState,
  createGameStateSnapshot,
  resizeGameState,
  type GameState,
  type GameStateSnapshot,
  type GameMode,
  type RunStatAttribute,
} from './GameState';
import type { RareUpgradeId } from '../upgrades/ProgressionSystem';
import { placeSupportTurret, updateGameState } from './GameSimulation';
import { adjustRareUpgrade, adjustRunStat, startWave } from './GameProgression';
import {
  createGameStateRenderLayers,
  getGameEntityCount,
} from '../rendering/GameStateRenderer';
import {
  createGamePerformanceTimings,
  GamePerformanceRecorder,
  resetGamePerformanceTimings,
  type GamePerformanceSnapshot,
  type GamePerformanceTimings,
  type GamePerformanceUiTimings,
  type GamePerformanceCanvasMetrics,
} from './GamePerformanceDiagnostics';

export interface PlayerPosition {
  readonly x: number;
  readonly y: number;
}

export interface GameDiagnostics {
  fps: number;
  entityCount: number;
}

export class GameEngine {
  private context: CanvasRenderingContext2D | null = null;
  private animationFrameId: number | null = null;
  private previousFrameTime: number | null = null;
  private fpsWindowStart: number | null = null;
  private fpsFrameCount = 0;
  private isActive = false;
  private isDestroyed = false;
  private simulatedSeconds = 0;
  private cssWidth = 0;
  private cssHeight = 0;
  private pixelRatio = 1;
  private prefersReducedMotion = false;
  private motionPreference: MediaQueryList | null = null;
  private motionPreferenceListener: ((event: MediaQueryListEvent) => void) | null = null;
  private renderLayers: RenderLayers = EMPTY_RENDER_LAYERS;
  private gameState: GameState | null = null;
  private gameMode: GameMode = 'standard';
  private readonly keyboardInput = new KeyboardInput();
  private readonly mouseAimInput = new MouseAimInput();
  private readonly dualJoystickInput = new DualJoystickInput();
  private mobileControlElements: {
    readonly movement: HTMLElement;
    readonly aim: HTMLElement;
  } | null = null;
  private mobileMovement: JoystickVector = { x: 0, y: 0 };
  private lastTouchTap: {
    readonly time: number;
    readonly x: number;
    readonly y: number;
  } | null = null;
  private performanceRecorder: GamePerformanceRecorder | null = null;
  private performanceTimings: GamePerformanceTimings | null = null;
  private performanceCanvasResizeCount = 0;
  private previousCallbackEndAt: number | null = null;
  private previousCallbackDurationMs = 0;
  private lastSnapshotBuildMs = 0;

  constructor(
    private readonly canvas: HTMLCanvasElement,
    private readonly onDiagnostics?: (diagnostics: GameDiagnostics) => void,
  ) {}

  initialize(mobileControls?: {
    readonly movement: HTMLElement;
    readonly aim: HTMLElement;
  }): void {
    this.assertNotDestroyed();
    if (this.context) return;

    const context = this.canvas.getContext('2d', { alpha: false });
    if (!context) {
      throw new Error('Canvas 2D rendering is unavailable in this browser.');
    }

    this.context = context;
    this.keyboardInput.attach(this.canvas, window);
    this.mouseAimInput.attach(this.canvas, this.handleMousePosition);
    this.canvas.addEventListener('pointerdown', this.handleCanvasPointerDown);
    this.canvas.addEventListener('contextmenu', this.handleCanvasContextMenu);
    if (mobileControls) this.setMobileControls(mobileControls);
    this.keyboardInput.setEnabled(false);
    this.mouseAimInput.setEnabled(false);
    this.dualJoystickInput.setEnabled(false);
    document.addEventListener('visibilitychange', this.handleVisibilityChange);
    if (typeof window.matchMedia === 'function') {
      this.motionPreference = window.matchMedia('(prefers-reduced-motion: reduce)');
      this.prefersReducedMotion = this.motionPreference.matches;
      this.motionPreferenceListener = (event) => {
        this.prefersReducedMotion = event.matches;
        this.render();
      };
      this.motionPreference.addEventListener('change', this.motionPreferenceListener);
    }
  }

  resize(width: number, height: number, devicePixelRatio: number): void {
    this.assertNotDestroyed();
    if (!this.context) {
      throw new Error('Initialize the game renderer before resizing it.');
    }
    if (
      !Number.isFinite(width) ||
      !Number.isFinite(height) ||
      !Number.isFinite(devicePixelRatio) ||
      width <= 0 ||
      height <= 0 ||
      devicePixelRatio <= 0
    ) {
      throw new RangeError('Canvas dimensions and pixel ratio must be positive finite numbers.');
    }

    this.cssWidth = width;
    this.cssHeight = height;
    this.pixelRatio = Math.min(
      devicePixelRatio,
      GAME_RUNTIME_CONFIG.maximumDevicePixelRatio,
    );

    const { width: logicalWidth, height: logicalHeight } =
      this.getLogicalViewportSize(width, height);
    if (this.gameState === null) {
      this.gameState = createGameState(
        logicalWidth,
        logicalHeight,
        this.gameMode,
      );
    } else {
      resizeGameState(this.gameState, logicalWidth, logicalHeight);
    }
    this.refreshRenderLayers();

    const backingWidth = Math.max(1, Math.round(width * this.pixelRatio));
    const backingHeight = Math.max(1, Math.round(height * this.pixelRatio));
    const dimensionsChanged =
      this.canvas.width !== backingWidth || this.canvas.height !== backingHeight;
    if (this.canvas.width !== backingWidth) this.canvas.width = backingWidth;
    if (this.canvas.height !== backingHeight) this.canvas.height = backingHeight;
    if (dimensionsChanged && this.performanceRecorder) {
      this.performanceCanvasResizeCount += 1;
    }

    this.render();
  }

  adjustRareUpgrade(upgradeId: RareUpgradeId, adjustment: -1 | 1): void {
    this.assertNotDestroyed();
    if (!this.gameState) {
      throw new Error('Resize the game canvas before adjusting a rare upgrade.');
    }
    adjustRareUpgrade(this.gameState, upgradeId, adjustment);
    this.refreshRenderLayers();
    this.render();
  }

  start(): void {
    this.assertNotDestroyed();
    if (!this.context) {
      throw new Error('Initialize the game renderer before starting it.');
    }

    this.isActive = true;
    this.setInputEnabled(true);
    this.previousFrameTime = null;
    this.previousCallbackEndAt = null;
    this.previousCallbackDurationMs = 0;
    this.performanceRecorder?.startBrowserMonitoring();
    this.scheduleFrame();
  }

  pause(): void {
    this.isActive = false;
    this.lastTouchTap = null;
    this.setInputEnabled(false);
    this.previousFrameTime = null;
    this.fpsWindowStart = null;
    this.fpsFrameCount = 0;
    this.previousCallbackEndAt = null;
    this.previousCallbackDurationMs = 0;
    this.performanceRecorder?.disconnectBrowserMonitoring();
    this.cancelFrame();
  }

  resume(): void {
    this.assertNotDestroyed();
    if (!this.context) {
      throw new Error('Initialize the game renderer before resuming it.');
    }

    this.isActive = true;
    this.setInputEnabled(true);
    this.previousFrameTime = null;
    this.fpsWindowStart = null;
    this.fpsFrameCount = 0;
    this.previousCallbackEndAt = null;
    this.previousCallbackDurationMs = 0;
    this.performanceRecorder?.startBrowserMonitoring();
    this.scheduleFrame();
  }

  reset(
    gameMode: GameMode = this.gameMode,
    campaignLevelId: number | null = null,
    initialStandardPoints = 0,
    levelCompletionRewardEligible = true,
    initialStandardAttributeLevels?: Parameters<typeof createGameState>[6],
    initialRarePoints = 0,
  ): void {
    this.assertNotDestroyed();
    this.gameMode = gameMode;
    this.setInputEnabled(false);
    this.mobileMovement = { x: 0, y: 0 };
    this.simulatedSeconds = 0;
    this.previousFrameTime = null;
    this.fpsWindowStart = null;
    this.fpsFrameCount = 0;
    this.performanceRecorder?.reset();
    this.performanceCanvasResizeCount = 0;
    this.previousCallbackEndAt = null;
    this.previousCallbackDurationMs = 0;
    this.lastSnapshotBuildMs = 0;
    if (this.cssWidth > 0 && this.cssHeight > 0) {
      const logicalSize = this.getLogicalViewportSize(
        this.cssWidth,
        this.cssHeight,
      );
      this.gameState = createGameState(
        logicalSize.width,
        logicalSize.height,
        this.gameMode,
        campaignLevelId,
        initialStandardPoints,
        levelCompletionRewardEligible,
        initialStandardAttributeLevels,
        initialRarePoints,
      );
      if (this.gameMode === 'level' && this.gameState) {
        startWave(this.gameState, this.gameState.wave.currentWave);
      }
    } else {
      this.gameState = null;
    }
    this.renderLayers = this.gameState
      ? createGameStateRenderLayers(this.gameState)
      : EMPTY_RENDER_LAYERS;
    this.setInputEnabled(this.isActive);
    this.render();
  }

  getElapsedSeconds(): number {
    return this.simulatedSeconds;
  }

  getPlayerPosition(): PlayerPosition {
    return this.gameState
      ? { x: this.gameState.player.x, y: this.gameState.player.y }
      : { x: GAME_VIEWPORT.width / 2, y: GAME_VIEWPORT.height / 2 };
  }

  getGameState(): GameStateSnapshot | null {
    const startedAt = this.performanceRecorder ? performance.now() : 0;
    const snapshot = this.gameState
      ? createGameStateSnapshot(this.gameState)
      : null;
    if (this.performanceRecorder) {
      this.lastSnapshotBuildMs = performance.now() - startedAt;
    }
    return snapshot;
  }

  getPerformanceSnapshotBuildMs(): number {
    return this.lastSnapshotBuildMs;
  }

  setPerformanceDiagnosticsEnabled(enabled: boolean): void {
    if (!import.meta.env.DEV) return;
    if (!enabled) {
      this.performanceRecorder?.disconnectBrowserMonitoring();
      this.performanceRecorder = null;
      this.performanceTimings = null;
      this.previousCallbackEndAt = null;
      this.previousCallbackDurationMs = 0;
      return;
    }
    if (this.performanceRecorder) return;
    this.performanceRecorder = new GamePerformanceRecorder();
    this.performanceTimings = createGamePerformanceTimings();
    this.performanceCanvasResizeCount = 0;
    this.previousCallbackEndAt = null;
    this.previousCallbackDurationMs = 0;
    this.performanceRecorder.startBrowserMonitoring();
    this.performanceRecorder.setCanvasMetrics(this.getPerformanceCanvasMetrics());
    this.updatePerformanceBackgroundCacheMetrics();
  }

  getPerformanceDiagnostics(): GamePerformanceSnapshot | null {
    this.performanceRecorder?.setCanvasMetrics(this.getPerformanceCanvasMetrics());
    this.updatePerformanceBackgroundCacheMetrics();
    return this.performanceRecorder?.getSnapshot() ?? null;
  }

  recordPerformanceUiPoll(
    timings: GamePerformanceUiTimings,
    startTime: number,
    endTime: number,
  ): void {
    this.performanceRecorder?.recordUiPoll(
      timings.snapshotBuildMs,
      timings.pollWorkMs,
      startTime,
      endTime,
    );
  }

  setPerformanceThresholds(thresholds: readonly [number, number, number]): void {
    this.performanceRecorder?.setThresholds(thresholds);
  }

  exportPerformanceReport(): object {
    if (!this.performanceRecorder) {
      throw new Error('Enable performance diagnostics before exporting a report.');
    }
    this.updatePerformanceBackgroundCacheMetrics();
    return this.performanceRecorder.exportReport(
      this.canvas,
      this.pixelRatio,
      this.performanceCanvasResizeCount,
    );
  }

  setKeyBindings(keyBindings: GameKeyBindings): void {
    this.keyboardInput.setKeyBindings(keyBindings);
  }

  setMobileControls(controls: {
    readonly movement: HTMLElement;
    readonly aim: HTMLElement;
  } | null): void {
    this.assertNotDestroyed();
    if (
      controls?.movement === this.mobileControlElements?.movement &&
      controls?.aim === this.mobileControlElements?.aim
    ) {
      return;
    }

    this.dualJoystickInput.detach();
    this.keyboardInput.setAdditionalElements(
      controls ? [controls.movement, controls.aim] : [],
    );
    this.mobileControlElements = controls;
    this.mobileMovement = { x: 0, y: 0 };
    if (!controls) return;

    this.dualJoystickInput.attach(
      controls.movement,
      controls.aim,
      this.handleMobileMovement,
      this.handleMobileAim,
    );
    this.dualJoystickInput.setEnabled(this.isActive && !document.hidden);
  }

  requestBomb(): void {
    if (!this.isActive || this.gameState?.wave.phase !== 'combat') return;
    this.keyboardInput.requestBomb();
  }

  adjustStat(attribute: RunStatAttribute, adjustment: -1 | 1): void {
    this.assertNotDestroyed();
    if (!this.gameState) {
      throw new Error('Resize the game canvas before adjusting a stat.');
    }
    adjustRunStat(this.gameState, attribute, adjustment);
    this.refreshRenderLayers();
    this.render();
  }

  getMovementInput(): MovementVector {
    const keyboard = this.keyboardInput.getMovement();
    if (!this.mobileControlElements) return keyboard;
    const x = keyboard.x + this.mobileMovement.x;
    const y = keyboard.y + this.mobileMovement.y;
    const magnitude = Math.hypot(x, y);
    if (magnitude <= 1) return { x, y };
    return { x: x / magnitude, y: y / magnitude };
  }

  getAimAngle(): number {
    return this.gameState?.player.aimAngle ?? -0.22;
  }

  destroy(): void {
    if (this.isDestroyed) return;

    this.pause();
    this.keyboardInput.detach();
    this.mouseAimInput.detach();
    this.canvas.removeEventListener('pointerdown', this.handleCanvasPointerDown);
    this.canvas.removeEventListener('contextmenu', this.handleCanvasContextMenu);
    this.dualJoystickInput.detach();
    this.mobileControlElements = null;
    this.mobileMovement = { x: 0, y: 0 };
    document.removeEventListener('visibilitychange', this.handleVisibilityChange);
    if (this.motionPreference && this.motionPreferenceListener) {
      this.motionPreference.removeEventListener(
        'change',
        this.motionPreferenceListener,
      );
    }
    this.motionPreference = null;
    this.motionPreferenceListener = null;
    this.performanceRecorder = null;
    this.performanceTimings = null;
    this.context = null;
    this.isDestroyed = true;
  }

  private readonly handleVisibilityChange = (): void => {
    if (document.hidden) {
      this.setInputEnabled(false);
      this.cancelFrame();
      this.previousFrameTime = null;
      this.fpsWindowStart = null;
      this.fpsFrameCount = 0;
      this.previousCallbackEndAt = null;
      this.previousCallbackDurationMs = 0;
      this.performanceRecorder?.disconnectBrowserMonitoring();
      return;
    }

    if (this.isActive) {
      this.setInputEnabled(true);
      this.previousFrameTime = null;
      this.fpsWindowStart = null;
      this.fpsFrameCount = 0;
      this.previousCallbackEndAt = null;
      this.previousCallbackDurationMs = 0;
      this.performanceRecorder?.startBrowserMonitoring();
      this.scheduleFrame();
    }
  };

  private readonly frame = (timestamp: number): void => {
    this.animationFrameId = null;
    if (!this.isActive || document.hidden) return;

    const recorder = import.meta.env.DEV ? this.performanceRecorder : null;
    const timings = recorder ? this.performanceTimings : null;
    const callbackStartedAt = recorder ? performance.now() : 0;
    const callbackGapMs = recorder && this.previousCallbackEndAt !== null
      ? Math.max(0, callbackStartedAt - this.previousCallbackEndAt)
      : 0;
    if (timings) resetGamePerformanceTimings(timings);
    if (timings) {
      timings.rafSchedulingGapMs = callbackGapMs;
      timings.previousCallbackDurationMs = this.previousCallbackDurationMs;
    }
    const frameIntervalMs = this.previousFrameTime === null
      ? 0
      : Math.max(0, timestamp - this.previousFrameTime);
    const elapsed = this.previousFrameTime === null
      ? 0
      : Math.min(
          frameIntervalMs / 1000,
          GAME_RUNTIME_CONFIG.maximumFrameDeltaSeconds,
        );
    this.previousFrameTime = timestamp;

    const updateStartedAt = timings ? performance.now() : 0;
    this.update(elapsed);
    if (timings) timings.updateMs = performance.now() - updateStartedAt;
    const renderStartedAt = timings ? performance.now() : 0;
    this.render();
    if (timings) {
      timings.renderMs = performance.now() - renderStartedAt;
    }
    if (import.meta.env.DEV) this.measureFps(timestamp);
    if (timings) {
      recorder?.recordFrame(
        timestamp,
        frameIntervalMs,
        timings,
        this.gameState,
        callbackStartedAt,
        this.getPerformanceCanvasMetrics(),
      );
    }
    this.scheduleFrame();
    if (timings) {
      this.previousCallbackDurationMs = timings.frameCallbackMs;
      this.previousCallbackEndAt = performance.now();
    } else {
      this.previousCallbackDurationMs = 0;
      this.previousCallbackEndAt = null;
    }
  };

  private update(deltaSeconds: number): void {
    this.simulatedSeconds += deltaSeconds;
    if (
      this.cssWidth <= 0 ||
      this.cssHeight <= 0 ||
      this.gameState === null
    ) return;

    const combinedMovement = this.getMovementInput();
    updateGameState(
      this.gameState,
      {
        movementX: combinedMovement.x,
        movementY: combinedMovement.y,
        aimAngle: this.gameState.player.aimAngle,
        useBomb: this.keyboardInput.consumeBombRequest(),
      },
      deltaSeconds,
      this.performanceTimings ?? undefined,
    );
    this.simulatedSeconds = this.gameState.elapsedSeconds;
    this.refreshRenderLayers(this.performanceTimings ?? undefined);
  }

  private readonly handleMousePosition = (
    position: ClientPointerPosition,
  ): void => {
    const worldPosition = this.getWorldPosition(position);
    if (!worldPosition) return;
    if (this.gameState === null) return;
    const deltaX = worldPosition.x - this.gameState.player.x;
    const deltaY = worldPosition.y - this.gameState.player.y;
    if (deltaX === 0 && deltaY === 0) return;

    this.gameState.player.aimAngle = Math.atan2(deltaY, deltaX);
    this.refreshRenderLayers();
    this.render();
  };

  private readonly handleCanvasPointerDown = (event: PointerEvent): void => {
    if (!this.isActive || !this.gameState) {
      this.lastTouchTap = null;
      return;
    }

    if (event.pointerType === 'touch') {
      const previousTap = this.lastTouchTap;
      const isDoubleTap = Boolean(
        previousTap &&
        event.timeStamp - previousTap.time >= 0 &&
        event.timeStamp - previousTap.time <= 350 &&
        Math.hypot(
          event.clientX - previousTap.x,
          event.clientY - previousTap.y,
        ) <= 36,
      );
      this.lastTouchTap = isDoubleTap ? null : {
        time: event.timeStamp,
        x: event.clientX,
        y: event.clientY,
      };
      if (!isDoubleTap) {
        return;
      }
    } else {
      this.lastTouchTap = null;
      if (event.button !== 2) return;
    }

    this.placeSupportTurretAtClientPosition(event.clientX, event.clientY);
  };

  private placeSupportTurretAtClientPosition(
    clientX: number,
    clientY: number,
  ): void {
    if (!this.gameState) return;
    const position = this.getWorldPosition({ x: clientX, y: clientY });
    if (!position) return;
    if (placeSupportTurret(this.gameState, position.x, position.y)) {
      this.refreshRenderLayers();
      this.render();
    }
  }

  private readonly handleCanvasContextMenu = (event: MouseEvent): void => {
    event.preventDefault();
  };

  private getWorldPosition(
    position: ClientPointerPosition,
  ): PlayerPosition | null {
    if (this.cssWidth <= 0 || this.cssHeight <= 0) return null;

    const bounds = this.canvas.getBoundingClientRect();
    if (bounds.width <= 0 || bounds.height <= 0) return null;

    const logicalSize = this.getLogicalViewportSize(this.cssWidth, this.cssHeight);
    return {
      x: ((position.x - bounds.left) / bounds.width) * logicalSize.width,
      y: ((position.y - bounds.top) / bounds.height) * logicalSize.height,
    };
  }

  private readonly handleMobileMovement = (movement: JoystickVector): void => {
    this.mobileMovement = movement;
  };

  private readonly handleMobileAim = (aim: JoystickVector): void => {
    if (aim.x === 0 && aim.y === 0) return;
    if (this.gameState === null) return;
    this.gameState.player.aimAngle = Math.atan2(aim.y, aim.x);
    if (this.cssWidth <= 0 || this.cssHeight <= 0) return;

    this.refreshRenderLayers();
    this.render();
  };

  private refreshRenderLayers(performanceTimings?: GamePerformanceTimings): void {
    const startedAt = performanceTimings ? performance.now() : 0;
    this.renderLayers = this.gameState
      ? createGameStateRenderLayers(this.gameState)
      : EMPTY_RENDER_LAYERS;
    if (performanceTimings) {
      performanceTimings.renderLayersMs += performance.now() - startedAt;
    }
  }

  private updatePerformanceBackgroundCacheMetrics(): void {
    this.performanceRecorder?.setArenaBackgroundCacheMetrics(
      getArenaBackgroundCacheMetrics(),
    );
  }

  private setInputEnabled(enabled: boolean): void {
    const shouldEnable = enabled && !document.hidden;
    this.keyboardInput.setEnabled(shouldEnable);
    this.mouseAimInput.setEnabled(shouldEnable);
    this.dualJoystickInput.setEnabled(shouldEnable);
  }

  private render(): void {
    if (!this.context || this.cssWidth <= 0 || this.cssHeight <= 0) return;

    const context = this.context;
    const backingWidth = this.canvas.width;
    const backingHeight = this.canvas.height;
    context.setTransform(1, 0, 0, 1, 0, 0);
    context.fillStyle = '#17201e';
    context.fillRect(0, 0, backingWidth, backingHeight);

    const scale = this.getViewportScale(this.cssWidth, this.cssHeight);
    const viewportWidth = this.cssWidth / scale;
    const viewportHeight = this.cssHeight / scale;
    context.setTransform(
      this.pixelRatio * scale,
      0,
      0,
      this.pixelRatio * scale,
      0,
      0,
    );
    renderGameScene(
      context,
      viewportWidth,
      viewportHeight,
      this.prefersReducedMotion ? 0 : this.simulatedSeconds,
      this.renderLayers,
      this.performanceTimings ?? undefined,
    );
  }

  private scheduleFrame(): void {
    if (
      !this.isActive ||
      this.isDestroyed ||
      this.animationFrameId !== null ||
      document.hidden
    ) {
      return;
    }

    this.animationFrameId = window.requestAnimationFrame(this.frame);
  }

  private cancelFrame(): void {
    if (this.animationFrameId === null) return;
    window.cancelAnimationFrame(this.animationFrameId);
    this.animationFrameId = null;
  }

  private getPerformanceCanvasMetrics(): GamePerformanceCanvasMetrics {
    return {
      width: this.canvas.width,
      height: this.canvas.height,
      cssWidth: this.cssWidth,
      cssHeight: this.cssHeight,
      devicePixelRatio: this.pixelRatio,
      resizeCount: this.performanceCanvasResizeCount,
    };
  }

  private measureFps(timestamp: number): void {
    if (!this.onDiagnostics) return;
    if (this.fpsWindowStart === null) {
      this.fpsWindowStart = timestamp;
      this.fpsFrameCount = 0;
      return;
    }

    this.fpsFrameCount += 1;
    const duration = timestamp - this.fpsWindowStart;
    if (duration < 1000) return;

    this.onDiagnostics({
      fps: Math.round((this.fpsFrameCount * 1000) / duration),
      entityCount: this.gameState ? getGameEntityCount(this.gameState) : 0,
    });
    this.fpsWindowStart = timestamp;
    this.fpsFrameCount = 0;
  }

  private getViewportScale(width: number, height: number): number {
    const aspectRatio = width / height;
    const zoom = aspectRatio < GAME_RESPONSIVE_ZOOM_CONFIG.portraitAspectRatio
      ? GAME_RESPONSIVE_ZOOM_CONFIG.portraitZoom
      : aspectRatio > GAME_RESPONSIVE_ZOOM_CONFIG.landscapeAspectRatio
        ? GAME_RESPONSIVE_ZOOM_CONFIG.landscapeZoom
        : 1;

    return Math.min(
      width / GAME_VIEWPORT.width,
      height / GAME_VIEWPORT.height,
    ) * zoom;
  }

  private getLogicalViewportSize(width: number, height: number): {
    width: number;
    height: number;
  } {
    const scale = this.getViewportScale(width, height);
    return { width: width / scale, height: height / scale };
  }

  private assertNotDestroyed(): void {
    if (this.isDestroyed) {
      throw new Error('Cannot use the game renderer after it has been destroyed.');
    }
  }
}
