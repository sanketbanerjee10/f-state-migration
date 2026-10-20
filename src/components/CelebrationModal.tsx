import { useEffect, useState } from 'react';
import confetti from 'canvas-confetti';
import {
  CheckCircle2,
  Copy,
  ExternalLink,
  Info,
  PartyPopper,
  ShieldAlert,
  Sparkles,
} from 'lucide-react';
import { useLocation } from 'wouter';

interface CelebrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  applicationId: string;
  applicationReference: string;
  isUpdate?: boolean;
  onNewApplication?: () => void;
}

export function CelebrationModal({
  isOpen,
  onClose,
  applicationId,
  applicationReference,
  isUpdate = false,
  onNewApplication,
}: CelebrationModalProps) {
  const [, setLocation] = useLocation();
  const [copiedId, setCopiedId] = useState(false);
  const [copiedRef, setCopiedRef] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    // Trigger high-energy confetti celebration in background
    const count = 200;
    const defaults = {
      origin: { y: 0.65 },
      zIndex: 9999,
    };

    function fire(particleRatio: number, opts: confetti.Options) {
      confetti({
        ...defaults,
        ...opts,
        particleCount: Math.floor(count * particleRatio),
      });
    }

    fire(0.25, {
      spread: 26,
      startVelocity: 55,
      colors: ['#f59e0b', '#fbbf24', '#eab308'],
    });
    fire(0.2, {
      spread: 60,
      colors: ['#3b82f6', '#60a5fa', '#93c5fd'],
    });
    fire(0.35, {
      spread: 100,
      decay: 0.91,
      scalar: 0.8,
      colors: ['#a855f7', '#c084fc', '#d8b4fe'],
    });
    fire(0.1, {
      spread: 120,
      startVelocity: 25,
      decay: 0.92,
      scalar: 1.2,
      colors: ['#10b981', '#34d399'],
    });
    fire(0.1, {
      spread: 120,
      startVelocity: 45,
      colors: ['#f43f5e', '#fb7185'],
    });

    const timeout = setTimeout(() => {
      confetti({
        particleCount: 60,
        spread: 80,
        origin: { y: 0.5 },
        zIndex: 9999,
      });
    }, 450);

    return () => clearTimeout(timeout);
  }, [isOpen]);

  if (!isOpen) return null;

  const trackingUrl = `${window.location.origin}/track/${applicationId || applicationReference}`;

  const handleCopyId = () => {
    navigator.clipboard.writeText(applicationId || applicationReference);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

  const handleCopyRef = () => {
    navigator.clipboard.writeText(applicationReference);
    setCopiedRef(true);
    setTimeout(() => setCopiedRef(false), 2000);
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(trackingUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleGoToTracking = () => {
    onClose();
    setLocation(`/track/${applicationId || applicationReference}`);
  };

  return (
    <div className="dialog-backdrop" style={{ zIndex: 9000 }}>
      <section
        className="dialog celebration-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="celebration-title"
        style={{
          maxWidth: 620,
          border: '1px solid rgba(245, 158, 11, 0.4)',
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.8), 0 0 35px rgba(245, 158, 11, 0.25)',
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: 20 }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 64,
              height: 64,
              borderRadius: '50%',
              background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.25), rgba(139, 92, 246, 0.25))',
              border: '2px solid rgba(245, 158, 11, 0.5)',
              color: '#f59e0b',
              marginBottom: 12,
            }}
          >
            {isUpdate ? <Sparkles size={32} /> : <PartyPopper size={32} />}
          </div>
          <h2 id="celebration-title" style={{ margin: '0 0 6px 0', fontSize: '1.5rem', color: '#f8fafc' }}>
            {isUpdate ? 'Application Successfully Updated! 🚀' : 'Application Submitted! 🎉'}
          </h2>
          <p style={{ margin: 0, color: '#94a3b8', fontSize: '0.95rem' }}>
            {isUpdate
              ? 'Your modifications have been saved and re-submitted to State 565 leadership.'
              : 'Your migration application has been received and committed for State 565 leadership review.'}
          </p>
        </div>

        {/* Reference & ID Box */}
        <div
          style={{
            background: 'rgba(15, 23, 42, 0.85)',
            border: '1px solid rgba(59, 130, 246, 0.3)',
            borderRadius: 8,
            padding: '16px 18px',
            marginBottom: 18,
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <div>
              <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#64748b' }}>
                Application Reference
              </div>
              <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#60a5fa', letterSpacing: '0.05em' }}>
                {applicationReference}
              </div>
            </div>
            <button
              type="button"
              className="button button-secondary"
              onClick={handleCopyRef}
              style={{ fontSize: '0.8rem', padding: '6px 12px' }}
            >
              {copiedRef ? <CheckCircle2 size={14} style={{ color: '#10b981' }} /> : <Copy size={14} />}
              {copiedRef ? 'Copied!' : 'Copy Ref'}
            </button>
          </div>

          {applicationId && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 8, borderTop: '1px solid rgba(255, 255, 255, 0.08)' }}>
              <div style={{ minWidth: 0, marginRight: 12 }}>
                <div style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#64748b' }}>
                  Application ID (Unique UUID)
                </div>
                <div style={{ fontSize: '0.85rem', fontFamily: 'monospace', color: '#cbd5e1', wordBreak: 'break-all' }}>
                  {applicationId}
                </div>
              </div>
              <button
                type="button"
                className="button button-secondary"
                onClick={handleCopyId}
                style={{ fontSize: '0.8rem', padding: '6px 12px', flexShrink: 0 }}
              >
                {copiedId ? <CheckCircle2 size={14} style={{ color: '#10b981' }} /> : <Copy size={14} />}
                {copiedId ? 'Copied!' : 'Copy ID'}
              </button>
            </div>
          )}
        </div>

        {/* Important notice advisory */}
        <div
          style={{
            background: 'rgba(245, 158, 11, 0.08)',
            border: '1px solid rgba(245, 158, 11, 0.3)',
            borderRadius: 8,
            padding: '12px 14px',
            marginBottom: 16,
            fontSize: '0.86rem',
            lineHeight: 1.45,
            color: '#fde68a',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 600, marginBottom: 4 }}>
            <Info size={16} style={{ color: '#f59e0b' }} />
            <span>Important: Save your Application ID</span>
          </div>
          <div>
            This Application ID has been automatically saved to your browser&apos;s local storage so you can easily track it.
            You can return at any time to inspect your status, edit details, or resubmit.
          </div>
        </div>

        {/* Sharing discretion notice */}
        <div
          style={{
            background: 'rgba(239, 68, 68, 0.08)',
            border: '1px solid rgba(239, 68, 68, 0.25)',
            borderRadius: 8,
            padding: '12px 14px',
            marginBottom: 20,
            fontSize: '0.84rem',
            lineHeight: 1.45,
            color: '#fca5a5',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 600, marginBottom: 4 }}>
            <ShieldAlert size={16} style={{ color: '#ef4444' }} />
            <span>Sharing Discretion Advisory</span>
          </div>
          <div>
            Please note that it is at your discretion whom you share your Application ID with. Anyone who holds this
            ID will be able to view and edit the entire application, including player details and roster data.
          </div>
        </div>

        {/* Direct Link Box */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            background: 'rgba(0,0,0,0.3)',
            border: '1px dashed rgba(255,255,255,0.15)',
            borderRadius: 6,
            padding: '8px 12px',
            marginBottom: 20,
          }}
        >
          <span style={{ fontSize: '0.8rem', color: '#94a3b8', flexShrink: 0 }}>Tracking Link:</span>
          <span style={{ fontSize: '0.8rem', fontFamily: 'monospace', color: '#93c5fd', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
            {trackingUrl}
          </span>
          <button
            type="button"
            className="button button-secondary"
            onClick={handleCopyLink}
            style={{ fontSize: '0.75rem', padding: '4px 8px', flexShrink: 0 }}
          >
            {copiedLink ? 'Copied' : 'Copy'}
          </button>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <button
            type="button"
            className="button button-primary"
            onClick={handleGoToTracking}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '12px 18px', fontSize: '0.95rem' }}
          >
            <ExternalLink size={16} />
            View & Track Application Status
          </button>

          <div style={{ display: 'flex', gap: 10 }}>
            {onNewApplication && (
              <button
                type="button"
                className="button button-secondary"
                onClick={() => {
                  onClose();
                  onNewApplication();
                }}
                style={{ flex: 1 }}
              >
                File Another Application
              </button>
            )}
            <button
              type="button"
              className="button button-secondary"
              onClick={onClose}
              style={{ flex: onNewApplication ? 1 : 2 }}
            >
              Close
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
