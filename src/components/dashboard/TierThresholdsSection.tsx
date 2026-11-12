import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQueryClient } from '@tanstack/react-query';
import { Edit3, Plus, Sofa } from 'lucide-react';
import {
  getGetTierThresholdsQueryKey,
  useCreateAdminTierThreshold,
  useUpdateAdminTierThreshold,
  type TierThreshold,
} from '@/lib/api-client';
import {
  clearCachedTierThresholds,
  useCachedTierThresholdRows,
  TIER_COLORS,
} from '../../lib/migrationScore';

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
  const { t } = useTranslation();
  const client = useQueryClient();
  const [editingThreshold, setEditingThreshold] = useState<TierThreshold | 'new' | null>(null);
  const [thresholdName, setThresholdName] = useState('');
  const [thresholdScoreMin, setThresholdScoreMin] = useState('');
  const [thresholdPasses, setThresholdPasses] = useState('');
  const [thresholdError, setThresholdError] = useState('');

  const tierThresholds = useCachedTierThresholdRows(enabled);

  const createThresholdMutation = useCreateAdminTierThreshold();
  const updateThresholdMutation = useUpdateAdminTierThreshold();

  const beginEditThreshold = (t: TierThreshold) => {
    setEditingThreshold(t);
    setThresholdName(t.name);
    setThresholdScoreMin(String(t.scoreMin));
    setThresholdPasses(String(t.passesRequired));
    setThresholdError('');
  };

  const beginAddThreshold = () => {
    setEditingThreshold('new');
    setThresholdName('');
    setThresholdScoreMin('');
    setThresholdPasses('');
    setThresholdError('');
  };

  const saveThreshold = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingThreshold) return;
    setThresholdError('');

    const name = thresholdName.trim();
    const scoreVal = Number(thresholdScoreMin);
    const passVal = Number(thresholdPasses);

    if (editingThreshold === 'new' && !name) {
      setThresholdError(t('components.dashboard.tierNameRequired'));
      return;
    }
    if (isNaN(scoreVal) || scoreVal < 0) {
      setThresholdError(t('components.dashboard.tierMinRequired'));
      return;
    }
    if (isNaN(passVal) || passVal < 1) {
      setThresholdError(t('components.dashboard.tierPassesRequired'));
      return;
    }

    try {
      if (editingThreshold === 'new') {
        await createThresholdMutation.mutateAsync({
          data: { name, scoreMin: scoreVal, passesRequired: passVal },
        });
      } else {
        await updateThresholdMutation.mutateAsync({
          name: editingThreshold.name,
          data: { scoreMin: scoreVal, passesRequired: passVal },
        });
      }
      clearCachedTierThresholds();
      void client.invalidateQueries({
        queryKey: getGetTierThresholdsQueryKey(),
      });
      setEditingThreshold(null);
      onNotice?.(
        t('components.dashboard.tierSaved', {
          name: editingThreshold === 'new' ? name : editingThreshold.name,
          operation: editingThreshold === 'new' ? 'added' : 'updated',
        }),
      );
    } catch (err) {
      onError?.(err);
      setThresholdError(
        err instanceof Error ? err.message : t('components.dashboard.tierFailed'),
      );
    }
  };

  return (
    <>
      <section className="admin-panel tier-thresholds-panel" style={{ marginTop: 24 }}>
        <div className="panel-heading">
          <div>
            <span className="panel-kicker">{t('components.dashboard.scoringTiers')}</span>
            <h2>{t('components.dashboard.tierTitle')}</h2>
            <p>
              {t('components.dashboard.tierDescription')}
            </p>
          </div>
          <button
            className="button button-primary"
            type="button"
            onClick={beginAddThreshold}
            data-testid="add-tier-threshold"
          >
            <Plus size={15} /> {t('components.dashboard.addThreshold')}
          </button>
        </div>

        {tierThresholds.isLoading ? (
          <div className="skeleton alliance-skeleton" />
        ) : tierThresholds.isError ? (
          <div className="admin-error" role="alert">
            <span>
              {tierThresholds.error instanceof Error
                ? tierThresholds.error.message
                : t('components.dashboard.thresholdFailed')}
            </span>
            <button className="button" onClick={() => void tierThresholds.refetch()}>
              {t('common.actions.retry')}
            </button>
          </div>
        ) : (
          <div className="table-scroll">
            <table className="applications-table">
              <thead>
                <tr>
                  <th>{t('components.dashboard.tierColumn')}</th>
                  <th>{t('components.dashboard.minColumn')}</th>
                  <th>{t('components.dashboard.passesColumn')}</th>
                  <th>{t('components.dashboard.actions')}</th>
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
                        {TIER_COLORS[item.name as keyof typeof TIER_COLORS]?.label
                          ? t(`components.scoring.tiers.${item.name.toLowerCase()}`)
                          : item.name}
                      </span>
                    </td>
                    <td>
                      <strong>≥ {Number(item.scoreMin).toFixed(1)}</strong> {t('components.dashboard.points')}
                    </td>
                    <td>
                      <strong>{item.passesRequired}</strong> {t('components.dashboard.passes')}
                    </td>
                    <td>
                      <button
                        className="button button-quiet button-sm"
                        onClick={() => beginEditThreshold(item)}
                        data-testid={`edit-threshold-${item.name.toLowerCase()}`}
                      >
                        <Edit3 size={13} /> {t('components.dashboard.editThreshold')}
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
              {editingThreshold === 'new'
                ? t('components.dashboard.addTierTitle')
                : t('components.dashboard.configureTier', { name: editingThreshold.name })}
            </h2>
            <form onSubmit={saveThreshold}>
              {editingThreshold === 'new' && (
                <>
                  <label className="label" htmlFor="threshold-name">
                    {t('components.dashboard.tierName')}
                  </label>
                  <input
                    id="threshold-name"
                    className="control"
                    maxLength={40}
                    required
                    value={thresholdName}
                    onChange={(e) => setThresholdName(e.target.value)}
                    data-testid="threshold-name-input"
                  />
                </>
              )}
              <label className="label" htmlFor="threshold-score">
                {t('components.dashboard.minimumScore')}
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
                {t('components.dashboard.minimumPasses')}
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
                  data-testid="cancel-threshold"
                >
                  {t('common.actions.cancel')}
                </button>
                <button
                  className="button button-primary"
                  type="submit"
                  disabled={createThresholdMutation.isPending || updateThresholdMutation.isPending}
                  data-testid="save-threshold"
                >
                  {createThresholdMutation.isPending || updateThresholdMutation.isPending
                    ? t('common.actions.saving')
                    : t('components.dashboard.saveThreshold')}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </>
  );
}
