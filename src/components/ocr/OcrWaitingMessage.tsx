import { useEffect, useState } from 'react';

const WAITING_MESSAGES = [
  'Counting your power… no calculator is brave enough.',
  'Teaching the OCR goblin to read your stats.',
  'Your troops are reporting for paperwork.',
  'Checking the numbers before leadership gets suspicious.',
  'Reviewing your combat records… strictly in your browser.',
];

export function OcrWaitingMessage({ progress }: { progress?: number }) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setIndex((prev) => (prev + 1) % WAITING_MESSAGES.length);
    }, 3500);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="ocr-waiting-message" role="status" aria-live="polite">
      <span className="ocr-funny-text">{WAITING_MESSAGES[index]}</span>
      {typeof progress === 'number' && progress > 0 && (
        <span className="ocr-percentage">{progress}%</span>
      )}
    </div>
  );
}
