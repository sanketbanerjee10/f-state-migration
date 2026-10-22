export function StatCell({ label, value }: { label: string; value: string | React.ReactNode }) {
  return (
    <div>
      <span style={{ fontSize: '0.72rem', color: '#64748b', display: 'block', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
        {label}
      </span>
      <strong style={{ color: '#f1f5f9', fontSize: '0.9rem' }}>{value}</strong>
    </div>
  );
}
