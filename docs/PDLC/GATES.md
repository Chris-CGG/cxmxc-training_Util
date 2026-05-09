# Phase Gate Checklist

> A gate is the contract for leaving one phase and entering the next. Cannot pass the gate? Go back. **Never skip forward.** A skipped gate is a debt that accrues compound interest until you pay it — usually mid-deployment, with users watching.

Each gate is a checkbox list. Every box must be checked. If a box cannot be checked, the corresponding "Gate Failure" section tells you where to go back to.

The last section, **Gates Claude Will Enforce Automatically**, lists the specific things Claude will refuse to do until the relevant gate has been passed. These are not optional — they are how the framework defends itself from the natural human urge to "just ship the thing."

---

## Phase 0 Gate — Discovery → Architecture

- [ ] Problem statement is one to three sentences and committed to `DISCOVERY.md`.
- [ ] User profile documented (who, daily context, constraints).
- [ ] Mental-health / wellbeing considerations enumerated, if applicable.
- [ ] Data sources and external integrations identified.
- [ ] Success metrics defined ("the product is working when…").
- [ ] Assumptions list written, dated, owned.
- [ ] Out-of-scope list written.
- [ ] You can describe the user's daily interaction with the product in **three sentences without mentioning technology**.

### Gate Failure

Common Phase 0 failures:
- "I'll figure out the user as I build" → go back. The user is the problem; not knowing them means not knowing the problem.
- "Mental health considerations don't apply here" → only true for products no human will use. Re-read.
- "Success will be obvious" → not a metric. Re-write.

If any box is unchecked, **stay in Phase 0**. The cost is hours; the cost of skipping is weeks.

---

## Phase 1 Gate — Architecture → Foundation

- [ ] Every data entity is named, with all fields, types, and invariants.
- [ ] An ERD exists as a Mermaid diagram in `architecture.md`.
- [ ] Every component has an owner (file, module, person — at least one).
- [ ] State management approach documented — where state lives, who reads, who writes.
- [ ] Every external dependency identified (APIs, libraries, services).
- [ ] Security and privacy considerations enumerated.
- [ ] Tech stack chosen and justified in `TECH_DECISIONS.md` (one entry per stack choice).
- [ ] Mermaid diagrams generated for ERD, component graph, and state flow.

### Gate Failure

- "We'll add fields as we go" → go back; field-creep is the largest source of schema migration pain.
- "The library docs are good enough" → for *you*. Future-you needs the dependency listed by name and version.
- "Security is a Phase 4 concern" → architecture decisions lock in security posture. Surface it now.

---

## Phase 2 Gate — Foundation → Core Build

- [ ] Repository structure matches `architecture.md`.
- [ ] `CLAUDE.md` exists at the repo root, complete in the sense that a stranger could act from it.
- [ ] All data files exist with correct schemas (values can be empty; shape cannot).
- [ ] PWA manifest, service worker, base styles, base scripts — every artefact the architecture said would exist, exists.
- [ ] Commit convention documented (in `CLAUDE.md` or `CONTRIBUTING.md`).
- [ ] First commit named exactly `init: project scaffold`.
- [ ] README shell exists — title, one-paragraph description, link to `/docs/PDLC/`.
- [ ] A new contributor can understand the structure **in under five minutes** from README + `CLAUDE.md` alone.

### Gate Failure

- "I'll write CLAUDE.md once we have something to put in it" → go back. CLAUDE.md is the contract; without it, every commit is a unilateral decision.
- "The structure is obvious" → it is, to you, today. Run the five-minute test on yourself in two months.

---

## Phase 3 Gate — Core Build → Hardening

- [ ] Every MVP feature listed in `DISCOVERY.md` works in the target environment.
- [ ] Every feature has its own commit with a descriptive message (the *why*, not just the *what*).
- [ ] No feature was started while another feature was uncommitted.
- [ ] No console errors in normal use.
- [ ] The product **solves the core problem stated in `DISCOVERY.md` without any additional features**.

### Gate Failure

- "We need to add X first" → no. X belongs in `ROADMAP.md`. Phase 3 is for the MVP, not the wish list.
- "I haven't tested the edge cases" → those are Phase 4. But the *happy path* must work end to end here.

---

## Phase 4 Gate — Hardening → Deployment

- [ ] Every user-input boundary has explicit error handling.
- [ ] Edge cases enumerated and tested (empty state, full state, network failure, offline, bad timezone).
- [ ] Performance reviewed on a representative slow device or network.
- [ ] Security checklist passed:
  - [ ] No secrets in source.
  - [ ] API keys live in env vars or per-device storage only.
  - [ ] No personal data sent to third-party origins beyond what was declared in architecture.
  - [ ] Auth, where applicable, follows architecture spec.
- [ ] Accessibility checklist passed (keyboard nav, contrast, screen reader sanity, motion preference).
- [ ] README is complete (overview, install, run, deploy, contribute, license).
- [ ] All architecture diagrams generated and inline.
- [ ] Schema documentation is current.
- [ ] **You would be comfortable sharing this repo publicly right now.**

### Gate Failure

- "The README is still TODO" → go back; the README is part of the deliverable.
- "I'll handle errors after deployment" → do not. The error path *is* the user experience for everyone whose first interaction fails.
- "I'm comfortable sharing it with friends but not publicly" → go back; the gap is the gate.

---

## Phase 5 Gate — Deployment → Iteration

- [ ] Live deployment URL (or app store listing, or distributable artefact) exists.
- [ ] PWA installs cleanly on the target device, where applicable.
- [ ] Environment variables managed in a secret store, not in source.
- [ ] Performance verified on real hardware (not the developer's laptop).
- [ ] **A real user has completed one full workflow end-to-end** on the target device.
- [ ] Feedback collection mechanism in place.

### Gate Failure

- "It loaded for me" → not the same as a workflow completed. Go back.
- "I am the only user" → fine, but you must complete the workflow *as a user* — on your phone, on the bus, with a glove on, whatever the real conditions are. Do not test from the developer's chair.

---

## Phase 6 Gate — Steady State

Phase 6 has no exit gate. It has *standing discipline*:

- [ ] Every change committed with a descriptive message.
- [ ] `CHANGELOG.md` updated in the same commit as the change.
- [ ] Regression-tested on the screens that were not the change.
- [ ] No undocumented breaking changes.
- [ ] Version bumped according to semver when user-facing behavior changes.

If the standing discipline slips, you are not in Phase 6 — you are sliding back into Phase 3 with the lights off.

---

## Gates Claude Will Enforce Automatically

Claude will refuse to take the following actions until the relevant gate has been passed. The refusal is visible — Claude will explain which gate is unmet and what the human can do to unblock.

1. **Will not write feature code before `CLAUDE.md` exists.** No exceptions. CLAUDE.md is the contract; without it, every line of code is an unrecorded unilateral decision.

2. **Will not build feature N+1 before feature N is committed.** "Just one more change" before commit is how branches become regret-piles. The previous feature is committed, then the next one starts.

3. **Will not deploy before README is complete.** The README is part of the deployment, not a follow-up.

4. **Will not merge changes that lack error handling on user-facing inputs.** A feature that crashes on empty input is not a feature; it is a future incident.

5. **Will not skip commit messages.** No empty messages, no "wip", no "fix". The message states what changed and why.

6. **Will not hardcode data that belongs in config files.** FTP, zone limits, race dates, API keys — these live in their declared homes (`src/data/*`, env vars, `localStorage`), never in JS literals.

7. **Will not bypass authoritative data files.** Files marked authoritative in `CLAUDE.md` cannot be overwritten without explicit human override.

8. **Will not silently skip a phase gate.** If a gate cannot be passed, Claude states which box is unchecked and waits for the human to either close the gap or issue an `[OVERRIDE]` (see `CLAUDE_PROTOCOL.md`).

9. **Will not run destructive git operations without confirmation.** `force-push`, `reset --hard`, `branch -D`, `clean -f` — confirmation is required even when the human pre-authorized the broader task.

10. **Will not commit secrets, even if asked.** API keys, tokens, credentials in source are blocked. The right home is environment variables or per-device storage; Claude will help wire them there instead.

These rules are project-agnostic. Project-specific rules live in `CLAUDE.md`.
