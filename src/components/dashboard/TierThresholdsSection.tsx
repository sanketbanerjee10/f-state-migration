import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Edit3, Sofa } from 'lucide-react';
import {
  getGetAdminTierThresholdsQueryKey,
  getGetTierThresholdsQueryKey,
  useGetAdminTierThresholds,
  useUpdateAdminTierThreshold,
  type TierThreshold,
} from '@workspace/api-client-react';
import { TIER_COLORS } from '../../lib/migrationScore';

interface TierThresholdsSectionProps {
  enabled?: boolean;
  onNotice?: (msg: string) => void;
  onError?: (err: unknown) => void;
}

export function TierThresholdsSection({
  enabled = true,
  onNotice,
  onError,
}: TierThresholdsSectionProps) {
  const client = useQueryClient();
  const [editingThreshold, setEditingThreshold] = useState<TierThreshold | null>(null);
  const [thresholdScoreMin, setThresholdScoreMin] = useState('');
  const [thresholdPasses, setThresholdPasses] = useState('');
  const [thresholdError, setThresholdError] = useState('');

  const tierThresholds = useGetAdminTierThresholds({
    query: {
      queryKey: getGetAdminTierThresholdsQueryKey(),
      enabled,
    },
  });

  const updateThresholdMutation = useUpdateAdminTierThreshold();

  const beginEditThreshold = (t: TierThreshold) => {
    setEditingThreshold(t);
    setThresholdScoreMin(String(t.scoreMin));
    setThresholdPasses(String(t.passesRequired));
    setThresholdError('');
  };

  const saveThreshold = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingThreshold) return;
    setThresholdError('');

    const scoreVal = Number(thresholdScoreMin);
    const passVal = Number(thresholdPasses);

    if (isNaN(scoreVal) || scoreVal < 0) {
      setThresholdError('Minimum score must be a non-negative number.');
      return;
    }
    if (isNaN(passVal) || passVal < 1) {
      setThresholdError('Passes required must be at least 1.');
      return;
    }

    try {
      await updateThresholdMutation.mutateAsync({
        name: editingThreshold.name as any,
        data: { scoreMin: scoreVal, passesRequired: passVal },
      });
      void client.invalidateQueries({
        queryKey: getGetAdminTierThresholdsQueryKey(),
      });
      void client.invalidateQueries({
        queryKey: getGetTierThresholdsQueryKey(),
      });
      setEditingThreshold(null);
      onNotice?.(`Tier threshold for "${editingThreshold.name}" updated successfully.`);
    } catch (err) {
      onError?.(err);
      setThresholdError(
        err instanceof Error ? err.message : 'Failed to update threshold.',
      );
    }
  };

  return (
    <>
      <section className="admin-panel tier-thresholds-panel" style={{ marginTop: 24 }}>
        <div className="panel-heading">
          <div>
            <span className="panel-kicker">SCORING & TIERS</span>
            <h2>Migration Tier Thresholds</h2>
            <p>
              Configurable score boundaries and pass requirements evaluated for every applicant.
            </p>
          </div>
        </div>

        {tierThresholds.isLoading ? (
          <div className="skeleton alliance-skeleton" />
        ) : tierThresholds.isError ? (
          <div className="admin-error" role="alert">
            <span>
              {tierThresholds.error instanceof Error
                ? tierThresholds.error.message
                : 'Failed to load tier thresholds.'}
            </span>
            <button className="button" onClick={() => void tierThresholds.refetch()}>
              Retry
            </button>
          </div>
        ) : (
          <div className="table-scroll">
            <table className="applications-table">
              <thead>
                <tr>
                  <th>Tier</th>
                  <th>Min Score Threshold</th>
                  <th>Base Passes Required</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {tierThresholds.data?.map((item) => (
                  <tr
                    key={item.name}
                    data-testid={`threshold-row-${item.name.toLowerCase()}`}
                  >
                    <td>
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 6,
                          fontWeight: 600,
                          color:
                            TIER_COLORS[item.name as keyof typeof TIER_COLORS]?.text ||
                            '#f1f5f9',
                        }}
                      >
                        <Sofa
                          size={14}
                          color={
                            TIER_COLORS[item.name as keyof typeof TIER_COLORS]?.iconColor
                          }
                          strokeWidth={2.3}
                        />
                        {TIER_COLORS[item.name as keyof typeof TIER_COLORS]?.label ||
                          item.name}
                      </span>
                    </td>
                    <td>
                      <strong>≥ {Number(item.scoreMin).toFixed(1)}</strong> points
                    </td>
                    <td>
                      <strong>{item.passesRequired}</strong> migration passes
                    </td>
                    <td>
                      <button
                        className="button button-quiet button-sm"
                        onClick={() => beginEditThreshold(item)}
                        data-testid={`edit-threshold-${item.name.toLowerCase()}`}
                      >
                        <Edit3 size={13} /> Edit threshold
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Edit Threshold Modal */}
      {editingThreshold && (
        <div
          className="dialog-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setEditingThreshold(null);
          }}
        >
          <section
            className="dialog alliance-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="threshold-dialog-title"
          >
            <h2 id="threshold-dialog-title">
              Configure {editingThreshold.name} Tier
            </h2>
            <form onSubmit={saveThreshold}>
              <label className="label" htmlFor="threshold-score">
                Minimum Score Threshold
              </label>
              <input
                id="threshold-score"
                className="control"
                type="number"
                step="0.1"
                min="0"
                required
                value={thresholdScoreMin}
                onChange={(e) => setThresholdScoreMin(e.target.value)}
                data-testid="threshold-score-input"
              />
              <label className="label auth-label" htmlFor="threshold-passes">
                Base Migration Passes Required
              </label>
              <input
                id="threshold-passes"
                className="control"
                type="number"
                min="1"
                max="1000"
                required
                value={thresholdPasses}
                onChange={(e) => setThresholdPasses(e.target.value)}
                data-testid="threshold-passes-input"
              />
              {thresholdError && (
                <p className="error-text" role="alert">
                  {thresholdError}
                </p>
              )}
              <div className="dialog-actions">
                <button
                  className="button button-quiet"
                  type="button"
                  onClick={() => setEditingThreshold(null)}
                  data-testid="cancel-threshold-edit"
                >
                  Cancel
                </button>
                <button
                  className="button button-primary"
                  type="submit"
                  disabled={updateThresholdMutation.isPending}
                  data-testid="save-threshold"
                >
                  {updateThresholdMutation.isPending ? 'Saving…' : 'Save threshold'}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </>
  );
}
