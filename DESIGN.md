# Design

## Overview

Golden Valley reads as a well-made field instrument, not a SaaS dashboard: calm, precise, a little tactile. The palette is grounded in water itself (depth, clarity, flow) rather than generic product blue. Every screen is built for one thumb, often wet or gloved, used dozens of times a day, so restraint and large targets matter more than density or decoration.

```yaml
personality: [calm, precise, utilitarian, tactile, quiet-confidence]
emotional_direction: trustworthy field tool, not a sales dashboard
theme: light, locked (no dark mode for v1 — outdoor/daylight phone use is the primary context)
```

## Colors

Committed color strategy: deep-blue as the dominant brand surface for nav/primary actions, aqua as the single active/focus accent, everything else a restrained blue-white neutral ramp. One accent locked across the whole app, per the source palette in the build plan.

```yaml
colors:
  ink:
    value: "#0A2540"
    role: primary text, headings
  deep-blue:
    value: "#0B4F6C"
    role: primary buttons, nav, brand surfaces
  aqua:
    value: "#00B4D8"
    role: active states, links, focus rings
  surface:
    value: "#FFFFFF"
    role: cards, elevated surfaces
  mist:
    value: "#F1F8FB"
    role: page background
  success:
    value: "#2E9E6B"
    role: paid, delivered, on-schedule
  warning:
    value: "#E0A100"
    role: due soon
  danger:
    value: "#D64545"
    role: overdue
  ink-muted:
    value: "oklch(from #0A2540 l c h / 0.64)"
    role: secondary text (never below 4.5:1 on mist or surface)
  border:
    value: "#DCEAF0"
    role: hairlines, dividers, input borders
```

Do not introduce a second accent. Status colors (success/warning/danger) are semantic only, used for the droplet motif and its labels, never as decorative accents elsewhere.

## Typography

```yaml
typography:
  display:
    family: "Space Grotesk"
    role: headings, nav labels, section titles
    weight: [500, 600, 700]
  body:
    family: "Inter"
    role: body copy, form labels, helper/error text
    weight: [400, 500, 600]
  numeric:
    family: "Space Grotesk"
    role: gallons, currency, salary, dates in lists
    features: "font-variant-numeric: tabular-nums"
  scale:
    display-lg: { size: "2rem", line: 1.15, tracking: "-0.02em", weight: 600 }   # screen titles
    display-md: { size: "1.5rem", line: 1.2, tracking: "-0.01em", weight: 600 }  # card/section titles
    body-lg: { size: "1.0625rem", line: 1.5, weight: 400 }                       # primary reading size (mobile-first)
    body-md: { size: "0.9375rem", line: 1.45, weight: 400 }
    label: { size: "0.8125rem", line: 1.3, weight: 500, tracking: "0.01em" }
    numeric-lg: { size: "2.5rem", line: 1, weight: 600 }                         # gallon stepper value
    numeric-md: { size: "1.125rem", line: 1.3, weight: 600 }
```

Body line length capped at 65-75ch on the rare wide screens (customer history, salary breakdown). Space Grotesk display headings never exceed 2rem; this is a utility app, not a marketing page, so hierarchy comes from weight and color more than raw scale.

## Layout

```yaml
layout:
  model: mobile-first single column
  container_max: "28rem"   # app never wants to be a desktop dashboard; centers narrow even on large screens
  spacing_scale: [4, 8, 12, 16, 20, 24, 32, 40, 48]
  section_gap: 24
  page_padding_x: 16
  touch_target_min: 44
  nav: bottom tab bar, 4 items, 64px height, fixed
  breakpoints: { sm: 640, md: 768, lg: 1024 }
```

Grid over flex only for the customer list's droplet+meta rows; everything else is 1D flex. No side navigation, ever, at any breakpoint, this is a phone-first tool used standing up.

## Elevation & Depth

```yaml
elevation:
  strategy: tonal + hairline, minimal shadow
  card: { shadow: "0 1px 2px oklch(from #0A2540 l c h / 0.06)", border: "1px solid var(--border)" }
  sheet: { shadow: "0 -4px 24px oklch(from #0A2540 l c h / 0.12)" }
  sticky-nav: { shadow: "0 -1px 0 var(--border)" }
  z_scale: [dropdown: 20, sticky: 30, modal-backdrop: 40, modal: 50, toast: 60]
```

Shadows are tinted toward ink, never pure black. Cards used sparingly (customer rows, salary summary), never nested.

## Shapes

```yaml
shapes:
  radius_scale: { sm: 8, md: 12, lg: 16, pill: 999 }
  rule: "inputs and cards use md (12px), primary buttons and the gallon stepper use pill, bottom nav icons are pill-hit-area only"
```

One consistent rule, no mixed systems: interactive controls (buttons, stepper, search) are pill-shaped for a tactile, thumb-friendly feel; containers (cards, sheets, inputs) are 12px.

## Components

```yaml
components:
  button-primary:
    bg: deep-blue
    text: "#FFFFFF"
    radius: pill
    height: 56
    active: "scale(0.97), 120ms ease-out"
    disabled: "opacity 0.4, no pointer"
  button-secondary:
    bg: transparent
    text: deep-blue
    border: "1px solid var(--border)"
    radius: pill
    height: 48
  input:
    bg: surface
    border: "1px solid var(--border)"
    radius: md
    height: 52
    focus: "1px border aqua + 3px ring oklch(from #00B4D8 l c h / 0.25)"
    label_position: above
    error_position: below
  gallon-stepper:
    radius: pill
    button_size: 48
    value_style: numeric-lg
  droplet-status:
    states:
      on-schedule: { fill: solid, color: deep-blue }
      due-soon: { fill: half, color: warning }
      overdue: { fill: outline, color: danger }
    sizes: [16, 20, 28]   # inline-list, row, hero
  toast:
    bg: ink
    text: "#FFFFFF"
    radius: md
    duration: "4s, swipe to dismiss"
  bottom-tab:
    height: 64
    active_indicator: aqua underline + icon fill
    icons: droplet-status motif reused for the Dashboard tab badge count
```

## Do's and Don'ts

- Do keep the droplet motif the only status indicator in the app; don't introduce a second icon language for the same concept.
- Do use pill radius on every tappable control; don't mix sharp and pill buttons on the same screen.
- Do keep the transaction screen to one viewport, no scroll to submit; don't add fields to that screen without removing one.
- Do animate entrance/confirmation with purpose (save confirmation, status change); don't add idle looping motion, this is a workhorse tool, not a showcase.
- Don't use gray-on-mist body text under 4.5:1, bump toward ink instead.
- Don't add a second accent color, ever, even for "just this one chart."
