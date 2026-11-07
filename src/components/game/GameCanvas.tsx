import { Fragment, useCallback, useEffect, useRef, useState } from 'react';
import { Maximize, Minimize } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { GameEngine } from '@/game/core/GameEngine';
import { GAME_TOUCH_CONTROLS_MEDIA_QUERY } from '@/game/core/GameConfig';
import { supportsTouchControls } from '@/game/core/ControlSettings';
import type { ControlPoint, ControlZones } from '@/game/core/TouchControlGeometry';
import type { GamePerformanceSnapshot } from '@/game/core/GamePerformanceDiagnostics';
import {
  GameAudioController,
  GAME_MUSIC_TRACKS,
  getMusicTrackName,
} from '@/game/audio/GameAudioController';
import {
  notifyNewBossDiscoveries,
  notifyNewEnemyDiscoveries,
} from '@/game/discovery/EnemyDiscovery';
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
import { formatGameKeyCode } from '@/game/core/GameSettings';
import type { RareUpgradeId } from '@/game/upgrades';
import type { GameMenuMode } from './GameMenuTypes';
import { GameMusicPlayer } from './GameMusicPlayer';
import { GameHud } from './GameHud';
import { GameMenuOverlay } from './GameMenuOverlay';
import { GamePauseButton } from './GamePauseButton';
import { GamePhaseOverlays } from './GamePhaseOverlays';
import { GameTouchControls, positionFloatingStick } from './GameTouchControls';
import { useFullscreenState } from './useFullscreenState';
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

interface KeyboardLockNavigator extends Navigator {
  readonly keyboard?: {
    lock(keyCodes?: string[]): Promise<void>;
    unlock(): void;
  };
}

function getAngleDifference(left: number, right: number): number {
  return Math.atan2(Math.sin(left - right), Math.cos(left - right));
}

export function GameCanvas() {
  const { t } = useTranslation();
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fullscreenRequestPendingRef = useRef(false);
  const fullscreenExitPendingRef = useRef(false);
  const isActivelyPlayingRef = useRef(false);
  const lastFullscreenEscapeToastAtRef = useRef(0);
  const escapeHoldTimeoutRef = useRef<number | null>(null);
  const escapeBurstResetTimeoutRef = useRef<number | null>(null);
  const escapeTapCountRef = useRef(0);
  const lastEscapeTapAtRef = useRef(0);
  const escapeRepeatToastShownRef = useRef(false);
  const movementJoystickRef = useRef<HTMLButtonElement>(null);
  const aimJoystickRef = useRef<HTMLButtonElement>(null);
  const bombControlRef = useRef<HTMLDivElement>(null);
  const touchControlsRootRef = useRef<HTMLDivElement>(null);
  const touchControlZonesRef = useRef<ControlZones | null>(null);
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
  const isFullscreen = useFullscreenState();
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
  const {
    settings,
    error: settingsError,
    updateSettings,
  } = useGameSettings();
  const [isResponsiveLayout, setIsResponsiveLayout] = useState(
    () =>
      typeof window !== 'undefined' &&
      typeof window.matchMedia === 'function' &&
      window.matchMedia(GAME_TOUCH_CONTROLS_MEDIA_QUERY).matches,
  );
  const [isTouchCapable, setIsTouchCapable] = useState(
    () =>
      typeof window !== 'undefined' &&
      supportsTouchControls(
        typeof window.matchMedia === 'function' &&
          window.matchMedia('(pointer: coarse)').matches,
        window.navigator.maxTouchPoints,
      ),
  );
  const shouldMountTouchControls =
    settings.touchControls === 'always' ||
    (settings.touchControls === 'auto' &&
      isResponsiveLayout &&
      isTouchCapable);
  const touchControlsActive =
    hasStarted &&
    !isPaused &&
    gameState?.wave.phase === 'combat';

  const handleTouchZonesChange = useCallback((zones: ControlZones | null) => {
    touchControlZonesRef.current = zones;
    engineRef.current?.updateTouchZones();
  }, []);

  const positionStick = useCallback(
    (
      stick: 'movement' | 'aim',
      point: ControlPoint | null,
      zones: ControlZones,
    ) => {
      positionFloatingStick(
        touchControlsRootRef.current,
        stick,
        stick === 'movement'
          ? movementJoystickRef.current
          : aimJoystickRef.current,
        point,
        zones,
      );
    },
    [],
  );

  const requestGameFullscreen = () => {
    const container = containerRef.current;
    if (
      !container ||
      !document.fullscreenEnabled ||
      document.fullscreenElement ||
      fullscreenRequestPendingRef.current
    ) {
      return;
    }

    fullscreenRequestPendingRef.current = true;
    void container.requestFullscreen().then(
      () => {
        fullscreenRequestPendingRef.current = false;
      },
      () => {
        fullscreenRequestPendingRef.current = false;
      },
    );
  };

  const toggleGameFullscreen = () => {
    if (document.fullscreenElement) {
      exitGameFullscreen();
    } else {
      requestGameFullscreen();
    }
  };

  const exitGameFullscreen = () => {
    if (!document.fullscreenElement || fullscreenExitPendingRef.current) return;
    fullscreenExitPendingRef.current = true;
    void document.exitFullscreen().then(
      () => {
        fullscreenExitPendingRef.current = false;
      },
      () => {
        fullscreenExitPendingRef.current = false;
        toast.error(t('game.notifications.fullscreenExitFailed'));
      },
    );
  };

  useEffect(() => {
    const keyboard = (navigator as KeyboardLockNavigator).keyboard;
    const syncEscapeLock = () => {
      if (document.fullscreenElement === containerRef.current) {
        void keyboard?.lock(['Escape']).catch(() => undefined);
      } else {
        keyboard?.unlock();
      }
    };

    document.addEventListener('fullscreenchange', syncEscapeLock);
    syncEscapeLock();
    return () => {
      document.removeEventListener('fullscreenchange', syncEscapeLock);
      keyboard?.unlock();
    };
  }, []);

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
    const coarsePointerQuery = window.matchMedia('(pointer: coarse)');
    const updateTouchCapability = () => {
      setIsTouchCapable(
        supportsTouchControls(
          coarsePointerQuery.matches,
          window.navigator.maxTouchPoints,
        ),
      );
    };
    updateTouchCapability();
    coarsePointerQuery.addEventListener('change', updateTouchCapability);
    return () =>
      coarsePointerQuery.removeEventListener('change', updateTouchCapability);
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
          for (let shot = 0; shot < newShots; shot += 1) {
            audioRef.current?.playCue(
              'shoot',
              1,
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
              toast.success(t('game.notifications.discovered', {
                name: t(`game.enemies.${enemyType}.name`),
              }), {
                description: t('game.notifications.firstEncounter'),
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
              toast.success(t('game.notifications.discovered', {
                name: t(`game.bosses.${bossType}`),
              }), {
                description: t('game.notifications.firstEncounter'),
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
          : t('game.notifications.renderInitFailed'),
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
      movement && aim
        ? {
            movement,
            aim,
            surface: containerRef.current ?? undefined,
            gameplaySurface: canvasRef.current ?? undefined,
            getZones: () => touchControlZonesRef.current,
            settings: settings.touchControlSettings,
            positionStick,
            active: touchControlsActive,
          }
        : null,
    );
  }, [
    positionStick,
    settings.touchControlSettings,
    shouldMountTouchControls,
    touchControlsActive,
  ]);

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
        toast.error(t('game.notifications.campaignLocked'));
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
    isActivelyPlayingRef.current = false;
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
          ? t('game.notifications.campaignProgressSaveFailed', { error: error.message })
          : t('game.notifications.campaignProgressSaveFailedSimple'),
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
          ? t('game.notifications.campaignPointsSaveFailed', { error: error.message })
          : t('game.notifications.campaignPointsSaveFailedSimple'),
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
        error instanceof Error ? error.message : t('game.diagnostics.thresholdUpdateFailed'),
      );
    }
  };

  const exportDiagnostics = () => {
    try {
      const report = engineRef.current?.exportPerformanceReport();
      if (!report) throw new Error(t('game.diagnostics.unavailable'));
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
        error instanceof Error ? error.message : t('game.diagnostics.exportFailed'),
      );
    }
  };

  const isTerminalPhase =
    gameState?.wave.phase === 'gameOver' ||
    gameState?.wave.phase === 'levelComplete';

  isActivelyPlayingRef.current =
    hasStarted &&
    !isPaused &&
    !isTerminalPhase &&
    tutorialStepIndex === null;

  useEffect(() => {
    let wasGameFullscreen =
      document.fullscreenElement === containerRef.current;
    const handleFullscreenChange = () => {
      const isGameFullscreen =
        document.fullscreenElement === containerRef.current;
      if (
        wasGameFullscreen &&
        !isGameFullscreen &&
        isActivelyPlayingRef.current
      ) {
        if (
          !fullscreenExitPendingRef.current &&
          Date.now() - lastFullscreenEscapeToastAtRef.current > 750
        ) {
          toast.info(
            t('game.notifications.fullscreenPauseShortcut', {
              key: formatGameKeyCode(settings.alternatePauseKey),
            }),
          );
        }
        pauseRun();
      }
      wasGameFullscreen = isGameFullscreen;
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () =>
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, [settings.alternatePauseKey, t]);

  const isGameInProgress =
    hasStarted && gameState?.wave.phase !== 'levelComplete';

  useEffect(() => {
    if (!isGameInProgress) return;

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isGameInProgress]);

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
    const handleGameShortcut = (event: KeyboardEvent) => {
      if (
        event.target instanceof Element &&
        event.target.closest('.game-settings-panel')
      ) {
        return;
      }

      if (event.code === 'Escape') {
        if (document.fullscreenElement) {
          event.preventDefault();
          if (!event.repeat && hasStarted && !isTerminalPhase) {
            lastFullscreenEscapeToastAtRef.current = Date.now();
            toast.info(
              t('game.notifications.fullscreenPauseShortcut', {
                key: formatGameKeyCode(settings.alternatePauseKey),
              }),
            );
          }
          if (event.repeat) {
            if (!escapeRepeatToastShownRef.current) {
              toast.info(t('game.notifications.fullscreenHoldEscape'));
              escapeRepeatToastShownRef.current = true;
            }
          } else {
            const now = Date.now();
            if (now - lastEscapeTapAtRef.current <= 750) {
              escapeTapCountRef.current += 1;
            } else {
              escapeTapCountRef.current = 1;
              escapeRepeatToastShownRef.current = false;
            }
            lastEscapeTapAtRef.current = now;
            if (
              escapeTapCountRef.current >= 2 &&
              !escapeRepeatToastShownRef.current
            ) {
              toast.info(t('game.notifications.fullscreenHoldEscape'));
              escapeRepeatToastShownRef.current = true;
            }
            if (escapeBurstResetTimeoutRef.current !== null) {
              window.clearTimeout(escapeBurstResetTimeoutRef.current);
            }
            escapeBurstResetTimeoutRef.current = window.setTimeout(() => {
              escapeTapCountRef.current = 0;
              lastEscapeTapAtRef.current = 0;
              escapeRepeatToastShownRef.current = false;
              escapeBurstResetTimeoutRef.current = null;
            }, 900);
            if (escapeHoldTimeoutRef.current !== null) {
              window.clearTimeout(escapeHoldTimeoutRef.current);
            }
            escapeHoldTimeoutRef.current = window.setTimeout(() => {
              escapeHoldTimeoutRef.current = null;
              exitGameFullscreen();
            }, 1200);
          }
        } else if (event.repeat) {
          return;
        }

        if (event.repeat || !hasStarted || isTerminalPhase) return;
        event.preventDefault();
        if (isPaused) resumeRun();
        else pauseRun();
        return;
      }

      if (
        event.code !== settings.alternatePauseKey ||
        event.repeat ||
        !hasStarted ||
        isTerminalPhase
      ) {
        return;
      }
      event.preventDefault();
      if (isPaused) resumeRun();
      else pauseRun();
    };

    const handleGameShortcutKeyUp = (event: KeyboardEvent) => {
      if (event.code !== 'Escape') return;
      if (escapeHoldTimeoutRef.current !== null) {
        window.clearTimeout(escapeHoldTimeoutRef.current);
        escapeHoldTimeoutRef.current = null;
      }
    };

    window.addEventListener('keydown', handleGameShortcut, true);
    window.addEventListener('keyup', handleGameShortcutKeyUp, true);
    return () => {
      window.removeEventListener('keydown', handleGameShortcut, true);
      window.removeEventListener('keyup', handleGameShortcutKeyUp, true);
      if (escapeHoldTimeoutRef.current !== null) {
        window.clearTimeout(escapeHoldTimeoutRef.current);
      }
      if (escapeBurstResetTimeoutRef.current !== null) {
        window.clearTimeout(escapeBurstResetTimeoutRef.current);
      }
    };
  }, [hasStarted, isPaused, isTerminalPhase, settings.alternatePauseKey, t]);

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
  const showPauseButton =
    hasStarted &&
    !isPaused &&
    gameState?.wave.phase === 'combat';
  const showFullscreenButton =
    menuMode === 'pause' ||
    (isResponsiveLayout && (menuMode === 'main' || showPauseButton));

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
        aria-label={t('game.canvas.ariaLabel')}
        onPointerDown={(event) => event.currentTarget.focus()}
      >
        {t('game.canvas.notSupported')}
      </canvas>
      {shouldMountTouchControls && (
        <GameTouchControls
          rootRef={touchControlsRootRef}
          active={touchControlsActive}
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
          controlSettings={settings.touchControlSettings}
          onZonesChange={handleTouchZonesChange}
          movementRef={movementJoystickRef}
          aimRef={aimJoystickRef}
          bombRef={bombControlRef}
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
      {showPauseButton && (
        <GamePauseButton onPause={pauseRun} />
      )}
      {showFullscreenButton && (
        <button
          className="game-fullscreen-button"
          data-near-pause={showPauseButton}
          type="button"
          onClick={toggleGameFullscreen}
          aria-label={t(
            isFullscreen
              ? 'game.fullscreenButton.exit'
              : 'game.fullscreenButton.enter',
          )}
          title={t(
            isFullscreen
              ? 'game.fullscreenButton.exit'
              : 'game.fullscreenButton.enter',
          )}
        >
          {isFullscreen ? (
            <Minimize aria-hidden="true" />
          ) : (
            <Maximize aria-hidden="true" />
          )}
        </button>
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
