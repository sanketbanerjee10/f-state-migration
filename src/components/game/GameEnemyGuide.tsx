import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronLeft } from 'lucide-react';
import type { ZombieType } from '@/game/core/GameState';
import {
  BOSS_TYPES,
  type BossType,
} from '@/game/bosses/BossSystem';
import {
  BOSS_DISCOVERY_TYPES,
  ENEMY_DISCOVERY_TYPES,
  getEnemyDiscoveryStorage,
  readDiscoveredBosses,
  readDiscoveredEnemies,
} from '@/game/discovery/EnemyDiscovery';
import {
  ARENA_THEME_CYCLE,
  createArenaLayoutForWave,
  createExplosiveBarrels,
} from '@/game/arena/ArenaSystem';
import {
  renderIndustrialObjectBodies,
  renderIndustrialObjectEffects,
  type IndustrialVisualObject,
} from '@/game/arenas/environments/industrial';
import { renderArena } from '@/game/rendering/ArenaRenderer';
import { drawZombie } from '@/game/rendering/ZombieRenderer';
import { GameOrbGuideSection } from './GameOrbGuide';
import { GameGuideDetailDialog } from './GameGuideDetailDialog';
import { GameFranchiseWordmark } from './GameFranchiseWordmark';

interface GameEnemyGuideProps {
  readonly onBack: () => void;
  readonly backLabel: string;
}

const ARENA_GUIDE_ENTRIES = ARENA_THEME_CYCLE.map((theme, index) => {
  const waveNumber = index * 10 + 1;
  const layout = createArenaLayoutForWave(waveNumber);

  return {
    theme,
    waveNumber,
    layout,
    description: `game.arenas.${theme.id}.description`,
  };
});

type ArenaGuideEntry = (typeof ARENA_GUIDE_ENTRIES)[number];

function GameArenaPreview({ entry }: { readonly entry: ArenaGuideEntry }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext('2d');
    if (!canvas || !context) return;

    renderArena(context, canvas.width, canvas.height, {
      obstacles: entry.layout.obstacles,
      barrels: createExplosiveBarrels(entry.waveNumber),
      theme: entry.theme.id,
    });
  }, [entry]);

  return (
    <canvas
      ref={canvasRef}
      className="game-arena-guide-canvas"
      width={480}
      height={240}
      aria-hidden="true"
    />
  );
}

interface GameEnemyPortraitProps {
  readonly type: ZombieType;
  readonly discovered: boolean;
  readonly bossType?: BossType;
}

type SelectedGuideEntry =
  | { readonly kind: 'enemy'; readonly type: ZombieType }
  | { readonly kind: 'boss'; readonly type: BossType }
  | { readonly kind: 'arena'; readonly entry: ArenaGuideEntry };

function getBossZombieType(bossType: BossType): ZombieType {
  return bossType === 'hordeCaller'
    ? 'screamer'
    : bossType === 'acidQueen'
      ? 'spitter'
      : 'brute';
}

type ArenaObjectPreviewKind =
  | 'crate'
  | 'barricade'
  | 'wall'
  | 'cover'
  | 'barrel'
  | IndustrialVisualObject['kind'];

interface ArenaObjectGuideEntry {
  readonly name: string;
  readonly description: string;
  readonly previewKind: ArenaObjectPreviewKind;
}

const ARENA_OBJECT_GUIDES: Readonly<Record<string, readonly ArenaObjectGuideEntry[]>> = {
  military: [
    { name: 'Crate', description: 'Stacked supply crates that create cover and break up sightlines.', previewKind: 'crate' },
    { name: 'Barricade', description: 'Low barricades used to funnel movement and block rushes.', previewKind: 'barricade' },
    { name: 'Wall', description: 'Solid concrete panels that hide lanes and create choke points.', previewKind: 'wall' },
    { name: 'Cover', description: 'Shielding segments that give players a brief safe pocket.', previewKind: 'cover' },
    { name: 'Barrel', description: 'Explosive drums that can wreck clusters if they are triggered.', previewKind: 'barrel' },
  ],
  industrial: [
    { name: 'Oil Barrel', description: 'Heavy steel drums that can rupture with a dangerous fire burst.', previewKind: 'oil-barrel' },
    { name: 'Gas Cylinder', description: 'Pressurised tanks that add a hazardous, high-velocity hazard pattern.', previewKind: 'gas-cylinder' },
    { name: 'Electric Generator', description: 'Reactive power units that charge up and arc dangerous energy fields.', previewKind: 'electric-generator' },
    { name: 'Moving Wall', description: 'Tracking industrial panels that shift and force pathing changes.', previewKind: 'moving-wall' },
    { name: 'Steam Pipe', description: 'Vent stacks that warn, pulse, and eject hot bursts of steam.', previewKind: 'steam-pipe' },
    { name: 'Industrial Crate', description: 'Reinforced storage containers with durable metal plating and loot drops.', previewKind: 'industrial-crate' },
  ],
  contaminated: [
    { name: 'Crate', description: 'Loose supply crates that create a cluttered fighting lane.', previewKind: 'crate' },
    { name: 'Barricade', description: 'Rusty barriers that split the arena and slow advances.', previewKind: 'barricade' },
    { name: 'Wall', description: 'Contaminated concrete walls that force more deliberate routes.', previewKind: 'wall' },
    { name: 'Cover', description: 'Patchwork cover sections for short-term protection.', previewKind: 'cover' },
    { name: 'Barrel', description: 'Toxic drums that threaten nearby enemies and players.', previewKind: 'barrel' },
  ],
  urban: [
    { name: 'Crate', description: 'Broken scavenged storage blocks and debris barriers.', previewKind: 'crate' },
    { name: 'Barricade', description: 'Street debris used to block lanes and corner enemies.', previewKind: 'barricade' },
    { name: 'Wall', description: 'Ruined masonry walls that create long sightlines and chokepoints.', previewKind: 'wall' },
    { name: 'Cover', description: 'Scattered cover pieces that offer little but crucial shelter.', previewKind: 'cover' },
    { name: 'Barrel', description: 'Old fuel containers that can detonate in close quarters.', previewKind: 'barrel' },
  ],
  bunker: [
    { name: 'Crate', description: 'Utility crates stacked for defensive cover in the bunker corridors.', previewKind: 'crate' },
    { name: 'Barricade', description: 'Tunnel barriers used to control movement and stall pursuit.', previewKind: 'barricade' },
    { name: 'Wall', description: 'Concrete bulkheads that reinforce the underground lanes.', previewKind: 'wall' },
    { name: 'Cover', description: 'Compact armor plates that break up sightlines and angles.', previewKind: 'cover' },
    { name: 'Barrel', description: 'Stored explosive drums that make tight spaces especially risky.', previewKind: 'barrel' },
  ],
} as const;

function getIndustrialGuideObject(kind: IndustrialVisualObject['kind']): IndustrialVisualObject {
  const base = { id: `guide-${kind}`, x: 80, y: 48, width: 52, height: 34 };
  switch (kind) {
    case 'oil-barrel':
      return { ...base, kind, height: 52, health: 100, maxHealth: 100, destroyed: false };
    case 'gas-cylinder':
      return { ...base, kind, width: 30, height: 58, phase: 'idle' };
    case 'electric-generator':
      return {
        ...base, kind, phase: 'discharging', chargeProgress: 1,
        dischargeProgress: 0.5, visualSeed: 11, dangerRadius: 40,
      };
    case 'moving-wall':
      return { ...base, kind, width: 76, height: 28, movementIntensity: 0.68, travelAngle: 0.12 };
    case 'steam-pipe':
      return {
        ...base, kind, width: 74, height: 34, phase: 'venting',
        directionX: 1, directionY: 0, phaseProgress: 0.5, intensity: 0.85,
      };
    case 'industrial-crate':
      return { ...base, kind, width: 58, height: 46, health: 100, maxHealth: 100, destroyed: false };
  }
}

function ArenaObjectGuidePreview({
  entry,
  themeId,
}: {
  readonly entry: ArenaObjectGuideEntry;
  readonly themeId: ArenaGuideEntry['theme']['id'];
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext('2d');
    if (!canvas || !context) return;
    context.clearRect(0, 0, canvas.width, canvas.height);

    if (entry.previewKind === 'oil-barrel'
      || entry.previewKind === 'gas-cylinder'
      || entry.previewKind === 'electric-generator'
      || entry.previewKind === 'moving-wall'
      || entry.previewKind === 'steam-pipe'
      || entry.previewKind === 'industrial-crate') {
      const object = getIndustrialGuideObject(entry.previewKind);
      renderIndustrialObjectBodies(context, [object], { timeSeconds: 0 });
      renderIndustrialObjectEffects(context, [object], { timeSeconds: 0 });
      return;
    }

    const isBarrel = entry.previewKind === 'barrel';
    renderArena(context, canvas.width, canvas.height, {
      obstacles: isBarrel ? [] : [{
        xFraction: 0.5,
        yFraction: 0.5,
        width: entry.previewKind === 'barricade' ? 100 : 60,
        height: entry.previewKind === 'barricade' ? 18 : 46,
        kind: entry.previewKind,
      }],
      barrels: isBarrel ? [{
        id: 'guide-barrel',
        xFraction: 0.5,
        yFraction: 0.5,
        radius: 22,
        health: 80,
        maxHealth: 80,
      }] : [],
      theme: themeId,
    });
  }, [entry, themeId]);

  return (
    <canvas
      ref={canvasRef}
      className="game-arena-renderable-canvas"
      width={160}
      height={96}
      aria-hidden="true"
    />
  );
}

function getArenaObjectCatalog(themeId: ArenaGuideEntry['theme']['id']) {
  return ARENA_OBJECT_GUIDES[themeId] ?? ARENA_OBJECT_GUIDES.military;
}

function GameEnemyPortrait({
  type,
  discovered,
  bossType,
}: GameEnemyPortraitProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext('2d');
    if (!canvas || !context) return;

    context.clearRect(0, 0, canvas.width, canvas.height);
    context.save();
    context.translate(canvas.width / 2, canvas.height / 2 - 4);

    const portraitScale = bossType ? 1 : 2;
    context.scale(portraitScale, portraitScale);

    drawZombie(
      context,
      {
        x: 0,
        y: 0,
        type,
        facingAngle: 0,
        movementFactor: 0,
        ...(bossType && {
          radius: 32,
          isBoss: true,
          bossType,
          bossShielded: bossType === 'hordeCaller',
        }),
      },
      0,
    );

    context.restore();
  }, [type, bossType]);

  return (
    <div
      className={`game-enemy-guide-portrait${discovered ? '' : ' is-locked'}`}
      aria-hidden="true"
    >
      <span className="game-enemy-guide-portrait-glow" />
      <canvas
        ref={canvasRef}
        className="game-enemy-guide-character"
        width={240}
        height={150}
      />
      {!discovered && (
        <span className="game-enemy-guide-question">?</span>
      )}
      <span className="game-enemy-guide-scanline" />
    </div>
  );
}

function GuideSectionHeading({
  index,
  eyebrow,
  title,
  description,
  count,
}: {
  readonly index: string;
  readonly eyebrow: string;
  readonly title: string;
  readonly description: string;
  readonly count?: {
    readonly numerator: number;
    readonly denominator: number;
  };
}) {
  const { t } = useTranslation();
  return (
    <div className="game-guide-section-heading">
      <span className="game-guide-eyebrow">{eyebrow}</span>
      <div className="game-guide-section-heading-row">
        <div className="game-guide-section-index" aria-hidden="true">
          {index}
        </div>
        <h2>{title}</h2>
        {count && (
          <span
            className="game-guide-section-count"
            aria-label={`${count.numerator} of ${count.denominator} identified`}
          >
            <span className="game-guide-section-count-numerator">{count.numerator}</span>
            <span aria-hidden="true">/</span>
            <span className="game-guide-section-count-denominator">{count.denominator}</span>
          </span>
        )}
      </div>
      <p className="game-guide-section-description">{description}</p>
    </div>
  );
}

export function GameEnemyGuide({ onBack, backLabel }: GameEnemyGuideProps) {
  const { t } = useTranslation();
  const backButtonRef = useRef<HTMLButtonElement>(null);
  const [discoveredEnemies] = useState<Set<ZombieType>>(
    () => readDiscoveredEnemies(getEnemyDiscoveryStorage()),
  );
  const [discoveredBosses] = useState<Set<BossType>>(
    () => readDiscoveredBosses(getEnemyDiscoveryStorage()),
  );
  const [selectedGuideEntry, setSelectedGuideEntry] =
    useState<SelectedGuideEntry | null>(null);

  const discoveredCount = ENEMY_DISCOVERY_TYPES.filter((type) =>
    discoveredEnemies.has(type),
  ).length;
  const discoveredBossCount = BOSS_DISCOVERY_TYPES.filter((type) =>
    discoveredBosses.has(type),
  ).length;

  const totalDiscoveries = discoveredCount + discoveredBossCount;
  const totalEntries =
    ENEMY_DISCOVERY_TYPES.length + BOSS_DISCOVERY_TYPES.length;
  const discoveryPercent = totalEntries
    ? Math.round((totalDiscoveries / totalEntries) * 100)
    : 0;
  const selectedEnemyType = selectedGuideEntry?.kind === 'enemy'
    ? selectedGuideEntry.type
    : null;
  const selectedBossType = selectedGuideEntry?.kind === 'boss'
    ? selectedGuideEntry.type
    : null;
  const selectedArenaEntry = selectedGuideEntry?.kind === 'arena'
    ? selectedGuideEntry.entry
    : null;
  const selectedDiscovered = selectedEnemyType
    ? discoveredEnemies.has(selectedEnemyType)
    : selectedBossType
      ? discoveredBosses.has(selectedBossType)
      : false;
  const selectedTitle = selectedEnemyType
    ? selectedDiscovered
      ? t(`game.enemies.${selectedEnemyType}.name`)
      : t('game.guides.unknownEnemy')
    : selectedBossType
      ? selectedDiscovered
        ? t(`game.bosses.${selectedBossType}`)
        : t('game.guides.unknownBoss')
      : selectedArenaEntry
        ? t('game.guides.arenaRenderables', {
            name: t(`game.arenas.${selectedArenaEntry.theme.id}.name`),
          })
        : '';
  const selectedPreview = selectedEnemyType ? (
    <GameEnemyPortrait
      type={selectedEnemyType}
      discovered={selectedDiscovered}
    />
  ) : selectedBossType ? (
    <GameEnemyPortrait
      type={getBossZombieType(selectedBossType)}
      discovered={selectedDiscovered}
      bossType={selectedBossType}
    />
  ) : selectedArenaEntry ? (
    <GameArenaPreview entry={selectedArenaEntry} />
  ) : null;

  useEffect(() => {
    backButtonRef.current?.focus({ preventScroll: true });
  }, []);

  return (
    <div className="game-enemy-guide">
      <header className="game-guide-hero">
        <div className="game-guide-hero-main">
          <div className="game-guide-hero-copy">
            <div className="settings-brand game-guide-heading-brand">
              <button
                className="game-level-back-button"
                type="button"
                onClick={onBack}
                aria-label={backLabel}
                ref={backButtonRef}
              >
                <ChevronLeft size={22} aria-hidden="true" />
              </button>
              <div>
                <p className="game-dialog-wordmark">
                  <GameFranchiseWordmark />
                </p>
                <h1 id="game-enemy-guide-title">{t('game.menu.fieldGuides')}<span>.</span></h1>
              </div>
            </div>
            <p className="game-guide-hero-description">
              {t('game.guides.heroDescription')}
            </p>
          </div>

          <div
            className="game-guide-progress"
            role="group"
            aria-label={t('game.guides.progress', {
              discovered: totalDiscoveries,
              total: totalEntries,
            })}
          >
            <div className="game-guide-progress-top">
              <span>{t('game.guides.threatIntel')}</span>
              <strong>{discoveryPercent}%</strong>
            </div>
            <div
              className="game-guide-progress-track"
              role="progressbar"
              aria-label={t('game.guides.threatCompletion')}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={discoveryPercent}
            >
              <span style={{ width: `${discoveryPercent}%` }} />
            </div>
            <p>{t('game.guides.identifiedCount', {
              count: totalDiscoveries,
              total: totalEntries,
            })}</p>
          </div>
        </div>
      </header>

      <div className="game-guide-content">
        <GameOrbGuideSection />

        <section
          className="game-guide-section"
          aria-labelledby="game-guide-enemies-title"
        >
          <GuideSectionHeading
            index="02"
            eyebrow={t('game.guides.enemyCatalogue')}
            title={t('game.guides.enemies')}
            description={t('game.guides.enemyDescription')}
            count={{
              numerator: discoveredCount,
              denominator: ENEMY_DISCOVERY_TYPES.length,
            }}
          />
          <div className="game-enemy-guide-grid">
            {ENEMY_DISCOVERY_TYPES.map((type) => {
              const discovered = discoveredEnemies.has(type);
              const name = t(`game.enemies.${type}.name`);

              return (
                <button
                  className={`game-enemy-guide-card${discovered ? '' : ' is-locked'}`}
                  type="button"
                  key={type}
                  aria-haspopup="dialog"
                  aria-label={t(discovered
                    ? 'game.guides.viewDetails'
                    : 'game.guides.viewUnknownEnemy', { name })}
                  onClick={() => setSelectedGuideEntry({ kind: 'enemy', type })}
                >
                  <GameEnemyPortrait type={type} discovered={discovered} />
                  <div className="game-enemy-guide-card-copy">
                    <div className="game-guide-card-meta">
                      <span>{t(discovered
                        ? 'game.guides.threatIdentified'
                        : 'game.guides.unknownContact')}</span>
                      <span className="game-guide-card-status">
                        {discovered ? '●' : '◌'}
                      </span>
                    </div>
                    <h3>{discovered ? name : t('game.guides.unknown')}</h3>
                    {discovered ? (
                      <p>{t(`game.enemies.${type}.summary`)}</p>
                    ) : (
                      <p className="game-guide-locked-copy">
                        {t('game.guides.classified')}
                      </p>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        <section
          className="game-guide-section game-guide-boss-section"
          aria-labelledby="game-guide-bosses-title"
        >
          <GuideSectionHeading
            index="03"
            eyebrow={t('game.guides.bossDossier')}
            title={t('game.guides.bosses')}
            description={t('game.guides.bossDescription')}
            count={{
              numerator: discoveredBossCount,
              denominator: BOSS_DISCOVERY_TYPES.length,
            }}
          />
          <div className="game-enemy-guide-grid game-enemy-guide-boss-grid">
            {BOSS_TYPES.map((bossType) => {
              const discovered = discoveredBosses.has(bossType);
              const name = t(`game.bosses.${bossType}`);
              const type = getBossZombieType(bossType);

              return (
                <button
                  className={`game-enemy-guide-card game-enemy-guide-boss-card${discovered ? '' : ' is-locked'}`}
                  type="button"
                  key={bossType}
                  aria-haspopup="dialog"
                  aria-label={t(discovered
                    ? 'game.guides.viewDetails'
                    : 'game.guides.viewUnknownBoss', { name })}
                  onClick={() => setSelectedGuideEntry({ kind: 'boss', type: bossType })}
                >
                  <GameEnemyPortrait
                    type={type}
                    discovered={discovered}
                    bossType={bossType}
                  />
                  <div className="game-enemy-guide-card-copy">
                    <div className="game-guide-card-meta">
                      <span>{t(discovered
                        ? 'game.guides.bossDossierTag'
                        : 'game.guides.classifiedDossier')}</span>
                      <span className="game-guide-card-status">
                        {discovered ? '●' : '◌'}
                      </span>
                    </div>
                    <h3>{discovered ? name : t('game.guides.unknown')}</h3>
                    {discovered ? (
                      <p>{t(`game.bosses.${bossType}Summary`)}</p>
                    ) : (
                      <p className="game-guide-locked-copy">
                        {t('game.guides.classified')}
                      </p>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        <section
          className="game-arena-guide game-guide-section"
          aria-labelledby="game-arena-guide-title"
        >
          <GuideSectionHeading
            index="04"
            eyebrow={t('game.guides.arenaEnvironments')}
            title={t('game.guides.arenas')}
            description={t('game.guides.arenaDescription')}
          />
          <div className="game-arena-guide-grid">
            {ARENA_GUIDE_ENTRIES.map((entry, index) => (
              <button
                className="game-arena-guide-card"
                type="button"
                key={entry.theme.id}
                aria-label={t('game.guides.viewArenaObjects', {
                  name: t(`game.arenas.${entry.theme.id}.name`),
                })}
                onClick={() => setSelectedGuideEntry({ kind: 'arena', entry })}
              >
                <div className="game-arena-guide-preview">
                  <GameArenaPreview entry={entry} />
                  <span className="game-arena-guide-layout-label">
                    {t('game.guides.layout', {
                      name: t(`game.arenaLayouts.${entry.layout.id}`),
                    })}
                  </span>
                  <span className="game-arena-guide-number">
                    {t('game.guides.zone', { number: `0${index + 1}` })}
                  </span>
                </div>
                <div className="game-arena-guide-copy">
                  <p className="game-arena-guide-wave">
                    {t('game.guides.waves', {
                      start: entry.waveNumber,
                      end: entry.waveNumber + 9,
                    })}
                  </p>
                  <h3>{t(`game.arenas.${entry.theme.id}.name`)}</h3>
                  <p>{t(entry.description)}</p>
                </div>
              </button>
            ))}
          </div>
        </section>

        {selectedGuideEntry && selectedPreview && (
          <GameGuideDetailDialog
            title={selectedTitle}
            preview={selectedPreview}
            onClose={() => setSelectedGuideEntry(null)}
          >
            {selectedArenaEntry ? (
              <>
                <p>
                  {t('game.guides.arenaObjects')}
                </p>
                <ul className="game-arena-renderables-list">
                  {getArenaObjectCatalog(selectedArenaEntry.theme.id).map((item) => (
                    <li key={item.previewKind} className="game-arena-renderable-item">
                      <div className="game-arena-renderable-asset">
                        <ArenaObjectGuidePreview
                          entry={item}
                          themeId={selectedArenaEntry.theme.id}
                        />
                      </div>
                      <div className="game-arena-renderable-copy">
                        <strong>{t(`game.arenaObjects.${item.previewKind}.name`)}</strong>
                        <span>{t(`game.arenaObjects.${item.previewKind}.description`)}</span>
                      </div>
                    </li>
                  ))}
                </ul>
              </>
            ) : selectedDiscovered && (selectedEnemyType || selectedBossType) ? (
              <>
                <p>{t(selectedEnemyType
                  ? `game.enemies.${selectedEnemyType}.description`
                  : `game.bosses.${selectedBossType}Description`)}</p>
                <p className="game-enemy-guide-ability">
                  <strong>{t(selectedBossType
                    ? 'game.guides.combatIntel'
                    : 'game.guides.fieldNote')}</strong>
                  {t(selectedEnemyType
                    ? `game.enemies.${selectedEnemyType}.ability`
                    : `game.bosses.${selectedBossType}Ability`)}
                </p>
              </>
            ) : (
              <p>{t('game.guides.classifiedIntel')}</p>
            )}
            {selectedEnemyType && (
              <aside className="game-enemy-guide-note">
                <div>
                  <strong>{t('game.guides.eliteTipTitle')}</strong>
                  <p>
                    {t('game.guides.eliteTip')}
                  </p>
                </div>
              </aside>
            )}
          </GameGuideDetailDialog>
        )}
      </div>
    </div>
  );
}
