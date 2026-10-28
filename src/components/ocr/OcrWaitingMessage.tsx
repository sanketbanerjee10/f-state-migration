import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

const WAITING_MESSAGE_COUNT = 17;

export function OcrWaitingMessage({ progress }: { progress?: number }) {
  const { t } = useTranslation();
  const [index, setIndex] = useState(() => Math.floor(Math.random() * WAITING_MESSAGE_COUNT));

  useEffect(() => {
    const timer = setInterval(() => {
      setIndex((prev) => {
        const next = Math.floor(Math.random() * (WAITING_MESSAGE_COUNT - 1));
        return next >= prev ? next + 1 : next;
      });
    }, 3500);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="ocr-waiting-message" role="status" aria-live="polite">
      <span key={index} className="ocr-funny-text">{t(`components.ocr.waiting.${index}`)}</span>
      {typeof progress === 'number' && progress > 0 && (
        <span className="ocr-percentage">{progress}%</span>
      )}
    </div>
  );
}
