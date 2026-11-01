import type { TFunction } from 'i18next';
import { LoaderCircle } from 'lucide-react';
import { OcrWaitingMessage } from '../../../components/ocr/OcrWaitingMessage';

export type UploadProgress = {
  completed: number;
  total: number;
  estimatedEndAt: number;
};

export function formatDuration(seconds: number, t: TFunction): string {
  if (seconds < 60) return t('wizard.roster.durationSeconds', { count: seconds });
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return remainingSeconds
    ? t('wizard.roster.durationMinutesSeconds', { minutes, seconds: remainingSeconds })
    : t('wizard.roster.durationMinutes', { minutes });
}

export function UploadProgressCard({
  uploadProgress,
  t,
}: {
  uploadProgress: UploadProgress;
  t: TFunction;
}) {
  return (
    <div className="ocr-processing-card" style={{ marginTop: 14 }}>
      <div className="ocr-processing-header">
        <div className="ocr-roster-upload-status">
          <div className="ocr-roster-processing-heading">
            <LoaderCircle size={18} className="spin" />
            <span>
              {t('wizard.roster.processing', {
                completed: uploadProgress.completed,
                total: uploadProgress.total,
              })}
            </span>
            <span className="ocr-roster-time-remaining">
              {uploadProgress.estimatedEndAt <= Date.now() && uploadProgress.completed < uploadProgress.total
                ? t('wizard.roster.takingLonger')
                : formatDuration(
                    Math.max(0, Math.ceil((uploadProgress.estimatedEndAt - Date.now()) / 1000)),
                    t,
                  )}
            </span>
          </div>
          <OcrWaitingMessage />
        </div>
      </div>
      <div className="ocr-roster-progress-track" aria-hidden="true">
        <span />
      </div>
    </div>
  );
}
