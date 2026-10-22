import { useMemo } from 'react';
import {
  getGetTierThresholdsQueryKey,
  getTierThresholds,
  useGetTierThresholds,
  type TierThreshold,
} from '@/lib/api-client';

export interface MigrationScoreResult {
  score: number;
  tier: 'Regular' | 'Medium' | 'Advanced' | 'Elite';
  passesRequired: number;
  breakdown: {
    baseComponent: number;
    techVehicleBonus: number;
    eliteTechBonus: number;
  };
}

export interface TierThresholds {
  mediumMin: number;
  advancedMin: number;
  eliteMin: number;
  regularPasses: number;
  mediumPasses: number;
  advancedPasses: number;
  elitePasses: number;
}

export const DEFAULT_THRESHOLDS: TierThresholds = {
  mediumMin: 20,
  advancedMin: 40,
  eliteMin: 100,
  regularPasses: 10,
  mediumPasses: 15,
  advancedPasses: 20,
  elitePasses: 50,
};

const TIER_THRESHOLDS_CACHE_KEY = 'state565_tier_thresholds';
const TIER_THRESHOLDS_CACHE_TTL = 3 * 24 * 60 * 60 * 1000;

interface CachedTierThresholds {
  cachedAt: number;
  rows: TierThreshold[];
}

function isTierThreshold(value: unknown): value is TierThreshold {
  if (typeof value !== 'object' || value === null) return false;
  const row = value as Record<string, unknown>;
  return (
    typeof row.id === 'number' &&
    ['Regular', 'Medium', 'Advanced', 'Elite'].includes(String(row.name)) &&
    typeof row.scoreMin === 'number' &&
    Number.isFinite(row.scoreMin) &&
    typeof row.passesRequired === 'number' &&
    Number.isFinite(row.passesRequired) &&
    typeof row.updatedAt === 'string'
  );
}

function readCachedTierThresholds(): TierThreshold[] | null {
  try {
    const raw = localStorage.getItem(TIER_THRESHOLDS_CACHE_KEY);
    if (!raw) return null;

    const cached: unknown = JSON.parse(raw);
    if (typeof cached !== 'object' || cached === null) return null;

    const entry = cached as Record<string, unknown>;
    const age = Date.now() - Number(entry.cachedAt);
    if (
      !Number.isFinite(age) ||
      age < 0 ||
      age >= TIER_THRESHOLDS_CACHE_TTL ||
      !Array.isArray(entry.rows) ||
      !entry.rows.every(isTierThreshold)
    ) {
      return null;
    }

    return entry.rows;
  } catch {
    return null;
  }
}

async function getCachedTierThresholds(signal?: AbortSignal): Promise<TierThreshold[]> {
  const cachedRows = readCachedTierThresholds();
  if (cachedRows) return cachedRows;

  const rows = await getTierThresholds({ signal });
  try {
    const cached: CachedTierThresholds = { cachedAt: Date.now(), rows };
    localStorage.setItem(TIER_THRESHOLDS_CACHE_KEY, JSON.stringify(cached));
  } catch {
    // Keep the fetched result available even when browser storage is unavailable.
  }
  return rows;
}

export function rowsToTierThresholds(
  rows?: Array<{ name: string; scoreMin: number; passesRequired: number }>,
): TierThresholds {
  if (!rows || !rows.length) return DEFAULT_THRESHOLDS;
  const thresholds: TierThresholds = { ...DEFAULT_THRESHOLDS };
  for (const row of rows) {
    const sMin = Number(row.scoreMin);
    const pReq = Number(row.passesRequired);
    if (row.name === 'Regular') {
      thresholds.regularPasses = pReq;
    } else if (row.name === 'Medium') {
      thresholds.mediumMin = sMin;
      thresholds.mediumPasses = pReq;
    } else if (row.name === 'Advanced') {
      thresholds.advancedMin = sMin;
      thresholds.advancedPasses = pReq;
    } else if (row.name === 'Elite') {
      thresholds.eliteMin = sMin;
      thresholds.elitePasses = pReq;
    }
  }
  return thresholds;
}

export function useLiveTierThresholds(): {
  thresholds: TierThresholds;
  isLoading: boolean;
} {
  const { data: rows, isLoading } = useGetTierThresholds({
    query: {
      queryKey: getGetTierThresholdsQueryKey(),
      queryFn: ({ signal }) => getCachedTierThresholds(signal),
      staleTime: TIER_THRESHOLDS_CACHE_TTL,
      refetchOnWindowFocus: false,
    },
  });

  const thresholds = useMemo(() => rowsToTierThresholds(rows), [rows]);
  return { thresholds, isLoading };
}

export function getTierPassHint(
  tier: 'Regular' | 'Medium' | 'Advanced' | 'Elite',
  t: TierThresholds = DEFAULT_THRESHOLDS,
): string {
  switch (tier) {
    case 'Regular':
      return `Score < ${t.mediumMin} · ${t.regularPasses} passes`;
    case 'Medium':
      return `Score ${t.mediumMin} – ${(t.advancedMin - 0.1).toFixed(1)} · ${t.mediumPasses} passes`;
    case 'Advanced':
      return `Score ${t.advancedMin} – ${(t.eliteMin - 0.1).toFixed(1)} · ${t.advancedPasses} passes`;
    case 'Elite':
      return `Score ≥ ${t.eliteMin} · ${t.elitePasses} passes`;
  }
}

/**
 * Calculates the migration score.
 * All parameters must be in MILLIONS (e.g., pass 84.8 not 84_800_000).
 * Returns null if all inputs are zero/missing.
 */
export function calculateMigrationScore(
  structureMillion: number,
  techMillion: number,
  heroMillion: number,
  vehicleMillion: number,
  thresholds: TierThresholds = DEFAULT_THRESHOLDS,
): MigrationScoreResult | null {
  if (structureMillion === 0 && techMillion === 0 && heroMillion === 0 && vehicleMillion === 0) {
    return null;
  }

  const base = (structureMillion + techMillion + heroMillion + 3 * vehicleMillion) / 6 - 2;
  const techVehicleSum = techMillion + vehicleMillion;
  const techVehicleMod = Math.min(14, 2.8 * Math.max(0, techVehicleSum - 21.5));
  const eliteTechMod = 9.2 * Math.max(0, techMillion - 30);
  const finalScore = base + techVehicleMod + eliteTechMod;
  const score = parseFloat(finalScore.toFixed(2));

  let tier: 'Regular' | 'Medium' | 'Advanced' | 'Elite';
  let passesRequired: number;

  if (score >= thresholds.eliteMin) {
    tier = 'Elite';
    passesRequired = thresholds.elitePasses;
  } else if (score >= thresholds.advancedMin) {
    tier = 'Advanced';
    passesRequired = thresholds.advancedPasses;
  } else if (score >= thresholds.mediumMin) {
    tier = 'Medium';
    passesRequired = thresholds.mediumPasses;
  } else {
    tier = 'Regular';
    passesRequired = thresholds.regularPasses;
  }

  return {
    score,
    tier,
    passesRequired,
    breakdown: {
      baseComponent: parseFloat(base.toFixed(2)),
      techVehicleBonus: parseFloat(techVehicleMod.toFixed(2)),
      eliteTechBonus: parseFloat(eliteTechMod.toFixed(2)),
    },
  };
}

/**
 * Convenience helper that accepts raw integer power values (as stored in DB / draft strings).
 * Divides by 1_000_000 internally before running the formula.
 */
export function calculateMigrationScoreFromRaw(
  structureRaw: number,
  techRaw: number,
  heroRaw: number,
  vehicleRaw: number,
  thresholds?: TierThresholds,
): MigrationScoreResult | null {
  return calculateMigrationScore(
    structureRaw / 1_000_000,
    techRaw / 1_000_000,
    heroRaw / 1_000_000,
    vehicleRaw / 1_000_000,
    thresholds,
  );
}

/**
 * Palette matching the user specification:
 * - Elite: Gold (#f59e0b / #fbbf24)
 * - Advanced: Purple (#a855f7 / #c084fc)
 * - Intermediate / Medium: Light Blue (#38bdf8 / #7dd3fc)
 * - Regular: Light Grey / Almost White (#f1f5f9 / #e2e8f0)
 */
export const TIER_COLORS: Record<
  'Regular' | 'Medium' | 'Advanced' | 'Elite',
  { bg: string; border: string; text: string; iconColor: string; label: string; passHint: string }
> = {
  Regular: {
    bg: 'rgba(241, 245, 249, 0.08)',
    border: 'rgba(241, 245, 249, 0.3)',
    text: '#f1f5f9',
    iconColor: '#f1f5f9',
    label: 'Regular',
    passHint: 'Score < 20 · 10 passes',
  },
  Medium: {
    bg: 'rgba(56, 189, 248, 0.12)',
    border: 'rgba(56, 189, 248, 0.4)',
    text: '#7dd3fc',
    iconColor: '#38bdf8',
    label: 'Intermediate',
    passHint: 'Score 20 – 39.9 · 15 passes',
  },
  Advanced: {
    bg: 'rgba(168, 85, 247, 0.14)',
    border: 'rgba(168, 85, 247, 0.45)',
    text: '#d8b4fe',
    iconColor: '#c084fc',
    label: 'Advanced',
    passHint: 'Score 40 – 99.9 · 20 passes',
  },
  Elite: {
    bg: 'rgba(245, 158, 11, 0.14)',
    border: 'rgba(245, 158, 11, 0.45)',
    text: '#fde047',
    iconColor: '#fbbf24',
    label: 'Elite',
    passHint: 'Score ≥ 100 · 50 passes',
  },
};

/** Determine tier from score using thresholds (for admin panel display where score is pre-stored). */
export function tierFromScore(
  score: number,
  thresholds: TierThresholds = DEFAULT_THRESHOLDS,
): 'Regular' | 'Medium' | 'Advanced' | 'Elite' {
  if (score >= thresholds.eliteMin) return 'Elite';
  if (score >= thresholds.advancedMin) return 'Advanced';
  if (score >= thresholds.mediumMin) return 'Medium';
  return 'Regular';
}
