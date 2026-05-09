# Performance Baseline — v0.1.0

> Phase 4/5 deliverable. CXMXC_REFERENCE.md flagged "no performance testing on slow networks" as a Phase 5 gap. This document defines the baseline measurement procedure and the v0.1.0 acceptance numbers. Real-device measurements are recorded in the table at the end.

The product target: **cold load under 2 seconds on the athlete's Android device, daily check-in completable in under 30 seconds, AI coach round-trip under 5 seconds when network is healthy.** v0.1.0 should clear these comfortably given the tiny payload, but "should" is not a measurement.

---

## Why measure now

The whole product is small (≈100 KB of HTML + CSS + JS, ≈30 KB of JSON) and there is no build step, no bundler, no JS framework runtime. Performance was never likely to be a problem at v0.1.0 scale. Measuring now establishes the baseline so any future regression is visible.

It also closes the Phase 5 gate honestly. "It feels fast" is not the same as "it is 1.8 s on a throttled mid-range Android over LTE."

---

## What to measure

### Page-load metrics (Lighthouse mobile, throttled)

The Lighthouse mobile preset throttles CPU 4× and applies a Slow 4G network profile. That is the right baseline for "real Android device on a real network."

Five Web Vitals to record:
- **First Contentful Paint (FCP)** — first text/image painted. Target: ≤ 1.5 s.
- **Largest Contentful Paint (LCP)** — main content painted. Target: ≤ 2.5 s.
- **Total Blocking Time (TBT)** — main thread blocked time. Target: ≤ 200 ms.
- **Cumulative Layout Shift (CLS)** — unintended layout shift. Target: ≤ 0.1.
- **Time to Interactive (TTI)** — fully interactive. Target: ≤ 3 s.

Plus the Lighthouse PWA category — the install audit must pass.

### Runtime metrics (DevTools Performance recording)

Three user paths to record on the target device, with the DevTools Performance panel enabled:
1. **Cold load → render Check-In.** Measure from URL entered to dial visible.
2. **Save check-in.** Measure from "Save Check-In" tap to toast visible.
3. **Open the unplanned modal preview.** Measure from "Review & Decide" tap to impact-preview rendered.

Each should complete inside the time budget below.

### Real-network metrics (offline + slow path)

The PWA must work offline once installed. Test:
- **Second visit, network online.** Cache hit; page renders before any network round-trip.
- **Second visit, network offline.** Same — service worker serves the precached shell + data + engine modules.
- **First visit on slow LTE.** Lighthouse covers this synthetically; real-device test catches edge cases the simulator misses.

---

## Procedure

### Step 1 — Lighthouse run

Desktop Chrome, against the deployed site (or localhost on the host machine — same numbers within ±10 %):

1. Open the deployed URL in a fresh Chrome window (or Incognito to avoid extension noise).
2. DevTools → Lighthouse panel.
3. Mode: **Navigation**. Categories: **Performance, Accessibility, Best Practices, SEO, Progressive Web App**. Device: **Mobile**.
4. Click **Analyze page load**.
5. Record FCP, LCP, TBT, CLS, TTI plus the four category scores.
6. Save the HTML report. Attach it to the v0.1.0 release as a milestone.

Re-run three times and record the median. First runs are typically slower because CDNs warm up.

### Step 2 — Real-device DevTools Performance

Plug the Android device into the host via USB, enable USB debugging, open `chrome://inspect/#devices` on the host:

1. Open the deployed PWA on the phone.
2. On the host, click **inspect** under the page.
3. DevTools → Performance panel → record.
4. Trigger one of the three user paths (cold load, save check-in, open modal).
5. Stop the recording. Read off the elapsed time from "Recording finished" minus the start marker.
6. Repeat for each path.

### Step 3 — Offline verification

1. With the PWA installed on the phone, open it once over WiFi to warm the cache.
2. Toggle the phone into airplane mode.
3. Reopen the PWA from the home-screen icon.
4. Verify: dial renders, plan list renders, log renders. AI coach should fail gracefully ("Network error: …" in the coach bubble).

### Step 4 — Slow-network verification

DevTools → Network panel → Throttling → **Slow 4G**. Reload the deployed page in Incognito. Verify cold-load is still under 3 s on the host machine. Real LTE on the phone is the ground truth, but DevTools throttling is the cheap proxy.

---

## Acceptance criteria

v0.1.0 is considered to clear the Phase 5 performance gate when:

- [ ] Lighthouse Mobile **Performance** score ≥ 90.
- [ ] Lighthouse Mobile **PWA** install audit passes.
- [ ] FCP ≤ 1.5 s, LCP ≤ 2.5 s, CLS ≤ 0.1, TBT ≤ 200 ms.
- [ ] Cold load → render Check-In ≤ 2 s on the target Android device.
- [ ] Save check-in tap → toast ≤ 100 ms.
- [ ] Open unplanned modal preview ≤ 100 ms.
- [ ] Offline reopen renders all 5 screens.
- [ ] Slow 4G cold load ≤ 3 s.

If any item fails, file an issue (the feedback link in the Profile screen now goes to GitHub Issues) and treat it as a Phase 6 priority.

---

## Recorded measurements

Filled in once the procedure has been run on the deployed v0.1.0 build.

### Lighthouse Mobile (deployed build, run 3-median)

| Metric | Value | Target | Pass? |
|---|---|---|---|
| Performance score | _pending_ | ≥ 90 | _pending_ |
| Accessibility score | _pending_ | ≥ 90 | _pending_ |
| Best Practices score | _pending_ | ≥ 90 | _pending_ |
| SEO score | _pending_ | ≥ 90 | _pending_ |
| PWA install audit | _pending_ | pass | _pending_ |
| FCP | _pending_ | ≤ 1.5 s | _pending_ |
| LCP | _pending_ | ≤ 2.5 s | _pending_ |
| TBT | _pending_ | ≤ 200 ms | _pending_ |
| CLS | _pending_ | ≤ 0.1 | _pending_ |
| TTI | _pending_ | ≤ 3 s | _pending_ |

### Real-device runtime (Android Chrome, USB-debug)

| User path | Measured | Target | Pass? |
|---|---|---|---|
| Cold load → Check-In rendered | _pending_ | ≤ 2 s | _pending_ |
| Save check-in → toast | _pending_ | ≤ 100 ms | _pending_ |
| Open modal → preview rendered | _pending_ | ≤ 100 ms | _pending_ |
| Offline reopen, all 5 screens | _pending_ | yes | _pending_ |

### Slow-network synthetic (DevTools Slow 4G)

| Path | Measured | Target | Pass? |
|---|---|---|---|
| Cold load → Check-In rendered | _pending_ | ≤ 3 s | _pending_ |

---

## Notes on measurement honesty

- The fonts (Bebas Neue, DM Mono) are loaded from `fonts.googleapis.com`. First-paint will block on font fetch unless `font-display: swap` is set. Lighthouse will flag this; record the FCP as observed and decide whether `font-display: swap` is worth adding before v0.2.0.
- Service worker activation timing affects cold-load on the *first* visit only. Lighthouse simulates a fresh visit by default. The recorded FCP is the worst case; real subsequent visits are faster.
- Anthropic API round-trip latency is *not* a v0.1.0 page-load concern — the coach call only happens when the user taps "Ask Coach Now". Coach latency should be tracked separately if it ever feels slow in practice.
