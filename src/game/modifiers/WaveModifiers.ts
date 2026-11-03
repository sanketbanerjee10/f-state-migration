import {
  WAVE_MODIFIER_CONFIG,
  WAVE_MODIFIER_IDS,
} from '../core/GameConfig';
import type { WaveModifierDefinition, WaveModifierId } from '../core/GameConfig';

export { WAVE_MODIFIER_CONFIG, WAVE_MODIFIER_IDS } from '../core/GameConfig';
export type { WaveModifierDefinition, WaveModifierId } from '../core/GameConfig';

function getWaveRoll(wave: number, salt: number): number {
  let seed = Math.imul(wave ^ salt, 1_103_515_245) + 12_345;
  seed ^= seed >>> 16;
  seed = Math.imul(seed, 0x45d9f3b);
  seed ^= seed >>> 16;
  return seed >>> 0;
}

export function getWaveModifierForWave(wave: number): WaveModifierId | null {
  if (!Number.isSafeInteger(wave) || wave < 1) {
    throw new RangeError('Wave number must be a positive safe integer.');
  }

  const choices = WAVE_MODIFIER_IDS.filter((id) =>
    wave >= WAVE_MODIFIER_CONFIG.definitions[id].minimumWave,
  );
  const chanceRoll = getWaveRoll(wave, 0x5f3759df) % 10_000;
  if (
    choices.length === 0 ||
    chanceRoll >= WAVE_MODIFIER_CONFIG.appearanceChance * 10_000
  ) {
    return null;
  }

  const totalWeight = choices.reduce(
    (total, id) =>
      total + WAVE_MODIFIER_CONFIG.definitions[id].selectionWeight,
    0,
  );
  let selectionRoll = getWaveRoll(wave, 0x6a09e667) % totalWeight;
  for (const id of choices) {
    selectionRoll -= WAVE_MODIFIER_CONFIG.definitions[id].selectionWeight;
    if (selectionRoll < 0) return id;
  }

  return null;
}
