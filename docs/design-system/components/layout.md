<!-- GENERATED from docs/design-system/registry.mjs — do not edit by hand. Run: npm run docs:agents -->
# Layout

Page structure primitives in the inset-panel look.

> Conventions in `../principles.md`; tokens in `../tokens.md`; page templates & modal rules in `../recipes.md`.

---

## Page & PageHeader

**Use when:** Padded content container + page header inside the inset main card.

```tsx
import { Page, PageHeader } from "@/components/layout/Page";
```

**Props:** Page width: narrow|default|wide|full · PageHeader: title, description, breadcrumbs, actions, tabs

```tsx
<Page><PageHeader title="Segments" actions={<Button>New</Button>} />…</Page>
```

- ✅ One PageHeader per screen; keep the page-header divider.
- ❌ Don't scroll Page itself — AppShell provides the scroll region.

Source: `src/components/layout/Page.tsx`

---

## Section / header / footer

**Use when:** Titled blocks within a page; commit footer.

```tsx
import { Section, SectionHeader, SectionFooter } from "@/components/layout/Section";
```

**Props:** SectionHeader: title, description, badge, actions, tabs (no divider) · SectionFooter: hint, children

```tsx
<Section title="Members" actions={<Button size="sm">Export</Button>}>…</Section>
```

- ✅ Use spacing, not dividers, to separate section titles from content.
- ❌ Don't scatter multiple commit footers in one form.

Source: `src/components/layout/Section.tsx`

---

## Grid

**Use when:** Responsive card/metric grids.

```tsx
import { Grid } from "@/components/layout/Grid";
```

**Props:** cols: 1|2|3|4, gap: sm|md|lg

```tsx
<Grid cols={3}><MetricCard … /></Grid>
```

- ✅ Let it collapse to one column on small screens (built in).
- ❌ Don't build ad-hoc grid class strings — use this helper.

Source: `src/components/layout/Grid.tsx`

---

## Panel / Pane

**Use when:** Framed inset surface (Panel) or flush sub-panel in a split (Pane).

```tsx
import { Panel, Pane, PanelHeader, PanelBody } from "@/components/layout/Panel";
```

**Props:** Panel: inset card · Pane: flush, no chrome · PanelHeader: title, icon, actions · PanelBody: padded

```tsx
<Panel><PanelHeader title='Segments' /><PanelBody>…</PanelBody></Panel>
```

- ✅ Only the outermost surface is inset; sub-panes use Pane (flush).
- ❌ Don't wrap split panes in their own inset Panel.

Source: `src/components/layout/Panel.tsx`

---

## SplitView

**Use when:** Resizable list + detail, divided (not nested cards).

```tsx
import { SplitView } from "@/components/layout/SplitView";
```

**Props:** list, detail, initialListWidth, minListWidth, maxListWidth

```tsx
<SplitView list={<Pane>…</Pane>} detail={<Pane>…</Pane>} />
```

- ✅ Pass flush Panes; keep the list pane ~240–320px.
- ❌ Don't use on narrow screens — fall back to list → detail nav.

Source: `src/components/layout/SplitView.tsx`
