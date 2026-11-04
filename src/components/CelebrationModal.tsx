
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
import { useTranslation } from 'react-i18next';

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
  const { t } = useTranslation();
  const [location, setLocation] = useLocation();
  const [copiedId, setCopiedId] = useState(false);
  const [copiedRef, setCopiedRef] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    const audio = new Audio('/sounds/celebration.mp3');
    audio.volume = 0.5;

    audio.play().catch((error) => {
      console.warn('Celebration audio could not be played:', error);
    });
    const count = 200;
    const defaults = {
      origin: { y: 0.65 },
      zIndex: 100,
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

    const timeout = window.setTimeout(() => {
      confetti({
        particleCount: 60,
        spread: 80,
        origin: { y: 0.5 },
        zIndex: 100,
      });
    }, 750);

    return () => {
      audio.pause();
      audio.currentTime = 0;
      window.clearTimeout(timeout);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const trackingPath = `/track/${applicationId || applicationReference}`;
  const trackingUrl = `${window.location.origin}${trackingPath}`;

  async function copyText(
    value: string,
    setCopied: (copied: boolean) => void,
  ) {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard access may be unavailable in some browser contexts.
      setCopied(false);
    }
  }

  function handleGoToTracking() {
    onClose();
    setLocation(trackingPath);
  }

  function handleNewApplication() {
    onClose();
    onNewApplication?.();
  }

  return (
    <section
      className="celebration-success relative"
      data-testid="celebration-success"
      aria-labelledby="celebration-title"
      aria-describedby="celebration-description"
      role="status"
    >
      <div className="celebration-success__header">
        <div className="celebration-success__icon" aria-hidden="true">
          {isUpdate ? <Sparkles size={30} /> : <PartyPopper size={30} />}
        </div>
        {/* <div style={{position: 'absolute', top: 10, left: 0}}>
          <img src="/images/bully-maguire.gif" width="80px" />
        </div>
        <div style={{position: 'absolute', top: 10, right: 0}}>
          <img src="/images/dance-dancing.gif" width="90px" />
        </div> */}
        {/* <p className="celebration-success__eyebrow">
          {isUpdate ? 'Changes saved' : 'Submission complete'}
        </p> */}

        <h2 id="celebration-title">
          {isUpdate
            ? t('components.celebration.updated')
            : t('components.celebration.submitted')}
        </h2>

        <p
          id="celebration-description"
          className="celebration-success__description"
        >
          {isUpdate
            ? t('components.celebration.updatedDescription')
            : t('components.celebration.submittedDescription')}
        </p>
      </div>

      <div className="celebration-success__reference">
        {/* Application Reference */}
        <div className="celebration-success__data-row">
          <div className="celebration-success__data-details">
            <span className="celebration-success__label">
              {t('components.celebration.reference')}
            </span>
            <strong className="celebration-success__data-value">
              {applicationReference}
            </strong>
          </div>

          <button
            type="button"
            className="button button-secondary celebration-success__copy"
            onClick={() => copyText(applicationReference, setCopiedRef)}
            aria-label={t('components.celebration.copyReference')}
          >
            {copiedRef ? (
              <CheckCircle2 size={14} />
            ) : (
              <Copy size={14} />
            )}
            {copiedRef ? t('common.actions.copied') : t('common.actions.copy')}
          </button>
        </div>

        {/* Application ID */}
        {applicationId && (
          <div className="celebration-success__data-row">
            <div className="celebration-success__data-details">
              <span className="celebration-success__label">
                {t('components.celebration.id')}
              </span>
              <code className="celebration-success__data-value">
                {applicationId}
              </code>
            </div>

            <button
              type="button"
              className="button button-secondary celebration-success__copy"
              onClick={() => copyText(applicationId, setCopiedId)}
              aria-label={t('components.celebration.copyId')}
            >
              {copiedId ? (
                <CheckCircle2 size={14} />
              ) : (
                <Copy size={14} />
              )}
              {copiedId ? t('common.actions.copied') : t('common.actions.copy')}
            </button>
          </div>
        )}

        {/* Tracking Link — now inside the same box */}
        <div className="celebration-success__data-row celebration-success__tracking-row">
          <div className="celebration-success__data-details">
            <span className="celebration-success__label">
              {t('components.celebration.trackingLink')}
            </span>
            <span className="celebration-success__data-value celebration-success__tracking-url">
              {trackingUrl}
            </span>
          </div>

          <button
            type="button"
            className="button button-secondary celebration-success__copy"
            onClick={() => copyText(trackingUrl, setCopiedLink)}
            aria-label={t('components.celebration.copyLink')}
          >
            {copiedLink ? (
              <CheckCircle2 size={14} />
            ) : (
              <Copy size={14} />
            )}
            {copiedLink ? t('common.actions.copied') : t('common.actions.copy')}
          </button>
        </div>
      </div>

      <div className="celebration-success__notice celebration-success__notice--important">
        <div className="celebration-success__notice-title">
          <Info size={17} />
          <strong>{t('components.celebration.saveImportant')}</strong>
        </div>
        <p>
          {t('components.celebration.saveDescription')}
        </p>
      </div>

      <div className="celebration-success__notice celebration-success__notice--warning">
        <div className="celebration-success__notice-title">
          <ShieldAlert size={17} />
          <strong>{t('components.celebration.discretion')}</strong>
        </div>
        <p>
          {t('components.celebration.discretionDescription')}
        </p>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
          gap: '6px',
          width: '100%',
          marginTop: '10px',
        }}
      >
        {[
          'https://ik.imagekit.io/c1tiz3nte/bully-maguire.gif',
          'https://ik.imagekit.io/c1tiz3nte/dance-dancing.gif',
          'https://ik.imagekit.io/c1tiz3nte/cat-dance-cat.gif',
          'https://ik.imagekit.io/c1tiz3nte/funny-man-and-dog-dancing.gif',
        ].map((src, index) => (
          <div
            key={src}
            style={{
              width: '100%',
              aspectRatio: '1 / 1',
              overflow: 'hidden',
              borderRadius: '5px',
              border: '1px solid rgba(143,197,255,0.24)',
              background: '#111827',
              boxShadow: '0 4px 14px rgba(0, 0, 0, 0.25)',
            }}
          >
            <img
              src={src}
              alt={t('components.celebration.imageAlt', { number: index + 1 })}
              loading="lazy"
              style={{
                display: 'block',
                width: '100%',
                height: '100%',
                objectFit: 'cover',
              }}
            />
          </div>
        ))}
      </div>
      <div className="celebration-success__actions">
        <button
          type="button"
          className="button button-primary celebration-success__track-button"
          onClick={handleGoToTracking}
        >
          <ExternalLink size={16} />
          {t('components.celebration.viewTrack')}
        </button>

        {/* {onNewApplication && (
          <button
            type="button"
            className="button button-secondary celebration-success__new-button"
            onClick={handleNewApplication}
          >
            File Another Application
          </button>
        )} */}
      </div>
    </section>
  );
}
