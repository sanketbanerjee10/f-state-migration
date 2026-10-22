export function PowerStatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="review-stat-card">
      <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}
