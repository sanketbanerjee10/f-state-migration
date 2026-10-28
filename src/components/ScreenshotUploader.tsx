import { useRef, useState } from 'react';
import { FileImage, Upload, X, RefreshCw } from 'lucide-react';
import { formatFileSize } from '../lib/parsers';
import { useTranslation } from 'react-i18next';

const MAX_BYTES = 10 * 1024 * 1024;
const ACCEPTED = ['image/png', 'image/jpeg'];
export function ScreenshotUploader({ file, onFile, error }: {
  file: File | null; onFile: (file: File | null) => void; error?: string;
}) {
  const { t } = useTranslation();
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [localError, setLocalError] = useState('');
  const [preview, setPreview] = useState('');
  const validate = (chosen?: File) => {
    if (!chosen) return;
    if (!ACCEPTED.includes(chosen.type) && !/\.(png|jpe?g)$/i.test(chosen.name)) {
      setLocalError(t('components.uploader.choose')); return;
    }
    if (chosen.size > MAX_BYTES) { setLocalError(t('components.uploader.tooLarge')); return; }
    setLocalError('');
    if (preview) URL.revokeObjectURL(preview);
    setPreview(URL.createObjectURL(chosen));
    onFile(chosen);
  };
  const clear = () => {
    if (preview) URL.revokeObjectURL(preview);
    setPreview('');
    setLocalError('');
    onFile(null);
    if (inputRef.current) inputRef.current.value = '';
  };
  return <div>
    <div className={`upload-zone ${dragging ? 'is-dragging' : ''}`} data-testid="screenshot-dropzone"
      onDragOver={event => { event.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={event => { event.preventDefault(); setDragging(false); validate(event.dataTransfer.files[0]); }}>
      <div className="upload-icon"><FileImage size={19} /></div>
      <div className="upload-copy">
        <strong>{file ? t('components.uploader.ready') : t('components.uploader.dropHere')}</strong>
        <span>{t('components.uploader.hint')}</span>
      </div>
      <button type="button" className="button" onClick={() => inputRef.current?.click()} data-testid="choose-screenshot">
        {file ? <><RefreshCw size={14} /> {t('components.uploader.replace')}</> : <><Upload size={14} /> {t('components.uploader.chooseImage')}</>}
      </button>
      <input ref={inputRef} hidden type="file" accept="image/png,image/jpeg,.jpg,.jpeg,.png" aria-label={t('components.uploader.title')}
        onChange={event => validate(event.target.files?.[0])} data-testid="screenshot-input" />
    </div>
    {(localError || error) && <p className="error-text" role="alert">{localError || error}</p>}
    {file && preview && <div className="preview-wrap" data-testid="screenshot-preview">
      <img className="preview-image" src={preview} alt={t('components.uploader.previewAlt')} />
      <div className="file-details">
        <strong>{file.name}</strong><div className="hint">{formatFileSize(file.size)}</div>
        <div className="file-actions">
          <button type="button" className="button button-danger" onClick={clear} data-testid="remove-screenshot"><X size={14} /> {t('components.uploader.remove')}</button>
        </div>
      </div>
    </div>}
  </div>;
}
