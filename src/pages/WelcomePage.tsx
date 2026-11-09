import {
  ArrowRight,
  ArrowUpRight,
  FileText,
  Gamepad2,
  UsersRound,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link } from 'wouter';
import { LanguageSelector } from '../components/LanguageSelector';

const destinations = [
  {
    number: '01',
    key: 'community',
    href: '/about',
    icon: UsersRound,
    className: 'welcome-card-community',
  },
  {
    number: '02',
    key: 'migration',
    href: '/apply',
    icon: FileText,
    className: 'welcome-card-migration',
  },
  {
    number: '03',
    key: 'game',
    href: '/game',
    icon: Gamepad2,
    className: 'welcome-card-game',
  },
];

export function WelcomePage() {
  const { t } = useTranslation();

  return (
    <main className="welcome-page" data-testid="welcome-page">
      <section className="welcome-hero">
        <div className="welcome-language">
          <LanguageSelector />
        </div>
        <picture className="welcome-hero-art">
          <source
            media="(max-width: 760px)"
            srcSet="https://ik.imagekit.io/c1tiz3nte/Mobile%20Cozy%20Moonlit%20Campfire%20Night.png?updatedAt=1793767502741"
          />
          <source
            media="(max-width: 1200px)"
            srcSet="https://ik.imagekit.io/c1tiz3nte/Tablet%20Moonlit%20Campfire%20at%20Watchtower%20565.png?updatedAt=1793767502872"
          />
          <img
            src="https://ik.imagekit.io/c1tiz3nte/PC%20Cozy%20Moonlit%20Zombie%20Campfire_scene.png?updatedAt=1793767502838"
            alt=""
            aria-hidden="true"
          />
        </picture>
        <div className="welcome-hero-shade" />

        <div className="welcome-hero-content">
          <div className="welcome-eyebrow">
            <span className="welcome-live-dot" />
            {t('pages.welcome.heroEyebrow')}
          </div>
          <h1>
            {t('pages.welcome.titleLead')}
            <br />
            <span>{t('pages.welcome.title')}</span>
          </h1>
          <p>{t('pages.welcome.intro')}</p>
          <Link href="/apply" className="welcome-primary-action">
            {t('pages.welcome.primaryAction')} <ArrowRight size={17} />
          </Link>
        </div>

        <div className="welcome-hero-caption">
          <span className="welcome-caption-line" />
          <span>{t('pages.welcome.caption')}</span>
        </div>
      </section>

      <section className="welcome-destinations" aria-labelledby="welcome-paths-title">
        <div className="welcome-section-heading">
          <div>
            <div className="welcome-section-kicker">{t('pages.welcome.sectionKicker')}</div>
            <h2 id="welcome-paths-title">{t('pages.welcome.sectionTitle')}</h2>
          </div>
        </div>

        <div className="welcome-card-grid">
          {destinations.map((destination) => {
            const Icon = destination.icon;
            const cardKey = `pages.welcome.cards.${destination.key}`;
            const title = t(`${cardKey}.title`);
            const description = t(`${cardKey}.description`);

            return (
              <Link
                key={destination.number}
                href={destination.href}
                className={`welcome-card ${destination.className}`}
                aria-label={`${title}: ${description}`}
              >
                <div className="welcome-card-top">
                  <span className="welcome-card-icon"><Icon size={21} /></span>
                  <span className="welcome-card-number">{destination.number}</span>
                </div>
                <div className="welcome-card-eyebrow">{t(`${cardKey}.eyebrow`)}</div>
                <h3>{title}</h3>
                <p>{description}</p>
                <span className="welcome-card-action">
                  {t(`${cardKey}.action`)}
                  <ArrowUpRight size={16} />
                </span>
              </Link>
            );
          })}
        </div>
      </section>

      <footer className="footer-note welcome-footer">
        <div className="welcome-footer-links">
          <span>{t('wizard.layout.applicationPortal')}</span>
          <span aria-hidden="true">·</span>
          <Link href="/about">{t('common.navigation.about')}</Link>
          <span aria-hidden="true">·</span>
          <Link href="/game">Mini game</Link>
        </div>
        <div>{t('wizard.layout.credit')}</div>
      </footer>
    </main>
  );
}
