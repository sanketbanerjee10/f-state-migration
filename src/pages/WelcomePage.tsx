import {
  ArrowRight,
  ArrowUpRight,
  FileText,
  Gamepad2,
  UsersRound,
} from 'lucide-react';
import { Link } from 'wouter';
import { LanguageSelector } from '../components/LanguageSelector';

const destinations = [
  {
    number: '01',
    eyebrow: 'THE COMMUNITY',
    title: 'Get to know us',
    description:
      'Meet the people, values, and story behind State 565.',
    href: '/about',
    action: 'Explore State 565',
    icon: UsersRound,
    className: 'welcome-card-community',
  },
  {
    number: '02',
    eyebrow: 'YOUR NEXT CHAPTER',
    title: 'Apply for migration',
    description:
      'Tell us about your account and take the first step toward joining us.',
    href: '/apply',
    action: 'Start your application',
    icon: FileText,
    className: 'welcome-card-migration',
  },
  {
    number: '03',
    eyebrow: 'TAKE A BREATHER',
    title: 'Play a mini game',
    description:
      'Take on the 565 survival challenge and see how long you can last.',
    href: '/game',
    action: 'Enter the game',
    icon: Gamepad2,
    className: 'welcome-card-game',
  },
];

export function WelcomePage() {
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
            A NEW CHAPTER STARTS HERE
          </div>
          <h1>
            Welcome to
            <br />
            <span>State 565.</span>
          </h1>
          <p>
            Curious about our community, ready to make your move, or just here
            for a little fun? You're in the right place.
          </p>
          <Link href="/apply" className="welcome-primary-action">
            Find your way in <ArrowRight size={17} />
          </Link>
        </div>

        <div className="welcome-hero-caption">
          <span className="welcome-caption-line" />
          <span>YOUR PEOPLE. YOUR NEXT CHAPTER.</span>
        </div>
      </section>

      <section className="welcome-destinations" aria-labelledby="welcome-paths-title">
        <div className="welcome-section-heading">
          <div>
            <div className="welcome-section-kicker">MAKE YOURSELF AT HOME</div>
            <h2 id="welcome-paths-title">Where would you like to start?</h2>
          </div>
        </div>

        <div className="welcome-card-grid">
          {destinations.map((destination) => {
            const Icon = destination.icon;

            return (
              <Link
                key={destination.number}
                href={destination.href}
                className={`welcome-card ${destination.className}`}
                aria-label={`${destination.title}: ${destination.description}`}
              >
                <div className="welcome-card-top">
                  <span className="welcome-card-icon"><Icon size={21} /></span>
                  <span className="welcome-card-number">{destination.number}</span>
                </div>
                <div className="welcome-card-eyebrow">{destination.eyebrow}</div>
                <h3>{destination.title}</h3>
                <p>{destination.description}</p>
                <span className="welcome-card-action">
                  {destination.action}
                  <ArrowUpRight size={16} />
                </span>
              </Link>
            );
          })}
        </div>
      </section>

      <footer className="welcome-footer">
        <span>STATE 565 <span className="welcome-footer-divider">/</span> MIGRATION PORTAL</span>
        <span>GOOD PEOPLE. GOOD TIMES. A PLACE TO CALL HOME.</span>
      </footer>
    </main>
  );
}
