import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { GameEngine, type GameDiagnostics } from '@/game/core/GameEngine';
import {
  GameAudioController,
  GAME_MUSIC_TRACKS,
  getMusicTrackName,
} from '@/game/audio/GameAudioController';
import {
  getEnemyDisplayName,
  notifyNewEnemyDiscoveries,
} from '@/game/discovery/EnemyDiscovery';
import type {
  GameStateSnapshot,
  GameMode,
  RunStatAttribute,
} from '@/game/core/GameState';
import type { RareUpgradeId } from '@/game/upgrades';
import {
  GameMusicPlayer,
  type GameMenuMode,
} from './GameMenuOverlay';
import { GameHud } from './GameHud';
import { GameMenuOverlay } from './GameMenuOverlay';
import { GamePauseButton } from './GamePauseButton';
import { GamePhaseOverlays } from './GamePhaseOverlays';
import { GameTouchControls } from './GameTouchControls';
import {
  GAME_TUTORIAL_STEPS,
  GameTutorialOverlay,
} from './GameTutorialOverlay';
import { useGameSettings } from './useGameSettings';
import './game-canvas.css';

interface TutorialBaseline {
  readonly playerX: number;
  readonly playerY: number;
  readonly aimAngle: number;
  readonly orbsCollected: number;
}

function getAngleDifference(left: number, right: number): number {
  return Math.atan2(Math.sin(left - right), Math.cos(left - right));
}

export function GameCanvas() {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const movementJoystickRef = useRef<HTMLButtonElement>(null);
  const aimJoystickRef = useRef<HTMLButtonElement>(null);
  const engineRef = useRef<GameEngine | null>(null);
  const audioRef = useRef<GameAudioController | null>(null);
  const previousAudioEventsRef = useRef({
    impacts: new Set<number>(),
    collections: new Set<number>(),
    shotsFired: 0,
  });
  const [diagnostics, setDiagnostics] = useState<GameDiagnostics | null>(null);
  const [renderError, setRenderError] = useState<string | null>(null);
  const [audioError, setAudioError] = useState<string | null>(null);
  const [musicStatus, setMusicStatus] = useState({
    trackName: '',
    isPlaying: false,
  });
  const [gameState, setGameState] = useState<GameStateSnapshot | null>(null);
  const [turretPlacementArmed, setTurretPlacementArmed] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [tutorialStepIndex, setTutorialStepIndex] = useState<number | null>(null);
  const [tutorialActionComplete, setTutorialActionComplete] = useState(false);
  const [confirmTutorialExit, setConfirmTutorialExit] = useState(false);
  const tutorialBaselineRef = useRef<TutorialBaseline | null>(null);
  const tutorialExitWasPausedRef = useRef(false);
  const { settings, error: settingsError, updateSettings } = useGameSettings();

  useEffect(() => {
    const audio = new GameAudioController(GAME_MUSIC_TRACKS, (error) => {
      setAudioError(error.message);
    }, (track, isPlaying) => {
      setMusicStatus({ trackName: getMusicTrackName(track), isPlaying });
    });
    audioRef.current = audio;
    audio.startMenuMusic();
    return () => {
      audio.dispose();
      audioRef.current = null;
    };
  }, []);

  useEffect(() => {
    audioRef.current?.setSettings(settings);
  }, [settings]);

  useEffect(() => {
    engineRef.current?.setKeyBindings(settings.keyBindings);
  }, [settings.keyBindings]);

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
        const nextState = engine.getGameState();
        if (nextState) {
          const previous = previousAudioEventsRef.current;
          const newImpacts = nextState.impacts.filter(
            (impact) => !previous.impacts.has(impact.id),
          );
          const newDeaths = newImpacts.filter((impact) => impact.kind === 'death');
          const newCollection = nextState.collectionEffects.some(
            (effect) => !previous.collections.has(effect.id),
          );

          const newShots = Math.max(
            0,
            nextState.player.shotsFired - previous.shotsFired,
          );
          const rapidFireActive = nextState.activeEffects.some(
            (effect) => effect.type === 'rapidFire',
          );
          for (let shot = 0; shot < newShots; shot += 1) {
            audioRef.current?.playCue(
              'shoot',
              rapidFireActive ? 1 : 0.5,
              shot * 0.08,
            );
          }
          if (newCollection) audioRef.current?.playCue('collection');
          for (const impact of newImpacts) {
            if (impact.kind === 'playerDamage') {
              if (impact.shieldAbsorbed) audioRef.current?.playCue('shield');
              if (impact.critical) audioRef.current?.playCue('damage');
            } else if (impact.kind === 'bomb') {
              audioRef.current?.playCue('explosion');
            } else if (impact.kind === 'hit') {
              audioRef.current?.playCue('hit');
              if (impact.critical) audioRef.current?.playCue('critical');
            }
          }
          if (newDeaths.length > 1) {
            audioRef.current?.playCue(
              'multipleKills',
              0.75 + Math.min(newDeaths.length - 1, 5) * 0.12,
            );
          } else if (newDeaths.length === 1) {
            audioRef.current?.playCue('enemyDeath');
          }
          if (newDeaths.some((impact) => impact.critical)) {
            audioRef.current?.playCue('critical');
          }

          const newlyDiscoveredEnemyTypes = notifyNewEnemyDiscoveries(
            globalThis.localStorage,
            nextState.zombies.map((zombie) => zombie.type),
            (enemyType) => {
              toast.success(`${getEnemyDisplayName(enemyType)} discovered`, {
                description: 'First encounter recorded. Stay alert.',
                duration: 3000,
              });
            },
          );
          if (newlyDiscoveredEnemyTypes.length > 0) {
            audioRef.current?.playCue('enemyDeath');
          }

          previousAudioEventsRef.current = {
            impacts: new Set(nextState.impacts.map((impact) => impact.id)),
            collections: new Set(
              nextState.collectionEffects.map((effect) => effect.id),
            ),
            shotsFired: nextState.player.shotsFired,
          };
        }
        setGameState(nextState);
        setTurretPlacementArmed(engine.isTurretPlacementArmed());
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
    setTurretPlacementArmed(
      engineRef.current?.isTurretPlacementArmed() ?? false,
    );
  };

  const startRun = (gameMode: GameMode = 'standard') => {
    engineRef.current?.reset(gameMode);
    syncGameState();
    setTutorialStepIndex(null);
    setConfirmTutorialExit(false);
    previousAudioEventsRef.current = {
      impacts: new Set(),
      collections: new Set(),
      shotsFired: engineRef.current?.getGameState()?.player.shotsFired ?? 0,
    };
    audioRef.current?.startGameplay();
    engineRef.current?.resume();
    setHasStarted(true);
    setIsPaused(false);
    canvasRef.current?.focus();
  };

  const enterTutorialStep = (index: number) => {
    const step = GAME_TUTORIAL_STEPS[index];
    if (!step) return;

    const engine = engineRef.current;
    const state = engine?.getGameState();
    tutorialBaselineRef.current = state
      ? {
          playerX: state.player.x,
          playerY: state.player.y,
          aimAngle: state.player.aimAngle,
          orbsCollected: state.statistics.orbsCollected,
        }
      : null;
    setTutorialStepIndex(index);
    setTutorialActionComplete(false);
    setConfirmTutorialExit(false);
    setIsPaused(step.id === 'pause');
    if (step.simulate) {
      engine?.resume();
      audioRef.current?.resumeGameplay();
    } else {
      engine?.pause();
      audioRef.current?.pauseGameplay();
    }
    if (step.simulate) canvasRef.current?.focus();
    syncGameState();
  };

  const startTutorial = () => {
    const engine = engineRef.current;
    if (!engine) return;
    engine.reset();
    previousAudioEventsRef.current = {
      impacts: new Set(),
      collections: new Set(),
      shotsFired: 0,
    };
    audioRef.current?.startGameplay();
    setHasStarted(true);
    setIsPaused(false);
    enterTutorialStep(0);
  };

  const changeTutorialStep = (index: number) => {
    if (index < 0 || index >= GAME_TUTORIAL_STEPS.length) return;
    enterTutorialStep(index);
  };

  const requestTutorialExit = () => {
    tutorialExitWasPausedRef.current = isPaused;
    engineRef.current?.pause();
    audioRef.current?.pauseGameplay();
    setConfirmTutorialExit(true);
  };

  const cancelTutorialExit = () => {
    setConfirmTutorialExit(false);
    const currentStep = tutorialStepIndex === null
      ? null
      : GAME_TUTORIAL_STEPS[tutorialStepIndex];
    if (currentStep?.simulate && !tutorialExitWasPausedRef.current) {
      engineRef.current?.resume();
      audioRef.current?.resumeGameplay();
    }
  };

  const pauseRun = () => {
    engineRef.current?.pause();
    audioRef.current?.pauseGameplay();
    syncGameState();
    setIsPaused(true);
  };

  const resumeRun = () => {
    audioRef.current?.resumeGameplay();
    engineRef.current?.resume();
    setIsPaused(false);
    canvasRef.current?.focus();
  };

  const restartRun = () => {
    engineRef.current?.reset('standard');
    previousAudioEventsRef.current = {
      impacts: new Set(),
      collections: new Set(),
      shotsFired: 0,
    };
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
    audioRef.current?.pauseGameplay();
    audioRef.current?.startMenuMusic();
    previousAudioEventsRef.current = {
      impacts: new Set(),
      collections: new Set(),
      shotsFired: 0,
    };
    syncGameState();
    setTutorialStepIndex(null);
    setTutorialActionComplete(false);
    setConfirmTutorialExit(false);
    tutorialBaselineRef.current = null;
    tutorialExitWasPausedRef.current = false;
    setHasStarted(false);
    setIsPaused(false);
  };

  useEffect(() => {
    if (gameState?.wave.phase === 'gameOver') audioRef.current?.pauseGameplay();
  }, [gameState?.wave.phase]);

  const adjustStat = (attribute: RunStatAttribute, adjustment: -1 | 1) => {
    engineRef.current?.adjustStat(attribute, adjustment);
    syncGameState();
  };

  const adjustRareUpgrade = (
    upgradeId: RareUpgradeId,
    adjustment: -1 | 1,
  ) => {
    engineRef.current?.adjustRareUpgrade(upgradeId, adjustment);
    syncGameState();
  };

  useEffect(() => {
    if (
      !hasStarted ||
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

  useEffect(() => {
    if (tutorialStepIndex === null || tutorialActionComplete || !gameState) return;
    const step = GAME_TUTORIAL_STEPS[tutorialStepIndex];
    const baseline = tutorialBaselineRef.current;
    if (!step?.action || !baseline) return;

    const actionComplete = step.action === 'movement'
      ? Math.hypot(
          gameState.player.x - baseline.playerX,
          gameState.player.y - baseline.playerY,
        ) >= 20
      : step.action === 'aim'
        ? Math.abs(getAngleDifference(gameState.player.aimAngle, baseline.aimAngle)) >= 0.3
        : step.action === 'orb'
          ? gameState.statistics.orbsCollected > baseline.orbsCollected
          : false;

    if (actionComplete) {
      engineRef.current?.pause();
      setTutorialActionComplete(true);
    }
  }, [gameState, tutorialActionComplete, tutorialStepIndex]);

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
        tutorialStepIndex !== null &&
        GAME_TUTORIAL_STEPS[tutorialStepIndex]?.highlight === 'arena'
          ? 'game-tutorial-arena-highlight'
          : '',
      ].filter(Boolean).join(' ')}
      ref={containerRef}
    >
      <canvas
        ref={canvasRef}
      className={[
        'game-canvas',
        hasStarted && !isPaused && gameState?.wave.phase === 'combat'
          ? 'game-canvas-playing'
          : '',
      ].filter(Boolean).join(' ')}
      tabIndex={0}
        aria-label="565 Zombie Survival. Use your configured movement keys or touch controls to move. Aim with the mouse or aim joystick. The weapon fires automatically in the selected direction. Collect bombs and press your configured bomb key to use one. Collect up to five turrets, press your configured turret key, then click or tap an open spot in the arena to place one."
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
        highlightMovement={
          tutorialStepIndex !== null &&
          GAME_TUTORIAL_STEPS[tutorialStepIndex]?.highlight === 'movement'
        }
        highlightAim={
          tutorialStepIndex !== null &&
          GAME_TUTORIAL_STEPS[tutorialStepIndex]?.highlight === 'aim'
        }
        movementRef={movementJoystickRef}
        aimRef={aimJoystickRef}
      />
      {gameState && hasStarted && !isPaused && gameState.wave.phase === 'combat' && (
        <GameHud
          gameState={gameState}
          density={settings.hudDensity}
          bombKey={settings.keyBindings.useBomb}
          turretKey={settings.keyBindings.useTurret}
          turretPlacementArmed={turretPlacementArmed}
          highlighted={
            tutorialStepIndex !== null &&
            GAME_TUTORIAL_STEPS[tutorialStepIndex]?.highlight === 'hud'
          }
        />
      )}
      {hasStarted && !isPaused && gameState?.wave.phase === 'combat' && (
        <GamePauseButton onPause={pauseRun} />
      )}
      {!menuMode && (
        <GameMusicPlayer
          floating
          trackName={musicStatus.trackName || 'Game soundtrack'}
          isPlaying={musicStatus.isPlaying}
          musicEnabled={settings.musicEnabled}
          onToggle={() => audioRef.current?.toggleCurrentMusic()}
        />
      )}
      {menuMode && (
        <GameMenuOverlay
          mode={menuMode}
          settings={settings}
          settingsError={settingsError}
          audioError={audioError}
          musicTrackName={musicStatus.trackName || 'Game soundtrack'}
          musicPlaying={musicStatus.isPlaying}
          musicEnabled={settings.musicEnabled}
          onToggleMusic={() => audioRef.current?.toggleCurrentMusic()}
          gameState={gameState}
          onSettingsChange={updateSettings}
          onStart={startRun}
          onStartTutorial={startTutorial}
          onResume={resumeRun}
          onAdjustStat={adjustStat}
          onAdjustRareUpgrade={adjustRareUpgrade}
          onRestart={restartRun}
          onReturnToMenu={
            tutorialStepIndex === null ? returnToMenu : requestTutorialExit
          }
          tutorialMode={tutorialStepIndex !== null}
          highlightPauseMenu={
            tutorialStepIndex !== null &&
            GAME_TUTORIAL_STEPS[tutorialStepIndex]?.highlight === 'pause'
          }
        />
      )}
      {hasStarted && (
        <GamePhaseOverlays
          gameState={gameState}
          onPlayAgain={tutorialStepIndex === null ? playAgain : startTutorial}
          onReturnToMenu={
            tutorialStepIndex === null ? returnToMenu : requestTutorialExit
          }
          tutorialMode={tutorialStepIndex !== null}
        />
      )}
      {tutorialStepIndex !== null && (
        <>
          {gameState &&
            GAME_TUTORIAL_STEPS[tutorialStepIndex]?.highlight === 'player' && (
              <span
                className="game-tutorial-player-highlight"
                style={{
                  left: `${(gameState.player.x / gameState.arenaWidth) * 100}%`,
                  top: `${(gameState.player.y / gameState.arenaHeight) * 100}%`,
                }}
                aria-hidden="true"
              />
            )}
          {gameState &&
            GAME_TUTORIAL_STEPS[tutorialStepIndex]?.highlight === 'orb' &&
            gameState.items.map((item) => (
              <span
                key={item.id}
                className="game-tutorial-orb-highlight"
                style={{
                  left: `${(item.x / gameState.arenaWidth) * 100}%`,
                  top: `${(item.y / gameState.arenaHeight) * 100}%`,
                }}
                aria-hidden="true"
              />
            ))}
          <GameTutorialOverlay
            step={GAME_TUTORIAL_STEPS[tutorialStepIndex]}
            stepNumber={tutorialStepIndex + 1}
            totalSteps={GAME_TUTORIAL_STEPS.length}
            actionComplete={tutorialActionComplete}
            confirmExit={confirmTutorialExit}
            onNext={() => changeTutorialStep(tutorialStepIndex + 1)}
            onPrevious={() => changeTutorialStep(tutorialStepIndex - 1)}
            onSkip={() => changeTutorialStep(tutorialStepIndex + 1)}
            onExitRequest={requestTutorialExit}
            onExitCancel={cancelTutorialExit}
            onExitConfirm={returnToMenu}
            onReturnToMenu={returnToMenu}
          />
        </>
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
