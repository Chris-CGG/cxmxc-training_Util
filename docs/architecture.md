# Architecture — cxmxc-training

> Phase 1 deliverable. Backfilled in 2026-05-08 to document the architecture that emerged during the v0.1.0 build. The eventual shape is sound; the gap was that it was never drawn until now.

This document captures four views of the system:
1. **Data ERD** — what entities exist and how they reference each other.
2. **Component graph** — what code modules exist and what depends on what.
3. **State flows** — sequence diagrams for the two most load-bearing user paths.
4. **Lifecycle** — the unplanned-activity record's state machine.

All diagrams are Mermaid, inline. They render natively on GitHub and in any Markdown viewer that speaks Mermaid (Obsidian, VS Code with the Mermaid extension, etc.).

---

## 1. Data entity-relationship diagram

The product reads three authoritative JSON files at boot and persists user state under `cxmxc.*` keys in localStorage. Authoritative files are read-only by default (CLAUDE.md rule 1); local state is owned by the shell.

```mermaid
erDiagram
    AthleteProfile ||--o{ Goal : "has"
    AthleteProfile ||--|| Baseline : "current numbers"
    AthleteProfile ||--|| Thresholds : "band cutoffs"
    AthleteProfile ||--|| Zones : "HR + power"
    AthleteProfile ||--o{ Supplement : "definitions"

    TrainingPlan ||--o{ Session : "20 days"
    TrainingPlan ||--o{ Phase : "3 phases"
    Session }o--|| Goal : "goal_id"

    Session }o--o| RouvyRoute : "rouvy_route name"
    Session }o--o| RouvyWorkout : "rouvy_workout name"

    LocalCheckIn }|--|| AthleteProfile : "thresholds"
    LocalSession }|--o| Session : "day number"
    LocalUnplanned }|--o| Session : "ripple changes target days"
    LocalCompleted }|--|| Session : "per-day overlay"
    LocalLog ||--o{ LocalSupplement : "per day taken/not"

    AthleteProfile {
        string name
        int weight_kg
        int ftp_current
        object thresholds
        object zones
        array goals
        int water_target_oz
    }
    Goal {
        string id PK
        string name
        date date
        int distance_miles
        int priority
    }
    TrainingPlan {
        string goal_id FK
        date start_date
        date end_date
        int total_days
    }
    Phase {
        int phase
        string name
        string days
        string goal
    }
    Session {
        int day PK
        date date
        int phase
        string type
        string title
        int duration_min
        string target_intensity
        bool erg_mode
        string rouvy_workout
        string rouvy_route
        int fueling_target_carbs_hr
    }
    RouvyRoute {
        string id PK
        string name
        int distance_km
        int elevation_m
        array tags
    }
    RouvyWorkout {
        string id PK
        string name
        string type
        int duration_min
    }
    LocalCheckIn {
        date date PK
        int sleep
        int energy
        int mood
        int stress
        int sore
        int rhr
        int score
        string band
    }
    LocalSession {
        date date
        int day
        int avg_power_w
        int np_w
        int avg_hr
        int avg_cadence
        int duration_min
        string source
    }
    LocalUnplanned {
        string id PK
        date date
        string state
        string type
        object estimated
        object actual
        object ripple
    }
    LocalCompleted {
        int day PK
        bool completed
    }
    LocalLog {
        date date PK
        int water_oz
        array supplements
        string notes
    }
    LocalSupplement {
        string name
        string dose
        bool taken
    }
```

**Key invariants** (from `CLAUDE.md`):
- `AthleteProfile.baseline.ftp_current > 0`.
- `Thresholds.stability_score_green > stability_score_yellow > stability_score_red`.
- `goals` always contains at least one entry with `priority: 1`.
- `Session.length === TrainingPlan.total_days` (currently 20).
- `Session.date` is strictly increasing day-over-day.
- Every non-null `Session.rouvy_workout` and `Session.rouvy_route` resolves to a `name` in `rouvy-routes.json`.

---

## 2. Component graph

How the code is organized. The shell wires DOM events to engine modules; engine modules read from JSON data and return plain values. No engine module touches the DOM or localStorage.

```mermaid
flowchart TB
    subgraph Browser["Browser (Android Chrome PWA)"]
        direction TB
        ServiceWorker["service-worker.js<br/>cache cxmxc-v3<br/>stale-while-revalidate"]
        Manifest["manifest.json<br/>standalone PWA"]
        Icon["icon.svg<br/>maskable"]
    end

    subgraph Shell["index.html (PWA shell)"]
        direction TB
        Renderers["Renderers<br/>renderCheckIn, renderPlan,<br/>renderLog, renderProfile"]
        Wire["wire()<br/>DOM event handlers"]
        State["state object<br/>cxmxc.* localStorage keys"]
        ParseSession["parseSession()<br/>Strava/ROUVY paste"]
        EffectiveSession["effectiveSession()<br/>plan overlay"]
    end

    subgraph Engines["src/engine/ (pure ES modules)"]
        direction TB
        Stability["stability.js<br/>computeStability,<br/>detectBurstCrashPattern,<br/>checkinTrend"]
        Adaptation["adaptation.js<br/>moodGatedGuidance,<br/>adaptForPattern"]
        AICoach["ai-coach.js<br/>askCoach,<br/>buildSystemPrompt"]
        Unplanned["unplanned.js<br/>estimateTSS,<br/>computeRipple"]
    end

    subgraph Data["src/data/ (authoritative JSON)"]
        direction TB
        Profile["athlete-profile.json"]
        Plan["training-plan.json"]
        Routes["rouvy-routes.json"]
    end

    subgraph External["External"]
        direction TB
        Anthropic["Anthropic /v1/messages<br/>claude-sonnet-4-6"]
    end

    Browser --> Shell
    ServiceWorker -.precache.-> Shell
    ServiceWorker -.precache.-> Engines
    ServiceWorker -.precache.-> Data

    Shell --> Engines
    Shell --> Data
    Renderers --> EffectiveSession
    Wire --> Renderers
    Renderers --> Stability
    Renderers --> Adaptation
    Renderers --> Unplanned
    Wire --> AICoach
    AICoach --> Anthropic
    State <--> Wire
    ParseSession --> Wire

    EffectiveSession -.merges.-> Plan
```

**Module responsibilities (from each module's file header):**
- `stability.js` — daily readiness score from 5 sliders + RHR; burst-crash pattern detection (3-yellow, red, descending). No DOM, no storage.
- `adaptation.js` — turns stability band into per-band coaching text and structured session adaptations. Language rules locked.
- `ai-coach.js` — Anthropic Messages API wrapper. Enforces "every prompt includes today's mood gate band and stability score" (CLAUDE.md rule 10).
- `unplanned.js` — TSS estimation, ripple computation, coaching-note generation in the field-training language.

**Shell responsibilities:**
- Render screens from state.
- Wire DOM events to handlers.
- Persist state under `cxmxc.*`.
- Apply read-time overlays (`effectiveSession`) so authoritative JSON is never mutated.

---

## 3. State flow — daily check-in

The most-used user path. Every input updates the dial live; saving persists the check-in and re-renders the log.

```mermaid
sequenceDiagram
    actor User
    participant Slider as Sliders + RHR<br/>(DOM)
    participant Render as renderCheckIn
    participant Stab as stability.js
    participant Adapt as adaptation.js
    participant Storage as localStorage<br/>cxmxc.checkins

    User->>Slider: drag slider / type RHR
    Slider->>Render: input event
    Render->>Stab: computeStability(inputs, profile)
    Stab-->>Render: { score, band }
    Render->>Render: paint dial<br/>set --pct, --color
    Render->>Adapt: moodGatedGuidance(band, todaysSession, profile)
    Adapt-->>Render: per-band coaching text
    Render->>Render: paint mood-gate bubble
    Render->>Stab: checkinTrend(checkins)
    Stab-->>Render: { avg, note, pattern }
    Render->>Render: paint dial subtitle

    User->>Slider: tap "Save Check-In"
    Slider->>Storage: save({ date, ...inputs, score, band })
    Storage-->>Render: persisted
    Render->>Render: re-render log + plan
```

---

## 4. State flow — unplanned activity (flag → preview → apply)

The second-most-load-bearing path. Demonstrates how the engine produces a structured ripple and how the shell turns it into a non-destructive plan overlay.

```mermaid
sequenceDiagram
    actor User
    participant Banner as Check-In banner
    participant Modal as Pre-ride modal
    participant Unp as unplanned.js
    participant Plan as training-plan.json<br/>(in memory)
    participant Storage as localStorage<br/>cxmxc.unplanned
    participant PlanScreen as renderPlan +<br/>effectiveSession

    User->>Banner: tap "Flag Unplanned Activity"
    Banner->>Modal: openUnplannedModal()<br/>fresh draft, date = tomorrow
    User->>Modal: pick type, distance, duration,<br/>intensity, time of day
    Modal->>Unp: estimateTSS(duration, intensity)
    Unp-->>Modal: tss
    Modal->>Modal: paint live TSS readout

    User->>Modal: tap "See Impact Preview"
    Modal->>Unp: computeRipple(draft, plan)
    Unp->>Plan: lookup ride day + downstream days
    Plan-->>Unp: prescribed sessions
    Unp-->>Modal: { changes[], coachingNote, bucket }
    Modal->>Modal: paint before/after cards

    alt User taps "Apply Changes"
        Modal->>Storage: saveUnplanned(draft<br/>state='flagged',<br/>ripple.state='applied')
        Modal->>PlanScreen: renderAll()
        PlanScreen->>Storage: load cxmxc.unplanned
        PlanScreen->>PlanScreen: buildAdjustmentOverlay()
        PlanScreen->>PlanScreen: effectiveSession(s) per day<br/>merges overlay at render
        Note over PlanScreen: training-plan.json never mutated
    else User taps "Keep Original Plan"
        Modal->>Storage: saveUnplanned(draft<br/>state='flagged',<br/>ripple.state='rejected')
        Note over PlanScreen: plan renders unchanged;<br/>flag remains for later logging
    end
```

---

## 5. Lifecycle — unplanned record state machine

A single unplanned-activity record moves through these states. Independent axes: the record's `state` (flagged / logged / ignored) and the ripple's `state` (preview / applied / rejected).

```mermaid
stateDiagram-v2
    [*] --> Preview: openUnplannedModal()<br/>fresh draft

    state "Form view" as Form
    state "Preview view" as Preview
    state "Flagged + Preview" as FlagPrev
    state "Flagged + Applied" as FlagApp
    state "Flagged + Rejected" as FlagRej
    state "Logged" as Logged

    Preview --> Form: tap "Edit"
    Form --> Preview: tap "See Impact Preview"<br/>computeRipple()

    Preview --> FlagApp: tap "Apply Changes"<br/>save with ripple.state='applied'
    Preview --> FlagRej: tap "Keep Original Plan"<br/>save with ripple.state='rejected'
    Preview --> FlagPrev: seeded example<br/>(awaiting user decision)

    FlagPrev --> FlagApp: review modal → Apply
    FlagPrev --> FlagRej: review modal → Keep
    FlagApp --> FlagRej: re-review → Keep<br/>(plan reverts)
    FlagRej --> FlagApp: re-review → Apply

    FlagApp --> Logged: post-ride log saved<br/>actual{} populated
    FlagRej --> Logged: post-ride log saved
    FlagPrev --> Logged: post-ride log saved<br/>(rare — skipped review)

    Logged --> [*]
```

**Notes on the state machine:**
- `Flagged + Applied` is the only state in which the ripple actually overlays the plan at render time.
- `Flagged + Rejected` keeps the flag (so the activity can be logged after) but the plan renders unchanged.
- The seeded "tomorrow's group ride" example starts in `Flagged + Preview` so the user must consciously decide.
- Logging an activity (filling in `actual{}`) is the terminal state; the record stays for history.

---

## 6. External dependencies

Listed for completeness; security review touches each one.

| Dependency | Purpose | When it's contacted | Failure mode |
|---|---|---|---|
| Google Fonts (`fonts.googleapis.com`, `fonts.gstatic.com`) | Bebas Neue + DM Mono | First load; cached by SW + browser thereafter | Falls back to system fonts; aesthetic degrades, function unaffected |
| Anthropic API (`api.anthropic.com`) | AI coach calls | Only when user taps "Ask Coach Now" | `{ ok:false, text: <error> }` rendered in coach bubble; rest of app unaffected |

No analytics, no tracking, no third-party CDNs beyond fonts. No backend.

---

## 7. Security and privacy considerations

(Cross-reference: `CLAUDE.md` rule 8 — compliance posture; this section is the design-level companion.)

- **Athlete profile is personal-health-adjacent data.** It lives in the source tree as JSON because v1 is single-user single-device, but it must not be logged remotely, embedded in URLs, or auto-shared.
- **API key handling.** The Anthropic key is entered in the Profile screen and stored *only* in `localStorage` on the device. It is not in source, not in `.env.example`, not in any commit. Browser-direct fetch uses the key in an `x-api-key` header to `api.anthropic.com` only.
- **AI coach prompt scope.** `buildSystemPrompt()` in `ai-coach.js` sends a curated subset of the profile (name, age, weight, FTP, cadence, breathing condition, mental-health framing, today's session, today's mood gate band/score, recent log digest). The full athlete profile is never sent.
- **No CORS bypass, no eval, no innerHTML on untrusted input.** All user-supplied text passes through `escapeHtml()` before innerHTML.
- **Service worker scope** is same-origin. Cross-origin requests (Anthropic, Google Fonts) bypass the worker and go straight to the network.
- **CLAUDE.md rule 1** protects the two authoritative JSON files from silent overwrite; the unplanned-activity ripple proves the pattern works (overlay at render time, JSON never mutated).

For the Phase 4 security checklist results, see `docs/SECURITY.md`.
