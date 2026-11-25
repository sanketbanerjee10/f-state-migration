// @vitest-environment jsdom

import { beforeEach, describe, expect, it } from 'vitest';
import {
  clearSiegeNavigationState,
  getSiegeNavigationState,
  setSiegeNavigationState,
} from '../../../../src/game/siege/SiegeNavigation';

describe('Siege URL navigation', () => {
  beforeEach(() => {
    window.history.replaceState({}, '', '/game?gameMenu=home&siegeLevel=easy-01#arena');
  });

  it('reads the difficulty and level carousel states from the query string', () => {
    expect(getSiegeNavigationState('?siege=difficulty')).toEqual({
      screen: 'difficulty',
    });
    expect(getSiegeNavigationState('?siege=levels&siegeDifficulty=medium')).toEqual({
      screen: 'levels',
      difficulty: 'medium',
    });
    expect(getSiegeNavigationState(
      '?siege=playing&siegeDifficulty=easy&siegeLevel=easy-01',
    )).toEqual({
      screen: 'levels',
      difficulty: 'easy',
    });
    expect(getSiegeNavigationState('?siege=levels&siegeDifficulty=unknown')).toBeNull();
  });

  it('updates and clears Siege parameters without removing other URL state', () => {
    setSiegeNavigationState({ screen: 'levels', difficulty: 'difficult' });
    expect(window.location.search).toContain('gameMenu=home');
    expect(getSiegeNavigationState(window.location.search)).toEqual({
      screen: 'levels',
      difficulty: 'difficult',
    });
    expect(new URLSearchParams(window.location.search).has('siegeLevel')).toBe(false);

    clearSiegeNavigationState();
    expect(window.location.search).toBe('?gameMenu=home');
    expect(window.location.hash).toBe('#arena');
    expect(getSiegeNavigationState(window.location.search)).toBeNull();
  });
});
