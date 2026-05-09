# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Security
- **Public / private athlete-profile split (pre-public-repo audit).** Identity, biometric, breathing-condition, and mental-health fields moved out of the committed `src/data/athlete-profile.json` and into a gitignored `src/data/athlete-private.json`. Committed `athlete-private.example.json` documents the shape for forks. The shell merges both at boot via `mergePrivateProfile()`; without the private file the public profile is used as-is and identity fields render as `—`. `src/engine/ai-coach.js` `buildSystemPrompt` and `askCoach` now require a `profile` argument — closes a long-standing leak of CLAUDE.md rule 5 (the prompt was hardcoding the athlete's name + medical conditions). Engine smoke tests grew from 25 to 28 (added: profile-required, identity-from-profile, conditional medical lines). Full audit and move-list in `docs/SECURITY.md`.

## [0.2.1] — 2026-05-09 — QA fixes

Three QA bugs filed against v0.2.0 fixed in order, each in its own commit. No new features; tightening of existing surfaces.

### Fixed
- **Resting HR input not accepting mobile input.** `type="number"` switched to `type="text" inputmode="numeric" pattern="[0-9]*" maxlength="3"` for reliable Android numeric-keypad behaviour. `min`/`max` attributes removed (they could silently flag intermediate values during typing); validation moved to save-time (empty → toast + focus, value outside 30-200 → toast). Live readout span added next to the field with `aria-live="polite"` so the typed value is visually confirmed (and announced to screen readers). `<label for="in-rhr">` added — closes one of the form-label-association gaps in `docs/ACCESSIBILITY.md`. Input handler strips non-digits + caps at 3 chars before re-rendering so paste / external keyboard / autocomplete can't introduce text that breaks the numeric coerce.
- **Mobile overflow + text bleed at 375 px.** Systematic audit landed as a "MOBILE OVERFLOW + RESPONSIVE SAFETY" CSS block: global guards (`body { overflow-x: hidden }`, `img { max-width: 100% }`, `input/select/textarea { max-width: 100% }`, `textarea { word-break: break-word }`, `pre { overflow-x: auto }`), `.card { overflow: hidden }`, `select` text-overflow ellipsis. Big Bebas Neue numerics scale via `clamp()` instead of overflowing: `.stat-value` 20→26 px, `.countdown` 42→60 px, `.dial-num` 28→36 px, `.day-num` 22→28 px. `.modal-content { max-width: 100vw; overflow-x: hidden }` so day-detail / unplanned modals can't push a horizontal scrollbar. Per-component fixes: `.plan-day .day-meta` word-break, `.cal-legend-item` whitespace-nowrap. Two breakpoint-specific adjustments: at ≤380 px the impact-preview before/after switches from 2-col to single column with the arrow rotated 90°; at ≤360 px `.photo-stats` collapses to a single column. Tab bar fallback: tab labels now wrapped in `<span class="tab-label">` so they can be hidden — at ≤360 px font drops to 9 px with tighter letter-spacing; at ≤320 px the labels disappear entirely and the tab bar becomes icon-only with the icon scaled to 22 px.
- **Photo capture missing gallery upload option.** Photo tab restructured: three full-width stacked action buttons (📷 **Take Photo Now** / 🖼️ **Upload from Gallery** / 📸 **Browse Files**) replace the previous 2-col tight grid. Camera and gallery affordances were always wired but read as one button on small screens; explicit icons + dedicated labels + vertical stacking fixes that. Third button (**Browse Files**) is gated on `'showOpenFilePicker' in window` and gracefully disappears on Android Chrome / iOS / Firefox. **Drag-and-drop zone** added below the buttons — dashed border, "Or drag a screenshot here" label, accent-purple highlight on dragover, hidden via `@media (hover: hover) and (pointer: fine)` on touch-only devices. Drop feeds straight into `photoSetFile()` — compression + extraction path is identical regardless of source. Window-level dragover/drop handler prevents the browser from navigating away when the user misses the zone.

### Notes
- **Spec deviation — "Choose from Recent."** The original bug spec called for a third button showing "last 4 images from camera roll." No web API exposes the camera roll like that; `showOpenFilePicker` is a richer system file picker, not a recent-photos surface. The shipped third option is labelled "Browse Files" to match what the platform actually supports.
- **Other UI issues noticed during the 375 px audit, deferred to v0.3.0.** The remaining four accessibility gaps from `docs/ACCESSIBILITY.md` (modal focus trap, opt-grid touch target sizing, slider `aria-describedby`, supplement-delete `aria-label`) were not addressed in this pass — they are tracked. The unplanned-activity post-ride form (`data-unplanned-host`) is still legacy code reachable only via the Check-In banner; folding it into the new 3-tab Manual flow remains a v0.3.0 candidate per `ROADMAP.md`.

## [0.2.0] — 2026-05-09

Two major features (Calendar tab + Photo capture with Vision-API extraction), the entire PDLC framework + retroactive Phase 0-5 backfill, the UI debug pass, and the Phase 4/5 hardening artefacts. v0.2.0 is the first release that closes all the named gaps from the v0.1.0 honest retrospective in `CXMXC_REFERENCE.md`.

> **Note on `app_version`.** `src/data/athlete-profile.json` still records `app_version: 0.1.0`. That file is authoritative per CLAUDE.md rule 1; bumping it requires explicit human override. The discrepancy is intentional and harmless until the next time the profile is updated.

### Added — Calendar tab
- New 6th nav tab (between Plan and Log): full month-grid view with prev/next navigation.
- Day cells: type dot bottom-right (orange threshold / green endurance / red vo2 / blue recovery / grey rest / purple benchmark), top-right completion ✓ or race-day ★, bottom-left dot for unplanned activities. Today gets accent purple border + outer ring; race day gets gold border + warm gradient; out-of-block days are inert and faded.
- Tap any day → bottom-sheet day-detail modal: prescribed session, check-in score, logged ride summaries, unplanned-activity records, plus quick-action buttons ("Check In" today only, "Log This Session →" today + future) that navigate and prefill.
- Below the grid: legend strip, gradient-filled block-progress bar, two-stat countdown card for Tulsa Tough (priority 1) and EHOTS RGV (priority 2).
- Reads `effectiveSession()` so applied unplanned-activity overlays show through. Authoritative JSON is never mutated.

### Added — Photo capture with AI data extraction
- Data screen restructured: 3-tab segmented toggle (📷 Photo / 📋 Paste / ✏️ Manual) replaces the previous Scheduled/Unplanned toggle. Photo is the new default. Paste auto-switches to Manual after parsing.
- `src/engine/vision.js` (new pure module) — `extractCyclingData({ apiKey, imageBase64, mediaType, model?, maxTokens? }) → { ok, json, raw, error }`. Default model `claude-sonnet-4-6`. System prompt pinned to the feature spec's exact extraction schema. Strips markdown code fences from model output before parsing.
- Photo tab UI: hidden `<input type="file" capture="environment">` for camera + plain `<input type="file">` for gallery. Two ghost buttons trigger the inputs. Preview area with Clear and Analyze buttons.
- Image compression before upload — canvas resize to max 1200 px wide, JPEG quality 0.85. Keeps Vision API cost low and avoids "request body too large" failures on raw phone-camera photos.
- Extracted data renders as editable stat cards (`.photo-stats` 2-col grid). Source pill ("Extracted from ROUVY") above. Core fields always shown; missing core fields get the yellow `.missing` tint with a confidence-line summary. Non-core fields only render when present.
- Two action buttons: "Edit Manually →" (pushes values into the Manual tab quick-entry form and switches tabs) and "Looks Right — Save Session" (saves directly to `K.sessions` with `source: 'photo-extraction'`, auto-links to a plan day when the date matches).
- Comprehensive failure handling routed through `showPhotoError()` with a "Use Manual Entry Instead" fallback button: no API key, local image-prep error, API error (network / HTTP / parse), no metrics detected (every core field null).
- Privacy posture: photo data lives only in transient `photoState` and the outgoing fetch body. Never persisted to localStorage, never logged, never embedded in URLs. Sent only to `api.anthropic.com`.

### Added — PDLC framework + retroactive backfill
- PDLC framework in `/docs/PDLC/` — phases, gates, Claude protocol, cxmxc reference implementation, changelog, new-project template, README.
- Phase 0 / 1 / 2 backfill: `docs/DISCOVERY.md`, `docs/TECH_DECISIONS.md`, `docs/architecture.md` (Mermaid ERD, component graph, state-flow sequence diagrams, lifecycle state machine), `README.md` (was a one-line stub since the scaffold commit).
- Phase 4 hardening: `tests/engines.test.mjs` (25 smoke tests, <100 ms via `npm test`), populated `package.json`, `docs/SECURITY.md` (checklist + console-error sweep procedure), `docs/ACCESSIBILITY.md` (WCAG audit + real-device procedures).
- Phase 5 deployment: `.github/workflows/deploy.yml` (Actions-as-source GitHub Pages workflow, runs `npm test` before publishing), feedback link in Profile screen → repo GitHub Issues, `docs/PERFORMANCE.md` (Lighthouse-mobile baseline procedure).

### Fixed — UI debug pass
- **Phase 1 text bleed.** Phases list redesigned with dedicated `.phase-card` stacked layout (phase number + "Days 2-7" pill on one line, phase name on its own line, goal full-width). Same overflow risk in `.plan-day` and `.log-row` patched with `minmax(0, 1fr)` columns + `min-width: 0` + `word-break: break-word`.
- **Sterile / static feel.** Motion polish on nine surfaces with `prefers-reduced-motion` opt-out: dial fill via `@property --pct`, toast slide-up, modal fade + slide-up, tab-bar animated underline, segmented transitions, screen entrance fade+rise, button press + `:focus-visible`, plan-day press, smooth detail-panel expand replacing `display: none` snap, AI coach typing dots replacing static "Thinking…", ambient shimmer on the Field-Training banner.

### Changed
- `service-worker.js` cache bumped `cxmxc-v2` → `cxmxc-v4` to pick up `unplanned.js` (v3) and `vision.js` (v4) precaches.
- Tab bar grid changed from 5 to 6 columns to fit Calendar between Plan and Log.
- `docs/PDLC/CXMXC_REFERENCE.md` — phase status snapshot updated; retroactive-fixes section restructured into four buckets (closed in backfill pass / closed during v0.1.0 build / pending real-device verification / tracked for v0.2.0+).

### Pending (real-device verification, not blocking)
- Console-error sweep on the Android device (procedure in `docs/SECURITY.md`).
- TalkBack / keyboard / color-vision / touch walks (procedures in `docs/ACCESSIBILITY.md`).
- Lighthouse-mobile baseline on the deployed build (procedure in `docs/PERFORMANCE.md`).

## [0.1.0] — 2026-05-08

First captured release. Tagged retroactively at the close of the initial Tulsa Tough Peak Block build, before iteration began. The athlete profile records `app_version: 0.1.0` as the corresponding marker.

### Added

#### Authoritative data
- `src/data/athlete-profile.json` — CxMxC profile (FTP 232 W, 93 kg, 36 yo). Identity, equipment, baseline numbers, riding/breathing/mental-health background, RHR and stability-score thresholds, HR + power zones, primary and secondary goals (Tulsa Tough 2026-06-06, EHOTS RGV 2026-07-05), water target, app version meta.
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
[0.2.1]: ./CHANGELOG.md#021--2026-05-09--qa-fixes
[0.2.0]: ./CHANGELOG.md#020--2026-05-09
[0.1.0]: ./CHANGELOG.md#010--2026-05-08
