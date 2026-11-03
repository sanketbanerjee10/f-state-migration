export const WAVE_DIFFICULTY_CONFIG = {
  healthIncreasePerTwoWaves: 0.1,
  speedIncreasePerWave: 0.035,
  maximumSpeedIncreaseWaves: 8,
  contactDamageIncreasePerWave: 1,
  maximumContactDamage: 30,
} as const;

export interface WaveDifficulty {
  readonly healthMultiplier: number;
  readonly speedMultiplier: number;
  readonly contactDamageBonus: number;
}

export function getWaveDifficulty(wave: number): WaveDifficulty {
  if (!Number.isInteger(wave) || wave < 1) {
    throw new RangeError('Wave number must be a positive integer.');
  }

  const waveProgress = wave - 1;
  return {
    healthMultiplier:
      1 +
      Math.floor(waveProgress / 2) *
        WAVE_DIFFICULTY_CONFIG.healthIncreasePerTwoWaves,
    speedMultiplier:
      1 +
      Math.min(
        waveProgress,
        WAVE_DIFFICULTY_CONFIG.maximumSpeedIncreaseWaves,
      ) *
        WAVE_DIFFICULTY_CONFIG.speedIncreasePerWave,
    contactDamageBonus:
      waveProgress * WAVE_DIFFICULTY_CONFIG.contactDamageIncreasePerWave,
  };
}
