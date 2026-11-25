// @vitest-environment jsdom

import * as React from 'react';
import { act, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { GameMenuSecondaryNavigation } from '@/components/game/GameMenuSecondaryNavigation';

(globalThis as typeof globalThis & { React?: typeof React }).React = React;

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

describe('game menu secondary navigation', () => {
  let root: Root | null = null;
  let container: HTMLDivElement | null = null;

  afterEach(() => {
    if (root) act(() => root?.unmount());
    container?.remove();
    root = null;
    container = null;
  });

  it('keeps the three utility destinations together and routes each selection', () => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    const onViewChange = vi.fn();

    act(() => {
      root?.render(createElement(GameMenuSecondaryNavigation, { onViewChange }));
    });

    const navigation = container.querySelector('nav[aria-label="game.menu.secondaryNavigation"]');
    const buttons = Array.from(navigation?.querySelectorAll('button') ?? []);

    expect(buttons.map((button) => button.textContent?.trim())).toEqual([
      'game.menu.leaderboard',
      'game.menu.guides',
      'game.menu.settings',
    ]);

    act(() => buttons.forEach((button) => button.click()));
    expect(onViewChange.mock.calls).toEqual([
      ['leaderboard'],
      ['enemy-guide'],
      ['settings'],
    ]);
  });
});
