import { ShieldAlert } from 'lucide-react';

export function PrivacyAdvisory() {
  return (
    <div
      style={{
        background: 'rgba(245,158,11,0.08)',
        border: '1px solid rgba(245,158,11,0.3)',
        borderRadius: 8,
        padding: '12px 16px',
        marginBottom: 20,
        fontSize: '0.85rem',
        color: '#fde68a',
      }}
    >
      <div className="flex items-center gap-2 mb-2">
        <ShieldAlert size={18} style={{ color: '#f59e0b', flexShrink: 0 }} />
        <strong>Tracking &amp; Privacy Advisory</strong>
      </div>
      Only share your application tracking details with people you trust. Anyone with these details may be able to view or change your application.
    </div>
  );
}
