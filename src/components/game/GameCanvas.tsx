import { Fragment, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { GameEngine } from '@/game/core/GameEngine';
import { GAME_TOUCH_CONTROLS_MEDIA_QUERY } from '@/game/core/GameConfig';
import type { GamePerformanceSnapshot } from '@/game/core/GamePerformanceDiagnostics';
import {
  GameAudioController,
  GAME_MUSIC_TRACKS,
  getMusicTrackName,
} from '@/game/audio/GameAudioController';
import {
  getEnemyDisplayName,
  notifyNewBossDiscoveries,
  notifyNewEnemyDiscoveries,
} from '@/game/discovery/EnemyDiscovery';
import { getBossName } from '@/game/bosses/BossSystem';
import type {
  GameStateSnapshot,
  GameMode,
  RunStatAttribute,
} from '@/game/core/GameState';
import {
  canStartLevel,
  completeLevelProgress,
  readLevelCampaignProgress,
  saveLevelCampaignProgress,
} from '@/game/core/LevelCampaign';
import type { RareUpgradeId } from '@/game/upgrades';
import type { GameMenuMode } from './GameMenuTypes';
import { GameMusicPlayer } from './GameMusicPlayer';
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
  const diagnosticsEnabledRef = useRef(false);
  const previousAudioEventsRef = useRef({
    impacts: new Set<number>(),
    collections: new Set<number>(),
    shotsFired: 0,
  });
  const [diagnosticsEnabled, setDiagnosticsEnabled] = useState(false);
  const [diagnosticsPanelExpanded, setDiagnosticsPanelExpanded] = useState(true);
  const [diagnostics, setDiagnostics] =
    useState<GamePerformanceSnapshot | null>(null);
  const [diagnosticThresholds, setDiagnosticThresholds] =
    useState<[number, number, number]>([16.7, 33, 50]);
  const [diagnosticsError, setDiagnosticsError] = useState<string | null>(null);
  const [renderError, setRenderError] = useState<string | null>(null);
  const [audioError, setAudioError] = useState<string | null>(null);
  const [musicStatus, setMusicStatus] = useState({
    trackName: '',
    isPlaying: false,
  });
  const [gameState, setGameState] = useState<GameStateSnapshot | null>(null);
  const [hasStarted, setHasStarted] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [tutorialStepIndex, setTutorialStepIndex] = useState<number | null>(null);
  const [tutorialActionComplete, setTutorialActionComplete] = useState(false);
  const [confirmTutorialExit, setConfirmTutorialExit] = useState(false);
  const [openLevelSelectionOnMenu, setOpenLevelSelectionOnMenu] = useState(false);
  const tutorialBaselineRef = useRef<TutorialBaseline | null>(null);
  const tutorialExitWasPausedRef = useRef(false);
  const currentRunGameModeRef = useRef<GameMode>('survival');
  const currentCampaignLevelIdRef = useRef<number | null>(null);
  const currentCampaignRewardEligibleRef = useRef(true);
  const currentCampaignStartingRarePointsRef = useRef(0);
  const savedCampaignLevelIdRef = useRef<number | null>(null);
  const { settings, error: settingsError, updateSettings } = useGameSettings();
  const [isResponsiveLayout, setIsResponsiveLayout] = useState(
    () =>
      typeof window !== 'undefined' &&
      typeof window.matchMedia === 'function' &&
      window.matchMedia(GAME_TOUCH_CONTROLS_MEDIA_QUERY).matches,
  );
  const shouldMountTouchControls =
    settings.touchControls === 'always' ||
    (settings.touchControls === 'auto' && isResponsiveLayout);

  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return;
    const responsiveQuery = window.matchMedia(GAME_TOUCH_CONTROLS_MEDIA_QUERY);
    const updateResponsiveMode = () =>
      setIsResponsiveLayout(responsiveQuery.matches);
    updateResponsiveMode();
    responsiveQuery.addEventListener('change', updateResponsiveMode);
    return () =>
      responsiveQuery.removeEventListener('change', updateResponsiveMode);
  }, []);

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
    if (!container || !canvas) return;

    const engine = new GameEngine(canvas);
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
      engine.initialize();
      observer = new ResizeObserver(resize);
      observer.observe(container);
      window.addEventListener('resize', resize);
      resizeListenerAttached = true;
      resize();
      engine.start();
      engine.pause();
      stateInterval = window.setInterval(() => {
        const measureUiPoll =
          import.meta.env.DEV && diagnosticsEnabledRef.current;
        const pollStartedAt = measureUiPoll ? performance.now() : 0;
        const nextState = engine.getGameState();
        const snapshotBuildMs = measureUiPoll
          ? engine.getPerformanceSnapshotBuildMs()
          : 0;
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
                className: 'game-discovery-toast',
              });
            },
          );
          if (newlyDiscoveredEnemyTypes.length > 0) {
            audioRef.current?.playCue('enemyDeath');
          }

          notifyNewBossDiscoveries(
            globalThis.localStorage,
            nextState.zombies.flatMap((zombie) =>
              zombie.isBoss && zombie.bossType ? [zombie.bossType] : [],
            ),
            (bossType) => {
              toast.success(`${getBossName(bossType)} discovered`, {
                description: 'First encounter recorded. Stay alert.',
                duration: 3000,
                className: 'game-discovery-toast',
              });
            },
          );

          previousAudioEventsRef.current = {
            impacts: new Set(nextState.impacts.map((impact) => impact.id)),
            collections: new Set(
              nextState.collectionEffects.map((effect) => effect.id),
            ),
            shotsFired: nextState.player.shotsFired,
          };
        }
        setGameState(nextState);
        if (measureUiPoll) {
          engine.recordPerformanceUiPoll({
            snapshotBuildMs,
            pollWorkMs: performance.now() - pollStartedAt,
          }, pollStartedAt, performance.now());
        }
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

  useEffect(() => {
    const engine = engineRef.current;
    if (!engine) return;
    const movement = shouldMountTouchControls
      ? movementJoystickRef.current
      : null;
    const aim = shouldMountTouchControls ? aimJoystickRef.current : null;
    engine.setMobileControls(
      movement && aim ? { movement, aim } : null,
    );
  }, [shouldMountTouchControls]);

  const syncGameState = () => {
    setGameState(engineRef.current?.getGameState() ?? null);
  };

  const startRun = (gameMode: GameMode = 'survival', levelId?: number) => {
    let startingStatPoints = 0;
    let startingRarePoints = 0;
    let startingAttributeLevels:
      | ReturnType<typeof readLevelCampaignProgress>['standardAttributeLevels']
      | undefined;
    if (gameMode === 'level') {
      const progress = readLevelCampaignProgress();
      if (levelId === undefined || !canStartLevel(progress, levelId)) {
        toast.error('That campaign level is locked or unavailable.');
        return;
      }
      saveLevelCampaignProgress(progress);
      startingStatPoints = progress.statPoints;
      startingRarePoints = progress.rarePoints;
      currentCampaignStartingRarePointsRef.current = startingRarePoints;
      startingAttributeLevels = progress.standardAttributeLevels;
      currentCampaignRewardEligibleRef.current =
        !progress.completedLevelIds.includes(levelId);
      currentCampaignLevelIdRef.current = levelId;
      savedCampaignLevelIdRef.current = null;
    } else {
      currentCampaignLevelIdRef.current = null;
      currentCampaignRewardEligibleRef.current = false;
      currentCampaignStartingRarePointsRef.current = 0;
    }
    setOpenLevelSelectionOnMenu(false);
    currentRunGameModeRef.current = gameMode;
    engineRef.current?.reset(
      gameMode,
      gameMode === 'level' ? levelId ?? null : null,
      startingStatPoints,
      gameMode === 'level' && currentCampaignRewardEligibleRef.current,
      startingAttributeLevels,
      startingRarePoints,
    );
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
    currentRunGameModeRef.current = 'survival';
    currentCampaignLevelIdRef.current = null;
    engine.reset('survival');
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
    const gameMode = currentRunGameModeRef.current;
    const campaignProgress = gameMode === 'level'
      ? readLevelCampaignProgress()
      : null;
    const startingStatPoints = campaignProgress?.statPoints ?? 0;
    engineRef.current?.reset(
      gameMode,
      gameMode === 'level' ? currentCampaignLevelIdRef.current : null,
      startingStatPoints,
      gameMode === 'level' && currentCampaignRewardEligibleRef.current,
      campaignProgress?.standardAttributeLevels,
      currentCampaignStartingRarePointsRef.current,
    );
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
    currentRunGameModeRef.current = 'survival';
    currentCampaignLevelIdRef.current = null;
    currentCampaignStartingRarePointsRef.current = 0;
    engine.reset('survival');
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
    if (
      gameState?.wave.phase === 'gameOver' ||
      gameState?.wave.phase === 'levelComplete'
    ) {
      engineRef.current?.pause();
      audioRef.current?.pauseGameplay();
    }
  }, [gameState?.wave.phase]);

  useEffect(() => {
    if (
      gameState?.wave.phase !== 'levelComplete' ||
      gameState.gameMode !== 'level' ||
      gameState.campaignLevelId === null ||
      savedCampaignLevelIdRef.current === gameState.campaignLevelId
    ) {
      return;
    }

    try {
      const progress = completeLevelProgress(
        readLevelCampaignProgress(),
        gameState.campaignLevelId,
        gameState.score,
        gameState.statistics.survivalSeconds,
        gameState.statistics.standardCurrency?.available ??
          gameState.upgradePoints,
        gameState.progression.standardAttributeLevels,
        gameState.statistics.rareCurrency?.available ?? 0,
      );
      saveLevelCampaignProgress(progress);
      savedCampaignLevelIdRef.current = gameState.campaignLevelId;
      currentCampaignRewardEligibleRef.current = false;
    } catch (error) {
      toast.error(
        error instanceof Error
          ? `Campaign progress could not be saved: ${error.message}`
          : 'Campaign progress could not be saved.',
      );
    }
  }, [gameState]);

  const openCampaignLevelSelection = () => {
    setOpenLevelSelectionOnMenu(true);
    returnToMenu();
  };

  const startNextCampaignLevel = () => {
    const levelId = currentCampaignLevelIdRef.current;
    if (levelId !== null && levelId < 30) startRun('level', levelId + 1);
  };

  const adjustStat = (attribute: RunStatAttribute, adjustment: -1 | 1) => {
    engineRef.current?.adjustStat(attribute, adjustment);
    syncGameState();
    if (currentRunGameModeRef.current !== 'level') return;

    try {
      const progress = readLevelCampaignProgress();
      const availablePoints =
        engineRef.current?.getGameState()?.upgradePoints;
      if (availablePoints !== undefined) {
        saveLevelCampaignProgress({
          ...progress,
          statPoints: availablePoints,
          standardAttributeLevels:
            engineRef.current?.getGameState()?.progression
              .standardAttributeLevels ?? progress.standardAttributeLevels,
        });
      }
    } catch (error) {
      toast.error(
        error instanceof Error
          ? `Campaign Stat Points could not be saved: ${error.message}`
          : 'Campaign Stat Points could not be saved.',
      );
    }
  };

  const adjustRareUpgrade = (
    upgradeId: RareUpgradeId,
    adjustment: -1 | 1,
  ) => {
    engineRef.current?.adjustRareUpgrade(upgradeId, adjustment);
    syncGameState();
  };

  const toggleDiagnostics = () => {
    const enabled = !diagnosticsEnabled;
    const engine = engineRef.current;
    if (!engine) return;
    engine.setPerformanceDiagnosticsEnabled(enabled);
    diagnosticsEnabledRef.current = enabled;
    if (enabled) engine.setPerformanceThresholds(diagnosticThresholds);
    setDiagnosticsEnabled(enabled);
    setDiagnosticsPanelExpanded(enabled);
    setDiagnostics(engine.getPerformanceDiagnostics());
    setDiagnosticsError(null);
  };

  const updateDiagnosticThreshold = (index: 0 | 1 | 2, value: string) => {
    const next: [number, number, number] = [...diagnosticThresholds];
    next[index] = Number(value);
    setDiagnosticThresholds(next);
    if (
      !next.every(Number.isFinite) ||
      next[0] <= 0 ||
      next[0] >= next[1] ||
      next[1] >= next[2]
    ) {
      setDiagnosticsError('Thresholds must be positive and strictly increasing.');
      return;
    }
    try {
      engineRef.current?.setPerformanceThresholds(next);
      setDiagnosticsError(null);
    } catch (error) {
      setDiagnosticsError(
        error instanceof Error ? error.message : 'Unable to update thresholds.',
      );
    }
  };

  const exportDiagnostics = () => {
    try {
      const report = engineRef.current?.exportPerformanceReport();
      if (!report) throw new Error('Performance diagnostics are unavailable.');
      const blob = new Blob([JSON.stringify(report, null, 2)], {
        type: 'application/json',
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `last-z-performance-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
      link.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 0);
      setDiagnosticsError(null);
    } catch (error) {
      setDiagnosticsError(
        error instanceof Error ? error.message : 'Unable to export diagnostics.',
      );
    }
  };

  const isTerminalPhase =
    gameState?.wave.phase === 'gameOver' ||
    gameState?.wave.phase === 'levelComplete';

  useEffect(() => {
    if (!import.meta.env.DEV || !diagnosticsEnabled) return;
    const refreshDiagnostics = () => {
      setDiagnostics(engineRef.current?.getPerformanceDiagnostics() ?? null);
    };
    refreshDiagnostics();
    if (!hasStarted || isPaused || isTerminalPhase) return;
    const interval = window.setInterval(refreshDiagnostics, 250);
    return () => window.clearInterval(interval);
  }, [diagnosticsEnabled, hasStarted, isPaused, isTerminalPhase]);

  useEffect(() => {
    if (!hasStarted || isTerminalPhase) return;

    const handlePauseShortcut = (event: KeyboardEvent) => {
      if (
        (event.code !== 'Escape' && event.code !== 'KeyP') ||
        event.repeat
      ) {
        return;
      }
      event.preventDefault();
      if (isPaused) resumeRun();
      else pauseRun();
    };
    window.addEventListener('keydown', handlePauseShortcut);
    return () => window.removeEventListener('keydown', handlePauseShortcut);
  }, [hasStarted, isPaused, isTerminalPhase]);

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
    : isPaused && !isTerminalPhase
      ? 'pause'
      : null;

  return (
    <div
      className={[
        'game-canvas-frame',
        settings.touchControls === 'always' ? 'game-controls-always' : '',
        settings.touchControls === 'never' ? 'game-controls-never' : '',
        settings.touchControls === 'auto' && isResponsiveLayout
          ? 'game-controls-responsive'
          : '',
        hasStarted &&
        !isPaused &&
        gameState?.wave.phase === 'combat' &&
        tutorialStepIndex === null
          ? 'game-touch-controls-active'
          : '',
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
        aria-label="565 Zombie Survival. Use your configured movement keys or touch controls to move. Aim with the mouse or aim joystick. The weapon fires automatically in the selected direction. Collect bombs and press your configured bomb key or the touch bomb button to use one. Collect up to five turrets, then right-click or double-tap an open spot in the arena to place one."
        onPointerDown={(event) => event.currentTarget.focus()}
      >
        Canvas rendering is not supported by this browser.
      </canvas>
      {shouldMountTouchControls && (
        <GameTouchControls
          active={
            hasStarted &&
            !isPaused &&
            gameState?.wave.phase === 'combat'
          }
          bombs={gameState?.bombs ?? 0}
          highlightMovement={
            tutorialStepIndex !== null &&
            GAME_TUTORIAL_STEPS[tutorialStepIndex]?.highlight === 'movement'
          }
          highlightAim={
            tutorialStepIndex !== null &&
            GAME_TUTORIAL_STEPS[tutorialStepIndex]?.highlight === 'aim'
          }
          onUseBomb={() => engineRef.current?.requestBomb()}
          movementRef={movementJoystickRef}
          aimRef={aimJoystickRef}
        />
      )}
      {gameState && hasStarted && !isPaused && gameState.wave.phase === 'combat' && (
        <GameHud
          gameState={gameState}
          density={settings.hudDensity}
          highlighted={
            tutorialStepIndex !== null &&
            GAME_TUTORIAL_STEPS[tutorialStepIndex]?.highlight === 'hud'
          }
        />
      )}
      {hasStarted && !isPaused && gameState?.wave.phase === 'combat' && (
        <GamePauseButton onPause={pauseRun} />
      )}
      {(!menuMode || menuMode === 'pause') && (
        <GameMusicPlayer
          floating
          dimmed={hasStarted && !isPaused && gameState?.wave.phase === 'combat'}
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
          initialView={openLevelSelectionOnMenu ? 'level-select' : 'home'}
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
          onNextLevel={startNextCampaignLevel}
          onLevelSelection={openCampaignLevelSelection}
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
      {import.meta.env.DEV && (
        <aside className="game-performance-tools" aria-label="Developer performance tools">
          <button
            type="button"
            className="game-performance-toggle"
            aria-expanded={diagnosticsEnabled}
            onClick={toggleDiagnostics}
          >
            {diagnosticsEnabled ? 'Disable performance capture' : 'Enable performance capture'}
          </button>
          {diagnosticsEnabled && diagnostics && (
            <section className="game-performance-panel" aria-label="Performance diagnostics">
              <header>
                <strong>Performance capture</strong>
                <button
                  type="button"
                  aria-expanded={diagnosticsPanelExpanded}
                  aria-controls="game-performance-details"
                  onClick={() =>
                    setDiagnosticsPanelExpanded((expanded) => !expanded)
                  }
                >
                  {diagnosticsPanelExpanded ? 'Collapse details' : 'Expand details'}
                </button>
                <button type="button" onClick={exportDiagnostics}>Export JSON</button>
              </header>
              <div
                id="game-performance-details"
                hidden={!diagnosticsPanelExpanded}
              >
                <div className="game-performance-grid">
                <span>FPS</span><strong>{diagnostics.currentFps.toFixed(1)} current / {diagnostics.averageFps.toFixed(1)} average</strong>
                <span>Frame time</span><strong>{diagnostics.frameTimeMs.toFixed(2)} ms · p95 {diagnostics.frameTimeP95Ms.toFixed(2)} · p99 {diagnostics.frameTimeP99Ms.toFixed(2)}</strong>
                <span>Over thresholds</span><strong>{diagnostics.framesOverThreshold1} / {diagnostics.framesOverThreshold2} / {diagnostics.framesOverThreshold3} frames in rolling {diagnostics.rollingFrameCount} over {diagnostics.thresholdsMs.join(' / ')} ms</strong>
                <span>Phases</span><strong>update {diagnostics.timings.updateMs.toFixed(2)} ms (p95 {diagnostics.timingStatisticsMs.updateMs.p95Ms.toFixed(2)} · max {diagnostics.timingStatisticsMs.updateMs.maxMs.toFixed(2)}) · render {diagnostics.timings.renderMs.toFixed(2)} ms</strong>
                <span>UI polling</span><strong>snapshot {diagnostics.uiTimings.snapshotBuildMs.toFixed(2)} ms · poll/schedule {diagnostics.uiTimings.pollWorkMs.toFixed(2)} ms (React commit excluded)</strong>
                <span>Long tasks</span><strong>{diagnostics.browserMetrics.longTaskSupport === 'available' ? `${diagnostics.browserMetrics.longTaskCount} captured · ${(diagnostics.browserMetrics.totalLongTaskDurationMs).toFixed(1)} ms total · ${diagnostics.browserMetrics.longestLongTaskMs.toFixed(1)} ms max` : 'unavailable'}</strong>
                <span>Garbage collection</span><strong>{diagnostics.browserMetrics.garbageCollectionSupport === 'available' ? `${diagnostics.browserMetrics.garbageCollectionCount} events · ${diagnostics.browserMetrics.totalGarbageCollectionDurationMs.toFixed(1)} ms total · ${diagnostics.browserMetrics.longestGarbageCollectionMs.toFixed(1)} ms max` : 'unavailable'}</strong>
                <span>RAF scheduling gap</span><strong>{diagnostics.browserMetrics.latestRafSchedulingGapMs.toFixed(2)} ms latest · {diagnostics.browserMetrics.averageRafSchedulingGapMs.toFixed(2)} ms average · p95 {diagnostics.browserMetrics.p95RafSchedulingGapMs.toFixed(2)} ms · current callback {diagnostics.timings.frameCallbackMs.toFixed(2)} ms · {diagnostics.browserMetrics.consecutiveDelayedFrames} delayed ({diagnostics.browserMetrics.maximumConsecutiveDelayedFrames} max streak)</strong>
                <span>Layers / sort</span><strong>{diagnostics.timings.renderLayersMs.toFixed(2)} / {diagnostics.timings.actorSortMs.toFixed(2)} ms</strong>
                <span>Collision</span><strong>{diagnostics.collisionMs.toFixed(2)} ms · projectile {diagnostics.timings.projectileCollisionMs.toFixed(2)} · zombie subset {diagnostics.timings.zombieCollisionMs.toFixed(2)} · swarm {diagnostics.timings.swarmProjectileAvoidanceMs.toFixed(2)}</strong>
                <span>Gameplay events / frame</span><strong>{diagnostics.timings.events.counts.hitEvents} hits · {diagnostics.timings.events.counts.enemyDeathEvents} enemy deaths · {diagnostics.timings.events.counts.arenaObjectDestructionEvents} objects destroyed · {diagnostics.timings.events.counts.impactEffectsCreated + diagnostics.timings.events.counts.damageNumbersCreated + diagnostics.timings.events.counts.collectionEffectsCreated + diagnostics.timings.events.counts.temporaryEffectsCreated} effects · {diagnostics.timings.events.counts.hazardsCreated} hazards · {diagnostics.counts.playerProjectiles + diagnostics.counts.enemyProjectiles + diagnostics.counts.turretProjectiles} active projectiles · {diagnostics.counts.zombies} enemies · {diagnostics.counts.arenaObjects} arena objects</strong>
                <span>Events / capture</span><strong>{diagnostics.eventCountTotals.hitEvents} hits · {diagnostics.eventCountTotals.enemyDamageEvents} enemy damage · {diagnostics.eventCountTotals.enemyDeathEvents} deaths · {diagnostics.eventCountTotals.arenaObjectDestructionEvents} objects destroyed · {diagnostics.eventCountTotals.explosionsCreated} explosions · {diagnostics.eventCountTotals.hazardsCreated} hazards · {diagnostics.eventCountTotals.orbsGenerated}/{diagnostics.eventCountTotals.orbsCollected} orbs generated/collected · {diagnostics.eventCountTotals.splitterOffspringCreated} Splitter offspring · {diagnostics.eventCountTotals.temporaryEffectsCreated} temporary effects</strong>
                <span>Event p95 / max</span><strong>p95 shown after 20 samples; max covers capture</strong>
                {diagnostics.eventTimings.map((event) => (
                  <Fragment key={event.name}>
                    <span>{event.name} ({event.sampleCount})</span>
                    <strong>{event.sampleCount >= 20 ? `${event.p95Ms.toFixed(3)} ms p95` : `p95 n/a (${event.sampleCount} samples)`} · {event.maxMs.toFixed(3)} ms max · {event.totalMs.toFixed(3)} ms total</strong>
                  </Fragment>
                ))}
                <span>Arena render / floor</span><strong>{diagnostics.timings.arenaRenderMs.toFixed(2)} / {diagnostics.timings.arenaFloorMs.toFixed(2)} ms</strong>
                <span>Background cache</span><strong>{diagnostics.arenaBackgroundCache.generationCount} generated · {diagnostics.arenaBackgroundCache.cacheRebuildCount} cache builds</strong>
                <span>Heap</span><strong>{diagnostics.memoryUsageBytes === null ? 'unavailable' : `${(diagnostics.memoryUsageBytes / 1024 / 1024).toFixed(1)} MB (${diagnostics.memoryTrend})`}</strong>
                <span>Entities</span><strong>{diagnostics.counts.totalActiveEntities} current / {diagnostics.peakCounts.totalActiveEntities} peak · {diagnostics.counts.zombies} zombies · {diagnostics.counts.playerProjectiles}/{diagnostics.counts.enemyProjectiles}/{diagnostics.counts.turretProjectiles} player/enemy/turret shots</strong>
                <span>Objects</span><strong>{diagnostics.counts.arenaObstacles} obstacles · {diagnostics.counts.militaryObjects} military · {diagnostics.counts.industrialObjects} industrial · {diagnostics.counts.contaminatedObjects} contaminated · {diagnostics.counts.destructibleObjects} destructible · {diagnostics.counts.movingObjects} moving</strong>
                <span>Effects</span><strong>{diagnostics.counts.explosions} explosions · {diagnostics.counts.activeEffects} effects · {diagnostics.counts.hazards} hazards · {diagnostics.counts.items} items</strong>
                <span>Canvas</span><strong>{diagnostics.canvasMetrics.width}×{diagnostics.canvasMetrics.height} backing · {diagnostics.canvasMetrics.cssWidth.toFixed(0)}×{diagnostics.canvasMetrics.cssHeight.toFixed(0)} CSS · DPR {diagnostics.canvasMetrics.devicePixelRatio.toFixed(2)} · {diagnostics.canvasMetrics.resizeCount} resizes</strong>
                <span>Browser render pipeline</span><strong>Paint/raster/compositor/GPU per frame unavailable in-page; Paint Timing {diagnostics.browserMetrics.paintTimingSupport}; React commit not instrumented</strong>
                  </div>
                  <div className="game-performance-thresholds">
                <span>Frame thresholds (ms)</span>
                {diagnosticThresholds.map((threshold, index) => (
                  <input
                    key={index}
                    type="number"
                    min="0.1"
                    step="0.1"
                    aria-label={`Frame threshold ${index + 1}`}
                    value={threshold}
                    onChange={(event) =>
                      updateDiagnosticThreshold(index as 0 | 1 | 2, event.target.value)
                    }
                  />
                ))}
                  </div>
                  {diagnostics.spikes.length > 0 && (
                    <div className="game-performance-spikes">
                  <strong>Recent spikes</strong>
                  {diagnostics.spikes.slice(-5).reverse().map((spike) => (
                    <div key={`${spike.timestamp}-${spike.wave}`}>
                      {spike.wallClockTimestamp} · interval {spike.frameTimeMs.toFixed(1)} ms · callback {spike.frameCallbackMs.toFixed(1)} ms · update {spike.updateMs.toFixed(1)} ms · projectile processing {spike.events.totalMs.projectileProcessing.toFixed(2)} ms · hits {spike.events.counts.hitEvents} · deaths {spike.events.counts.enemyDeathEvents} · objects destroyed {spike.events.counts.arenaObjectDestructionEvents} · previous callback {spike.previousCallbackDurationMs.toFixed(1)} ms · RAF gap ≈ {spike.estimatedSchedulingGapMs.toFixed(1)} ms · wave {spike.wave} · {spike.arena} · {spike.counts.totalActiveEntities} entities · {spike.correlatedLongTasks.length} long tasks · {spike.correlatedGarbageCollections.length} GC · {spike.correlatedUiPolls.length} UI polls · timeline {spike.precedingFrameTimesMs.slice(-3).map((value) => value.toFixed(1)).join(' → ')} → spike → {spike.followingFrameTimesMs.map((value) => value.toFixed(1)).join(' → ')}
                    </div>
                  ))}
                    </div>
                  )}
              </div>
              {diagnosticsError && <p role="alert">{diagnosticsError}</p>}
            </section>
          )}
        </aside>
      )}
      {renderError && (
        <div className="game-canvas-error" role="alert">
          {renderError}
        </div>
      )}
    </div>
  );
}
