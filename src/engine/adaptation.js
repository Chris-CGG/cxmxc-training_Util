/**
 * @module src/engine/adaptation
 * @description Mood-gated guidance + structured session adaptations.
 *
 * The Check-In screen produces a stability band (green / yellow / red). This
 * module turns that band, plus the prescribed session for the day, into:
 *
 *   1. A short, human-readable coaching message in the app's voice
 *      (`moodGatedGuidance`). This is what the user reads at the top of
 *      the day.
 *
 *   2. An optional structured adaptation when burst-crash flags trip
 *      (`adaptForPattern`). This is a recommendation — replace with rest,
 *      cut volume, cap aerobic, soften — that the UI can surface as a
 *      banner. It does NOT mutate the plan.
 *
 * Language rules are non-negotiable (CLAUDE.md rule 3):
 *   - "nervous system load", "carrying weight", "the system needs to recover"
 *   - never "anxiety", "stressed out", or framing rest as weakness.
 *
 * Mood-gated tone (CLAUDE.md):
 *   - GREEN  -> tactical, direct, pushing
 *   - YELLOW -> options-based, cautious, naming the carrying weight
 *   - RED    -> protective, recovery-first, rest is the prescription
 *
 * @see CLAUDE.md rules 2, 3, 4, 9.
 */

/**
 * Produce the per-band coaching message for today's session.
 *
 * The message is the single most-read string in the app — it sits at the top
 * of the Check-In screen the moment the user finishes the dial. It must be
 * specific (real watts, real RPM, real intensity strings from the plan), it
 * must obey the language rules, and it must never frame rest as weakness.
 *
 * Return values are short paragraphs intended for direct display. They
 * already include the session title, target intensity, target cadence, ERG
 * mode, and fueling target where relevant — the caller does not need to
 * append more.
 *
 * For non-rest yellow days on threshold or VO2 sessions, the message
 * intentionally offers two options (full session at the low end vs. half
 * volume) rather than a single instruction. That matches the documented
 * yellow-day decision pattern: keep the choice with the athlete.
 *
 * @param {'green'|'yellow'|'red'} band - Today's stability band.
 * @param {object|null} session - The plan session for today, or null/undefined
 *   if today is off-block. Expected fields: `type`, `title`, `target_intensity`,
 *   `target_cadence_rpm`, `erg_mode`, `fueling_target_carbs_hr`.
 * @param {object} profile - Parsed athlete-profile.json. Uses
 *   `profile.thresholds.hr_aerobic_ceiling`.
 * @returns {string} Plain text, already in the app's voice, ready to render.
 */
export function moodGatedGuidance(band, session, profile) {
  if (!session) return 'No prescribed session today.';
  const isRest = session.type === 'rest';

  if (band === 'green') {
    if (isRest) {
      return 'System is green. The instinct will be to add a session — do not. Rest is the prescription. Sleep, fuel, mobility.';
    }
    return `System is green. Hit the prescribed session: ${session.title}. Target ${session.target_intensity}, cadence ${session.target_cadence_rpm || 'free'}. ERG ${session.erg_mode ? 'ON' : 'OFF'}. Fuel ${session.fueling_target_carbs_hr} g/hr.`;
  }

  if (band === 'yellow') {
    if (isRest) {
      return 'Yellow on a rest day is fine — that is the recovery window working. Stay easy, hydrate, sleep early.';
    }
    if (session.type === 'vo2' || session.type === 'threshold') {
      return 'System is yellow. Carrying weight today. Option A: full session at the low end of the range. Option B: cut to half volume and reassess. No ego on a yellow day.';
    }
    return `Yellow — ride at the easy end of the prescription. Cap HR at aerobic ceiling (${profile.thresholds.hr_aerobic_ceiling}). If HR climbs faster than expected, shorten it.`;
  }

  // red
  if (isRest) {
    return 'Red on a rest day. Good — let it be a rest day. Sleep target eight hours. No optional anything.';
  }
  return 'Red day. The prescription is rest. The work is already in the bank — adding a session today subtracts from race day, not adds. Trust the block.';
}

/**
 * Structured adaptation derived from burst-crash flags.
 *
 * When `detectBurstCrashPattern` (in stability.js) trips one or more flags,
 * this function turns those flags into a concrete session-level
 * recommendation. It is the bridge between "the engine sees a pattern" and
 * "the UI shows the user what to do about it".
 *
 * Action codes:
 *   - `replace_with_rest` — any red in last 3. Strongest action.
 *   - `cut_volume_50`     — three yellows in a row on a hard session.
 *   - `cap_at_aerobic`    — three yellows in a row on an easier session.
 *   - `soften`            — descending trend across last 5; no band crossed yet.
 *
 * The caller decides whether to surface the recommendation as a hard override,
 * a banner, or just a note. By design this function does NOT mutate the
 * plan — adapting a plan is the user's call, not the engine's.
 *
 * Returns `null` if no flag is tripped or there is no session to adapt.
 *
 * @param {object|null} session - Today's prescribed session.
 * @param {ReturnType<typeof import('./stability.js').detectBurstCrashPattern>|null} pattern
 *   The flags object from `detectBurstCrashPattern`.
 * @param {object} profile - Parsed athlete-profile.json (for HR ceilings).
 * @returns {{action:string, reason:string, message:string} | null}
 */
export function adaptForPattern(session, pattern, profile) {
  if (!session || !pattern) return null;

  if (pattern.anyRed) {
    return {
      action: 'replace_with_rest',
      reason: 'Red day flag — the system needs to recover.',
      message: 'Replace today with rest. The work is in the bank.',
    };
  }

  if (pattern.threeYellows) {
    if (session.type === 'vo2' || session.type === 'threshold') {
      return {
        action: 'cut_volume_50',
        reason: 'Three yellows in a row — burst-crash watch active.',
        message: 'Cut volume by 50% and reassess after the warm-up.',
      };
    }
    return {
      action: 'cap_at_aerobic',
      reason: 'Three yellows in a row — keep load aerobic only.',
      message: `Cap HR at ${profile.thresholds.hr_aerobic_ceiling}. No surges, no efforts.`,
    };
  }

  if (pattern.descending) {
    return {
      action: 'soften',
      reason: 'Stability descending — soften today\'s load.',
      message: 'Run the session at the easy end of every range. No personal records today.',
    };
  }

  return null;
}
