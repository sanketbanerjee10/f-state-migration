import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { useTranslation } from 'react-i18next';
import { DualJoystickInput } from '@/game/core/DualJoystickInput';
import { resolveTouchControlsInputMode } from '@/game/core/GameSettings';
import { computeZones, type ControlZones } from '@/game/core/TouchControlGeometry';
import { getSiegeStars } from '@/game/siege/SiegeProgress';
import { SiegeEngine, type SiegeRunResult, type SiegeRuntimeState } from '@/game/siege/SiegeEngine';
import { GamePauseButton } from './GamePauseButton';
import { GameJoystickVisual } from './GameJoystickVisual';
import { positionFloatingStick } from './GameTouchControls';
import type { SiegePauseView } from './SiegeRunOverlays';
import { useGameSettings } from './useGameSettings';
import { getInitialRuntimeState, type ActiveSiegeRun } from './siege/SiegeGameUtils';
import { SiegeRunOverlays } from './SiegeRunOverlays';

interface SiegePlaySessionProps {
  readonly run: ActiveSiegeRun;
  readonly saveError: string | null;
  readonly onComplete: (result: SiegeRunResult) => void;
  readonly onExit: () => void;
  readonly onMainMenu: () => void;
  readonly onPlayAgain: () => void;
  readonly onChooseLevel: () => void;
  readonly onNextLevel?: () => void;
}

export function SiegePlaySession({
  run,
  saveError,
  onComplete,
  onExit,
  onMainMenu,
  onPlayAgain,
  onChooseLevel,
  onNextLevel,
}: SiegePlaySessionProps) {
  const { t } = useTranslation();
  const { settings, error: settingsError, updateSettings } = useGameSettings();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const touchRootRef = useRef<HTMLDivElement>(null);
  const movementJoystickRef = useRef<HTMLButtonElement>(null);
  const aimJoystickRef = useRef<HTMLButtonElement>(null);
  const engineRef = useRef<SiegeEngine | null>(null);
  const onCompleteRef = useRef(onComplete);
  const [runtime, setRuntime] = useState(() => getInitialRuntimeState(run));
  const [pauseView, setPauseView] = useState<SiegePauseView>('menu');
  const [engineInstance, setEngineInstance] = useState<SiegeEngine | null>(null);
  const [engineError, setEngineError] = useState<string | null>(null);
  const [inputEnvironment, setInputEnvironment] = useState(() => ({
    viewportWidth: window.innerWidth,
    coarsePointer: window.matchMedia('(pointer: coarse)').matches,
  }));
  const activeInputMode = resolveTouchControlsInputMode(
    settings.touchControls,
    inputEnvironment.viewportWidth,
    inputEnvironment.coarsePointer,
  );
  const shouldMountTouchControls = activeInputMode === 'touch';
  onCompleteRef.current = onComplete;

  useEffect(() => {
    const coarsePointerQuery = window.matchMedia('(pointer: coarse)');
    const updateInputEnvironment = () => {
      setInputEnvironment({
        viewportWidth: window.innerWidth,
        coarsePointer: coarsePointerQuery.matches,
      });
    };
    window.addEventListener('resize', updateInputEnvironment);
    coarsePointerQuery.addEventListener('change', updateInputEnvironment);
    return () => {
      window.removeEventListener('resize', updateInputEnvironment);
      coarsePointerQuery.removeEventListener('change', updateInputEnvironment);
    };
  }, []);

  useEffect(() => {
    if (runtime.phase === 'paused') setPauseView('menu');
  }, [runtime.phase]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let engine: SiegeEngine;
    try {
      engine = new SiegeEngine({
        canvas,
        data: run.data,
        level: run.level,
        onState: setRuntime,
        onComplete: (result) => onCompleteRef.current(result),
        onPauseRequest: () => engineRef.current?.pause(),
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setEngineError(message);
      console.error('Unable to start the Siege game engine.', error);
      return;
    }

    engineRef.current = engine;
    setEngineInstance(engine);
    canvas.focus();

    const resize = () => engine.resize();
    window.addEventListener('resize', resize);
    const observer = typeof ResizeObserver === 'undefined'
      ? null
      : new ResizeObserver(resize);
    observer?.observe(canvas);

    return () => {
      observer?.disconnect();
      window.removeEventListener('resize', resize);
      engine.dispose();
      if (engineRef.current === engine) engineRef.current = null;
      setEngineInstance(null);
    };
  }, [run]);

  useEffect(() => {
    engineInstance?.setKeyboardMovementEnabled(activeInputMode === 'keyboard');
  }, [activeInputMode, engineInstance]);

  useEffect(() => {
    const engine = engineInstance;
    const canvas = canvasRef.current;
    const root = touchRootRef.current;
    const movement = movementJoystickRef.current;
    const aim = aimJoystickRef.current;
    const surface = canvas?.parentElement;
    if (
      !shouldMountTouchControls ||
      !engine ||
      !canvas ||
      !root ||
      !movement ||
      !aim ||
      !surface
    ) {
      return;
    }

    let zones: ControlZones | null = null;
    const updateZones = () => {
      const bounds = surface.getBoundingClientRect();
      if (bounds.width <= 0 || bounds.height <= 0) return;
      const styles = getComputedStyle(root);
      const inset = (name: string) => {
        const value = Number.parseFloat(styles.getPropertyValue(name));
        return Number.isFinite(value) ? value : 0;
      };
      const standardZones = computeZones(
        bounds,
        {
          top: inset('--touch-safe-top'),
          right: inset('--touch-safe-right'),
          bottom: inset('--touch-safe-bottom'),
          left: inset('--touch-safe-left'),
        },
        settings.touchControlSettings.layout,
        { size: settings.touchControlSettings.joystickSize },
      );
      zones = {
        ...standardZones,
        movement: {
          left: bounds.left + inset('--touch-safe-left'),
          top: bounds.top + inset('--touch-safe-top'),
          width: bounds.width - inset('--touch-safe-left') - inset('--touch-safe-right'),
          height: bounds.height - inset('--touch-safe-top') - inset('--touch-safe-bottom'),
        },
      };
    };
    updateZones();

    const joystick = new DualJoystickInput();
    joystick.attachToZones(
      movement,
      aim,
      (vector) => engine.setMovementInput(vector),
      () => undefined,
      {
        surface,
        gameplaySurface: canvas,
        getZones: () => zones,
        settings: settings.touchControlSettings,
        pointerType: 'any',
        movementAxis: 'horizontal',
        positionStick: (stick, point, currentZones) => {
          positionFloatingStick(
            root,
            stick,
            stick === 'movement' ? movement : aim,
            point,
            currentZones,
          );
        },
      },
    );
    joystick.setEnabled(
      runtime.phase !== 'paused' &&
      runtime.phase !== 'won' &&
      runtime.phase !== 'lost',
    );

    const observer = typeof ResizeObserver === 'undefined'
      ? null
      : new ResizeObserver(updateZones);
    observer?.observe(surface);
    window.addEventListener('resize', updateZones);
    window.addEventListener('orientationchange', updateZones);
    window.visualViewport?.addEventListener('resize', updateZones);

    return () => {
      observer?.disconnect();
      window.removeEventListener('resize', updateZones);
      window.removeEventListener('orientationchange', updateZones);
      window.visualViewport?.removeEventListener('resize', updateZones);
      joystick.detach();
      engine.setMovementInput({ x: 0 });
    };
  }, [
    engineInstance,
    runtime.phase,
    settings.touchControlSettings,
    shouldMountTouchControls,
  ]);

  const pause = () => engineRef.current?.pause();
  const resume = () => {
    engineRef.current?.resume();
    canvasRef.current?.focus();
  };
  const sectionNumber = runtime.sectionIndex + 1;
  const sectionCount = run.level.sections.length;
  const gateProgress = runtime.rowCount > 0
    ? Math.min(1, runtime.rowIndex / runtime.rowCount)
    : 0;
  const stars = runtime.phase === 'won'
    ? getSiegeStars(runtime.troops, run.level.stars)
    : 0;

  return (
    <>
      <canvas
        ref={canvasRef}
        className="game-canvas"
        tabIndex={0}
        aria-label={t('game.siege.canvasLabel', { level: run.level.name })}
      />
      <aside className="game-hud game-hud-compact game-hud-siege" aria-label={t('game.hud.runStatus')}>
        <div className="game-hud-main">
          <div className="game-hud-primary">
            <div className="game-hud-wave">
              <div className="game-hud-wave-heading">
                <span className="game-hud-label">{run.level.name}</span>
                <strong>{sectionNumber}/{sectionCount}</strong>
              </div>
              <div
                className="game-hud-wave-progress"
                role="progressbar"
                aria-valuenow={runtime.rowIndex}
                aria-valuemin={0}
                aria-valuemax={runtime.rowCount}
              >
                <span style={{ width: `${gateProgress * 100}%` }} />
              </div>
            </div>
            <div className="game-hud-stat game-hud-score">
              <span className="game-hud-label">{t('game.siege.troops')}</span>
              <strong>{runtime.troops}</strong>
            </div>
          </div>
          <div className="game-hud-stats">
            {runtime.phase === 'wall' && (
              <div className="game-hud-stat game-hud-bombs">
                <span className="game-hud-label">{t('game.siege.horde')}</span>
                <strong>{runtime.zombiesRemaining}</strong>
              </div>
            )}
          </div>
        </div>
        <span className="game-hud-hint">{t('game.siege.controls')}</span>
      </aside>
      {runtime.phase !== 'won' && runtime.phase !== 'lost' && !engineError && (
        <GamePauseButton onPause={pause} />
      )}
      {shouldMountTouchControls && (
        <div
          ref={touchRootRef}
          className="game-mobile-controls game-siege-touch-controls"
          data-movement-active="false"
          data-aim-active="false"
          style={{
            '--joy-base-a': settings.touchControlSettings.baseOpacity / 100,
            '--joy-thumb-a': settings.touchControlSettings.thumbOpacity / 100,
          } as CSSProperties}
          role="group"
          aria-label={t('game.touch.controls')}
        >
          <button
            ref={movementJoystickRef}
            className="game-joystick game-joystick-movement"
            type="button"
            aria-label={t('game.touch.movement')}
          >
            <GameJoystickVisual
              baseOpacity={settings.touchControlSettings.baseOpacity}
              thumbOpacity={settings.touchControlSettings.thumbOpacity}
            />
          </button>
          <button
            ref={aimJoystickRef}
            className="game-joystick game-joystick-aim siege-joystick-proxy"
            type="button"
            aria-hidden="true"
            tabIndex={-1}
          />
        </div>
      )}
      <SiegeRunOverlays
        run={run}
        runtime={runtime}
        engineError={engineError}
        saveError={saveError}
        stars={stars}
        settings={settings}
        settingsError={settingsError}
        pauseView={pauseView}
        onExit={onExit}
        onResume={resume}
        onPauseViewChange={setPauseView}
        onSettingsChange={updateSettings}
        onMainMenu={onMainMenu}
        onPlayAgain={onPlayAgain}
        onChooseLevel={onChooseLevel}
        onNextLevel={onNextLevel}
      />
    </>
  );
}
