import { CheckCircle2, Clock, XCircle } from 'lucide-react';
import { getStatusColors } from './trackerUtils';

export function StatusIcon({ status, size = 20 }: { status: string; size?: number }) {
  const colors = getStatusColors(status);
  if (status === 'Approved') return <CheckCircle2 size={size} style={{ color: colors.icon }} />;
  if (status === 'Rejected') return <XCircle size={size} style={{ color: colors.icon }} />;
  return <Clock size={size} style={{ color: colors.icon }} />;
}
