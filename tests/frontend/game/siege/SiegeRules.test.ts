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
  it('uses doubled incoming gate spacing in Impossible mode', async () => {
    const data = await loadSiegeDifficultyData('impossible');
    expect(data.rules.gateSpawnIntervalSeconds).toBe(2.125);
  });

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
    'validates all levels for %s',
    async (difficulty) => {
      const data = await loadSiegeDifficultyData(difficulty);
      const result = validateSiegeDifficultyData(data);
      expect(result.data).not.toBeNull();
      expect(result.issues.filter(({ severity }) => severity === 'error')).toEqual([]);
      expect(data.levels).toHaveLength(20);
      expect(data.levels.every((level) => level.gateColors)).toBe(true);
    },
  );

  it('uses the manifest section and gate-row lengths', async () => {
    const targets = [
      { difficulty: 'easy' as const, level: 'easy-01', sections: 2, gateRows: 8 },
      { difficulty: 'medium' as const, level: 'medium-01', sections: 4, gateRows: 16 },
      { difficulty: 'difficult' as const, level: 'difficult-01', sections: 5, gateRows: 20 },
      { difficulty: 'impossible' as const, level: 'impossible-01', sections: 4, gateRows: 16 },
    ] as const;

    for (const { difficulty, level: levelId, sections, gateRows } of targets) {
      const data = await loadSiegeDifficultyData(difficulty);
      const level = data.levels.find(({ id }) => id === levelId)!;
      expect(level.sections).toHaveLength(sections);
      const totalGateRows = level.sections.reduce(
        (total, section) => total + section.elements.filter(
          (element) => element.type === 'gateRow',
        ).length,
        0,
      );
      expect(totalGateRows).toBe(gateRows);
    }
  });

  it('uses the exact tier star thresholds', async () => {
    const thresholds = {
      easy: { two: 152, three: 243 },
      medium: { two: 13212, three: 21139 },
      difficult: { two: 63807, three: 102092 },
      impossible: { two: 120651, three: 193041 },
    } as const;
    for (const difficulty of SIEGE_DIFFICULTIES) {
      const data = await loadSiegeDifficultyData(difficulty);
      for (const level of data.levels) {
        expect(level.stars).toEqual(thresholds[difficulty]);
      }
    }
  });

  it('configures Easy level 1 with gate, hazard and horde sections', async () => {
    const easyData = await loadSiegeDifficultyData('easy');
    const level = easyData.levels[0]!;

    expect(level.gateColors).toEqual({
      add: '#22C55E',
      sub: '#FDA4AF',
      mul: '#FACC15',
      div: '#FF1744',
    });
    expect(level.sections).toHaveLength(2);
    expect(level.sections.map((section) => section.elements.filter(
      (element) => element.type === 'gateRow',
    ).length)).toEqual([4, 4]);
    expect(level.sections[1]!.elements[3]).toMatchObject({
      type: 'hazard',
      kind: 'razor_wire',
    });
    expect(level.sections[0]!.wall.zombies.map(({ kind }) => kind)).toEqual(['walker']);
    expect(level.sections[1]!.wall.zombies.map(({ kind }) => kind)).toEqual(['walker']);
    expect(simulateSiegeLevel(easyData, level).sections)
      .toHaveLength(2);
  });

  it('validates optional per-level gate colors', async () => {
    const easyData = await loadSiegeDifficultyData('easy');
    const validData = {
      ...easyData,
      levels: easyData.levels.map((level, index) => index === 0
        ? {
          ...level,
          gateColors: { add: '#123456' },
          sections: level.sections.map((section, sectionIndex) => sectionIndex === 0
            ? {
              ...section,
              elements: section.elements.map((element, elementIndex) => (
                elementIndex === 0 && element.type === 'gateRow'
                  ? {
                    ...element,
                    gates: element.gates.map((gate, gateIndex) => (
                      gateIndex === 0 ? { ...gate, color: '#654321' } : gate
                    )),
                  }
                  : element
              )),
            }
            : section),
        }
        : level),
    };
    expect(validateSiegeDifficultyData(validData).data?.levels[0]?.gateColors)
      .toEqual({ add: '#123456' });
    const firstGate = validateSiegeDifficultyData(validData).data
      ?.levels[0]?.sections[0]?.elements[0];
    expect(firstGate?.type === 'gateRow' && firstGate.gates[0]?.color)
      .toBe('#654321');

    const invalidData = {
      ...validData,
      levels: validData.levels.map((level, index) => index === 0
        ? {
          ...level,
          gateColors: { add: 'lime' },
          sections: level.sections.map((section, sectionIndex) => sectionIndex === 0
            ? {
              ...section,
              elements: section.elements.map((element, elementIndex) => (
                elementIndex === 0 && element.type === 'gateRow'
                  ? {
                    ...element,
                    gates: element.gates.map((gate, gateIndex) => (
                      gateIndex === 0 ? { ...gate, color: 'lime' } : gate
                    )),
                  }
                  : element
              )),
            }
            : section),
        }
        : level),
    };
    expect(validateSiegeDifficultyData(invalidData).data).toBeNull();
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
