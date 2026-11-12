import {
  getListAdminAlliancesQueryKey,
  listAdminAlliances,
  useListAdminAlliances,
  type AdminAlliance,
} from '@/lib/api-client';
import { ACTIVE_ALLIANCES_CACHE_TTL } from './activeAlliancesCache';

const ADMIN_ALLIANCES_CACHE_KEY = 'state565_admin_alliances';

interface CachedAdminAlliances {
  cachedAt: number;
  alliances: AdminAlliance[];
}

function isAdminAlliance(value: unknown): value is AdminAlliance {
  if (typeof value !== 'object' || value === null) return false;
  const alliance = value as Record<string, unknown>;
  return (
    typeof alliance.id === 'number' &&
    Number.isFinite(alliance.id) &&
    typeof alliance.tag === 'string' &&
    typeof alliance.name === 'string' &&
    typeof alliance.isActive === 'boolean' &&
    typeof alliance.displayOrder === 'number' &&
    Number.isFinite(alliance.displayOrder)
  );
}

function readCachedAdminAlliances(): AdminAlliance[] | null {
  try {
    const raw = localStorage.getItem(ADMIN_ALLIANCES_CACHE_KEY);
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
      !entry.alliances.every(isAdminAlliance)
    ) {
      return null;
    }

    return entry.alliances;
  } catch {
    return null;
  }
}

export async function getCachedAdminAlliances(
  signal?: AbortSignal,
): Promise<AdminAlliance[]> {
  const cachedAlliances = readCachedAdminAlliances();
  if (cachedAlliances) return cachedAlliances;

  const alliances = await listAdminAlliances({ signal });
  try {
    const cached: CachedAdminAlliances = { cachedAt: Date.now(), alliances };
    localStorage.setItem(ADMIN_ALLIANCES_CACHE_KEY, JSON.stringify(cached));
  } catch {
    // Keep the fetched result available even when browser storage is unavailable.
  }
  return alliances;
}

export function clearCachedAdminAlliances(): void {
  try {
    localStorage.removeItem(ADMIN_ALLIANCES_CACHE_KEY);
  } catch {
    // The query cache will still be invalidated when browser storage is unavailable.
  }
}

export function useCachedAdminAlliances(enabled = true) {
  return useListAdminAlliances({
    query: {
      queryKey: getListAdminAlliancesQueryKey(),
      queryFn: ({ signal }) => getCachedAdminAlliances(signal),
      enabled,
      staleTime: ACTIVE_ALLIANCES_CACHE_TTL,
      refetchOnWindowFocus: false,
    },
  });
}
