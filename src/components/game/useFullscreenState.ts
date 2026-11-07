import { useSyncExternalStore } from 'react';

function subscribeToFullscreenChanges(onChange: () => void): () => void {
  document.addEventListener('fullscreenchange', onChange);
  return () => document.removeEventListener('fullscreenchange', onChange);
}

function getFullscreenSnapshot(): boolean {
  return document.fullscreenElement !== null;
}

export function useFullscreenState(): boolean {
  return useSyncExternalStore(
    subscribeToFullscreenChanges,
    getFullscreenSnapshot,
    () => false,
  );
}
