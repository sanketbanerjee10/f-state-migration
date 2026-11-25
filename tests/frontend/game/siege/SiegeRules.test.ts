import { describe, expect, it } from 'vitest';
import {
  SIEGE_DIFFICULTIES,
  applySiegeGate,
  applySiegeHazard,
  loadSiegeDifficultyData,
  simulateSiegeLevel,
  validateSiegeDifficultyData,
  type SiegeDifficultyData,
} from '../../../../src/game/siege/SiegeRules';
import { simulateSiegeHordeEncounter } from '../../../../src/game/siege/SiegeCombat';

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

  it('applies razor wire, fuel drum, and toxic puddle troop losses', () => {
    expect(applySiegeHazard(10, {
      type: 'hazard',
      kind: 'razor_wire',
      lane: 0,
      value: 3,
    })).toBe(7);
    expect(applySiegeHazard(11, {
      type: 'hazard',
      kind: 'fuel_drum',
      lane: 0,
      value: 20,
    })).toBe(8);
    expect(applySiegeHazard(10, {
      type: 'hazard',
      kind: 'toxic_puddle',
      lane: 0,
      value: 2,
      duration: 2,
    })).toBe(6);
  });

  it.each(SIEGE_DIFFICULTIES)(
    'validates and simulates all levels for %s',
    async (difficulty) => {
      const data = await loadSiegeDifficultyData(difficulty);
      const result = validateSiegeDifficultyData(data);
      expect(result.data).not.toBeNull();
      expect(result.issues.filter(({ severity }) => severity === 'error')).toEqual([]);
      expect(data.levels).toHaveLength(20);
      for (const level of data.levels) {
        expect(simulateSiegeLevel(data, level).won).toBe(true);
      }
    },
  );

  it('scales enemy stages and gate rows exponentially with difficulty', async () => {
    const targets = [
      { difficulty: 'easy', sections: 2, gateRows: 8 },
      { difficulty: 'medium', sections: 4, gateRows: 16 },
      { difficulty: 'difficult', sections: 8, gateRows: 32 },
      { difficulty: 'impossible', sections: 16, gateRows: 64 },
    ] as const;

    for (const { difficulty, sections, gateRows } of targets) {
      const data = await loadSiegeDifficultyData(difficulty);
      for (const level of data.levels) {
        expect(level.sections).toHaveLength(sections);
        const totalGateRows = level.sections.reduce(
          (total, section) => total + section.elements.filter(
            (element) => element.type === 'gateRow',
          ).length,
          0,
        );
        expect(totalGateRows).toBeGreaterThanOrEqual(gateRows);
      }
    }
  });

  it('sets star thresholds relative to each level best-path outcome', async () => {
    for (const difficulty of SIEGE_DIFFICULTIES) {
      const data = await loadSiegeDifficultyData(difficulty);
      for (const level of data.levels) {
        const finalTroops = simulateSiegeLevel(data, level).finalTroops;
        expect(level.stars.two).toBe(Math.max(1, Math.floor(finalTroops * 0.5)));
        expect(level.stars.three).toBe(
          Math.max(level.stars.two + 1, Math.floor(finalTroops * 0.8)),
        );
        expect(level.stars.three).toBeLessThanOrEqual(finalTroops);
      }
    }
  });

  it('scales zombie groups in expanded enemy stages', async () => {
    const enemyScales = {
      medium: 0.75,
      difficult: 0.4,
      impossible: 1,
    } as const;

    for (const difficulty of SIEGE_DIFFICULTIES.slice(1)) {
      const data = await loadSiegeDifficultyData(difficulty);
      for (const level of data.levels) {
        for (let sectionIndex = 2; sectionIndex < level.sections.length; sectionIndex += 1) {
          const section = level.sections[sectionIndex]!;
          const template = level.sections[(sectionIndex - 2) % 2]!;
          expect(section.wall.zombies).toEqual(template.wall.zombies.map(
            (group) => ({
              ...group,
              count: Math.ceil(group.count * enemyScales[difficulty]),
            }),
          ));
        }
      }
    }
  });

  it('configures Easy level 1 with gate, hazard and horde sections', async () => {
    const easyData = await loadSiegeDifficultyData('easy');
    const level = easyData.levels[0]!;

    expect(level.sections).toHaveLength(2);
    expect(level.sections.map((section) => section.elements.filter(
      (element) => element.type === 'gateRow',
    ).length)).toEqual([4, 4]);
    expect(level.sections[0]!.elements[1]).toMatchObject({
      type: 'hazard',
      kind: 'razor_wire',
    });
    expect(level.sections[0]!.wall.zombies.map(({ kind }) => kind)).toEqual(['walker']);
    expect(level.sections[1]!.wall.zombies.map(({ kind }) => kind))
      .toEqual(['runner', 'brute']);
    expect(simulateSiegeLevel(easyData, level).sections)
      .toHaveLength(2);
  });

  it('rejects removed lane-shift and start-lane fields', async () => {
    const easyData = await loadSiegeDifficultyData('easy');
    const dataWithRemovedFields = {
      ...easyData,
      rules: { ...easyData.rules, laneShiftLimit: 2 },
      levels: easyData.levels.map((level) => ({ ...level, startLane: 1 })),
    };

    expect(validateSiegeDifficultyData(dataWithRemovedFields).data).toBeNull();
  });

  it('allows free movement between gate positions while finding the best path', () => {
    const data: SiegeDifficultyData = {
      schemaVersion: 1,
      difficulty: 'difficult',
      rules: {
        startTroops: 10,
        wallRatio: { min: 0, max: 1 },
        allowedOps: ['add', 'sub', 'mul', 'div'],
        hazards: [],
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
    expect(result.sections[0]?.bestTroopsAtWall).toBe(300);
  });

  it('applies a spanning gate to every lane it covers', () => {
    const data: SiegeDifficultyData = {
      schemaVersion: 1,
      difficulty: 'easy',
      rules: {
        startTroops: 10,
        wallRatio: { min: 0, max: 1 },
        allowedOps: ['add', 'sub', 'mul'],
        hazards: [],
        maxDivisor: 0,
        gateSpawnIntervalSeconds: 2,
        gateScrollSpeedPerViewport: 0.32,
      },
      levels: [],
    };
    const result = simulateSiegeLevel(data, {
      id: 'span-check',
      name: 'Span Check',
      theme: 'military_outpost',
      laneCount: 3,
      stars: { two: 1, three: 2 },
      sections: [{
        elements: [{
          type: 'gateRow',
          gates: [{ lane: 0, span: 2, op: 'mul', value: 2 }],
        }],
        wall: { zombies: [{ kind: 'walker', count: 1 }] },
      }],
    });

    expect(result.won).toBe(true);
    expect(result.sections[0]?.bestTroopsAtWall).toBe(20);
    expect(result.finalTroops).toBeGreaterThan(0);
  });

  it('lets the squad avoid a hazard by choosing an uncovered lane', () => {
    const data: SiegeDifficultyData = {
      schemaVersion: 1,
      difficulty: 'easy',
      rules: {
        startTroops: 10,
        wallRatio: { min: 0, max: 1 },
        allowedOps: ['add', 'sub', 'mul'],
        hazards: ['razor_wire'],
        maxDivisor: 0,
        gateSpawnIntervalSeconds: 2,
        gateScrollSpeedPerViewport: 0.32,
      },
      levels: [],
    };
    const result = simulateSiegeLevel(data, {
      id: 'hazard-avoidance',
      name: 'Hazard Avoidance',
      theme: 'military_outpost',
      laneCount: 3,
      stars: { two: 1, three: 2 },
      sections: [{
        elements: [{
          type: 'hazard',
          kind: 'razor_wire',
          lane: 1,
          value: 5,
        }],
        wall: { zombies: [{ kind: 'walker', count: 1 }] },
      }],
    });

    expect(result.won).toBe(true);
    expect(result.sections[0]?.bestTroopsAtWall).toBe(10);
  });

  it('warns when a gate row has no option at least five percent better', () => {
    const data: SiegeDifficultyData = {
      schemaVersion: 1,
      difficulty: 'easy',
      rules: {
        startTroops: 10,
        wallRatio: { min: 0, max: 1 },
        allowedOps: ['add', 'sub', 'mul'],
        hazards: [],
        maxDivisor: 0,
        gateSpawnIntervalSeconds: 2,
        gateScrollSpeedPerViewport: 0.32,
      },
      levels: [{
        id: 'choice-warning',
        name: 'Choice Warning',
        theme: 'military_outpost',
        laneCount: 3,
        stars: { two: 1, three: 2 },
        sections: [{
          elements: [{
            type: 'gateRow',
            gates: [
              { lane: 0, op: 'mul', value: 1.1 },
              { lane: 1, op: 'add', value: 1 },
              { lane: 2, op: 'sub', value: 1 },
            ],
          }],
          wall: { zombies: [{ kind: 'walker', count: 1 }] },
        }],
      }],
    };

    const result = validateSiegeDifficultyData(data);
    expect(result.issues).toContainEqual(expect.objectContaining({
      levelId: 'choice-warning',
      severity: 'warning',
      message: expect.stringContaining('at least 5% better'),
    }));
  });

  it('rejects gate and hazard spans that exceed the level lane count', () => {
    const data: SiegeDifficultyData = {
      schemaVersion: 1,
      difficulty: 'easy',
      rules: {
        startTroops: 10,
        wallRatio: { min: 0, max: 1 },
        allowedOps: ['add', 'sub', 'mul'],
        hazards: ['razor_wire'],
        maxDivisor: 0,
        gateSpawnIntervalSeconds: 2,
        gateScrollSpeedPerViewport: 0.32,
      },
      levels: [{
        id: 'span-out-of-bounds',
        name: 'Span Out of Bounds',
        theme: 'military_outpost',
        laneCount: 3,
        stars: { two: 1, three: 2 },
        sections: [{
          elements: [{
            type: 'gateRow',
            gates: [
              { lane: 0, span: 2, op: 'add', value: 1 },
              { lane: 1, op: 'mul', value: 2 },
              { lane: 2, span: 2, op: 'sub', value: 1 },
            ],
          }, {
            type: 'hazard',
            kind: 'razor_wire',
            lane: 2,
            span: 2,
            value: 1,
          }],
          wall: { zombies: [{ kind: 'walker', count: 1 }] },
        }],
      }],
    };

    const issues = validateSiegeDifficultyData(data).issues;
    expect(issues).toContainEqual(expect.objectContaining({
      severity: 'error',
      message: expect.stringContaining('gate span is outside laneCount'),
    }));
    expect(issues).toContainEqual(expect.objectContaining({
      severity: 'error',
      message: expect.stringContaining('gate spans cannot overlap'),
    }));
    expect(issues).toContainEqual(expect.objectContaining({
      severity: 'error',
      message: expect.stringContaining('hazard span is outside laneCount'),
    }));
  });

  it('rejects hazards that are not enabled for the difficulty', () => {
    const data: SiegeDifficultyData = {
      schemaVersion: 1,
      difficulty: 'easy',
      rules: {
        startTroops: 10,
        wallRatio: { min: 0, max: 1 },
        allowedOps: ['add', 'sub', 'mul'],
        hazards: [],
        maxDivisor: 0,
        gateSpawnIntervalSeconds: 2,
        gateScrollSpeedPerViewport: 0.32,
      },
      levels: [{
        id: 'hazard-not-allowed',
        name: 'Hazard Not Allowed',
        theme: 'military_outpost',
        laneCount: 3,
        stars: { two: 1, three: 2 },
        sections: [{
          elements: [{
            type: 'hazard',
            kind: 'fuel_drum',
            lane: 1,
            value: 20,
          }],
          wall: { zombies: [{ kind: 'walker', count: 1 }] },
        }],
      }],
    };

    expect(validateSiegeDifficultyData(data).issues).toContainEqual(
      expect.objectContaining({
        severity: 'error',
        message: expect.stringContaining('is not allowed for easy'),
      }),
    );
  });

  it('ends a run immediately when a gate reduces troops to zero', () => {
    const data: SiegeDifficultyData = {
      schemaVersion: 1,
      difficulty: 'easy',
      rules: {
        startTroops: 5,
        wallRatio: { min: 0, max: 1 },
        allowedOps: ['add', 'sub', 'mul'],
        hazards: [],
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

  it('carries forward only troops remaining after automatic fire and contact', () => {
    const troops = 10;
    const hordeCount = 66;
    const encounter = simulateSiegeHordeEncounter(
      troops,
      [{ kind: 'walker', count: hordeCount }],
      hordeCount,
      'easy',
    );
    expect(encounter.remainingHorde).toBe(1);

    const data: SiegeDifficultyData = {
      schemaVersion: 1,
      difficulty: 'easy',
      rules: {
        startTroops: troops,
        wallRatio: { min: 0, max: 1 },
        allowedOps: ['add', 'sub', 'mul'],
        hazards: [],
        maxDivisor: 0,
        gateSpawnIntervalSeconds: 2,
        gateScrollSpeedPerViewport: 0.32,
      },
      levels: [],
    };
    const result = simulateSiegeLevel(data, {
      id: 'combat-carryover-check',
      name: 'Combat Carryover Check',
      theme: 'military_outpost',
      laneCount: 3,
      stars: { two: 1, three: 2 },
      sections: [
        {
          elements: [{ type: 'gateRow', gates: [{ lane: 0, op: 'sub', value: 1 }] }],
          wall: { zombies: [{ kind: 'walker', count: hordeCount }] },
        },
        {
          elements: [{ type: 'gateRow', gates: [{ lane: 0, op: 'sub', value: 1 }] }],
          wall: { zombies: [{ kind: 'walker', count: 18 }] },
        },
      ],
    });

    expect(result.sections).toHaveLength(2);
    expect(result.sections[1]?.startingTroops)
      .toBe(troops - encounter.remainingHorde);
  });
});
