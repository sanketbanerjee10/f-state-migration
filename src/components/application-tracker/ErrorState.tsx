import { AlertCircle } from 'lucide-react';

export function ErrorState({ message, onTrack }: { message: string; onTrack: () => void }) {
  return (
    <div
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '48px 24px',
        textAlign: 'center',
        background: 'rgba(239,68,68,0.06)',
        borderRadius: 8,
        border: '1px solid rgba(239,68,68,0.2)',
      }}
    >
      <AlertCircle size={36} style={{ color: '#ef4444', marginBottom: 12 }} />
      <h3 style={{ margin: '0 0 8px 0', color: '#f87171' }}>Could Not Locate Application</h3>
      <p style={{ margin: '0 0 20px 0', fontSize: '0.9rem', color: '#fca5a5' }}>{message}</p>
      <button type="button" className="button button-primary" onClick={onTrack}>
        Enter Another Application ID
      </button>
    </div>
  );
}
