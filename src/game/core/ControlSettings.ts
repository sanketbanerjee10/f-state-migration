export type ControlLayout = 'right' | 'left';
export type JoystickSize = 'small' | 'medium' | 'large';

export interface ControlSettings {
  readonly layout: ControlLayout;
  readonly baseOpacity: number;
  readonly thumbOpacity: number;
  readonly joystickSize: JoystickSize;
}

export const DEFAULT_CONTROL_SETTINGS: ControlSettings = {
  layout: 'right',
  baseOpacity: 45,
  thumbOpacity: 75,
  joystickSize: 'medium',
};

const LEGACY_CONTROL_SETTINGS: ControlSettings = {
  ...DEFAULT_CONTROL_SETTINGS,
  baseOpacity: 40,
  thumbOpacity: 40,
};

const CONTROL_LAYOUTS: readonly ControlLayout[] = ['right', 'left'];
const JOYSTICK_SIZES: readonly JoystickSize[] = ['small', 'medium', 'large'];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function normalizeEnum<Value extends string>(
  value: unknown,
  values: readonly Value[],
  fallback: Value,
): Value {
  return typeof value === 'string' && values.includes(value as Value)
    ? (value as Value)
    : fallback;
}

function normalizeOpacity(
  value: unknown,
  missingFallback: number,
  invalidFallback: number,
): number {
  if (value === undefined) return missingFallback;
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return invalidFallback;
  }
  return Math.max(0, Math.min(100, Math.round(value)));
}

export function normalizeControlSettings(raw: unknown): ControlSettings {
  const hasSavedSettings = isRecord(raw);
  const settings = hasSavedSettings ? raw : {};
  const opacityFallbacks = hasSavedSettings
    ? LEGACY_CONTROL_SETTINGS
    : DEFAULT_CONTROL_SETTINGS;
  const layout = normalizeEnum(
    settings.layout,
    CONTROL_LAYOUTS,
    DEFAULT_CONTROL_SETTINGS.layout,
  );
  return {
    layout,
    baseOpacity: normalizeOpacity(
      settings.baseOpacity,
      opacityFallbacks.baseOpacity,
      DEFAULT_CONTROL_SETTINGS.baseOpacity,
    ),
    thumbOpacity: normalizeOpacity(
      settings.thumbOpacity,
      opacityFallbacks.thumbOpacity,
      DEFAULT_CONTROL_SETTINGS.thumbOpacity,
    ),
    joystickSize: normalizeEnum(
      settings.joystickSize,
      JOYSTICK_SIZES,
      DEFAULT_CONTROL_SETTINGS.joystickSize,
    ),
  };
}

export function supportsTouchControls(
  coarsePointer: boolean,
  maxTouchPoints: number,
): boolean {
  return coarsePointer || maxTouchPoints > 0;
}
