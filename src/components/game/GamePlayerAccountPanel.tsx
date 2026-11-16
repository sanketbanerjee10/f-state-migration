import { useEffect, useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Check, ChevronLeft, CircleHelp, Eye, EyeOff, LoaderCircle, X } from 'lucide-react';
import { toast } from 'sonner';
import { ApiError } from '@/lib/api-client/custom-fetch';
import { checkGamePlayerUsernameAvailability } from '@/lib/gameApi';
import {
  createDefaultGamePlayerAvatar,
  getGamePlayerAvatarBackground,
  renderGamePlayerAvatar,
} from '@/lib/gamePlayerAvatar';
import { useGamePlayerAuth } from './GamePlayerAuthProvider';
import { GameFranchiseWordmark } from './GameFranchiseWordmark';
import { GamePlayerAvatarPicker } from './GamePlayerAvatarPicker';

interface GamePlayerAccountPanelProps {
  readonly onBack: () => void;
  readonly backLabel: string;
  readonly initialTab?: 'sign-in' | 'sign-up';
}

type UsernameAvailabilityStatus = 'idle' | 'checking' | 'available' | 'unavailable' | 'error';

export function GamePlayerAccountPanel({
  onBack,
  backLabel,
  initialTab = 'sign-in',
}: GamePlayerAccountPanelProps) {
  const { t } = useTranslation();
  const { account, createAccount, signIn, signOut } = useGamePlayerAuth();
  const [isRegistering, setIsRegistering] = useState(initialTab === 'sign-up');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const [avatarDraft, setAvatarDraft] = useState(() =>
    createDefaultGamePlayerAvatar(globalThis.crypto?.randomUUID?.() ?? 'last-z-afterhours'),
  );
  const [usernameAvailability, setUsernameAvailability] = useState<{
    username: string;
    status: UsernameAvailabilityStatus;
  }>({ username: '', status: 'idle' });
  const usernameForAvailability = username.trim().toLowerCase();

  useEffect(() => {
    if (account.status === 'authenticated') setAvatarDraft(account.avatar);
  }, [account]);

  useEffect(() => {
    if (
      !isRegistering
      || usernameForAvailability.length < 3
      || usernameForAvailability.length > 32
      || !/^[a-z0-9_-]+$/.test(usernameForAvailability)
    ) {
      setUsernameAvailability({ username: usernameForAvailability, status: 'idle' });
      return;
    }

    const controller = new AbortController();
    setUsernameAvailability({ username: usernameForAvailability, status: 'checking' });
    const timeoutId = window.setTimeout(() => {
      void checkGamePlayerUsernameAvailability(username.trim(), { signal: controller.signal })
        .then(({ available }) => {
          if (!controller.signal.aborted) {
            setUsernameAvailability({
              username: usernameForAvailability,
              status: available ? 'available' : 'unavailable',
            });
          }
        })
        .catch(() => {
          if (!controller.signal.aborted) {
            setUsernameAvailability({ username: usernameForAvailability, status: 'error' });
          }
        });
    }, 350);

    return () => {
      window.clearTimeout(timeoutId);
      controller.abort();
    };
  }, [isRegistering, username, usernameForAvailability]);

  const getRequestErrorMessage = (requestError: unknown) => {
    if (!(requestError instanceof ApiError)) return t('game.account.requestFailed');
    if (requestError.status === 401 && !isRegistering) {
      return t('game.account.invalidCredentials');
    }
    if (requestError.status === 409 && isRegistering) {
      return t('game.account.usernameConflict');
    }
    if (requestError.status === 400) return t('game.account.invalidInput');
    if (requestError.status === 429) return t('game.account.tooManyRequests');
    if (requestError.status >= 500) return t('game.account.serviceUnavailable');
    return t('game.account.requestFailed');
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsPending(true);
    try {
      if (isRegistering) await createAccount(username, password, avatarDraft);
      else await signIn(username, password);
      setPassword('');
    } catch (requestError) {
      toast.error(getRequestErrorMessage(requestError));
    } finally {
      setIsPending(false);
    }
  };

  const logout = async () => {
    setIsPending(true);
    try {
      await signOut();
    } catch (requestError) {
      toast.error(getRequestErrorMessage(requestError));
    } finally {
      setIsPending(false);
    }
  };

  return (
    <div className="game-player-account">
      <header className="game-player-account-header">
        <button
          className="game-level-back-button"
          type="button"
          aria-label={backLabel}
          onClick={onBack}
          autoFocus
        >
          <ChevronLeft size={22} aria-hidden="true" />
        </button>
        <div>
          <p className="game-dialog-wordmark"><GameFranchiseWordmark /></p>
          <h2 id="game-player-account-title">{t('game.account.title')}</h2>
        </div>
      </header>

      {account.status === 'loading' ? (
        <p role="status">{t('game.account.checking')}</p>
      ) : account.status === 'authenticated' ? (
        <div className="game-player-account-status">
          <div className="game-player-profile">
            <div className="game-player-avatar-picker">
              <img
                className="game-player-avatar-image"
                src={renderGamePlayerAvatar(account.avatar)}
                alt=""
                aria-hidden="true"
                style={{ backgroundColor: getGamePlayerAvatarBackground(account.avatar) }}
              />
            </div>
            <div className="game-player-profile-copy">
              <strong>{t('game.account.signedInAs', { username: account.username })}</strong>
              <p>{t('game.account.signedInDescription')}</p>
            </div>
          </div>
          <button
            className="game-menu-primary"
            type="button"
            onClick={() => void logout()}
            disabled={isPending}
          >
            {isPending ? t('game.account.signingOut') : t('game.account.signOut')}
          </button>
        </div>
      ) : (
        <>
          {account.sessionError && (
            <p className="game-score-error" role="alert">{t('game.account.statusCheckFailed')}</p>
          )}
          <div className="game-player-account-tabs" role="group" aria-label={t('game.account.title')}>
            <button
              type="button"
              className={isRegistering ? '' : 'is-active'}
              aria-pressed={!isRegistering}
              onClick={() => {
                setIsRegistering(false);
              }}
            >
              {t('game.account.signIn')}
            </button>
            <button
              type="button"
              className={isRegistering ? 'is-active' : ''}
              aria-pressed={isRegistering}
              onClick={() => {
                setIsRegistering(true);
                setAvatarDraft(createDefaultGamePlayerAvatar(
                  globalThis.crypto?.randomUUID?.() ?? 'last-z-afterhours',
                ));
              }}
            >
              {t('game.account.createAccount')}
            </button>
          </div>
          <form className="game-player-account-form" onSubmit={(event) => void submit(event)}>
            {isRegistering && (
              <div className="game-player-avatar-signup">
                <GamePlayerAvatarPicker
                  avatar={avatarDraft}
                  disabled={isPending}
                  onRandomize={setAvatarDraft}
                />
              </div>
            )}
            <label htmlFor="game-account-username">{t('game.account.username')}</label>
            <div className="game-player-username-field">
              <input
                id="game-account-username"
                name="username"
                type="text"
                autoComplete="username"
                minLength={3}
                maxLength={32}
                pattern="[A-Za-z0-9_-]+"
                required
                value={username}
                onChange={(event) => setUsername(event.currentTarget.value)}
                disabled={isPending}
                aria-invalid={
                  isRegistering
                  && usernameAvailability.username === usernameForAvailability
                  && usernameAvailability.status === 'unavailable'
                }
                aria-describedby={
                  isRegistering
                  && usernameAvailability.username === usernameForAvailability
                  && usernameAvailability.status === 'unavailable'
                    ? 'game-account-username-unavailable'
                    : undefined
                }
              />
              {isRegistering
                && usernameAvailability.username === usernameForAvailability
                && usernameAvailability.status !== 'idle' && (
                  <span
                    className={`game-player-username-status is-${usernameAvailability.status}`}
                    data-username-availability={usernameAvailability.status}
                    role="img"
                    aria-label={t(`game.account.username${usernameAvailability.status[0]!.toUpperCase()}${usernameAvailability.status.slice(1)}`)}
                    aria-live="polite"
                  >
                    {usernameAvailability.status === 'checking'
                      ? <LoaderCircle aria-hidden="true" size={18} />
                      : usernameAvailability.status === 'available'
                        ? <Check aria-hidden="true" size={18} />
                        : usernameAvailability.status === 'unavailable'
                          ? <X aria-hidden="true" size={18} />
                          : <CircleHelp aria-hidden="true" size={18} />}
                  </span>
                )}
              {isRegistering
                && usernameAvailability.username === usernameForAvailability
                && usernameAvailability.status === 'unavailable' && (
                  <p className="game-player-username-hint" id="game-account-username-unavailable" role="status">
                    {t('game.account.usernameTakenHint')}
                  </p>
                )}
            </div>
            <label htmlFor="game-account-password">{t('game.account.password')}</label>
            <div className="game-player-password-field">
              <input
                id="game-account-password"
                name="password"
                type={isPasswordVisible ? 'text' : 'password'}
                autoComplete={isRegistering ? 'new-password' : 'current-password'}
                required
                value={password}
                onChange={(event) => setPassword(event.currentTarget.value)}
                disabled={isPending}
              />
              <button
                className="game-player-password-toggle"
                type="button"
                aria-label={t(isPasswordVisible ? 'game.account.hidePassword' : 'game.account.showPassword')}
                aria-pressed={isPasswordVisible}
                onClick={() => setIsPasswordVisible((visible) => !visible)}
              >
                {isPasswordVisible
                  ? <EyeOff size={18} aria-hidden="true" />
                  : <Eye size={18} aria-hidden="true" />}
              </button>
            </div>
            <button
              className="game-menu-primary"
              type="submit"
              disabled={
                isPending
                || (
                  isRegistering
                  && usernameAvailability.username === usernameForAvailability
                  && (usernameAvailability.status === 'checking' || usernameAvailability.status === 'unavailable')
                )
              }
            >
              {isPending
                ? t('game.account.working')
                : isRegistering
                  ? t('game.account.createAccount')
                  : t('game.account.signIn')}
            </button>
          </form>
        </>
      )}
    </div>
  );
}
