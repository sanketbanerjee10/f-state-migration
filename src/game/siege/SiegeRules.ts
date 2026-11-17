import { z } from 'zod';
import type { ZombieType } from '../core/GameState';
import difficultLevelData from './data/difficult.json';
import easyLevelData from './data/easy.json';
import impossibleLevelData from './data/impossible.json';
import mediumLevelData from './data/medium.json';

export const SIEGE_DIFFICULTIES = [
  'easy',
  'medium',
  'difficult',
  'impossible',
] as const;

export const SIEGE_GAME_MODE = 'siege' as const;
export type SiegeDifficulty = (typeof SIEGE_DIFFICULTIES)[number];
export type SiegeOperation = 'add' | 'sub' | 'mul' | 'div';

export interface SiegeRules {
  readonly startTroops: number;
  readonly laneShiftLimit: number;
  readonly wallRatio: { readonly min: number; readonly max: number };
  readonly allowedOps: readonly SiegeOperation[];
  readonly maxDivisor: number;
  readonly gateSpawnIntervalSeconds: number;
  readonly gateScrollSpeedPerViewport: number;
}

export interface SiegeGate {
  readonly lane: number;
  readonly op: SiegeOperation;
  readonly value: number;
}

export interface SiegeGateRow {
  readonly type: 'gateRow';
  readonly gates: readonly SiegeGate[];
}

export interface SiegeZombieGroup {
  readonly kind: ZombieType;
  readonly count: number;
}

export interface SiegeWall {
  readonly zombies: readonly SiegeZombieGroup[];
}

export interface SiegeSection {
  readonly elements: readonly SiegeGateRow[];
  readonly wall: SiegeWall;
}

export interface SiegeLevel {
  readonly id: string;
  readonly name: string;
  readonly theme: string;
  readonly startTroops?: number;
  readonly laneCount?: number;
  readonly startLane?: number;
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
const gateSchema = z.object({
  lane: z.number().int().min(0).max(5),
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
  startLane: z.number().int().min(0).max(5).optional(),
  stars: z.object({
    two: z.number().int().positive(),
    three: z.number().int().positive(),
  }).strict(),
  sections: z.array(z.object({
    elements: z.array(gateRowSchema).min(1),
    wall: z.object({
      zombies: z.array(zombieGroupSchema).min(1),
    }).strict(),
  }).strict()).min(1),
}).strict();
const difficultyDataSchema = z.object({
  schemaVersion: z.literal(1),
  difficulty: z.enum(SIEGE_DIFFICULTIES),
  rules: z.object({
    startTroops: z.number().int().positive().max(1_000_000),
    laneShiftLimit: z.number().int().min(0).max(5),
    wallRatio: z.object({
      min: z.number().finite().min(0).max(1),
      max: z.number().finite().min(0).max(1),
    }).strict(),
    allowedOps: z.array(operationSchema).min(1),
    maxDivisor: z.number().finite().nonnegative(),
    gateSpawnIntervalSeconds: z.number().finite().positive(),
    gateScrollSpeedPerViewport: z.number().finite().positive(),
  }).strict(),
  levels: z.array(levelSchema).min(1),
}).strict();
const SIEGE_LEVEL_DATA: Readonly<Record<SiegeDifficulty, unknown>> = {
  easy: easyLevelData,
  medium: mediumLevelData,
  difficult: difficultLevelData,
  impossible: impossibleLevelData,
};

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

export function simulateSiegeLevel(
  data: SiegeDifficultyData,
  level: SiegeLevel,
): SiegeSimulationResult {
  const laneCount = level.laneCount ?? 3;
  const startLane = level.startLane ?? Math.floor(laneCount / 2);
  const startingTroops = level.startTroops ?? data.rules.startTroops;
  let states = new Map<number, number>([[startLane, startingTroops]]);
  const sectionResults: SiegeSectionResult[] = [];

  for (const [sectionIndex, section] of level.sections.entries()) {
    const sectionStartingTroops = Math.max(...states.values());

    for (const row of section.elements) {
      const nextStates = new Map<number, number>();
      for (const [currentLane, troops] of states) {
        for (let lane = 0; lane < laneCount; lane += 1) {
          if (!isReachableLane(
            currentLane,
            lane,
            laneCount,
          )) {
            continue;
          }
          const gate = row.gates.find((candidate) => candidate.lane === lane);
          const nextTroops = gate ? applySiegeGate(troops, gate) : troops;
          if (nextTroops > 0) {
            nextStates.set(lane, Math.max(nextStates.get(lane) ?? 0, nextTroops));
          }
        }
      }
      states = nextStates;
      if (states.size === 0) {
        return { won: false, finalTroops: 0, sections: sectionResults };
      }
    }

    const wallStrength = getSiegeWallStrength(section.wall);
    const bestTroopsAtWall = Math.max(...states.values());
    const hordeCount = getSiegeHordeCount(section.wall);
    sectionResults.push({
      sectionIndex,
      startingTroops: sectionStartingTroops,
      bestTroopsAtWall,
      wallStrength,
      troopsBeforeWall: bestTroopsAtWall,
      ratio: bestTroopsAtWall > 0 ? wallStrength / bestTroopsAtWall : 1,
    });
    states = new Map(
      [...states.entries()].filter(([, troops]) => troops >= hordeCount),
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
    const startLane = level.startLane ?? Math.floor(laneCount / 2);
    if (startLane >= laneCount) addIssue('startLane must be within laneCount.', 'error');
    if (level.stars.two >= level.stars.three) {
      addIssue('stars.two must be less than stars.three.', 'error');
    }

    for (const [sectionIndex, section] of level.sections.entries()) {
      for (const [rowIndex, row] of section.elements.entries()) {
        const lanes = new Set<number>();
        for (const gate of row.gates) {
          if (gate.lane >= laneCount) {
            addIssue(`Section ${sectionIndex + 1}, row ${rowIndex + 1}: gate lane is outside laneCount.`, 'error');
          }
          if (lanes.has(gate.lane)) {
            addIssue(`Section ${sectionIndex + 1}, row ${rowIndex + 1}: only one gate per lane is allowed.`, 'error');
          }
          lanes.add(gate.lane);
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
      }
    }

    if (startLane < laneCount) {
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
  }

  return { data, issues };
}

export async function loadSiegeDifficultyData(
  difficulty: SiegeDifficulty,
): Promise<SiegeDifficultyData> {
  const result = validateSiegeDifficultyData(SIEGE_LEVEL_DATA[difficulty]);
  const errors = result.issues.filter((issue) => issue.severity === 'error');
  if (!result.data || errors.length > 0) {
    throw new Error(
      `Siege ${difficulty} level data is invalid: ${errors.map((issue) => issue.message).join('; ')}`,
    );
  }
  if (result.data.difficulty !== difficulty) {
    throw new Error(
      `Siege ${difficulty} loader received "${result.data.difficulty}" level data.`,
    );
  }
  return result.data;
}
