import { useState } from 'react';
import { CheckCircle2, ExternalLink, HelpCircle, Info } from 'lucide-react';
import { Modal } from '../Dialogs';

export function ScreenshotRequirementsGuide() {
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
          <h4 className="guide-title">Which screenshot should I upload?</h4>
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
        <ExternalLink size={14} /> View example
      </button>

      {modalOpen && (
        <Modal
          title="Upload the correct power details screenshot"
          className="dialog-wide"
          onClose={() => setModalOpen(false)}
          actions={
            <button
              type="button"
              className="button button-primary"
              onClick={() => setModalOpen(false)}
              data-testid="close-example-modal"
            >
              Close
            </button>
          }
        >
          <div className="example-modal-body">
            <div className="example-grid">
              <div className="example-image-container">
                <img
                  src="/images/power-details-example.png"
                  alt="Reference player details screenshot example"
                  className="example-full-image"
                />
              </div>

              <div className="example-checklist-card">
                <h5 className="checklist-heading">What we extract automatically:</h5>
                <ul className="example-checklist">
                  <li><CheckCircle2 size={15} className="check-icon" /> <span><strong>Player name</strong> (top of card)</span></li>
                  <li><CheckCircle2 size={15} className="check-icon" /> <span><strong>Power beside name</strong> (shield icon)</span></li>
                  <li><CheckCircle2 size={15} className="check-icon" /> <span><strong>Kills</strong> (skull icon stats)</span></li>
                  <li><CheckCircle2 size={15} className="check-icon" /> <span><strong>Structure Power</strong></span></li>
                  <li><CheckCircle2 size={15} className="check-icon" /> <span><strong>Tech Power</strong></span></li>
                  <li><CheckCircle2 size={15} className="check-icon" /> <span><strong>Troop Power</strong></span></li>
                  <li><CheckCircle2 size={15} className="check-icon" /> <span><strong>Hero Power</strong></span></li>
                  <li><CheckCircle2 size={15} className="check-icon" /> <span><strong>Mod Vehicle Power</strong></span></li>
                </ul>
              </div>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
