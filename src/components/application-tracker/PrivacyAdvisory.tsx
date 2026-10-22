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
      It is at your discretion whom you share your Application ID or Reference with. Anyone with this identifier can view the
      complete status, full player details, and make resubmissions.
    </div>
  );
}
