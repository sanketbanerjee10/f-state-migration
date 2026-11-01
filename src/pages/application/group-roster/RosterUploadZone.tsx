import type { TFunction } from 'i18next';
import { FileImage, Upload } from 'lucide-react';

export type RosterUploadZoneProps = {
  dragging: boolean;
  uploading: boolean;
  t: TFunction;
  onBrowse: () => void;
  onFiles: (files: FileList | File[]) => void;
  setDragging: (value: boolean) => void;
};

export function RosterUploadZone({ dragging, uploading, t, onBrowse, onFiles, setDragging }: RosterUploadZoneProps) {
  return (
    <div
      className={`upload-zone compact-upload-zone ${dragging ? 'is-dragging' : ''} flex items-center justify-between flex-wrap gap-2`}
      onClick={onBrowse}
      role="button"
      tabIndex={0}
      onDragOver={(e) => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragging(false);
        const files = e.dataTransfer.files;
        if (files && files.length > 0) {
          onFiles(files);
        }
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onBrowse();
        }
      }}
      data-testid="group-roster-dropzone"
      aria-disabled={uploading}
    >
      <div className="flex gap-2 items-center">
        <div className="upload-icon">
          <Upload size={20} />
        </div>
        <div className="upload-copy">
          <strong>{t('wizard.roster.dropPrompt')}</strong>
          <p className="hint" style={{ margin: 0 }}>{t('wizard.roster.formats')}</p>
        </div>
      </div>
      <button
        type="button"
        className="button button-quiet"
        onClick={(e) => {
          e.stopPropagation();
          onBrowse();
        }}
        data-testid="choose-group-roster-files"
      >
        <FileImage size={14} /> {t('wizard.roster.browse')}
      </button>
    </div>
  );
}
