
import { Link } from 'wouter';
import { useTranslation } from 'react-i18next';
import { LanguageSelector } from '@/components/LanguageSelector';
import {
  ArrowLeft,
  ArrowRight,
  Trophy,
  Swords,
  Users,
  ShieldCheck,
  Heart,
  Target,
  Clock,
  Handshake,
  MessageCircle,
  TrendingUp,
  Flag,
} from 'lucide-react';

const achievements = [
  {
    number: '01',
    titleKey: 'achievements.svsTitle',
    descriptionKey: 'achievements.svsDescription',
    icon: ShieldCheck,
  },
  {
    number: '02',
    titleKey: 'achievements.563Title',
    descriptionKey: 'achievements.563Description',
    icon: Swords,
  },
  {
    number: '03',
    titleKey: 'achievements.hardTitle',
    descriptionKey: 'achievements.hardDescription',
    icon: Trophy,
  },
  {
    number: '04',
    titleKey: 'achievements.twoVtwoTitle',
    descriptionKey: 'achievements.twoVtwoDescription',
    icon: Flag,
  },
];

const principles = [
  {
    icon: TrendingUp,
    titleKey: 'principles.improveTitle',
    descriptionKey: 'principles.improveDescription',
  },
  {
    icon: Clock,
    titleKey: 'principles.realLifeTitle',
    descriptionKey: 'principles.realLifeDescription',
  },
  {
    icon: MessageCircle,
    titleKey: 'principles.banterTitle',
    descriptionKey: 'principles.banterDescription',
  },
  {
    icon: Heart,
    titleKey: 'principles.peopleTitle',
    descriptionKey: 'principles.peopleDescription',
  },
];

function ImagePlaceholder({
  label,
  subtitle,
  className = '',
}: {
  label: string;
  subtitle: string;
  className?: string;
}) {
  return (
    <div className={`about-image-placeholder ${className}`}>
      <div className="about-image-placeholder-content">
        <div className="about-image-placeholder-icon">
          <Trophy size={25} />
        </div>
        <span>{label}</span>
        <small>{subtitle}</small>
      </div>
    </div>
  );
}

export function About565() {
  const { t } = useTranslation();
  return (
    <main className="form-shell about565" data-testid="about-565-page">
      {/* Top navigation */}
      <div className="about-topbar">
        <div className="about-eyebrow">
          {t('pages.about565.state')} <span style={{ color: '#657486' }}>/ {t('pages.about565.aboutUs')}</span>
        </div>

        <div className="about-topbar-actions">
          <LanguageSelector />
          <Link
            href="/"
            className="button button-secondary about-back-link"
          >
            <ArrowLeft size={13} />
            {t('common.navigation.backToApplication')}
          </Link>
        </div>
      </div>

      {/* Hero */}
      <section className="about-hero">
        <div className="about-hero-grid">
          <div>
            <div className="about-eyebrow">{t('pages.about565.eyebrow')}</div>
            <h1>
              {t('pages.about565.heroLead')}
              <br />
              <span>{t('pages.about565.heroTitle')}</span>
            </h1>

            <p className="about-hero-copy">
              {t('pages.about565.heroCopy')}
            </p>

            <div className="about-hero-note">
              <ShieldCheck size={18} />
              <span>{t('pages.about565.heroSubtitle')}</span>
            </div>
          </div>

          {/* Replace this placeholder with your State 565 banner */}
          {/* <ImagePlaceholder
            label="State 565 — Hero Artwork"
            subtitle="Suggested: state emblem, alliance group, or a cinematic battle banner"
          /> */}
        </div>
      </section>

      {/* Achievements */}
      <section className="about-section">
        <div className="about-section-heading">
          <div className="about-section-kicker">{t('pages.about565.trackRecord')}</div>
          <h2>{t('pages.about565.trackRecordSubtitle')}</h2>
          <p>
            {t('pages.about565.trackRecordCopy')}
          </p>
        </div>

        <div className="about-achievement-grid">
          {achievements.map((item) => {
            const Icon = item.icon;

            return (
              <article className="about-card" key={item.number}>
                <div className="about-card-top">
                  <div className="about-icon">
                    <Icon size={21} />
                  </div>
                  <span className="about-card-number">
                    {item.number}
                  </span>
                </div>

                <h3>{t(`pages.about565.${item.titleKey}`)}</h3>
                <p>{t(`pages.about565.${item.descriptionKey}`)}</p>
              </article>
            );
          })}
        </div>

        {/* Optional image gallery for battle screenshots */}
        <div style={{ marginTop: 14 }}>
          {/* <ImagePlaceholder
            label="Our Battles"
            subtitle="Optional: add Volcano War screenshots, victory records, or a battle collage"
          /> */}
        </div>
      </section>

      {/* Our story */}
      <section className="about-section">
        <div className="about-section-heading">
          <div className="about-section-kicker">{t('pages.about565.storyKicker')}</div>
          <h2>{t('pages.about565.storyTitle')}</h2>
        </div>

        <div className="about-story">
          <div className="about-story-copy">
            <h3>{t('pages.about565.storyCopy')}</h3>

            <p>
              {t('pages.about565.storyParagraphOne')}
            </p>

            <p>
              {t('pages.about565.storyParagraphTwo')}
            </p>

            <p>
              {t('pages.about565.storyParagraphThree')}
            </p>
          </div>

          {/* <ImagePlaceholder
            label="Strategy in Action"
            subtitle="Suggested: Volcano War map, alliance formations, or a planning screenshot"
          /> */}
        </div>
      </section>

      {/* Community */}
      <section className="about-section">
        <div className="about-section-heading">
          <div className="about-section-kicker">{t('pages.about565.life')}</div>
          <h2>{t('pages.about565.lifeSubtitle')}</h2>
          <p>
            {t('pages.about565.lifeCopy')}
          </p>
        </div>

        <div className="about-principles">
          {principles.map((item) => {
            const Icon = item.icon;

            return (
              <article className="about-principle" key={item.titleKey}>
                <div className="about-icon">
                  <Icon size={20} />
                </div>
                <h3>{t(`pages.about565.${item.titleKey}`)}</h3>
                <p>{t(`pages.about565.${item.descriptionKey}`)}</p>
              </article>
            );
          })}
        </div>
      </section>

      {/* State rules */}
      <section className="about-section">
        <div className="about-section-heading">
          <div className="about-section-kicker">{t('pages.about565.rules')}</div>
          <h2>{t('pages.about565.rulesTitle')}</h2>
          <p>
            {t('pages.about565.rulesCopy')}
          </p>
        </div>

        <div className="about-rules">
          <div className="about-rule-header">
            <div className="about-icon">
              <ShieldCheck size={22} />
            </div>
            <div>
              <h3>{t('pages.about565.napTitle')}</h3>
              <p>{t('pages.about565.napSchedule')}</p>
            </div>
          </div>

          <div className="about-rule-content">
            <ul className="about-rule-list">
              <li>
                <ShieldCheck size={18} />
                <span>
                  <strong>{t('pages.about565.napDescription')}</strong> {t('pages.about565.napProtectDetail')}
                </span>
              </li>

              <li>
                <Users size={18} />
                <span>
                  <strong>{t('pages.about565.napParticipation')}</strong> {t('pages.about565.napParticipationDetail')}
                </span>
              </li>

              <li>
                <Clock size={18} />
                <span>
                  <strong>{t('pages.about565.napReturn')}</strong> {t('pages.about565.napReturnDetail')}
                </span>
              </li>

              <li>
                <Handshake size={18} />
                <span>
                  <strong>{t('pages.about565.napDetail')}</strong> {t('pages.about565.napDefenseDetail')}
                </span>
              </li>
            </ul>
          </div>

          <div className="about-rule-subsection">
            <h3>{t('pages.about565.alliances')}</h3>
            <p>
              {t('pages.about565.mergersCopy')}
            </p>
          </div>
        </div>
      </section>

      {/* Closing */}
      <section className="about-quote">
        <div className="about-quote-mark">
          <Target size={27} />
        </div>

        <h2>{t('pages.about565.culture')}</h2>

        <p>
          {t('pages.about565.closingCopy')}
        </p>

        <div
          style={{
            marginTop: 23,
            color: 'var(--about-accent)',
            fontSize: '0.75rem',
            fontWeight: 750,
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
          }}
        >
          {t('pages.about565.welcome')}
        </div>
      </section>

      {/* Footer */}
      <footer
        className="footer-note about-footer"
        style={{ fontSize: '0.78rem' }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            flexWrap: 'wrap',
          }}
        >
          <span>{t('pages.about565.portal')}</span>
          <span>·</span>
          <Link href="/" className="about-inline-link">
            {t('pages.about565.application')}
          </Link>
        </div>

        <span>{t('pages.about565.credit')}</span>
      </footer>
    </main>
  );
}

export default About565;
