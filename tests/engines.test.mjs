/**
 * Engine smoke-test suite.
 *
 * Phase 4 hardening deliverable. Lightweight Node-runnable suite that
 * exercises the contracts of each pure engine module. Designed to:
 *
 *   - Run with `node --test tests/` (no devDependencies required).
 *   - Catch regressions in scoring math, pattern detection, ripple rules,
 *     and system-prompt enforcement.
 *   - Stay fast (<1s on a laptop) and small (each test is one-screen).
 *
 * If a contract changes deliberately, update the relevant test in the same
 * commit as the engine change. If a test starts failing without a
 * corresponding intentional change, treat it as a regression.
 */

import { test } from 'node:test';
import { strict as assert } from 'node:assert';

import {
  computeStability,
  bandColor,
  bandLabel,
  detectBurstCrashPattern,
  checkinTrend,
} from '../src/engine/stability.js';
import {
  moodGatedGuidance,
  adaptForPattern,
} from '../src/engine/adaptation.js';
import {
  buildSystemPrompt,
  summarizeRecentSessions,
} from '../src/engine/ai-coach.js';
import {
  estimateTSS,
  tssBucket,
  tssBucketLabel,
  computeRipple,
  activityTypeLabel,
  intensityLabel,
} from '../src/engine/unplanned.js';

// ---------------------------------------------------------------------------
// Shared fixtures
// ---------------------------------------------------------------------------

const profile = {
  baseline: { resting_hr_baseline: 56 },
  thresholds: {
    stability_score_green: 75,
    stability_score_yellow: 50,
    stability_score_red: 0,
    hr_aerobic_ceiling: 150,
  },
};

const planFixture = {
  sessions: [
    { day: 1, date: '2026-05-07', type: 'benchmark', title: 'Day 1 Benchmark', duration_min: 83, target_intensity: 'Z2 controlled' },
    { day: 2, date: '2026-05-08', type: 'rest',     title: 'Full Recovery',  duration_min: 0,  target_intensity: 'REST' },
    { day: 3, date: '2026-05-09', type: 'threshold',title: 'Threshold Builder', duration_min: 75, target_intensity: '95-100% FTP' },
    { day: 4, date: '2026-05-10', type: 'endurance',title: 'Endurance + Sweet Spot', duration_min: 150, target_intensity: '88-92% FTP' },
    { day: 5, date: '2026-05-11', type: 'rest',     title: 'Full Recovery',  duration_min: 0,  target_intensity: 'REST' },
    { day: 6, date: '2026-05-12', type: 'vo2',      title: 'Ace Peloton Simulation', duration_min: 65, target_intensity: '120% FTP' },
  ],
};

const greenInputs = { sleep: 8, energy: 7, mood: 8, stress: 4, sore: 3, rhr: 56 };
const redInputs   = { sleep: 3, energy: 3, mood: 3, stress: 8, sore: 8, rhr: 75 };

// ---------------------------------------------------------------------------
// stability.js
// ---------------------------------------------------------------------------

test('stability: green-band inputs produce a green band', () => {
  const r = computeStability(greenInputs, profile);
  assert.equal(r.band, 'green');
  assert.ok(r.score >= profile.thresholds.stability_score_green);
});

test('stability: red-band inputs clamp to 0 and produce red', () => {
  const r = computeStability(redInputs, profile);
  assert.equal(r.band, 'red');
  assert.ok(r.score >= 0);
});

test('stability: rhr above baseline subtracts 2 points per bpm', () => {
  const baseline = computeStability({ ...greenInputs, rhr: 56 }, profile).score;
  const elevated = computeStability({ ...greenInputs, rhr: 60 }, profile).score;
  assert.equal(baseline - elevated, 8); // 4 bpm * 2 = 8
});

test('stability: bandColor and bandLabel cover all three bands', () => {
  assert.equal(bandColor('green'),  'var(--green)');
  assert.equal(bandColor('yellow'), 'var(--yellow)');
  assert.equal(bandColor('red'),    'var(--red)');
  assert.match(bandLabel('green'),  /GREEN/);
  assert.match(bandLabel('yellow'), /YELLOW/);
  assert.match(bandLabel('red'),    /RED/);
});

test('stability: burst-crash detector flags three yellows', () => {
  const checkins = [
    { date: '2026-05-05', score: 80, band: 'green' },
    { date: '2026-05-06', score: 55, band: 'yellow' },
    { date: '2026-05-07', score: 55, band: 'yellow' },
    { date: '2026-05-08', score: 55, band: 'yellow' },
  ];
  const p = detectBurstCrashPattern(checkins);
  assert.equal(p.threeYellows, true);
  assert.equal(p.anyRed, false);
  assert.equal(p.redFlag, true);
});

test('stability: burst-crash detector flags any red in last 3', () => {
  const checkins = [
    { date: '2026-05-06', score: 80, band: 'green' },
    { date: '2026-05-07', score: 60, band: 'yellow' },
    { date: '2026-05-08', score: 30, band: 'red' },
  ];
  const p = detectBurstCrashPattern(checkins);
  assert.equal(p.anyRed, true);
  assert.equal(p.redFlag, true);
});

test('stability: descending pattern requires every step in last 5 to drop', () => {
  const desc = [
    { date: '2026-05-04', score: 90, band: 'green' },
    { date: '2026-05-05', score: 80, band: 'green' },
    { date: '2026-05-06', score: 70, band: 'yellow' },
    { date: '2026-05-07', score: 60, band: 'yellow' },
    { date: '2026-05-08', score: 50, band: 'yellow' },
  ];
  assert.equal(detectBurstCrashPattern(desc).descending, true);

  const flat = [
    { score: 80, band: 'green' }, { score: 80, band: 'green' },
    { score: 80, band: 'green' }, { score: 80, band: 'green' },
    { score: 80, band: 'green' },
  ];
  assert.equal(detectBurstCrashPattern(flat).descending, false);
});

test('stability: checkinTrend returns null with fewer than 2 samples', () => {
  assert.equal(checkinTrend([]), null);
  assert.equal(checkinTrend([{ score: 80, band: 'green' }]), null);
});

// ---------------------------------------------------------------------------
// adaptation.js
// ---------------------------------------------------------------------------

test('adaptation: green-day threshold session uses tactical language', () => {
  const session = planFixture.sessions[2]; // Day 3 threshold
  const text = moodGatedGuidance('green', session, profile);
  assert.match(text, /System is green/);
  assert.match(text, /ERG OFF|ERG ON/);
  assert.doesNotMatch(text, /anxiety|stressed out/i);
});

test('adaptation: yellow-day hard session offers options', () => {
  const session = planFixture.sessions[2]; // Day 3 threshold
  const text = moodGatedGuidance('yellow', session, profile);
  assert.match(text, /Option A.*Option B/s);
  assert.match(text, /carrying weight/i);
});

test('adaptation: red-day non-rest prescribes recovery, never weakness framing', () => {
  const session = planFixture.sessions[2];
  const text = moodGatedGuidance('red', session, profile);
  assert.match(text, /rest/i);
  assert.doesNotMatch(text, /lazy|weak|failure/i);
});

test('adaptation: red-day rest day reinforces, does not chastise', () => {
  const session = planFixture.sessions[1]; // rest
  const text = moodGatedGuidance('red', session, profile);
  assert.match(text, /rest day/i);
  assert.doesNotMatch(text, /lazy|weak|failure/i);
});

test('adaptation: adaptForPattern.anyRed returns replace_with_rest', () => {
  const r = adaptForPattern(planFixture.sessions[2], { anyRed: true }, profile);
  assert.equal(r.action, 'replace_with_rest');
});

test('adaptation: adaptForPattern.threeYellows on hard session cuts volume', () => {
  const r = adaptForPattern(planFixture.sessions[2], { threeYellows: true }, profile);
  assert.equal(r.action, 'cut_volume_50');
});

test('adaptation: adaptForPattern returns null when no flag is tripped', () => {
  const r = adaptForPattern(planFixture.sessions[2], {}, profile);
  assert.equal(r, null);
});

// ---------------------------------------------------------------------------
// ai-coach.js
// ---------------------------------------------------------------------------

// Minimal profile fixture for the system-prompt tests. Identity values
// are placeholders — the real ones live in athlete-private.json (gitignored).
const profileFixture = {
  athlete: { name: 'Tester', username: 'tester', age: 30, weight_kg: 75 },
  baseline: { ftp_current: 220, natural_cadence_uncoached: 80, cadence_ceiling_proven: 110 },
  background: {
    primary_discipline: 'cyclist',
    road_experience: 'group rides',
    breathing: { allergies: false },
    mental_health: {},
  },
  goals: [
    { id: 'g1', name: 'Test Race', date: '2099-01-01', distance_miles: 50, priority: 1 },
  ],
};

test('ai-coach: buildSystemPrompt requires profile', () => {
  assert.throws(() => buildSystemPrompt({ profile: null, todayCheckin: { band: 'green', score: 80 } }),
                /profile/);
});

test('ai-coach: buildSystemPrompt requires today checkin (CLAUDE.md rule 10)', () => {
  assert.throws(() => buildSystemPrompt({ profile: profileFixture, todayCheckin: null }), /mood gate/);
  assert.throws(() => buildSystemPrompt({ profile: profileFixture, todayCheckin: {} }), /mood gate/);
});

test('ai-coach: buildSystemPrompt embeds band, score, and language rules', () => {
  const s = buildSystemPrompt({
    profile: profileFixture,
    todayCheckin: { band: 'green', score: 80 },
    session: { title: 'X', description: 'Y' },
    recentLogText: '',
  });
  assert.match(s, /green/);
  assert.match(s, /80/);
  // Language rules baked in:
  assert.match(s, /nervous system load/);
  assert.match(s, /carrying weight/);
});

test('ai-coach: buildSystemPrompt reads identity from profile (no hardcoded names)', () => {
  const s = buildSystemPrompt({
    profile: profileFixture,
    todayCheckin: { band: 'green', score: 80 },
    session: null,
    recentLogText: '',
  });
  // Profile values flow through verbatim — fixture name + FTP appear.
  assert.match(s, /Tester/);
  assert.match(s, /220 W/);
  // Regression guard against the pre-audit v0.1.0 hardcoded athlete-identity
  // line ("You are <name>'s expert cycling coach. Athlete: <name>, ...").
  // The username/name in the rendered prompt should always be the fixture's,
  // not any value baked into the module source.
  // Case-insensitive: username "tester" + name "Tester" both flow into the prompt.
  const fixtureNameCount = (s.match(/tester/gi) || []).length;
  assert.ok(fixtureNameCount >= 2, 'expected fixture name to appear at least twice (username + Athlete: line)');
});

test('ai-coach: medical-condition lines only appear when flags are set', () => {
  const noConditions = buildSystemPrompt({
    profile: profileFixture,
    todayCheckin: { band: 'green', score: 80 },
    session: null,
    recentLogText: '',
  });
  assert.doesNotMatch(noConditions, /Septal deviation/);
  assert.doesNotMatch(noConditions, /panic attacks/i);

  const withConditions = buildSystemPrompt({
    profile: {
      ...profileFixture,
      background: {
        ...profileFixture.background,
        breathing: { condition: 'septal_deviation', allergies: true },
        mental_health: { panic_attacks_history: true, burst_crash_pattern: true },
      },
    },
    todayCheckin: { band: 'green', score: 80 },
    session: null,
    recentLogText: '',
  });
  assert.match(withConditions, /Septal deviation/);
  assert.match(withConditions, /panic attacks/i);
});

test('ai-coach: summarizeRecentSessions handles empty input', () => {
  assert.equal(summarizeRecentSessions([]), '');
  assert.equal(summarizeRecentSessions(undefined), '');
});

// ---------------------------------------------------------------------------
// unplanned.js
// ---------------------------------------------------------------------------

test('unplanned: TSS per-hour rates match the spec', () => {
  assert.equal(estimateTSS(60, 'easy'),       40);
  assert.equal(estimateTSS(60, 'moderate'),   65);
  assert.equal(estimateTSS(60, 'hard'),       85);
  assert.equal(estimateTSS(60, 'race_pace'), 105);
});

test('unplanned: TSS scales linearly with duration', () => {
  assert.equal(estimateTSS(120, 'moderate'), 130);
  assert.equal(estimateTSS(30,  'hard'),     43); // round(0.5 * 85) = 43
});

test('unplanned: tssBucket boundaries', () => {
  assert.equal(tssBucket(0),   'light');
  assert.equal(tssBucket(59),  'light');
  assert.equal(tssBucket(60),  'moderate');
  assert.equal(tssBucket(99),  'moderate');
  assert.equal(tssBucket(100), 'high');
  assert.equal(tssBucket(149), 'high');
  assert.equal(tssBucket(150), 'extreme');
  assert.equal(tssBucket(300), 'extreme');
});

test('unplanned: seed scenario — 3.5h hard group ride on Day 3 produces spec ripple', () => {
  const unp = {
    date: '2026-05-09',
    type: 'group_outdoor',
    estimated: { distance: 62, distance_unit: 'mi', duration_min: 210, intensity: 'hard', tss: estimateTSS(210, 'hard') },
  };
  const r = computeRipple(unp, planFixture);

  // Five days touched: replace D3 + protection D4 + protection D5 (buffer absorbed) + assess D6
  const days = r.changes.map(c => c.day);
  assert.deepEqual(days, [3, 4, 5, 6]);

  const kindByDay = Object.fromEntries(r.changes.map(c => [c.day, c.kind]));
  assert.equal(kindByDay[3], 'replace');
  assert.equal(kindByDay[4], 'protection');
  assert.equal(kindByDay[5], 'buffer_absorbed');
  assert.equal(kindByDay[6], 'rhr_check');

  // Coaching note hits the required language
  assert.match(r.coachingNote, /peloton simulation opportunity/);
  assert.match(r.coachingNote, /protection day/);
  assert.doesNotMatch(r.coachingNote, /disruption|extra workout/i);
});

test('unplanned: light bucket produces no downstream changes', () => {
  const unp = {
    date: '2026-05-09',
    type: 'solo_outdoor',
    estimated: { duration_min: 60, intensity: 'easy', tss: estimateTSS(60, 'easy') },
  };
  const r = computeRipple(unp, planFixture);
  // Only the activity-day replace
  assert.equal(r.changes.length, 1);
  assert.equal(r.changes[0].kind, 'replace');
});

test('unplanned: activity outside the block returns no changes', () => {
  const unp = {
    date: '2099-01-01',
    type: 'solo_outdoor',
    estimated: { duration_min: 60, intensity: 'moderate', tss: estimateTSS(60, 'moderate') },
  };
  const r = computeRipple(unp, planFixture);
  assert.equal(r.changes.length, 0);
  assert.match(r.coachingNote, /outside the current training block/);
});

test('unplanned: formatters return readable labels', () => {
  assert.equal(activityTypeLabel('group_outdoor'), 'Outdoor Group Ride');
  assert.equal(intensityLabel('race_pace'),        'Race Pace');
  assert.equal(tssBucketLabel('extreme'),          'high load — recovery matters');
});
