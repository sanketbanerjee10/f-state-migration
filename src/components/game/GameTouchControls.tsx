import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type RefObject,
} from 'react';
import { useTranslation } from 'react-i18next';
import { Bomb } from 'lucide-react';
import type { ControlSettings } from '@/game/core/ControlSettings';
import {
  computeZones,
  type ControlPoint,
  type ControlZones,
} from '@/game/core/TouchControlGeometry';
import { GameJoystickVisual } from './GameJoystickVisual';

interface GameTouchControlsProps {
  readonly active: boolean;
  readonly bombs: number;
  readonly controlSettings: ControlSettings;
  readonly highlightMovement?: boolean;
  readonly highlightAim?: boolean;
  readonly onUseBomb: () => void;
  readonly onZonesChange: (zones: ControlZones | null) => void;
  readonly rootRef: RefObject<HTMLDivElement | null>;
  readonly movementRef: RefObject<HTMLButtonElement | null>;
  readonly aimRef: RefObject<HTMLButtonElement | null>;
  readonly bombRef: RefObject<HTMLDivElement | null>;
}

function readSafeAreaInsets(element: HTMLElement) {
  const styles = getComputedStyle(element);
  const readInset = (name: string) => {
    const parsed = Number.parseFloat(styles.getPropertyValue(name));
    return Number.isFinite(parsed) ? parsed : 0;
  };
  return {
    top: readInset('--touch-safe-top'),
    right: readInset('--touch-safe-right'),
    bottom: readInset('--touch-safe-bottom'),
    left: readInset('--touch-safe-left'),
  };
}

export function GameTouchControls({
  active,
  bombs,
  controlSettings,
  highlightMovement = false,
  highlightAim = false,
  onUseBomb,
  onZonesChange,
  rootRef,
  movementRef,
  aimRef,
  bombRef,
}: GameTouchControlsProps) {
  const { t } = useTranslation();
  const [zones, setZones] = useState<ControlZones | null>(null);
  const settingsRef = useRef(controlSettings);
  settingsRef.current = controlSettings;

  const updateZones = useCallback(() => {
    const root = rootRef.current;
    if (!root) return;
    const bounds = root.getBoundingClientRect();
    if (bounds.width <= 0 || bounds.height <= 0) return;

    const nextZones = computeZones(
      bounds,
      readSafeAreaInsets(root),
      settingsRef.current.layout,
      { size: settingsRef.current.joystickSize },
    );
    setZones(nextZones);
    onZonesChange(nextZones);
  }, [onZonesChange, rootRef]);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const observer = new ResizeObserver(updateZones);
    observer.observe(root);
    window.addEventListener('resize', updateZones);
    window.addEventListener('orientationchange', updateZones);
    window.visualViewport?.addEventListener('resize', updateZones);
    updateZones();

    return () => {
      observer.disconnect();
      window.removeEventListener('resize', updateZones);
      window.removeEventListener('orientationchange', updateZones);
      window.visualViewport?.removeEventListener('resize', updateZones);
      onZonesChange(null);
    };
  }, [
    controlSettings.joystickSize,
    controlSettings.layout,
    onZonesChange,
    rootRef,
    updateZones,
  ]);

  useEffect(() => {
    const root = rootRef.current;
    const movement = movementRef.current;
    const aim = aimRef.current;
    const bomb = bombRef.current;
    if (!root || !movement || !aim || !bomb || !zones) return;
    const rootBounds = root.getBoundingClientRect();
    const diameter = `${zones.joystickDiameter}px`;
    movement.style.width = diameter;
    movement.style.height = diameter;
    aim.style.width = diameter;
    aim.style.height = diameter;
    bomb.style.left = `${
      zones.aim.left - rootBounds.left + zones.aim.width * 0.8
    }px`;
    bomb.style.top = `${
      zones.aim.top - rootBounds.top + zones.aim.height * 0.8
    }px`;
  }, [aimRef, bombRef, movementRef, rootRef, zones]);

  return (
    <div
      ref={rootRef}
      className={`game-mobile-controls ${active ? '' : 'game-mobile-controls-hidden'}`}
      data-layout={controlSettings.layout}
      data-movement-active="false"
      data-aim-active="false"
      style={
        {
          '--joy-base-a': controlSettings.baseOpacity / 100,
          '--joy-thumb-a': controlSettings.thumbOpacity / 100,
        } as CSSProperties
      }
      role="group"
      aria-label={t('game.touch.controls')}
    >
      <button
        ref={movementRef}
        className={`game-joystick game-joystick-movement${highlightMovement ? ' game-joystick-highlighted' : ''}`}
        type="button"
        aria-label={t('game.touch.movement')}
      >
        <GameJoystickVisual />
      </button>
      <div ref={bombRef} className="game-bomb-control">
        <button
          type="button"
          className="game-bomb-button"
          aria-label={t('game.touch.useBomb', { count: bombs })}
          disabled={bombs <= 0}
          onClick={onUseBomb}
        >
          <Bomb aria-hidden="true" />
        </button>
      </div>
      <button
        ref={aimRef}
        className={`game-joystick game-joystick-aim${highlightAim ? ' game-joystick-highlighted' : ''}`}
        type="button"
        aria-label={t('game.touch.aim')}
      >
        <GameJoystickVisual />
      </button>
    </div>
  );
}

export function positionFloatingStick(
  root: HTMLElement | null,
  stick: 'movement' | 'aim',
  element: HTMLElement | null,
  point: ControlPoint | null,
  zones: ControlZones,
): void {
  if (!root || !element) return;
  const activeAttribute =
    stick === 'movement' ? 'data-movement-active' : 'data-aim-active';
  if (!point) {
    root.setAttribute(activeAttribute, 'false');
    return;
  }

  const bounds = root.getBoundingClientRect();
  element.style.left = `${point.x - bounds.left}px`;
  element.style.top = `${point.y - bounds.top}px`;
  element.style.width = `${zones.joystickDiameter}px`;
  element.style.height = `${zones.joystickDiameter}px`;
  root.setAttribute(activeAttribute, 'true');
}
