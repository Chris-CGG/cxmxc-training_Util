# DISCOVERY — cxmxc-training

> Phase 0 deliverable. Backfilled in 2026-05-08 from athlete profile, project history, and verbal context that was previously implicit. The goal of this document is to make every assumption explicit, including the ones that have already been validated by the v0.1.0 build.

---

## Problem statement

A 20-day training-block PWA for **one specific athlete** preparing for **the Tulsa Tough Ace Peloton Fondo on 2026-06-06** (103 mi). The product is calibrated to the athlete's documented history of burst-crash cycles, panic attacks under high HR load, and stress-FTP correlation — and treats those as physiology, not as weakness, in every screen and every coaching message.

The secondary goal is **EHOTS Rio Grande Valley MTB on 2026-07-05**, which begins influencing decisions in the post-Tulsa buffer window.

---

## User profile

**CxMxC** — 36 years old, 205 lb / 93 kg, 6'4" / 193 cm.

- **Riding background.** Fixed-gear urban crit racer. Raw power and race instincts. Group-ride experience but **not at Ace pace.** Currently learning road peloton dynamics.
- **Cycling numbers.** FTP 232 W (up from 211 W last month, ROUVY estimated). 2.5 W/kg. Resting HR baseline 56 bpm. Max HR seen 184 bpm. Z2 power max 185 W. Sweet spot 204-213 W. Threshold 220-232 W. PRs: 20-min 244 W, 5-min 275 W, 1-min 362 W.
- **Cadence story.** Natural uncoached cadence is **61 RPM** — unusually low. Proven ceiling 111 RPM in Day 1's high-cadence drill. Most prescribed sessions deliberately push 88+ RPM as a primary fixable.
- **Equipment.** Wahoo KICKR 40DF smart trainer (the single source of power data). Cannondale Synapse road bike. Scott Speedster trainer bike (slated for replacement). Gravel bike. MTB. 808S HR monitor.
- **Breathing.** Septal deviation. Pollen allergies. Both affect breathing under high HR load. Intake breathing magnets are on the equipment to-do list.
- **Mental state, treated as physiology.** Documented panic-attack history under high load. Burst-crash training pattern tied to mental stress and heat. Heat sensitivity. Stress-FTP correlation observed historically. Mood is data; recovery is training; rest is never failure.

### Daily interaction (the three-sentence test)

In Phase 0 terms, here is what the user's daily interaction looks like, *without* mentioning technology:

> Each morning Chris checks in honestly about how he slept, how his legs feel, his mood, the weight he's carrying, and how sore he is, then takes his resting heart rate. The product turns those answers into a single readiness signal that decides the tone of his coaching for the day, surfaces what session is prescribed (or whether the buffer says rest), and lets him flag anything unscheduled — like a group ride — so the upcoming days adapt around it without him having to redo the math. After the ride he logs the actuals, the system updates the trend, and he goes about his day knowing the next 19 mornings already know what to ask him.

---

## Constraints

### Time
- 20-day block runs **2026-05-07 → 2026-05-26**.
- 11-day buffer between block end and **race day 2026-06-06**, currently unscheduled.
- 10-day window between race and **EHOTS RGV 2026-07-05**.

### Hardware
- **Power data: KICKR only.** No on-bike power meter; outdoor power is unavailable.
- **HR: 808S strap.** Day 1 captured a missed-pairing incident; the product must tolerate ride logs with no HR data.
- **Phone: Android.** Primary interaction device, propped on bars or on a stand next to the trainer.

### Connectivity
- Home WiFi is reliable. The trainer space and outdoor rides may be partial-signal or no-signal.
- The product **must work offline** for the daily workflow (check-in, plan view, log entry, supplement check). AI coach is the only feature allowed to be online-only.

### Physiology / context
- Septal deviation + pollen allergies → reduced airflow under load → mood-gate and aerobic ceiling matter more than usual.
- Panic-attack history under high HR → red-day prescriptions must be protective; coaching language must never frame symptoms as weakness.
- Heat sensitivity → race-day weather (Tulsa, June) is a known stressor; heat-tolerance proxies (e.g. Ventoux, Gran Canaria, Kona on ROUVY) are useful.
- Stress-FTP correlation → life stress is *training* stress; the burst-crash pattern detector exists because of this.

### Compliance / privacy posture
- Org-level constraints: ISO 27001, NIST 800-171, HIPAA-adjacent, PCI, CMMC Level 2, NIST AI RMF.
- The athlete profile is **personal-health-adjacent data**. It must not be logged to a remote service, embedded in URLs, or auto-shared.
- Anthropic API key is **per-device only** — `localStorage`, never source, never any non-Anthropic origin.
- The AI coach call sends a **curated subset** of the profile, never the full file.

### Single-user, single-device
- v1 has exactly one user (Chris) and one primary device (his Android phone).
- No multi-user features, no social features, no leaderboards.
- v2 may add cloud sync (Supabase) for multi-device; the keyed `cxmxc.*` localStorage namespace is designed for that migration.

---

## Success metrics

How we'll know v0.1.0 is doing its job during the Tulsa block.

### Behavioral (does the athlete actually use it?)
- **Daily check-in completed every morning** for 20 consecutive days. The engine assumes daily input; gaps degrade the burst-crash detector.
- **All 20 prescribed sessions resolved** — completed, adapted via unplanned, or genuinely rested. No "ghost days" with no record.
- **Daily log entries** include water and at least one supplement check by Day 5 (after the user has had time to set up his supplement list).
- **AI coach used at least 5×** across the block — confirms the mood-gated tone is producing useful output, not just decorative.

### Physiological (is the training working?)
- **Stability score never red for 2+ consecutive days** without an `[OVERRIDE]`-tracked deliberate hard day. Two reds in a row = the burst-crash early warning has fired and was ignored.
- **Cadence trend** shows session-average above 80 RPM by Day 10 (vs. natural 61 RPM baseline).
- **Race-day morning RHR within baseline ± 3 bpm** (52-59). Bigger deviation indicates the taper failed.

### Outcome
- **Tulsa Tough finish in target group** (Ace Peloton, not dropped to a slower group, not DNF).
- No panic attack triggered under load during the block.

### Product
- **No data loss across reloads or PWA install** — every check-in, every session, every flag survives.
- **Less than 2-second cold-load** on the target Android device.

---

## Assumptions

Every assumption is a risk; surfaced ones are managed, hidden ones explode mid-build.

| # | Assumption | Status |
|---|---|---|
| A1 | Athlete will check in daily (the burst-crash detector breaks without consistent daily data). | Validated through Day 1; behavioral risk remains. |
| A2 | KICKR power numbers are reliable. Outdoor rides log power = null and that's fine. | Validated. |
| A3 | Strava + ROUVY paste capture enough metrics for a v1 log; APIs are deferred. | Validated for ROUVY; Strava paste format will be exercised in Phase 6. |
| A4 | Anthropic Messages API stays available and on the `claude-sonnet-4-6` model class for the duration of the block. | External dependency; no backup model wired in. |
| A5 | Group-ride dynamics don't fundamentally change between flag-time and ride-time. The unplanned-activity ripple uses estimated TSS, not actuals, for plan adjustments. | Built-in mitigation: post-ride log captures actuals and the coaching note flags drafting/regrouping uncertainty. |
| A6 | Athlete trusts the algorithm enough to follow the prescribed adaptation, or to use `[OVERRIDE]` with intent. Silent ignore is the worst outcome. | Behavioral; no mitigation in v1 beyond making the right thing easy. |
| A7 | The phone has WiFi access at home for first cache + occasional updates. No offline-first install required. | Validated (LAN install works). |
| A8 | The athlete can paste activity data from Strava/ROUVY without a screenshot OCR step. | Validated for both. |
| A9 | localStorage on the installed PWA is durable enough for a 20-day block + buffer. (Browser-managed eviction is a theoretical risk.) | Low risk; v2 will mirror to Supabase. |
| A10 | Compliance posture is satisfied by on-device-only storage + curated AI prompt subset + no remote logging. No external audit performed. | Self-attested; worth re-checking before any v2 cloud sync. |

---

## Out of scope

Things v0.1.0 deliberately does *not* do. Listed so future contributors don't accidentally re-litigate them.

- **Multi-user / social features.** No comments, no follows, no leaderboards, no shared rides. Single-tenant.
- **Real-time ride telemetry.** No live BLE/ANT+ ingestion, no streaming power/HR. Post-ride paste only.
- **Strava / ROUVY API integrations.** Manual paste in v1. APIs are a v2 candidate.
- **Server-side state.** No backend in v1. localStorage only. Supabase is a v2 candidate.
- **Coaching for non-cycling activities.** Cross training is logged as a category but not coached.
- **Hardware setup / calibration.** KICKR pairing, HR strap pairing, cadence sensor — assumed correct upstream of the app.
- **Detailed nutrition tracking.** Water in oz and supplements taken/not — that's the depth.
- **Sleep tracking beyond a 1-10 self-report.** No HRV ingestion, no Oura integration, no Apple Health.
- **Direct booking of group rides or events.** External calendar integration is out.
- **Race-day live tracking.** No live position, no live nutrition timer, no live splits.
- **Cross-device sync.** v1 is single-device. The localStorage layout is designed for a future Supabase mirror, but the migration itself is out of scope here.
- **Coach ↔ athlete chat / messaging beyond the AI coach.** No human coach inbox in v1.
- **PDF export.** JSON export only. PDF is a v2 candidate.

---

## Open questions for Phase 6+

Captured here so they don't get lost; not in scope for v0.1.0.

- Should the post-Tulsa buffer (May 27 – June 5) become part of `training-plan.json` as Phase 4 of the block, or stay as a separate "race-prep micro-cycle"?
- Does EHOTS RGV warrant its own block JSON, or is it loaded into the same plan structure with a different `goal_id`?
- When does the v2 Supabase mirror become worth the complexity? Trigger: second user, or second device for the same user.
- Strava API integration — driven by paste-format pain, or by a desire for automatic ride pickup?
- Heat-acclimation block before Tulsa — separate feature, or just route selection (Kona / Ventoux) within the existing plan?
