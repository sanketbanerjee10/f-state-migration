import { Link } from 'wouter';
import {
  ArrowRight,
  Compass,
  Gamepad2,
  Info,
  MapPin,
  Radio,
  Sparkles,
} from 'lucide-react';

export default function NotFound() {
  return (
    <main
      className="not-found-page"
      data-testid="not-found-page"
    >
      <div className="not-found-inner">
        <header className="not-found-header">
          <Link href="/" className="not-found-brand">
            <span className="not-found-brand-mark"><Compass size={16} /></span>
            <span>STATE 565</span>
          </Link>
          <span className="not-found-status">
            <Radio size={14} />
            Route unavailable
          </span>
        </header>

        <section className="not-found-hero">
          <div className="not-found-copy">
            <div className="not-found-kicker">
              <Sparkles size={13} />
              A little off course?
            </div>
            <p className="not-found-code">
              404
            </p>
            <h1 className="not-found-title">
              This page doesn’t exist.
              <span>Looks like you took a wrong turn.</span>
            </h1>
            <p className="not-found-description">
              No worries, even the best explorers lose the trail sometimes.
              Choose a destination and we’ll get you back on track.
            </p>
          </div>

          <div className="not-found-map" aria-hidden="true">
            <div className="not-found-map-ring not-found-map-ring-outer" />
            <div className="not-found-map-ring not-found-map-ring-inner" />
            <div className="not-found-map-crosshair" />
            <span className="not-found-map-dot not-found-map-dot-one" />
            <span className="not-found-map-dot not-found-map-dot-two" />
            <div className="not-found-map-pin">
              <MapPin size={38} strokeWidth={1.5} />
            </div>
            <span className="not-found-map-caption">You are here… somewhere</span>
          </div>
        </section>

        <nav className="not-found-destinations" aria-label="Helpful destinations">
          <Link href="/" className="not-found-destination">
            <span className="not-found-destination-icon"><MapPin size={18} /></span>
            <span className="not-found-destination-copy">
              <strong>Migration</strong>
              <span>Find your way to State 565</span>
            </span>
            <ArrowRight className="not-found-destination-arrow" size={16} />
          </Link>
          <Link href="/about" className="not-found-destination">
            <span className="not-found-destination-icon"><Info size={18} /></span>
            <span className="not-found-destination-copy">
              <strong>About us</strong>
              <span>Meet the people of 565</span>
            </span>
            <ArrowRight className="not-found-destination-arrow" size={16} />
          </Link>
          <Link href="/game" className="not-found-destination">
            <span className="not-found-destination-icon"><Gamepad2 size={18} /></span>
            <span className="not-found-destination-copy">
              <strong>Play the game</strong>
              <span>Take a break from the search</span>
            </span>
            <ArrowRight className="not-found-destination-arrow" size={16} />
          </Link>
        </nav>
      </div>
    </main>
  );
}

export { NotFound };
