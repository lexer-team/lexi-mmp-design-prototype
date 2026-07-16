# UUI components batch — plan

**Goal:** Add the requested Untitled UI application-UI components to the design system.
Method (unchanged): cross-check each against **shadcn/ui**. If shadcn has a base, reskin it to UUI
specs with the Lexer palette/tokens. If shadcn has no base, build it shadcn-style (Radix where an
accessible primitive is needed, cva variants, `cn`, `className` passthrough, semantic tokens).

> Note: UUI React itself is now React-Aria-based, but we only borrow its **visual specs** — the
> structure stays shadcn/Radix, consistent with everything already in `components/ui/`.

---

## Cross-check & disposition

| # | Requested | shadcn base? | Already in playground? | Action |
|---|---|---|---|---|
| 1 | Activity feeds (no avatar) | No | No | **Build** shadcn-style timeline (connector line + icon dot + content) |
| 2 | Alerts | **Alert** | No (only Toast) | **Reskin** shadcn Alert → UUI (featured icon, info/success/warning/error, dismiss, actions) |
| 3 | Breadcrumb | Breadcrumb | **Yes** (`Breadcrumbs`) | **Review/align** to UUI dividers + optional home icon |
| 4 | Card headers | **Card** | Partial (inline in Patterns) | **Build** shadcn `Card` (+Header/Title/Desc/Content/Footer); UUI card-header variants |
| 5 | Code snippets | No | No | **Build** shadcn-style code block (filename bar + copy button, token-themed) |
| 6 | Command menus | Command (cmdk) | **Yes** (custom `CommandMenu`) | **Review** — keep custom; align styling, note parity |
| 7 | Date pickers | **Calendar** (react-day-picker) | No | **Reskin** shadcn Calendar + Popover → UUI · **needs dep** |
| 8 | File uploaders | No | No | **Build** shadcn-style dropzone + file list/progress (native DnD, no dep) |
| 9 | Filter bars | No | No | **Build** as composition (Input + DropdownMenu + Badge filter pills) |
| 10 | Modals | Dialog + **AlertDialog** | **Yes** (`Dialog`) | **Extend** Dialog (sizes, featured-icon header) + add `AlertDialog` for destructive · **needs dep** + types/rules below |
| 11 | Section headers | No | **Yes** (layout `SectionHeader`) | **Enhance** to UUI variants (actions, tabs row, badge) |
| 12 | Section footers | No | Inline (settings recipe) | **Extract** `SectionFooter` primitive (actions bar) |
| 13 | Progress steps | No (only Progress bar) | No | **Build** shadcn-style Stepper (horizontal + vertical, states) |
| 14 | Sidebar navigations | Sidebar | **Yes** (prod `Sidebar.tsx`) | **Document** prod as canonical + optional nested-item/badge/section-label support |
| 15 | Tables | Table | **Yes** (`Table`) | **Enhance** with UUI patterns (sortable head, selection col, row actions, footer) |
| 16 | Tabs | Tabs | **Yes** (underline + segmented) | **Enhance** with count/badge support (+ optional vertical) |

**New dependencies required:** `react-day-picker` (Date pickers) and `@radix-ui/react-alert-dialog`
(destructive modals). Everything else uses existing deps or none. Code snippets stay dependency-free
(token-styled `<pre>`, no syntax-highlight lib) unless you want real highlighting later.

---

## Prod sidebar analysis (item 14)

`src/components/layout/Sidebar.tsx` already mirrors **shadcn Sidebar `variant="inset"
collapsible="icon"`**: `p-2` outer padding so the inner container floats, collapses to a 3rem icon
rail, no border (depth from the inset card shadow). Structure: logo header → primary nav (icon in a
6px rounded chip, semibold labels, `bg-sidebar-active` state) → "Recent Chats" labelled section →
user footer with avatar. It's solid and on-spec.

Gaps vs UUI sidebar-navigations worth optionally adding: section/group labels as a reusable pattern,
per-item count/badge, nested (collapsible) child items, and a secondary/bottom nav group. Plan:
**document it as the canonical sidebar recipe** in the Navigation page, and add those affordances
only if you want them — no rebuild.

## Modal types & rules (item 10)

Built on the existing `Dialog` plus a new `AlertDialog` (Radix alert-dialog — no outside-click/ESC
dismiss, focus defaults to the safe action).

Types:
1. **Confirmation** — neutral title + body, Cancel + primary. `Dialog`, `sm`.
2. **Destructive confirmation** — `AlertDialog`, danger featured icon, destructive primary, focus on Cancel.
3. **Form modal** — fields in a scrollable body, sticky footer, `md`/`lg`.
4. **Informational / announcement** — brand featured icon, single acknowledge action.
5. **Success / completion** — success featured icon, single Done action.

Rules: exactly one primary action; destructive flows use `AlertDialog`, never a plain Dialog; keep to
a few fields (more → use a page or slideout); always provide a close affordance; trap focus; ESC +
outside-click close **non-destructive** modals only; sizes `sm 400 / md 480 / lg 640`. (Slideouts are
out of scope for this batch.)

---

## Phasing (each phase ends with its DS page(s) updated + `tsc`/build check)

- **Phase 1 — Enhance existing, no deps:** Breadcrumb, Tabs (+counts), Tables (sort/select/actions),
  Section headers, Command menu review, Sidebar documentation.
- **Phase 2 — New on shadcn base, no deps:** Alerts (Alert), Card + card headers, Section footers,
  Activity feeds, Code snippets.
- **Phase 3 — New shadcn-style, no deps:** Filter bars, Progress steps, Tree views, File uploaders.
- **Phase 4 — Needs deps/decisions:** Date pickers (`react-day-picker`), Modal taxonomy + `AlertDialog`
  (`@radix-ui/react-alert-dialog`), with the types/rules above documented.
- **Phase 5 — Validate:** register new sections across DS group pages, dark-mode + responsive pass,
  changelog.

## Design-system placement

Forms: Date picker, File uploader. Feedback: Alert, Modals. Navigation: Breadcrumb, Tabs, Progress
steps, Tree view, Sidebar (doc). Data display: Table, Card/Card header, Code snippet, Activity feed.
Actions: Command menu, Filter bar. Layout: Section header, Section footer.
