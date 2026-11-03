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

export const RARE_UPGRADE_EFFECT_CONFIG = {
  lifestealPercentByLevel: [0, 0.01, 0.02, 0.03, 0.04, 0.05],
  criticalChanceByLevel: [0, 0.03, 0.06, 0.09, 0.12, 0.15],
  criticalDamageMultiplier: 2,
  explosiveChanceByLevel: [0, 0.03, 0.06, 0.09, 0.12, 0.15],
  explosiveRadius: 48,
  explosiveDamageMultiplier: 0.5,
  orbMagnetismRadiusByLevel: [0, 60, 90, 120, 150, 180],
  emergencyShieldThreshold: 0.25,
  emergencyShieldCooldownSeconds: 60,
  emergencyShieldDurationByLevel: [0, 1, 1.5, 2, 2.5, 3],
  emergencyShieldCapacity: 60,
  secondWindHealthPercentByLevel: [0, 0.1, 0.15, 0.2],
} as const;

export const createCurrencyAccounting = (
  earned = 0,
  available = 0,
  spent = 0,
): CurrencyAccounting => ({ earned, available, spent });

export const STANDARD_ATTRIBUTE_DEFINITIONS: Record<
  StandardAttributeId,
  StandardAttributeDefinition
> = {
  damage: {
    id: 'damage',
    label: 'Damage',
    description: 'Increase weapon damage by 10% per level.',
    defaultCost: 1,
    effectText: '+10% base damage',
    perLevelValue: (baseValue, _level) => baseValue * 0.1,
  },
  fireRate: {
    id: 'fireRate',
    label: 'Fire rate',
    description: 'Fire faster by 8% per level.',
    defaultCost: 1,
    effectText: '+8% base fire rate',
    perLevelValue: (baseValue, _level) => baseValue * 0.08,
  },
  maxHealth: {
    id: 'maxHealth',
    label: 'Max health',
    description: 'Gain 10 max health per level.',
    defaultCost: 1,
    effectText: '+10 max health',
    perLevelValue: (baseValue, _level) => 10,
  },
  movementSpeed: {
    id: 'movementSpeed',
    label: 'Movement speed',
    description: 'Move 3% faster per level.',
    defaultCost: 1,
    effectText: '+3% base movement speed',
    perLevelValue: (baseValue, _level) => baseValue * 0.03,
  },
};

export const NORMAL_ATTRIBUTE_DEFINITIONS = STANDARD_ATTRIBUTE_DEFINITIONS;

export const RARE_UPGRADE_DEFINITIONS: Record<
  RareUpgradeId,
  RareUpgradeDefinition
> = {
  lifesteal: {
    id: 'lifesteal',
    name: 'Lifesteal',
    rarity: 'rare',
    description: 'Heal a portion of weapon damage dealt.',
    defaultCost: 1,
    maxLevel: 5,
    unlockText: 'Unlocked from the start of the run.',
    refundable: true,
    effectText: 'Heals for 1% of eligible damage per level',
    effectTextByLevel: [
      'Heal 1% of eligible damage',
      'Heal 2% of eligible damage',
      'Heal 3% of eligible damage',
      'Heal 4% of eligible damage',
      'Heal 5% of eligible damage',
    ],
    effectType: 'healing',
  },
  criticalMastery: {
    id: 'criticalMastery',
    name: 'Critical Mastery',
    rarity: 'rare',
    description: 'Increase the chance for weapon hits to deal critical damage.',
    defaultCost: 1,
    maxLevel: 5,
    unlockText: 'Unlocked from the start of the run.',
    refundable: true,
    effectText: '+3% critical chance per level',
    effectTextByLevel: [
      '+3% critical chance',
      '+6% critical chance',
      '+9% critical chance',
      '+12% critical chance',
      '+15% critical chance',
    ],
    effectType: 'critical',
  },
  explosiveRounds: {
    id: 'explosiveRounds',
    name: 'Explosive Rounds',
    rarity: 'rare',
    description: 'Rounds explode on impact for splash damage.',
    defaultCost: 1,
    maxLevel: 5,
    unlockText: 'Unlocked from the start of the run.',
    refundable: true,
    effectText: '+3% impact explosion chance per level',
    effectTextByLevel: [
      '3% chance to explode on impact',
      '6% chance to explode on impact',
      '9% chance to explode on impact',
      '12% chance to explode on impact',
      '15% chance to explode on impact',
    ],
    effectType: 'projectile',
  },
  emergencyShield: {
    id: 'emergencyShield',
    name: 'Emergency Shield',
    rarity: 'epic',
    description: 'Creates a protective shield after taking damage.',
    defaultCost: 1,
    maxLevel: 5,
    unlockText: 'Unlocked from the start of the run.',
    refundable: true,
    effectText: 'Emergency shield duration increases per level',
    effectTextByLevel: [
      '1s emergency shield',
      '1.5s emergency shield',
      '2s emergency shield',
      '2.5s emergency shield',
      '3s emergency shield',
    ],
    effectType: 'shield',
  },
  orbMagnetism: {
    id: 'orbMagnetism',
    name: 'Orb Magnetism',
    rarity: 'rare',
    description: 'Pull nearby orbs toward the player.',
    defaultCost: 1,
    maxLevel: 5,
    unlockText: 'Unlocked from the start of the run.',
    refundable: true,
    effectText: 'Larger pull radius and magnet strength',
    effectTextByLevel: [
      '60px attraction radius',
      '90px attraction radius',
      '120px attraction radius',
      '150px attraction radius',
      '180px attraction radius',
    ],
    effectType: 'orb',
  },
  piercingRounds: {
    id: 'piercingRounds',
    name: 'Piercing Rounds',
    rarity: 'epic',
    description: 'Shots continue through targets and hit additional enemies.',
    defaultCost: 1,
    maxLevel: 5,
    unlockText: 'Unlocked after completing wave 5.',
    refundable: true,
    effectText: 'Each level adds one additional target',
    effectTextByLevel: [
      'Pierce 1 additional enemy',
      'Pierce 2 additional enemies',
      'Pierce 3 additional enemies',
      'Pierce 4 additional enemies',
      'Pierce 5 additional enemies',
    ],
    effectType: 'projectile',
  },
  secondWind: {
    id: 'secondWind',
    name: 'Second Wind',
    rarity: 'epic',
    description: 'Restore health once per run when below a critical threshold.',
    defaultCost: 2,
    maxLevel: 3,
    unlockText: 'Unlocked at wave 10 or from a boss reward.',
    refundable: true,
    effectText: 'Restore 10%, 15%, or 20% max HP once per run',
    effectTextByLevel: [
      'Restore 10% max health once per run',
      'Restore 15% max health once per run',
      'Restore 20% max health once per run',
    ],
    effectType: 'utility',
  },
};

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
): boolean {
  if (state.rewardEventKeys.has(eventKey)) {
    return false;
  }
  if (
    !Number.isSafeInteger(state.standard.earned + 1) ||
    !Number.isSafeInteger(state.standard.available + 1)
  ) {
    throw new RangeError('Standard Point accounting exceeds the supported numeric range.');
  }

  state.standard.earned += 1;
  state.standard.available += 1;
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

export const INITIAL_RARE_UPGRADE_ROSTER: readonly RareUpgradeId[] = [
  'lifesteal',
  'criticalMastery',
  'explosiveRounds',
  'emergencyShield',
  'orbMagnetism',
  'piercingRounds',
  'secondWind',
];

export const DEFAULT_NORMAL_ATTRIBUTE_ORDER: readonly StandardAttributeId[] = [
  'damage',
  'fireRate',
  'maxHealth',
  'movementSpeed',
];

export const DEFAULT_RARE_UPGRADE_ORDER: readonly RareUpgradeId[] = [
  ...INITIAL_RARE_UPGRADE_ROSTER,
];

export const NORMAL_ATTRIBUTE_ORDER = DEFAULT_NORMAL_ATTRIBUTE_ORDER;
export const RARE_UPGRADE_ORDER = DEFAULT_RARE_UPGRADE_ORDER;
