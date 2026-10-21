
import { Link } from 'wouter';
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
    title: 'Undefeated in SVS',
    description:
      'The only state among 561–576 to remain undefeated in State vs. State, according to our record.',
    icon: ShieldCheck,
  },
  {
    number: '02',
    title: 'Two victories over 563',
    description:
      'We faced State 563 twice and came away victorious on both occasions.',
    icon: Swords,
  },
  {
    number: '03',
    title: 'Volcano War · Hard Mode',
    description:
      'Our first Volcano War victory came in Hard Mode, facing three states at once.',
    icon: Trophy,
  },
  {
    number: '04',
    title: 'Volcano War · 2v2',
    description:
      'In our second Volcano War, we fought alongside State 567 against State 571 and dominated the battle together.',
    icon: Flag,
  },
];

const principles = [
  {
    icon: TrendingUp,
    title: 'Always improving',
    description:
      'We were once strong enough to win through raw power alone. As others caught up, we learned to plan, coordinate, and fight smarter.',
  },
  {
    icon: Clock,
    title: 'Real life comes first',
    description:
      'We are not online around the clock. We have work, families, responsibilities, and lives outside the game. When events begin, we show up.',
  },
  {
    icon: MessageCircle,
    title: 'Banter with respect',
    description:
      'We joke, tease, and compete. But there is a difference between having fun and making someone feel unwelcome. We believe that difference matters.',
  },
  {
    icon: Heart,
    title: 'People over rankings',
    description:
      'We want to win, but never at the cost of the community. No event or ranking is worth making people miserable in a game meant to be enjoyed.',
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
  return (
    <main className="form-shell about565" data-testid="about-565-page">
      {/* Top navigation */}
      <div className="about-topbar">
        <div className="about-eyebrow">
          STATE 565 <span style={{ color: '#657486' }}>/ ABOUT US</span>
        </div>

        <Link
          href="/"
          className="button button-secondary about-back-link"
        >
          <ArrowLeft size={13} />
          Back to Application
        </Link>
      </div>

      {/* Hero */}
      <section className="about-hero">
        <div className="about-hero-grid">
          <div>
            <div className="about-eyebrow">OUR STATE · OUR STORY</div>
            <h1>
              Strong in battle.
              <br />
              <span>Human at heart.</span>
            </h1>

            <p className="about-hero-copy">
              We've built our name through victories, adapted when the
              challenge changed, and kept moving forward. We're proud of
              our strength, honest about our imperfections, and here to
              enjoy the game together.
            </p>

            <div className="about-hero-note">
              <ShieldCheck size={18} />
              <span>Competitive by nature. Respectful by choice.</span>
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
          <div className="about-section-kicker">Our track record</div>
          <h2>We've earned our place.</h2>
          <p>
            Our history gives us something to be proud of. It also reminds
            us that staying strong means continuing to adapt.
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

                <h3>{item.title}</h3>
                <p>{item.description}</p>
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
          <div className="about-section-kicker">The story behind the wins</div>
          <h2>Strong enough to adapt.</h2>
        </div>

        <div className="about-story">
          <div className="about-story-copy">
            <h3>Power got us here. Strategy keeps us growing.</h3>

            <p>
              For a long time, we were strong enough to bulldoze our way
              through events. Planning wasn't always necessary when our
              power spoke for itself.
            </p>

            <p>
              Then other states started catching up. We had to think
              differently, coordinate better, and learn to use our
              strengths more carefully. So we did — and the wins kept
              coming.
            </p>

            <p>
              We're not perfectly organized, and we don't always get
              things right. We simply believe that yesterday's success
              should never stop us from improving today.
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
          <div className="about-section-kicker">Life in 565</div>
          <h2>Quiet in the calm. Active when it counts.</h2>
          <p>
            We don't need to be online all day to care about our state.
            Real life comes first, but when an event starts, our people
            show up.
          </p>
        </div>

        <div className="about-principles">
          {principles.map((item) => {
            const Icon = item.icon;

            return (
              <article className="about-principle" key={item.title}>
                <div className="about-icon">
                  <Icon size={20} />
                </div>
                <h3>{item.title}</h3>
                <p>{item.description}</p>
              </article>
            );
          })}
        </div>
      </section>

      {/* State rules */}
      <section className="about-section">
        <div className="about-section-heading">
          <div className="about-section-kicker">How we operate</div>
          <h2>Our state rules.</h2>
          <p>
            A strong state needs shared expectations. These rules help
            us protect active players, respect alliances, and work
            together.
          </p>
        </div>

        <div className="about-rules">
          <div className="about-rule-header">
            <div className="about-icon">
              <ShieldCheck size={22} />
            </div>
            <div>
              <h3>State-wide NAP</h3>
              <p>
                Saturday, Sunday and Monday · No looting within State 565,
                subject to the specific border-base rule below.
              </p>
            </div>
          </div>

          <div className="about-rule-content">
            <ul className="about-rule-list">
              <li>
                <ShieldCheck size={18} />
                <span>
                  <strong>Protect our state.</strong> No bases in State
                  565 may be looted during the state-wide NAP. This
                  applies to everyone, including the top alliances and
                  their farms.
                </span>
              </li>

              <li>
                <Users size={18} />
                <span>
                  <strong>Participation matters more than power.</strong>
                  NAP protection extends to alliances with high
                  participation. We do not segregate alliances based
                  on power alone.
                </span>
              </li>

              <li>
                <Clock size={18} />
                <span>
                  <strong>Return to your hive.</strong> On Saturday,
                  members whose bases are outside their alliance hive
                  receive 48 hours to return. Bases still outside the
                  hive after that period become eligible for looting
                  under this rule, as they may have been inactive for
                  days.
                </span>
              </li>

              <li>
                <Handshake size={18} />
                <span>
                  <strong>Bases can still be defended.</strong> Alliance
                  members may reinforce and defend a base that becomes
                  eligible for looting. In practice, this process is
                  rarely used against active players. It mainly helps
                  recover resources from players who have quit the game,
                  which can later be shared with the state.
                </span>
              </li>
            </ul>
          </div>

          <div className="about-rule-subsection">
            <h3>Alliances and mergers</h3>
            <p>
              We don't force alliances to merge. If an alliance struggles
              because of low activity, we may recommend a merger for the
              benefit of its members and the state. But every alliance
              has its own leadership, friendships, and reasons for its
              decisions. We offer advice, understand that circumstances
              differ, and respect each alliance's choices.
            </p>
          </div>
        </div>
      </section>

      {/* Closing */}
      <section className="about-quote">
        <div className="about-quote-mark">
          <Target size={27} />
        </div>

        <h2>We fight to win. We never forget that it's a game.</h2>

        <p>
          We're proud of our record, honest about what needs work, and
          ready for the next challenge. Seasons end, rankings change,
          and victories become memories. The people and experiences
          we share are what make it worthwhile.
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
          Welcome to State 565
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
          <span>STATE 565 · MIGRATION PORTAL</span>
          <span>·</span>
          <Link href="/" className="about-inline-link">
            Application
          </Link>
        </div>

        <span>Made With ❤️ By Sankeyyy</span>
      </footer>
    </main>
  );
}

export default About565;
