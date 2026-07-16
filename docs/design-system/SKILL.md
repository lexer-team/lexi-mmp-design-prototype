---
name: lexer-design-system
description: Build cohesive Lexer app UI. Use whenever creating or modifying Lexer screens, components, or layouts — provides the design tokens, component inventory, conventions (shadcn structure + Lexer palette), and page/modal recipes. Read this file first, then load only the group or reference file you need.
---

# Lexer Design System

A React 19 + Tailwind v4 system. Approach: **keep shadcn/ui component structure and APIs; apply Lexer's own visual styling (spacing, radius, elevation, focus) and palette.** Built on Radix where an accessible primitive is needed. Icons: `@remixicon/react`. Class merging: `cn()` from `@/lib/utils`.

## How to use these docs (read order)

1. **This file** — always. The rules + token cheat-sheet + the component inventory below.
2. **`components/<group>.md`** — load only the group you're building in (forms, actions, data-display, feedback, navigation, layout).
3. **`tokens.md` / `principles.md` / `recipes.md`** — load only when you need full token values, rationale, or page/modal templates.

Don't load everything. The inventory tells you which one file to open. For exact props, open the component's `source` file.

## Non-negotiables

- **Structure from shadcn; styling and colours from Lexer.** Never introduce a different component framework.
- **No new npm dependencies** without sign-off. If a library is the "right" base (e.g. react-day-picker, cmdk), build vanilla and cite it in the doc.
- **Use semantic tokens, never hardcoded neutrals.** `text-foreground`, `bg-card`, `border-border` — not `text-neutral-700`, `bg-white`.
- **Text hierarchy (3 tiers):** body = `text-foreground`; supporting copy = `text-foreground-secondary`; only side-notes/captions/placeholders/disabled = `text-muted-foreground`. Never use muted for regular body text.
- **Labels are sentence case.** No ALL-CAPS, no letter-spacing tracking.
- **Inset rule:** only the outermost surface is inset (`rounded-xl shadow-sm border border-border/60` on `bg-background` over the `bg-sidebar` backdrop). Sub-panels in a split are flush (`Pane`), divided — never nested cards.
- **One primary action per surface.** Secondary = outline/ghost. Destructive confirmations use `ConfirmDialog`.
- **Radius:** controls/inputs `rounded-lg` (8px); cards/panels `rounded-xl` (12px).

## Token cheat-sheet

| Need | Class |
| --- | --- |
| Body text | `text-foreground` |
| Supporting text | `text-foreground-secondary` |
| Caption / hint / placeholder | `text-muted-foreground` |
| App background (backdrop) | `bg-sidebar` |
| Surface / card | `bg-card` (or `bg-background` for inset panels) |
| Inset panel border | `border border-border/60` |
| Divider / border | `border-border` |
| Brand / primary | `bg-primary` · `text-primary` · scale `brand-50…950` |
| Muted fill | `bg-muted` · hover `bg-accent` |
| Focus ring | `focus-visible:ring-4 focus-visible:ring-ring/40` |
| Control radius / card radius | `rounded-lg` / `rounded-xl` |
| Elevation | `shadow-xs` inputs · `shadow-sm/md` cards · `shadow-lg+` overlays |

Full values, dark-mode mappings, and the type scale: **`tokens.md`**.

## Component inventory

Open `components/<group>.md` for usage; open the listed `source` for full props.

<!-- BEGIN inventory (generated — run npm run docs:agents) -->
<!-- END inventory -->

## Adding to the system

New component → add an entry to `registry.mjs`, build it, run `npm run docs:agents`. See **`CONTRIBUTING.md`**.
