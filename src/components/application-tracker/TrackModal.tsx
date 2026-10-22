import { useState } from 'react';
import { LoaderCircle } from 'lucide-react';
import type { AdminApplication } from '@/lib/api-client';

interface TrackModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: (app: AdminApplication) => void;
}

export function TrackModal({ open, onClose, onSuccess }: TrackModalProps) {
  const [inputId, setInputId] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = inputId.trim();
    if (!clean) { setError('Please enter an application ID or reference number.'); return; }

    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/applications/${encodeURIComponent(clean)}`);
      if (!res.ok) {
        if (res.status === 404) throw new Error('No application found with this ID or reference.');
        throw new Error('Unable to retrieve application.');
      }
      const data: AdminApplication = await res.json();
      onSuccess(data);
      setInputId('');
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not add application.');
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;

  return (
    <div className="dialog-backdrop" style={{ zIndex: 9500 }}>
      <section className="dialog" role="dialog" aria-modal="true" aria-labelledby="track-modal-title" style={{ maxWidth: 480 }}>
        <h2 id="track-modal-title" style={{ margin: '0 0 10px 0', fontSize: '1.25rem' }}>
          Track Application
        </h2>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 16 }}>
            <label htmlFor="track-input-id" style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#cbd5e1', marginBottom: 6 }}>
              Application ID or Reference
            </label>
            <input
              id="track-input-id"
              className="control"
              placeholder="e.g. 565-C62FE35E00D7 or 8fa2b4..."
              value={inputId}
              onChange={(e) => setInputId(e.target.value)}
              autoFocus
            />
            {error && <div style={{ color: '#ef4444', fontSize: '0.8rem', marginTop: 6 }}>{error}</div>}
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
            <button type="button" className="button button-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="button button-primary" disabled={loading} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              {loading && <LoaderCircle size={14} className="spinner" />}
              {loading ? 'Searching...' : 'Track Application'}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
