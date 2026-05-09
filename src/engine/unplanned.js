/**
 * @module src/engine/unplanned
 * @description Unplanned-activity TSS estimation, ripple computation,
 *   formatters, and the coaching-note builder.
 *
 * The Check-In screen lets the athlete flag an unplanned ride before it
 * happens (group ride, MTB, race, etc.). This module turns that flag into:
 *
 *   1. An estimated TSS — see `estimateTSS`. Per-hour multipliers come from
 *      the spec: easy 40 / moderate 65 / hard 85 / race_pace 105.
 *
 *   2. A ripple computation — see `computeRipple`. Walks forward through
 *      the prescribed plan and proposes per-day changes (replace, downgrade,
 *      protection day, RHR check, buffer absorbed) according to the TSS
 *      bucket. Returns a structured `{ changes, coachingNote, bucket }`
 *      that the UI can render as a before/after preview.
 *
 *   3. A coaching note — short prose in the app's voice. Language rules are
 *      non-negotiable (see CLAUDE.md and the LANGUAGE block below):
 *
 *        - "field training", "bonus load" — never "disruption" or
 *          "extra workout".
 *        - "peloton simulation opportunity" for group rides.
 *        - "protection day" — never "rest day" — for ripple-inserted recovery.
 *        - Always frame positively where possible.
 *
 * This module is PURE. No DOM, no localStorage, no fetches. The shell hands
 * it an unplanned record and the loaded plan; it returns plain values. The
 * shell is responsible for persisting the result and applying overlays.
 *
 * @see CLAUDE.md (Unplanned-activity section) for state schema and lifecycle.
 */

// ---------------------------------------------------------------------------
// CONSTANTS — TSS multipliers, label maps
// ---------------------------------------------------------------------------

/**
 * TSS produced per hour at each intensity code. Values from the feature
 * spec; calibrated for one-hour steady efforts. For multi-hour group rides
 * the real TSS is a function of dynamics (drafting, regrouping, surges) the
 * estimator cannot see — the coaching note flags this when relevant.
 * @type {Record<string, number>}
 */
const TSS_PER_HOUR = {
  easy: 40,
  moderate: 65,
  hard: 85,
  race_pace: 105,
};

/** Activity-type code → human label for the modal and the coach. */
export const ACTIVITY_TYPE_LABELS = {
  group_outdoor: 'Outdoor Group Ride',
  solo_outdoor:  'Solo Outdoor Ride',
  mtb_gravel:    'MTB / Gravel',
  race:          'Race / Event',
  cross_training:'Cross Training',
  other:         'Other',
};

/** Intensity code → human label. */
export const INTENSITY_LABELS = {
  easy:      'Easy',
  moderate:  'Moderate',
  hard:      'Hard',
  race_pace: 'Race Pace',
};

/** Time-of-day code → human label. */
export const TIME_OF_DAY_LABELS = {
  morning: 'Morning',
  midday:  'Midday',
  evening: 'Evening',
};

// ---------------------------------------------------------------------------
// PUBLIC API — estimation + bucket
// ---------------------------------------------------------------------------

/**
 * Estimate Training Stress Score for an unplanned activity.
 *
 * Linear in duration: TSS = (duration / 60) × per-hour-rate. Returns 0 for
 * non-positive duration. Unknown intensity falls back to "moderate" so the
 * estimator is never silently zero.
 *
 * @param {number} durationMin estimated total minutes
 * @param {keyof TSS_PER_HOUR} intensity 'easy' | 'moderate' | 'hard' | 'race_pace'
 * @returns {number} integer TSS estimate
 */
export function estimateTSS(durationMin, intensity) {
  if (!durationMin || durationMin <= 0) return 0;
  const perHour = TSS_PER_HOUR[intensity] ?? TSS_PER_HOUR.moderate;
  return Math.round((durationMin / 60) * perHour);
}

/**
 * Bucket a TSS into the band that drives the ripple rules.
 *
 *   <60       → 'light'    — no ripple, flagged as light bonus activity.
 *   60-99     → 'moderate' — next day intensity reduced by one level.
 *   100-149   → 'high'     — next day → protection, day after assessed.
 *   150+      → 'extreme'  — two protection days, day three assessed.
 *
 * @param {number} tss
 * @returns {'light'|'moderate'|'high'|'extreme'}
 */
export function tssBucket(tss) {
  if (tss < 60)  return 'light';
  if (tss < 100) return 'moderate';
  if (tss < 150) return 'high';
  return 'extreme';
}

/** Human label for a bucket — used in the coaching note. */
export function tssBucketLabel(bucket) {
  return bucket === 'light'    ? 'light bonus'
       : bucket === 'moderate' ? 'moderate load'
       : bucket === 'high'     ? 'heavy load'
       : 'high load — recovery matters';
}

/** Activity-type formatter used by the UI. */
export function activityTypeLabel(code) {
  return ACTIVITY_TYPE_LABELS[code] || code;
}

/** Intensity formatter used by the UI. */
export function intensityLabel(code) {
  return INTENSITY_LABELS[code] || code;
}

/** Time-of-day formatter used by the UI. */
export function timeOfDayLabel(code) {
  return TIME_OF_DAY_LABELS[code] || code;
}

// ---------------------------------------------------------------------------
// PUBLIC API — ripple computation
// ---------------------------------------------------------------------------

/**
 * Compute the ripple effect of an unplanned activity on the prescribed plan.
 *
 * Steps:
 *   1. Find the plan session for the activity's date. If the activity falls
 *      outside the block, returns a "no changes" stub with a friendly note.
 *   2. Always emit a `replace` change for the activity day (the field-
 *      training session absorbs whatever was prescribed).
 *   3. Apply per-bucket ripple rules to the next 1-3 days:
 *        moderate → 1 downgrade
 *        high     → 1 protection + 1 assess
 *        extreme  → 2 protections + 1 assess
 *      "Already a rest day" is special-cased on every step: no override is
 *      proposed; we record a `buffer_absorbed` change so the UI can show
 *      "the buffer absorbed it" and reassure the athlete.
 *   4. Generate a coaching note in the app's voice.
 *
 * The function does NOT mutate the plan. The caller decides whether to
 * persist the changes (and overlay them on the rendered plan) or to drop
 * them.
 *
 * @param {object} unplanned the unplanned record (must have `date`,
 *   `type`, and `estimated.tss`)
 * @param {object} plan the loaded training-plan.json
 * @returns {{
 *   changes: Array<object>,
 *   coachingNote: string,
 *   bucket: ReturnType<typeof tssBucket>
 * }}
 */
export function computeRipple(unplanned, plan) {
  const tss = unplanned?.estimated?.tss ?? 0;
  const bucket = tssBucket(tss);
  const rideDay = plan?.sessions?.find(s => s.date === unplanned.date) || null;

  if (!rideDay) {
    return {
      changes: [],
      bucket,
      coachingNote: 'Unplanned activity falls outside the current training block. Log the actuals after the ride and we will fold the load into trend math going forward.',
    };
  }

  /** @type {Array<object>} */
  const changes = [];

  // 1. Always: the activity replaces (or augments) the prescribed day.
  changes.push(buildReplaceChange(rideDay, unplanned));

  // 2. Per-bucket ripple onto subsequent days.
  if (bucket === 'light') {
    // No further ripple. Light bonus activity.
  } else if (bucket === 'moderate') {
    rippleDayDowngrade(plan, rideDay, 1, changes);
  } else if (bucket === 'high') {
    rippleDayProtection(plan, rideDay, 1, changes);
    rippleDayAssess(plan, rideDay, 2, changes);
  } else /* extreme */ {
    rippleDayProtection(plan, rideDay, 1, changes);
    rippleDayProtection(plan, rideDay, 2, changes);
    rippleDayAssess(plan, rideDay, 3, changes);
  }

  return {
    changes,
    bucket,
    coachingNote: buildCoachingNote(unplanned, changes, bucket),
  };
}

// ---------------------------------------------------------------------------
// INTERNAL — per-day change builders
// Each helper either appends one change to the changes array or no-ops.
// ---------------------------------------------------------------------------

/** Pluck the visible plan fields we want to show in before/after summaries. */
function pickPlanFields(s) {
  return {
    type: s.type,
    title: s.title,
    duration_min: s.duration_min,
    target_intensity: s.target_intensity,
  };
}

/**
 * Build the activity-day replace change. Always emitted (even when the day
 * was a rest — that's a "bonus load on a rest day" case, also useful to see).
 */
function buildReplaceChange(rideDay, unplanned) {
  const isGroup  = unplanned.type === 'group_outdoor';
  const distance = unplanned?.estimated?.distance;
  const unit     = unplanned?.estimated?.distance_unit || 'mi';
  const dur      = unplanned?.estimated?.duration_min;
  const tss      = unplanned?.estimated?.tss;

  const titleSuffix = isGroup
    ? 'Group Ride (Peloton Simulation)'
    : activityTypeLabel(unplanned.type);

  return {
    day: rideDay.day,
    kind: 'replace',
    before: pickPlanFields(rideDay),
    after: {
      type: rideDay.type === 'rest' ? 'endurance' : rideDay.type,
      badge: 'field',
      title: `Field Training — ${titleSuffix}`,
      duration_min: dur,
      target_intensity: intensityLabel(unplanned.estimated.intensity),
      notes: distance
        ? `~${distance} ${unit} · est TSS ${tss}`
        : `est TSS ${tss}`,
    },
    reason: rideDay.type === 'rest'
      ? 'Bonus load on a rest day — keep eyes on downstream recovery.'
      : `Field training session absorbs prescribed ${rideDay.title}.`,
  };
}

/**
 * Moderate-bucket ripple: downgrade the target day by one level. If the
 * target day is already rest, record a buffer_absorbed change instead.
 */
function rippleDayDowngrade(plan, rideDay, offset, changes) {
  const target = plan.sessions.find(s => s.day === rideDay.day + offset);
  if (!target) return;
  if (target.type === 'rest') {
    changes.push(bufferAbsorbedChange(target));
    return;
  }
  changes.push({
    day: target.day,
    kind: 'downgrade',
    before: pickPlanFields(target),
    after: {
      ...pickPlanFields(target),
      target_intensity: 'Easy end of the prescribed range',
      notes: 'Run at the easy end of every interval. No PRs today.',
    },
    reason: 'Carrying field-training load — downgrade today by one level.',
  });
}

/**
 * High/extreme-bucket ripple: convert the target day to a "protection day"
 * (45 min easy spin). If the target is already rest, record buffer_absorbed.
 */
function rippleDayProtection(plan, rideDay, offset, changes) {
  const target = plan.sessions.find(s => s.day === rideDay.day + offset);
  if (!target) return;
  if (target.type === 'rest') {
    changes.push(bufferAbsorbedChange(target));
    return;
  }
  changes.push({
    day: target.day,
    kind: 'protection',
    before: pickPlanFields(target),
    after: {
      type: 'recovery',
      badge: 'recovery',
      title: 'Protection Day',
      duration_min: 45,
      target_intensity: 'Z1 free spin',
      notes: 'Recovery spin only. No intervals. Free cadence. The system needs to absorb yesterday\'s load.',
    },
    reason: 'Field-training load needs absorption — protection day inserted.',
  });
}

/**
 * Assess-bucket ripple: leave the prescription in place but flag it for an
 * RHR check the morning of, *if* the target is a hard session (vo2 or
 * threshold). Anything else is a no-op (the day either is already rest, or
 * is endurance/recovery and doesn't need a flag).
 */
function rippleDayAssess(plan, rideDay, offset, changes) {
  const target = plan.sessions.find(s => s.day === rideDay.day + offset);
  if (!target) return;
  if (target.type === 'rest') {
    changes.push(bufferAbsorbedChange(target));
    return;
  }
  if (target.type === 'vo2' || target.type === 'threshold') {
    changes.push({
      day: target.day,
      kind: 'rhr_check',
      before: pickPlanFields(target),
      after: pickPlanFields(target), // prescription unchanged; only a flag
      flag: 'rhr_check',
      reason: 'Hard session post-bonus-load — verify resting HR is within baseline before proceeding. If RHR is 5+ bpm above baseline, swap to recovery.',
    });
  }
  // else: endurance/recovery on the assess day — leave as is, no change.
}

/** Record that a rest day absorbed the load without modification. */
function bufferAbsorbedChange(target) {
  return {
    day: target.day,
    kind: 'buffer_absorbed',
    before: pickPlanFields(target),
    after: pickPlanFields(target),
    reason: 'Already a rest day — the buffer absorbs the field-training load.',
  };
}

// ---------------------------------------------------------------------------
// INTERNAL — coaching note generation
// Strict language rules apply here. See top-of-file LANGUAGE block.
// ---------------------------------------------------------------------------

/**
 * Build the coaching note shown in the impact preview.
 *
 * Tone is positive-leaning: a group ride is a "peloton simulation
 * opportunity"; a protection day is "what lets the load stick"; a buffer
 * day is reassurance, not a warning. The note never frames the unplanned
 * activity as a disruption.
 *
 * @param {object} unplanned
 * @param {Array<object>} changes
 * @param {ReturnType<typeof tssBucket>} bucket
 * @returns {string} coaching note
 */
function buildCoachingNote(unplanned, changes, bucket) {
  const isGroup = unplanned.type === 'group_outdoor';
  const tss = unplanned?.estimated?.tss ?? 0;

  const opening = isGroup
    ? 'Group ride is a peloton simulation opportunity — exactly the load Tulsa demands, just earlier than the plan put it.'
    : `${activityTypeLabel(unplanned.type)} is field training — real-world load on top of the prescribed block.`;

  const tssLine = `Estimated TSS ${tss} (${tssBucketLabel(bucket)}).`;

  const groupCaveat = isGroup
    ? 'Group dynamics — drafting, regrouping, surges — make real TSS hard to predict. Log the actuals after.'
    : '';

  const dayLines = changes.map(describeChange).filter(Boolean).join(' ');

  return [opening, tssLine, dayLines, groupCaveat].filter(Boolean).join(' ');
}

/** One-sentence description of a single change, in the app's voice. */
function describeChange(c) {
  const day = `Day ${c.day}`;
  switch (c.kind) {
    case 'replace':         return `${day} prescription gets absorbed by the field session.`;
    case 'downgrade':       return `${day} downgraded — easy end of the prescribed range.`;
    case 'protection':      return `${day} becomes a protection day (recovery spin only).`;
    case 'buffer_absorbed': return `${day} is already rest — the buffer absorbs the load.`;
    case 'rhr_check':       return `${day} stays on the calendar pending an RHR check that morning.`;
    default:                return '';
  }
}
