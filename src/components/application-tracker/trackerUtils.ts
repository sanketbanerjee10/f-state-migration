export function formatNumber(val: number | null | undefined): string {
  if (val == null || isNaN(val)) return '0';
  return Number(val).toLocaleString();
}

export function formatPowerInM(val: number | null | undefined): string {
  if (val == null || isNaN(val)) return '0M';
  return `${(Number(val) / 1_000_000).toFixed(1)}M`;
}

export function getReferenceCode(id: string): string {
  return `565-${id.replaceAll('-', '').slice(0, 12).toUpperCase()}`;
}

export function getStatusColors(status: string) {
  if (status === 'Approved') return { bg: 'rgba(16,185,129,0.15)', border: 'rgba(16,185,129,0.4)', text: '#34d399', icon: '#10b981' };
  if (status === 'Rejected') return { bg: 'rgba(239,68,68,0.15)', border: 'rgba(239,68,68,0.4)', text: '#f87171', icon: '#ef4444' };
  return { bg: 'rgba(245,158,11,0.15)', border: 'rgba(245,158,11,0.4)', text: '#fbbf24', icon: '#f59e0b' };
}
