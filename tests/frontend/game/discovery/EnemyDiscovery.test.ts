import { describe, expect, it, vi } from 'vitest';
import {
  ENEMY_DISCOVERY_LABELS,
  ENEMY_DISCOVERY_STORAGE_KEY,
  ENEMY_DISCOVERY_TYPES,
  ENEMY_GUIDE_DETAILS,
  notifyNewEnemyDiscoveries,
  readDiscoveredEnemies,
  recordEnemyDiscovery,
} from '@/game/discovery/EnemyDiscovery';

function createStorage(initialValue?: string): Storage {
  const store = new Map<string, string>();
  if (initialValue !== undefined) {
    store.set(ENEMY_DISCOVERY_STORAGE_KEY, initialValue);
  }

  return {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => {
      store.set(key, value);
    },
    removeItem: (key: string) => {
      store.delete(key);
    },
    clear: () => {
      store.clear();
    },
    key: (index: number) => Array.from(store.keys())[index] ?? null,
    length: store.size,
  } as Storage;
}

describe('enemy discovery notifications', () => {
  it('provides guide details for every discoverable enemy type', () => {
    expect(ENEMY_DISCOVERY_TYPES).toHaveLength(9);
    for (const enemyType of ENEMY_DISCOVERY_TYPES) {
      expect(ENEMY_DISCOVERY_LABELS[enemyType]).toBeTruthy();
      expect(ENEMY_GUIDE_DETAILS[enemyType].description).toBeTruthy();
      expect(ENEMY_GUIDE_DETAILS[enemyType].ability).toBeTruthy();
    }
  });

  it('stores and reads a stable set of discovered enemy types', () => {
    const storage = createStorage();

    expect(recordEnemyDiscovery(storage, ['walker', 'runner'])).toEqual(['walker', 'runner']);
    expect(readDiscoveredEnemies(storage)).toEqual(new Set(['walker', 'runner']));

    const persisted = JSON.parse(storage.getItem(ENEMY_DISCOVERY_STORAGE_KEY) ?? '[]');
    expect(persisted).toEqual(['walker', 'runner']);
  });

  it('ignores duplicate discoveries and keeps the storage write safe', () => {
    const storage = createStorage(JSON.stringify(['walker', 'runner']));
    const callback = vi.fn();

    expect(recordEnemyDiscovery(storage, ['runner', 'walker', 'brute'])).toEqual(['brute']);
    expect(callback).not.toHaveBeenCalled();
    expect(readDiscoveredEnemies(storage)).toEqual(new Set(['walker', 'runner', 'brute']));
  });

  it('notifies only once per new enemy type and gracefully handles invalid data', () => {
    const storage = createStorage('not json');
    const callback = vi.fn();

    expect(notifyNewEnemyDiscoveries(storage, ['walker', 'walker', 'spitter'], callback))
      .toEqual(['walker', 'spitter']);
    expect(callback.mock.calls.map(([enemyType]) => enemyType)).toEqual(['walker', 'spitter']);

    expect(readDiscoveredEnemies(storage)).toEqual(new Set(['walker', 'spitter']));
  });
});
