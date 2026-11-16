import { ChevronRight, LoaderCircle, UserRound } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { renderGamePlayerAvatar } from '@/lib/gamePlayerAvatar';
import { useGamePlayerAuth } from './GamePlayerAuthProvider';

interface GamePlayerProfileWidgetProps {
  readonly onSignIn: () => void;
  readonly onOpenProfile: () => void;
}

export function GamePlayerProfileWidget({
  onSignIn,
  onOpenProfile,
}: GamePlayerProfileWidgetProps) {
  const { t } = useTranslation();
  const { account } = useGamePlayerAuth();

  if (account.status === 'loading') {
    return (
      <div
        className="game-player-profile-widget is-loading"
        role="status"
        aria-label={t('game.account.checking')}
      >
        <LoaderCircle size={18} aria-hidden="true" />
      </div>
    );
  }

  if (account.status === 'authenticated') {
    return (
      <button
        className="game-player-profile-widget game-player-profile-widget-authenticated"
        type="button"
        onClick={onOpenProfile}
        aria-label={t('game.account.signedInAs', { username: account.username })}
      >
        <img
          className="game-player-profile-widget-avatar"
          src={renderGamePlayerAvatar(account.avatar)}
          alt=""
        />
        <span className="game-player-profile-widget-copy">
          <strong>{account.username}</strong>
        </span>
        <ChevronRight className="game-player-profile-widget-chevron" size={17} aria-hidden="true" />
      </button>
    );
  }

  return (
    <div
      className="game-player-profile-widget game-player-profile-widget-guest"
      role="group"
      aria-label={t('game.account.title')}
    >
      <span className="game-player-profile-widget-mark" aria-hidden="true">
        <UserRound size={20} />
      </span>
      <span className="game-player-profile-widget-actions">
        <button className="is-primary" type="button" onClick={onSignIn}>
          {t('game.account.signIn')}
        </button>
      </span>
    </div>
  );
}
