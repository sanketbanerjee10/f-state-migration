import type { ReactNode } from 'react';
import { ChevronLeft } from 'lucide-react';
import { GameFranchiseWordmark } from './GameFranchiseWordmark';
import { GamePauseMoon } from './GamePauseMoon';

interface SiegeModalProps {
  readonly title: string;
  readonly children: ReactNode;
  readonly size?: 'wide' | 'compact';
  readonly busy?: boolean;
  readonly ariaModal?: boolean;
  readonly onBack?: () => void;
  readonly backLabel?: string;
}

export function SiegeModal({
  title,
  children,
  size = 'wide',
  busy,
  ariaModal = true,
  onBack,
  backLabel,
}: SiegeModalProps) {
  return (
    <>
      <div className="game-modal-backdrop game-siege-backdrop" aria-hidden="true" />
      <section
        className={`game-menu-overlay game-siege-menu${size === 'compact' ? ' game-siege-modal-compact' : ''}`}
        aria-labelledby="siege-modal-title"
        aria-busy={busy}
        aria-hidden={!ariaModal}
        role="dialog"
        aria-modal={ariaModal}
      >
        <header className="settings-header game-siege-modal-header">
          <div className="settings-brand">
            {onBack && backLabel && (
              <button
                className="game-level-back-button"
                type="button"
                aria-label={backLabel}
                onClick={onBack}
                autoFocus
              >
                <ChevronLeft size={22} aria-hidden="true" />
              </button>
            )}
            <div className="settings-title">
              <p className="game-dialog-wordmark">
                <GameFranchiseWordmark />
              </p>
              <h1 id="siege-modal-title">{title}</h1>
            </div>
          </div>
          <GamePauseMoon />
        </header>
        <div className="game-siege-modal-content">{children}</div>
      </section>
    </>
  );
}
