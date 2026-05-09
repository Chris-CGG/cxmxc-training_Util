/**
 * @module src/engine/vision
 * @description Claude Vision API wrapper for cycling-data extraction
 *   from photographs of cycling computers, app screens, and training-
 *   platform summary screens.
 *
 * Single use case in v0.2.0: the user takes a photo on the Photo tab of
 * the Data screen, this module sends the image (as base64) to the Anthropic
 * Messages API with a strict extraction system prompt, and returns the
 * parsed JSON the UI uses to populate the editable stat cards.
 *
 * Hard contracts:
 *
 *   1. The image is sent ONLY to `api.anthropic.com`. The shell holds the
 *      base64 data URL in memory only and is responsible for discarding it
 *      after this call returns. This module does not persist anything.
 *
 *   2. The shell supplies the API key by argument. Per CLAUDE.md rule 8 and
 *      ai-coach.js convention, this module never reads localStorage itself —
 *      keeps the storage-layer coupling at one site (the wire-up in
 *      index.html).
 *
 *   3. Default model is `claude-sonnet-4-6` (current latest Sonnet with
 *      vision support). Caller can override via `model`. The original
 *      feature spec named claude-sonnet-4-20250514, but per the project
 *      AI-coach convention we use the current latest model so all coach +
 *      vision calls stay on one model class.
 *
 *   4. The response is parsed inside this module. Some Sonnet builds wrap
 *      JSON in markdown code fences despite the system prompt instruction
 *      not to; the parser strips those before parsing. Returns
 *      `{ ok, json, raw, error }` so the UI never has to re-parse.
 *
 * @see CLAUDE.md rule 8 (compliance posture).
 */

const ANTHROPIC_URL     = 'https://api.anthropic.com/v1/messages';
const ANTHROPIC_VERSION = '2023-06-01';
const DEFAULT_MODEL     = 'claude-sonnet-4-6';
const DEFAULT_MAX_TOKENS = 1024;

/**
 * The system prompt the model receives. Pinned to the schema in the feature
 * spec exactly. Any change here must be coordinated with the UI's renderer
 * because field names appear in the stat-card grid.
 * @type {string}
 */
const VISION_SYSTEM_PROMPT = `You are a cycling data extraction specialist. The user has photographed a cycling computer, app screen, or training platform summary screen. Extract ALL visible metrics and return ONLY valid JSON. No preamble, no explanation, just JSON.

Return this exact schema (use null for any field not visible):
{
  "source": "ROUVY|Strava|Garmin|Wahoo|Unknown",
  "activity_type": "string or null",
  "date": "string or null",
  "duration_seconds": "number or null",
  "distance_km": "number or null",
  "distance_miles": "number or null",
  "elevation_m": "number or null",
  "elevation_ft": "number or null",
  "avg_power_w": "number or null",
  "normalized_power_w": "number or null",
  "max_power_w": "number or null",
  "avg_hr_bpm": "number or null",
  "max_hr_bpm": "number or null",
  "avg_cadence_rpm": "number or null",
  "avg_speed_mph": "number or null",
  "tss": "number or null",
  "intensity_factor": "number or null",
  "calories_kcal": "number or null",
  "zones": {
    "z1_pct": "number or null",
    "z2_pct": "number or null",
    "z3_pct": "number or null",
    "z4_pct": "number or null",
    "z5_pct": "number or null",
    "z6_pct": "number or null",
    "z7_pct": "number or null"
  },
  "workout_name": "string or null",
  "route_name": "string or null",
  "personal_records": "array of strings or null",
  "raw_notes": "string with any other visible data"
}`;

/**
 * Strip a leading/trailing markdown code fence (` ```json ... ``` `) if the
 * model wrapped the JSON despite the instruction not to. No-op if no fence
 * is present.
 * @param {string} s raw model output text
 * @returns {string} fence-stripped JSON candidate
 */
function stripCodeFence(s) {
  return s.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
}

/**
 * Call the Anthropic Messages API with a single image + extraction prompt.
 *
 * Failure modes (all return `{ ok: false, error: <message> }`):
 *   - No API key supplied.
 *   - No image data supplied.
 *   - HTTP non-2xx (returns the status and a short body snippet).
 *   - Network throw.
 *   - Response present but does not parse as JSON (returns raw too so
 *     the caller can show the model's actual text for debugging).
 *
 * @param {object} args
 * @param {string} args.apiKey Anthropic API key. Comes from localStorage in
 *   the shell; this module does not read storage itself.
 * @param {string} args.imageBase64 The image as a bare base64 string
 *   (without any "data:...,;base64," prefix). The caller is responsible
 *   for stripping the data-URL header.
 * @param {string} [args.mediaType="image/jpeg"] MIME type of the image.
 *   Anthropic supports image/jpeg, image/png, image/gif, image/webp.
 * @param {string} [args.model="claude-sonnet-4-6"] Override the model.
 * @param {number} [args.maxTokens=1024] Override max output tokens.
 * @returns {Promise<{ok:boolean, json?:object, raw?:string, error?:string}>}
 */
export async function extractCyclingData({ apiKey, imageBase64, mediaType = 'image/jpeg', model = DEFAULT_MODEL, maxTokens = DEFAULT_MAX_TOKENS }) {
  if (!apiKey)       return { ok: false, error: 'No API key saved. Add one in Profile → AI Coach.' };
  if (!imageBase64)  return { ok: false, error: 'No image data to analyze.' };

  let res;
  try {
    res = await fetch(ANTHROPIC_URL, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': ANTHROPIC_VERSION,
        // Required for browser-direct calls. Key never leaves device for
        // any non-Anthropic origin.
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify({
        model,
        max_tokens: maxTokens,
        system: VISION_SYSTEM_PROMPT,
        messages: [{
          role: 'user',
          content: [
            { type: 'image', source: { type: 'base64', media_type: mediaType, data: imageBase64 } },
            { type: 'text',  text: 'Extract all visible cycling data from this image as JSON.' },
          ],
        }],
      }),
    });
  } catch (err) {
    return { ok: false, error: `Network error: ${err.message}` };
  }

  if (!res.ok) {
    const errTxt = await res.text().catch(() => '');
    return { ok: false, error: `API error ${res.status}: ${errTxt.slice(0, 240)}` };
  }

  const data = await res.json().catch(() => null);
  if (!data) return { ok: false, error: 'API returned a non-JSON envelope.' };

  const raw = (data.content || [])
    .filter(b => b.type === 'text')
    .map(b => b.text)
    .join('\n')
    .trim();

  let json;
  try {
    json = JSON.parse(stripCodeFence(raw));
  } catch (e) {
    return { ok: false, raw, error: `Could not parse JSON from model output. ${e.message}` };
  }

  return { ok: true, json, raw };
}
