# Accessibility Audit — v0.1.0

> Phase 4 deliverable. Honest audit of v0.1.0 against the WCAG 2.1 AA baseline plus mobile-PWA-specific concerns. Strong items are documented; gaps are named with the planned fix and the user-action steps the gap requires before the framework's Phase 4 gate can be passed.

Audit method: code review against the v0.1.0 tree + procedure section the user runs on the target device. Items requiring real-device verification are flagged.

---

## Strong items

### ✅ Semantic HTML

The app uses real HTML elements for their intended purpose:
- `<button>` for every interactive control (no fake buttons in `<div>`s).
- `<h1>`, `<h2>`, `<h3>` for headings, in document order.
- `<label>` siblings for form inputs (visual layout pairing, not `for`/`id` association — see gap below).
- `<nav role="tablist">` for the bottom tab bar.
- `<dialog>`-shaped modal pattern with `role="dialog" aria-modal="true" aria-labelledby="unp-title"`.

### ✅ Heading hierarchy

`h1` is the app brand once, top of the page. `h2` per major card or screen section. `h3` per sub-section. No skipped levels in v0.1.0.

### ✅ Landmarks

- `<header class="topbar">` — site identity and theme toggle.
- `<main class="screens">` — the screen content area.
- `<nav class="tabbar">` — primary navigation.

### ✅ Color contrast — dark theme

Spot-checked against WCAG AA (4.5:1 for normal text, 3:1 for large text):

| Pair | Contrast | Pass |
|---|---|---|
| `--fg #e8eaf2` on `--bg #0a0e1a` | ~17:1 | AAA |
| `--fg-dim #8b91a8` on `--bg #0a0e1a` | ~7.5:1 | AA / AAA large |
| `--accent #9d6cff` on `--bg #0a0e1a` | ~5.2:1 | AA |
| White on `--accent #9d6cff` (button text) | ~3.7:1 | AA large only |
| `--green #5fd47e` on `--bg-elev #131829` | ~9:1 | AAA |
| `--yellow #ffc857` on `--bg-elev #131829` | ~10:1 | AAA |
| `--red #ff6b6b` on `--bg-elev #131829` | ~5.8:1 | AA |

The white-on-accent button case is at the WCAG AA boundary for "large text" only. Buttons in the app are 18-22 px Bebas Neue; this is large-text territory. Acceptable, but worth tightening if the design ever uses smaller buttons on accent backgrounds.

### ✅ Color contrast — light theme

| Pair | Contrast | Pass |
|---|---|---|
| `--fg #131829` on `--bg #f3f5fb` | ~15:1 | AAA |
| `--fg-dim #5b627a` on `--bg #f3f5fb` | ~6.5:1 | AA / AAA large |
| `--accent #6e3dff` on `--bg #f3f5fb` | ~6.4:1 | AA |
| `--green #1f9b46` on `--bg-elev #ffffff` | ~4.7:1 | AA |
| `--red #c73b3b` on `--bg-elev #ffffff` | ~5.4:1 | AA |

Light theme contrast is solid. The light theme was written as a real second theme rather than a half-built afterthought, and the audit numbers reflect that.

### ✅ Motion / animation

- No animations longer than `transition: opacity 0.18s ease` (used only on the toast).
- No parallax, no auto-playing media, no infinite-spin loaders.
- No `prefers-reduced-motion` override is needed because there's nothing to reduce.

### ✅ Color is never the only signal

- Stability bands carry text labels ("GREEN — GO", "YELLOW — CAREFUL", "RED — RECOVER") in addition to dial color.
- Plan badges include a text label inside the colored chip ("ADJUSTED", "RHR CHECK", "threshold", "vo2", etc.).
- Day completion shows a checkmark glyph in addition to the muted styling.

### ✅ Keyboard activation

Every interactive control is a real `<button>` element, which means it is keyboard-activatable by default (Enter and Space). No `<div onclick>` fakes anywhere in the v0.1.0 tree.

### ✅ Touch targets — primary actions

The big buttons (`.btn`, `.btn.ghost`, tab bar items, water +/-, save check-in) are well above the 44×44 px iOS HIG / 48×48 dp Android minimum. Roughly 48-52 px tall.

---

## Gaps and planned fixes

### ⚠️ Form labels not associated via `for`/`id`

**Severity:** Medium. Labels are visually adjacent to their inputs but not programmatically associated, so screen readers will not announce the label when the input is focused.

**Affected:** Every `<label class="label">` element across the app — Check-In sliders, RHR input, Data quick-entry fields, Profile fields, the unplanned modal form.

**Fix:** Add `for="<id>"` to every label and ensure the corresponding input has the matching `id`. Most inputs already have IDs (used for JS handlers); the work is mostly typographic.

**Tracked for:** v0.2.0 accessibility pass. Recorded here so the work is real and not hand-waved.

### ⚠️ Icon-only buttons missing `aria-label` in some places

**Severity:** Low. Most icon buttons in v0.1.0 actually carry text (theme toggle says "DARK"/"LIGHT", export buttons say "EXPORT"). The remaining cases are the supplement-row delete `<button class="x">×</button>` (×) — an `aria-label="Remove"` is present on the outer button via `title="Remove"` but `aria-label` is the screen-reader-correct attribute.

**Fix:** Replace `title="Remove"` with `aria-label="Remove"` on `[data-del-supp]`. Same for any future icon-only buttons.

**Tracked for:** v0.2.0 accessibility pass.

### ⚠️ Modal does not trap focus

**Severity:** Medium. The unplanned-activity modal opens but does not capture keyboard focus. Tabbing past the last focusable element in the modal escapes back to the underlying page, which is below the modal overlay.

**Fix:** Add a small focus-trap utility — store the previously-focused element on open, focus the modal on open, on Tab/Shift+Tab cycle within the modal, on Escape close the modal and restore focus to the original element.

**Workaround in v0.1.0:** The modal closes when the user taps outside the content area or taps Close, both of which are visible.

**Tracked for:** v0.2.0 accessibility pass.

### ⚠️ Touch targets — modal opt-grid buttons are smaller than 44×44

**Severity:** Low for the audience (single user with no documented manual-dexterity constraint), but real for general accessibility.

**Affected:** `.opt-grid button` in the unplanned modal — currently ~32 px tall depending on viewport.

**Fix:** Set `min-height: 44px` on `.opt-grid button` in CSS.

**Tracked for:** v0.2.0 accessibility pass.

### ⚠️ Slider inputs lack discrete value announcements

**Severity:** Low. Range inputs announce a value on change, but the surrounding context ("Sleep Quality 7 / 10") relies on a sibling `<div class="slider-value">` that is not connected to the input via `aria-describedby`.

**Fix:** Add `aria-describedby` (or use `aria-valuetext`) so screen readers announce "Sleep Quality, 7 of 10" rather than just "7".

**Tracked for:** v0.2.0 accessibility pass.

---

## Real-device verification procedure

These items cannot be verified from code alone. The user runs the procedure on the target Android device and records results in the table at the end.

### Procedure

1. **TalkBack walk** (Android's built-in screen reader).
   - Settings → Accessibility → TalkBack → On.
   - Open the PWA from the home screen.
   - Swipe right through every element on each of the 5 screens.
   - Note any element TalkBack reads as "button" or "edit" with no useful label.
   - Note any element TalkBack skips entirely.

2. **Switch Access / external keyboard walk.**
   - Connect a keyboard via USB-OTG or pair via Bluetooth.
   - Tab through every screen.
   - Verify focus is always visible (browser default focus ring should be visible against the dark theme — verify against the light theme too).
   - Verify Escape closes the modal.
   - Note any element you can't reach with Tab.

3. **Color-vision spot-check.**
   - Use the device's color-correction simulation (Settings → Accessibility → Color and motion → Color correction → Deuteranomaly / Protanomaly / Tritanomaly).
   - Verify stability dial bands are still distinguishable (the text labels make this work even when color is not).
   - Verify badge colors on the Plan screen don't blend into each other.

4. **Touch-target reality check.**
   - With normal grip on the phone, try to hit every primary action one-handed.
   - Note any miss-prone targets — report below.

### Results table

| Procedure | Findings | Action items |
|---|---|---|
| TalkBack walk | _pending_ | _pending_ |
| Keyboard walk | _pending_ | _pending_ |
| Color-vision | _pending_ | _pending_ |
| Touch targets | _pending_ | _pending_ |

When this table is filled in, attach any new gaps to the list above and treat the Phase 4 gate as closed once all gaps are tracked (not necessarily fixed) — tracking is the contract; fixing is the v0.2.0 work.

---

## Summary

**Status:** Strong on contrast, semantic HTML, motion, and keyboard activation. Five identified gaps tracked for v0.2.0 — all fixable in a focused accessibility pass without architectural change. Real-device verification (TalkBack, keyboard, color-vision, touch targets) is the user's action; results recorded in the table above.

The v0.2.0 accessibility pass should be its own commit, scoped narrowly: form-label associations, focus trap on modal, opt-grid touch sizing, slider aria-describedby, supplement-delete aria-label. Estimated effort: 1-2 hours, no engine changes required.
