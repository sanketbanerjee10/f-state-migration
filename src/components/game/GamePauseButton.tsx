import { Pause } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export function GamePauseButton({ onPause }: { readonly onPause: () => void }) {
  const { t } = useTranslation();
  return (
    <button
      className="game-pause-button"
      type="button"
      onClick={onPause}
      aria-label={t('game.pauseButton.ariaLabel')}
      title={t('game.pauseButton.title')}
    >
      <Pause aria-hidden="true" />
      <span aria-hidden="true">{t('game.pauseButton.label')}</span>
    </button>
  );
}
