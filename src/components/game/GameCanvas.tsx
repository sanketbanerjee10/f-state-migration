import { useEffect, useRef, useState } from 'react';
import { GameEngine, type GameDiagnostics } from '@/game/core/GameEngine';
import type {
  GameStateSnapshot,
  RunUpgradeAttribute,
} from '@/game/core/GameState';
import type { GameMenuMode } from './GameMenuOverlay';
import { GameHud } from './GameHud';
import { GameMenuOverlay } from './GameMenuOverlay';
import { GamePauseButton } from './GamePauseButton';
import { GamePhaseOverlays } from './GamePhaseOverlays';
import { GameTouchControls } from './GameTouchControls';
import { useGameSettings } from './useGameSettings';
import './game-canvas.css';

export function GameCanvas() {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const movementJoystickRef = useRef<HTMLButtonElement>(null);
  const aimJoystickRef = useRef<HTMLButtonElement>(null);
  const engineRef = useRef<GameEngine | null>(null);
  const [diagnostics, setDiagnostics] = useState<GameDiagnostics | null>(null);
  const [renderError, setRenderError] = useState<string | null>(null);
  const [gameState, setGameState] = useState<GameStateSnapshot | null>(null);
  const [hasStarted, setHasStarted] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const { settings, error: settingsError, updateSettings } = useGameSettings();

  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    const movementJoystick = movementJoystickRef.current;
    const aimJoystick = aimJoystickRef.current;
    if (!container || !canvas || !movementJoystick || !aimJoystick) return;

    const engine = new GameEngine(
      canvas,
      import.meta.env.DEV ? setDiagnostics : undefined,
    );
    engineRef.current = engine;

    let observer: ResizeObserver | null = null;
    let resizeListenerAttached = false;
    let stateInterval: number | null = null;
    const resize = () => {
      const bounds = container.getBoundingClientRect();
      if (bounds.width <= 0 || bounds.height <= 0) return;
      engine.resize(bounds.width, bounds.height, window.devicePixelRatio || 1);
    };

    try {
      engine.initialize({
        movement: movementJoystick,
        aim: aimJoystick,
      });
      observer = new ResizeObserver(resize);
      observer.observe(container);
      window.addEventListener('resize', resize);
      resizeListenerAttached = true;
      resize();
      engine.start();
      engine.pause();
      stateInterval = window.setInterval(() => {
        setGameState(engine.getGameState());
      }, 200);
      setGameState(engine.getGameState());
    } catch (error) {
      observer?.disconnect();
      if (resizeListenerAttached) window.removeEventListener('resize', resize);
      engine.destroy();
      engineRef.current = null;
      setRenderError(
        error instanceof Error
          ? error.message
          : 'Unable to initialize the game rendering surface.',
      );
      return;
    }

    return () => {
      if (stateInterval !== null) window.clearInterval(stateInterval);
      observer?.disconnect();
      if (resizeListenerAttached) window.removeEventListener('resize', resize);
      engine.destroy();
      engineRef.current = null;
    };
  }, []);

  const syncGameState = () => {
    setGameState(engineRef.current?.getGameState() ?? null);
  };

  const startRun = () => {
    engineRef.current?.resume();
    setHasStarted(true);
    setIsPaused(false);
    canvasRef.current?.focus();
  };

  const pauseRun = () => {
    engineRef.current?.pause();
    setIsPaused(true);
  };

  const resumeRun = () => {
    engineRef.current?.resume();
    setIsPaused(false);
    canvasRef.current?.focus();
  };

  const restartRun = () => {
    engineRef.current?.reset();
    syncGameState();
  };

  const playAgain = () => {
    restartRun();
    resumeRun();
  };

  const returnToMenu = () => {
    const engine = engineRef.current;
    if (!engine) return;
    engine.reset();
    engine.pause();
    syncGameState();
    setHasStarted(false);
    setIsPaused(false);
  };

  const chooseUpgrade = (attribute: RunUpgradeAttribute) => {
    engineRef.current?.selectUpgrade(attribute);
    syncGameState();
  };

  const startNextWave = () => {
    engineRef.current?.startNextWave();
    syncGameState();
  };

  const skipCappedUpgrades = () => {
    engineRef.current?.skipCappedUpgrades();
    syncGameState();
  };

  useEffect(() => {
    if (
      !hasStarted ||
      gameState?.wave.phase === 'upgrade' ||
      gameState?.wave.phase === 'gameOver'
    ) {
      return;
    }

    const handlePauseShortcut = (event: KeyboardEvent) => {
      if (event.code !== 'Escape' || event.repeat) return;
      event.preventDefault();
      if (isPaused) resumeRun();
      else pauseRun();
    };
    window.addEventListener('keydown', handlePauseShortcut);
    return () => window.removeEventListener('keydown', handlePauseShortcut);
  }, [gameState?.wave.phase, hasStarted, isPaused]);

  const menuMode: GameMenuMode | null = !hasStarted
    ? 'main'
    : isPaused && gameState?.wave.phase !== 'gameOver'
      ? 'pause'
      : null;

  return (
    <div
      className={[
        'game-canvas-frame',
        settings.touchControls === 'always' ? 'game-controls-always' : '',
        settings.touchControls === 'never' ? 'game-controls-never' : '',
      ].filter(Boolean).join(' ')}
      ref={containerRef}
    >
      <canvas
        ref={canvasRef}
        className="game-canvas"
        tabIndex={0}
        aria-label="565 Zombie Survival. Use WASD or arrow keys to move, or use the touch controls. Aim with the mouse or aim joystick. The weapon fires automatically in the selected direction."
        onPointerDown={(event) => event.currentTarget.focus()}
      >
        Canvas rendering is not supported by this browser.
      </canvas>
      <GameTouchControls
        active={
          hasStarted &&
          !isPaused &&
          gameState?.wave.phase === 'combat'
        }
        movementRef={movementJoystickRef}
        aimRef={aimJoystickRef}
      />
      {gameState && hasStarted && !isPaused && gameState.wave.phase === 'combat' && (
        <GameHud gameState={gameState} density={settings.hudDensity} />
      )}
      {hasStarted && !isPaused && gameState?.wave.phase === 'combat' && (
        <GamePauseButton onPause={pauseRun} />
      )}
      {menuMode && (
        <GameMenuOverlay
          mode={menuMode}
          settings={settings}
          settingsError={settingsError}
          onSettingsChange={updateSettings}
          onStart={startRun}
          onResume={resumeRun}
          onRestart={restartRun}
          onReturnToMenu={returnToMenu}
        />
      )}
      {hasStarted && (
        <GamePhaseOverlays
          gameState={gameState}
          onChooseUpgrade={chooseUpgrade}
          onStartNextWave={startNextWave}
          onSkipCappedUpgrades={skipCappedUpgrades}
          onPlayAgain={playAgain}
          onReturnToMenu={returnToMenu}
        />
      )}
      {import.meta.env.DEV && diagnostics && (
        <output className="game-canvas-diagnostics" aria-live="off">
          {diagnostics.fps} FPS <span aria-hidden="true">·</span>{' '}
          {diagnostics.entityCount} entities
        </output>
      )}
      {renderError && (
        <div className="game-canvas-error" role="alert">
          {renderError}
        </div>
      )}
    </div>
  );
}
