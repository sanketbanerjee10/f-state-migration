import { AlertCircle, CheckCircle, RefreshCw, XCircle } from 'lucide-react';
import { OcrWaitingMessage } from './OcrWaitingMessage';

export interface OcrProgressProps {
  processing: boolean;
  progress: number;
  error?: string;
  success?: boolean;
  uncertain?: boolean;
  onCancel: () => void;
  onRetry?: () => void;
  diagnostics?: {
    rawText?: string;
    confidence?: number;
  };
}

export function OcrProgress({
  processing,
  progress,
  error,
  success,
  uncertain,
  onCancel,
  onRetry,
  diagnostics,
}: OcrProgressProps) {
  if (!processing && !error && !success && !uncertain) {
    return null;
  }

  const isDev = Boolean(import.meta.env?.DEV);

  return (
    <div className="ocr-progress-container" aria-live="polite" data-testid="ocr-progress-container">
      {processing && (
        <div className="ocr-processing-card">
          <div className="ocr-processing-header">
            <OcrWaitingMessage progress={progress} />
            <button
              type="button"
              className="button button-quiet button-sm"
              onClick={onCancel}
              data-testid="cancel-ocr-btn"
            >
              Cancel
            </button>
          </div>

          <div className="progress-track" role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100}>
            <span
              className={`progress-fill ${progress === 0 ? 'is-indeterminate' : ''}`}
              style={{ width: `${Math.max(5, progress)}%` }}
            />
          </div>
        </div>
      )}

      {!processing && error && (
        <div className="ocr-feedback-banner ocr-feedback-error" role="alert">
          <XCircle size={18} className="feedback-icon" />
          <div className="feedback-content">
            <strong>We couldn't read this screenshot</strong>
            <p>{error || 'Try another image or enter the details manually below.'}</p>
          </div>
          {onRetry && (
            <button
              type="button"
              className="button button-sm ml-auto"
              onClick={onRetry}
              data-testid="retry-ocr-btn"
            >
              <RefreshCw size={13} /> Retry
            </button>
          )}
        </div>
      )}

      {!processing && !error && success && (
        <div className="ocr-feedback-banner ocr-feedback-success" role="status">
          <CheckCircle size={18} className="feedback-icon" />
          <div className="feedback-content">
            <strong>Your stats are ready!</strong>
            <p>Check the details below and correct anything that doesn't look right.</p>
          </div>
        </div>
      )}

      {!processing && !error && uncertain && (
        <div className="ocr-feedback-banner ocr-feedback-warning" role="status">
          <AlertCircle size={18} className="feedback-icon" />
          <div className="feedback-content">
            <strong>Some details need your attention</strong>
            <p>We couldn't read all the numbers clearly. Please check the values below.</p>
          </div>
        </div>
      )}
    </div>
  );
}
