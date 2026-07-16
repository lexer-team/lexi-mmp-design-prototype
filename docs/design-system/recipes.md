# Recipes — page templates & modal rules

Compose the layout primitives (`components/layout.md`) into whole screens. All render inside the inset main card the AppShell provides. Live examples: Design System → Layout.

## Page templates

**List page** — index screen.
`Page width="full"` → `PageHeader` (title + primary action) → filter toolbar (search `Input` + `FilterBar`) → `Table` → `Pagination`. One inset card.

**Detail page (standalone)** — a single record.
Breadcrumb in the **panel header bar** (not the PageHeader) → `PageHeader` (title + actions) → `Section`s. Open with an Overview `Grid` of `MetricCard`s, then grouped content in `Panel`s. `Page width="default"`.

**List + detail (split view)** — master/detail.
`SplitView` with `list` and `detail` as **flush `Pane`s** (not inset `Panel`s — only the outermost surface is inset). List pane ~240–320px; persist selection so detail reflects the highlighted row. Mirrors the prod Data panel.

**Settings page** — form-heavy.
Left sub-nav rail (or `Tabs`) → scrollable form `Section`s with `Field`s → **sticky save footer** pinned to the card (Cancel + one primary). Group fields into Sections; one footer commits the page.

## Modal taxonomy (5 types)

All on the `Dialog` base (`components/feedback.md`). Sizes: `sm` 400 / `md` 480 / `lg` 640.

1. **Confirmation** — `Dialog size="sm"`, brand featured icon, Cancel + primary.
2. **Destructive confirmation** — `ConfirmDialog` (no outside-click/esc dismiss, hidden close X, focus on Cancel), error featured icon, destructive primary.
3. **Form** — `Dialog size="lg"`, `Field`s in the body, footer Cancel + primary.
4. **Informational** — brand featured icon, single acknowledge ("Got it").
5. **Success** — success featured icon, single "Done".

### Modal rules

- Exactly one primary action per modal.
- Destructive/irreversible → **always `ConfirmDialog`**, never a dismissible `Dialog`.
- Match size to content: `sm` confirms, `lg` forms.
- Anchor intent with a `FeaturedIcon` (brand / success / error).
- ESC + outside-click close **non-destructive** modals only.
- Don't open a modal from a modal. Long forms → use a page or slideout, not a modal.
