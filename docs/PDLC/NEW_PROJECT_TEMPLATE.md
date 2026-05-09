# [PROJECT NAME] — CLAUDE.md

> **Copy this file into the new repo's root as `CLAUDE.md`. Fill in every bracketed field. Then start at Phase 0.**
>
> This template is the contract Claude Code will run against on this new project. Anything not in this file is, by definition, a unilateral decision Claude has not been authorized to make.

---

## How to use this template

1. Copy this file to the root of the new repository as `CLAUDE.md`.
2. Either copy `/docs/PDLC/` from cxmxc-training into the new repo, or reference it as a sibling repo. The framework documents (PHASES, GATES, CLAUDE_PROTOCOL) are referenced below; if Claude cannot find them, the session-start protocol will halt.
3. Fill in every bracketed `[FIELD]` below. If a field genuinely does not apply, write `n/a` — never leave it blank.
4. Set the phase tracker to Phase 0.
5. Start the first session. The session-start protocol (§Session start) tells Claude what to do.

---

## What this is

[One paragraph describing what you're building. Be specific. "A productivity app" is not specific. "A daily-log PWA for cyclists with a mood-gated check-in screen" is specific.]

## The user

[Who is this for? Even if it's just you, be specific. Their context, their constraints, what they're trying to accomplish, what they bring to the product, what the product must respect about them. If the product touches mental health, wellbeing, recovery, accessibility, or any sensitive context — say so explicitly. Implicit considerations get forgotten; explicit ones get respected.]

## Tech stack

[List languages, frameworks, runtimes, deployment targets. If you don't know yet, write "TBD — to be decided in Phase 1 Architecture" and do not write a single line of code until that's filled in. The tech stack is a Phase 1 deliverable, not a Phase 3 improvisation.]

## Phase tracker

- [ ] Phase 0 — Discovery
- [ ] Phase 1 — Architecture
- [ ] Phase 2 — Foundation
- [ ] Phase 3 — Core Build
- [ ] Phase 4 — Hardening
- [ ] Phase 5 — Deployment
- [ ] Phase 6 — Iteration (steady state)

**Current phase: [FILL IN]**

Definitions and exit gates per phase: see `docs/PDLC/PHASES.md` and `docs/PDLC/GATES.md`.

---

## Non-negotiable rules (universal — apply to every project)

These rules apply on every project regardless of stack, domain, or scope. They are the shared baseline the framework defends.

1. **No code before this `CLAUDE.md` is filled in.** This file is the contract. If any required field above is empty or contains a placeholder, Claude will refuse to write feature code.
2. **One feature at a time.** Never start feature N+1 before feature N is committed. Branches that accumulate three half-built features are not features; they are regret-piles.
3. **Test before commit.** Type checks pass and lint clean is *not* the same as "it works". Open the product, exercise the change, watch for regressions in the unrelated screens.
4. **Document as you build.** No undocumented features. Every export gets at least a short JSDoc-style header (or the language equivalent). Schema changes update the schema doc in the same commit.
5. **No secrets in source.** API keys, tokens, credentials live in environment variables or per-device storage only. `.env.example` may exist; `.env` may not be committed. This rule does not relax under deadline.
6. **Phase gates are not optional.** If a gate cannot be passed, go back. Never skip forward. A skipped gate is a debt that compounds.
7. **Commit messages tell the why.** "fix bug" is not a commit message; "fix(parser): handle empty distance field — Strava paste returned NaN downstream" is.
8. **No destructive git operations without explicit confirmation.** `force-push`, `reset --hard`, `branch -D`, `clean -f` — confirm before each one, even when the broader task was pre-authorized.
9. **Authoritative files are read-only by default.** Files marked authoritative in this `CLAUDE.md` (typically the source-of-truth data files) cannot be modified without an explicit `[OVERRIDE]` from the human.
10. **Mental-state framing matters.** If the product touches mental health, recovery, accessibility, or any sensitive context, the language used in UI copy, AI prompts, commit messages, and code comments must respect the user. Specifics live in this project's "Project-specific rules" below.

---

## Project-specific rules (fill in for this project)

[Add the rules unique to this project. Examples from the cxmxc-training reference implementation:
- "Use the language: 'nervous system load' not 'anxiety'."
- "ERG mode default is OFF unless a session explicitly notes otherwise."
- "Authoritative files: src/data/athlete-profile.json, src/data/training-plan.json — read-only without explicit override."
- "Compliance posture: ISO 27001 / NIST 800-171 / HIPAA-adjacent. Never log personal data to a remote service, never embed in a URL, never auto-share."

Replace the examples with your own. Be specific. A vague rule is an unenforceable rule.]

---

## Authoritative files

[List the files in this repo that are read-only by default. The full list as the project grows. Modifications require explicit `[OVERRIDE]`.]

- [path/to/file.json — what it is, why it's authoritative]

---

## Session start protocol

At the start of every session, before any other work, Claude executes:

1. **Read this `CLAUDE.md`.** Including any `[RULE]` additions made in past sessions.
2. **Check the current phase** from the phase tracker above.
3. **Run `git log --oneline -3`** to see what shipped recently.
4. **Report.** Three lines: current phase, last commit, proposed next action.
5. **Ask.** "Ready to proceed, or do you want to review first?"

Substantive work does not begin until the human responds.

---

## Feedback prefixes

Use these prefixes when you want a precise behavior from Claude. Free-form messages still work; the prefixes exist for the moments when ambiguity is expensive.

- **`[FEEDBACK]`** — non-code instruction or observation. Claude takes the note and applies it going forward; does not write code in response.
- **`[RULE]`** — add a permanent rule to this `CLAUDE.md`. Claude appends the rule and commits the change as `docs(claude): add rule — <summary>`.
- **`[OVERRIDE]`** — consciously bypass a phase gate or a Claude refusal. Claude proceeds and writes a one-line entry in `CHANGELOG.md` under `### Overrides` describing what was bypassed and why.
- **`[QUESTION]`** — ask without triggering action. Claude answers; does not edit, code, or commit.

---

## Source-of-truth references

| Doc                                | Purpose                                                  |
|------------------------------------|----------------------------------------------------------|
| `docs/PDLC/PHASES.md`              | The seven phases, what happens in each, who does what.   |
| `docs/PDLC/GATES.md`               | Phase-gate checklists and Claude's automatic refusals.   |
| `docs/PDLC/CLAUDE_PROTOCOL.md`     | Exactly how Claude behaves inside this framework.        |
| `docs/PDLC/CXMXC_REFERENCE.md`     | How cxmxc-training executed each phase (lessons).        |
| `docs/PDLC/CHANGELOG.md`           | Running log of what shipped and when.                    |

If any of these are missing from the repo, the session-start protocol will halt with a clear error. Either copy them from cxmxc-training, or run a Phase 0 / Phase 1 pass to produce equivalents.

---

## License

[Add a license here, or write `proprietary — internal use only`. The license is part of the contract; "I'll figure it out later" is not a license.]
