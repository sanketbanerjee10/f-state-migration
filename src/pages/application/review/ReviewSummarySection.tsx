import type { ReactNode } from 'react';
import { Edit2 } from 'lucide-react';

export type ReviewSummarySectionProps = {
  title: string;
  onEdit: () => void;
  editTestId: string;
  children: ReactNode;
  fullWidth?: boolean;
  t: (key: string, options?: Record<string, unknown>) => string;
};

export function ReviewSummarySection({
  title,
  onEdit,
  editTestId,
  children,
  fullWidth = false,
  t,
}: ReviewSummarySectionProps) {
  return (
    <div
      className="review-section-box"
      style={fullWidth ? { gridColumn: '1 / -1' } : undefined}
    >
      <div className="review-section-title-row">
        <strong>{title}</strong>
        <button
          type="button"
          className="link-button"
          onClick={onEdit}
          data-testid={editTestId}
        >
          <Edit2 size={12} /> {t('wizard.review.edit')}
        </button>
      </div>
      {children}
    </div>
  );
}
