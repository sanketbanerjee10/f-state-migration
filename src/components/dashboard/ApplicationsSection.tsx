import { useMemo, useState } from 'react';
import {
  ArrowDown,
  ArrowUp,
  Download,
  Search,
  Sofa,
  Users,
  User,
} from 'lucide-react';
import {
  getExportAdminApplicationsQueryKey,
  getListAdminAlliancesQueryKey,
  getListAdminApplicationsQueryKey,
  useExportAdminApplications,
  useListAdminAlliances,
  useListAdminApplications,
  type ApplicationStatus,
  type ListAdminApplicationsParams,
} from '@/lib/api-client';
import { TIER_COLORS } from '../../lib/migrationScore';

const statuses: ApplicationStatus[] = ['Pending', 'Approved', 'Rejected'];

interface ApplicationsSectionProps {
  enabled?: boolean;
  selectedId: string;
  onSelectApplication: (id: string) => void;
  onError?: (err: unknown) => void;
}

export function ApplicationsSection({
  enabled = true,
  selectedId,
  onSelectApplication,
  onError,
}: ApplicationsSectionProps) {
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('');
  const [query, setQuery] = useState('');
  const [currentState, setCurrentState] = useState('');
  const [allianceId, setAllianceId] = useState('');
  const [tier, setTier] = useState('');
  const [sort, setSort] = useState<ListAdminApplicationsParams['sort']>('createdAt');
  const [order, setOrder] = useState<ListAdminApplicationsParams['order']>('desc');
  const [exportError, setExportError] = useState('');

  const params = useMemo<ListAdminApplicationsParams>(
    () => ({
      ...(query.trim() ? { q: query.trim() } : {}),
      ...(currentState && Number(currentState) > 0
        ? { currentState: Number(currentState) }
        : {}),
      ...(allianceId ? { allianceId: Number(allianceId) } : {}),
      ...(tier ? { migrationTier: tier as ListAdminApplicationsParams['migrationTier'] } : {}),
      ...(status ? { status: status as ApplicationStatus } : {}),
      sort,
      order,
      page,
      pageSize: 10,
    }),
    [query, currentState, allianceId, tier, status, sort, order, page],
  );

  const exportParams = useMemo(
    () => ({
      ...(query.trim() ? { q: query.trim() } : {}),
      ...(currentState && Number(currentState) > 0
        ? { currentState: Number(currentState) }
        : {}),
      ...(allianceId ? { allianceId: Number(allianceId) } : {}),
      ...(tier ? { migrationTier: tier as ListAdminApplicationsParams['migrationTier'] } : {}),
      ...(status ? { status: status as ApplicationStatus } : {}),
      sort,
      order,
    }),
    [query, currentState, allianceId, tier, status, sort, order],
  );

  const applications = useListAdminApplications(params, {
    query: {
      queryKey: getListAdminApplicationsQueryKey(params),
      enabled,
    },
  });

  const alliances = useListAdminAlliances({
    query: {
      queryKey: getListAdminAlliancesQueryKey(),
      enabled,
    },
  });

  const exportQuery = useExportAdminApplications(exportParams, {
    query: {
      queryKey: getExportAdminApplicationsQueryKey(exportParams),
      enabled: false,
    },
  });

  const downloadCsv = async () => {
    setExportError('');
    try {
      const { data } = await exportQuery.refetch();
      if (!data) throw new Error('The export returned no file.');
      const blob = new Blob([data], { type: 'text/csv;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = 'state-565-applications.csv';
      anchor.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      onError?.(error);
      setExportError(
        error instanceof Error ? error.message : 'The export could not be completed.',
      );
    }
  };

  const pageData = applications.data;

  return (
    <section className="admin-panel applications-panel">
      <div className="panel-heading">
        <div>
          <span className="panel-kicker">INBOX</span>
          <h2>Applications</h2>
        </div>
        <button
          className="button"
          type="button"
          onClick={downloadCsv}
          disabled={exportQuery.isFetching}
          data-testid="export-csv"
        >
          <Download size={15} />
          {exportQuery.isFetching ? 'Preparing…' : 'Export filtered CSV'}
        </button>
      </div>

      {exportError && (
        <p className="error-text" role="alert" data-testid="export-error">
          {exportError}
        </p>
      )}

      <div className="filters">
        <label className="search-field">
          <Search size={15} />
          <input
            aria-label="Search applications by in-game name"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setPage(1);
            }}
            placeholder="Search in-game name"
            data-testid="filter-search"
          />
        </label>
        <input
          className="control filter-control"
          aria-label="Current state filter"
          type="number"
          min="1"
          placeholder="State #"
          value={currentState}
          onChange={(event) => {
            setCurrentState(event.target.value);
            setPage(1);
          }}
          data-testid="filter-state"
        />
        <select
          className="control filter-control"
          aria-label="Alliance filter"
          value={allianceId}
          onChange={(event) => {
            setAllianceId(event.target.value);
            setPage(1);
          }}
          data-testid="filter-alliance"
        >
          <option value="">All alliances</option>
          {alliances.data?.map((alliance) => (
            <option key={alliance.id} value={alliance.id}>
              {alliance.tag} · {alliance.name}
            </option>
          ))}
        </select>
        <select
          className="control filter-control"
          aria-label="Tier filter"
          value={tier}
          onChange={(event) => {
            setTier(event.target.value);
            setPage(1);
          }}
          data-testid="filter-tier"
        >
          <option value="">All tiers</option>
          {['Regular', 'Medium', 'Advanced', 'Elite'].map((item) => (
            <option key={item}>{item}</option>
          ))}
        </select>
        <select
          className="control filter-control"
          aria-label="Status filter"
          value={status}
          onChange={(event) => {
            setStatus(event.target.value);
            setPage(1);
          }}
          data-testid="filter-status"
        >
          <option value="">All statuses</option>
          {statuses.map((item) => (
            <option key={item}>{item}</option>
          ))}
        </select>
        <label className="sort-field">
          Sort
          <select
            className="control filter-control"
            value={sort}
            onChange={(event) =>
              setSort(event.target.value as ListAdminApplicationsParams['sort'])
            }
            data-testid="sort-applications"
          >
            <option value="createdAt">Submitted</option>
            <option value="f1ArenaPower">F1 power</option>
            <option value="kills">Kills</option>
          </select>
        </label>
        <button
          className="button sort-order"
          type="button"
          onClick={() => setOrder(order === 'asc' ? 'desc' : 'asc')}
          aria-label={`Sort ${order === 'asc' ? 'descending' : 'ascending'}`}
          data-testid="sort-direction"
        >
          {order === 'asc' ? <ArrowUp size={15} /> : <ArrowDown size={15} />}
          {order}
        </button>
      </div>

      {applications.isLoading ? (
        <div className="table-skeleton" aria-label="Loading applications">
          {[1, 2, 3, 4].map((item) => (
            <div className="skeleton table-row-skeleton" key={item} />
          ))}
        </div>
      ) : applications.isError ? (
        <div className="admin-error" role="alert" data-testid="applications-error">
          <span>
            {applications.error instanceof Error
              ? applications.error.message
              : 'Failed to load applications.'}
          </span>
          <button
            className="button"
            onClick={() => void applications.refetch()}
            data-testid="retry-applications"
          >
            Retry
          </button>
        </div>
      ) : !pageData?.items.length ? (
        <div className="empty-state" data-testid="applications-empty">
          <Users size={22} />
          <strong>No applications match this view</strong>
          <span>Try changing or clearing your filters.</span>
        </div>
      ) : (
        <div className="table-scroll">
          <table className="applications-table">
            <thead>
              <tr>
                <th>Applicant / Rep</th>
                <th>Request Type</th>
                <th>State</th>
                <th>Current Alliance</th>
                <th>Tier Breakdown</th>
                <th>Preference</th>
                <th>Status</th>
                <th>Submitted</th>
              </tr>
            </thead>
            <tbody>
              {pageData.items.map((app) => (
                <tr
                  key={app.id}
                  className={selectedId === app.id ? 'selected-row' : ''}
                  onClick={() => onSelectApplication(app.id)}
                  style={{ cursor: 'pointer' }}
                  data-testid={`application-row-${app.id}`}
                >
                  <td>
                    <div className="applicant-link">
                      <strong>{app.gameName}</strong>
                      {app.groupRepresentative && app.migrationType === 'Group' && (
                        <small>Rep: {app.groupRepresentative}</small>
                      )}
                    </div>
                  </td>
                  <td>
                    <span
                      className="status-pill"
                      style={{
                        background:
                          app.migrationType === 'Group'
                            ? 'rgba(59, 130, 246, 0.16)'
                            : 'rgba(255, 255, 255, 0.05)',
                        color: app.migrationType === 'Group' ? '#93c5fd' : '#cbd5e1',
                        border:
                          app.migrationType === 'Group'
                            ? '1px solid rgba(59, 130, 246, 0.3)'
                            : '1px solid rgba(255, 255, 255, 0.1)',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 4,
                        fontSize: 10,
                      }}
                    >
                      {app.migrationType === 'Group' ? (
                        <Users size={11} />
                      ) : (
                        <User size={11} />
                      )}
                      {app.migrationType}
                    </span>
                  </td>
                  <td>State {app.currentState}</td>
                  <td>{app.currentAlliance || '—'}</td>
                  <td>
                    {(() => {
                      const counts = (app as any).tierCounts;
                      const hasCounts =
                        counts &&
                        (counts.Elite > 0 ||
                          counts.Advanced > 0 ||
                          counts.Medium > 0 ||
                          counts.Regular > 0);
                      const effectiveCounts = hasCounts
                        ? counts
                        : {
                            Regular: 0,
                            Medium: 0,
                            Advanced: 0,
                            Elite: 0,
                            [app.migrationTier || 'Regular']: 1,
                          };

                      const tierKeys: ('Elite' | 'Advanced' | 'Medium' | 'Regular')[] = [
                        'Elite',
                        'Advanced',
                        'Medium',
                        'Regular',
                      ];
                      const activeTiers = tierKeys.filter(
                        (t) => (effectiveCounts[t] ?? 0) > 0,
                      );

                      return (
                        <div
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 5,
                            flexWrap: 'wrap',
                          }}
                        >
                          {activeTiers.map((t) => {
                            const count = effectiveCounts[t] ?? 0;
                            const colors = TIER_COLORS[t];
                            return (
                              <span
                                key={t}
                                title={`${count} ${colors.label} player${count > 1 ? 's' : ''}`}
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: 4,
                                  fontSize: 11,
                                  fontWeight: 700,
                                  padding: '2px 7px',
                                  borderRadius: 4,
                                  background: colors.bg,
                                  border: `1px solid ${colors.border}`,
                                  color: colors.text,
                                }}
                              >
                                <Sofa
                                  size={12}
                                  color={colors.iconColor}
                                  strokeWidth={2.4}
                                />
                                <span>{count}</span>
                              </span>
                            );
                          })}
                        </div>
                      );
                    })()}
                  </td>
                  <td>
                    {app.anyAlliance
                      ? 'Any alliance'
                      : app.preferredAlliances.map((item) => item.tag).join(', ') || '—'}
                  </td>
                  <td>
                    <span className={`status-pill status-${app.status.toLowerCase()}`}>
                      {app.status}
                    </span>
                  </td>
                  <td>{new Date(app.createdAt).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {pageData && pageData.total > 0 && (
        <div className="pagination">
          <span>
            Showing {(page - 1) * pageData.pageSize + 1}–
            {Math.min(page * pageData.pageSize, pageData.total)} of {pageData.total}
          </span>
          <div>
            <button
              className="button"
              onClick={() => setPage((value) => Math.max(1, value - 1))}
              disabled={page <= 1}
              data-testid="page-previous"
            >
              Previous
            </button>
            <span>
              Page {pageData.page} of {Math.max(pageData.totalPages, 1)}
            </span>
            <button
              className="button"
              onClick={() =>
                setPage((value) => Math.min(pageData.totalPages, value + 1))
              }
              disabled={page >= pageData.totalPages}
              data-testid="page-next"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
