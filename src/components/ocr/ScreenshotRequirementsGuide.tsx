import { useState } from 'react';
import { CheckCircle2, ExternalLink, HelpCircle, Info } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Modal } from '../Dialogs';

export function ScreenshotRequirementsGuide() {
  const { t } = useTranslation();
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <div className="screenshot-guide-banner" data-testid="screenshot-requirements-guide">
      {/* <div className="guide-thumbnail-wrap" onClick={() => setModalOpen(true)}>
        <img
          src="/images/power-details-example.png"
          alt="Power details screenshot thumbnail"
          className="guide-thumbnail"
          loading="lazy"
        />
      </div> */}
      <div className="guide-content">
        <div className="guide-heading-row">
          <HelpCircle size={16} className="guide-icon" />
          <h4 className="guide-title">{t('components.ocr.question')}</h4>
        </div>
        {/* <p className="guide-copy">
          Upload your in-game <strong>Player Details</strong> screen. You can view an example to make sure your stats will be read properly.
        </p> */}
      </div>
      <button
        type="button"
        className="button button-quiet guide-action-btn"
        onClick={() => setModalOpen(true)}
        data-testid="view-screenshot-example"
        aria-haspopup="dialog"
      >
        <ExternalLink size={14} /> {t('components.ocr.viewExample')}
      </button>

      {modalOpen && (
        <Modal
          title={t('components.ocr.correctScreenshot')}
          className="dialog-wide"
          onClose={() => setModalOpen(false)}
          actions={
            <button
              type="button"
              className="button button-primary"
              onClick={() => setModalOpen(false)}
              data-testid="close-example-modal"
            >
              {t('common.actions.close')}
            </button>
          }
        >
          <div className="example-modal-body">
            <div className="example-grid">
              <div className="example-image-container">
                <img
                  src="https://ik.imagekit.io/c1tiz3nte/power-details-example.png"
                  alt={t('components.ocr.exampleAlt')}
                  className="example-full-image"
                />
              </div>

              <div className="example-checklist-card">
                <h5 className="checklist-heading">{t('components.ocr.extract')}</h5>
                <ul className="example-checklist">
                  {/* <li><CheckCircle2 size={15} className="check-icon" /> <span><strong>{t('components.ocr.playerName')}</strong> {t('components.ocr.topOfCard')}</span></li>
                  <li><CheckCircle2 size={15} className="check-icon" /> <span><strong>{t('components.ocr.powerBesideName')}</strong> {t('components.ocr.shieldIcon')}</span></li>
                  <li><CheckCircle2 size={15} className="check-icon" /> <span><strong>{t('components.ocr.kills')}</strong> {t('components.ocr.skullIconStats')}</span></li> */}
                  <li><CheckCircle2 size={15} className="check-icon" /> <span><strong>{t('components.ocr.structure')}</strong></span></li>
                  <li><CheckCircle2 size={15} className="check-icon" /> <span><strong>{t('components.ocr.tech')}</strong></span></li>
                  <li><CheckCircle2 size={15} className="check-icon" /> <span><strong>{t('components.ocr.troop')}</strong></span></li>
                  <li><CheckCircle2 size={15} className="check-icon" /> <span><strong>{t('components.ocr.hero')}</strong></span></li>
                  <li><CheckCircle2 size={15} className="check-icon" /> <span><strong>{t('components.ocr.vehicle')}</strong></span></li>
                </ul>
              </div>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
