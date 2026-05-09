/**
 * @module src/engine/ai-coach
 * @description Anthropic API wrapper for the in-app coach.
 *
 * The coach is a curated, mood-gated layer on top of the Anthropic Messages
 * API. It does NOT have full access to the athlete profile — only the parts
 * the system prompt baked in here, plus today's check-in band/score, today's
 * prescribed session, and a short recent-log summary. This keeps the prompt
 * focused, the cost low, and the privacy posture conservative (CLAUDE.md
 * compliance note).
 *
 * Hard contracts:
 *
 *   1. Per CLAUDE.md rule 10, EVERY coach prompt must include today's mood
 *      gate band and stability score. `buildSystemPrompt` enforces this with
 *      a thrown error if the check-in is missing. `askCoach` enforces it with
 *      a soft refusal that returns a friendly `{ ok:false }`.
 *
 *   2. The API key is supplied by the caller. We never read localStorage
 *      from inside this module — that would couple it to one storage layer
 *      and make the v2 Supabase migration harder.
 *
 *   3. The browser-direct call uses `anthropic-dangerous-direct-browser-access:
 *      true`. That header is required for browser fetches. The key never
 *      leaves the device for any non-Anthropic origin.
 *
 *   4. Default model is `claude-sonnet-4-6` — current capable model with
 *      good cost/latency for short coaching messages. Caller can override.
 *
 * @see CLAUDE.md rule 10.
 */

/** @type {string} Anthropic Messages API endpoint. */
const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages';

/** @type {string} Anthropic API version header value. */
const ANTHROPIC_VERSION = '2023-06-01';

/** @type {string} Default model for the coach. */
const DEFAULT_MODEL = 'claude-sonnet-4-6';

/** @type {number} Default max output tokens. Coaching messages are short. */
const DEFAULT_MAX_TOKENS = 700;

/**
 * Build the system prompt for a coach call.
 *
 * The prompt bakes in the athlete's identity, the constraints we want the
 * coach to honour (language rules, breathing condition, panic-attack history,
 * mood-gated tone), and the day's situational context (today's band/score,
 * prescribed session, recent log).
 *
 * Throws if the caller did not supply today's check-in. This is intentional
 * — CLAUDE.md rule 10 requires the band and score in every prompt, and
 * silently producing a coach call without them would erode the contract.
 *
 * Personal-health-adjacent context (athlete name, weight, breathing condition,
 * mental-health pattern flags) is read from `profile` at call time rather
 * than hardcoded in this file. The public repo's athlete-profile.json holds
 * only fitness numbers + goals; the gitignored athlete-private.json holds
 * the identifying + medical fields. The shell merges them at boot. See
 * docs/SECURITY.md.
 *
 * @param {object} ctx
 * @param {object} ctx.profile Merged athlete profile (public + private).
 *   Required. The function looks up name, weight_kg, FTP, cadence, goals,
 *   breathing condition, and mental-health flags from this object.
 * @param {{band:'green'|'yellow'|'red', score:number}} ctx.todayCheckin
 *   Today's check-in. Must contain band and score.
 * @param {object|null} ctx.session - Today's prescribed session, or null.
 * @param {string} ctx.recentLogText - One-line per-session digest from
 *   `summarizeRecentSessions`, or '' if none.
 * @returns {string} System prompt ready for the Messages API.
 * @throws {Error} If `profile` is missing, or if `todayCheckin.band`
 *   or `todayCheckin.score` is missing.
 */
export function buildSystemPrompt({ profile, todayCheckin, session, recentLogText }) {
  if (!profile) {
    throw new Error('AI coach requires the athlete profile.');
  }
  if (!todayCheckin || todayCheckin.band == null || todayCheckin.score == null) {
    throw new Error('AI coach requires today\'s mood gate state and stability score (CLAUDE.md rule 10).');
  }

  const a       = profile.athlete   || {};
  const b       = profile.baseline  || {};
  const bg      = profile.background || {};
  const goals   = profile.goals     || [];
  const breath  = bg.breathing      || {};
  const mh      = bg.mental_health  || {};

  const username      = a.username || 'the athlete';
  const name          = a.name     || 'the athlete';
  const age           = a.age      ?? '—';
  const weightKg      = a.weight_kg ?? '—';
  const ftp           = b.ftp_current ?? '—';
  const cadenceNat    = b.natural_cadence_uncoached ?? '—';
  const cadenceMax    = b.cadence_ceiling_proven    ?? '—';
  const discipline    = bg.primary_discipline || 'cyclist';
  const roadExp       = bg.road_experience    || 'cyclist';
  const primary       = goals.find(g => g.priority === 1);
  const secondary     = goals.find(g => g.priority === 2);

  // Constraints assembled from the profile rather than baked into the
  // prompt. Each entry is appended only when the relevant flag is set.
  const constraints = [];
  if (breath.condition === 'septal_deviation') constraints.push('- Septal deviation — affects airflow under high HR.');
  if (breath.allergies || breath.pollen_sensitivity) constraints.push('- Allergies / pollen sensitivity — affects breathing under load.');
  if (mh.panic_attacks_history) constraints.push('- History of panic attacks under high HR.');
  if (mh.burst_crash_pattern)   constraints.push('- Burst-crash training cycle pattern tied to mental stress and heat — protect against compounding load.');
  if (mh.heat_sensitivity)      constraints.push('- Heat sensitivity — race-day weather is a known stressor.');
  if (mh.stress_ftp_correlation) constraints.push('- Stress-FTP correlation — life stress is training stress.');

  const goalLine = primary
    ? `Target: ${primary.name}${primary.date ? ' ' + primary.date : ''}${primary.distance_miles ? ' (' + primary.distance_miles + ' mi)' : ''}.`
    : '';
  const secondaryLine = secondary
    ? `Secondary: ${secondary.name}${secondary.date ? ' ' + secondary.date : ''}.`
    : '';

  return `You are ${username}'s expert cycling coach.
Athlete: ${name}, ${age}, ${weightKg} kg, FTP ${ftp} W. ${discipline} background. ${roadExp}. Natural cadence ${cadenceNat} RPM (proven ceiling ${cadenceMax}). ${goalLine} ${secondaryLine}
Constraints to respect:
${constraints.join('\n') || '- Listen to the athlete’s reported state and treat it as physiological data.'}
- Treat mental state as physiological data — never as weakness.
- Use the language: "nervous system load", "carrying weight", "the system needs to recover". Never "anxiety" or "stressed out".
- Mood-gated tone: GREEN = tactical and pushing, YELLOW = options-based and cautious, RED = protective and recovery-first.
- Rest days are non-negotiable. Adding sessions on a red day is wrong.
Today's stability band: ${todayCheckin.band} (score ${todayCheckin.score}).
Today's prescribed: ${session ? `${session.title} — ${session.description}` : 'none'}.
Recent log highlights: ${recentLogText || 'none'}.
Be direct, concrete, and concise. Reference watts, RPM, HR. No platitudes.`;
}

/**
 * Call the Anthropic Messages API with the coach prompt and return the text.
 *
 * Returns a `{ ok, text }` shape rather than throwing on user-facing errors,
 * so the UI can render either the success text or the error text into the
 * same coach bubble without a try/catch in the call site.
 *
 * Failure modes (all return `{ ok:false, text: ... }`):
 *   - No API key.
 *   - No check-in for today (mood gate enforcement).
 *   - System prompt build threw (missing band/score).
 *   - HTTP non-2xx (returns the status and a short snippet of the body).
 *   - Network/fetch threw.
 *
 * @param {object} args
 * @param {string} args.apiKey - Anthropic API key. Comes from localStorage in
 *   the shell; this module does not read storage itself.
 * @param {string} args.userPrompt - The user's question for the coach.
 * @param {object} args.profile - Merged athlete profile (public + private).
 *   Required. Used to assemble the system prompt with athlete-specific
 *   context that is no longer hardcoded in source.
 * @param {{band:'green'|'yellow'|'red', score:number}|null} args.todayCheckin
 *   Required. If null, the call is refused before any network traffic.
 * @param {object|null} args.session - Today's prescribed session, or null.
 * @param {string} args.recentLogText - Recent session digest.
 * @param {string} [args.model=claude-sonnet-4-6] - Override model id.
 * @param {number} [args.maxTokens=700] - Override max output tokens.
 * @returns {Promise<{ok:boolean, text:string}>}
 */
export async function askCoach({ apiKey, userPrompt, profile, todayCheckin, session, recentLogText, model = DEFAULT_MODEL, maxTokens = DEFAULT_MAX_TOKENS }) {
  if (!apiKey) {
    return { ok: false, text: 'No API key saved. Add one in Profile → AI Coach.' };
  }
  if (!profile) {
    return { ok: false, text: 'Athlete profile not loaded yet. Reload the app and try again.' };
  }
  if (!todayCheckin) {
    return { ok: false, text: 'Run today\'s check-in first. Coach requires the mood gate state and stability score.' };
  }

  let system;
  try {
    system = buildSystemPrompt({ profile, todayCheckin, session, recentLogText });
  } catch (e) {
    return { ok: false, text: e.message };
  }

  try {
    const res = await fetch(ANTHROPIC_URL, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': ANTHROPIC_VERSION,
        // Required for browser-origin calls. Key never leaves device for any
        // non-Anthropic origin.
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify({
        model,
        max_tokens: maxTokens,
        system,
        messages: [{ role: 'user', content: userPrompt }],
      }),
    });
    if (!res.ok) {
      const errTxt = await res.text();
      return { ok: false, text: `API error ${res.status}: ${errTxt.slice(0, 240)}` };
    }
    const data = await res.json();
    // Messages API returns content blocks. We only render text blocks; tool_use
    // blocks would be ignored here. The coach does not use tools today.
    const text = (data.content || [])
      .filter(b => b.type === 'text')
      .map(b => b.text)
      .join('\n')
      .trim();
    return { ok: true, text: text || '(empty response)' };
  } catch (err) {
    return { ok: false, text: `Network error: ${err.message}` };
  }
}

/**
 * One-line digest of the last `n` logged sessions, for the coach prompt.
 *
 * Output shape per session:
 *   `YYYY-MM-DD D7 184W avg, 199NP, 159HR, 86rpm, 35min`
 *
 * Joined with ` | ` between sessions. Returns '' on empty input. Designed to
 * fit comfortably inside a single system-prompt line without ballooning the
 * token count.
 *
 * @param {Array<object>} sessions - Logged sessions, oldest first.
 * @param {number} [n=5] - How many recent sessions to include.
 * @returns {string}
 */
export function summarizeRecentSessions(sessions, n = 5) {
  const recent = (sessions || []).slice(-n);
  if (!recent.length) return '';
  return recent.map(s =>
    `${s.date} ${s.day ? 'D' + s.day : ''} ${s.avg_power_w || '-'}W avg, ${s.np_w || '-'}NP, ${s.avg_hr || '-'}HR, ${s.avg_cadence || '-'}rpm, ${s.duration_min || '-'}min`
  ).join(' | ');
}
