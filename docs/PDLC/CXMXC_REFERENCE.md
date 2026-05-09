# cxmxc-training Reference Implementation

> An honest account of how the cxmxc-training project executed each PDLC phase. The phases are defined in `PHASES.md`; this document evaluates them against what actually happened. The project started building before architecture was complete. That is a lesson, not a failure — and worth documenting precisely so the next project does not repeat it.

This file is intentionally critical. The framework only earns trust if its first reference implementation is reviewed candidly.

---

## Phase status snapshot

Updated **2026-05-08** after the PDLC backfill pass closed the named gaps. Items still pending real-device verification are flagged in the per-phase sections below.

| Phase | Status   | Notes                                                                                          |
|-------|----------|------------------------------------------------------------------------------------------------|
| 0     | Done     | `docs/DISCOVERY.md` backfilled (commit 4aa991c).                                               |
| 1     | Done     | `docs/architecture.md` (Mermaid ERD + component graph + state flows) and `docs/TECH_DECISIONS.md` backfilled. |
| 2     | Done     | Scaffold commit was clean; `README.md` content backfilled (commit 8c6ff85); CLAUDE.md timing remains a documented past gap.|
| 3     | Done     | Strong feature-by-feature execution with substantive commits.                                  |
| 4     | Mostly done | Smoke test suite (commit 6d2f360) + security checklist (aefada2) + accessibility audit (cbc55e6) all in. Two items pending real-device verification: console-error sweep (procedure in `docs/SECURITY.md`) and TalkBack/keyboard/color-vision/touch walks (procedure in `docs/ACCESSIBILITY.md`). One tracked v2 gap: no CSP header. |
| 5     | Mostly done | GitHub Pages workflow added (commit 764d298) — needs one push to main + Pages source toggle to go live. Feedback link in Profile screen (f309173). Performance baseline procedure in `docs/PERFORMANCE.md` pending real-device run. Env-var management deferred to v2 (no shared secrets in v1). |
| 6     | Active   | Currently here — unplanned-activity feature was iteration 1; PDLC backfill is iteration 2.    |

---

## Phase 0 — Discovery

### How we executed it

We did not, formally. The project started with an athlete profile JSON and a 20-day training plan JSON already populated by the athlete. Those files captured a great deal of what `DISCOVERY.md` would have contained — the user, the constraints, the mental-health considerations, the goals — but in compressed JSON form rather than as discursive prose.

### What we got right

- The athlete profile *did* document the user concretely: age, weight, FTP, breathing condition, panic-attack history, burst-crash pattern, heat sensitivity, stress-FTP correlation. These are the kinds of facts a Phase 0 interview would surface; they were already on the page.
- Mental-health considerations were treated as physiological data from day one, in line with how the user wanted to be coached. The framing did not have to be added in retrofit.

### What we should have done differently

- **An explicit `DISCOVERY.md` would have caught the unplanned-activity gap before it became a real-world problem.** Day 2 of the training block was a rest day; Day 3 carried a 100km group ride that the prescribed plan did not model. The feature to handle that case (the "Field Training" feature, commit 582f3c4) shipped reactively. A Phase 0 question — "what does a typical week look like for you, including the days that are not scheduled?" — would have surfaced it in advance.
- Success metrics were never written down. The product is *probably* working when Chris uses it daily; we have no harder definition.
- The assumptions list does not exist. Many assumptions are baked into the code (e.g., "Strava paste is enough; no API integration needed in v1") and only knowable by reading.

### Artifacts that exist vs. artifacts that are missing

- **Exist**: athlete profile, training plan, ROUVY library — all in `src/data/`.
- **Missing**: `DISCOVERY.md`, success metrics, assumptions log, out-of-scope list.

---

## Phase 1 — Architecture

### How we executed it

Architecture emerged during the build. The split between "authoritative JSON files in `src/data/`" and "logic in `src/engine/*.js` modules" was not designed up front; it was extracted after the inline shell got too dense (commit d088593, "feat(engine): add stability, adaptation, and ai-coach modules"). The data schema was documented exhaustively, but only after the build (commit 77f2cd1, "docs: add data schemas section to CLAUDE.md").

### What we got right

- The eventual architecture is clean: pure engine modules, a thin shell, JSON files as the single source of truth for athlete data.
- The state-management approach (localStorage under a single `cxmxc.*` namespace) is consistent and v2-Supabase-compatible.
- External dependencies are minimal and named: ROUVY (no API, curated library), Strava (manual paste), Anthropic (browser-direct fetch).

### What we should have done differently

- **No Mermaid diagrams exist.** ERD, component graph, state flow — all of these would have been useful for handing the project off, and would have surfaced the engine/shell split before the inline shell forced the issue.
- **No `TECH_DECISIONS.md`.** The choice of vanilla HTML/CSS/ES modules over a framework was load-bearing — it determined the shape of the shell, the deployment story, the offline strategy — but is undocumented.
- **The data schema documentation lives inside `CLAUDE.md`** rather than in a dedicated `DATA_SCHEMA.md`. This works but couples the schema to the project brief, which is going to fight us when we try to reuse the schema doc on a new project.

### Artifacts that exist vs. artifacts that are missing

- **Exist**: Data schemas section in `CLAUDE.md`; engine module file headers describing each module's role and contracts.
- **Missing**: `architecture.md`, ERD diagram, component graph, state-flow diagram, `TECH_DECISIONS.md`.

---

## Phase 2 — Foundation

### How we executed it

The first commit (`init: project scaffold`, 745dd63) created the directory structure with empty placeholder files in `src/components/`, `src/engine/`, `src/styles/`, `src/data/`, plus root-level `index.html`, `manifest.json`, `service-worker.js`, `package.json`, `.gitignore`, `.env.example`, and `README.md`. The shape was correct from the start.

### What we got right

- The scaffold commit was a clean skeleton with no implementation — exactly what Phase 2 demands.
- Naming conventions matched the architecture: `src/engine/*.js` for logic, `src/data/*.json` for authoritative data, `src/components/` and `src/styles/` left as named-but-empty v2 destinations.
- The data files (`athlete-profile.json`, `training-plan.json`) were populated with correct schema before any code referenced them.

### What we should have done differently

- **`CLAUDE.md` was delayed.** It landed in commit 1f2d1da, after the data files (90f885e) and the ROUVY library (26d6c62). Phase 2 says CLAUDE.md is part of the foundation; we treated it as documentation. Any contributor between scaffold and CLAUDE.md would have been working without the contract.
- **`README.md` was created empty and remained empty.** Phase 2 says README shell — title, paragraph, link to docs. We deferred this to Phase 4, and Phase 4 has not closed it.
- **No commit-convention document.** The convention is followed (descriptive messages, `feat(scope): summary` format, co-author trailer) but is not written down anywhere a contributor could find it.

### Artifacts that exist vs. artifacts that are missing

- **Exist**: Clean scaffold; data files; PWA stubs (manifest, service worker, icon); `.env.example`.
- **Missing**: README content; commit-convention doc; structure validation step.

---

## Phase 3 — Core Build

### How we executed it

Strong execution. Features were built one at a time, each in its own commit with a substantive message. The build order, in commit-history form:

```
init: project scaffold
data: populate authoritative athlete profile and 20-day training plan
feat(data): add curated ROUVY routes and workouts library
docs: add CLAUDE.md project brief and development rules
feat(engine): add stability, adaptation, and ai-coach modules
feat(pwa): build 5-screen app shell with offline support
docs: full JSDoc + file headers + section banners across the codebase
docs: add data schemas section to CLAUDE.md and refresh file map
feat(unplanned): flag-before / log-after unplanned activity with ripple
```

### What we got right

- One commit per logical change. The history reads as a build log, not a stream-of-consciousness.
- Engine modules were extracted from the inline shell at the right moment — before more features piled on top.
- Tested in the target environment before each commit (browser locally, then Android Chrome over LAN).
- Documentation kept pace with the code from commit be60fa4 onward (the JSDoc pass).

### What we should have done differently

- **The MVP was a vibe judgment.** Without `DISCOVERY.md`, "is the MVP done?" was answered by feel rather than by checking the feature list against a documented core problem.
- **The unplanned-activity feature was an iteration that probably belonged in the MVP.** A 20-day training block with no model for outdoor rides is a known gap, not an enhancement.

### Artifacts that exist vs. artifacts that are missing

- **Exist**: All MVP features, each in its own commit, all tested before commit, all documented at the moment of writing (post-commit be60fa4).
- **Missing**: A documented MVP feature list to check completion against.

---

## Phase 4 — Hardening

### How we executed it

Documentation was the strong suit. Code-level documentation is comprehensive: every export has JSDoc, every file has a header explaining its role, every module names its contracts. The data schemas in `CLAUDE.md` are exhaustive, including invariants per file. Beyond docs, hardening is partial.

### What we got right

- JSDoc + file headers commit (be60fa4) covered every JS file in the project at the agreed comment standard.
- Data schemas commit (77f2cd1) documents every key in every authoritative JSON file with shape, units, and the runtime that reads it.
- Error handling on the API key path is explicit (key prompt, dangerous-direct-browser flag, on-device-only storage, no key in source).
- Compliance posture noted in `CLAUDE.md` (rule 8): treat athlete profile as personal-health-adjacent, never log to a remote service, never embed in a URL.

### What we should have done differently

- **No README content.** The README is one line. Phase 4 says complete README; we are not there.
- **No Mermaid architecture diagrams.** The textual architecture is in `CLAUDE.md`, but a visual ERD and component graph have not been generated.
- **No formal security checklist.** Rule 8 captures the posture, but nothing was checked end-to-end.
- **No accessibility audit.** Keyboard nav, contrast, screen reader sanity — not reviewed.
- **No test harness.** The smoke tests done at commit time were ad-hoc Node imports of the engine modules; no automated suite exists.
- **No console-error sweep.** "No console errors in normal use" was assumed, not verified.

### Artifacts that exist vs. artifacts that are missing

- **Exist**: JSDoc + headers; data schemas; commit hygiene; PWA install verified on Android; service worker offline cache works.
- **Missing**: README content; Mermaid diagrams; security checklist; accessibility audit; test harness; console-error pass.

---

## Phase 5 — Deployment

### How we executed it

The PWA was successfully installed on Android Chrome from a local LAN server (`http://192.168.40.201:8080`). The home-screen icon launches the app standalone. Day 1 ride data has been seeded and is rendering on the device.

### What we got right

- PWA install confirmed on the target device.
- Service worker is registered; offline cache contains the app shell, data files, and engine modules.
- First real ride data (Day 1 Kona benchmark + High Cadence Drills PM session) is captured and displayed.

### What we should have done differently

- **No public deployment URL.** GitHub Pages, Vercel, Netlify — none configured. The deployment is "works on my LAN", which is short of Phase 5 spec.
- **Environment variables are not in a secret store.** The Anthropic API key lives in `localStorage` per the design (which is correct for this project) but there is no env-var management for any future shared secrets.
- **No performance testing on slow networks.** The athlete is on a fast home WiFi; behavior on LTE or in a basement is unmeasured.
- **No feedback collection mechanism.** Issue tracker, form, channel — none.

### Artifacts that exist vs. artifacts that are missing

- **Exist**: Working PWA install on Android; offline-capable service worker; seeded real data.
- **Missing**: Public URL; env-var management; performance numbers; feedback channel.

---

## Phase 6 — Iteration

### How we executed it

Phase 6 is the current phase. The unplanned-activity feature (commit 582f3c4, "feat(unplanned): flag-before / log-after unplanned activity with ripple") was the first iteration — a real-world need (Chris had a 100km group ride mid-block) drove a focused feature with full schema docs and a coaching-note builder honoring the project's language rules.

### What we are getting right so far

- Each iteration is in its own commit.
- Schema and language-rule documentation updated in the same commit as the change (CLAUDE.md got the unplanned-activity local-state schema and the new "field training / protection day" language rules).
- Engine logic stays pure; the shell stays thin.

### What to watch for

- `CHANGELOG.md` was not maintained during the build. Seeding it now (this PDLC pass) puts v0.1.0 on the record retroactively. Future iterations must update CHANGELOG in the same commit as the feature.
- Regression testing is currently manual and ad-hoc. This is acceptable for a single-author project but is the first thing to systematize when a second contributor arrives.

---

## Retroactive fixes applied

These items belong to earlier phases but were addressed mid-project, late, or are still pending. Documenting them so the next project does not repeat them.

### Closed in the PDLC backfill pass (2026-05-08)
- **`DISCOVERY.md`** — Phase 0 deliverable; backfilled (commit 4aa991c). Problem statement, user profile, constraints, success metrics, A1-A10 assumptions, out-of-scope list, open Phase 6+ questions.
- **`TECH_DECISIONS.md`** — Phase 1 deliverable; backfilled (commit bd1cab0). Ten decisions D1-D10 each with chosen/rejected/why/when-to-revisit.
- **`docs/architecture.md`** with Mermaid diagrams — Phase 1 deliverable; backfilled (commit 397a8cb). Data ERD, component graph, two state-flow sequence diagrams, lifecycle state machine, external dependencies table, security/privacy notes.
- **README content** — Phase 2 deliverable; backfilled (commit 8c6ff85). Quickstart, project structure, authoritative-files note, doc reading order, compliance posture summary, contributing rules.
- **Smoke test suite** — Phase 4 deliverable; added in commit 6d2f360 along with a populated `package.json`. 25 tests across all four engine modules; runs in <100 ms with `node --test tests/*.test.mjs`.
- **`docs/SECURITY.md`** — Phase 4 deliverable; commit aefada2. Security checklist walked against the v0.1.0 codebase, 7 pass + 2 tracked gaps (no CSP header, HTTP on LAN dev). Console-error sweep procedure included for the user to run on the target device.
- **`docs/ACCESSIBILITY.md`** — Phase 4 deliverable; commit cbc55e6. WCAG-AA audit, 10 strong items + 5 tracked gaps for v0.2.0. TalkBack / keyboard / color-vision / touch procedures for real-device verification.
- **GitHub Issues feedback link** — Phase 5 deliverable; commit f309173. Profile screen card with one-click link to repo Issues.
- **GitHub Pages deploy workflow** — Phase 5 deliverable; commit 764d298. `.github/workflows/deploy.yml` runs npm test then publishes the static site.
- **`docs/PERFORMANCE.md`** — Phase 4/5 deliverable; commit dea8125. Lighthouse-mobile baseline procedure with concrete acceptance criteria; results table pending real-device run.

### Closed during the v0.1.0 build
- **`CLAUDE.md` timing** — Phase 2 deliverable; landed in commit 1f2d1da, after data and ROUVY library. Past gap, no longer fixable.
- **Engine extraction** — Phase 3 / refactor; landed in commit d088593 after the inline shell got too dense. Right call, but should have been the architecture from day one.
- **JSDoc + file headers** — Phase 4 deliverable; landed in commit be60fa4 as a thorough retroactive pass. Going forward the rule is "documented at the moment of writing".
- **Data schemas in `CLAUDE.md`** — Phase 1 deliverable; landed in commit 77f2cd1 as a section in `CLAUDE.md`. Functional but coupled to the project brief.
- **`CHANGELOG.md`** — should have been maintained throughout. Seeded with v0.1.0 in commit a31771a; the backfill pass itself logged in `[Unreleased]`.

### Pending real-device verification
- **Console-error sweep** — procedure in `docs/SECURITY.md`; results table pending.
- **TalkBack / keyboard / color-vision / touch walks** — procedure in `docs/ACCESSIBILITY.md`; results table pending.
- **Lighthouse-mobile baseline** — procedure in `docs/PERFORMANCE.md`; numbers pending the live deployment.

### Tracked for v0.2.0+
- **CSP header** — `docs/SECURITY.md` includes a proposed meta-tag policy; v1 surface is narrow enough that the gap is low priority.
- **Five accessibility gaps** — form-label `for`/`id` association, modal focus trap, opt-grid touch target sizing, slider `aria-describedby`, supplement-delete `aria-label`. All fixable in a focused v0.2.0 accessibility commit.
- **Env-var management** — deferred until v2 introduces shared secrets (Supabase mirror).

### Habits that did not need retroactive fixing
- **Commit discipline** — enforced from the start. Every change in its own commit with a substantive message.

---

## What this project does right

The framework is being extracted from this project because some choices in cxmxc-training are not just adequate — they are good ones to copy.

- **Athlete profile as the single source of truth.** Every athlete-specific value lives in `src/data/athlete-profile.json`. There are no FTP, zone, threshold, or goal numbers hardcoded in JS or HTML. Changing the athlete is a JSON edit, not a refactor.
- **Mental-health considerations baked into the architecture, not bolted on.** The mood gate, the stability score, the burst-crash pattern detector, the language rules — these are first-class concerns, designed in, not retrofitted.
- **Data files completely separate from logic.** The three JSON files in `src/data/` are read at runtime; the engine modules in `src/engine/` are pure. The shell wires them together. This split makes the engine portable to a worker, an Edge Function, or a CLI without rewriting.
- **Mood gate as the primary UX driver.** The same screen reads differently on a green day vs. a red day, and that difference is enforced by the engine, not by ad-hoc UI logic. This is the project's defining UX principle.
- **Stability score as burst-crash detection.** A documented burst-crash pattern in the athlete's history was treated as a system requirement, not a story. The pattern detector is non-removable per `CLAUDE.md` rule 9; even if the UI ignores its output in a given build, the engine keeps producing it.
- **Authoritative-file discipline.** `athlete-profile.json` and `training-plan.json` are protected by `CLAUDE.md` rule 1. Modifications require explicit human override. The plan completion overlay (`cxmxc.completed`) and unplanned-activity overlay (`cxmxc.unplanned`) compose at render time without mutating the JSON.
- **Engine modules are pure.** No DOM, no localStorage, no fetches inside the engines. Caller passes in everything; engine returns plain values. Test in five seconds, port to anywhere in five minutes.
- **Language rules are enforced as code, not as wishful thinking.** The unplanned-activity engine bakes "field training", "peloton simulation opportunity", "protection day", and "buffer absorbs the load" into the coaching-note builder so the wrong phrasing is harder to write than the right one.

These are the seeds for any future project that wants to take itself seriously about user-context-driven design.
