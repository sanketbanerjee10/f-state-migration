import type { GameItemType, OrbRarity } from '../core/GameState';
import {
  awardRareReward,
  RARE_UPGRADE_EFFECT_CONFIG,
  type RareUpgradeId,
  type RunProgressionState,
} from '../upgrades/ProgressionSystem';

export const ORB_RARITY_WEIGHTS: Readonly<Record<OrbRarity, number>> = {
  common: 65,
  uncommon: 25,
  rare: 8,
  special: 2,
};

export const ORB_SYSTEM_CONFIG = {
  magnetDurationSeconds: 10,
  magnetAttractionRadius: 120,
  magnetAttractionSpeed: 115,
  turretDurationSeconds: 12,
  turretDamage: 12,
  turretRange: 260,
  turretShotsPerSecond: 2,
  cursedDurationSeconds: 10,
  cursedDamageMultiplier: 1.5,
  cursedEnemySpeedMultiplier: 1.2,
  rareGoldRarePointReward: 1,
  defaultOrbRarity: 'common' as OrbRarity,
} as const;

export const ORB_MAGNETISM_RADIUS_BY_LEVEL =
  RARE_UPGRADE_EFFECT_CONFIG.orbMagnetismRadiusByLevel;

export type RareGoldOrbReward =
  | { readonly kind: 'rarePoints'; readonly amount: number }
  | {
      readonly kind: 'rareUpgradeOpportunity';
      readonly upgradeId: RareUpgradeId;
    }
  | {
      readonly kind: 'combined';
      readonly amount: number;
      readonly upgradeId: RareUpgradeId;
    };

export const RARE_GOLD_ORB_REWARD: RareGoldOrbReward = {
  kind: 'rarePoints',
  amount: ORB_SYSTEM_CONFIG.rareGoldRarePointReward,
};

export function getOrbRarity(seed: number): OrbRarity {
  if (!Number.isSafeInteger(seed) || seed < 0) {
    throw new RangeError('Orb rarity seed must be a non-negative safe integer.');
  }
  const totalWeight = Object.values(ORB_RARITY_WEIGHTS).reduce(
    (total, weight) => total + weight,
    0,
  );
  const roll = seed % totalWeight;
  let boundary = ORB_RARITY_WEIGHTS.common;
  if (roll < boundary) return 'common';
  boundary += ORB_RARITY_WEIGHTS.uncommon;
  if (roll < boundary) return 'uncommon';
  boundary += ORB_RARITY_WEIGHTS.rare;
  if (roll < boundary) return 'rare';
  return 'special';
}

export function getOrbRarityWeight(rarity: OrbRarity): number {
  return ORB_RARITY_WEIGHTS[rarity];
}

export function isCollectibleOrb(type: GameItemType): boolean {
  switch (type) {
    case 'health':
    case 'damage':
    case 'rapidFire':
    case 'shield':
    case 'bomb':
    case 'magnet':
    case 'turret':
    case 'cursed':
    case 'rareGold':
      return true;
  }
}

export function applyRareGoldReward(
  progression: RunProgressionState,
  orbId: number,
  reward: RareGoldOrbReward = RARE_GOLD_ORB_REWARD,
): boolean {
  if (!Number.isSafeInteger(orbId) || orbId < 0) {
    throw new RangeError('Rare Gold Orb ID must be a non-negative safe integer.');
  }
  const rewardKey = `rare-gold-orb:${orbId}`;
  if (progression.rewardEventKeys.has(rewardKey)) {
    return false;
  }

  if (
    reward.kind === 'rarePoints' ||
    reward.kind === 'combined'
  ) {
    const amount = reward.amount;
    if (!awardRareReward(progression, rewardKey, amount)) return false;
  }
  if (
    reward.kind === 'rareUpgradeOpportunity' ||
    reward.kind === 'combined'
  ) {
    const upgradeId = reward.upgradeId;
    progression.rareUpgradeUnlocked[upgradeId] = true;
  }
  if (reward.kind === 'rareUpgradeOpportunity') {
    progression.rewardEventKeys.add(rewardKey);
  }
  return true;
}
