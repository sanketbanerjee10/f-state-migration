import { BookOpen, Settings, Trophy } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { GameMenuView } from './GameMenuTypes';

interface GameMenuSecondaryNavigationProps {
  readonly onViewChange: (view: GameMenuView) => void;
}

export function GameMenuSecondaryNavigation({
  onViewChange,
}: GameMenuSecondaryNavigationProps) {
  const { t } = useTranslation();

  return (
    <nav className="game-secondary-navigation" aria-label={t('game.menu.secondaryNavigation')}>
      <button
        className="game-secondary-navigation-item"
        type="button"
        onClick={() => onViewChange('leaderboard')}
      >
        <Trophy aria-hidden="true" />
        <span>{t('game.menu.leaderboard')}</span>
      </button>
      <button
        className="game-secondary-navigation-item"
        type="button"
        onClick={() => onViewChange('enemy-guide')}
      >
        <BookOpen aria-hidden="true" />
        <span>{t('game.menu.guides')}</span>
      </button>
      <button
        className="game-secondary-navigation-item"
        type="button"
        onClick={() => onViewChange('settings')}
      >
        <Settings aria-hidden="true" />
        <span>{t('game.menu.settings')}</span>
      </button>
    </nav>
  );
}
