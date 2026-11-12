import { getActiveAlliances, getGetActiveAlliancesQueryKey, useGetActiveAlliances, type Alliance } from '@/lib/api-client';

const ACTIVE_ALLIANCES_CACHE_KEY = 'state565_active_alliances';
export const ACTIVE_ALLIANCES_CACHE_TTL = 24 * 60 * 60 * 1000;

interface CachedActiveAlliances {
  cachedAt: number;
  alliances: Alliance[];
}

function isAlliance(value: unknown): value is Alliance {
  if (typeof value !== 'object' || value === null) return false;
  const alliance = value as Record<string, unknown>;
  return (
    typeof alliance.id === 'number' &&
    Number.isFinite(alliance.id) &&
    typeof alliance.tag === 'string' &&
    typeof alliance.name === 'string'
  );
}

function readCachedActiveAlliances(): Alliance[] | null {
  try {
    const raw = localStorage.getItem(ACTIVE_ALLIANCES_CACHE_KEY);
    if (!raw) return null;

    const cached: unknown = JSON.parse(raw);
    if (typeof cached !== 'object' || cached === null) return null;

    const entry = cached as Record<string, unknown>;
    const age = Date.now() - Number(entry.cachedAt);
    if (
      !Number.isFinite(age) ||
      age < 0 ||
      age >= ACTIVE_ALLIANCES_CACHE_TTL ||
      !Array.isArray(entry.alliances) ||
      !entry.alliances.every(isAlliance)
    ) {
      return null;
    }

    return entry.alliances;
  } catch {
    return null;
  }
}

export function clearCachedActiveAlliances(): void {
  try {
    localStorage.removeItem(ACTIVE_ALLIANCES_CACHE_KEY);
  } catch {
    // The query cache will still be invalidated when browser storage is unavailable.
  }
}

export async function getCachedActiveAlliances(signal?: AbortSignal): Promise<Alliance[]> {
  const cachedAlliances = readCachedActiveAlliances();
  if (cachedAlliances) return cachedAlliances;

  const alliances = await getActiveAlliances({ signal });
  try {
    const cached: CachedActiveAlliances = { cachedAt: Date.now(), alliances };
    localStorage.setItem(ACTIVE_ALLIANCES_CACHE_KEY, JSON.stringify(cached));
  } catch {
    // Keep the fetched result available even when browser storage is unavailable.
  }
  return alliances;
}

export function useCachedActiveAlliances(enabled = true) {
  return useGetActiveAlliances({
    query: {
      queryKey: getGetActiveAlliancesQueryKey(),
      queryFn: ({ signal }) => getCachedActiveAlliances(signal),
      enabled,
      staleTime: ACTIVE_ALLIANCES_CACHE_TTL,
      refetchOnWindowFocus: false,
    },
  });
}
