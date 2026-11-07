import { describe, expect, it } from 'vitest';
import {
  DEFAULT_CONTROL_SETTINGS,
  normalizeControlSettings,
  supportsTouchControls,
} from '@/game/core/ControlSettings';

describe('control settings', () => {
  it('uses the fresh-install defaults for absent and corrupt control settings', () => {
    expect(normalizeControlSettings(null)).toEqual(DEFAULT_CONTROL_SETTINGS);
    expect(normalizeControlSettings('corrupt')).toEqual(DEFAULT_CONTROL_SETTINGS);
  });

  it('fills missing fields and clamps opacity to integer percentages', () => {
    expect(
      normalizeControlSettings({
        layout: 'left',
        baseOpacity: 101.2,
        thumbOpacity: -12.4,
      }),
    ).toEqual({
      ...DEFAULT_CONTROL_SETTINGS,
      layout: 'left',
      baseOpacity: 100,
      thumbOpacity: 0,
    });
  });

  it('rejects unknown enum values and non-finite opacity values', () => {
    expect(
      normalizeControlSettings({
        layout: 'ambidextrous',
        joystickMode: 'automatic',
        joystickPosition: 'center',
        joystickSize: 'huge',
        baseOpacity: Number.NaN,
        thumbOpacity: Number.POSITIVE_INFINITY,
      }),
    ).toEqual(DEFAULT_CONTROL_SETTINGS);
  });

  it('ignores legacy fixed-mode fields after migrating to floating-only controls', () => {
    expect(
      normalizeControlSettings({
        joystickMode: 'fixed',
        joystickPosition: 'bottom-left',
      }),
    ).toEqual({
      ...DEFAULT_CONTROL_SETTINGS,
      baseOpacity: 40,
      thumbOpacity: 40,
    });
  });

  it('uses the previous appearance for saved settings with missing opacity values', () => {
    expect(
      normalizeControlSettings({
        layout: 'left',
        joystickMode: 'fixed',
        joystickPosition: 'edge',
      }),
    ).toEqual({
      ...DEFAULT_CONTROL_SETTINGS,
      layout: 'left',
      baseOpacity: 40,
      thumbOpacity: 40,
    });
  });

  it('enables touch controls for coarse pointers or touch-capable devices', () => {
    expect(supportsTouchControls(true, 0)).toBe(true);
    expect(supportsTouchControls(false, 2)).toBe(true);
    expect(supportsTouchControls(false, 0)).toBe(false);
  });
});
