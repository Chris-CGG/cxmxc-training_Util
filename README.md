# CxMxC Training

> Single-athlete training PWA for **Chris Clarke-Gonzalez (CxMxC)** preparing for the **Tulsa Tough Ace Peloton Fondo on 2026-06-06** (103 mi). Calibrated to one athlete's documented history of burst-crash cycles and panic attacks under load — mental state is treated as physiology, not weakness.

The app runs offline-first, installs as a PWA on Android, and reads three authoritative JSON files in `src/data/` as source of truth. Every athlete-specific value (FTP, zones, thresholds, race dates) is read at runtime; nothing is hardcoded in JS or HTML.

This is **not** a generic training app. Every default, threshold, and copy choice is shaped to one person.

---

## What's inside

- **Mood-gated daily Check-In.** Five sliders + resting HR feed a stability score (0-100, green/yellow/red bands). The score determines the *tone* of every other screen for the day.
- **Burst-crash detection.** A 3+ day pattern detector watches for the documented stress-driven crash cycle and surfaces flags before the cliff arrives. Logic in `src/engine/stability.js`.
- **20-day Tulsa Tough block.** Three phases (Power & Repeatability → Ace Peloton Simulation → Taper & Sharpen) rendered from `src/data/training-plan.json`, with curated ROUVY route suggestions per session type.
- **Field Training (unplanned activity).** Flag a group ride or unscheduled outdoor session before it happens; the engine proposes a plan ripple (replace, downgrade, protection day, RHR check, buffer absorbed); the athlete approves or rejects. Nothing auto-applies.
- **Strava + ROUVY paste parsers.** Drop activity text into a textarea, the parser pulls duration, distance, avg power, NP, avg HR, cadence, IF, TSS.
- **Daily log.** Water grid (8 oz cells, 100 oz target), supplement add/check/remove, merged check-in + session history, 14-day stability trend bars with burst-crash watch.
- **AI coach.** Anthropic Messages API, browser-direct, key on-device only. Every prompt includes today's mood-gate band and stability score (non-negotiable).
- **Dark / light theme.** Real second theme, not a half-built afterthought. Bebas Neue for headers, DM Mono for data.

---

## Quickstart

The app is a single static `index.html` plus three JSON files and four ES modules. No build step.

### Run locally

```bash
git clone <repo-url> cxmxc-training
cd cxmxc-training
python3 -m http.server 8080
# open http://localhost:8080
```

A static server is required — `file://` won't work because of the JSON `fetch` calls and the service worker registration.

### Install as PWA on Android

1. Serve the directory on your LAN: `python3 -m http.server 8080 --bind 0.0.0.0`.
2. Note your Mac's LAN IP: `ipconfig getifaddr en0` (or `hostname -I` on Linux).
3. On the Android device (same WiFi), open Chrome and navigate to `http://<your-lan-ip>:8080`.
4. Three-dot menu → **Install app**.

### AI coach setup

The coach is opt-in and per-device. Open **Profile → AI Coach**, paste your Anthropic API key. The key is stored only in this device's `localStorage` and is never sent to any non-Anthropic origin. Default model: `claude-sonnet-4-6`.

---

## Project structure

```
/index.html                     PWA shell (5 screens, inline CSS, ES module)
/manifest.json                  PWA manifest, standalone display
/service-worker.js              Offline cache: shell + data + engine modules
/icon.svg                       Maskable app icon
/.env.example                   Placeholder; real keys live in localStorage on-device

/src/data/
  athlete-profile.json          AUTHORITATIVE — Chris's profile, zones, thresholds, goals
  training-plan.json            AUTHORITATIVE — 20-day Tulsa Tough block
  rouvy-routes.json             Curated ROUVY library (25 routes + 23 workouts)

/src/engine/
  stability.js                  Stability score + burst-crash pattern detection
  adaptation.js                 Mood-gated guidance + structured session adaptations
  ai-coach.js                   Anthropic API browser-direct wrapper
  unplanned.js                  TSS estimation + ripple computation + coaching note

/src/components/                v2 destination for screen-component split (empty in v1)
/src/styles/                    v2 destination for CSS extraction (empty in v1)

/docs/
  DISCOVERY.md                  Phase 0 — problem, user, constraints, success metrics
  TECH_DECISIONS.md             Phase 1 — stack choices, alternatives, when to revisit
  architecture.md               Phase 1 — ERD, component graph, state flows (Mermaid)
  PDLC/                         Reusable Product Development Lifecycle framework
    README.md                   Framework overview
    PHASES.md                   The seven phases
    GATES.md                    Per-phase checklists + Claude's automatic refusals
    CLAUDE_PROTOCOL.md          How Claude behaves inside this framework
    CXMXC_REFERENCE.md          Honest retrospective on this project
    CHANGELOG.md                Keep-a-Changelog format, v0.1.0 onward
    NEW_PROJECT_TEMPLATE.md     Copy-paste CLAUDE.md for new projects

/CLAUDE.md                      Project contract — read this first
```

---

## Authoritative files

Two JSON files are the single source of truth for athlete-specific values:

- `src/data/athlete-profile.json` — identity, baseline numbers, thresholds, zones, goals.
- `src/data/training-plan.json` — the 20-day Tulsa Tough block.

Per `CLAUDE.md` rule 1, these files **must not be modified silently**. Changes require explicit human approval. Plan completion and unplanned-activity adjustments are stored as separate localStorage *overlays* and merged at render time so the JSON files stay pristine.

`src/data/rouvy-routes.json` is a curated library and may be edited freely, but entries referenced from `training-plan.json` (`rouvy_workout`, `rouvy_route`) must remain present.

---

## Documentation

Read these in order if you're new to the project:

1. **`CLAUDE.md`** — project brief, the athlete, language rules, 10 development rules. The contract.
2. **`docs/DISCOVERY.md`** — problem statement, user profile, constraints, success metrics, assumptions, out-of-scope.
3. **`docs/architecture.md`** — ERD, component graph, state flows. Mermaid diagrams render on GitHub.
4. **`docs/TECH_DECISIONS.md`** — what stack was chosen, what was rejected, why, when to revisit.
5. **`docs/PDLC/`** — the reusable framework this project is the reference implementation of.

For the honest account of how each PDLC phase was actually executed (including the parts that were retroactive), see `docs/PDLC/CXMXC_REFERENCE.md`.

---

## Compliance posture

The athlete profile is **personal-health-adjacent data**. The product:

- Stores the profile in source as JSON because v1 is single-user single-device.
- Never logs the profile to a remote service.
- Never embeds profile data in URLs or query strings.
- Sends a curated subset (not the full profile) to the Anthropic API for coach calls.
- Stores the API key only in the device's `localStorage`. Never in source, never in `.env.example`.

Org-level constraints applied: ISO 27001, NIST 800-171, HIPAA-adjacent, PCI, CMMC Level 2, NIST AI RMF.

For the security checklist results, see `docs/SECURITY.md`.

---

## Contributing

There is currently one user and one contributor. If that changes, the contract is `CLAUDE.md` and the framework is `docs/PDLC/`. Read both before opening a PR.

The non-negotiables (from `CLAUDE.md`):

- Never overwrite `src/data/athlete-profile.json` or `src/data/training-plan.json` without explicit permission.
- Use the project's mental-health language: *"nervous system load"*, not "anxiety". *"Carrying weight"*, not "stressed". *"Field training"* / *"protection day"*, not "disruption" / "rest".
- ERG mode default is OFF unless a session explicitly says otherwise.
- One feature per commit. Test in browser before commit.
- Document as you build; data schemas update in the same commit as the change.

---

## Status

**v0.1.0** — MVP shipped to its single user. Installed as PWA on Android Chrome. Day 1 ride data captured. Currently in PDLC Phase 6 (iteration). The "Field Training" feature was the first iteration.

Public deployment URL: pending (Phase 5 backfill). Until then, run locally per Quickstart.

For what's next, see `docs/PDLC/CHANGELOG.md` and the open questions section of `docs/DISCOVERY.md`.

---

## License

[ Add license here. Currently unspecified — internal use only. ]

---

*Built with Claude Code. The Product Development Lifecycle framework in `docs/PDLC/` was extracted from this project as a reusable standard.*
