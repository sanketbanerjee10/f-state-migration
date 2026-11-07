import { describe, expect, it } from 'vitest';
import { createRunProgressionState } from '@/game/upgrades/ProgressionSystem';
import {
  applyRareGoldReward,
  getOrbRarity,
  isCollectibleOrb,
  ORB_RARITY_WEIGHTS,
  ORB_SYSTEM_CONFIG,
  RARE_GOLD_ORB_REWARD,
} from '@/game/orbs/OrbSystem';

describe('orb system', () => {
  it('assigns deterministic rarity buckets using the configured weights', () => {
    expect(getOrbRarity(0)).toBe('common');
    expect(getOrbRarity(64)).toBe('common');
    expect(getOrbRarity(65)).toBe('uncommon');
    expect(getOrbRarity(89)).toBe('uncommon');
    expect(getOrbRarity(90)).toBe('rare');
    expect(getOrbRarity(97)).toBe('rare');
    expect(getOrbRarity(98)).toBe('special');
    expect(getOrbRarity(99)).toBe('special');
    expect(getOrbRarity(100)).toBe('common');
    expect(Object.values(ORB_RARITY_WEIGHTS).reduce((sum, weight) => sum + weight, 0))
      .toBe(100);
    expect(() => getOrbRarity(-1)).toThrow(RangeError);
  });

  it('marks every supported orb type as collectible', () => {
    for (const type of [
      'health',
      'damage',
      'rapidFire',
      'shield',
      'bomb',
      'magnet',
      'turret',
      'cursed',
      'rareGold',
    ] as const) {
      expect(isCollectibleOrb(type)).toBe(true);
    }
  });

  it('awards Rare Gold Rare Points through authoritative accounting once per orb', () => {
    const progression = createRunProgressionState();
    const orbId = 41;

    expect(applyRareGoldReward(progression, orbId)).toBe(true);
    expect(progression.rare).toEqual({
      earned: ORB_SYSTEM_CONFIG.rareGoldRarePointReward,
      available: ORB_SYSTEM_CONFIG.rareGoldRarePointReward,
      spent: 0,
    });
    expect(progression.rewardEventKeys.has(`rare-gold-orb:${orbId}`)).toBe(true);
    expect(applyRareGoldReward(progression, orbId)).toBe(false);
    expect(progression.rare.available).toBe(ORB_SYSTEM_CONFIG.rareGoldRarePointReward);
  });

  it('keeps upgrade-opportunity rewards separate unless combined explicitly', () => {
    const opportunityProgression = createRunProgressionState();
    expect(applyRareGoldReward(opportunityProgression, 50, {
      kind: 'rareUpgradeOpportunity',
      upgradeId: 'piercingRounds',
    })).toBe(true);
    expect(opportunityProgression.rare.available).toBe(0);
    expect(opportunityProgression.rareUpgradeUnlocked.piercingRounds).toBe(true);
    expect(applyRareGoldReward(opportunityProgression, 50, {
      kind: 'rareUpgradeOpportunity',
      upgradeId: 'piercingRounds',
    })).toBe(false);

    const combinedProgression = createRunProgressionState();
    expect(applyRareGoldReward(combinedProgression, 51, {
      kind: 'combined',
      amount: 2,
      upgradeId: 'piercingRounds',
    })).toBe(true);
    expect(combinedProgression.rare.available).toBe(2);
    expect(combinedProgression.rareUpgradeUnlocked.piercingRounds).toBe(true);
  });

  it('rejects invalid Rare Gold orb IDs', () => {
    const progression = createRunProgressionState();
    expect(() => applyRareGoldReward(progression, -1)).toThrow(RangeError);
  });

  it('configures Rare Gold as a special rarity reward', () => {
    expect(RARE_GOLD_ORB_REWARD).toEqual({
      kind: 'rarePoints',
      amount: ORB_SYSTEM_CONFIG.rareGoldRarePointReward,
    });
  });
});
