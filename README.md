# CxMxC Training

> Single-athlete training PWA for **CxMxC** preparing for the **Tulsa Tough Ace Peloton Fondo on 2026-06-06** (103 mi). Calibrated to one athlete's documented history of burst-crash cycles and panic attacks under load — mental state is treated as physiology, not weakness.

**Status: v1.0-alpha · paused pending v2 Strava architecture and the Tulsa race itself.**

Live: <https://chris-cgg.github.io/cxmxc-training_Util/>

The current build is a three-screen MVP (Today / Log / Goals). It runs as a PWA installable on Android Chrome. Sprint 1 wrapped on **2026-05-13**; Sprint 2 begins after Tulsa Tough.

---

## What works

- **Today screen.** Morning check-in with resting-HR input (`type="text" inputmode="numeric"`) + five 1-10 sliders (Sleep, Legs, Mood, Carrying Weight, Soreness). Three-state readiness indicator (🟢 READY / 🟡 REDUCED / 🔴 PROTECT) computed from HR + slider averages with hard overrides for high soreness/load. Today's prescribed session reads from `src/data/training-plan.json`; ROUVY workout/route names are tap-to-copy. On yellow/red days an adapted session is shown (red → Protection Day, 45 min Z1).
- **Log screen.** Three input methods — 📷 Photo / 📋 Paste / ✏️ Manual — feeding one in-memory record. Paste tab has a regex-based extractor for power / HR / cadence / duration / TSS / IF / distance from typical Strava and ROUVY summary text. Manual tab is 10-button RPE grid + numeric inputs + mi/km toggle. **Copy for Claude** generates the day's full report (check-in + session + VS-targets + goal progress) and writes it to the clipboard for paste into Claude.ai.
- **Goals screen.** Pre-seeded with Tulsa Tough + EHOTS RGV. Per-metric progress bars (W/kg, cadence, longest ride) coloured by completion percent. Tap-to-expand history shows the last five logged values. "+ Add Goal" modal supports custom metric tracking; long-press a goal card to delete.
- **PWA.** Installable on Android Chrome; offline cache via service worker; dark + light theme; deployed via GitHub Actions to GitHub Pages on every push to `main`.

## What doesn't work yet

- **Photo extraction → Claude Vision** is not wired in this build. The Photo tab attaches a preview but does not call the Vision API. The v0.2.x engine module (`src/engine/vision.js`) is on disk but parked — Sprint 2 will re-wire it.
- **Strava API integration.** Manual paste / manual entry only. Strava OAuth is **v2 priority 1**.
- **Sustained-effort detection.** W/kg "best of" treats any session ≥ 45 min as eligible; it doesn't compute true 60-min sustained-power yet.
- **Engine modules** (`src/engine/stability.js`, `adaptation.js`, `ai-coach.js`, `unplanned.js`, `vision.js`) are on disk but **not imported** by the MVP shell. They had Sprint-1 test coverage and a clean module surface — Sprint 2 wires them back into screens that actually need them.
- **Cloud sync.** localStorage only. v2 candidate.
- **AI coach direct call.** "Copy for Claude" is the bridge — the in-app `askCoach` path from v0.2.x is parked alongside the other engines.
- **Unplanned-activity ripple flow.** Existed in v0.2.x; not in the v2.0 rebuild. Sprint 2 candidate.

## What the v2 architecture should be

- **Strava as the source of truth.** OAuth, activity webhook or polling, automatic ride pickup. A session record is derived from a Strava activity plus athlete-side annotations (RPE, fueling notes, subjective state). Paste and photo become fallbacks for activities Strava doesn't pick up, not primary inputs.
- **Engine modules reintegrated.** Stability (with the burst-crash detector that's protected by CLAUDE.md rule 9), adaptation (mood-gated guidance), ai-coach (parameterized prompt), unplanned (TSS + ripple), vision (photo extraction). Pure modules with tests, wired into screens that genuinely consume them.
- **Proper data architecture.** Strongly-typed session and check-in objects backed by Supabase mirror once a second device exists. The on-device-only privacy posture from the security audit continues for the athlete-private fields (identity + medical).
- **Multi-athlete-ready** without rewriting. The single-tenant assumption stays for v1, but the data model and the engine prompt should not bake in one athlete's identity (already addressed for the AI coach in the v0.2.x security audit; the MVP shell currently re-bakes it for simplicity and will need to be un-baked in v2).

A post-mortem capturing Sprint 1 lessons will land at [`docs/POST_MORTEM.md`](./docs/POST_MORTEM.md) before Sprint 2 starts.

---

## Project structure

```
/index.html                     MVP v2.0 shell — 3 screens, no engine imports
/manifest.json                  PWA manifest (theme #0a0a0f, standalone)
/service-worker.js              Cache cxmxc-v7, stale-while-revalidate
/icon.svg                       Maskable app icon

/src/data/
  athlete-profile.json          AUTHORITATIVE (sanitized — see docs/SECURITY.md)
  training-plan.json            AUTHORITATIVE — 20-day Tulsa block
  rouvy-routes.json             Curated ROUVY library
  athlete-private.example.json  Template for the gitignored private file

/src/engine/                    PARKED for Sprint 2 (not imported by v2.0 shell)
  stability.js                  Stability score + burst-crash detection
  adaptation.js                 Mood-gated guidance
  ai-coach.js                   Anthropic browser-direct wrapper
  unplanned.js                  Unplanned-activity TSS + ripple
  vision.js                     Claude Vision extraction

/tests/engines.test.mjs         28 smoke tests against the parked engines
                                (still passing — engines weren't touched)

/docs/
  DISCOVERY.md                  Phase 0 — problem, user, constraints
  TECH_DECISIONS.md             Phase 1 — D1-D10 stack rationale
  architecture.md               Phase 1 — Mermaid ERD + component graph
  SECURITY.md                   Phase 4 — checklist + public/private split audit
  ACCESSIBILITY.md              Phase 4 — WCAG audit + procedures
  PERFORMANCE.md                Phase 5 — Lighthouse baseline procedure
  SPRINT_1_CLOSE.md             Sprint 1 wrap (this milestone)
  POST_MORTEM.md                forthcoming — pre-Sprint-2
  PDLC/
    README.md                   Framework overview
    PHASES.md / GATES.md        Process spec
    CLAUDE_PROTOCOL.md          How Claude operates inside the framework
    CXMXC_REFERENCE.md          Honest retrospective on this project
    CHANGELOG.md                Full release ledger
    ROADMAP.md                  v2 candidates, sunset triggers
    NEW_PROJECT_TEMPLATE.md     Copy-paste CLAUDE.md for new projects

/CLAUDE.md                      Project contract — read this first
```

---

## Quickstart

```bash
git clone https://github.com/Chris-CGG/cxmxc-training_Util cxmxc-training
cd cxmxc-training
python3 -m http.server 8080
# open http://localhost:8080
```

Static server is required (the JSON fetches and service-worker registration don't work over `file://`).

Install as PWA on Android:
1. Open <https://chris-cgg.github.io/cxmxc-training_Util/> in Chrome.
2. Three-dot menu → **Install app**.

---

## Authoritative files + compliance

Two JSON files are read-only by default per CLAUDE.md rule 1:
- `src/data/athlete-profile.json` (sanitized public version — identity / biometric / medical fields are `null`).
- `src/data/training-plan.json` (20-day block).

Real identity values live in a **gitignored** `src/data/athlete-private.json`; the v0.2.x shell merged them at boot. The MVP v2.0 shell hardcodes athlete identity inline (override of rule 5 for simplicity) — Sprint 2 will move that back to a merged-profile read.

See [`docs/SECURITY.md`](./docs/SECURITY.md) for the full audit and the move list. Compliance posture: ISO 27001, NIST 800-171, HIPAA-adjacent, PCI, CMMC Level 2, NIST AI RMF.

---

## Contributing

Single-author project for v1. If that changes, the contract is `CLAUDE.md` and the framework is `docs/PDLC/`. Read both before opening a PR.

Non-negotiables from `CLAUDE.md`:
- Never overwrite `src/data/athlete-profile.json` or `src/data/training-plan.json` without explicit permission.
- Use the project's mental-health language: *"nervous system load"*, not "anxiety". *"Carrying weight"*, not "stressed". *"Field training"* / *"protection day"*, not "disruption" / "rest".
- ERG mode default is OFF unless a session explicitly says otherwise.
- One feature per commit. Test in browser before commit. Document as you build.

---

## License

[ Add license here. Currently unspecified — internal use only. ]

---

*Sprint 1 closed 2026-05-13. Sprint 2 begins after Tulsa Tough on 2026-06-06.*
