import { useState } from 'react';
import { Copy } from 'lucide-react';

export function CopyButton({ value, label }: { value: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button
      type="button"
      onClick={handleCopy}
      className="link-button"
      style={{ fontSize: '0.75rem', padding: '2px 6px', display: 'inline-flex', alignItems: 'center', gap: 4 }}
    >
      <Copy size={12} /> {copied ? 'Copied!' : (label ?? 'Copy')}
    </button>
  );
}
