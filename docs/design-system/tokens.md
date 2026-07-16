# Tokens

Defined in `src/index.css` (`@theme` + `:root` / `.dark`). Always use the semantic class, not the raw neutral. Source of truth is `index.css` — values below are a reference.

## Text colour (3 tiers)

| Tier | Class | Light | Dark | Use for |
| --- | --- | --- | --- | --- |
| Primary | `text-foreground` | neutral-700 | neutral-50 | Body content, the default |
| Secondary | `text-foreground-secondary` | neutral-600 | neutral-300 | Descriptions, subtitles, table data |
| Muted | `text-muted-foreground` | neutral-400 | neutral-400 | Captions, timestamps, placeholders, hints, disabled |

Reach for secondary before muted. Never use muted for regular body text.

## Semantic colours

| Token | Light | Dark | Notes |
| --- | --- | --- | --- |
| `background` | neutral-50 | neutral-800 | app backdrop is `sidebar`, not this |
| `foreground` | neutral-700 | neutral-50 | |
| `card` | white | neutral-700 | surface |
| `primary` | teal-600 | teal-600 | brand action |
| `primary-foreground` | neutral-50 | neutral-50 | |
| `secondary` | neutral-100 | neutral-900 | secondary button fill |
| `muted` | neutral-100 | neutral-800 | subtle fill |
| `accent` | neutral-200 | neutral-700 | hover fill |
| `border` | neutral-200 | neutral-600 | use `/60` for inset panels |
| `input-border` | neutral-200 | neutral-600 | |
| `ring` | teal-300 | teal-500 | focus ring (`ring-4 ring-ring/40`) |
| `destructive` | rose-500 | rose-400 | |
| `sidebar` | neutral-100 | neutral-900 | the inset backdrop |
| `sidebar-active` | teal-100 | teal-900 | active nav item |

## Brand scale

`brand-50 … brand-950` alias the Lexer **teal** scale (`--color-teal-*`). `brand-25` is intentionally omitted — ask before adding it. Use `bg-primary`/`text-primary` for the standard action colour; the raw scale for tints.

## Radius

Base `--radius: 0.5rem` (8px). `rounded-lg` = controls/inputs (8px); `rounded-xl` = cards/panels (12px); `rounded-full` = pills/avatars.

## Elevation (shadows)

`shadow-xs` inputs · `shadow-sm`/`shadow-md` cards · `shadow-lg`+ overlays (dialogs, menus). Buttons use the skeuomorphic tokens: `shadow-xs-skeuomorphic` (solid, + inner-border gradient) and `shadow-xs-skeuomorphic-border` (outline). Don't hand-roll button shadows.

## Type

Typeface **Mona Sans** (GitHub), display + body, via `--font-sans`. Scale is Tailwind defaults (unchanged): `text-xs … text-3xl`. Headings `font-semibold`; display `font-bold tracking-tight`. Labels sentence case.

## Spacing

1 unit = 4px (Tailwind). Page padding `px-6 py-6`; section gap `gap-8`; in-section gap `gap-4`; card padding `p-5`; panel header bar `h-12`; inset gutter `m-2`.
