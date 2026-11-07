// @vitest-environment jsdom

import { act, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useGameSettings } from '@/components/game/useGameSettings';

function SettingsHarness() {
  const { settings, loaded, updateSettings } = useGameSettings();
  return createElement(
    'button',
    {
      disabled: !loaded,
      onClick: () =>
        updateSettings({ ...settings, musicVolume: settings.musicVolume / 2 }),
    },
    'Save settings',
  );
}

describe('useGameSettings persistence', () => {
  let container: HTMLDivElement;
  let root: Root | null = null;

  afterEach(async () => {
    if (root) {
      await act(async () => root.unmount());
      root = null;
    }
    container?.remove();
    window.localStorage.clear();
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('debounces storage writes and flushes pending settings on unmount', async () => {
    vi.useFakeTimers();
    const setItem = vi.spyOn(Storage.prototype, 'setItem');
    container = document.createElement('div');
    document.body.append(container);
    root = createRoot(container);

    await act(async () => {
      root!.render(createElement(SettingsHarness));
    });

    const button = container.querySelector('button')!;
    await act(async () => button.click());
    expect(setItem).not.toHaveBeenCalled();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(250);
    });
    expect(setItem).toHaveBeenCalledOnce();

    await act(async () => button.click());
    expect(setItem).toHaveBeenCalledOnce();
    await act(async () => root.unmount());
    root = null;
    expect(setItem).toHaveBeenCalledTimes(2);
    setItem.mockRestore();
  });
});
