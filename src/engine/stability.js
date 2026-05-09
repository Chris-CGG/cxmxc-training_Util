/**
 * @module src/engine/stability
 * @description Pure stability scoring + burst-crash pattern detection.
 *
 * Stability is the daily readiness score for Chris's nervous system. The score
 * is a single 0-100 number with a green/yellow/red band, computed from the
 * morning check-in (5 sliders + resting HR). The band drives the tone of
 * everything else in the app: the mood-gated session guidance, the AI coach,
 * the burst-crash watch.
 *
 * This module is pure. It has no DOM access, no localStorage reads, no global
 * state, no fetches. Callers pass in inputs and the athlete profile, and the
 * module returns plain values. That keeps the score logic auditable, testable,
 * and trivially portable to a future Worker / Supabase Edge Function.
 *
 * Per CLAUDE.md rule 9, the burst-crash pattern detector
 * (`detectBurstCrashPattern`) is the early warning system and must never be
 * simplified or removed. It's the difference between catching a panic-prone
 * stress cycle on day 3 and catching it after the race is gone.
 *
 * @see CLAUDE.md rules 2 (ask before changing scoring) and 9 (keep burst-crash).
 */

/**
 * Clamp a number to a closed [lo, hi] range.
 * @param {number} n
 * @param {number} lo
 * @param {number} hi
 * @returns {number}
 */
const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));

/**
 * Fallback thresholds used when the athlete profile is missing them.
 * Real values live in athlete-profile.json under `thresholds`.
 * @type {{stability_score_green:number, stability_score_yellow:number, stability_score_red:number}}
 */
const DEFAULT_THRESHOLDS = {
  stability_score_green: 75,
  stability_score_yellow: 50,
  stability_score_red: 0,
};

/**
 * Fallback resting-HR baseline used when the athlete profile is missing it.
 * Real value lives in athlete-profile.json `baseline.resting_hr_baseline`.
 * @type {number}
 */
const DEFAULT_RHR_BASELINE = 56;

/**
 * Compute the daily stability score from morning check-in inputs.
 *
 * Scoring model (deliberately simple, deliberately tuned for one athlete):
 *   positive = (sleep + energy + mood) * 3      // max 90
 *   bonus    = (10 - stress) + (10 - sore)      // max 20, low stress/sore is good
 *   penalty  = max(0, rhr - baseline_rhr) * 2   // 2 points per bpm over baseline
 *   raw      = clamp(positive + bonus - penalty, 0, 100)
 *
 * Bands are read from `profile.thresholds`:
 *   raw >= stability_score_green  -> 'green'
 *   raw >= stability_score_yellow -> 'yellow'
 *   else                          -> 'red'
 *
 * The score is intentionally not a medical metric. It's a coaching aid that
 * makes a private daily reflection legible to the rest of the app. Per
 * CLAUDE.md rule 2, do not change this scoring without explicit permission —
 * it's calibrated to one athlete's history.
 *
 * @param {{sleep:number, energy:number, mood:number, stress:number, sore:number, rhr:number}} inputs
 *   Sliders are 1-10 integers. RHR is bpm. Strings are accepted (will be coerced).
 * @param {object} profile - Parsed athlete-profile.json. Uses
 *   `profile.baseline.resting_hr_baseline` and `profile.thresholds.*`.
 * @returns {{score:number, band:'green'|'yellow'|'red'}}
 */
export function computeStability(inputs, profile) {
  const baseline = profile?.baseline?.resting_hr_baseline ?? DEFAULT_RHR_BASELINE;
  const t = profile?.thresholds || DEFAULT_THRESHOLDS;

  const pos = (Number(inputs.sleep) + Number(inputs.energy) + Number(inputs.mood)) * 3;
  const negStress = (10 - Number(inputs.stress));
  const negSore   = (10 - Number(inputs.sore));
  const rhr = Number(inputs.rhr) || baseline;
  const hrPenalty = Math.max(0, (rhr - baseline)) * 2;

  let raw = pos + negStress + negSore - hrPenalty;
  raw = clamp(Math.round(raw), 0, 100);

  let band = 'red';
  if (raw >= t.stability_score_green) band = 'green';
  else if (raw >= t.stability_score_yellow) band = 'yellow';

  return { score: raw, band };
}

/**
 * Map a stability band to the matching CSS custom property.
 * Used by the dial UI to fill the conic gradient with the right colour.
 *
 * @param {'green'|'yellow'|'red'} band
 * @returns {string} A CSS `var(...)` reference resolved at render time by the theme.
 */
export function bandColor(band) {
  return band === 'green' ? 'var(--green)'
       : band === 'yellow' ? 'var(--yellow)'
       : 'var(--red)';
}

/**
 * Human-readable label for a stability band, in the app's voice.
 *
 * The labels are deliberately direct ("GO", "CAREFUL", "RECOVER") rather than
 * clinical. This is the dial caption.
 *
 * @param {'green'|'yellow'|'red'} band
 * @returns {string}
 */
export function bandLabel(band) {
  return band === 'green' ? 'GREEN — GO'
       : band === 'yellow' ? 'YELLOW — CAREFUL'
       : 'RED — RECOVER';
}

/**
 * Burst-crash early-warning detector.
 *
 * Chris has a documented burst-crash training pattern tied to mental stress
 * and heat. The pattern: a few hard days, then a sudden physiological cliff.
 * This detector watches the last few check-ins for the leading edge of that
 * pattern and surfaces three independent flags so the UI / adaptation layer
 * can react before the cliff arrives.
 *
 * Flags:
 *   - `anyRed`: any red band in the last 3 check-ins. Highest urgency.
 *   - `threeYellows`: three yellow bands in a row in the last 3 check-ins.
 *     A single yellow is normal noise; three is the documented pattern.
 *   - `descending`: every adjacent pair in the last 5 check-ins is a drop.
 *     Catches a slow slide that hasn't crossed a band threshold yet.
 *
 * `redFlag` is true if any of the three flags is true.
 *
 * Per CLAUDE.md rule 9, NEVER simplify or remove this detector. Even if the
 * UI ignores some flags in a given build, the engine keeps producing them.
 *
 * @param {Array<{date:string, score:number, band:'green'|'yellow'|'red'}>} checkins
 *   Full chronological list of check-ins (oldest first). Newest at the end.
 * @returns {{
 *   threeYellows: boolean,
 *   anyRed: boolean,
 *   descending: boolean,
 *   redFlag: boolean,
 *   sample: number,
 *   sample14: number
 * }}
 */
export function detectBurstCrashPattern(checkins) {
  const arr = checkins || [];
  const last3 = arr.slice(-3);
  const last5 = arr.slice(-5);
  const last14 = arr.slice(-14);

  const yellows3 = last3.filter(c => c.band === 'yellow').length;
  const reds3    = last3.filter(c => c.band === 'red').length;

  // "Descending" = every adjacent step in the last 5 is a drop. We require the
  // full window (>=4 deltas) so a single down-tick on day 2 doesn't trip it.
  let descending = false;
  if (last5.length >= 4) {
    let drops = 0;
    for (let i = 1; i < last5.length; i++) {
      if (last5[i].score < last5[i - 1].score) drops++;
    }
    descending = drops >= last5.length - 1;
  }

  return {
    threeYellows: yellows3 >= 3,
    anyRed: reds3 >= 1,
    descending,
    redFlag: reds3 >= 1 || yellows3 >= 3 || descending,
    sample: arr.length,
    sample14: last14.length,
  };
}

/**
 * Short summary of the recent stability trend, for the Check-In dial subtitle.
 *
 * Returns null if there are fewer than 2 check-ins to trend against — the
 * caller decides what to show in that case (typically "first check-in of the
 * block").
 *
 * The `note` is human-prose for the user, not a machine flag. The `pattern`
 * field carries the structured flags from `detectBurstCrashPattern` for
 * callers that want both at once.
 *
 * @param {Array<{date:string, score:number, band:string}>} checkins
 * @returns {{
 *   avg: number,
 *   note: string,
 *   pattern: ReturnType<typeof detectBurstCrashPattern>
 * } | null}
 */
export function checkinTrend(checkins) {
  const arr = (checkins || []).slice(-3);
  if (arr.length < 2) return null;
  const avg = Math.round(arr.reduce((s, c) => s + c.score, 0) / arr.length);
  const pattern = detectBurstCrashPattern(checkins);
  let note = 'within range';
  if (pattern.anyRed)            note = 'red flag — recover first';
  else if (pattern.threeYellows) note = 'three yellows — burst-crash watch';
  else if (pattern.descending)   note = 'trend descending — reduce load';
  else if (avg >= 75)            note = 'system is green';
  return { avg, note, pattern };
}
