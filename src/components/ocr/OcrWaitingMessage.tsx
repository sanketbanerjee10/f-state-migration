import { useEffect, useState } from 'react';

const WAITING_MESSAGES = [
  "565 HQ is checking whether you're battle-ready.",
  'Evaluating your power before we let you brag about it.',
  'Preparing your dossier for the war council.',
  'Checking if you belong on the battlefield or in the kitchen.',
  '565 leadership is watching. No pressure.',
  'Every pixel counts. Every troop counts. Every screenshot too.',
  'Your profile is being prepared for greatness. Or paperwork.',
  "We don't surrender. Even to 100 screenshots.",
  'The migration officers demand more coffee.',
  'Verifying our undefeated SVS reputation. No pressure.',
  'Checking if you know the difference between attacking and feeding points.',
  'Assessing your ability to defend without accidentally starting a rally.',
  'Checking whether you defend objectives or just admire the map.',
  'Your application has entered NAP negotiations.',
  'Comparing your stats with your confidence level.',
  'Your strongest hero is being asked to explain these numbers.',
  'Your screenshots are being interrogated one by one.',
];

export function OcrWaitingMessage({ progress }: { progress?: number }) {
  const [index, setIndex] = useState(() => Math.floor(Math.random() * WAITING_MESSAGES.length));

  useEffect(() => {
    const timer = setInterval(() => {
      setIndex((prev) => {
        const next = Math.floor(Math.random() * (WAITING_MESSAGES.length - 1));
        return next >= prev ? next + 1 : next;
      });
    }, 3500);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="ocr-waiting-message" role="status" aria-live="polite">
      <span key={index} className="ocr-funny-text">{WAITING_MESSAGES[index]}</span>
      {typeof progress === 'number' && progress > 0 && (
        <span className="ocr-percentage">{progress}%</span>
      )}
    </div>
  );
}
