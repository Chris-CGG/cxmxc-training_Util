# CxMxC Training — Project Brief

## What this is

A single-athlete training PWA built for **Chris Clarke-Gonzalez (CxMxC)** preparing for the **Tulsa Tough Ace Peloton Fondo on 2026-06-06** (103 mi). It is *not* a generic training app — every default, threshold, and tone choice is shaped to one person's physiology and history. A secondary goal is **EHOTS Rio Grande Valley MTB on 2026-07-05**.

The app is offline-first, installable on Android, and reads three JSON files in `src/data/` as authoritative source-of-truth: `athlete-profile.json`, `training-plan.json`, `rouvy-routes.json`.

## The athlete (read this before suggesting anything)

- **Background:** Fixed-gear urban crit racer. Raw power and race instincts. Group ride experience but **not at Ace pace**. Learning road peloton dynamics.
- **Current numbers:** 36 yo, 205 lb / 93 kg, 76 in / 193 cm. **FTP 232 W** (up from 211 last month, ROUVY estimated). 2.5 W/kg. Resting HR baseline 56. Max HR seen 184. Z2 power max 185 W. Sweet spot 204-213 W. Threshold 220-232 W.
- **Cadence:** Natural uncoached cadence is **61 RPM** — this is unusually low and is treated as a primary fixable. Proven ceiling 111 RPM in Day 1. Most prescribed sessions push 88+ RPM deliberately.
- **Trainer:** Wahoo KICKR 40DF smart trainer. ERG mode is available but **most sessions run ERG OFF** because Tulsa requires self-managed pacing.
- **Breathing:** Septal deviation + pollen allergies. Affects breathing under high HR load. Intake breathing magnets are on the equipment to-do list.
- **Mental state is physiological data in this app.** Panic attack history. Documented burst-crash training cycles tied to mental stress and heat. Heat sensitivity. Stress-FTP correlation observed historically.
- **Equipment:** Cannondale Synapse (road), Scott Speedster (trainer bike, slated for replacement), gravel bike, MTB. Power data from KICKR only.

## Communication style — non-negotiable

- The Check-In screen is a **mood gate**. The score it produces (green / yellow / red) determines the *tone* of every other screen's feedback the AI coach delivers that day.
- **Mental state is treated as physiology, never as weakness.** Use the language: *"nervous system load"* not "anxiety". *"carrying weight"* not "stressed out". *"the system needs to recover"* not "you're being lazy".
- **Stability Score watches for the burst-crash early warning pattern across 3+ days.** A single yellow day is not a flag. Three consecutive yellows or any red is.
- Feedback is **direct and honest, but filtered through the mood gate**. Green day: tactical and pushing. Yellow day: cautious, options-based. Red day: protective, recovery-first, rest is the prescription.
- Never frame rest as failure. The plan has rest days for a reason. The work happens during recovery.

## The 20-day block (2026-05-07 to 2026-05-26)

Source of truth: `src/data/training-plan.json`. Do not paraphrase it from memory — read it.

- **Phase 1 (Days 2-7) — Power and Repeatability:** raise ability to repeatedly hit threshold and recover.
- **Phase 2 (Days 8-14) — Ace Peloton Simulation:** surge-recover patterns, race fatigue, peloton dynamics, fueling under load.
- **Phase 3 (Days 15-20) — Taper and Sharpen:** reduce fatigue, preserve sharpness. Volume drops 40%.
- Day 1 (2026-05-07) is a benchmark day, already completed.
- 11 days of free buffer between block end (May 26) and race day (June 6) — not yet scheduled.

## Day 1 captured data (seed example)

- AM: Kona route, 15.11 mi, 184 W avg, 64 RPM, IF 0.870, TSS 60, no HR (HR strap not paired).
- PM: High Cadence Drills, 35 min, 148 W avg, cadence range 61-111 RPM, HR 134-184.
- Resting HR next morning: 56 BPM.
- Gearing issue (big ring vs small ring) discovered and resolved mid-session.
- Stability score Day 1: **green** — system recovered well despite a two-a-day on a travel day.

## Tech decisions already made

- **localStorage for state** in v1. Supabase cloud sync planned for v2 — design any new state with that migration in mind (keyed JSON, no DOM-only state).
- **Strava API integration is planned** — manual paste-into-textarea is the v1 bridge. Don't over-engineer the parser; it just needs to extract avg power, NP, avg HR, cadence, duration, distance from pasted activity text.
- **ROUVY route suggestions are curated library matches** — `rouvy-routes.json`. No ROUVY API exists yet.
- **Android PWA target** — must pass Lighthouse PWA audit. Service worker + manifest + 192/512 icons required.
- **Export is JSON** in v1. PDF export planned for v2.
- **AI coach calls Anthropic API directly from the browser** using `anthropic-dangerous-direct-browser-access: true`. API key stays in `localStorage` on this device only. Default model: `claude-sonnet-4-6`. Never hardcode a key. Never send a key to any non-Anthropic origin.

## Visual / UX design

- **Aesthetic:** dark cycling-computer feel. Deep navy/black base (`--bg: #0a0e1a`), accent purple (`--accent: #9d6cff`).
- **Typography:** Bebas Neue for headers and big numerics. DM Mono for data, intervals, copy.
- **Light mode** is a real second theme, not a half-implemented afterthought.
- **5 screens, fixed bottom tab bar:** Check-In · Data · Plan · Log · Profile.
- **Mobile-first.** Designed for one-handed use on an Android phone propped on the bars or on a stand next to the trainer.

## File map

```
/index.html                     — PWA shell: inlined CSS + ES module that imports src/engine/*
/manifest.json                  — PWA manifest, name "CxMxC Training", standalone
/service-worker.js              — offline cache for app shell + data files + engine modules
/icon.svg                       — app icon (maskable)
/.env.example                   — placeholder for keys (never commit real .env)
/src/data/athlete-profile.json  — AUTHORITATIVE — do not paraphrase or modify silently
/src/data/training-plan.json    — AUTHORITATIVE — 20-day block, do not paraphrase
/src/data/rouvy-routes.json     — curated ROUVY library, may be edited
/src/engine/stability.js        — stability score + burst-crash pattern detection
/src/engine/adaptation.js       — mood-gated guidance + structured session adaptations
/src/engine/ai-coach.js         — Anthropic API wrapper (browser-direct)
/src/components/                — empty placeholders for v2 component split
/src/styles/                    — empty placeholder for v2 CSS extraction
```

`src/engine/` was extracted from the inline shell as the first refactor — those modules are the supportable logic surface. `src/components/` and `src/styles/` are still empty, intentionally; they're the v2 destinations for the DOM renderers and CSS, the names already match.

## Data schemas

The three JSON files in `src/data/` are the only place athlete-specific values live. Everything else in the app reads them at runtime — there are no FTP, zone, threshold, or goal numbers hardcoded in JS or HTML (CLAUDE.md rule 5). This section documents every top-level key. Per dev rule 1, two of these files are authoritative and require explicit permission to modify.

### `src/data/athlete-profile.json` *(authoritative — do not modify silently)*

Single root object. Top-level keys:

- **`athlete`** — identity: `name`, `username`, `dob` (YYYY-MM-DD), `age`, `gender`, `weight_lb`, `weight_kg`, `height_in`, `height_cm`, `frame_size_cm`. Used by the Profile screen and the AI coach system prompt.
- **`equipment`** — `trainer` (Wahoo KICKR 40DF), `hr_monitor` (model + serial), `road_bike`, `trainer_bike`, `gravel_bike` (bool), `mtb` (bool), `power_meter`. Power data comes from the KICKR only.
- **`baseline`** — current physiological numbers driving the math:
  - `ftp_current` (W) — current FTP. The single most-referenced number in the app.
  - `ftp_last_month` — month-ago comparison.
  - `ftp_source` — provenance string ("ROUVY estimated").
  - `wkg_current` — power-to-weight ratio.
  - `resting_hr_baseline` — RHR floor used as the stability score's HR penalty reference (every bpm over baseline subtracts 2 from the score).
  - `max_hr_seen` — observed max from Day 1 onward.
  - `natural_cadence_uncoached` — Chris's resting-state cadence (61 RPM). Many sessions deliberately push above this.
  - `cadence_ceiling_proven` — neuromuscular ceiling shown on Day 1 (111 RPM).
  - `power_*_pr` and `avg_power_30d` — context numbers for the coach.
- **`background`** — non-numeric context the coach reads:
  - `primary_discipline`, `road_experience`, `mtb_experience`, `crash_pattern` — riding background.
  - `breathing` — `septal_deviation` flag, `allergies`, `pollen_sensitivity`, `intake_magnets` (boolean for the breathing magnets).
  - `mental_health` — `panic_attacks_history`, `burst_crash_pattern`, `heat_sensitivity`, `stress_ftp_correlation`. Treated as physiological data, never as weakness (rule 3).
- **`thresholds`** — band cutoffs read by the engine:
  - `resting_hr_green` / `_yellow` / `_red` — RHR bands (≤ green, = yellow, ≥ red).
  - `stability_score_green` / `_yellow` / `_red` — score bands. Defaults to 75 / 50 / 0; consumed by `computeStability` in `stability.js`.
  - `hr_max_training` — hard ceiling for prescribed sessions.
  - `hr_aerobic_ceiling` — Z2 cap referenced by yellow-day adaptation messages in `adaptation.js`.
- **`zones`** — derived zone limits by HR and by power. `z1_max … z5_max` are HR ceilings. `ftp_z2_power_max`, `ftp_sweetspot_low/high`, `ftp_threshold_low/high` are power ranges. The Profile screen renders these.
- **`goals`** — array of race goals. Each: `id`, `name`, `date` (YYYY-MM-DD), `distance_miles`, `category`, `priority` (1 = primary), `block_start`, `block_days`, `status`. The Plan screen uses priority 1 to compute days-to-race; the secondary entry (EHOTS) is shown on the Profile.
- **`supplements`** — array of `{ name, dose }` definitions. Empty by default; the Log screen edits a localStorage copy under `cxmxc.supplements` rather than this file.
- **`water_target_oz`** — daily water target (100). Drives the water grid cell count on the Log screen.
- **`training_start`**, **`app_version`**, **`last_updated`** — meta.

Invariants the app assumes:
- `baseline.ftp_current` is always > 0.
- `thresholds.stability_score_green > stability_score_yellow > stability_score_red` (otherwise the band ladder collapses).
- `goals` always contains at least one entry with `priority: 1`.

### `src/data/training-plan.json` *(authoritative — do not modify silently)*

Single root object. Top-level keys:

- **`block`** — block-level meta: `name`, `start_date`, `end_date`, `total_days`, `goal_id` (matches `athlete-profile.json` `goals[].id`), `target_ftp_gain`, `primary_focus` array.
- **`phases`** — three-element array, one per training phase:
  - `{ phase, name, days, goal }` — phase number 1-3, day-range string ("2-7"), prose goal.
- **`sessions`** — 20-element array, one per day in chronological order:
  - `day` (1-20) — sequential index, matches the day number on the Plan screen.
  - `date` (YYYY-MM-DD) — calendar date used for "today" lookups.
  - `phase` — 0 for the Day 1 benchmark, 1-3 for the named phases.
  - `type` — one of `benchmark | rest | threshold | endurance | vo2 | recovery`. Drives badge colour and route-suggestion tag mapping in `renderRouteSuggestions`.
  - `badge` — usually equal to `type`; kept separate so colour and class can diverge in v2.
  - `title`, `description` — display strings shown in the Plan detail panel.
  - `completed` — boolean. Mutated only via the localStorage overlay (`cxmxc.completed`); the JSON file itself is never written to disk by the app (rule 1).
  - `duration_min` — prescribed minutes; 0 for full rest.
  - `target_intensity` — free-text intensity string ("95-100% FTP", "Strict Z2", "REST"). Shown verbatim.
  - `target_cadence_rpm` — string range ("88-95") or null.
  - `erg_mode` — boolean. Default OFF (rule 4); only set true when ERG is required.
  - `rouvy_workout`, `rouvy_route` — optional names that should match entries in `rouvy-routes.json`.
  - `key_metrics` — array of strings the user should review post-session.
  - `fueling_target_carbs_hr` — target grams of carbs per hour during the session.
  - `notes` — extra context shown under the detail panel.

Invariants:
- `sessions.length === block.total_days` (currently 20).
- `sessions[].date` is strictly increasing day-over-day.
- Day 1 (phase 0) is always a benchmark; Day 20 is always pre-race rest.
- Every `rouvy_workout` and `rouvy_route` value, when non-null, has a matching `name` in `rouvy-routes.json`.

### `src/data/rouvy-routes.json` *(curated — may be edited)*

Single root object with two parallel arrays:

- **`version`**, **`last_updated`**, **`notes`** — meta.
- **`routes`** — array of physical ROUVY routes. Each:
  - `id`, `name` — `name` must match what the plan or UI references exactly.
  - `country`, `distance_km`, `elevation_m`, `duration_typical_min`.
  - `difficulty` — one of `easy | moderate | hard | very_hard`.
  - `terrain` — free-text class (`flat_coastal`, `alpine_climb`, …).
  - `tags` — flat array. The route-suggestion logic in `renderRouteSuggestions` maps session type to a wanted-tag list and filters by overlap.
  - `best_for` — narrower hint array of training types the route fits well.
  - `ftp_range_w` — `[min, max]` watts a typical rider would average. Athlete-fit hint, not a hard limit.
  - `used_in_plan_days` — array of plan day numbers that already cite this route. Maintained by hand when the plan adds a new reference.
  - `notes` — coach-style commentary.
- **`workouts`** — array of structured ROUVY workouts. Same shape as routes minus `country / distance_km / elevation_m / terrain`, plus:
  - `type` — workout class: `cadence | threshold | endurance | vo2 | recovery | test`.
  - `duration_min`, `structure` — interval-set description in plain prose.
  - `erg_recommended` — boolean hint per workout. Defaults to false matching the dev rule 4 ERG-OFF posture.

Invariants:
- Every `name` referenced from `training-plan.json` (`rouvy_workout`, `rouvy_route`) appears in this file.
- `used_in_plan_days` arrays stay aligned with `training-plan.json` whenever a session references a new route.

## Instructions for future Claude Code sessions

1. **Read the three JSONs first.** `athlete-profile.json` and `training-plan.json` are authoritative; never modify them without an explicit user instruction. `rouvy-routes.json` may be extended, but preserve existing entries that are referenced from the plan.
2. **Never invent athlete data.** If you need a number that isn't in the profile, ask. Don't guess FTP, HR zones, cadence numbers.
3. **Respect the mood gate.** Any new feature that surfaces feedback to the user should read the current stability state and adjust tone accordingly. A red-day UI that reads like a green-day UI is a bug.
4. **Use the language rules.** "Nervous system load", "carrying weight", "the system needs to recover". This is non-negotiable copy.
5. **Don't gut localStorage state without a migration path.** Keep state in named, JSON-serializable keys under a single `cxmxc.*` namespace.
6. **Don't add an Anthropic key to source.** Prompt the user for it on first AI call; persist only to `localStorage`.
7. **Plan-first for non-trivial changes.** Don't refactor `index.html` into a framework without alignment. The current shape is deliberate.
8. **Compliance posture:** the org runs ISO 27001 / NIST 800-171 / HIPAA-style controls. Treat the athlete profile as personal health-adjacent data: never log it to a remote service, never embed it in a URL, never auto-share it. The AI coach call sends a curated subset, not the full profile.
9. **Test the install.** If you change `manifest.json`, `service-worker.js`, or the icon, manually verify the PWA still installs cleanly on Android Chrome before claiming the work is done.
10. **Race date math.** Today is variable, race is 2026-06-06, EHOTS is 2026-07-05. Always compute "days to race" from the device clock, not a hardcoded constant.

## What this app is *not*

- Not multi-user. Not multi-tenant. Not a social platform. Don't add comments, follows, leaderboards.
- Not a coach replacement — it's a coach amplifier.
- Not a generic workout library — every choice is calibrated to Chris.
- Not destination-agnostic. Tulsa Tough is the goal. Drift toward "general fitness" framing is a bug.

## DEVELOPMENT RULES AND FEEDBACK

1. **Never overwrite `src/data/athlete-profile.json` or `src/data/training-plan.json` without explicit permission.** These are authoritative. Read them; do not silently rewrite them.
2. **Always ask before changing stability score logic or mood gate language.** Both are calibrated to one athlete's physiology and history — do not "improve" them unilaterally.
3. **Mental health language rules are non-negotiable.** Use *"nervous system load"* not "anxiety". *"carrying weight"* not "stressed". *Never* frame rest as weakness. This applies to UI copy, AI coach system prompts, commit messages, and code comments.
4. **ERG mode default is OFF** for all session recommendations unless a session explicitly notes otherwise. Tulsa requires self-managed pacing; ERG defeats the training goal.
5. **Every component must read from the JSON data files** in `src/data/`. No hardcoded athlete data in HTML or JS — no FTP literals, no zone numbers, no goal dates baked into the source. If you need a value, fetch it.
6. **Before any major refactor, ask for confirmation.** "Major" means: extracting `index.html` into a framework, restructuring state keys, splitting the bundle into `src/components/*` and `src/engine/*`, or changing the data file schema.
7. **Commit working code before starting new features.** A clean checkpoint is the price of admission to start the next change.
8. **Test in browser before committing.** Type checks and lint passes verify code, not features. Open the PWA, exercise the screen you changed, and watch for regressions in the others.
9. **Keep the burst-crash pattern detection logic in `src/engine/stability.js` — never simplify or remove it.** The 3+ day yellow watch and red-flag logic is the early warning system. Even if it looks like dead code in a given session, leave it.
10. **All AI coach prompts must include the athlete's mood gate state and stability score.** No coach call goes out without today's band and score in the system message. A coach without the mood gate is the wrong coach.
