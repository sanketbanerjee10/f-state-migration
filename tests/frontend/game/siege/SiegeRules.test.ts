import { describe, expect, it } from 'vitest';
import difficultData from '../../../../src/game/siege/data/difficult.json';
import easyData from '../../../../src/game/siege/data/easy.json';
import impossibleData from '../../../../src/game/siege/data/impossible.json';
import mediumData from '../../../../src/game/siege/data/medium.json';
import {
  applySiegeGate,
  simulateSiegeLevel,
  validateSiegeDifficultyData,
  type SiegeDifficultyData,
} from '../../../../src/game/siege/SiegeRules';

const difficultyFiles = [
  easyData,
  mediumData,
  difficultData,
  impossibleData,
] as unknown as SiegeDifficultyData[];

describe('Siege rules', () => {
  it('applies all gate operators with integer troop counts', () => {
    expect(applySiegeGate(8, { lane: 0, op: 'add', value: 3 })).toBe(11);
    expect(applySiegeGate(8, { lane: 0, op: 'sub', value: 12 })).toBe(0);
    expect(applySiegeGate(5, { lane: 0, op: 'mul', value: 1.5 })).toBe(7);
    expect(applySiegeGate(11, { lane: 0, op: 'div', value: 2 })).toBe(5);
  });

  it('rejects invalid troop counts and invalid gate values', () => {
    expect(() => applySiegeGate(-1, { lane: 0, op: 'add', value: 1 })).toThrow(RangeError);
    expect(() => applySiegeGate(4, { lane: 0, op: 'div', value: 0 })).toThrow(RangeError);
    expect(() => applySiegeGate(1_000_000_000, { lane: 0, op: 'mul', value: 2 })).toThrow(RangeError);
  });

  it.each(difficultyFiles)('validates and simulates all levels for $difficulty', (data) => {
    const result = validateSiegeDifficultyData(data);
    expect(result.data).not.toBeNull();
    expect(result.issues).toEqual([]);
    expect(data.levels).toHaveLength(10);
    for (const level of data.levels) {
      expect(simulateSiegeLevel(data, level).won).toBe(true);
    }
  });

  it('allows free movement between gate positions while finding the best path', () => {
    const data: SiegeDifficultyData = {
      schemaVersion: 1,
      difficulty: 'difficult',
      rules: {
        startTroops: 10,
        laneShiftLimit: 1,
        wallRatio: { min: 0, max: 1 },
        allowedOps: ['add', 'sub', 'mul', 'div'],
        maxDivisor: 3,
        gateSpawnIntervalSeconds: 2,
        gateScrollSpeedPerViewport: 0.32,
      },
      levels: [],
    };
    const result = simulateSiegeLevel(data, {
      id: 'lane-check',
      name: 'Lane Check',
      theme: 'military_outpost',
      laneCount: 3,
      startLane: 1,
      stars: { two: 1, three: 2 },
      sections: [{
        elements: [
          {
            type: 'gateRow',
            gates: [
              { lane: 0, op: 'mul', value: 3 },
              { lane: 1, op: 'sub', value: 10 },
              { lane: 2, op: 'sub', value: 10 },
            ],
          },
          {
            type: 'gateRow',
            gates: [
              { lane: 0, op: 'sub', value: 100 },
              { lane: 1, op: 'sub', value: 100 },
              { lane: 2, op: 'mul', value: 10 },
            ],
          },
        ],
        wall: { zombies: [{ kind: 'walker', count: 1 }] },
      }],
    });

    expect(result.won).toBe(true);
    expect(result.finalTroops).toBe(300);
  });

  it('ends a run immediately when a gate reduces troops to zero', () => {
    const data: SiegeDifficultyData = {
      schemaVersion: 1,
      difficulty: 'easy',
      rules: {
        startTroops: 5,
        laneShiftLimit: 2,
        wallRatio: { min: 0, max: 1 },
        allowedOps: ['add', 'sub', 'mul'],
        maxDivisor: 0,
        gateSpawnIntervalSeconds: 2,
        gateScrollSpeedPerViewport: 0.32,
      },
      levels: [],
    };
    const result = simulateSiegeLevel(data, {
      id: 'zero-check',
      name: 'Zero Check',
      theme: 'military_outpost',
      laneCount: 3,
      startLane: 1,
      stars: { two: 1, three: 2 },
      sections: [{
        elements: [
          { type: 'gateRow', gates: [{ lane: 0, op: 'sub', value: 5 }, { lane: 1, op: 'sub', value: 5 }, { lane: 2, op: 'sub', value: 5 }] },
          { type: 'gateRow', gates: [{ lane: 0, op: 'add', value: 100 }, { lane: 1, op: 'add', value: 100 }, { lane: 2, op: 'add', value: 100 }] },
        ],
        wall: { zombies: [{ kind: 'walker', count: 1 }] },
      }],
    });

    expect(result.won).toBe(false);
    expect(result.finalTroops).toBe(0);
    expect(result.sections).toHaveLength(0);
  });

  it('carries the troop count through the real-time wall and into the next section', () => {
    const data: SiegeDifficultyData = {
      schemaVersion: 1,
      difficulty: 'easy',
      rules: {
        startTroops: 10,
        laneShiftLimit: 2,
        wallRatio: { min: 0, max: 1 },
        allowedOps: ['add', 'sub', 'mul'],
        maxDivisor: 0,
        gateSpawnIntervalSeconds: 2,
        gateScrollSpeedPerViewport: 0.32,
      },
      levels: [],
    };
    const result = simulateSiegeLevel(data, {
      id: 'carryover-check',
      name: 'Carryover Check',
      theme: 'military_outpost',
      laneCount: 3,
      startLane: 1,
      stars: { two: 1, three: 2 },
      sections: [
        {
          elements: [{ type: 'gateRow', gates: [{ lane: 1, op: 'add', value: 10 }] }],
          wall: { zombies: [{ kind: 'walker', count: 5 }] },
        },
        {
          elements: [{ type: 'gateRow', gates: [{ lane: 1, op: 'add', value: 5 }] }],
          wall: { zombies: [{ kind: 'walker', count: 18 }] },
        },
      ],
    });

    expect(result.won).toBe(true);
    expect(result.sections.map((section) => section.startingTroops)).toEqual([10, 20]);
    expect(result.sections.map((section) => section.troopsBeforeWall)).toEqual([20, 25]);
    expect(result.finalTroops).toBe(25);
  });
});
