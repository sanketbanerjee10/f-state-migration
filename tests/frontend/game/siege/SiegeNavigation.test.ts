// @vitest-environment jsdom

import { beforeEach, describe, expect, it } from 'vitest';
import {
  clearSiegeNavigationState,
  getSiegeNavigationState,
  setSiegeNavigationState,
} from '../../../../src/game/siege/SiegeNavigation';

describe('Siege URL navigation', () => {
  beforeEach(() => {
    window.history.replaceState({}, '', '/game?gameMenu=home#arena');
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
      screen: 'playing',
      difficulty: 'easy',
      levelId: 'easy-01',
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

    setSiegeNavigationState({
      screen: 'playing',
      difficulty: 'difficult',
      levelId: 'difficult-03',
    });
    expect(getSiegeNavigationState(window.location.search)).toEqual({
      screen: 'playing',
      difficulty: 'difficult',
      levelId: 'difficult-03',
    });

    clearSiegeNavigationState();
    expect(window.location.search).toBe('?gameMenu=home');
    expect(window.location.hash).toBe('#arena');
    expect(getSiegeNavigationState(window.location.search)).toBeNull();
  });
});
