import type { ControlLayout, JoystickSize } from './ControlSettings';

export interface ControlRect {
  readonly left: number;
  readonly top: number;
  readonly width: number;
  readonly height: number;
}

export interface SafeAreaInsets {
  readonly top: number;
  readonly right: number;
  readonly bottom: number;
  readonly left: number;
}

export interface ControlPoint {
  readonly x: number;
  readonly y: number;
}

export interface ControlZones {
  readonly movement: ControlRect;
  readonly aim: ControlRect;
  readonly joystickDiameter: number;
  readonly viewport: ControlRect;
}

export interface ZoneOptions {
  readonly size?: JoystickSize;
  readonly joystickDiameter?: number;
}

export interface JoystickVector {
  x: number;
  y: number;
}

const SIZE_SCALE: Record<JoystickSize, number> = {
  small: 0.8,
  medium: 1,
  large: 1.25,
};

const DEFAULT_SAFE_AREA: SafeAreaInsets = {
  top: 0,
  right: 0,
  bottom: 0,
  left: 0,
};

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function getDefaultDiameter(
  viewport: ControlRect,
  movementZone: ControlRect,
  size: JoystickSize,
): number {
  const landscapeCompact =
    viewport.width > viewport.height && viewport.height <= 520;
  const base = landscapeCompact
    ? Math.min(viewport.width * 0.23, 112)
    : clamp(viewport.width * 0.27, 108, 148);
  return Math.min(
    base * SIZE_SCALE[size],
    movementZone.width * 0.8,
    movementZone.height * 0.8,
  );
}

export function computeZones(
  viewport: ControlRect,
  safeArea: SafeAreaInsets = DEFAULT_SAFE_AREA,
  handedness: ControlLayout = 'right',
  options: ZoneOptions = {},
): ControlZones {
  const usableLeft = viewport.left + safeArea.left;
  const usableTop = viewport.top + safeArea.top;
  const usableRight = viewport.left + viewport.width - safeArea.right;
  const usableBottom = viewport.top + viewport.height - safeArea.bottom;
  const usableWidth = Math.max(0, usableRight - usableLeft);
  const usableHeight = Math.max(0, usableBottom - usableTop);
  const halfWidth = usableWidth / 2;
  const leftZone: ControlRect = {
    left: usableLeft,
    top: usableTop,
    width: halfWidth,
    height: usableHeight,
  };
  const rightZone: ControlRect = {
    left: usableLeft + halfWidth,
    top: usableTop,
    width: usableWidth - halfWidth,
    height: usableHeight,
  };
  const movement = handedness === 'right' ? leftZone : rightZone;
  const aim = handedness === 'right' ? rightZone : leftZone;
  const joystickDiameter = Math.min(
    options.joystickDiameter ??
      getDefaultDiameter(viewport, movement, options.size ?? 'medium'),
    movement.width * 0.8,
    movement.height * 0.8,
  );

  return {
    movement,
    aim,
    joystickDiameter,
    viewport,
  };
}

export function clampFloatingBase(
  point: ControlPoint,
  zone: ControlRect,
  diameter: number,
): ControlPoint {
  const radius = Math.min(diameter / 2, zone.width / 2, zone.height / 2);
  return {
    x: clamp(point.x, zone.left + radius, zone.left + zone.width - radius),
    y: clamp(point.y, zone.top + radius, zone.top + zone.height - radius),
  };
}

export function updateJoystickVector(
  dx: number,
  dy: number,
  radius: number,
  deadZone: number,
  output: JoystickVector,
): void {
  if (radius <= 0) {
    output.x = 0;
    output.y = 0;
    return;
  }

  let x = dx / radius;
  let y = dy / radius;
  const magnitude = Math.hypot(x, y);
  if (magnitude > 1) {
    x /= magnitude;
    y /= magnitude;
  }
  if (Math.hypot(x, y) < deadZone) {
    x = 0;
    y = 0;
  }
  output.x = x;
  output.y = y;
}
