import { useEffect, useRef, useState } from 'react';
import { Dices } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import {
  getGamePlayerAvatarBackground,
  randomizeGamePlayerAvatar,
  renderGamePlayerAvatar,
  type GamePlayerAvatar,
} from '@/lib/gamePlayerAvatar';

const AVATAR_ROLL_DURATION_MS = 2000;
const AVATAR_ROLL_FRAME_TIMES = [60, 130, 210, 300, 400, 515, 645, 795, 970, 1175, 1420, 1700];

interface GamePlayerAvatarPickerProps {
  readonly avatar: GamePlayerAvatar;
  readonly disabled: boolean;
  readonly onRandomize: (avatar: GamePlayerAvatar) => void;
}

export function GamePlayerAvatarPicker({
  avatar,
  disabled,
  onRandomize,
}: GamePlayerAvatarPickerProps) {
  const { t } = useTranslation();
  const [previewAvatar, setPreviewAvatar] = useState(avatar);
  const [isRolling, setIsRolling] = useState(false);
  const [isSettling, setIsSettling] = useState(false);
  const timeoutRef = useRef<number | null>(null);

  useEffect(() => {
    if (!isRolling) setPreviewAvatar(avatar);
  }, [avatar, isRolling]);

  useEffect(() => () => {
    if (timeoutRef.current !== null) window.clearTimeout(timeoutRef.current);
  }, []);

  const startRoll = () => {
    if (disabled || isRolling) return;

    const finalAvatar = randomizeGamePlayerAvatar(avatar);
    const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
    const startedAt = performance.now();
    let frame = 0;
    setIsRolling(true);
    setIsSettling(false);

    const advance = () => {
      const elapsed = performance.now() - startedAt;
      if (elapsed >= AVATAR_ROLL_DURATION_MS) {
        setPreviewAvatar(finalAvatar);
        setIsRolling(false);
        setIsSettling(false);
        timeoutRef.current = null;
        onRandomize(finalAvatar);
        return;
      }

      if (!reduceMotion) {
        setPreviewAvatar(randomizeGamePlayerAvatar(avatar));
        setIsSettling(elapsed >= 700);
      }

      frame += 1;
      const nextFrameAt = reduceMotion
        ? AVATAR_ROLL_DURATION_MS
        : AVATAR_ROLL_FRAME_TIMES[frame] ?? AVATAR_ROLL_DURATION_MS;
      const remaining = Math.max(0, nextFrameAt - (performance.now() - startedAt));
      timeoutRef.current = window.setTimeout(advance, remaining);
    };

    timeoutRef.current = window.setTimeout(
      advance,
      reduceMotion ? AVATAR_ROLL_DURATION_MS : AVATAR_ROLL_FRAME_TIMES[0]!,
    );
  };

  return (
    <div className="game-player-avatar-picker" aria-busy={isRolling}>
      <img
        className={[
          'game-player-avatar-image',
          isRolling && 'is-rolling',
          isSettling && 'is-settling',
        ].filter(Boolean).join(' ')}
        src={renderGamePlayerAvatar(previewAvatar)}
        alt=""
        aria-hidden="true"
        style={{ backgroundColor: getGamePlayerAvatarBackground(previewAvatar) }}
      />
      <button
        className={[
          'game-player-avatar-randomize-button',
          isRolling && 'is-rolling',
        ].filter(Boolean).join(' ')}
        type="button"
        aria-label={t('game.account.randomizeAvatar')}
        onClick={startRoll}
        disabled={disabled || isRolling}
      >
        <Dices size={21} aria-hidden="true" />
      </button>
    </div>
  );
}
