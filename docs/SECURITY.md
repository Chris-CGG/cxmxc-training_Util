# Security Checklist — v0.1.0

> Phase 4 deliverable. The GATES.md Phase 4 security gate listed five must-haves. This document walks each one against v0.1.0 and records the verification. Where a gap exists, it is named explicitly with the proposed mitigation rather than handwaved.

Compliance posture: ISO 27001, NIST 800-171, HIPAA-adjacent, PCI, CMMC Level 2, NIST AI RMF (per CLAUDE.md rule 8).

Scope: cxmxc-training v0.1.0 — single-tenant single-device PWA. No backend, no auth layer, no third-party analytics.

---

## Phase 4 gate items

### ✅ No secrets in source

**Status:** Pass.

**How verified:**
```bash
# No Anthropic key patterns in tracked files
git grep -nE 'sk-ant-[a-zA-Z0-9_-]+' || echo 'clean'
# No generic API key patterns
git grep -nEi '(api[_-]?key|secret|token)\s*[:=]\s*"[a-zA-Z0-9]{20,}"' || echo 'clean'
# .env is gitignored
grep -F '.env' .gitignore
# No .env file tracked
git ls-files | grep -E '^\.env$' || echo 'clean'
```

All four checks return clean against the v0.1.0 tree.

**Posture:** `.env.example` is committed as a placeholder with the variable name and a comment; the actual `.env` is in `.gitignore`. The Anthropic API key is never written to source under any circumstance — it lives in `localStorage` only (see next item).

### ✅ API keys live in env vars or per-device storage only

**Status:** Pass.

**Implementation:**
- The Anthropic API key is entered by the user on the Profile screen (`#api-key` input, `type="password"`).
- On save, the key is stored under `localStorage['cxmxc.apiKey']`. The handler in `index.html#wire()` is the only writer.
- The input is cleared after save, and the placeholder is replaced with `•` characters + "(saved)" so the actual key is never echoed back into the DOM.
- The key is read by the click handler for "Ask Coach Now" and passed *by argument* to `askCoach({ apiKey, ... })`. The `ai-coach.js` module does not read `localStorage` itself — explicitly designed to keep the storage-layer coupling at one site.
- The key never leaves the device for any origin other than `https://api.anthropic.com`.

**Mitigation if key exfiltration ever became a concern:** v2 would proxy the call through a server-side Edge Function, removing the key from the client entirely. v1 accepts browser-direct because the trust model is "user's key, user's device, user's coach" and the alternative (no AI coach in v1) is worse.

### ✅ No personal data sent to third-party origins beyond what was declared in architecture

**Status:** Pass.

**External requests in v1:**
| Origin | Purpose | What is sent |
|---|---|---|
| `fonts.googleapis.com`, `fonts.gstatic.com` | Bebas Neue + DM Mono web fonts | None — standard CSS @font-face request, no athlete data |
| `api.anthropic.com` | AI coach Messages API | Curated prompt subset (see below) — never the full athlete profile |

**What is sent to Anthropic:**
- A system prompt assembled by `buildSystemPrompt()` in `ai-coach.js`, containing:
  - Athlete identity at coarse granularity (name, age, weight, FTP, cadence baseline, breathing condition tag, mental-state framing tag).
  - Today's mood-gate band and stability score (mandatory per CLAUDE.md rule 10).
  - Today's prescribed session title + description.
  - A one-line digest of the last 5 logged sessions (date, day number, avg power, NP, HR, cadence, duration).
- The user's typed question.

**What is NOT sent to Anthropic:**
- The full athlete profile JSON.
- Historical check-in data, supplement data, water log data.
- The plan JSON in full.
- Any URL-encoded identifier of the athlete beyond first name (used as voice anchor, not as identifier).

This boundary is enforced as code, not as policy: `ai-coach.js` constructs the prompt; the shell hands it the curated context object. If a future feature needs to send more, the change is visible in code review.

### ✅ Auth follows architecture spec

**Status:** Pass (vacuously — no auth in v1).

v1 is single-tenant single-device. There is no login, no session, no token. The `architecture.md` and `DISCOVERY.md` documents are explicit that auth is deferred to v2 alongside the Supabase mirror.

When v2 introduces auth, this section should be rewritten with the chosen flow (Supabase Auth, magic-link email, OAuth provider, etc.) and the credential storage approach.

### ✅ HTTPS-only third-party calls

**Status:** Pass.

Both external endpoints (`fonts.googleapis.com`, `api.anthropic.com`) use HTTPS. The `service-worker.js` only proxies same-origin GET requests; cross-origin requests bypass the worker and go straight to the network with the browser's TLS handling intact.

The local dev server (`python3 -m http.server`) serves plain HTTP on the LAN. This is acceptable for development on a private home network and is documented as such in CLAUDE.md and the README. Production deployment (Phase 5) must be HTTPS — GitHub Pages provides this by default.

---

## Additional checks (beyond the gate items)

### ✅ XSS protection on user-supplied input

**Status:** Pass.

All user-supplied or external-data strings pass through `escapeHtml()` in `index.html` before being assembled into innerHTML. Audited sites:

```bash
grep -nE 'innerHTML\s*=' index.html
```

Returns 18 matches. Each one was reviewed:

- Plan rendering: every interpolation of user-controlled or JSON-loaded fields (`title`, `description`, `target_intensity`, `target_cadence_rpm`, `notes`, `key_metrics`, `rouvy_workout`, `rouvy_route`, `name`, `dose`) wrapped in `escapeHtml()`.
- Paste-parse output: rendered as `JSON.stringify(out, null, 2)` inside an already-escaped `<div>` shell — no innerHTML hop.
- Coach output: text from Anthropic API passed through `escapeHtml()` before assembly into the coach bubble.
- Modal preview: every change-card field (title, target_intensity, reason) wrapped.

The two exceptions to `escapeHtml()` are the file-author-controlled fixed strings ("FIELD TRAINING", "PARSED", etc.) which are constant literals and not user-supplied.

### ✅ No `eval`, no `Function` constructor, no dynamic code

**Status:** Pass.

```bash
git grep -nE '\beval\(|new\s+Function\(' src index.html
```

Returns no matches.

### ⚠️ No CSP header set

**Status:** Gap, low priority.

The PWA does not declare a Content-Security-Policy via meta tag or HTTP header. A reasonable v2 addition would be:

```html
<meta http-equiv="Content-Security-Policy" content="default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; img-src 'self' data:; connect-src 'self' https://api.anthropic.com">
```

`'unsafe-inline'` for `style-src` is needed because v1 inlines all CSS in `index.html` (per TECH_DECISIONS D10). When CSS is extracted to `src/styles/` in v2, this can tighten further.

Not a hard gate fail in v1 — the absence of dynamic script injection sites and the small dependency surface mean the practical attack surface is narrow. Tracked for v2.

### ⚠️ Service worker cache served over HTTP on LAN dev

**Status:** Acceptable for dev, must be HTTPS in production.

The service worker successfully precaches the app shell + data files + engine modules on first load. Subsequent loads are served from cache (stale-while-revalidate). On LAN dev (`http://192.168.40.201:8080`), this means a man-in-the-middle on the LAN could in principle poison the cache. Acceptable for a private home network during development; not acceptable for any public deployment.

**Mitigation:** Phase 5 deploys to GitHub Pages which is HTTPS-only.

### ✅ Service worker scope is same-origin

**Status:** Pass.

`service-worker.js` registration is at the root scope. The fetch handler explicitly skips cross-origin and non-GET requests:

```js
if (url.origin !== self.location.origin) return;
if (e.request.method !== 'GET') return;
```

### ✅ No third-party analytics, telemetry, or trackers

**Status:** Pass.

```bash
git grep -nEi '(google-?analytics|gtag|googletagmanager|mixpanel|segment|amplitude|sentry|datadog|hotjar|fullstory|posthog)' src index.html
```

Returns no matches. The only outbound traffic from a normal session is fonts and the AI coach call.

### ✅ Authoritative file protection (CLAUDE.md rule 1)

**Status:** Pass.

- `src/data/athlete-profile.json` and `src/data/training-plan.json` are not written by any code path in v0.1.0. The plan completion overlay (`cxmxc.completed`) and unplanned-activity overlay (`cxmxc.unplanned`) compose at render time via `effectiveSession()` — verified by `tests/engines.test.mjs` and by inspection of `index.html`.

```bash
grep -nE 'fetch.*data/athlete|fetch.*data/training' index.html
# Returns the two read-only fetch calls in loadData() — no PUT/POST/PATCH.
```

---

## Console-error sweep procedure

The Phase 4 gate requires "no console errors / warnings in normal use." This section is the procedure the human runs on the target device; results go into the table below.

**Steps:**
1. Open Chrome DevTools (USB-debug from Android, or desktop Chrome at the same URL).
2. Clear the console.
3. Exercise each screen in this order, watching the console:

| Screen | Actions |
|---|---|
| Check-In | Drag every slider, type RHR, save check-in, edit and re-save |
| Check-In banner | Tap "Review & Decide" on the seeded flag, read preview, tap "← Edit", change the duration, tap preview again, tap "Apply Changes" |
| Check-In banner (round 2) | Reopen the same flag, tap "Keep Original Plan" to revert |
| Data | Switch toggle Scheduled ↔ Unplanned, paste a fake Strava block into Strava textarea and tap Parse, paste into ROUVY textarea and tap Parse |
| Data quick entry | Fill in fields, save |
| Data unplanned log | Pick the seeded flag from the dropdown, fill RPE, fueling notes, save |
| Plan | Scroll the full 20-day list, expand 3 different days, mark one done, mark it pending, tap "Open in Data →" |
| Log | Tap +8/-8 water 3 times each, add a supplement (e.g. Magnesium 400 mg), check it, uncheck it, delete it; tap Export |
| Profile | Toggle theme dark→light→dark, tap "Save Key Locally" with empty input (should toast), tap "Ask Coach Now" with no key (should show error), tap Export Everything, tap Reset Today (cancel), tap Reset Everything (cancel) |

**Recorded results (fill in after a real run):**

| Screen | Errors | Warnings | Notes |
|---|---|---|---|
| Check-In | _pending_ | _pending_ | |
| Banner / Modal | _pending_ | _pending_ | |
| Data | _pending_ | _pending_ | |
| Plan | _pending_ | _pending_ | |
| Log | _pending_ | _pending_ | |
| Profile | _pending_ | _pending_ | |

If any row shows errors or non-trivial warnings, file each one with reproduction steps and resolve before declaring Phase 4 complete.

---

## Summary

**Status: 7 pass, 2 documented gaps, 1 procedure pending verification.**

The two gaps (no CSP header, HTTP on LAN dev) are tracked. The Phase 5 deployment to GitHub Pages closes the HTTPS gap automatically. The CSP header is a v2 candidate.

The console-error sweep is the only item that requires real-device verification and is recorded as pending until run.

Future commits that add a third-party origin, a new innerHTML site, or any data-flow toward a non-Anthropic external endpoint should update this document in the same commit.
