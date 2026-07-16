# Layout templates plan

**Goal:** Borrow Untitled UI's *layout rules* (not its pages) and express them as Lexer-specific
page templates, built the shadcn way — existing components, existing tokens, no new dependencies.
No UUI template maps 1:1 to Lexer, so we extract the structure and recompose it.

**Decisions (locked with Izac):**
- Rule source = UUI free React source, but reconciled to the existing reskin — **reuse what we
  already have, don't reinvent**.
- Thin layout **primitives + recipes** (not raw-Tailwind-only).
- Templates: **List page**, **Detail page (standalone)**, **List + detail (split view)**, **Settings page**.
- Everything must read as **inset windows/panels** to match the current app look & feel.

---

## The inset language (the look to inherit)

From `AppShell.tsx` / `DataPanel.tsx`, the app is built from inset cards on a `bg-sidebar` backdrop:

- **Inset card:** `bg-background m-2 ml-0 rounded-xl shadow-sm border border-border/60`
- **Header bar:** `h-12 shrink-0 border-b border-border px-4`, 14px medium title
- **Sub-nav rail (inside a card):** `w-44 border-r border-border bg-muted/30` (see `DataSubNav`)
- **Scroll region:** content scrolls inside the card; the card itself never scrolls
- **Split panels:** siblings on the `bg-sidebar` level, each its own inset card, separated by a
  drag handle (`ResizeHandle`) — already proven by the right artifact panel

Every template below renders *inside* this language: inset card → optional left rail → header
bar(s) → scrollable content, with nested inset panels for split/detail surfaces.

---

## Phase 1 — Distil the layout spec

Pull the template-independent rules from UUI's free React source and reconcile each to what
playground already uses (so we add tokens only where Tailwind defaults can't express the rule):

| Rule | UUI reference | Reconciled Lexer value |
|---|---|---|
| Content container | `max-width` + horizontal padding | reuse `mx-auto max-w-*` + `px-6` (already used on DesignSystem) |
| Vertical rhythm | header→content + section gap | `gap-8` page / `gap-6` section (Tailwind scale, no new token) |
| Page header anatomy | breadcrumbs / title + supporting text / actions / optional tabs / divider | map to existing `Breadcrumbs`, `Button`, `Tabs` |
| Section header anatomy | title + supporting text + section actions | new `SectionHeader` primitive |
| Grid rules | column counts per breakpoint, gap scale, grid vs flex | `Grid` helper mapping `cols` → responsive classes |
| Breakpoints | UUI sm/md/lg/xl | already Tailwind defaults — no change |

**Output:** a short written spec (this doc + the Layout page intro) and, only if needed, 1–2 layout
tokens in `index.css` (e.g. `--page-padding`, `--section-gap`). Default is **no new tokens** — the
existing radius/shadow/`bg-sidebar`/`border-border/60`/`h-12` vocabulary already covers it.

## Phase 2 — Layout primitives (`src/components/layout/`)

Minimal set, each composing existing tokens; recipes stay short and consistent:

- **`Page`** — content container inside the inset card: `mx-auto max-w-* px-6 py-* flex flex-col gap-8`.
- **`PageHeader`** — title + supporting text + actions slot; optional breadcrumbs and tabs row.
- **`Section` / `SectionHeader`** — a general (non-docs) section block with title/supporting/actions.
- **`Grid`** — `cols` prop → `grid grid-cols-1 md:grid-cols-N gap-*`; covers the card-grid recipe.
- **`Panel` / `PanelHeader`** — the reusable inset card (`rounded-xl shadow-sm border border-border/60
  bg-background`) + its `h-12` header bar. This is the "inset window" primitive.
- **`SplitView`** — two/three `Panel`s side by side with a resize handle (reuse the existing
  `ResizeHandle` pattern or `react-resizable-panels`, already installed).

No new npm dependencies. APIs follow shadcn conventions (cva variants, `className` passthrough, `cn`).

## Phase 3 — Templates as recipes (new "Layout" page)

A new design-system group page (`pages/design-system/layout.tsx`), registered in `PAGES`, same
structure as the others, each recipe shown with **preview + code tabs + dos/don'ts** via the
existing `ComponentDoc` primitive:

1. **List page** — `Page` + `PageHeader` (title, primary action) + filter/search toolbar + `Table`
   + `Pagination`, all inside one inset card.
2. **Detail page (standalone)** — `PageHeader` with breadcrumbs/back + title + actions, then stacked
   `Section`s; grouped content sits in nested `Panel`s.
3. **List + detail (split view)** — `SplitView` of two `Panel`s (list rail + detail), mirroring the
   real `DataPanel` so it reads as native Lexer.
4. **Settings page** — left sub-nav rail (or `Tabs`) + stacked form `Section`s + sticky save footer,
   inside one inset card.

## Phase 4 — Validate & register

- Add "Layout" to `PAGES` in `DesignSystem.tsx` (after Patterns, before Changelog).
- `npm run build` passes (tsc + vite).
- Dark-mode pass and responsive check at sm/md/lg/xl — the point of layout rules is they hold.
- Changelog entry.

---

## Open defaults (flagging, not blocking)

- New page placed after Patterns; say the word to reorder.
- Split-view resize: default to the existing `ResizeHandle` for visual consistency with AppShell.
- Primitives live in `components/layout/`; recipes reference real-ish mock data already in `src/data/`.
