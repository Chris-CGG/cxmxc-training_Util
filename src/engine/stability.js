// src/engine/stability.js
// Pure stability scoring + burst-crash pattern detection.
// No DOM, no globals, no localStorage access — caller passes in everything.
//
// Per CLAUDE.md rule 9: NEVER simplify or remove the burst-crash pattern logic.
// The 3+ day yellow watch and red-flag detection is the early warning system.

const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));

const DEFAULT_THRESHOLDS = {
  stability_score_green: 75,
  stability_score_yellow: 50,
  stability_score_red: 0,
};
const DEFAULT_RHR_BASELINE = 56;

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

export function bandColor(band) {
  return band === 'green' ? 'var(--green)'
       : band === 'yellow' ? 'var(--yellow)'
       : 'var(--red)';
}

export function bandLabel(band) {
  return band === 'green' ? 'GREEN — GO'
       : band === 'yellow' ? 'YELLOW — CAREFUL'
       : 'RED — RECOVER';
}

// Burst-crash early warning. Looks at the last several check-ins and reports
// flags the UI / adaptation layer can act on. Do not simplify this — see CLAUDE.md.
export function detectBurstCrashPattern(checkins) {
  const arr = checkins || [];
  const last3 = arr.slice(-3);
  const last5 = arr.slice(-5);
  const last14 = arr.slice(-14);

  const yellows3 = last3.filter(c => c.band === 'yellow').length;
  const reds3    = last3.filter(c => c.band === 'red').length;

  // Descending: every adjacent step in the last 5 is a drop.
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
