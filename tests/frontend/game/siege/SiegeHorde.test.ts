import { describe, expect, it } from 'vitest';
import {
  advanceSiegeHordeDeaths,
  applySiegeHordeDamage,
  createSiegeHordeVisuals,
  hasSiegeHordeDeathAnimation,
} from '../../../../src/game/siege/SiegeHorde';

describe('Siege horde visuals', () => {
  it('keeps visible survivors synchronized with large logical hordes', () => {
    const visuals = createSiegeHordeVisuals([{ kind: 'walker', count: 48 }]);
    expect(visuals).toHaveLength(30);
    expect(visuals.reduce((sum, visual) => sum + visual.remainingCount, 0)).toBe(48);

    expect(applySiegeHordeDamage(visuals, 47)).toBe(47);
    expect(visuals.reduce((sum, visual) => sum + visual.remainingCount, 0)).toBe(1);
    expect(visuals.some((visual) => visual.remainingCount > 0)).toBe(true);
  });

  it('defeats outer horde visuals before moving inward', () => {
    const visuals = createSiegeHordeVisuals([{ kind: 'walker', count: 3 }]);

    applySiegeHordeDamage(visuals, 1);
    expect(visuals[2]?.remainingCount).toBe(0);
    expect(visuals[1]?.remainingCount).toBe(1);
    expect(visuals[0]?.remainingCount).toBe(1);

    applySiegeHordeDamage(visuals, 1);
    expect(visuals[1]?.remainingCount).toBe(0);
    expect(visuals[0]?.remainingCount).toBe(1);
  });

  it('animates defeated visuals before removing them from the scene', () => {
    const visuals = createSiegeHordeVisuals([{ kind: 'walker', count: 3 }]);
    applySiegeHordeDamage(visuals, 1);
    expect(hasSiegeHordeDeathAnimation(visuals)).toBe(true);

    advanceSiegeHordeDeaths(visuals, 0.2);
    expect(visuals.some((visual) => visual.deathElapsed !== null)).toBe(true);
    advanceSiegeHordeDeaths(visuals, 0.3);
    expect(visuals.some((visual) => visual.deathElapsed !== null)).toBe(false);
    expect(visuals.reduce((sum, visual) => sum + visual.remainingCount, 0)).toBe(2);
  });
});
