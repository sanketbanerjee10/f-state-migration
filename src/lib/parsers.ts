export function parseMagnitude(value: string, allowZero = false): number | null {
  const normalized = value.trim().replace(/,/g, '');
  const match = normalized.match(/^(\d+(?:\.\d+)?)\s*([kmb])?$/i);
  if (!match) return null;
  const multiplier = ({ k: 1e3, m: 1e6, b: 1e9 } as Record<string, number>)[(match[2] || '').toLowerCase()] || 1;
  const parsed = Number(match[1]) * multiplier;
  if (!Number.isFinite(parsed) || parsed < 0 || parsed > 1e12) return null;
  if (parsed === 0) return allowZero ? 0 : null;
  return Math.round(parsed) > 0 ? parsed : null;
}

export function parseStateNumber(value: string): number | null {
  if (!/^\d{1,4}$/.test(value)) return null;
  const valueNumber = Number(value);
  return valueNumber >= 1 && valueNumber <= 9999 ? valueNumber : null;
}

export function formatFileSize(size: number): string {
  return size < 1024 * 1024 ? `${(size / 1024).toFixed(0)} KB` : `${(size / (1024 * 1024)).toFixed(2)} MB`;
}
