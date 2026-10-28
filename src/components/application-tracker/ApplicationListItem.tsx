import { Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { TrackedApplicationMeta } from '../../lib/trackedApplications';
import { StatusPill } from './StatusPill';

interface ApplicationListItemProps {
  item: TrackedApplicationMeta;
  isActive: boolean;
  onClick: () => void;
  onRemove: () => void;
}

export function ApplicationListItem({ item, isActive, onClick, onRemove }: ApplicationListItemProps) {
  const { t } = useTranslation();
  return (
    <div
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        background: isActive ? 'rgba(59,130,246,0.15)' : 'rgba(15,23,42,0.6)',
        border: `1px solid ${isActive ? '#3b82f6' : 'rgba(255,255,255,0.08)'}`,
        borderLeft: isActive ? '3px solid #3b82f6' : '3px solid transparent',
        borderRadius: 6,
        padding: '10px 14px',
        cursor: 'pointer',
        transition: 'all 0.15s ease',
      }}
    >
      {/* Status dot */}
      <div
        style={{
          width: 8,
          height: 8,
          borderRadius: '50%',
          flexShrink: 0,
          background:
            item.status === 'Approved' ? '#10b981' :
            item.status === 'Rejected' ? '#ef4444' :
            '#f59e0b',
        }}
      />

      {/* Name & reference */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 600, fontSize: '0.88rem', color: isActive ? '#93c5fd' : '#e2e8f0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {item.gameName}
        </div>
        <div style={{ fontSize: '0.72rem', color: '#64748b', fontFamily: 'monospace', marginTop: 1 }}>
          {item.reference}
        </div>
      </div>

      {/* Status pill */}
      <StatusPill status={item.status} />

      {/* Remove button */}
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); onRemove(); }}
        title={t('common.labels.removeSaved')}
        style={{ background: 'none', border: 'none', padding: 2, color: '#475569', cursor: 'pointer', display: 'flex', alignItems: 'center', flexShrink: 0 }}
        onMouseEnter={(e) => (e.currentTarget.style.color = '#ef4444')}
        onMouseLeave={(e) => (e.currentTarget.style.color = '#475569')}
      >
        <Trash2 size={13} />
      </button>
    </div>
  );
}
