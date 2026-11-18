---
name: Swiss Modern Photobooth
colors:
  surface: '#f9f9ff'
  surface-dim: '#cfdaf1'
  surface-bright: '#f9f9ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f0f3ff'
  surface-container: '#e7eeff'
  surface-container-high: '#dee9ff'
  surface-container-highest: '#d8e3fa'
  on-surface: '#111c2c'
  on-surface-variant: '#44474e'
  inverse-surface: '#263142'
  inverse-on-surface: '#ebf1ff'
  outline: '#74777e'
  outline-variant: '#c4c6ce'
  surface-tint: '#4a5f81'
  primary: '#001632'
  on-primary: '#ffffff'
  primary-container: '#142b4a'
  on-primary-container: '#7d93b7'
  inverse-primary: '#b2c7ee'
  secondary: '#516070'
  on-secondary: '#ffffff'
  secondary-container: '#d5e4f8'
  on-secondary-container: '#576676'
  tertiary: '#171328'
  on-tertiary: '#ffffff'
  tertiary-container: '#2b283d'
  on-tertiary-container: '#948ea9'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#d5e3ff'
  primary-fixed-dim: '#b2c7ee'
  on-primary-fixed: '#021c3a'
  on-primary-fixed-variant: '#324768'
  secondary-fixed: '#d5e4f8'
  secondary-fixed-dim: '#b9c8db'
  on-secondary-fixed: '#0e1d2b'
  on-secondary-fixed-variant: '#3a4858'
  tertiary-fixed: '#e6dffb'
  tertiary-fixed-dim: '#c9c3df'
  on-tertiary-fixed: '#1c192d'
  on-tertiary-fixed-variant: '#48445b'
  background: '#f9f9ff'
  on-background: '#111c2c'
  surface-variant: '#d8e3fa'
typography:
  display-lg:
    fontFamily: Manrope
    fontSize: 56px
    fontWeight: '800'
    lineHeight: 64px
    letterSpacing: -0.03em
  display-lg-mobile:
    fontFamily: Manrope
    fontSize: 36px
    fontWeight: '800'
    lineHeight: 44px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Manrope
    fontSize: 40px
    fontWeight: '700'
    lineHeight: 48px
    letterSpacing: -0.02em
  headline-lg-mobile:
    fontFamily: Manrope
    fontSize: 28px
    fontWeight: '700'
    lineHeight: 36px
    letterSpacing: -0.01em
  headline-md:
    fontFamily: Manrope
    fontSize: 28px
    fontWeight: '700'
    lineHeight: 36px
    letterSpacing: -0.01em
  headline-sm:
    fontFamily: Manrope
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
    letterSpacing: -0.005em
  body-lg:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 28px
    letterSpacing: -0.005em
  body-md:
    fontFamily: Inter
    fontSize: 15px
    fontWeight: '400'
    lineHeight: 22px
    letterSpacing: 0em
  body-sm:
    fontFamily: Inter
    fontSize: 13px
    fontWeight: '400'
    lineHeight: 18px
    letterSpacing: 0em
  label-lg:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '600'
    lineHeight: 20px
    letterSpacing: 0.01em
  label-md:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.02em
  label-sm:
    fontFamily: Inter
    fontSize: 11px
    fontWeight: '700'
    lineHeight: 14px
    letterSpacing: 0.04em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  gutter: 1.5rem
  gutter-mobile: 1rem
  margin: 3rem
  margin-mobile: 1.25rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 1rem
  space-lg: 1.5rem
  space-xl: 2.5rem
---

## Brand & Style

This design system establishes an architectural, gallery-grade foundation infused with playful celebratory accents. Built for a digital photobooth platform, the visual language balances the rational restraint of Swiss modernist graphic design with spontaneous, tactile joy. 

Key attributes:
- **Rational Structure:** Rigid grid systems, asymmetric layouts, and scrupulous alignment that prioritize visual media and live captures.
- **Curated Vibrancy:** A pristine, gallery-white canvas disrupted by deliberate, soft pastel color blocks (Lavender, Soft Blue, Peach) functioning as creative framing devices.
- **Editorial Typography:** High-contrast typographic scales where geometric grotesques act as structural landmarks.
- **Restrained Tactility:** Subtle transitions and crisp borders create physical presence without skeuomorphic clutter.

## Colors

The palette operates on high-contrast functionality paired with atmospheric pastel surfaces:

- **Primary Identity (`#142B4A`):** Deep Navy. Anchors navigation, critical primary actions, and solid high-contrast borders.
- **Secondary Background / Soft Blue (`#DCEBFF`):** Tint for active states, selection pills, and preview container backgrounds.
- **Creative Accent / Lavender (`#E9E2FF`):** Highlights media effects, creative modes, and celebratory micro-moments.
- **Warm Accent / Peach (`#FFE8D8`):** Reserved for flash triggers, live countdowns, photo capture actions, and secondary badges.
- **Neutrals & Surfaces:**
  - Canvas Primary: `#FFFFFF`
  - Canvas Secondary / Framing: `#F5F6F8`
  - Text Primary: `#202B3C`
  - Text Muted: `#64748B`
  - Subtle Border: `#E2E8F0`

## Typography

Typography delivers editorial clarity. Manrope provides geometric precision for headlines and event titling, while Inter handles dense UI controls, status indicators, and camera metadata.

Implementation guidelines:
- Apply tight negative tracking to all `display` and `headline` levels to maintain a cohesive Swiss poster style.
- Maintain `label-sm` in full uppercase for technical booth statuses (e.g., `READY`, `PROCESSING`, `PRINTING`).
- Use tabular figures for countdowns, timers, and capture sequences.

## Layout & Spacing

The layout is built around a rigorous 12-column grid on desktop screens, transitioning to 6 columns on tablets, and 4 columns on mobile viewports.

- **Breakpoints:**
  - Mobile: `< 640px` (fluid layout, edge margins of `1.25rem`)
  - Tablet: `640px – 1024px` (adaptive fluid layout, margins of `2rem`)
  - Desktop: `> 1024px` (constrained maximum content width of `1440px`, margins of `3rem`)
- **Vertical Rhythm:**
  - Component internals use strict multiples of 4px and 8px.
  - Large photographic viewports maintain deliberate macro-whitespace to prevent UI controls from crowding the media preview.

## Elevation & Depth

Visual hierarchy uses crisp boundaries over deep drop shadows, adhering to modern Swiss graphic principles:

- **Border Hierarchy:** Cards, action sheets, and modal frames use a 1px solid border (`#E2E8F0` or `#142B4A` for selected states) to construct defined structural planes.
- **Surface Elevation:**
  - Base layer: `#FFFFFF`
  - Inset viewport & structural framing: `#F5F6F8`
  - Floating controls & toolbars: Solid `#FFFFFF` elevated with an ultra-diffused drop shadow: `0 8px 24px -4px rgba(20, 43, 74, 0.06), 0 2px 6px -1px rgba(20, 43, 74, 0.04)`.
- **Active / Shutter Press:** Components translate down `1px` on press with shadow reduction to mimic a physical mechanical shutter button.

## Shapes

The geometric framework balances precision edges with soft, inviting radii:

- **Cards & Viewport Frames:** `16px` (`rounded-xl` equivalent in this system) gives photo strips and live frames a modern finish.
- **Buttons & Interactive Pills:** `12px` (`rounded-lg` equivalent) produces a tactile button style.
- **Input Fields & Metadata Badges:** `10px` balances compact input regions with soft visual containment.
- **Capture & Shutter Triggers:** Perfect circles (`50%` / `pill`) reinforce camera hardware metaphors.

## Components

### Buttons
- **Primary:** Background `#142B4A`, text `#FFFFFF`, border `1px solid transparent`, radius `12px`, padding `12px 24px`. Micro-hover lifts `translate-y-[-1px]`.
- **Secondary / Ghost:** Background `#FFFFFF`, text `#142B4A`, border `1px solid #E2E8F0`, radius `12px`. Hover state applies `#F5F6F8`.
- **Creative Action (Shutter / Print):** Background `#FFE8D8`, text `#142B4A`, border `1.5px solid #142B4A`, radius `12px` or circular pill.

### Cards & Photo Frames
- **Media Preview:** Radius `16px`, background `#FFFFFF`, border `1px solid #E2E8F0`, subtle shadow. Framing borders expand to 2px `#142B4A` upon selection.
- **Accent Panels:** Structural cards with soft background floods using `#E9E2FF` (effects/filters) or `#DCEBFF` (session details) to delineate sections without heavy drop shadows.

### Chips & Filters
- **Default:** Radius `9999px` (pill), height `32px`, background `#F5F6F8`, border `1px solid #E2E8F0`, text `#202B3C`.
- **Selected:** Background `#142B4A`, text `#FFFFFF`, border `1px solid #142B4A`.

### Input Fields
- Radius `10px`, background `#FFFFFF`, border `1px solid #E2E8F0`, text `#202B3C`, placeholder `#64748B`.
- Focused: Border `1.5px solid #142B4A`, box-shadow `0 0 0 3px rgba(220, 235, 255, 0.6)`.

### Checkboxes & Radios
- **Checkbox:** `20px x 20px`, radius `6px`, border `1.5px solid #E2E8F0`. Checked: background `#142B4A`, border `#142B4A`, checkmark icon `#FFFFFF`.
- **Radio:** `20px x 20px`, circular, border `1.5px solid #E2E8F0`. Selected: border `5px solid #142B4A`, background `#FFFFFF`.

### Iconography & Micro-Interactions
- **Icons:** Lucide icons rendered at 1.75px stroke width. Consistent 20px and 24px bounding boxes.
- **Transitions:** Standard transitions set to `150ms cubic-bezier(0.16, 1, 0.3, 1)`.