// @vitest-environment jsdom

import { afterEach, describe, expect, it } from 'vitest';
import {
  getGameMenuView,
  getGameMenuNavigationState,
  pushGameMenuNavigationState,
} from '@/components/game/GameMenuNavigation';

describe('game menu URL navigation', () => {
  afterEach(() => {
    window.history.replaceState(null, '', '/');
  });

  it('reads supported menu views and falls back for missing or invalid values', () => {
    expect(getGameMenuView('?gameMenu=level-select', 'home')).toBe('level-select');
    expect(getGameMenuView('?gameMenu=unknown', 'home')).toBe('home');
    expect(getGameMenuView('?campaign=1', 'level-select')).toBe('level-select');
    expect(getGameMenuNavigationState('?gameMenu=playing')).toBe('playing');
  });

  it('pushes the selected view while preserving other URL state', () => {
    window.history.replaceState({ key: 'existing' }, '', '/game?campaign=1#menu');

    pushGameMenuNavigationState('enemy-guide');

    expect(window.location.pathname).toBe('/game');
    expect(window.location.search).toBe('?campaign=1&gameMenu=enemy-guide');
    expect(window.location.hash).toBe('#menu');
    expect(window.history.state).toEqual({ key: 'existing' });
  });
});
