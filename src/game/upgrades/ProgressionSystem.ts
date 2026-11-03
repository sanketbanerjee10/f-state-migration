import {
  DEFAULT_NORMAL_ATTRIBUTE_ORDER,
  DEFAULT_RARE_UPGRADE_ORDER,
  INITIAL_RARE_UPGRADE_ROSTER,
  NORMAL_ATTRIBUTE_ORDER,
  RARE_UPGRADE_ORDER,
  RARE_UPGRADE_EFFECT_CONFIG,
  RARE_UPGRADE_DEFINITIONS,
  STANDARD_ATTRIBUTE_DEFINITIONS,
} from '../core/GameConfig';

export {
  DEFAULT_NORMAL_ATTRIBUTE_ORDER,
  DEFAULT_RARE_UPGRADE_ORDER,
  INITIAL_RARE_UPGRADE_ROSTER,
  NORMAL_ATTRIBUTE_ORDER,
  RARE_UPGRADE_ORDER,
  RARE_UPGRADE_EFFECT_CONFIG,
  RARE_UPGRADE_DEFINITIONS,
  STANDARD_ATTRIBUTE_DEFINITIONS,
} from '../core/GameConfig';

export type StandardAttributeId =
  | 'damage'
  | 'fireRate'
  | 'maxHealth'
  | 'movementSpeed';

export type NormalAttributeId = StandardAttributeId;

export type RareUpgradeId =
  | 'lifesteal'
  | 'criticalMastery'
  | 'explosiveRounds'
  | 'emergencyShield'
  | 'orbMagnetism'
  | 'piercingRounds'
  | 'secondWind';

export interface CurrencyAccounting {
  earned: number;
  available: number;
  spent: number;
}

export interface StandardAttributeDefinition {
  readonly id: StandardAttributeId;
  readonly label: string;
  readonly description: string;
  readonly defaultCost: number;
  readonly costsByLevel?: readonly number[];
  readonly maxLevel?: number;
  readonly effectText: string;
  readonly perLevelValue: (baseValue: number, level: number) => number;
}

export type NormalAttributeDefinition = StandardAttributeDefinition;

export interface RareUpgradeDefinition {
  readonly id: RareUpgradeId;
  readonly name: string;
  readonly rarity: 'common' | 'rare' | 'epic';
  readonly description: string;
  readonly defaultCost: number;
  readonly costsByLevel?: readonly number[];
  readonly maxLevel: number;
  readonly unlockText: string;
  readonly refundable: boolean;
  readonly effectText: string;
  readonly effectTextByLevel?: readonly string[];
  readonly effectType: 'damage' | 'critical' | 'shield' | 'orb' | 'healing' | 'projectile' | 'utility';
}

export interface RunProgressionState {
  standard: CurrencyAccounting;
  rare: CurrencyAccounting;
  standardAttributeLevels: Record<StandardAttributeId, number>;
  standardAttributeCosts: Record<StandardAttributeId, number[]>;
  rareUpgradeLevels: Record<RareUpgradeId, number>;
  rareUpgradeCosts: Record<RareUpgradeId, number[]>;
  rareUpgradeUnlocked: Record<RareUpgradeId, boolean>;
  rewardEventKeys: Set<string>;
  emergencyShieldCooldownSeconds: number;
  secondWindUsed: boolean;
}

export const createCurrencyAccounting = (
  earned = 0,
  available = 0,
  spent = 0,
): CurrencyAccounting => ({ earned, available, spent });

export const NORMAL_ATTRIBUTE_DEFINITIONS = STANDARD_ATTRIBUTE_DEFINITIONS;

export function createRunProgressionState(): RunProgressionState {
  return {
    standard: createCurrencyAccounting(),
    rare: createCurrencyAccounting(),
    standardAttributeLevels: {
      damage: 0,
      fireRate: 0,
      maxHealth: 0,
      movementSpeed: 0,
    },
    standardAttributeCosts: {
      damage: [],
      fireRate: [],
      maxHealth: [],
      movementSpeed: [],
    },
    rareUpgradeLevels: {
      lifesteal: 0,
      criticalMastery: 0,
      explosiveRounds: 0,
      emergencyShield: 0,
      orbMagnetism: 0,
      piercingRounds: 0,
      secondWind: 0,
    },
    rareUpgradeCosts: {
      lifesteal: [],
      criticalMastery: [],
      explosiveRounds: [],
      emergencyShield: [],
      orbMagnetism: [],
      piercingRounds: [],
      secondWind: [],
    },
    rareUpgradeUnlocked: {
      lifesteal: true,
      criticalMastery: true,
      explosiveRounds: true,
      emergencyShield: true,
      orbMagnetism: true,
      piercingRounds: false,
      secondWind: false,
    },
    rewardEventKeys: new Set<string>(),
    emergencyShieldCooldownSeconds: 0,
    secondWindUsed: false,
  };
}

export function getNormalAttributeValue(
  attributeId: StandardAttributeId,
  baseValue: number,
  level: number,
): number {
  const definition = STANDARD_ATTRIBUTE_DEFINITIONS[attributeId];
  if (!Number.isSafeInteger(level) || level < 0 || !Number.isFinite(baseValue)) {
    throw new RangeError('Attribute base value and level must be finite and valid.');
  }
  if (level === 0) {
    return baseValue;
  }
  const effect = definition.perLevelValue(baseValue, level);
  const value = baseValue + effect * level;
  if (!Number.isFinite(value)) {
    throw new RangeError('Attribute value exceeds the supported numeric range.');
  }
  return value;
}

export function getNormalAttributeCost(
  attributeId: StandardAttributeId,
  level: number,
  config = STANDARD_ATTRIBUTE_DEFINITIONS[attributeId],
): number {
  const cost = config.costsByLevel?.[level] ?? config.defaultCost;
  if (!Number.isSafeInteger(cost) || cost <= 0) {
    throw new RangeError('Upgrade costs must be positive safe integers.');
  }
  return cost;
}

export function getRareUpgradeNextEffectText(
  upgradeId: RareUpgradeId,
  currentLevel: number,
): string {
  const nextLevel = currentLevel + 1;
  const definition = RARE_UPGRADE_DEFINITIONS[upgradeId];
  if (nextLevel > definition.maxLevel) return 'Max level';
  return definition.effectTextByLevel?.[nextLevel - 1] ?? definition.effectText;
}

export function getStandardPointBalance(state: RunProgressionState): number {
  return state.standard.available;
}

export function getRarePointBalance(state: RunProgressionState): number {
  return state.rare.available;
}

export function awardStandardWavePoint(
  state: RunProgressionState,
  eventKey: string,
  amount = 1,
): boolean {
  if (!Number.isSafeInteger(amount) || amount <= 0) {
    return false;
  }
  if (state.rewardEventKeys.has(eventKey)) {
    return false;
  }
  if (
    !Number.isSafeInteger(state.standard.earned + amount) ||
    !Number.isSafeInteger(state.standard.available + amount)
  ) {
    throw new RangeError('Standard Point accounting exceeds the supported numeric range.');
  }

  state.standard.earned += amount;
  state.standard.available += amount;
  state.rewardEventKeys.add(eventKey);
  return true;
}

export function awardRareReward(
  state: RunProgressionState,
  eventKey: string,
  amount: number,
): boolean {
  if (!Number.isSafeInteger(amount) || amount <= 0) {
    return false;
  }

  if (state.rewardEventKeys.has(eventKey)) {
    return false;
  }
  if (
    !Number.isSafeInteger(state.rare.earned + amount) ||
    !Number.isSafeInteger(state.rare.available + amount)
  ) {
    throw new RangeError('Rare Point accounting exceeds the supported numeric range.');
  }

  state.rare.earned += amount;
  state.rare.available += amount;
  state.rewardEventKeys.add(eventKey);
  return true;
}

export function awardChallengeRareReward(
  state: RunProgressionState,
  challengeId: string,
  completionId: string,
  amount: number,
): boolean {
  const challengeKey = challengeId.trim();
  const completionKey = completionId.trim();
  if (!challengeKey || !completionKey) {
    throw new RangeError('Challenge reward identifiers must not be empty.');
  }
  return awardRareReward(
    state,
    `challenge-rare-point:${challengeKey}:${completionKey}`,
    amount,
  );
}

export function isNormalAttributeAffordable(
  state: RunProgressionState,
  attributeId: StandardAttributeId,
  costOverride?: number,
): boolean {
  const definition = STANDARD_ATTRIBUTE_DEFINITIONS[attributeId];
  const level = state.standardAttributeLevels[attributeId] ?? 0;
  const maxLevel = definition.maxLevel ?? Number.POSITIVE_INFINITY;
  if (
    !Number.isSafeInteger(level) ||
    level < 0 ||
    level >= maxLevel ||
    level === Number.MAX_SAFE_INTEGER
  ) {
    return false;
  }
  const cost = costOverride ?? getNormalAttributeCost(attributeId, level, definition);
  return state.standard.available >= cost;
}

export function buyNormalAttribute(
  state: RunProgressionState,
  attributeId: StandardAttributeId,
  costOverride?: number,
): boolean {
  const definition = STANDARD_ATTRIBUTE_DEFINITIONS[attributeId];
  const level = state.standardAttributeLevels[attributeId] ?? 0;
  const maxLevel = definition.maxLevel ?? Number.POSITIVE_INFINITY;
  if (
    !Number.isSafeInteger(level) ||
    level < 0 ||
    level >= maxLevel ||
    level === Number.MAX_SAFE_INTEGER
  ) {
    return false;
  }

  const cost = costOverride ?? getNormalAttributeCost(attributeId, level, definition);
  if (
    !Number.isSafeInteger(cost) ||
    cost <= 0 ||
    state.standard.available < cost ||
    !Number.isSafeInteger(state.standard.spent + cost)
  ) {
    return false;
  }

  state.standard.available -= cost;
  state.standard.spent += cost;
  state.standardAttributeLevels[attributeId] = level + 1;
  state.standardAttributeCosts[attributeId].push(cost);
  return true;
}

export function refundNormalAttribute(
  state: RunProgressionState,
  attributeId: StandardAttributeId,
): boolean {
  const level = state.standardAttributeLevels[attributeId] ?? 0;
  if (level <= 0) {
    return false;
  }

  const costs = state.standardAttributeCosts[attributeId];
  const lastCost = costs[costs.length - 1];
  if (
    !Number.isSafeInteger(lastCost) ||
    lastCost <= 0 ||
    state.standard.spent < lastCost ||
    !Number.isSafeInteger(state.standard.available + lastCost)
  ) {
    return false;
  }
  const nextLevel = level - 1;

  state.standardAttributeLevels[attributeId] = nextLevel;
  if (costs.length > 0) {
    costs.pop();
  }
  state.standard.spent -= lastCost;
  state.standard.available += lastCost;
  return true;
}

export function isRareUpgradeUnlocked(
  state: RunProgressionState,
  upgradeId: RareUpgradeId,
): boolean {
  return state.rareUpgradeUnlocked[upgradeId] ?? false;
}

export function getRareUpgradeCost(
  upgradeId: RareUpgradeId,
  level: number,
): number {
  const definition = RARE_UPGRADE_DEFINITIONS[upgradeId];
  const cost = definition.costsByLevel?.[level] ?? definition.defaultCost;
  if (!Number.isSafeInteger(cost) || cost <= 0) {
    throw new RangeError('Upgrade costs must be positive safe integers.');
  }
  return cost;
}

export function canBuyRareUpgrade(
  state: RunProgressionState,
  upgradeId: RareUpgradeId,
): boolean {
  const definition = RARE_UPGRADE_DEFINITIONS[upgradeId];
  const level = state.rareUpgradeLevels[upgradeId] ?? 0;
  if (
    !Number.isSafeInteger(level) ||
    level < 0 ||
    !isRareUpgradeUnlocked(state, upgradeId) ||
    level >= definition.maxLevel
  ) {
    return false;
  }
  const cost = getRareUpgradeCost(upgradeId, level);
  return state.rare.available >= cost;
}

export function buyRareUpgrade(
  state: RunProgressionState,
  upgradeId: RareUpgradeId,
): boolean {
  const definition = RARE_UPGRADE_DEFINITIONS[upgradeId];
  const level = state.rareUpgradeLevels[upgradeId] ?? 0;
  if (
    !Number.isSafeInteger(level) ||
    level < 0 ||
    !isRareUpgradeUnlocked(state, upgradeId) ||
    level >= definition.maxLevel
  ) {
    return false;
  }

  const cost = getRareUpgradeCost(upgradeId, level);
  if (
    state.rare.available < cost ||
    !Number.isSafeInteger(state.rare.spent + cost)
  ) {
    return false;
  }

  state.rare.available -= cost;
  state.rare.spent += cost;
  state.rareUpgradeLevels[upgradeId] = level + 1;
  state.rareUpgradeCosts[upgradeId].push(cost);
  return true;
}

export function refundRareUpgrade(
  state: RunProgressionState,
  upgradeId: RareUpgradeId,
): boolean {
  const definition = RARE_UPGRADE_DEFINITIONS[upgradeId];
  const level = state.rareUpgradeLevels[upgradeId] ?? 0;
  if (!Number.isSafeInteger(level) || level <= 0) {
    return false;
  }
  if (!definition.refundable) {
    return false;
  }

  const costs = state.rareUpgradeCosts[upgradeId];
  const lastCost = costs[costs.length - 1];
  if (
    !Number.isSafeInteger(lastCost) ||
    lastCost <= 0 ||
    state.rare.spent < lastCost ||
    !Number.isSafeInteger(state.rare.available + lastCost)
  ) {
    return false;
  }

  state.rareUpgradeLevels[upgradeId] = level - 1;
  if (costs.length > 0) {
    costs.pop();
  }
  state.rare.spent -= lastCost;
  state.rare.available += lastCost;
  return true;
}

export function applyRunProgressionToPlayer(
  state: RunProgressionState,
  player: {
    damage: number;
    shotsPerSecond: number;
    maxHealth: number;
    movementSpeed: number;
  },
): {
  damage: number;
  shotsPerSecond: number;
  maxHealth: number;
  movementSpeed: number;
} {
  const damageBase = player.damage;
  const fireRateBase = player.shotsPerSecond;
  const maxHealthBase = player.maxHealth;
  const movementBase = player.movementSpeed;

  return {
    damage: getNormalAttributeValue('damage', damageBase, state.standardAttributeLevels.damage),
    shotsPerSecond: getNormalAttributeValue('fireRate', fireRateBase, state.standardAttributeLevels.fireRate),
    maxHealth: getNormalAttributeValue('maxHealth', maxHealthBase, state.standardAttributeLevels.maxHealth),
    movementSpeed: getNormalAttributeValue('movementSpeed', movementBase, state.standardAttributeLevels.movementSpeed),
  };
}
