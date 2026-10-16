---
version: "superdesign-alpha"
name: "Overnight Thread Light"
description: "White-dominant light-mode system built on messaging-app chrome: chat bubbles, iMessage-style device frames, and social proof cards, carrying one rationed indigo accent through a display-weight geometric sans."
colors:
  background: "#FFFFFF"
  surface: "#EEEEF9"
  surface-alt: "#FAFAFC"
  text-primary: "#121212"
  text-secondary: "#2F2F31"
  accent: "#6355FF"
  ink-black: "#000000"
  border: "#141414"
typography:
  display-lg:
    fontFamily: "Plus Jakarta Sans"
    fontSize: "88px"
    fontWeight: 800
    lineHeight: "1"
    letterSpacing: "-2.8px"
  headline-md:
    fontFamily: "Plus Jakarta Sans"
    fontSize: "88px"
    fontWeight: 800
    lineHeight: "1"
    letterSpacing: "-2.8px"
  body-md:
    fontFamily: "Plus Jakarta Sans"
    fontSize: "13px"
    fontWeight: 400
    lineHeight: "1.38"
  label-md:
    fontFamily: "Lora"
    fontSize: "23px"
    fontWeight: 450
    lineHeight: "1"
  label-mono:
    fontFamily: "Plus Jakarta Sans"
    fontSize: "13px"
    fontWeight: 400
    lineHeight: "1.38"
  accent-serif:
    fontFamily: "Lora"
    fontSize: "23px"
    fontWeight: 450
    lineHeight: "1"
spacing:
  base: "8px"
  gap: "24px"
  section-padding: "140px"
rounded:
  control: "14px"
  card: "16px"
  card-lg: "22px"
  glass-card: "24px"
  pill: "50px"
  nav-cta: "11px"
components:
  button-primary-hero:
    background: "#121212 observed with a green chat-icon inset"
    text-color: "#FFFFFF"
    radius: "9999px observed"
    height: "56px observed"
    padding: "11px 12px"
  button-nav-cta:
    background: "#2F2F31"
    text-color: "#FFFFFF"
    radius: "12px"
    height: "40px"
  button-tint:
    background: "rgba(99, 85, 255, 0.09)"
    text-color: "#121212"
    radius: "14px"
    height: "63px"
    padding: "11px 12px"
  button-ghost:
    background: "transparent"
    text-color: "#121212"
    radius: "14px"
    height: "63px"
    padding: "11px 12px"
    hover-background: "rgba(18, 18, 18, 0.04)"
  card-full-bleed:
    background: "transparent"
    backdrop-filter: "blur(0.0625px)"
    radius: "0px"
    padding: "0px"
  card-testimonial:
    background: "#FFFFFF"
    radius: "22px"
    shadow: "rgba(0, 0, 0, 0.04) 0px 1px 2px 0px, rgba(0, 0, 0, 0.32) 0px 20px 50px -24px"
    padding: "24px 26px"
  card-glass-feature:
    background: "rgba(255, 255, 255, 0.68)"
    backdrop-filter: "blur(24px)"
    radius: "24px"
    shadow: "rgba(0, 0, 0, 0.06) 0px 0px 0px 0.5px, rgba(0, 0, 0, 0.18) 0px 12px 30px -12px, rgba(255, 255, 255, 0.95) 0px 40px 10px -40px inset, rgba(190, 190, 190, 0.35) 0px -40px 10px -40px inset, rgb(255, 255, 255) 0px 40px 30px -40px inset"
    padding: "14px"
  card-calendar-tile:
    background: "#FFFFFF"
    radius: "16px"
    shadow: "rgba(0, 0, 0, 0.2) 0px 12px 28px -16px"
    padding: "14px 16px 15px"
---
# Overnight Thread Light

Source: https://www.getstanley.ai/welcome

## Overview
This is a white-dominant, messaging-native aesthetic: the entire visual system is built to look like an iMessage/Telegram thread rendered as a marketing page. It borrows chat-bubble geometry, device-frame chrome, and social-post cards (avatars, hearts, share counts) as its primary graphic vocabulary rather than illustration or photography. Display type is an ultra-bold, tight-tracked geometric sans (Plus Jakarta Sans at 88px/800, -2.8px tracking) that reads as headline-grade Swiss/editorial minimalism, while a small serif (Lora) appears only as an isolated large-scale accent word. Indigo (#6355FF) is the single rationed hue against a near-monochrome black/white/lavender system — everything else is ink, paper-white, and one pale lavender surface tint.

## Composition
The first screen is centered and vertical: eyebrow-free giant headline, a single dark pill CTA with a secondary text link beneath it, then a large hero illustration built from three overlapping panels (a polaroid-style photo, a full iPhone chat mockup, and a social-post card) fanned across the fold. Below the fold the page runs a strict alternating rhythm: full-bleed white text-led bands (headline + supporting copy, left-aligned) interleaved with pale-lavender (#EEEEF9) full-bleed panels that hold flush-white component cards (calendar tiles, testimonial cards, chat threads). This produces a "light band / lavender band" cadence roughly every one to two sections. The deliberate choice is to let chat UI itself be the hero graphic — rejecting a conventional abstract-gradient or product-screenshot hero — which keeps the page feeling like a live conversation rather than a static feature showcase.

## Colors
Background is paper-white (#FFFFFF, ~59-82% of pixels) carrying nearly all body sections; a pale indigo-tinted surface (#EEEEF9, ~12% area) is used exclusively for alternating content bands and the footer, never for text. Ink (#121212) is the primary text and icon color; pure black (#000000) is reserved for the heaviest display headlines and the nav logotype. #2F2F31 is a secondary near-black used for the nav CTA fill and secondary text. The sole hue accent, #6355FF, is rationed to: chat-bubble sender fills, the tinted ghost-button background at 9% opacity, small icon glows, a highlight bar behind selected headline phrases, and a conic-gradient sparkle accent — never a background wash. Nothing else carries color; grays, borders (#141414, #0D0D0D hairlines), and surfaces stay achromatic so the indigo reads as a signal, not decoration.

## Typography
Plus Jakarta Sans carries the entire hierarchy: display/headline at 88px/800 with -2.8px tracking for hero and section headlines, body copy at 17.5–13px/400 for paragraph and label text. Lora appears once as a large isolated accent (~23px/450, serif) breaking the sans rhythm — a single-word or short-phrase interruption, never running text. Labels and eyebrows use the same Plus Jakarta Sans family at small size (13px) rather than a distinct mono or all-caps treatment, keeping the type system to two families total (one workhorse sans, one accent serif).

## Layout
Content is capped at 1280px max-width with generous 140px section padding and an 8px-based spacing scale (8/10/11/14px increments) governing micro-gaps. Card radii cluster at two tiers: tight controls at 14px, standard cards at 16-24px, with one large 22px testimonial card. Grids are simple two-column splits (2 columns, 96px gap, rows at roughly 41/48% or 48/44% height split) pairing a text column against a device/illustration column — not a dense multi-column grid. Card rows that do appear (testimonial trio, glass-feature trio, calendar-tile trio) run uniform full-width single-file stacks (rows of [100|100|100] or [101|101|101]), meaning these are list-style single-column repeats, not bento or masonry grids — density stays low, one component per row, generous whitespace between.

## Components
- **Navbar**: edge-to-edge square bar, 64px tall, transparent background, sticky, spanning ~99% of viewport width (0px right inset, no side margins) — a true full-bleed bar, all four corners 0px radius (no rounding at all). Holds 3 items: logo mark at left, a "Log in" text link, and a solid dark CTA (#2F2F31 fill, white text, 12px radius, 40px height) at right.
- **Hero primary CTA**: an observed near-black solid pill beneath the headline (~56px tall, fully rounded ends), carrying a small green chat-bubble icon inline with its label and a trailing arrow glyph; a plain underlined text link sits directly beneath it as a secondary, lower-emphasis action.
- **Button — tinted**: rgba(99, 85, 255, 0.09) fill, #121212 text, 14px radius (rounded, not pill), 63px height, 11px 12px padding — used as a secondary in-content action.
- **Button — ghost**: transparent fill, #121212 text, same 14px radius and 63px height, hover state darkens to rgba(18, 18, 18, 0.04) — paired beside the tinted variant as an alternate action.
- **Button — nav CTA**: solid #2F2F31, white text, 12px radius, 40px height — smaller and more square-cornered than the in-page buttons, distinguishing global nav action from body actions.
- **Full-bleed hero panel cluster**: three overlapping media cards (transparent fill, 0px radius, backdrop-filter blur(0.0625px)) — a polaroid-style photo card, a full iPhone-frame chat mockup, and a social-post card with heart/reply/share counts — fanned diagonally beneath the headline, occupying roughly the lower two-thirds of the first viewport.
- **Testimonial card**: white (#FFFFFF), 22px radius, shadow `rgba(0,0,0,0.04) 0px 1px 2px 0px, rgba(0,0,0,0.32) 0px 20px 50px -24px`, 24px 26px padding. Anatomy top to bottom: avatar + name + role in a header row, a divider, then one or two chat-style quote bubbles, timestamp/status footer. Appears singly beside an inbox-list panel, not in a repeating row.
- **Glass feature card (×3, stacked full-width)**: rgba(255,255,255,0.68) fill with backdrop-filter blur(24px), 24px radius, compound inset+drop shadow (verbatim: `rgba(0,0,0,0.06) 0px 0px 0px 0.5px, rgba(0,0,0,0.18) 0px 12px 30px -12px, rgba(255,255,255,0.95) 0px 40px 10px -40px inset, rgba(190,190,190,0.35) 0px -40px 10px -40px inset, rgb(255,255,255) 0px 40px 30px -40px inset`), 14px padding. Anatomy: icon + short body-text line per card, stacked one-per-row at full width — a chat-notification style list, not a grid.
- **Calendar day tile (×3+ in a row)**: white, 16px radius, shadow `rgba(0,0,0,0.2) 0px 12px 28px -16px`, 14px 16px 15px padding, sits inside the lavender (#EEEEF9) content-calendar band. Anatomy: day label + date at top, then stacked scheduled-post rows each with a small platform-icon badge, time stamp, and one-line preview text; a floating annotation bubble overlaps two tiles pointing out a schedule change.
- **Chat thread panel (repeating pattern, full width)**: transparent background, no radius, no padding — sequences of left-aligned gray bubbles and right-aligned indigo (#6355FF) bubbles simulating a live conversation, including a playable voice-note bubble with waveform. This is the page's dominant recurring "component," used in the hero, mid-page loop section, and near the footer.
- **Platform-icon row**: six flat rounded-square app-style icons (video, an X mark, a professional-network mark, an at-symbol mark, a camera mark, a bookmark mark) laid out as a single centered horizontal row beneath a headline — a logo-strip variant built from icon tiles rather than wordmarks.
- **Footer**: background #EEEEF9, 4 text links, oversized wordmark-style lockup with a 3D glossy sphere mascot centered against it, small copyright and platform-icon buttons at the bottom edge.

## Graphics & Effects
A dotted radial-dot texture overlays roughly 7.4% of the page in two passes — `radial-gradient(rgba(255,255,255,0.6) 1px, rgba(0,0,0,0) 1px)` and a second at `rgba(255,255,255,0.4) 1px` — functioning as a subtle halftone/scrim over media panels (the phone mockup and social-post card), not a page-wide texture. A soft fade-to-lavender scrim, `linear-gradient(rgba(238,238,249,0), rgb(238,238,249) 90%)`, sits at the base of the calendar band (covering ~1.4% of the page) to dissolve its bottom edge into white. Two near-invisible gradients (`linear-gradient(rgb(18,18,18), rgb(18,18,18))` and a `conic-gradient(from 501.94deg, rgba(0,0,0,0) …rgb(99,85,255) 5%… rgb(255,255,255) 10%…)`) are tiny accents — a device-notch fill and a rotating sparkle/glint behind an icon, each well under 0.2% of page area; neither should be read as a hero background. Card shadows are soft and low-contrast (`rgba(0,0,0,0.22) 0px 6px 14px -10px`), with hairline highlight rings (`rgba(255,255,255,0.9) 0px 0px 0px 1.5px`) used on floating annotation bubbles for a glass-edge lift. Backdrop blurs range from a barely-there `blur(0.0625px)` on full-bleed hero media to a heavier `blur(24px)` on the stacked feature cards, with `blur(8.87px) saturate(1.6)` style treatments giving certain overlapping cards a frosted, saturate-boosted glass edge.

## Motion
Interactions favor a spring-flavored deceleration curve, `cubic-bezier(0.23, 1, 0.32, 1)`, applied to transform/opacity/filter changes at two speeds: a snappier 0.22-0.3s for hover/press feedback and a slower 0.38-0.52s for elements entering the viewport (cards and chat bubbles rising/fading in). Background-color transitions use a flat `ease` at 0.2s for simple hover fills. Named keyframes drive a looping gradient pan (an ambient shimmer, likely the conic-gradient glint), a live-pulse animation on the mascot/status dot, and slide-in/out drawer animations for mobile navigation and dialog overlays. Scroll-driven CSS animations stagger the chat-thread bubbles and calendar tiles into view as the page scrolls, reinforcing the "conversation happening live" feeling rather than a static reveal.

## Guardrails
- Never fill the hero background with the conic or gradient-pan values — those belong to a tiny icon glint/notch, not a full-frame wash; the hero stays white with chat-UI panels as its only graphic.
- Do not round the navbar's corners or inset it — it is a true edge-to-edge 0px-radius bar at 64px height.
- Keep the indigo accent confined to chat bubbles, the tinted button, small icon fills, and highlight bars — do not spread it into card backgrounds or body text.
- Do not merge the tinted-button and ghost-button variants; both share radius/height but differ in fill and must stay distinct.
- Preserve the single-column, one-per-row stacking of testimonial/glass-feature/calendar cards — do not compress them into a multi-column bento grid.
- The Lora serif accent must remain a rare, large-scale single-word interruption — never used for running body copy.