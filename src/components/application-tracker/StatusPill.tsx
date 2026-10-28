import { getStatusColors } from './trackerUtils';
import { useTranslation } from 'react-i18next';

interface StatusPillProps {
  status: string;
  size?: 'sm' | 'md';
}

export function StatusPill({ status, size = 'sm' }: StatusPillProps) {
  const { t } = useTranslation();
  const colors = getStatusColors(status);
  const statusLabel = status === 'Approved'
    ? t('common.status.approved')
    : status === 'Rejected'
      ? t('common.status.rejected')
      : status === 'Pending' || !status
        ? t('common.status.pending')
        : status;
  return (
    <span
      style={{
        fontSize: size === 'sm' ? '0.7rem' : '0.8rem',
        padding: size === 'sm' ? '2px 8px' : '3px 10px',
        borderRadius: 9999,
        background:
          status === 'Approved' ? 'rgba(16,185,129,0.2)' :
          status === 'Rejected' ? 'rgba(239,68,68,0.2)' :
          'rgba(245,158,11,0.2)',
        color: colors.text,
        fontWeight: 600,
        whiteSpace: 'nowrap' as const,
      }}
    >
      {statusLabel}
    </span>
  );
}
