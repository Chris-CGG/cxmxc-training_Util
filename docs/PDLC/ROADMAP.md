# Roadmap

> Living document. ✅ shipped, ⏳ in flight, 💭 candidates. Sunset triggers and explicit out-of-scope items at the bottom.

---

## 🛑 PAUSED — Sprint 1 closed 2026-05-13

The product is **paused** pending two things:

1. **The Tulsa Tough Ace Peloton Fondo on 2026-06-06** — the v1 goal event. Pausing feature work lets the athlete use the current build through the remaining 24-day window without disruption.
2. **The v2 Strava-first architecture** — the right next chunk of work is a data-source rewrite, not more screens. See Sprint 2 candidates below.

The app stays live at <https://chris-cgg.github.io/cxmxc-training_Util/> and is fully functional for the athlete during the pause. See [`docs/SPRINT_1_CLOSE.md`](../SPRINT_1_CLOSE.md) for the wrap.

---

## Currently shipped — v1.0-alpha

Three screens: **Today / Log / Goals**. Tagged in `CHANGELOG.md` as `[2.0.0]` (technical release version); marketed as v1.0-alpha because the v2 architecture below is the real product target.

- ✅ Today screen — morning check-in, 5 sliders, readiness indicator, today's prescribed session with ROUVY tap-to-copy.
- ✅ Log screen — 3-input-method tabs (Photo / Paste / Manual), VS-Target comparison, **Copy for Claude** clipboard report.
- ✅ Goals screen — pre-seeded Tulsa + EHOTS cards, progress bars, history strips, Add-Goal modal, long-press delete.
- ✅ PWA installable on Android Chrome with offline cache.
- ✅ Public/private athlete-profile split (security audit, pre-public-repo).
- ✅ GitHub Pages deploy on every push to `main`.

---

## Historical releases

Full ledger in [`CHANGELOG.md`](./CHANGELOG.md):

- **v0.1.0** — initial 5-screen shell + 4 engine modules + PDLC framework.
- **v0.2.0** — Calendar tab, photo capture with Claude Vision, security audit + public/private split, retroactive Phase 0-5 backfill, UI debug pass.
- **v0.2.1** — QA fixes (RHR input rewrite, mobile overflow audit, photo gallery upload).
- **v2.0.0** — scope-locked 3-screen rebuild. Engines parked. Released as v1.0-alpha.

---

## Sprint 2 candidates — v2.0.0 (after Tulsa)

### Priority 1 — Strava API integration ⭐
- 💭 **Strava OAuth** flow with token refresh handling.
- 💭 **Activity webhook or polling** so logged rides flow into the app automatically.
- 💭 **Activity → session record mapping** — typed, derived, no flat localStorage blobs. This is the load-bearing piece of the v2 architecture.
- 💭 Paste and photo become **fallbacks** for activities Strava doesn't pick up (Garmin-only, ROUVY-only, edge cases).

### Priority 2 — Photo scan with Claude Vision
- 💭 Re-wire the parked `src/engine/vision.js` module.
- 💭 Bring back the editable-stat-cards UX from the v0.2.x build (auto-populate Manual fields from extracted JSON).
- 💭 Secondary input path. Strava is primary; photo handles the screens Strava can't see.

### Priority 3+ (in rough order)
- 💭 Reintegrate **stability** + **adaptation** engines into the Today screen with proper test coverage. Burst-crash detector (CLAUDE.md rule 9) comes back active.
- 💭 **Unplanned-activity ripple flow** — the field-training / protection-day feature from v0.2.x, re-integrated into Today and Log.
- 💭 **Calendar tab** reintroduced with the new Strava-backed data model.
- 💭 **Sustained-effort detection** — true 60-min sustained-power computation for the W/kg goal, not the simple "any session ≥ 45 min" heuristic the MVP uses.
- 💭 **AI coach direct call** back. Today's "Copy for Claude" stays as a manual escape hatch; in-app `askCoach` returns once Strava data feeds it real context.
- 💭 **Supabase mirror** for cloud sync + multi-device.
- 💭 **Accessibility v2 pass** — five gaps tracked in `docs/ACCESSIBILITY.md` (form-label associations, modal focus trap, opt-grid touch target sizing, slider aria-describedby, supplement-delete aria-label).
- 💭 **CSP meta tag** — security tighten.
- 💭 **Strava cleanups** — backfill historical rides, handle rate limits, link sessions to Strava activity IDs for round-tripping.

---

## Won't do — out of scope

- ❌ Multi-user / social features (single-tenant by design).
- ❌ Generic workout library (every default is calibrated to one athlete).
- ❌ Native app distribution (PWA is the chosen path).
- ❌ Real-time ride telemetry in the trainer-room.
- ❌ Coach ↔ athlete chat / messaging (the AI coach is the only coach).

---

## Sunset triggers

- **v1 PWA** sunset → iOS becomes a real requirement → evaluate Capacitor wrap.
- **localStorage v1** sunset → second device or second user → Supabase mirror.
- **Browser-direct Anthropic** sunset → budget cap or second user → server-side proxy.
- **Manual paste / photo** sunset → Strava OAuth ships in Sprint 2 (primary input).
- **MVP v2.0 shell** sunset → engine modules re-imported in Sprint 2 → v2.0.0 architecture replaces the hardcoded-athlete-identity shortcut.

---

## How items move through the roadmap

1. 💭 candidate → ⏳ in flight (with commit/PR) → ✅ shipped (with CHANGELOG entry).
2. ✅ items stay in "currently shipped" for one release cycle, then graduate fully to `CHANGELOG.md`.
3. Anything that doesn't fit Sprint 2 priorities by the time Sprint 2 starts moves to "deferred" or "won't do" — no orphan candidates.

The point of this file: scannable in under five minutes. Prune as needed.
