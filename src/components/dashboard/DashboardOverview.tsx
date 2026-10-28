import { useTranslation } from 'react-i18next';
import {
  getGetAdminOverviewQueryKey,
  useGetAdminOverview,
} from '@/lib/api-client';

interface DashboardOverviewProps {
  enabled?: boolean;
}

export function DashboardOverview({ enabled = true }: DashboardOverviewProps) {
  const { t } = useTranslation();
  const overview = useGetAdminOverview({
    query: {
      queryKey: getGetAdminOverviewQueryKey(),
      enabled,
    },
  });

  if (overview.isLoading) {
    return (
      <div className="metric-grid">
        {[1, 2, 3, 4].map((item) => (
          <div className="skeleton metric-skeleton" key={item} />
        ))}
      </div>
    );
  }

  if (overview.isError) {
    const errorMsg =
      overview.error instanceof Error
        ? overview.error.message
        : t('components.dashboard.overviewFailed');
    return (
      <div className="admin-error" role="alert" data-testid="overview-error">
        <span>{errorMsg}</span>
        <button
          className="button"
          onClick={() => void overview.refetch()}
          data-testid="retry-overview"
        >
          {t('common.actions.retry')}
        </button>
      </div>
    );
  }

  const data = overview.data;

  return (
    <section className="metric-grid" aria-label={t('components.dashboard.overviewTitle')}>
      {[
        [t('components.dashboard.all'), data?.total ?? 0, 'total'],
        [t('components.dashboard.awaiting'), data?.pending ?? 0, 'pending'],
        [t('components.dashboard.approved'), data?.approved ?? 0, 'approved'],
        [t('components.dashboard.rejected'), data?.rejected ?? 0, 'rejected'],
      ].map(([label, value, key]) => (
        <article
          className={`metric-card metric-${key}`}
          key={key}
          data-testid={`metric-${key}`}
        >
          <span>{label}</span>
          <strong>{value}</strong>
        </article>
      ))}
    </section>
  );
}
