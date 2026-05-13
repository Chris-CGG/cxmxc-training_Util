# Sprint 1 Close — 2026-05-13

> Wrapped at v1.0-alpha. App paused pending Tulsa Tough on 2026-06-06 and the v2 Strava-first architecture. Live at <https://chris-cgg.github.io/cxmxc-training_Util/>.

## What was built in Sprint 1

The initial v0.1.0 shell shipped with five screens (Check-In · Data · Plan · Log · Profile), five pure engine modules (stability, adaptation, ai-coach, unplanned, vision), a 6th Calendar tab, full photo-extraction via Claude Vision, and a complete Product Development Lifecycle framework in `/docs/PDLC/`. A pre-public-repo security audit moved identity + medical data into a gitignored `athlete-private.json` and parameterized the AI coach's system prompt to close a long-standing rule-5 leak. The v2.0 scope-locked rebuild then reset the UI to three focused screens (Today / Log / Goals) and introduced "Copy for Claude" as the AI bridge instead of an in-app API call.

## What was learned

The engine modules were correct in their shape but premature in their reach — they grew faster than the UI consuming them, so the v2 rebuild was a deliberate scope cut, not a regression. Service-worker cache invalidation was the source of every "the fix isn't live" bug; bumping `CACHE` only after the shell changes are real (and never re-using a stale version across feature commits) is now a hard rule. Honest retrospectives — `CXMXC_REFERENCE.md`, the security audit summary, the v0.2.1 QA-fix notes — turned out to be how the product earned trust to ship publicly, not decoration on top of the code.

## What gets built differently in Sprint 2

Strava is the source of truth from commit one — activities flow in, sessions derive from them, paste and photo become fallback paths for the edge cases Strava can't see. The engine modules come back only after their consumers are real screens with users — stability + adaptation re-wired into Today, unplanned ripple re-wired into the daily flow, vision re-wired into Log. No new top-level screens get added until those four engines are reintegrated, tested end-to-end, and proven against real Strava activity data — the v2.0 build does not repeat the v0.1.0 mistake of shipping infrastructure ahead of UI.
