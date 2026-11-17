import { useTranslation } from 'react-i18next';

interface GamePauseQuickAccessProps {
  readonly onResume: () => void;
  readonly onOpenSettings: () => void;
  readonly onOpenFieldGuide: () => void;
  readonly onRestart: () => void;
  readonly onReturnToMenu: () => void;
  readonly tutorialMode: boolean;
  readonly showHeading?: boolean;
}

export function GamePauseQuickAccess({
  onResume,
  onOpenSettings,
  onOpenFieldGuide,
  onRestart,
  onReturnToMenu,
  tutorialMode,
  showHeading = true,
}: GamePauseQuickAccessProps) {
  const { t } = useTranslation();

  return (
    <section className="game-pause-quick-actions" aria-label={t('game.pause.actions')}>
      {showHeading && (
        <div className="game-pause-section-kicker">
          <span className="game-pause-kicker-mark" />
          {t('game.pause.quickAccess')}
        </div>
      )}
      <button
        className="game-pause-resume"
        type="button"
        onClick={onResume}
        autoFocus
      >
        <span className="game-pause-resume-symbol" aria-hidden="true">▶</span>
        <span className="game-pause-resume-copy">
          <strong>{t('game.pause.resumeRun')}</strong>
          <small>{t('game.pause.jumpBack')}</small>
        </span>
        <span className="game-pause-resume-key" aria-hidden="true">↵</span>
      </button>

      <div className="game-pause-action-grid">
        <button
          className="game-pause-action"
          type="button"
          onClick={onOpenSettings}
        >
          <span className="game-pause-action-icon" aria-hidden="true">⚙</span>
          <span>{t('game.pause.settings')}</span>
        </button>
        <button
          className="game-pause-action"
          type="button"
          onClick={onOpenFieldGuide}
        >
          <span className="game-pause-action-icon" aria-hidden="true">▤</span>
          <span>{t('game.pause.fieldGuide')}</span>
        </button>
        {!tutorialMode && (
          <button
            className="game-pause-action game-pause-action-muted"
            type="button"
            onClick={onRestart}
          >
            <span className="game-pause-action-icon" aria-hidden="true">↻</span>
            <span>{t('game.pause.restartRun')}</span>
          </button>
        )}
        <button
          className="game-pause-action game-pause-action-muted"
          type="button"
          onClick={onReturnToMenu}
        >
          <span className="game-pause-action-icon" aria-hidden="true">⌂</span>
          <span>{t(tutorialMode ? 'game.pause.exitTutorial' : 'game.pause.mainMenu')}</span>
        </button>
      </div>
    </section>
  );
}
