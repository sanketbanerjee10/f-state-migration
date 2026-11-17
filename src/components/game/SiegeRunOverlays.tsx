import type { GameSettings } from '@/game/core/GameSettings';
import { useTranslation } from 'react-i18next';
import type { SiegeRuntimeState } from '@/game/siege/SiegeEngine';
import { GameEnemyGuide } from './GameEnemyGuide';
import { GamePauseQuickAccess } from './GamePauseQuickAccess';
import { GameSettingsPanel } from './GameSettingsPanel';
import type { ActiveSiegeRun } from './siege/SiegeGameUtils';
import { SiegeModal } from './SiegeModal';

export type SiegePauseView = 'menu' | 'settings' | 'enemy-guide';

interface SiegeRunOverlaysProps {
  readonly run: ActiveSiegeRun;
  readonly runtime: SiegeRuntimeState;
  readonly engineError: string | null;
  readonly saveError: string | null;
  readonly stars: number;
  readonly settings: GameSettings;
  readonly settingsError: string | null;
  readonly pauseView: SiegePauseView;
  readonly onExit: () => void;
  readonly onResume: () => void;
  readonly onPauseViewChange: (view: SiegePauseView) => void;
  readonly onSettingsChange: (settings: GameSettings) => void;
  readonly onMainMenu: () => void;
  readonly onPlayAgain: () => void;
  readonly onChooseLevel: () => void;
  readonly onNextLevel?: () => void;
}

export function SiegeRunOverlays({
  run,
  runtime,
  engineError,
  saveError,
  stars,
  settings,
  settingsError,
  pauseView,
  onExit,
  onResume,
  onPauseViewChange,
  onSettingsChange,
  onMainMenu,
  onPlayAgain,
  onChooseLevel,
  onNextLevel,
}: SiegeRunOverlaysProps) {
  const { t } = useTranslation();

  if (engineError) {
    return (
      <SiegeModal title={t('game.siege.title')} size="compact">
        <p role="alert">{t('game.siege.engineError', { error: engineError })}</p>
        <div className="game-menu-actions">
          <button className="game-menu-secondary" type="button" onClick={onExit}>
            {t('game.siege.back')}
          </button>
        </div>
      </SiegeModal>
    );
  }

  if (runtime.phase === 'paused') {
    const backLabel = t('game.menu.backToPauseMenu');

    return (
      <>
        <SiegeModal
          title={t('game.siege.paused')}
          size="compact"
          ariaModal={pauseView === 'menu'}
        >
          <GamePauseQuickAccess
            onResume={onResume}
            onOpenSettings={() => onPauseViewChange('settings')}
            onOpenFieldGuide={() => onPauseViewChange('enemy-guide')}
            onRestart={onPlayAgain}
            onReturnToMenu={onMainMenu}
            tutorialMode={false}
            showHeading={false}
          />
        </SiegeModal>
        {pauseView === 'settings' && (
          <>
            <button
              className="game-settings-backdrop"
              type="button"
              aria-label={t('game.menu.closeSettings')}
              onClick={() => onPauseViewChange('menu')}
            />
            <section
              className="game-settings-dialog"
              role="dialog"
              aria-modal="true"
              aria-labelledby="game-settings-title"
              onKeyDown={(event) => {
                if (event.key === 'Escape') onPauseViewChange('menu');
              }}
            >
              <GameSettingsPanel
                settings={settings}
                error={settingsError}
                audioError={null}
                onChange={onSettingsChange}
                onBack={() => onPauseViewChange('menu')}
                backLabel={backLabel}
              />
            </section>
          </>
        )}
        {pauseView === 'enemy-guide' && (
          <>
            <button
              className="game-guide-backdrop"
              type="button"
              aria-label={t('game.menu.closeGuides')}
              onClick={() => onPauseViewChange('menu')}
            />
            <section
              className="game-guide-dialog"
              role="dialog"
              aria-modal="true"
              aria-labelledby="game-enemy-guide-title"
              onKeyDown={(event) => {
                if (event.key === 'Escape') onPauseViewChange('menu');
              }}
            >
              <GameEnemyGuide
                onBack={() => onPauseViewChange('menu')}
                backLabel={backLabel}
              />
            </section>
          </>
        )}
      </>
    );
  }

  if (runtime.phase !== 'won' && runtime.phase !== 'lost') return null;

  return (
    <SiegeModal
      title={t(runtime.phase === 'won' ? 'game.siege.won' : 'game.siege.lost')}
      size="compact"
    >
      <p className="game-panel-eyebrow">{run.level.name}</p>
      <p className="game-siege-result-stars" aria-label={t('game.siege.stars', { count: stars })}>
        <span aria-hidden="true">{'★'.repeat(stars)}{'☆'.repeat(3 - stars)}</span>
        <span className="game-siege-result-stars-count">
          {t('game.siege.stars', { count: stars })}
        </span>
      </p>
      <p>{t('game.siege.survivors', { count: runtime.troops })}</p>
      {saveError && (
        <p className="game-siege-save-error" role="status">
          {t('game.siege.progressSaveError', { error: saveError })}
        </p>
      )}
      {runtime.phase === 'won' ? (
        <div className="game-menu-actions game-siege-result-actions game-siege-result-actions-won">
          <button
            className="game-menu-primary game-siege-result-action game-siege-result-next"
            type="button"
            onClick={onNextLevel ?? onChooseLevel}
          >
            {onNextLevel
              ? t('game.results.nextLevel')
              : t('game.siege.continue')}
          </button>
          <button
            className="game-menu-secondary game-siege-result-action"
            type="button"
            onClick={onPlayAgain}
          >
            <span className="game-siege-result-icon" aria-hidden="true">↻</span>
            <span>{t('game.siege.playAgain')}</span>
          </button>
          <button
            className="game-menu-secondary game-siege-result-action"
            type="button"
            onClick={onMainMenu}
          >
            <span className="game-siege-result-icon" aria-hidden="true">⌂</span>
            <span>{t('game.siege.mainMenu')}</span>
          </button>
        </div>
      ) : (
        <div className="game-menu-actions game-siege-result-actions game-siege-result-actions-lost">
          <button
            className="game-menu-secondary game-siege-result-action"
            type="button"
            onClick={onMainMenu}
          >
            <span className="game-siege-result-icon" aria-hidden="true">⌂</span>
            <span>{t('game.siege.mainMenu')}</span>
          </button>
          <button
            className="game-menu-primary game-siege-result-action"
            type="button"
            onClick={onPlayAgain}
          >
            <span className="game-siege-result-icon" aria-hidden="true">↻</span>
            <span>{t('game.siege.playAgain')}</span>
          </button>
        </div>
      )}
    </SiegeModal>
  );
}
