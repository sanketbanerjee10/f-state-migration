import type { ReactNode } from 'react';
import { ArrowLeft } from 'lucide-react';
import { Link } from 'wouter';
import { useTranslation } from 'react-i18next';
import { LanguageSelector } from '@/components/LanguageSelector';

export type PageHeaderProps = {
  showBackButton?: boolean;
  backHref?: string;
  backLabel?: ReactNode;
  backAriaLabel?: string;
  backTestId?: string;
  leadingActions?: ReactNode;
  actions?: ReactNode;
  className?: string;
  eyebrow?: ReactNode;
  title?: ReactNode;
  description?: ReactNode;
  descriptionClassName?: string;
};

export function PageHeader({
  showBackButton = true,
  backHref = '/',
  backLabel,
  backAriaLabel,
  backTestId,
  leadingActions,
  actions,
  className,
  eyebrow,
  title,
  description,
  descriptionClassName,
}: PageHeaderProps) {
  const { t } = useTranslation();

  return (
    <header className={`page-header${className ? ` ${className}` : ''}`}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginBottom: 12 }}>
        {showBackButton && (
          <Link
            href={backHref}
            className="button button-secondary"
            aria-label={backAriaLabel ?? (typeof backLabel === 'string' && backLabel
              ? backLabel
              : t('common.actions.back'))}
            data-testid={backTestId}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: '0.85rem' }}
          >
            <ArrowLeft size={14} /> {backLabel ?? t('common.actions.back')}
          </Link>
        )}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginLeft: 'auto' }}>
          {leadingActions}
          <LanguageSelector />
          {actions}
        </div>
      </div>
      {eyebrow != null && (
        <div className="eyebrow">{eyebrow}</div>
      )}
      {title != null && <h1 className="form-title">{title}</h1>}
      {description != null && (
        <p className={`intro${descriptionClassName ? ` ${descriptionClassName}` : ''}`}>
          {description}
        </p>
      )}
    </header>
  );
}
