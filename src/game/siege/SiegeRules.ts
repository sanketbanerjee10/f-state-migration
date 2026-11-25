import { z } from 'zod';
import type { ZombieType } from '../core/GameState';
import {
  getSiegeVolleyDamage,
  simulateSiegeHordeEncounter,
} from './SiegeCombat';
import siegeRulesData from './data/rules.json';

export const SIEGE_DIFFICULTIES = [
  'easy',
  'medium',
  'difficult',
  'impossible',
] as const;

export const SIEGE_GAME_MODE = 'siege' as const;
export type SiegeDifficulty = (typeof SIEGE_DIFFICULTIES)[number];
export type SiegeOperation = 'add' | 'sub' | 'mul' | 'div';
export type SiegeHazardKind = 'razor_wire' | 'fuel_drum' | 'toxic_puddle';

export interface SiegeRules {
  readonly startTroops: number;
  readonly wallRatio: { readonly min: number; readonly max: number };
  readonly allowedOps: readonly SiegeOperation[];
  readonly hazards: readonly SiegeHazardKind[];
  readonly maxDivisor: number;
  readonly gateSpawnIntervalSeconds: number;
  readonly gateScrollSpeedPerViewport: number;
}

export interface SiegeGate {
  readonly lane: number;
  readonly span?: number;
  readonly op: SiegeOperation;
  readonly value: number;
}

export interface SiegeGateRow {
  readonly type: 'gateRow';
  readonly gates: readonly SiegeGate[];
}

export interface SiegeHazard {
  readonly type: 'hazard';
  readonly kind: SiegeHazardKind;
  readonly lane: number;
  readonly span?: number;
  readonly value: number;
  readonly duration?: number;
}

export type SiegeElement = SiegeGateRow | SiegeHazard;

export interface SiegeZombieGroup {
  readonly kind: ZombieType;
  readonly count: number;
}

export interface SiegeWall {
  readonly zombies: readonly SiegeZombieGroup[];
}

export interface SiegeSection {
  readonly elements: readonly SiegeElement[];
  readonly wall: SiegeWall;
}

export interface SiegeLevel {
  readonly id: string;
  readonly name: string;
  readonly theme: string;
  readonly startTroops?: number;
  readonly laneCount?: number;
  readonly stars: { readonly two: number; readonly three: number };
  readonly sections: readonly SiegeSection[];
}

export interface SiegeDifficultyData {
  readonly schemaVersion: 1;
  readonly difficulty: SiegeDifficulty;
  readonly rules: SiegeRules;
  readonly levels: readonly SiegeLevel[];
}

export interface SiegeSectionResult {
  readonly sectionIndex: number;
  readonly startingTroops: number;
  readonly bestTroopsAtWall: number;
  readonly wallStrength: number;
  readonly troopsBeforeWall: number;
  readonly ratio: number;
}

export interface SiegeSimulationResult {
  readonly won: boolean;
  readonly finalTroops: number;
  readonly sections: readonly SiegeSectionResult[];
}

const operationSchema = z.enum(['add', 'sub', 'mul', 'div']);
const hazardKindSchema = z.enum(['razor_wire', 'fuel_drum', 'toxic_puddle']);
const gateSchema = z.object({
  lane: z.number().int().min(0).max(5),
  span: z.number().int().min(1).max(6).optional(),
  op: operationSchema,
  value: z.number().finite().positive(),
}).strict().superRefine((gate, context) => {
  if ((gate.op === 'add' || gate.op === 'sub') && !Number.isInteger(gate.value)) {
    context.addIssue({
      code: 'custom',
      path: ['value'],
      message: 'Addition and subtraction gates must use whole-number values.',
    });
  }
});
const gateRowSchema = z.object({
  type: z.literal('gateRow'),
  gates: z.array(gateSchema).min(1).max(6),
}).strict();
const hazardSchema = z.object({
  type: z.literal('hazard'),
  kind: hazardKindSchema,
  lane: z.number().int().min(0).max(5),
  span: z.number().int().min(1).max(6).optional(),
  value: z.number().finite().positive(),
  duration: z.number().finite().positive().optional(),
}).strict();
const siegeElementSchema = z.discriminatedUnion('type', [
  gateRowSchema,
  hazardSchema,
]).superRefine((element, context) => {
  if (element.type !== 'hazard') return;
  if (element.kind === 'razor_wire' && !Number.isInteger(element.value)) {
    context.addIssue({
      code: 'custom',
      path: ['value'],
      message: 'Razor wire troop loss must be a whole number.',
    });
  }
  if (element.kind === 'fuel_drum' && element.value > 100) {
    context.addIssue({
      code: 'custom',
      path: ['value'],
      message: 'Fuel drum troop loss cannot exceed 100 percent.',
    });
  }
  if (element.kind !== 'toxic_puddle' && element.duration !== undefined) {
    context.addIssue({
      code: 'custom',
      path: ['duration'],
      message: 'Only toxic puddles may specify a duration.',
    });
  }
});
const zombieGroupSchema = z.object({
  kind: z.enum([
    'walker',
    'runner',
    'brute',
    'spitter',
    'swarm',
    'armoured',
    'screamer',
    'bloater',
    'splitter',
  ]),
  count: z.number().int().positive().max(1_000_000),
}).strict();
const levelSchema = z.object({
  id: z.string().min(1).max(80),
  name: z.string().min(1).max(120),
  theme: z.string().min(1).max(80),
  startTroops: z.number().int().positive().max(1_000_000).optional(),
  laneCount: z.number().int().min(2).max(6).optional(),
  stars: z.object({
    two: z.number().int().positive(),
    three: z.number().int().positive(),
  }).strict(),
  sections: z.array(z.object({
    elements: z.array(siegeElementSchema).min(1),
    wall: z.object({
      zombies: z.array(zombieGroupSchema).min(1),
    }).strict(),
  }).strict()).min(1),
}).strict();
const siegeRulesSchema = z.object({
  startTroops: z.number().int().positive().max(1_000_000),
  wallRatio: z.object({
    min: z.number().finite().min(0).max(1),
    max: z.number().finite().min(0).max(1),
  }).strict(),
  allowedOps: z.array(operationSchema).min(1),
  hazards: z.array(hazardKindSchema),
  maxDivisor: z.number().finite().nonnegative(),
  gateSpawnIntervalSeconds: z.number().finite().positive(),
  gateScrollSpeedPerViewport: z.number().finite().positive(),
}).strict();
const sharedRulesDataSchema = z.object({
  schemaVersion: z.literal(1),
  difficulties: z.object({
    easy: siegeRulesSchema,
    medium: siegeRulesSchema,
    difficult: siegeRulesSchema,
    impossible: siegeRulesSchema,
  }).strict(),
}).strict();
const difficultyConfigSchema = z.object({
  schemaVersion: z.literal(1),
  difficulty: z.enum(SIEGE_DIFFICULTIES),
  rules: siegeRulesSchema,
}).strict();
const difficultyDataSchema = difficultyConfigSchema.extend({
  levels: z.array(levelSchema).min(1),
}).strict();
const SIEGE_LEVEL_FILES = import.meta.glob<unknown>(
  './data/levels/**/*.json',
  { eager: true, import: 'default' },
);

export const ZOMBIE_BASE_STRENGTH: Readonly<Record<ZombieType, number>> = {
  walker: 1,
  runner: 1,
  brute: 5,
  spitter: 2,
  swarm: 0.5,
  armoured: 2,
  screamer: 2,
  bloater: 2,
  splitter: 2,
};

const MAX_TROOPS = 1_000_000_000;

export function applySiegeGate(troops: number, gate: SiegeGate): number {
  if (!Number.isSafeInteger(troops) || troops < 0 || troops > MAX_TROOPS) {
    throw new RangeError('Troops must be a non-negative safe integer within the Siege limit.');
  }
  if (!Number.isFinite(gate.value) || gate.value <= 0) {
    throw new RangeError('Gate values must be finite and greater than zero.');
  }

  let nextTroops: number;
  switch (gate.op) {
    case 'add':
      nextTroops = troops + gate.value;
      break;
    case 'sub':
      nextTroops = Math.max(0, troops - gate.value);
      break;
    case 'mul':
      nextTroops = Math.floor(troops * gate.value);
      break;
    case 'div':
      nextTroops = Math.floor(troops / gate.value);
      break;
  }

  if (!Number.isSafeInteger(nextTroops) || nextTroops > MAX_TROOPS) {
    throw new RangeError('Gate result exceeds the Siege troop limit.');
  }
  return nextTroops;
}

export function applySiegeHazard(troops: number, hazard: SiegeHazard): number {
  if (!Number.isSafeInteger(troops) || troops < 0 || troops > MAX_TROOPS) {
    throw new RangeError('Troops must be a non-negative safe integer within the Siege limit.');
  }
  if (!Number.isFinite(hazard.value) || hazard.value <= 0) {
    throw new RangeError('Hazard values must be finite and greater than zero.');
  }

  let loss: number;
  switch (hazard.kind) {
    case 'razor_wire':
      loss = hazard.value;
      break;
    case 'fuel_drum':
      if (hazard.value > 100) {
        throw new RangeError('Fuel drum troop loss cannot exceed 100 percent.');
      }
      loss = Math.ceil(troops * hazard.value / 100);
      break;
    case 'toxic_puddle': {
      const duration = hazard.duration ?? 2;
      if (!Number.isFinite(duration) || duration <= 0) {
        throw new RangeError('Toxic puddle duration must be finite and greater than zero.');
      }
      loss = Math.floor(hazard.value * duration);
      break;
    }
  }
  return Math.max(0, troops - loss);
}

export function getSiegeWallStrength(wall: SiegeWall): number {
  const strength = wall.zombies.reduce(
    (total, group) => total + ZOMBIE_BASE_STRENGTH[group.kind] * group.count,
    0,
  );
  return Math.ceil(strength);
}

export function getSiegeHordeCount(wall: SiegeWall): number {
  return wall.zombies.reduce((total, group) => total + group.count, 0);
}

export function getSiegeCombatHordeCount(
  baseZombieCount: number,
  troops: number,
  difficulty: SiegeDifficulty,
  levelIndex: number,
  levelCount: number,
): number {
  const difficultyIndex = SIEGE_DIFFICULTIES.indexOf(difficulty);
  if (
    !Number.isSafeInteger(baseZombieCount) ||
    baseZombieCount < 1 ||
    !Number.isSafeInteger(troops) ||
    troops < 1 ||
    difficultyIndex < 0 ||
    !Number.isSafeInteger(levelIndex) ||
    !Number.isSafeInteger(levelCount) ||
    levelCount < 1 ||
    levelIndex < 0 ||
    levelIndex >= levelCount
  ) {
    throw new RangeError('Siege combat horde inputs are invalid.');
  }
  const levelProgress = levelCount === 1 ? 0 : levelIndex / (levelCount - 1);
  const targetVolleys = 3 + levelProgress * 1.5 + difficultyIndex * 0.25;
  return Math.max(
    baseZombieCount,
    Math.ceil(getSiegeVolleyDamage(troops) * targetVolleys),
  );
}

function getSiegeSurvivingTroops(
  data: SiegeDifficultyData,
  level: SiegeLevel,
  wall: SiegeWall,
  troops: number,
): number {
  const foundLevelIndex = data.levels.findIndex(
    (candidate) => candidate.id === level.id,
  );
  const levelIndex = Math.max(0, foundLevelIndex);
  const levelCount = foundLevelIndex >= 0 ? data.levels.length : 1;
  const targetZombieCount = getSiegeCombatHordeCount(
    getSiegeHordeCount(wall),
    troops,
    data.difficulty,
    levelIndex,
    levelCount,
  );
  const encounter = simulateSiegeHordeEncounter(
    troops,
    wall.zombies,
    targetZombieCount,
    data.difficulty,
  );
  return Math.max(0, troops - encounter.remainingHorde);
}

function isReachableLane(
  fromLane: number,
  toLane: number,
  laneCount: number,
): boolean {
  return toLane >= 0 &&
    toLane < laneCount &&
    fromLane >= 0 &&
    fromLane < laneCount;
}

function getGateForLane(
  gates: readonly SiegeGate[],
  lane: number,
): SiegeGate | undefined {
  return gates.find((gate) => {
    const span = gate.span ?? 1;
    return lane >= gate.lane && lane < gate.lane + span;
  });
}

function isLaneCovered(
  lane: number,
  item: { readonly lane: number; readonly span?: number },
): boolean {
  return lane >= item.lane && lane < item.lane + (item.span ?? 1);
}

function advanceSiegeElement(
  states: ReadonlyMap<number, number>,
  element: SiegeElement,
  laneCount: number,
): Map<number, number> {
  const nextStates = new Map<number, number>();
  for (const [currentLane, troops] of states) {
    for (let lane = 0; lane < laneCount; lane += 1) {
      if (!isReachableLane(currentLane, lane, laneCount)) continue;
      let nextTroops = troops;
      if (element.type === 'gateRow') {
        const gate = getGateForLane(element.gates, lane);
        if (gate) nextTroops = applySiegeGate(troops, gate);
      } else if (isLaneCovered(lane, element)) {
        nextTroops = applySiegeHazard(troops, element);
      }
      if (nextTroops > 0) {
        nextStates.set(lane, Math.max(nextStates.get(lane) ?? 0, nextTroops));
      }
    }
  }
  return nextStates;
}

function getGateRowsWithoutClearChoice(
  data: SiegeDifficultyData,
  level: SiegeLevel,
): Array<{ sectionIndex: number; rowIndex: number }> {
  const laneCount = level.laneCount ?? 3;
  const centerLane = Math.floor(laneCount / 2);
  let states = new Map<number, number>([[
    centerLane,
    level.startTroops ?? data.rules.startTroops,
  ]]);
  const rowsWithoutClearChoice: Array<{ sectionIndex: number; rowIndex: number }> = [];

  for (const [sectionIndex, section] of level.sections.entries()) {
    for (const [rowIndex, row] of section.elements.entries()) {
      if (states.size > 0 && row.type === 'gateRow' && row.gates.length > 1) {
        const troops = Math.max(...states.values());
        const outcomes = row.gates
          .map((gate) => applySiegeGate(troops, gate))
          .sort((left, right) => right - left);
        const [best, runnerUp] = outcomes;
        if (
          best !== undefined &&
          runnerUp !== undefined &&
          (best === runnerUp || best < runnerUp * 1.05)
        ) {
          rowsWithoutClearChoice.push({ sectionIndex, rowIndex });
        }
      }
      states = advanceSiegeElement(states, row, laneCount);
      if (states.size === 0) break;
    }

    if (states.size === 0) break;
    states = new Map(
      [...states.entries()]
        .map(([lane, troops]) => [
          lane,
          getSiegeSurvivingTroops(data, level, section.wall, troops),
        ] as const)
        .filter(([, troops]) => troops > 0),
    );
  }

  return rowsWithoutClearChoice;
}

export function simulateSiegeLevel(
  data: SiegeDifficultyData,
  level: SiegeLevel,
): SiegeSimulationResult {
  const laneCount = level.laneCount ?? 3;
  const centerLane = Math.floor(laneCount / 2);
  const startingTroops = level.startTroops ?? data.rules.startTroops;
  let states = new Map<number, number>([[centerLane, startingTroops]]);
  const sectionResults: SiegeSectionResult[] = [];

  for (const [sectionIndex, section] of level.sections.entries()) {
    const sectionStartingTroops = Math.max(...states.values());

    for (const element of section.elements) {
      states = advanceSiegeElement(states, element, laneCount);
      if (states.size === 0) {
        return { won: false, finalTroops: 0, sections: sectionResults };
      }
    }

    const wallStrength = getSiegeWallStrength(section.wall);
    const bestTroopsAtWall = Math.max(...states.values());
    sectionResults.push({
      sectionIndex,
      startingTroops: sectionStartingTroops,
      bestTroopsAtWall,
      wallStrength,
      troopsBeforeWall: bestTroopsAtWall,
      ratio: bestTroopsAtWall > 0 ? wallStrength / bestTroopsAtWall : 1,
    });
    states = new Map(
      [...states.entries()]
        .map(([lane, troops]) => [
          lane,
          getSiegeSurvivingTroops(data, level, section.wall, troops),
        ] as const)
        .filter(([, troops]) => troops > 0),
    );
    if (states.size === 0) {
      return { won: false, finalTroops: 0, sections: sectionResults };
    }
  }

  return {
    won: true,
    finalTroops: Math.max(...states.values()),
    sections: sectionResults,
  };
}

export interface SiegeValidationIssue {
  readonly levelId?: string;
  readonly message: string;
  readonly severity: 'error' | 'warning';
}

export function validateSiegeDifficultyData(
  value: unknown,
): { data: SiegeDifficultyData | null; issues: SiegeValidationIssue[] } {
  const parsed = difficultyDataSchema.safeParse(value);
  if (!parsed.success) {
    return {
      data: null,
      issues: parsed.error.issues.map((issue) => ({
        message: `${issue.path.join('.') || 'data'}: ${issue.message}`,
        severity: 'error',
      })),
    };
  }

  const data = parsed.data as SiegeDifficultyData;
  const issues: SiegeValidationIssue[] = [];
  if (data.rules.wallRatio.min > data.rules.wallRatio.max) {
    issues.push({ message: 'rules.wallRatio.min must not exceed max.', severity: 'error' });
  }
  const ids = new Set<string>();

  for (const level of data.levels) {
    const addIssue = (message: string, severity: 'error' | 'warning') => {
      issues.push({ levelId: level.id, message, severity });
    };
    if (ids.has(level.id)) addIssue('Level ids must be unique within a difficulty file.', 'error');
    ids.add(level.id);

    const laneCount = level.laneCount ?? 3;
    if (level.stars.two >= level.stars.three) {
      addIssue('stars.two must be less than stars.three.', 'error');
    }

    for (const [sectionIndex, section] of level.sections.entries()) {
      for (const [elementIndex, element] of section.elements.entries()) {
        if (element.type === 'gateRow') {
          const lanes = new Set<number>();
          for (const gate of element.gates) {
            const span = gate.span ?? 1;
            if (gate.lane + span > laneCount) {
              addIssue(`Section ${sectionIndex + 1}, element ${elementIndex + 1}: gate span is outside laneCount.`, 'error');
            }
            for (let coveredLane = gate.lane; coveredLane < gate.lane + span; coveredLane += 1) {
              if (lanes.has(coveredLane)) {
                addIssue(`Section ${sectionIndex + 1}, element ${elementIndex + 1}: gate spans cannot overlap.`, 'error');
              }
              lanes.add(coveredLane);
            }
            if (!data.rules.allowedOps.includes(gate.op)) {
              addIssue(`Operator "${gate.op}" is not allowed for ${data.difficulty}.`, 'error');
            }
            if (gate.op === 'div' && gate.value > data.rules.maxDivisor) {
              addIssue(`Divisor ${gate.value} exceeds maxDivisor ${data.rules.maxDivisor}.`, 'error');
            }
            if (gate.op === 'div' && gate.value < 2) {
              addIssue('Division gates must divide by at least 2.', 'error');
            }
          }
        } else {
          const span = element.span ?? 1;
          if (element.lane + span > laneCount) {
            addIssue(`Section ${sectionIndex + 1}, element ${elementIndex + 1}: hazard span is outside laneCount.`, 'error');
          }
          if (!data.rules.hazards.includes(element.kind)) {
            addIssue(`Hazard "${element.kind}" is not allowed for ${data.difficulty}.`, 'error');
          }
        }
      }
    }

    let simulation: SiegeSimulationResult;
    try {
      simulation = simulateSiegeLevel(data, level);
    } catch (error) {
      addIssue(
        error instanceof Error ? `Simulation failed: ${error.message}` : 'Simulation failed.',
        'error',
      );
      continue;
    }
    for (const { sectionIndex, rowIndex } of getGateRowsWithoutClearChoice(data, level)) {
      addIssue(
        `Section ${sectionIndex + 1}, row ${rowIndex + 1}: no gate option is at least 5% better than the runner-up.`,
        'warning',
      );
    }
    if (!simulation.won) {
      addIssue('The best reachable path reaches a zombie encounter with no troops.', 'error');
      continue;
    }
    if (level.stars.three > simulation.finalTroops) {
      addIssue('stars.three exceeds the best-path final troop count.', 'warning');
    }
    if (level.stars.two > simulation.finalTroops) {
      addIssue('stars.two exceeds the best-path final troop count.', 'warning');
    }
    for (const result of simulation.sections) {
      if (
        result.ratio < data.rules.wallRatio.min ||
        result.ratio > data.rules.wallRatio.max
      ) {
        addIssue(
          `Section ${result.sectionIndex + 1} wall ratio ${(result.ratio * 100).toFixed(0)}% is outside ${data.rules.wallRatio.min * 100}-${data.rules.wallRatio.max * 100}%.`,
          'warning',
        );
      }
    }
  }

  return { data, issues };
}

export async function loadSiegeDifficultyData(
  difficulty: SiegeDifficulty,
): Promise<SiegeDifficultyData> {
  const sharedRules = sharedRulesDataSchema.safeParse(siegeRulesData);
  if (!sharedRules.success) {
    throw new Error(
      `Siege shared rules data is invalid: ${sharedRules.error.issues
        .map((issue) => `${issue.path.join('.') || 'data'}: ${issue.message}`)
        .join('; ')}`,
    );
  }

  const config = difficultyConfigSchema.safeParse({
    schemaVersion: sharedRules.data.schemaVersion,
    difficulty,
    rules: sharedRules.data.difficulties[difficulty],
  });
  if (!config.success) {
    throw new Error(
      `Siege ${difficulty} rules data is invalid: ${config.error.issues
        .map((issue) => `${issue.path.join('.') || 'data'}: ${issue.message}`)
        .join('; ')}`,
    );
  }

  const knownFolders = SIEGE_DIFFICULTIES.map(
    (knownDifficulty) => `./data/levels/${knownDifficulty}/`,
  );
  const levelFileEntries = Object.entries(SIEGE_LEVEL_FILES);
  const misplacedFiles = levelFileEntries.filter(
    ([path]) => !knownFolders.some((folder) => path.startsWith(folder)),
  );
  if (misplacedFiles.length > 0) {
    throw new Error(
      `Siege level files must be inside a difficulty folder: ${misplacedFiles
        .map(([path]) => path)
        .join(', ')}`,
    );
  }

  const levelDirectory = `./data/levels/${difficulty}/`;
  const difficultyLevelFiles = levelFileEntries
    .filter(([path]) => path.startsWith(levelDirectory))
    .sort(([left], [right]) => left.localeCompare(right, undefined, { numeric: true }));
  const result = validateSiegeDifficultyData({
    ...config.data,
    levels: difficultyLevelFiles.map(([, level]) => level),
  });
  const errors = result.issues.filter((issue) => issue.severity === 'error');
  if (!result.data || errors.length > 0) {
    throw new Error(
      `Siege ${difficulty} level data is invalid: ${errors.map((issue) => issue.message).join('; ')}`,
    );
  }
  for (const [index, [path]] of difficultyLevelFiles.entries()) {
    const filename = path.slice(path.lastIndexOf('/') + 1).replace(/\.json$/, '');
    const level = result.data.levels[index];
    if (level && filename !== level.id) {
      throw new Error(
        `Siege level file "${path}" must match its level id "${level.id}".`,
      );
    }
  }
  if (result.data.difficulty !== difficulty) {
    throw new Error(
      `Siege ${difficulty} loader received "${result.data.difficulty}" level data.`,
    );
  }
  return result.data;
}
