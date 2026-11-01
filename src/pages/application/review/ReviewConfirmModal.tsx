import { CheckCircle2, LoaderCircle } from 'lucide-react';
import { Modal } from '../../../components/Dialogs';

export type ReviewConfirmModalProps = {
  isOpen: boolean;
  submitting: boolean;
  t: (key: string, options?: Record<string, unknown>) => string;
  hasScreenshot: boolean;
  isGroup: boolean;
  memberCount: number;
  onClose: () => void;
  onConfirm: () => void;
};

export function ReviewConfirmModal({
  isOpen,
  submitting,
  t,
  hasScreenshot,
  isGroup,
  memberCount,
  onClose,
  onConfirm,
}: ReviewConfirmModalProps) {
  if (!isOpen) return null;

  return (
    <Modal
      title={t('wizard.review.beforeContinuing')}
      onClose={onClose}
      actions={
        <>
          <button
            type="button"
            className="button button-quiet"
            onClick={onClose}
            disabled={submitting}
            data-testid="cancel-submit"
          >
            {t('common.actions.cancel')}
          </button>
          <button
            type="button"
            className="button button-primary"
            onClick={onConfirm}
            disabled={submitting}
            data-testid="confirm-submit"
          >
            {submitting ? (
              <>
                <LoaderCircle size={14} className="spin" /> {t('common.status.sending')}
              </>
            ) : (
              <>
                <CheckCircle2 size={15} /> {t('wizard.review.submit')}
              </>
            )}
          </button>
        </>
      }
    >
      <p>{t('wizard.review.privacy')}</p>
      {hasScreenshot && (
        <p style={{ marginTop: 12, color: '#86efac', fontSize: 13 }}>
          {t('wizard.review.verifiedExplanation')}<strong>{t('wizard.review.verified')}</strong>.
        </p>
      )}
      {isGroup && memberCount > 0 && (
        <p style={{ marginTop: 8, color: '#93c5fd', fontSize: 13 }}>
          {t('wizard.review.membersRecorded', { count: memberCount })}
        </p>
      )}
      <p style={{ marginTop: 12 }}>{t('wizard.review.terms')}</p>
      <p style={{ marginTop: 12 }}>{t('wizard.review.ready')}</p>
    </Modal>
  );
}
