import { useEffect, useId, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

interface GameGuideDetailDialogProps {
  readonly title: string;
  readonly preview: ReactNode;
  readonly children: ReactNode;
  readonly onClose: () => void;
}

export function GameGuideDetailDialog({
  title,
  preview,
  children,
  onClose,
}: GameGuideDetailDialogProps) {
  const titleId = useId();
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    const previouslyFocusedElement = document.activeElement;
    closeButtonRef.current?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onCloseRef.current();
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      if (previouslyFocusedElement instanceof HTMLElement) {
        previouslyFocusedElement.focus();
      }
    };
  }, []);

  return createPortal(
    <div className="game-guide-item-portal">
      <button
        className="game-guide-item-backdrop"
        type="button"
        aria-label="Close guide details"
        onClick={onClose}
      />
      <section
        className="game-guide-item-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onKeyDown={(event) => {
          if (event.key === 'Tab') {
            event.preventDefault();
            closeButtonRef.current?.focus();
          }
        }}
      >
        <header className="game-guide-item-dialog-header">
          <h2 id={titleId}>{title}</h2>
          <button
            ref={closeButtonRef}
            className="game-guide-item-dialog-close"
            type="button"
            aria-label="Close"
            onClick={onClose}
          >
            <X size={20} aria-hidden="true" />
          </button>
        </header>
        <div className="game-guide-item-dialog-preview">{preview}</div>
        <div className="game-guide-item-dialog-copy">{children}</div>
      </section>
    </div>,
    document.body,
  );
}
