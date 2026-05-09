# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added — PDLC framework
- PDLC framework documentation in `/docs/PDLC/` — phases, gates, Claude protocol, cxmxc reference implementation, changelog, new-project template, README.

### Added — Phase 0 / 1 / 2 backfill (2026-05-08)
- `docs/DISCOVERY.md` — problem statement, user profile, constraints, success metrics, A1-A10 assumptions, out-of-scope list, open Phase 6+ questions.
- `docs/TECH_DECISIONS.md` — ten decisions D1-D10 each with chosen / rejected / why / when-to-revisit.
- `docs/architecture.md` — Mermaid ERD, component graph, two state-flow sequence diagrams, lifecycle state machine, external dependencies, security/privacy notes.
- `README.md` — populated from project context (was a one-line stub since the scaffold commit).

### Added — Phase 4 hardening
- `tests/engines.test.mjs` — 25 smoke tests across all four engine modules. Runs with `npm test` (`node --test tests/*.test.mjs`); <100 ms total.
- `package.json` — populated. Was an empty placeholder; node imports now work without copying source to /tmp.
- `docs/SECURITY.md` — Phase 4 security checklist: 7 pass + 2 tracked gaps (no CSP header, HTTP on LAN dev). Console-error sweep procedure included.
- `docs/ACCESSIBILITY.md` — WCAG 2.1 AA audit: 10 strong items + 5 tracked gaps for v0.2.0. TalkBack / keyboard / color-vision / touch procedures for real-device verification.

### Added — Phase 5 deployment
- `.github/workflows/deploy.yml` — GitHub Pages deploy workflow. Runs `npm test`, then publishes the static site. Activates after one push to main + Pages source toggle.
- Profile screen → "FEEDBACK" card with one-click link to repository GitHub Issues.
- `docs/PERFORMANCE.md` — Lighthouse-mobile baseline procedure with concrete acceptance criteria. Real-device results table pending the live deployment.

### Changed
- `docs/PDLC/CXMXC_REFERENCE.md` — phase status snapshot updated to reflect closed gaps; retroactive-fixes section restructured into four buckets (closed in backfill pass / closed during v0.1.0 build / pending real-device verification / tracked for v0.2.0+).

### Fixed — UI debug pass (2026-05-08)
- **Phase 1 text bleed.** The phases list on the Plan screen rendered as a generic `.detail-row` (flex with `space-between`, no gap) — long phase names collided with the left-side label on narrow phones. Replaced with a dedicated `.phase-card` stacked layout (phase number + days pill on one line, phase name on its own line, goal full-width below). Same overflow risk in `.plan-day` and `.log-row` patched preemptively with `minmax(0, 1fr)` columns + `min-width: 0` + `word-break: break-word`.
- **Sterile / static feel.** Targeted motion on nine surfaces with `prefers-reduced-motion` opt-out: dial fill animation via `@property --pct`, toast slide-up, modal fade+slide-up entrance, tab-bar animated underline indicator, segmented-toggle transitions, screen change fade+rise, button press scale + `:focus-visible` outline, plan-day press scale, smooth detail-panel expand (max-height transition replaces `display: none` snap), AI coach typing dots replace static "Thinking…" text, ambient shimmer on the Field-Training banner gradient.

### Pending (real-device verification, not blocking)
- Console-error sweep on the Android device (procedure in `docs/SECURITY.md`).
- TalkBack / keyboard / color-vision / touch walks (procedures in `docs/ACCESSIBILITY.md`).
- Lighthouse-mobile baseline on the deployed build (procedure in `docs/PERFORMANCE.md`).

## [0.1.0] — 2026-05-08

First captured release. Tagged retroactively at the close of the initial Tulsa Tough Peak Block build, before iteration began. The athlete profile records `app_version: 0.1.0` as the corresponding marker.

### Added

#### Authoritative data
- `src/data/athlete-profile.json` — Chris Clarke-Gonzalez profile (FTP 232 W, 93 kg, 36 yo). Identity, equipment, baseline numbers, riding/breathing/mental-health background, RHR and stability-score thresholds, HR + power zones, primary and secondary goals (Tulsa Tough 2026-06-06, EHOTS RGV 2026-07-05), water target, app version meta.
- `src/data/training-plan.json` — 20-day Tulsa Tough Peak Block (2026-05-07 → 2026-05-26). Three phases: Power and Repeatability, Ace Peloton Simulation, Taper and Sharpen. Per-day prescriptions: type, duration, target intensity, target cadence, ERG flag, ROUVY workout/route, key metrics, fueling target, notes.
- `src/data/rouvy-routes.json` — curated ROUVY library: 25 real routes + 23 structured workouts, tagged by training type, duration, elevation, difficulty, FTP range. Routes referenced from the plan carry `used_in_plan_days` for cross-linking.

#### Engine modules (pure ES modules, no DOM / no localStorage)
- `src/engine/stability.js` — `computeStability` (5-slider + RHR → 0-100 score → green/yellow/red band), `bandColor`, `bandLabel`, `detectBurstCrashPattern` (3-yellow / red / descending flags — protected by CLAUDE.md rule 9), `checkinTrend`.
- `src/engine/adaptation.js` — `moodGatedGuidance` (per-band coaching text honoring "nervous system load" / "carrying weight" / never-rest-as-weakness language rules), `adaptForPattern` (structured action codes when burst-crash flags trip).
- `src/engine/ai-coach.js` — Anthropic `/v1/messages` browser-direct wrapper (`buildSystemPrompt` enforces CLAUDE.md rule 10: every prompt includes today's mood gate band and stability score; `askCoach` returns `{ok, text}`; `summarizeRecentSessions`).
- `src/engine/unplanned.js` — `estimateTSS` (per-hour rates: easy 40 / moderate 65 / hard 85 / race_pace 105), `tssBucket`, `computeRipple` (replace / downgrade / protection / buffer_absorbed / rhr_check changes), `buildCoachingNote` (field-training / peloton-simulation / protection-day language).

#### Application shell — `index.html`
- 5-screen single-file PWA shell: Check-In, Data, Plan, Log, Profile.
- Mood-gate Check-In with live stability dial, 5 sliders + RHR input, today's prescribed-session card, mood-gated guidance bubble.
- Data screen with Strava and ROUVY paste parsers (regex-based extraction of duration, distance, avg power, NP, avg HR, cadence, IF, TSS, route name) and a quick-entry form.
- Plan screen rendering the full 20-day block from `training-plan.json` with expandable detail per day, today highlighted, completion toggle persisted in `cxmxc.completed` overlay (JSON file never mutated), curated ROUVY route suggestions per session type.
- Log screen with water grid (8 oz cells, 100 oz target), supplement add/check/remove, merged check-in + session history (newest first, capped 30), 14-day stability trend bars with burst-crash watch note, JSON export.
- Profile screen with athlete data, zones, stability thresholds, AI coach key entry (Anthropic key stored only in `localStorage`, never sent to non-Anthropic origins), export-everything, reset-day, reset-all, goals list.
- Dark/light theme toggle (real second theme, not a half-built afterthought) using `data-theme` attribute and CSS custom properties.
- Bebas Neue + DM Mono typography; deep navy/black background with accent purple `#9d6cff`.

#### Field Training / unplanned-activity feature
- Pre-ride flag modal on Check-In: form view (activity type, date, distance with mi/km toggle, duration, intensity, time of day, notes, live TSS readout) → impact-preview view (coaching note, per-day before/after change cards, three actions: Edit / Keep Original Plan / Apply Changes).
- Data screen segmented toggle between "Scheduled Session" and "Unplanned Activity" forms; post-ride form includes RPE 1-10 slider, fueling notes, was-this-planned toggle, link-to-existing-flag select.
- `cxmxc.unplanned` localStorage record with lifecycle states `flagged | logged | ignored` and a separate `ripple.state` (`preview | applied | rejected`).
- Plan-screen overlay: `effectiveSession()` merges `applied` ripples onto sessions at render time; rejecting flips state and the plan reverts. Adjusted days carry an "ADJUSTED" or "RHR CHECK" badge.
- Tomorrow's 100km group ride seeded as a flagged example so the feature is observable on first launch.

#### PWA install
- `manifest.json` configured for Android install: standalone display, theme `#0a0e1a`, background `#0a0e1a`, maskable SVG icon.
- `service-worker.js` precaches app shell + three data files + four engine modules; runtime stale-while-revalidate for same-origin GETs; cache version `cxmxc-v3`.
- `icon.svg` — purple-ring maskable icon mark.

#### Documentation
- `CLAUDE.md` — project brief: athlete background, communication-style rules (non-negotiable language conventions), 20-day block summary, Day 1 captured seed data, tech decisions, visual/UX design, file map, full data-schema documentation per file with invariants, instructions for future Claude Code sessions, "what this app is *not*", and 10-rule **Development Rules and Feedback** block (authoritative-file protection, mood-gate language enforcement, ERG-OFF default, JSON-data-only, ask-before-major-refactor, commit-before-feature, test-before-commit, burst-crash logic preservation, mood-gate-required AI coach prompts).
- Inline JSDoc on every export across all four engine modules; file headers naming each module's role and contracts; section banners throughout `index.html`.

#### Verified on real device
- Successful PWA install on Android Chrome over LAN (`http://192.168.40.201:8080`); home-screen icon launches the app standalone; Day 1 seed data renders correctly.

### Notes

- Built without a formal `DISCOVERY.md` — the athlete profile served as compressed proxy. See `CXMXC_REFERENCE.md` Phase 0 for the lesson.
- Data files `athlete-profile.json` and `training-plan.json` are authoritative per CLAUDE.md rule 1; modifications require explicit human override.
- v0.1.0 marks "MVP shipped to its single user" — it is not yet a public deployment. See `CXMXC_REFERENCE.md` Phase 5 for the gap list.

[Unreleased]: ./CHANGELOG.md
[0.1.0]: ./CHANGELOG.md#010--2026-05-08
