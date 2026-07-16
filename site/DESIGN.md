# Proofrail Public Site Design System

## 0. Research Log

- Embedded refs: shortlisted vercel.md, warp.md, and voltagent.md; picked the Layer A taste-skill.md execution discipline plus the Layer B Vercel-inspired engineering system because Proofrail needs a precise, machine-native surface without copying another brand.
- UI-UX DB: searched developer evidence control plane landing; used the dark, code-first readability and explicit focus guidance as a sanity check, then kept the palette product-specific.
- Lazyweb: skipped because no network research or external product screens are needed for this bounded, local-only prototype.
- Imagen drafts: skipped because the brief requires a deterministic static site with no generated or stock imagery.

## 1. Atmosphere & Identity

Proofrail feels like a quiet verification bench: dark graphite surfaces, a warm terra-cotta signal, and small ledger-like details that make boundaries legible. The signature is an evidence rail that shows Claims, Observations, Verification Receipts, and Verdicts as separate layers instead of blending them into one confidence score.

The page is a single dark theme. It is a public explanation of the bounded prototype, not a live dashboard, hosted service, or trust badge.

## 2. Color

### Palette

| Role | Token | Value | Usage |
|------|-------|-------|-------|
| Surface / primary | --surface-primary | #0d1110 | Page canvas |
| Surface / secondary | --surface-secondary | #151b19 | Sections and cards |
| Surface / elevated | --surface-elevated | #1d2622 | Evidence rail and code panel |
| Text / primary | --text-primary | #f2f4ef | Headings and readable body copy |
| Text / secondary | --text-secondary | #b7c1ba | Supporting copy |
| Text / tertiary | --text-tertiary | #7f8c84 | Captions and metadata |
| Line / default | --line-default | #344139 | Hairlines and card rings |
| Line / subtle | --line-subtle | #222c27 | Quiet separators |
| Accent / terra | --accent-terra | #d27a54 | Primary actions, links, focus halo |
| Accent / terra hover | --accent-terra-hover | #e29a78 | Hover and active action state |
| Signal / admissible | --signal-admissible | #9be0b7 | Positive state label only |
| Signal / revision | --signal-revision | #f0c77e | Revision state label only |
| Signal / rejected | --signal-rejected | #e18e85 | Rejected state label only |
| Signal / blocked | --signal-blocked | #b7a4d6 | Blocked state label only |

Accent terra is the only primary decorative accent. Signal colors remain semantic labels; restrained state tints and rings may reinforce the corresponding label, but they are never used as calls to action.

## 3. Typography

### Scale

| Level | Size | Weight | Line height | Tracking | Usage |
|-------|------|--------|-------------|----------|-------|
| Display | clamp(2.75rem, 8vw, 6rem) | 600 | 0.98 | -0.04em | Hero title |
| Section heading | clamp(2rem, 4vw, 3.5rem) | 600 | 1.05 | -0.04em | Section headings |
| Card / rail heading | 1.5rem | 600 | 1.2 | -0.025em to -0.04em | Card and rail titles |
| Body / lead | 1.25rem | 400 | 1.65 | 0 | Hero and section introductions |
| Body | 1rem | 400 | 1.6 | 0 | Standard copy |
| Body / small | 0.875rem | 400 | 1.55 | 0 | Supporting detail |
| Label | 0.75rem | 600 | 1.25 | 0.12em | Uppercase technical labels |
| Mono | 0.875rem | 400 | 1.65 | 0 | Code, hashes, and metadata |

### Font Stack

- Primary: ui-sans-serif, system-ui, -apple-system, Segoe UI, sans-serif
- Mono: ui-monospace, SFMono-Regular, Cascadia Code, Roboto Mono, monospace

No remote font or third-party font loader is used. Display text uses system metrics so the static prototype remains deterministic offline.

## 4. Spacing & Layout

### Base Unit

All spacing derives from a 4px base unit.

| Token | Value | Usage |
|-------|-------|-------|
| --space-1 | 4px | Icon and label gaps |
| --space-2 | 8px | Inline groups |
| --space-3 | 12px | Compact card padding |
| --space-4 | 16px | Standard card padding |
| --space-6 | 24px | Card and grid gaps |
| --space-8 | 32px | Section inner spacing |
| --space-12 | 48px | Inter-section and rail gap |
| --space-16 | 64px | Compact section/contact rhythm; mobile section padding |
| --space-20 | 80px | Hero rhythm |
| --space-24 | 96px | Large desktop section padding |

The content column is capped at 1180px with a 24px gutter. Flow and hypothesis content use three columns, verdicts use four columns, and boundary notes use two columns on wide screens. The grids collapse at 1024px, 768px, and 480px to preserve readable line lengths; the hero and install layouts also collapse at 1024px. Sections with native anchor targets reserve space below the sticky header with `scroll-margin-top`.

## 5. Components

### Site Header

- Structure: skip link, sticky header, brand link, semantic nav.
- Variants: desktop inline links, mobile wrapped links.
- Spacing: --space-4 to --space-6.
- States: link default, hover, active, focus-visible.
- Accessibility: one labeled navigation landmark, keyboard skip link, no menu state that requires script.
- Motion: no entrance motion; anchor scrolling may be smooth.

### Action Link

- Structure: native anchor with a text label and optional arrow glyph.
- Variants: terra primary, quiet secondary.
- Spacing: --space-2 and --space-4.
- States: default, hover, active, focus-visible.
- Accessibility: native link semantics and a visible focus ring.
- Motion: transform and color only, 150ms ease-out.

### Evidence Rail

- Structure: figure with a caption, layered article rows for Claim, Observation, Receipt, and Verdict.
- Variants: hero preview only.
- Spacing: --space-3, --space-4, and --space-6.
- States: static representative illustration; no fake live status.
- Accessibility: caption explains that the rail is illustrative, not a live evaluation.
- Motion: optional opacity entry is disabled for reduced-motion users.

### Information Card

- Structure: article or div with label, heading, and prose.
- Variants: flow step, verdict, pricing hypothesis, boundary note.
- Spacing: --space-4 to --space-6.
- States: default and focus-visible when containing a link.
- Accessibility: heading hierarchy remains linear; state labels are written in text.
- Motion: no decorative movement.

### Code Panel

- Structure: pre > code with a visible caption.
- Variants: workflow plus base configuration combined as one copyable block.
- Spacing: --space-4.
- States: static; selection and browser copy are native.
- Accessibility: language is identified in the caption and content remains selectable without JavaScript.
- Motion: none.

## 6. Motion & Interaction

The only motion is native anchor scrolling and a 150ms transform/color transition on action links. A very short opacity entry on the evidence rail is progressive enhancement and never communicates a product state. prefers-reduced-motion: reduce disables all transitions and smooth scrolling.

## 7. Depth & Surface

Strategy: mixed, with Vercel-inspired shadow-as-ring plus tonal dark surfaces. Cards use a 1px ring and a restrained two-layer shadow; the hero rail adds a warm ambient glow. No image or gradient is used as a fake product screenshot.

Opacity overlays for the terra accent and semantic signals are named tokens in styles.css; components do not introduce ad hoc color values.

## 8. Accessibility Constraints & Accepted Debt

### Constraints

- WCAG 2.2 AA target with 4.5:1 body-text contrast and 3:1 large-text contrast.
- Every interactive element is a native anchor with a visible :focus-visible ring.
- Keyboard users get a skip link to #main-content.
- The document declares lang=en, responsive viewport metadata, a restrictive same-origin CSP, and referrer policy.
- The site has no scripts, tracking, remote assets, or secret-bearing values.
- Reduced motion is respected.
- No accepted accessibility debt.

### Accepted Debt

| Item | Location | Why accepted | Owner / Exit |
|------|----------|--------------|--------------|
| None | N/A | The static prototype has no known accessibility exception. | N/A |
