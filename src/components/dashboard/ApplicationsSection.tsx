import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
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
  const { t } = useTranslation();
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
      if (!data) throw new Error(t('components.dashboard.exportNoFile'));
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
        error instanceof Error ? error.message : t('components.dashboard.exportFailed'),
      );
    }
  };

  const pageData = applications.data;

  return (
    <section className="admin-panel applications-panel">
      <div className="panel-heading">
        <div>
          <span className="panel-kicker">{t('components.dashboard.inbox')}</span>
          <h2>{t('common.navigation.applications')}</h2>
        </div>
        <button
          className="button"
          type="button"
          onClick={downloadCsv}
          disabled={exportQuery.isFetching}
          data-testid="export-csv"
        >
          <Download size={15} />
          {exportQuery.isFetching ? t('components.dashboard.preparing') : t('components.dashboard.export')}
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
            aria-label={t('components.dashboard.searchPlaceholder')}
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setPage(1);
            }}
            placeholder={t('components.dashboard.searchName')}
            data-testid="filter-search"
          />
        </label>
        <input
          className="control filter-control"
          aria-label={t('common.labels.state')}
          type="number"
          min="1"
          placeholder={t('components.dashboard.state')}
          value={currentState}
          onChange={(event) => {
            setCurrentState(event.target.value);
            setPage(1);
          }}
          data-testid="filter-state"
        />
        <select
          className="control filter-control"
          aria-label={t('components.dashboard.alliancesFilter')}
          value={allianceId}
          onChange={(event) => {
            setAllianceId(event.target.value);
            setPage(1);
          }}
          data-testid="filter-alliance"
        >
          <option value="">{t('components.dashboard.allAlliances')}</option>
          {alliances.data?.map((alliance) => (
            <option key={alliance.id} value={alliance.id}>
              {alliance.tag} · {alliance.name}
            </option>
          ))}
        </select>
        <select
          className="control filter-control"
          aria-label={t('components.dashboard.tierFilter')}
          value={tier}
          onChange={(event) => {
            setTier(event.target.value);
            setPage(1);
          }}
          data-testid="filter-tier"
        >
          <option value="">{t('components.dashboard.allTiers')}</option>
          {['Regular', 'Medium', 'Advanced', 'Elite'].map((item) => (
            <option key={item} value={item}>
              {t(`wizard.preferences.tiers.${item.toLowerCase()}`)}
            </option>
          ))}
        </select>
        <select
          className="control filter-control"
          aria-label={t('components.dashboard.statusFilter')}
          value={status}
          onChange={(event) => {
            setStatus(event.target.value);
            setPage(1);
          }}
          data-testid="filter-status"
        >
          <option value="">{t('components.dashboard.allStatuses')}</option>
          {statuses.map((item) => (
            <option key={item} value={item}>
              {t(`common.status.${item.toLowerCase()}`)}
            </option>
          ))}
        </select>
        <label className="sort-field">
          {t('components.dashboard.sort')}
          <select
            className="control filter-control"
            value={sort}
            onChange={(event) =>
              setSort(event.target.value as ListAdminApplicationsParams['sort'])
            }
            data-testid="sort-applications"
          >
            <option value="createdAt">{t('components.dashboard.sortSubmitted')}</option>
            <option value="f1ArenaPower">{t('components.dashboard.sortF1')}</option>
            <option value="kills">{t('components.dashboard.sortKills')}</option>
          </select>
        </label>
        <button
          className="button sort-order"
          type="button"
          onClick={() => setOrder(order === 'asc' ? 'desc' : 'asc')}
          aria-label={t('components.dashboard.sortDirection', {
            direction: order === 'asc' ? t('components.dashboard.descending') : t('components.dashboard.ascending'),
          })}
          data-testid="sort-direction"
        >
          {order === 'asc' ? <ArrowUp size={15} /> : <ArrowDown size={15} />}
          {order === 'asc' ? t('components.dashboard.ascending') : t('components.dashboard.descending')}
        </button>
      </div>

      {applications.isLoading ? (
        <div className="table-skeleton" aria-label={t('components.dashboard.loadingApps')}>
          {[1, 2, 3, 4].map((item) => (
            <div className="skeleton table-row-skeleton" key={item} />
          ))}
        </div>
      ) : applications.isError ? (
        <div className="admin-error" role="alert" data-testid="applications-error">
          <span>
            {applications.error instanceof Error
              ? applications.error.message
              : t('components.dashboard.appsFailed')}
          </span>
          <button
            className="button"
            onClick={() => void applications.refetch()}
            data-testid="retry-applications"
          >
            {t('common.actions.retry')}
          </button>
        </div>
      ) : !pageData?.items.length ? (
        <div className="empty-state" data-testid="applications-empty">
          <Users size={22} />
          <strong>{t('components.dashboard.noMatches')}</strong>
          <span>{t('components.dashboard.filterHint')}</span>
        </div>
      ) : (
        <div className="table-scroll">
          <table className="applications-table">
            <thead>
              <tr>
                <th>{t('common.labels.applicantRep')}</th>
                <th>{t('components.dashboard.requestType')}</th>
                <th>{t('components.dashboard.stateColumn')}</th>
                <th>{t('common.labels.alliance')}</th>
                <th>{t('components.dashboard.tierBreakdown')}</th>
                <th>{t('components.dashboard.preference')}</th>
                <th>{t('common.labels.status')}</th>
                <th>{t('common.labels.submitted')}</th>
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
                        <small>{t('components.dashboard.rep')} {app.groupRepresentative}</small>
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
                      {t(`common.labels.${app.migrationType.toLowerCase()}`)}
                    </span>
                  </td>
                  <td>{t('components.dashboard.stateNumber', { state: app.currentState })}</td>
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
                          {activeTiers.map((tierKey) => {
                            const count = effectiveCounts[tierKey] ?? 0;
                            const colors = TIER_COLORS[tierKey];
                            return (
                              <span
                                key={tierKey}
                                title={t('components.dashboard.tierPlayerCount', { count, tier: t(`components.scoring.tiers.${tierKey.toLowerCase()}`) })}
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
                      ? t('components.alliance.any')
                      : app.preferredAlliances.map((item) => item.tag).join(', ') || '—'}
                  </td>
                  <td>
                    <span className={`status-pill status-${app.status.toLowerCase()}`}>
                      {t(`common.status.${app.status.toLowerCase()}`)}
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
            {t('components.dashboard.paginationSummary', {
              start: (page - 1) * pageData.pageSize + 1,
              end: Math.min(page * pageData.pageSize, pageData.total),
              total: pageData.total,
            })}
          </span>
          <div>
            <button
              className="button"
              onClick={() => setPage((value) => Math.max(1, value - 1))}
              disabled={page <= 1}
              data-testid="page-previous"
            >
              {t('ui.previous')}
            </button>
            <span>
              {t('components.dashboard.pageSummary', {
                page: pageData.page,
                totalPages: Math.max(pageData.totalPages, 1),
              })}
            </span>
            <button
              className="button"
              onClick={() =>
                setPage((value) => Math.min(pageData.totalPages, value + 1))
              }
              disabled={page >= pageData.totalPages}
              data-testid="page-next"
            >
              {t('ui.next')}
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
