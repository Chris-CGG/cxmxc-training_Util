# Roadmap

> Living document of work that's planned, in flight, or recently shipped. Items marked ✅ have shipped; ⏳ are in flight; 💭 are candidates not yet committed to. Sunset triggers and explicit out-of-scope items are documented at the bottom so they don't get re-relitigated.

Pair this file with `CHANGELOG.md` (the audit ledger) and `CXMXC_REFERENCE.md` (the honest phase retrospective). Roadmap is forward-looking; the other two are backward-looking.

---

## Recently shipped — v0.2.0

- ✅ **Calendar tab** — full month-grid view between Plan and Log with day-detail bottom sheet, legend, progress bar, dual-goal countdowns. Reads `effectiveSession()` so unplanned-activity overlays show through.
- ✅ **Photo capture with AI data extraction** — Photo / Paste / Manual 3-tab Data screen. `src/engine/vision.js` wraps the Anthropic Messages API (`claude-sonnet-4-6`) with a strict cycling-data extraction system prompt. Image compressed to 1200 px @ JPEG 0.85 before send. Extracted JSON renders as editable stat cards with confidence indicators; saves directly or hands off to Manual. Comprehensive failure handling routes every error to a "Use Manual Entry Instead" fallback.
- ✅ **PDLC framework** in `/docs/PDLC/` — phases, gates, Claude protocol, cxmxc reference, changelog, new-project template, README. The framework was extracted from this project as a reusable standard.
- ✅ **Phase 0/1/2/4/5 retroactive backfill** — DISCOVERY, TECH_DECISIONS, architecture (Mermaid ERD + component graph + state flows), README content, smoke tests (25/25 passing under `npm test`), SECURITY checklist, ACCESSIBILITY audit, PERFORMANCE baseline procedure, GitHub Pages deploy workflow, feedback link in Profile.
- ✅ **UI debug pass** — Phase 1 text bleed fix (dedicated `.phase-card` layout) + motion polish on nine surfaces with `prefers-reduced-motion` opt-out.

## Recently shipped — v0.1.0

- ✅ MVP shipped to its single user. Installed as PWA on Android Chrome. See `CHANGELOG.md` for the full v0.1.0 entry.

---

## In flight (currently nothing — Phase 6 steady state)

⏳ *No work is currently in flight. Phase 6 of the PDLC is the steady state of a healthy product; iteration is event-driven (real-world need, real-device verification finding, user feedback).*

---

## v0.3.0 candidates

### Real-device verification (closes Phase 4/5 properly)

These are not features; they are pending verifications named in the v0.2.0 hardening docs that need to happen on the actual Android device.

- 💭 Run the **console-error sweep** (procedure in `docs/SECURITY.md`) — fill in the results table.
- 💭 Run the **TalkBack / external-keyboard / color-vision / touch-target walks** (procedure in `docs/ACCESSIBILITY.md`) — fill in the results table.
- 💭 Run the **Lighthouse Mobile baseline** on the deployed GitHub Pages build (procedure in `docs/PERFORMANCE.md`) — fill in the results table. Tag v0.2.1 if all targets pass.

### Accessibility v2 pass (high value, low cost)

The five gaps named in `docs/ACCESSIBILITY.md` — fixable in one focused commit, ~1-2 hours, no architectural change.

- 💭 Form labels associated via `for` / `id` (every Check-In slider, RHR input, Data quick-entry field, Profile field, unplanned modal).
- 💭 Modal focus trap + Escape-to-close on the unplanned and day-detail modals.
- 💭 Modal opt-grid buttons sized to 44 × 44 minimum.
- 💭 Slider `aria-describedby` for the value readout so TalkBack announces "Sleep Quality, 7 of 10".
- 💭 Replace `title="Remove"` with `aria-label="Remove"` on the supplement delete button.

### Hardening / security tighten

- 💭 CSP meta tag (proposed policy in `docs/SECURITY.md` — `'unsafe-inline'` for style-src tracked separately because v1 inlines all CSS).
- 💭 Bump `app_version` in `src/data/athlete-profile.json` to match `CHANGELOG.md` (requires explicit `[OVERRIDE]` per CLAUDE.md rule 1).

### Feature work — high signal

- 💭 **Strava OAuth integration.** Replace the manual paste flow with a real activity feed. Requires Strava app registration + token refresh handling. v1 paste stays as fallback.
- 💭 **Photo extraction → AI coach note.** After saving a photo-extracted session, automatically generate a coaching note via `askCoach()` using the extracted metrics + today's mood-gate band. Currently the coach is a separate manual call.
- 💭 **Unplanned post-ride form integrated into Manual tab.** The `data-unplanned-host` form (RPE slider, fueling notes, link-to-flag dropdown) is currently legacy code, accessible only via the Check-In banner. Fold its functionality into the Manual tab so logging an unplanned ride is a one-tab workflow.
- 💭 **Auto-link sessions to flagged unplanned records.** Whenever a session is saved with a date that matches a flagged unplanned record, prompt the user to link them — the existing `unplanned.actual` populating logic already exists.
- 💭 **Sweet-spot interval breakdown view.** The plan describes interval structures in prose ("4×8 min @ 95-100% FTP"); a parsed visual breakdown (timeline blocks with target watts/cadence per interval) would make the prescribed session readable at a glance.
- 💭 **Heat-acclimation block.** Tulsa June heat is a known stressor. Optional pre-block heat-tolerance work (Ventoux / Kona / Gran Canaria routes) tracked in its own block JSON.

### Feature work — exploratory

- 💭 **Multi-language support.** Spanish first — RGV community; relevant for the EHOTS goal.
- 💭 **PDF export.** Currently JSON only. PDF is more shareable with a human coach.
- 💭 **Live ride telemetry.** BLE / ANT+ ingestion for live HR, power, cadence during the ride. Significant scope; would change the offline-first model.
- 💭 **iOS PWA polish.** iOS PWA support is weaker than Android (no `capture` attribute on file inputs, smaller storage budget, etc.). Pick this up only if iOS becomes a real target.

### Infrastructure (v2 storage layer)

- 💭 **Supabase mirror for cloud sync.** Triggered when the user gets a second device, or when a second user appears. Designed for from day one — the `cxmxc.*` localStorage namespace is already keyed for a `SELECT * WHERE key LIKE 'cxmxc.%'` mirror. See TECH_DECISIONS D2.
- 💭 **Server-side AI coach proxy.** Currently browser-direct via `anthropic-dangerous-direct-browser-access`. A proxy would centralize the key, support rate-limiting, and enable budget caps. Triggered by a second user (the trust model breaks) or a budget cap requirement. See TECH_DECISIONS D3.
- 💭 **TypeScript migration.** Currently plain JS with JSDoc. Triggered by a second contributor whose primary language is TS, or by a bug class that types would have prevented. See TECH_DECISIONS D8.

---

## Won't do — out of scope

These are deliberately excluded. Listed so future contributors don't accidentally re-litigate them.

- ❌ **Multi-user / social features.** No comments, follows, leaderboards, shared rides. Single-tenant by design.
- ❌ **Generic workout library.** Every default and threshold is calibrated to one athlete; "make it work for everyone" is the wrong direction.
- ❌ **Native app distribution.** PWA is the chosen path. Capacitor wrap may be revisited if iOS support becomes a hard requirement.
- ❌ **Real-time ride telemetry in the trainer-room.** Out of scope unless we move off the offline-first PWA model.
- ❌ **Coach ↔ athlete chat / messaging.** The AI coach is the only coach in v1.

---

## Sunset triggers

When to retire components rather than extend them.

- **v1 PWA** sunset trigger: iOS support becomes a real requirement → evaluate Capacitor wrap.
- **localStorage v1** sunset trigger: second device or second user → migrate to Supabase mirror (the keyed namespace is designed for this).
- **Browser-direct Anthropic call** sunset trigger: budget cap requirement or second user → introduce a server-side proxy.
- **Manual paste parser** sunset trigger: paste fatigue across the 20-day block, or Strava parser breakage from a Strava format change → ship Strava OAuth.

---

## How items move through the roadmap

1. A 💭 candidate gets discussed and either committed to (becomes ⏳) or moved to the "Won't do" list.
2. ⏳ items live here only while they're in flight. Each shipping commit moves the item to ✅ in the "Recently shipped" section and adds it to `CHANGELOG.md`.
3. ✅ items stay here for one or two release cycles, then graduate fully to `CHANGELOG.md` to keep this file scannable.

The point of this file is to be reviewable in five minutes. If it grows past two screens, prune.
