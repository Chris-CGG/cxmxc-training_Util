# Technology Decisions — cxmxc-training

> Phase 1 deliverable. Backfilled in 2026-05-08 to document the stack choices that emerged during the build but were never written down. One entry per material decision: what was chosen, what was rejected, why, and when to revisit. "Because I know it" is a valid justification on a single-author project; "because it's popular" is not.

---

## D1 — Vanilla HTML + ES modules over a JS framework

**Chosen:** A single `index.html` shell with inline CSS, inline `<script type="module">`, and ES module imports from `src/engine/*.js`.

**Rejected alternatives:**
- **React / Vue / Svelte.** Adds a build step, a runtime, a routing layer, and a virtual DOM for a 5-screen app with one user. The DOM count is small enough that re-rendering on every state change is cheap; reactivity buys nothing here.
- **Solid / Lit / Preact.** Smaller than React but still a build step and a paradigm dependency.

**Why this wins.**
- Zero build step → zero deployment friction → the PWA loads instantly on the device.
- ES modules are a browser-native dependency boundary; the engine modules already export pure functions, which is the contract a framework would have given us anyway.
- One-file-shell pairs naturally with the v1 scope (single user, single screen-set, single device).
- No transpile means the code in the editor is the code on the device. Easier to debug on the phone over USB.

**When to revisit.**
- If the shell's `wire()` function grows past ~300 lines, the time cost of "find the handler for this thing" starts to dominate. That's the v2-component-split moment.
- If multiple contributors join the project. The pure-DOM shell is hardest to onboard onto.

---

## D2 — `localStorage` for state in v1; Supabase mirror in v2

**Chosen:** All persistent state under the `cxmxc.*` prefix in `localStorage`. Keys are JSON-serializable and namespaced.

**Rejected alternatives:**
- **IndexedDB.** Strictly more capable (transactions, structured clones, indexes) but the API is hostile and the v1 working set fits comfortably in localStorage's 5-10 MB budget.
- **Supabase from day one.** Requires an account, an API key, a service role key, RLS policies, an auth flow. v1 has one user; the cloud round-trip would be paying for a feature nobody asked for.
- **Files on disk.** Web apps cannot.

**Why this wins.**
- Single-user, single-device. localStorage is the right shape.
- Survives PWA install on Android (verified Day 1).
- Sync to Supabase is a v2 surgery on a known-good local layer rather than an upfront commitment.
- The `cxmxc.*` namespace makes a future "SELECT * WHERE key LIKE 'cxmxc.%'" mirror trivial.

**When to revisit.**
- A second device for the same user (laptop, second phone).
- A second user.
- Browser-managed eviction starts losing data (low risk on PWA install but theoretically possible).

---

## D3 — Anthropic API call browser-direct, no proxy

**Chosen:** `fetch('https://api.anthropic.com/v1/messages', { headers: { 'x-api-key': ..., 'anthropic-dangerous-direct-browser-access': 'true' }})` from the PWA itself. API key lives in `localStorage` only.

**Rejected alternatives:**
- **Node/Edge proxy** (Vercel function, Cloudflare Worker, Supabase Edge Function). Centralizes the key, lets it stay server-side, supports rate limiting and audit logging.
- **No AI coach in v1.** Skip the feature.

**Why this wins.**
- v1 has no backend. Adding a proxy just for one API call doubles the deploy surface.
- The key is the *user's* key, on the *user's* device, used to call the *user's* coach. That's the trust model where browser-direct is acceptable — Anthropic explicitly supports it via the `anthropic-dangerous-direct-browser-access: true` header.
- No new third-party dependency. No new latency hop.
- Compliance posture (CLAUDE.md rule 8): the curated prompt subset is the privacy boundary, not the network boundary.

**When to revisit.**
- A second user (the trust model breaks).
- A budget cap requirement (proxies can rate-limit and meter).
- A model upgrade requires a header or auth scheme that direct-browser doesn't support.

---

## D4 — PWA via manifest + service worker, not a native app

**Chosen:** Standalone PWA with `manifest.json`, `service-worker.js` (precache + stale-while-revalidate), maskable SVG icon. Installed from Android Chrome.

**Rejected alternatives:**
- **React Native / Capacitor / Flutter.** Native binary, app store distribution, code-signing, two platforms to maintain. Vastly bigger surface for a single-user app.
- **Plain web app, no install.** No home-screen icon, no offline cache, no standalone window — daily friction every morning.

**Why this wins.**
- Install path is "open URL → menu → Install app". Sixty seconds, no developer account needed.
- Same codebase as the dev site. No double-maintenance.
- Offline cache covers the daily check-in / log / plan view workflow, which is exactly where reliable connectivity isn't guaranteed.
- iOS support is weaker than Android but irrelevant for v1 (single Android user).

**When to revisit.**
- iOS becomes a target (PWA limitations there are real).
- A native API is needed (BLE for live HR/power, NFC, file system).
- App-store distribution is a requirement.

---

## D5 — Manual paste from Strava/ROUVY in v1

**Chosen:** Two textareas on the Data screen. Regex-based extraction of duration, distance, avg power, NP, avg HR, cadence, IF, TSS, route name. Quick-entry form for everything the parser misses.

**Rejected alternatives:**
- **Strava API (OAuth + activities endpoint).** Real fetch of recent activities. Cleaner UX. Requires registered app, OAuth dance, refresh-token storage, scope review.
- **ROUVY API.** Does not exist publicly.
- **CSV/FIT file upload.** Strava/ROUVY both export FIT files; parsing them in-browser is a known-solvable problem (`fit-file-parser`) but adds a dependency.

**Why this wins.**
- Paste is the smallest possible bridge. Day 1 of training data was captured this way successfully.
- No OAuth screen, no refresh tokens, no token expiry edge cases, no review by Strava's app-approval team.
- Parser is forgiving: missing fields stay null, user verifies in the quick-entry form before saving.

**When to revisit.**
- Paste fatigue across the 20-day block becomes a real cost.
- The parser misses a Strava format change (Strava adjusts activity summary copy).
- A second user appears who isn't willing to copy/paste.

---

## D6 — Single `index.html` shell over a multi-component split

**Chosen:** All rendering, wiring, and state management in `index.html`. Logic in `src/engine/*.js` modules.

**Rejected alternatives:**
- **Component-per-screen** (e.g. `src/components/CheckIn.js` exporting a render fn). The empty placeholder files in `src/components/` are the v2 destination.
- **Custom elements / Web Components.** Standards-based component model with no framework cost.

**Why this wins.**
- v1 is small enough that a single shell is the most legible layout. "Where does the Plan screen render?" → search `renderPlan` and you're there.
- Engine modules already enforce the right separation (pure logic vs. DOM). The component split is mostly a code-organization gain, not a correctness gain.
- One file to deploy, one file to debug, one file to read top-to-bottom.

**When to revisit.**
- The shell's wire-up function or the renderer set passes ~2000 lines of script content.
- Two contributors end up editing the same file in the same week.
- A second screen needs the same component (e.g. a stat-strip used on both Check-In and Profile).

---

## D7 — Bebas Neue + DM Mono via Google Fonts

**Chosen:** Bebas Neue for headers and large numerics, DM Mono for data and copy. Loaded from `fonts.googleapis.com`.

**Rejected alternatives:**
- **System fonts.** Free, instant, no network. Loses the cycling-computer aesthetic that matters for daily use.
- **Self-hosted woff2.** Full control, no third-party dependency, but a build/deploy concern that doesn't pay back at v1 scale.
- **Variable fonts.** Smaller payload across multiple weights. Bebas Neue isn't variable; sticking with two static fonts keeps the load simple.

**Why this wins.**
- The two-font pairing is the look. The dial, the day numbers, the "DAY 3" badges — they read right with Bebas + DM Mono in a way they don't with system fonts.
- Google Fonts CDN is fast and well-cached on Android Chrome.
- Cost: one cross-origin connection on first load. Service worker caches subsequently.

**When to revisit.**
- Compliance posture changes such that any external request is unacceptable. Self-host then.
- A second design refresh wants different typography.

---

## D8 — JSDoc comments instead of TypeScript

**Chosen:** Plain JS with JSDoc on every export. Strict comment standard documented in CLAUDE.md.

**Rejected alternatives:**
- **TypeScript.** Real types, real compile-time guarantees, real refactor support.
- **JSDoc with `@ts-check`.** Runs the TS compiler against JSDoc. Halfway house.
- **No types at all.** Faster to write; loses every benefit when the codebase grows.

**Why this wins.**
- Zero build step. The code shipped is the code written.
- JSDoc still drives editor tooling (hover docs, parameter hints in VS Code).
- The engine modules are small (≤200 lines each) and pure; the bug class TS catches is rare here.

**When to revisit.**
- The engine surface grows past ~10 exports per module.
- A second contributor whose primary language is TypeScript joins.
- A bug is shipped that types would have prevented.

---

## D9 — Pure ES modules, no bundler

**Chosen:** Browser-native `<script type="module">` and `import` statements. No webpack, Vite, esbuild, or rollup.

**Rejected alternatives:**
- **Vite for dev, esbuild for prod.** Modern, fast, zero-config-ish.
- **Rollup for prod.** Tree-shaking, output bundling.
- **A build step at all.** Each one is a maintenance cost.

**Why this wins.**
- Browsers ship native module support. Why add a build step to do what the platform already does?
- Network cost: 4 module files, ~25 KB total. Bundling saves nothing meaningful.
- "View source" on the deployed page shows the actual code.

**When to revisit.**
- A specific dependency requires a bundler (e.g. uses CommonJS or expects `process.env`).
- Tree-shaking starts to matter — if v2 pulls in a chart library, only used pieces should ship.

---

## D10 — Inline CSS in `index.html`, no external stylesheet

**Chosen:** All styles live in a `<style>` block at the top of `index.html`. Theme via `data-theme` attribute and CSS custom properties.

**Rejected alternatives:**
- **External `theme.css`.** The `src/styles/` directory is the v2 destination.
- **Tailwind / utility CSS.** Build step, opinionated, generic-fitness vibe instead of cycling-computer.
- **CSS-in-JS.** Adds JS for something CSS does fine.

**Why this wins.**
- Zero build step. Single deployable asset.
- Theme variables in `:root[data-theme="dark"|"light"]` give a real second theme without preprocessing.
- The `<style>` block is small enough (≤300 lines) to read top-to-bottom.

**When to revisit.**
- Style block grows past ~500 lines.
- A v2 contributor needs to work on styles without touching the shell.
- Critical CSS optimization becomes a measured concern.

---

## Summary

The single thread connecting D1 through D10: **v1's primary cost is build complexity, not runtime cost.** Every decision favors zero build step, zero new third-party dependency, and code-as-deployed. The v2 destinations (Supabase mirror, component split, possibly TypeScript, possibly a bundler) are named in the file map so the choices stay reversible — but the v1 build was deliberately one layer thick.

This document is itself a Phase 1 backfill; future projects on the framework should write `TECH_DECISIONS.md` *before* the first commit, not eight commits in.
