import { describe, expect, it } from 'vitest';
import {
  getSiegeGateColor,
  getSiegeGateSymbol,
  getSiegeDisplayedUnitCount,
  getSiegeBulletDamage,
  getSiegeCombatHordeCount,
  getSiegeBackgroundScrollSpeed,
  getSiegeGateScrollSpeed,
  getSiegeGateBounds,
  getSiegeGateSpacing,
  getSiegeGateWidth,
  getSiegeGateY,
  getSiegeTimedGateY,
  getSiegeKeyboardMovementX,
  getSiegeHordeWins,
  getSiegeRemainingTroops,
  getSiegeVolleyDamage,
  getSiegeShotInterval,
  getSiegeTankFormation,
  moveSiegePlayer,
  moveSiegePlayerByTouch,
} from '../../../../src/game/siege/SiegeEngine';
import { formatSiegeCount } from '../../../../src/game/siege/SiegeFormatting';

describe('Siege engine controls', () => {
  it('formats siege counts with international thousands separators', () => {
    expect(formatSiegeCount(1234567)).toBe('1,234,567');
    expect(formatSiegeCount(0)).toBe('0');
  });

  it('uses level gate colors with operation-specific defaults and slash division', () => {
    expect(getSiegeGateColor('add')).toBe('#22C55E');
    expect(getSiegeGateColor('mul')).toBe('#FACC15');
    expect(getSiegeGateColor('sub')).toBe('#FDA4AF');
    expect(getSiegeGateColor('div')).toBe('#FF1744');
    expect(getSiegeGateColor('add', { add: '#123456' })).toBe('#123456');
    expect(getSiegeGateColor('add', { add: '#123456' }, '#654321')).toBe('#654321');
    expect(getSiegeGateSymbol('div')).toBe('/');
  });

  it('only reads keyboard movement when keyboard input is selected', () => {
    const leftKeys = new Set(['arrowleft', 'a', 'arrowup', 'w']);
    const rightKeys = new Set(['arrowright', 'd', 'arrowdown', 's']);

    expect(getSiegeKeyboardMovementX(leftKeys, false)).toBe(0);
    expect(getSiegeKeyboardMovementX(rightKeys, false)).toBe(0);
    expect(getSiegeKeyboardMovementX(leftKeys, true)).toBe(-1);
    expect(getSiegeKeyboardMovementX(rightKeys, true)).toBe(1);
  });

  it('tightens the distance between gates as difficulty increases', () => {
    const height = 600;
    const spacings = [
      getSiegeGateSpacing(height, 'easy'),
      getSiegeGateSpacing(height, 'medium'),
      getSiegeGateSpacing(height, 'difficult'),
      getSiegeGateSpacing(height, 'impossible'),
    ];

    expect(spacings[0]).toBeGreaterThan(spacings[1]!);
    expect(spacings[1]).toBeGreaterThan(spacings[2]!);
    expect(spacings[2]).toBeGreaterThan(spacings[3]!);
  });

  it('uses the entire column width for each gate', () => {
    expect(getSiegeGateWidth(1200, 3)).toBe(400);
    expect(getSiegeGateWidth(900, 3)).toBe(300);
  });

  it('sizes spanning gates across all covered columns and defaults span to one', () => {
    expect(getSiegeGateBounds(1200, 3, {
      lane: 0,
      span: 2,
      op: 'add',
      value: 5,
    })).toEqual({ left: 0, width: 800, center: 400 });
    expect(getSiegeGateBounds(1200, 3, {
      lane: 2,
      op: 'add',
      value: 5,
    })).toEqual({ left: 800, width: 400, center: 1000 });
  });

  it('moves gate rows toward the tank while preserving their configured spacing', () => {
    const firstAtStart = getSiegeGateY(72, 0, 200, 0);
    const secondAtStart = getSiegeGateY(72, 1, 200, 0);
    const firstAfterScroll = getSiegeGateY(72, 0, 200, 120);
    const secondAfterScroll = getSiegeGateY(72, 1, 200, 120);

    expect(firstAtStart - secondAtStart).toBe(200);
    expect(firstAfterScroll).toBeGreaterThan(firstAtStart);
    expect(firstAfterScroll - secondAfterScroll).toBe(200);
  });

  it('spawns gate rows sequentially after the configured delay', () => {
    expect(getSiegeTimedGateY(-56, 1.99, 0, 2, 192)).toBeNull();
    expect(getSiegeTimedGateY(-56, 2, 0, 2, 192)).toBe(-56);
    expect(getSiegeTimedGateY(-56, 2.5, 0, 2, 192)).toBe(40);
    expect(getSiegeTimedGateY(-56, 3.99, 1, 2, 192)).toBeNull();
    expect(getSiegeTimedGateY(-56, 4, 1, 2, 192)).toBe(-56);
    expect(getSiegeTimedGateY(-56, 4.5, 1, 2, 192)).toBe(40);
  });

  it('keeps gate scrolling slower than free player movement', () => {
    const height = 600;
    const gateTravel = getSiegeGateScrollSpeed(height);
    const fasterConfiguredGateTravel = getSiegeGateScrollSpeed(height, 0.5);
    const playerTravel = moveSiegePlayer(100, 100, 1, 1, 1000, height);

    expect(gateTravel).toBe(192);
    expect(fasterConfiguredGateTravel).toBe(300);
    expect(playerTravel.x - 100).toBe(800);
    expect(gateTravel).toBeLessThan(playerTravel.x - 100);
  });

  it('keeps player movement fast on small screens and scales up on wide screens', () => {
    const compact = moveSiegePlayer(100, 100, 1, 1, 800, 600);
    const reference = moveSiegePlayer(100, 100, 1, 1, 1280, 600);
    const wide = moveSiegePlayer(100, 100, 1, 1, 1920, 600);

    expect(compact.x - 100).toBe(682);
    expect(reference.x - 100).toBe(800);
    expect(wide.x - 100).toBe(1200);
  });

  it('scrolls the background with the gates at a slower parallax rate', () => {
    const height = 600;
    const gateTravel = getSiegeGateScrollSpeed(height, 0.5);
    const backgroundTravel = getSiegeBackgroundScrollSpeed(height, 0.5);

    expect(backgroundTravel).toBe(gateTravel * 0.4);
    expect(backgroundTravel).toBeLessThan(gateTravel);
    expect(getSiegeBackgroundScrollSpeed(height * 2, 0.5))
      .toBe(backgroundTravel * 2);
  });

  it('moves only horizontally and preserves the player vertical position', () => {
    const right = moveSiegePlayer(100, 100, 1, 1, 1000, 1000);
    const left = moveSiegePlayer(100, 100, -1, 1, 1000, 1000);
    const overdriven = moveSiegePlayer(100, 100, 2, 1, 1000, 1000);
    expect(right).toEqual({ x: 900, y: 100 });
    expect(left).toEqual({ x: 18, y: 100 });
    expect(overdriven).toEqual({ x: 900, y: 100 });
  });

  it('moves the player by the exact touch delta and stops between drag events', () => {
    const afterDrag = moveSiegePlayerByTouch(100, 30, 1000);
    const afterFingerStops = moveSiegePlayerByTouch(afterDrag, 0, 1000);

    expect(afterDrag).toBe(130);
    expect(afterFingerStops).toBe(130);
    expect(moveSiegePlayerByTouch(100, -30, 1000)).toBe(70);
    expect(moveSiegePlayerByTouch(25, -30, 1000)).toBe(18);
  });

  it('caps the rendered player crowd while retaining the exact army count', () => {
    expect(getSiegeDisplayedUnitCount(12)).toBe(12);
    expect(getSiegeDisplayedUnitCount(30)).toBe(30);
    expect(getSiegeDisplayedUnitCount(430)).toBe(30);
  });

  it('spreads each visible tank into its own firing position', () => {
    const formation = getSiegeTankFormation(getSiegeDisplayedUnitCount(430));
    const horizontalOffsets = formation.map(({ x }) => x);
    const verticalOffsets = formation.map(({ y }) => y);

    expect(formation).toHaveLength(30);
    expect(new Set(formation.map(({ x, y }) => `${x},${y}`)).size).toBe(30);
    expect(Math.max(...horizontalOffsets) - Math.min(...horizontalOffsets))
      .toBeGreaterThan(100);
    expect(Math.max(...verticalOffsets)).toBeGreaterThan(150);
  });

  it('resolves a horde by army count rather than consuming player health', () => {
    expect(getSiegeHordeWins(31, 30)).toBe(true);
    expect(getSiegeHordeWins(30, 30)).toBe(true);
    expect(getSiegeHordeWins(29, 30)).toBe(false);
  });

  it('subtracts the zombies that reach the player from the remaining troops', () => {
    expect(getSiegeRemainingTroops(50, 12)).toBe(38);
    expect(getSiegeRemainingTroops(12, 12)).toBe(0);
    expect(getSiegeRemainingTroops(8, 12)).toBe(0);
  });

  it('scales volley damage sublinearly and distributes it across the visible tanks', () => {
    expect(getSiegeVolleyDamage(10)).toBe(10);
    expect(getSiegeVolleyDamage(30)).toBe(30);
    expect(getSiegeVolleyDamage(100)).toBe(62);
    const bulletDamages = Array.from(
      { length: 30 },
      (_, index) => getSiegeBulletDamage(100, index),
    );
    expect(bulletDamages.reduce((total, damage) => total + damage, 0)).toBe(62);
    expect(Math.min(...bulletDamages)).toBe(2);
    expect(Math.max(...bulletDamages)).toBe(3);
  });

  it('keeps horde fights to multiple volleys and scales later, harder levels up', () => {
    const firstEasyLevel = getSiegeCombatHordeCount(48, 100, 'easy', 0, 10);
    const finalEasyLevel = getSiegeCombatHordeCount(48, 100, 'easy', 9, 10);
    const finalImpossibleLevel = getSiegeCombatHordeCount(48, 100, 'impossible', 9, 10);

    expect(firstEasyLevel).toBeGreaterThanOrEqual(3 * getSiegeVolleyDamage(100));
    expect(finalEasyLevel).toBeGreaterThan(firstEasyLevel);
    expect(finalImpossibleLevel).toBeGreaterThan(finalEasyLevel);
  });

  it('caps the firing-rate bonus at the 30-tank visual limit', () => {
    expect(getSiegeShotInterval(40, 'easy')).toBe(getSiegeShotInterval(30, 'easy'));
    expect(getSiegeShotInterval(1_000_000, 'impossible')).toBeGreaterThanOrEqual(0.25);
    expect(getSiegeShotInterval(40, 'easy')).toBeLessThan(
      getSiegeShotInterval(10, 'easy'),
    );
    expect(getSiegeShotInterval(10, 'impossible')).toBeLessThan(
      getSiegeShotInterval(10, 'easy'),
    );
  });
});
