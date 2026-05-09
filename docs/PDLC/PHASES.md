# PDLC Phases

> The seven phases of the CxMxC Product Development Lifecycle. Each phase is gated; you cannot proceed to the next phase without passing its exit gate. See `GATES.md` for the per-phase checklists.

A phase is *not* a sprint, a milestone, or a calendar period. A phase is a contract: a defined set of activities that produce a defined set of artifacts. You are in exactly one phase at a time. The framework is technology-agnostic — same phases apply to a PWA, a CLI, a backend service, or a hardware project.

---

## Phase 0 — Discovery

**Objective.** Understand the problem deeply before writing a line of code.

**Entry criteria.** A problem statement exists, even if it is one sentence on the back of a napkin. *That sentence is enough to start Phase 0; nothing else is.*

**Activities.**
- Stakeholder interview — even when stakeholder = builder. Treat yourself as a real user with a real day; do not collapse the interview into a monologue.
- Define the user, their context, and the constraints they live under.
- If the product touches mental health, wellbeing, recovery, or anything emotionally adjacent: explicitly enumerate the considerations. This is non-optional.
- Identify the data sources and integrations the product needs.
- Define success metrics — what does "the product is working" actually mean?
- Document assumptions explicitly. Every assumption is a risk; surfaced ones are managed, hidden ones explode mid-build.

**Claude's role.**
- Ask questions. Challenge assumptions. Pull at vague language ("intuitive", "smart", "easy") until it is concrete.
- Surface the assumptions the human is treating as facts.
- **Never suggest solutions yet.** Phase 0 is for understanding the problem; the moment a solution is on the page, the problem stops being interrogated.

**Human's role.**
- Answer honestly, including the parts that feel embarrassing or unrelated.
- Resist the urge to jump to solutions. The cost of over-defining the problem is a slow Phase 0; the cost of under-defining it is a wrong product.
- Make the call on what is in scope and what is not.

**Deliverables.**
- `DISCOVERY.md` containing:
  - Problem statement (1-3 sentences).
  - User profile — who they are, what their day looks like, what they bring to the product, what the product must respect about them.
  - Constraints — time, money, hardware, regulatory, emotional, accessibility.
  - Success metrics — how you'll know it's working.
  - Assumptions list — explicit, dated, owned.
  - Out-of-scope list — things this product is *not*.

**Exit gate.** Can you describe the user's daily interaction with the product in three sentences without mentioning technology, frameworks, or implementation details? If not — go back.

**Reference implementation (cxmxc-training).**
> cxmxc-training did *not* run a formal Phase 0. The athlete profile JSON served as a compressed proxy — it captured the user, constraints, and mental-health considerations, but the assumptions list and success metrics were never written down explicitly. A 30-minute Phase 0 would have surfaced "what about unplanned outdoor rides?" before Day 2 of training instead of after Day 1's unplanned mid-session gearing issue. Lesson: skipping Discovery does not save time; it relocates the cost.

---

## Phase 1 — Architecture

**Objective.** Design the system before building it.

**Entry criteria.** `DISCOVERY.md` exists and the human has approved it.

**Activities.**
- Define data entities and their relationships (ERD).
- Define component architecture — what owns what, what calls what.
- Define state management approach — where state lives, who reads, who writes.
- Define API contracts and integration boundaries — for every external system, what flows in and what flows out.
- Define the technology stack and *justify each choice*. "Because I know it" is a valid justification. "Because it is popular" is not.
- Define security and privacy considerations — what data is sensitive, where it can live, where it must not.
- Generate Mermaid diagrams for everything above so future readers see the design before reading code.

**Claude's role.**
- Enforce architecture completeness. Every entity has fields. Every component has an owner. Every external dependency is named.
- Flag missing considerations the human did not raise — auth, rate limits, observability, error budgets, what happens offline.
- Generate Mermaid for ERD, component graph, state flow, and any sequence diagrams the design implies.

**Human's role.**
- Make stack decisions and own them.
- Approve the architecture in writing (even an "approved" comment in the doc).
- Push back on anything that does not match the user from `DISCOVERY.md`.

**Deliverables.**
- `architecture.md` with all Mermaid diagrams inline.
- `DATA_SCHEMA.md` with every entity, every field, every type, every invariant.
- `TECH_DECISIONS.md` with one entry per stack choice: what was chosen, what was rejected, why.

**Exit gate.** Can every data entity be named? Does every component have a clear owner? Are all external dependencies identified? If any answer is "I'll figure it out as I go" — go back.

**Reference implementation (cxmxc-training).**
> Partial. The data schemas live in `CLAUDE.md` (added in commit 77f2cd1, *after* the build) and document the three JSON files exhaustively, including invariants. There is no Mermaid ERD or component graph. The stack chose itself — vanilla HTML/CSS/ES modules with localStorage — and was never justified in writing. `TECH_DECISIONS.md` does not exist. The retroactive version of architecture survived because the project is small and single-author; on a larger team this gap would have produced incompatible mental models on day one.

---

## Phase 2 — Foundation

**Objective.** Build the skeleton, not the features.

**Entry criteria.** Architecture approved.

**Activities.**
- Repository setup with the directory structure the architecture demands.
- `CLAUDE.md` written — project rules, language conventions, dev rules, escalation paths.
- Base data files created with correct schemas. Empty values are fine; correct shape is mandatory.
- PWA manifest, service worker, base styles — anything the architecture says will exist, exists as a stub.
- CI/CD pipeline configured if applicable (linting, type-checking, test runner).
- Commit conventions established and documented.
- README shell created — at minimum: title, one-paragraph description, "see /docs/PDLC for the framework".

**Claude's role.**
- Generate scaffolding from the architecture. No improvisation, no extra files.
- Enforce naming conventions — file paths, key names, ID prefixes.
- Flag missing files the architecture said would exist.

**Human's role.**
- Review the structure. Verify every architectural component has a home.
- Approve before any feature work begins.

**Deliverables.**
- Clean repo with all folders and stub files in place.
- `CLAUDE.md` complete (in the sense that any contributor can act from it).
- All data files exist with the correct schema, even if mostly empty.
- First commit, named exactly: `init: project scaffold`.
- A passing structure validation step (lint, schema check, or just `tree` against the architecture doc).

**Exit gate.** Can a new developer, dropped into the repo cold, understand the structure in under five minutes from the README and `CLAUDE.md` alone? If not — go back.

**Reference implementation (cxmxc-training).**
> Foundation was done well in shape: the `init: project scaffold` commit (745dd63) created the directory structure with empty placeholder files in `src/components/`, `src/engine/`, `src/styles/`, `src/data/`, plus root-level `index.html`, `manifest.json`, `service-worker.js`, `package.json`. But `CLAUDE.md` was *delayed* — it landed in commit 1f2d1da, after the data files and the ROUVY library were already populated. The five-minute test would have failed for any contributor between scaffold and CLAUDE.md. Lesson: `CLAUDE.md` is part of the foundation, not part of the documentation pass.

---

## Phase 3 — Core Build

**Objective.** Build the minimum viable product — the smallest feature set that solves the problem stated in `DISCOVERY.md`.

**Entry criteria.** Foundation complete and committed.

**Activities.**
- Build features in priority order. Priority is set by `DISCOVERY.md`, not by what is fun.
- One feature at a time. Period.
- Commit after every working feature with a descriptive message.
- Test in the target environment before committing — browser for web, device for mobile, real terminal for CLI.
- Document as you build. Headers, JSDoc, schema notes — at the moment of writing, not as a later pass.
- No premature optimization. The MVP is allowed to be naive.

**Claude's role.**
- Write the code at the human's direction.
- Enforce commit discipline. After every feature: tests pass, commit, then propose the next.
- Flag scope creep the moment it appears. "While we're in here…" is the sound of a derailment starting.
- Refuse to build feature N+1 before feature N is committed. Refuse silently is a failure mode; the refusal must be visible.

**Human's role.**
- Define and enforce feature priority.
- Test each feature in the target environment before approving the commit.
- Approve before moving on. The approval can be a single word; the act of approving cannot be skipped.

**Deliverables.**
- All MVP features working.
- Every feature committed with a proper message (the *why*, not just the *what*).
- Tested in the target environment.

**Exit gate.** Does the product solve the core problem stated in `DISCOVERY.md` *without any additional features*? If you find yourself adding "one more thing" — that one more thing is Phase 6, not Phase 3.

**Reference implementation (cxmxc-training).**
> Strong execution. Features were built one at a time and committed with substantive messages. The engine logic was extracted into `src/engine/*.js` modules as a refactor commit (d088593) once the inline shell got too dense — exactly the right moment, before more features piled on top. Each feature (data files, ROUVY library, PWA shell, JSDoc pass, schemas section, unplanned activity) sits in its own commit so the history reads as a build log. The honest gap: there was no `DISCOVERY.md` to check the MVP against, so "core build complete" was a vibe judgment, not a documented one.

---

## Phase 4 — Hardening

**Objective.** Make the product robust, documented, and ready for someone other than the builder to look at.

**Entry criteria.** MVP complete.

**Activities.**
- Error handling for all user inputs — empty fields, malformed data, network failures, offline mode.
- Edge case testing — first run, full storage, bad timezone, no permissions.
- Performance review — what regresses on a slow device or a slow network.
- Security review — API keys, data exposure, auth, third-party origins, secrets in source.
- Accessibility review — keyboard nav, contrast, screen reader, motion preferences.
- Complete all documentation — README filled out, architecture diagrams generated, schemas documented.

**Claude's role.**
- Audit code for missing error handling. List every input boundary; list every one without a defensive case.
- Generate documentation. JSDoc, file headers, READMEs, schemas.
- Run the security checklist (`GATES.md` Phase 4 section).
- Enforce no-merge-without-docs. A feature without a docs entry is not done.

**Human's role.**
- Test edge cases manually — the parts no automated test will catch.
- Review all documentation for accuracy. Documentation that lies is worse than no documentation.

**Deliverables.**
- Complete README.
- All architecture diagrams generated and inline in `architecture.md`.
- Error handling on every input boundary.
- Security checklist passed.
- No console errors / warnings in normal use.

**Exit gate.** Would you be comfortable sharing this repo *publicly right now*? If the answer involves "almost" or "after I clean up X" — go back and clean up X.

**Reference implementation (cxmxc-training).**
> Partial. The JSDoc + file headers commit (be60fa4) was a thorough documentation pass — every export documented, every file headed, every section banner-ed. The data schemas commit (77f2cd1) added exhaustive per-field schema docs. **Missing**: Mermaid architecture diagrams, security checklist, accessibility audit, `README.md` is still effectively empty (one line), no test harness. The repo is in good enough shape to share with a single trusted reader; it is not in shape to share publicly.

---

## Phase 5 — Deployment

**Objective.** Get the product in front of real users, in real conditions, on real hardware.

**Entry criteria.** Hardening complete.

**Activities.**
- Choose a deployment target (GitHub Pages, Vercel, Netlify, App Store, package registry — whatever the architecture says).
- Environment variable management — secrets in a secret store, never in source.
- PWA install testing on the target device, where applicable.
- Performance testing on real hardware — not the developer's laptop.
- First real user session — a real workflow, end to end, by a person who is not the builder if at all possible.
- Feedback collection setup — how the user can tell you what is wrong.

**Claude's role.**
- Generate deployment configurations.
- Flag environment-specific issues — CORS, HTTPS-only APIs, subpath routing.
- Verify PWA manifest, icons, and service worker against the target install criteria.

**Human's role.**
- Execute the deployment.
- Test on real devices, in real conditions (LTE, slow WiFi, low battery, dim screen).
- Collect the first real feedback and write it down.

**Deliverables.**
- Live deployment URL (or app store listing, or distributable package).
- Successful PWA install on the target device, where applicable.
- First real workflow completed end-to-end by a real user.

**Exit gate.** Has a real user completed *one full workflow end-to-end* on the target device? "It loaded on my phone" is not a full workflow.

**Reference implementation (cxmxc-training).**
> Partial. The PWA was successfully installed on Android Chrome from a local LAN server (`http://192.168.40.201:8080`) and the home-screen icon launches the app standalone. Day 1 ride data was captured and seeded into the app. **Missing**: a public deployment URL (no GitHub Pages / Vercel / Netlify yet), production environment variable management, performance testing on slow networks. The reference implementation is "deployed locally" — usable by the athlete, not yet usable by anyone else.

---

## Phase 6 — Iteration

**Objective.** Improve the product based on real usage data.

**Entry criteria.** Successful deployment with real user data flowing in.

**Activities.**
- Daily or weekly feedback review.
- Prioritize issues by user impact — not by what is most fun to fix.
- One change at a time.
- Regression test after every change. The only thing more painful than fixing a bug is fixing a bug *and* introducing two new ones in the same commit.
- Update documentation with every feature change.
- Version bump on significant changes — semver, with `CHANGELOG.md` updated in the same commit.

**Claude's role.**
- Implement changes at the human's direction.
- Enforce regression testing — before declaring a change done, exercise the screens that are not the change.
- Flag when a change breaks existing behavior, even if the user did not notice.
- Maintain `CHANGELOG.md` — every commit that touches user-facing behavior updates it.

**Human's role.**
- Prioritize feedback.
- Approve changes.
- Test regressions manually for the parts no automation reaches.

**Deliverables.**
- `CHANGELOG.md` maintained.
- Version history visible in `package.json` (or equivalent).
- All changes documented.
- No undocumented breaking changes.

**Exit gate.** This phase never ends. Phase 6 is the steady state of a healthy product. The exit is sunset.

**Reference implementation (cxmxc-training).**
> Currently in Phase 6. The "Field Training" / unplanned-activity feature (commit 582f3c4) was an iteration triggered by a real-world need — Chris had a 100km group ride scheduled mid-block that the prescribed plan did not account for. The change was committed with a substantive message, schema-documented in `CLAUDE.md`, and verified end-to-end before commit. `CHANGELOG.md` is being seeded with v0.1.0 in this same documentation pass.
