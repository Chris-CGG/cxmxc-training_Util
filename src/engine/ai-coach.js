// src/engine/ai-coach.js
// Anthropic API wrapper. Browser-direct call.
//
// Per CLAUDE.md rule 10: every coach prompt MUST include today's mood gate
// band and stability score. buildSystemPrompt enforces that contract.
//
// Public surface:
//   buildSystemPrompt({ todayCheckin, session, recentLogText }) -> string
//   askCoach({ apiKey, userPrompt, todayCheckin, session, recentLogText, model?, maxTokens? }) -> { ok, text }
//   summarizeRecentSessions(sessions, n?) -> string

const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages';
const ANTHROPIC_VERSION = '2023-06-01';
const DEFAULT_MODEL = 'claude-sonnet-4-6';
const DEFAULT_MAX_TOKENS = 700;

export function buildSystemPrompt({ todayCheckin, session, recentLogText }) {
  if (!todayCheckin || todayCheckin.band == null || todayCheckin.score == null) {
    throw new Error('AI coach requires today\'s mood gate state and stability score (CLAUDE.md rule 10).');
  }
  return `You are CxMxC's expert cycling coach.
Athlete: Chris Clarke-Gonzalez, 36, 93 kg, FTP 232 W. Fixed-gear urban crit background. Learning Ace-pace road peloton dynamics. Natural cadence 61 RPM (proven ceiling 111). Target: Tulsa Tough Ace Peloton Fondo 2026-06-06 (103 mi). Secondary: EHOTS RGV MTB 2026-07-05.
Constraints to respect:
- Septal deviation + pollen allergies — affects breathing under load.
- History of panic attacks under high HR; burst-crash training cycles tied to mental stress and heat.
- Treat mental state as physiological data — never as weakness.
- Use the language: "nervous system load", "carrying weight", "the system needs to recover". Never "anxiety" or "stressed out".
- Mood-gated tone: GREEN = tactical and pushing, YELLOW = options-based and cautious, RED = protective and recovery-first.
- Rest days are non-negotiable. Adding sessions on a red day is wrong.
Today's stability band: ${todayCheckin.band} (score ${todayCheckin.score}).
Today's prescribed: ${session ? `${session.title} — ${session.description}` : 'none'}.
Recent log highlights: ${recentLogText || 'none'}.
Be direct, concrete, and concise. Reference watts, RPM, HR. No platitudes.`;
}

export async function askCoach({ apiKey, userPrompt, todayCheckin, session, recentLogText, model = DEFAULT_MODEL, maxTokens = DEFAULT_MAX_TOKENS }) {
  if (!apiKey) {
    return { ok: false, text: 'No API key saved. Add one in Profile → AI Coach.' };
  }
  if (!todayCheckin) {
    return { ok: false, text: 'Run today\'s check-in first. Coach requires the mood gate state and stability score.' };
  }

  let system;
  try {
    system = buildSystemPrompt({ todayCheckin, session, recentLogText });
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

export function summarizeRecentSessions(sessions, n = 5) {
  const recent = (sessions || []).slice(-n);
  if (!recent.length) return '';
  return recent.map(s =>
    `${s.date} ${s.day ? 'D' + s.day : ''} ${s.avg_power_w || '-'}W avg, ${s.np_w || '-'}NP, ${s.avg_hr || '-'}HR, ${s.avg_cadence || '-'}rpm, ${s.duration_min || '-'}min`
  ).join(' | ');
}
