import {
  getGetAdminOverviewQueryKey,
  useGetAdminOverview,
} from '@/lib/api-client';

interface DashboardOverviewProps {
  enabled?: boolean;
}

export function DashboardOverview({ enabled = true }: DashboardOverviewProps) {
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
        : 'Failed to load overview metrics.';
    return (
      <div className="admin-error" role="alert" data-testid="overview-error">
        <span>{errorMsg}</span>
        <button
          className="button"
          onClick={() => void overview.refetch()}
          data-testid="retry-overview"
        >
          Retry
        </button>
      </div>
    );
  }

  const data = overview.data;

  return (
    <section className="metric-grid" aria-label="Application totals">
      {[
        ['All applications', data?.total ?? 0, 'total'],
        ['Awaiting review', data?.pending ?? 0, 'pending'],
        ['Approved', data?.approved ?? 0, 'approved'],
        ['Rejected', data?.rejected ?? 0, 'rejected'],
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
