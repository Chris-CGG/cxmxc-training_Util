# CxMxC Product Development Lifecycle Framework

> **A repeatable protocol for human-AI collaborative builds.**

This framework was built during the cxmxc-training project — a single-athlete training PWA for CxMxC preparing for the Tulsa Tough Ace Peloton Fondo. It was extracted from that project so future builds (yours, mine, or someone else's) start from a known-good process instead of inventing one each time.

---

## Why a framework

Solo developers and small teams using Claude Code (or any capable AI coding assistant) hit a recurring problem: the assistant is a force multiplier on whatever process is already in place — including bad ones. If the process is "vibe my way to a feature, ship, repeat," the assistant will help do that faster, and the same walls arrive sooner with more debt attached.

This framework gives the process so the multiplication actually compounds:

- **Creative freedom for humans, strict protocol for the assistant.** The human decides what the product is. The assistant makes sure no step is silently skipped.
- **Every phase has a gate.** You cannot proceed without passing it. A failed gate is a signal to go back, never to skip forward.
- **The assistant enforces protocol; the human makes creative decisions.** When they conflict, discuss. Do not skip protocol silently — that is the failure mode this framework was built to prevent.

The seven phases below are not novel; the discipline of refusing to skip them is.

---

## The seven phases at a glance

| # | Phase         | Objective                                       | Exit gate                                                             |
|---|---------------|-------------------------------------------------|-----------------------------------------------------------------------|
| 0 | Discovery     | Understand the problem deeply.                  | Describe the user's daily interaction in three sentences (no tech).   |
| 1 | Architecture  | Design the system before building it.           | Every entity is named; every component has an owner.                  |
| 2 | Foundation    | Build the skeleton, not the features.           | New contributor understands the structure in <5 min from README + CLAUDE.md. |
| 3 | Core Build    | Build the MVP.                                  | Solves the problem in DISCOVERY.md without any extras.                |
| 4 | Hardening     | Robust, documented, production-ready.           | Comfortable sharing this repo publicly right now.                     |
| 5 | Deployment    | Real users, real conditions, real hardware.     | A real user completed one full workflow end-to-end.                   |
| 6 | Iteration     | Improve based on real usage.                    | Never ends — the steady state of a healthy product.                   |

---

## How to use this directory

The seven files in `/docs/PDLC/` are the framework. Read them roughly in this order:

| File                          | What it is                                                               |
|-------------------------------|--------------------------------------------------------------------------|
| `README.md` (this file)       | Overview and entry point.                                                |
| `PHASES.md`                   | The seven phases — objective, activities, roles, deliverables, exit gate, and how cxmxc-training executed each one. |
| `GATES.md`                    | Per-phase checklist that must be checked before proceeding. Plus the automatic refusals Claude enforces. |
| `CLAUDE_PROTOCOL.md`          | Exactly how Claude behaves inside this framework. Always-do, never-do, feedback prefixes, session-start ritual, failure handling. |
| `CXMXC_REFERENCE.md`          | An honest account of how cxmxc-training executed each phase. The good, the gaps, the lessons. The first reference implementation. |
| `CHANGELOG.md`                | Running log of what shipped and when. Seeded with v0.1.0. Maintained from here forward. |
| `NEW_PROJECT_TEMPLATE.md`     | Copy-paste starter `CLAUDE.md` for any new project that wants to use this framework. |

---

## Starting a new project on this framework

1. Create the new repository.
2. Copy `NEW_PROJECT_TEMPLATE.md` into the repo root, rename it to `CLAUDE.md`, fill in every bracketed field.
3. Either copy `/docs/PDLC/` from cxmxc-training into the new repo, or reference it as a sibling. The framework documents are read by Claude at session start; if they are missing, the session-start protocol halts.
4. Set the phase tracker to Phase 0.
5. Start the first session. Claude reads `CLAUDE.md`, runs the session-start protocol, reports the current phase, and waits for confirmation before substantive work.

---

## Existing projects retrofitting this framework

Projects already in flight can adopt this framework mid-stream. Two ways:

- **Honest retrofit.** Run a `CXMXC_REFERENCE.md`-style honest review against the existing project, listing what each phase produced or skipped. Mark the current phase. Backfill the missing artefacts as `[OVERRIDE]`-tracked tech debt. cxmxc-training itself is the reference for this — see `CXMXC_REFERENCE.md`.
- **Clean break.** Treat the existing repo as input to a new Phase 0. Write a fresh `DISCOVERY.md`, then a fresh architecture, then decide what carries over.

The honest retrofit is faster and usually adequate. The clean break is rarely worth it unless the existing repo has a deep architectural mistake that needs to be undone.

---

## What this framework is not

- **Not a substitute for taste.** The framework defends process; it does not produce ideas. If the product is wrong, no amount of phase discipline saves it.
- **Not a license to over-document.** Every artefact in `PHASES.md` exists because something downstream consumes it. If a doc is not consumed, it should not exist. The framework is for working products, not for the appearance of process.
- **Not a methodology.** Methodologies prescribe ceremonies. This framework prescribes contracts (gates) and refuses to negotiate on them. Within the contracts, work however suits the human.
- **Not exclusive to Claude.** The phases and gates are technology-agnostic. The Claude protocol is specific to using Claude as the engineering counterparty; substitute any sufficiently capable assistant and the rest still works.

---

## Origin and license

This framework was extracted from the cxmxc-training project after the v0.1.0 MVP shipped. cxmxc-training built the product *and* discovered the process; this directory makes the process portable.

For an honest account of how cxmxc-training actually executed each phase — including the parts that were retroactive — see `CXMXC_REFERENCE.md`. The summary: this project started building before architecture was complete. That is a lesson, not a failure.

License: same as the parent cxmxc-training repository. Add a license line here if forking this directory standalone.
