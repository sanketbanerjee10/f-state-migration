import { useState, useRef, useEffect } from 'react';
import { Sofa, Info, ShieldCheck } from 'lucide-react';
import {
  type MigrationScoreResult,
  TIER_COLORS,
  DEFAULT_THRESHOLDS,
  type TierThresholds,
  useLiveTierThresholds,
} from '../lib/migrationScore';

interface MigrationScoreBadgeProps {
  scoreResult: MigrationScoreResult | null;
  playerName?: string;
  size?: 'sm' | 'md' | 'lg';
  showDetailsText?: boolean;
  disableHover?: boolean;
}

export function MigrationScoreBadge({
  scoreResult,
  playerName,
  size = 'md',
  showDetailsText = false,
  disableHover = false
}: MigrationScoreBadgeProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    if (open && !disableHover) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
    return undefined;
  }, [open, disableHover]);

  if (!scoreResult) return null;

  const tierMeta = TIER_COLORS[scoreResult.tier];
  const iconSize = size === 'sm' ? 14 : size === 'lg' ? 20 : 16;
  const badgePadding = size === 'sm' ? '3px 6px' : '4px 8px';

  return (
    <div
      ref={containerRef}
      style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}
    >
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          if(!disableHover) setOpen((prev) => !prev);
        }}
        onMouseEnter={() => { if(!disableHover) setOpen(true) }}
        aria-label={`Migration score: ${scoreResult.score.toFixed(2)}, tier: ${tierMeta.label}`}
        title={`Migration Score: ${scoreResult.score.toFixed(2)} (${tierMeta.label})${!disableHover ? ' — Click/hover for breakdown' : ''}`}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 5,
          background: tierMeta.bg,
          border: `1px solid ${tierMeta.border}`,
          borderRadius: 6,
          padding: badgePadding,
          color: tierMeta.text,
          cursor: 'pointer',
          transition: 'transform 0.15s ease, box-shadow 0.15s ease',
        }}
      >
        <Sofa size={iconSize} color={tierMeta.iconColor} strokeWidth={2.2} />
        {showDetailsText && (
          <span style={{ fontSize: 11, fontWeight: 700, fontFamily: 'var(--app-font-mono)' }}>
            {scoreResult.score.toFixed(2)}
          </span>
        )}
      </button>

      {/* Popover Breakdown Dialog */}
      {open && (
        <div
          onClick={(e) => e.stopPropagation()}
          style={{
            position: 'absolute',
            bottom: 'calc(100% + 8px)',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 40,
            width: 260,
            padding: '12px 14px',
            borderRadius: 8,
            background: '#131b26',
            border: `1px solid ${tierMeta.border}`,
            boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.6), 0 8px 10px -6px rgba(0, 0, 0, 0.4)',
            color: '#f1f5f9',
            fontSize: 12,
            lineHeight: 1.45,
            pointerEvents: 'auto',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
            <span style={{ fontWeight: 700, color: tierMeta.text, display: 'inline-flex', alignItems: 'center', gap: 5 }}>
              <Sofa size={14} color={tierMeta.iconColor} />
              {tierMeta.label} Bracket
            </span>
            <span
              style={{
                fontFamily: 'var(--app-font-mono)',
                fontWeight: 700,
                fontSize: 13,
                color: tierMeta.text,
              }}
            >
              {scoreResult.score.toFixed(2)} pts
            </span>
          </div>

          {playerName && (
            <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 6, fontWeight: 500 }}>
              Player: <strong style={{ color: '#e2e8f0' }}>{playerName}</strong>
            </div>
          )}

          <div
            style={{
              padding: '6px 8px',
              borderRadius: 4,
              background: 'rgba(255, 255, 255, 0.04)',
              fontSize: 11,
              color: '#cbd5e1',
              marginBottom: 8,
            }}
          >
            Estimated requirement:{' '}
            <strong style={{ color: tierMeta.text }}>{scoreResult.passesRequired} passes</strong>
          </div>

          <div style={{ fontSize: 10, color: '#94a3b8', borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: 6 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
              <span>Base Formula:</span>
              <strong style={{ color: '#cbd5e1' }}>{scoreResult.breakdown.baseComponent.toFixed(2)}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
              <span>Tech + Vehicle Bonus:</span>
              <strong style={{ color: '#cbd5e1' }}>+{scoreResult.breakdown.techVehicleBonus.toFixed(2)}</strong>
            </div>
            {scoreResult.breakdown.eliteTechBonus > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Elite Tech Bonus:</span>
                <strong style={{ color: '#fde047' }}>+{scoreResult.breakdown.eliteTechBonus.toFixed(2)}</strong>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Verified Badge Icon with Tooltip
 */
export function VerifiedBadge({ tooltipText = 'Power figures verified via screenshot.' }: { tooltipText?: string }) {
  const [showTooltip, setShowTooltip] = useState(false);

  return (
    <div
      style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      <span
        aria-label="Verified via screenshot"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 22,
          height: 22,
          borderRadius: 4,
          background: 'rgba(74, 222, 128, 0.12)',
          border: '1px solid rgba(74, 222, 128, 0.35)',
          color: '#4ade80',
          cursor: 'help',
        }}
      >
        <ShieldCheck size={13} />
      </span>

      {showTooltip && (
        <div
          style={{
            position: 'absolute',
            bottom: 'calc(100% + 6px)',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 40,
            whiteSpace: 'nowrap',
            padding: '4px 8px',
            borderRadius: 4,
            background: '#0f172a',
            border: '1px solid rgba(74, 222, 128, 0.4)',
            color: '#86efac',
            fontSize: 11,
            boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
            pointerEvents: 'none',
          }}
        >
          {tooltipText}
        </div>
      )}
    </div>
  );
}

/**
 * Common Guide Component explaining migration scoring and tier brackets.
 * Highlights the user's estimated bracket.
 */
interface MigrationScoringGuideProps {
  currentTier?: 'Regular' | 'Medium' | 'Advanced' | 'Elite' | null;
  currentScore?: number | null;
  thresholds?: TierThresholds;
}

export function MigrationScoringGuide({ currentTier, currentScore, thresholds }: MigrationScoringGuideProps) {
  const { thresholds: liveThresholds } = useLiveTierThresholds();
  const t = thresholds || liveThresholds || DEFAULT_THRESHOLDS;

  let activeTier = currentTier;
  if (!activeTier && currentScore != null) {
    if (currentScore >= t.eliteMin) activeTier = 'Elite';
    else if (currentScore >= t.advancedMin) activeTier = 'Advanced';
    else if (currentScore >= t.mediumMin) activeTier = 'Medium';
    else activeTier = 'Regular';
  }

  const brackets: Array<{
    key: 'Regular' | 'Medium' | 'Advanced' | 'Elite';
    range: string;
    passes: number;
    desc: string;
  }> = [
    {
      key: 'Regular',
      range: `Score < ${t.mediumMin}`,
      passes: t.regularPasses,
      desc: `Standard migration threshold requiring ${t.regularPasses} base passes.`,
    },
    {
      key: 'Medium',
      range: `Score ${t.mediumMin} – ${(t.advancedMin - 0.1).toFixed(1)}`,
      passes: t.mediumPasses,
      desc: `Intermediate bracket for active development profiles requiring ${t.mediumPasses} passes.`,
    },
    {
      key: 'Advanced',
      range: `Score ${t.advancedMin} – ${(t.eliteMin - 0.1).toFixed(1)}`,
      passes: t.advancedPasses,
      desc: `High combat/tech efficiency tier requiring ${t.advancedPasses} passes.`,
    },
    {
      key: 'Elite',
      range: `Score ≥ ${t.eliteMin}`,
      passes: t.elitePasses,
      desc: `Top-tier powerhouse combat bracket requiring ${t.elitePasses} passes.`,
    },
  ];

  return (
    <div
      style={{
        marginTop: 14,
        padding: '14px 16px',
        borderRadius: 8,
        background: 'rgba(15, 23, 42, 0.65)',
        border: '1px solid rgba(255, 255, 255, 0.08)',
      }}
      data-testid="migration-scoring-guide"
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 8 }}>
        <Info size={15} style={{ color: '#93c5fd' }} />
        <span style={{ fontSize: 13, fontWeight: 600, color: '#f1f5f9' }}>
          Understanding Migration Scoring
        </span>
      </div>

      <p style={{ margin: '0 0 12px', fontSize: 12, color: '#94a3b8', lineHeight: 1.5 }}>
        Scores are calculated from your verified structure, tech, hero, and vehicle power breakdown.
        Higher combat efficiency places accounts in higher migration brackets requiring more passes.
      </p>

      {/* Grid of Brackets */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: 10,
          marginBottom: 10,
        }}
      >
        {brackets.map((b) => {
          const isSelected = activeTier === b.key;
          const meta = TIER_COLORS[b.key];

          return (
            <div
              key={b.key}
              style={{
                padding: '10px 12px',
                borderRadius: 6,
                background: isSelected ? meta.bg : 'rgba(255, 255, 255, 0.02)',
                border: isSelected ? `2px solid ${meta.border}` : '1px solid rgba(255, 255, 255, 0.06)',
                position: 'relative',
                boxShadow: isSelected ? `0 0 15px ${meta.bg}` : 'none',
                transition: 'border-color 0.2s, background 0.2s',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    fontWeight: 700,
                    fontSize: 12,
                    color: meta.text,
                  }}
                >
                  <Sofa size={15} color={meta.iconColor} strokeWidth={2.4} />
                  {meta.label}
                </span>
                {isSelected && (
                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: 700,
                      color: meta.text,
                      background: 'rgba(0,0,0,0.3)',
                      padding: '1px 6px',
                      borderRadius: 10,
                    }}
                  >
                    Your Bracket
                  </span>
                )}
              </div>

              <div style={{ fontSize: 11, color: '#e2e8f0', fontWeight: 600, marginBottom: 2 }}>
                {b.range}
              </div>

              <div style={{ fontSize: 10, color: '#94a3b8' }}>
                Move Requirement: <strong style={{ color: meta.text }}>{b.passes} passes</strong>
              </div>
            </div>
          );
        })}
      </div>

      {/* Disclaimer */}
      <div
        style={{
          fontSize: 11,
          color: '#64748b',
          lineHeight: 1.45,
          paddingTop: 8,
          borderTop: '1px dashed rgba(255, 255, 255, 0.06)',
        }}
      >
        ⚠️ <strong>Note:</strong> This score is an automated estimation based on standard game power formulas and is intended as a guidance reference for your migration planning. Final pass requirements are confirmed in-game when the official migration window opens.
      </div>
    </div>
  );
}
