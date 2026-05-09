// src/engine/adaptation.js
// Translates stability state + plan day into mood-gated guidance and
// structured session adaptations. The language rules in moodGatedGuidance
// are non-negotiable — see CLAUDE.md rule 3.
//
// Public surface:
//   moodGatedGuidance(band, session, profile) -> string
//   adaptForPattern(session, pattern, profile) -> { action, reason, message } | null

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

// Structured adaptation derived from burst-crash flags. Caller decides whether
// to surface this — typically as a non-blocking banner, not as a hard override.
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
