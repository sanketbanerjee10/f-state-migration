# 565 Zombie Survival — Implementation Checklist

This is the ongoing tracker for implementing the game in the existing State 565 Migration Portal frontend. It follows the revised procedural-visual frontend guide: first-release entities and effects are drawn with Canvas shapes; no image/sprite asset pipeline is planned. Update statuses only after the behavior is verified; retain completed tasks.

## Status legend

- `[ ]` Not started
- `[~]` In progress
- `[x]` Completed and verified
- `[!]` Blocked or requires clarification

## Phase 1 — Project inspection and isolated setup

- [x] **Inspect the existing frontend** — Review React/TypeScript/Vite, Wouter routes, shared UI, styling, responsive patterns, and API client. Notes: The existing `/` and `/apply/*` application wizard, tracker, and leadership routes must remain unchanged.
- [x] **Inspect game references and existing backend surface** — Review gameplay, frontend and backend guides, game-score router/store, and database migration. Notes: Score submission and leaderboard server routes plus the `game_scores` migration already exist; the game frontend and game-specific generated client operations do not.
- [x] **Create the isolated game module and route** — Add a game-only feature entry point and `/game` route without altering migration flows. The route is a full-screen Canvas surface with no portal header or cards; future React overlays should reuse portal conventions. Verified with frontend typecheck and production build.

## Phase 2 — Canvas and rendering foundation

- [x] **Build the canvas shell** — Added a viewport-filling Canvas with a 960 × 540 baseline logical arena, uniform aspect-ratio-preserving scale, adaptive logical bounds to fill wide or tall screens without letterboxing, and a 2× capped high-DPI backing buffer; the game route has no portal header or cards.
- [x] **Implement the engine lifecycle and frame loop** — Added separate update/render steps and an idempotent `requestAnimationFrame` loop with clamped delta time and start, pause, resume, reset, and destroy operations.
- [x] **Handle viewport and visibility changes** — Canvas resizes with `ResizeObserver` and window resize; rendering suspends while the tab is hidden and cleans up observers, listeners, and animation frames.
- [x] **Add development diagnostics** — Development-only FPS and entity-count diagnostics update at most once per second; React does not receive per-frame updates.
- [x] **Render the procedural arena and obstacles** — Draw the bounded floor, subtle grid, and four static procedural obstacles (two crates and two barricades) with contrasting outlines, simple details, and shadows. Obstacle centers use normalized arena positions; collision behavior remains part of Phase 5.
- [x] **Verify Canvas behavior in browser** — Confirmed the `/game` route has no header/cards and the Canvas fills desktop and mobile viewports without page overflow; Canvas 2D initializes, responsive sizing preserves uniform scale while filling the viewport, a 3× requested pixel ratio is capped at 2×, diagnostics report 60 FPS, and start/pause/resume/reset/destroy plus clamped frame timing and visibility suspension behave as expected.
- [x] **Run automated engine, arena, and shape tests** — Added Vitest 5.0.5 and a `pnpm test` script to the frontend package after confirming the runner was absent. The full suite now passes: 14 test files / 72 tests, covering engine lifecycle, keyboard and mouse aim input, clamped delta time, DPI scaling, visibility handling, obstacle rendering, proportional obstacle placement, shape geometry, symbol drawing, procedural entity rendering, ordered scene layers, actor sorting, and Canvas state restoration.
- [x] **Verify Phase 2 in browser and production build** — Confirmed the fullscreen `/game` route renders the bounded arena and all four procedural obstacles at desktop/mobile viewport sizes; no header, cards, or document overflow. Canvas initializes, uses a 2× capped high-DPI buffer, and reports 60 FPS. Frontend typecheck and production build pass.

## Phase 3 — Procedural visual foundation

- [x] **Adopt procedural first-release visuals** — Follow the revised guide: draw characters, enemies, weapons/projectiles, pickups, arena details, and effects with Canvas 2D instead of generating or integrating image assets. No sprite sheets, atlas, image asset manager, or image-based animation pipeline is required for the first release.
- [x] **Centralize visual palette and configuration** — Added game-scoped arena, obstacle, player, enemy, combat, and orb colours in `GamePalette.ts`, plus arena/entity/effect dimensions in `VisualConfig.ts`; global portal tokens remain unchanged.
- [x] **Create reusable Canvas shape helpers** — Added state-safe helpers for circles, polygons, rounded rectangles, rectangles, lines, rings, starbursts, and game symbols. Each helper restores Canvas state, including when a drawing call throws.
- [x] **Separate arena rendering from the engine loop** — `GameEngine` delegates scene drawing to the procedural `ArenaRenderer`; palette, visual configuration, and shape drawing are separate modules. Entity-specific renderers are tracked and verified below.
- [x] **Verify the rendering foundation** — Confirmed the refactored arena renders in the browser with the same appearance; the current full suite (72 tests), frontend typecheck, and production build pass.
- [x] **Establish the typed render-scene boundary** — Added render-frame, command, actor, and layer types with isolated Canvas state. The initial renderer established arena → pickups → projectiles → Y-sorted actors → foreground effects → debug order; that first pass was verified with 53 tests.
- [x] **Extend draw order for entity shadows and feedback** — `Renderer.ts` now draws arena, ground shadows, pickups, projectiles, Y-sorted actors, foreground effects, feedback, then debug overlays. Verified ordering, sorting, immutability, and state restoration; current full suite (72 tests), typecheck, production build, and desktop/mobile browser checks pass.
- [x] **Implement per-entity procedural renderers** — Added reusable render-only drawing functions for player, Walker/Runner, projectiles, five orbs, shadows, muzzle/impact/collection feedback, and damage numbers. A deterministic preview uses these functions until gameplay state is connected in Phase 5.
- [x] **Draw a readable player and aim indicator** — Added a high-contrast circle, separately rotated barrel, highlight, hit flash, and shield rings. The renderer consumes an explicit aim angle and never targets enemies; connecting desktop/mobile player input remains Phase 4.
- [x] **Draw the initial Walker and one additional zombie type** — Added a round Walker with face/limb marks and a pointed Runner silhouette, each with a distinct size/colour; health bars appear only for damaged enemies.
- [x] **Draw projectiles and basic combat feedback** — Added direction-oriented bullet trails, heavy/critical variants, conical muzzle flash, deterministic impact ring/particles, hit flash, and brief floating damage numbers.
- [x] **Draw five identifiable orb types** — Added circular health, damage, rapid-fire, shield, and bomb orbs with distinct symbols, restrained glow, time-based pulse, shrinking lifetime ring, and collection burst. Actual lifetime/effect timing remains owned by gameplay state.
- [x] **Keep rendering deterministic and presentation-only** — Render inputs are readonly and drawing does not mutate entity state; positions use world coordinates, animation uses elapsed time, and the 120-actor stress test confirms render input is unchanged.
- [x] **Verify visual clarity at gameplay scale** — Cross-checked the preview at desktop (1440 × 900) and mobile (390 × 844): Canvas fills the viewport, renders multiple visual colours, reports 58 FPS, and shows no page overflow or render alert. A 48-enemy mobile crowd kept the player distinct; automated tests stress-render 120 actors. All 14 test files / 72 tests, frontend typecheck, and production build pass.

Phase 3 is complete as a **procedural visual foundation and preview**, not as a playable game. Phase 4 still supplies player-directed controls; Phase 5 connects real simulation state and adds gameplay-triggered death particles, bomb/explosion, shield activation, and other feedback. Retune density and effect clarity against actual gameplay during those phases.

## Phase 4 — Input and controls

- [x] **Stage 1 — Centralized keyboard input and desktop movement** — Added focus-scoped WASD/arrow input, normalized diagonal movement, time-based preview-player movement, arena-edge clamping, a visible keyboard-focus indicator, and held-key cleanup/disable on blur, pause, hidden tab, and destroy. Verified with input/engine tests and browser keyboard-event checks; all 13 test files / 67 tests, typecheck, and production build pass. Obstacle collision and gameplay-speed tuning remain Phase 5.
- [x] **Stage 2 — Desktop mouse aiming** — Convert mouse coordinates through the canvas bounds into logical world coordinates; update the explicit aim angle without changing player position or selecting/tracking enemies. Preserve the last direction when the cursor is on the player or leaves the canvas; disable aim input while paused/hidden and detach listeners on destroy. Verified scaled/offset coordinate mapping, independence from movement, pause behavior, listener cleanup, live canvas orientation changes, all 72 tests, typecheck, and production build.
- [x] **Stage 3 — Mobile dual joysticks** — Added accessible lower-left movement and lower-right aim controls with separate pointer IDs, normalized/clamped analog vectors, pointer capture, and an adjustable visual thumb. Movement and aim work simultaneously; aim direction persists after release, and movement resets. `touch-action: none`, safe-area spacing, and 112px-minimum targets prevent page gestures and remain usable on narrow screens. Verified controller and engine integration, including pause/resume, across the full 85-test suite.
- [x] **Stage 4 — Input lifecycle and accessibility verification** — Pointer up/cancel/lost capture, window blur, pause, hidden-tab startup/transition, resume, and destroy clear inputs and release captures; listeners detach with engine unmount. Keyboard movement remains available when the canvas or a joystick button is focused, with labeled, tab-focusable controls and visible focus styling. Browser checked the 390 × 844 route: both 117px controls are visible, use `touch-action: none`, and introduce no page overflow. All 16 test files / 85 tests, typecheck, and production build pass.
- [x] **Preserve manual aim with automatic combat firing** — Automatic fire uses the player's stored aim angle for every projectile; zombie pursuit/facing does not change player aim, and movement remains independent. Added simulation coverage for repeated shots while moving with an off-axis zombie and an engine integration test proving mouse aim determines the fired projectile direction. Verified all 16 test files / 86 tests and frontend typecheck; no auto-targeting or aim assist.

## Phase 5 — Gameplay and feedback integration

- [x] **Define typed game state and entity boundaries** — Added engine-owned state and readonly snapshots for player/zombie/projectile/orb/effect entities, wave progression, run upgrades, and statistics; React remains outside simulation state.
- [x] **Implement bounded arena movement and collision** — Added arena-boundary clamping, circle-vs-obstacle movement with sliding, safe actor placement after resize, swept projectile collision against obstacles/zombies, and cooldown-limited contact attacks. Rendering and collision share obstacle bounds.
- [x] **Implement combat and initial zombie roster** — Added automatic 4-shot/s firing in the stored manual aim direction, 25-damage projectiles, health/contact attacks and feedback, with pursuing walkers and faster, lower-health runners. No enemy targeting or aim assist.
- [x] **Implement wave progression and difficulty** — Waves spawn a bounded budget in paced groups, clear only when all budgeted and living enemies are defeated, and pause for an upgrade choice. Enemy count/spawn pace, health, movement, and contact damage scale by wave; the next wave begins after confirmation or an eight-second intermission.
- [x] **Implement temporary item orbs and effects** — Every second kill attempts a deterministic health/damage/rapid-fire/shield/bomb orb drop, capped at three active items with a 12-second lifetime and visible timer ring. Health restores 25; damage and fire rate double temporarily; shield absorbs up to 60 damage; bomb deals 100 area damage with obstacle line-of-sight. Duplicate timed effects refresh rather than stack; collection and expiry have visual feedback.
- [x] **Implement between-wave upgrades** — Combat pauses after a cleared wave and offers current/new values for damage, rate of fire, maximum health, and movement speed. One run-only upgrade is selected before the next wave; caps prevent runaway growth, maximum-health upgrades also heal, and fully capped runs can continue without an upgrade.
- [x] **Track survival, run statistics, and deterministic score** — Track reached/cleared waves, type-specific kills, damage dealt/received, combat survival time, peak damage/fire rate, orbs, and upgrades. Score is 100 per walker, 150 per runner, plus 250 × the triangular cleared-wave total; time alone never adds points. Retry creates a clean run state.
- [x] **Connect gameplay state to pure renderers** — `GameStateRenderer` maps engine-owned entities/effects into presentation-only Canvas draw commands; simulation and collision remain in core systems, and obstacle geometry is shared independently of drawing details. Renderer regression coverage confirms drawing leaves gameplay state unchanged.
- [x] **Implement required gameplay feedback** — Render typed hit/death, orb-spawn/expiry, player-damage/shield, collection, and bomb-radius effects through pure Canvas commands; retain actor hit flashes, shield ring, orb timer, and accessible DOM wave announcements. Effects are visual-only and deterministic. Verified simulation emissions and state-to-renderer purity.
- [ ] **Defer optional scope until the core loop is stable** — Helpers, additional orb/upgrade types, elites, and bosses are optional follow-on features, not prerequisites for the first playable release.

## Phase 6 — React interface and responsive presentation

- [x] **Build the game menu and overlays** — Added an accessible main menu, controls guide, Escape/button pause and resume, restart, return-to-menu, settings, upgrades, intermission, and game-over panels. Leaderboard presentation and score submission remain in Phase 8.
- [x] **Build the HUD and mobile controls layer** — Added responsive wave progress, health, score, kills, remaining-hostile count, and active-effect timers, plus touch joysticks that respect saved visibility preferences.
- [x] **Build pause, upgrade, and game-over interfaces** — Added pause/resume, between-wave upgrade choices, intermission confirmation, styled run statistics, and retry/main-menu actions. Leaderboard actions and score-submission states remain in Phase 8.
- [x] **Implement settings and persistence** — Persist validated touch-control visibility and HUD density preferences in localStorage; run upgrades and statistics remain run-only.
- [x] **Verify responsive desktop, tablet, and mobile layouts** — Checked menu/settings and gameplay HUD/control bounds at desktop, tablet, portrait mobile, and landscape mobile viewports; safe-area spacing and compact layouts are responsive.

## Phase 7 — Audio and visual polish

- [ ] **Add optional centralized audio** — Reuse loaded sounds, honor mute and separate volume settings, respect browser user-gesture requirements, and clean up resources.
- [ ] **Add restrained procedural animation and particles** — Use elapsed time for player movement bob, zombie movement, orb pulse, shield, hit/death and explosion feedback; cap and reuse particle objects where practical.
- [ ] **Polish visual clarity and accessibility** — Tune colours, outlines, dimensions, contrast, and motion; respect reduced-motion preferences where practical and never rely on colour alone for identification.
- [ ] **Add optional sound if appropriate** — Keep audio optional and ensure gameplay remains fully functional when sound is unavailable or muted.

## Phase 8 — Score submission and leaderboard integration

- [x] **Inspect existing score backend and persistence** — Confirm the API route, validation/rate limits, database stores, public response fields, and score-table migration. Notes: `POST /api/game/scores` and `GET /api/game/leaderboard` are present.
- [ ] **Establish typed frontend API operations** — Use the existing API/fetch and TanStack Query conventions; the OpenAPI specification and generated client currently omit the game endpoints, so decide whether to add their OpenAPI definitions and regenerate or use a small dedicated typed service.
- [ ] **Submit completed runs outside the game loop** — Send only the completed result; implement success, failure, and retry states without making gameplay depend on the network.
- [ ] **Load and present leaderboard data** — Handle loading, empty, pagination, and request failures without blocking the game.
- [!] **Resolve leaderboard ranking and wave semantics** — The gameplay reference recommends wave-cleared-first ranking, while the existing API sorts by score, survival time, then submission time and exposes `waveReached` (not `waveCleared`). Confirm the intended public ranking/result contract before implementing leaderboard presentation.

## Phase 9 — Optimization, regression testing, and release readiness

- [ ] **Test engine and lifecycle behavior** — Verify start, pause, resume, restart, game over, tab visibility, unmount cleanup, and absence of duplicate loops or stale entities.
- [ ] **Test gameplay rules and scoring** — Verify controls, no auto-targeting, wave completion/difficulty, orb expiry/effects, upgrade persistence/reset, reached-vs-cleared reporting, and deterministic score.
- [ ] **Test procedural visuals and responsive controls** — Check drawing isolation, visual readability at high enemy/projectile counts, Canvas resizing/high-DPI sharpness, simultaneous touch input, and touch release/cancel on desktop and mobile layouts. No sprite or image-loader tests are required for first release.
- [ ] **Test leaderboard network states** — Verify API request/response shapes, successful submission/retrieval, validation errors, rate limits, and network failures.
- [ ] **Measure performance under heavy gameplay** — Test maximum expected enemies, projectiles, and capped particles on a representative mobile device; avoid per-frame expensive gradients/shadows, and add pooling/spatial partitioning or static-background caching only where measurements justify it.
- [ ] **Verify reduced motion, colour-independent cues, and optional-audio behavior** — Confirm accessibility preferences and media settings do not obscure or disable gameplay.
- [ ] **Run frontend typecheck/build and focused tests** — Resolve game-related errors before release.
- [ ] **Verify migration portal regression safety** — Confirm wizard, tracker, leadership routes, existing API behavior, and shared interface remain unaffected.
