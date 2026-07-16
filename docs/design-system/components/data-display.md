<!-- GENERATED from docs/design-system/registry.mjs — do not edit by hand. Run: npm run docs:agents -->
# Data display

Presenting entities, status, numbers, and events.

> Conventions in `../principles.md`; tokens in `../tokens.md`; page templates & modal rules in `../recipes.md`.

---

## Badge

**Use when:** Status, counts, labels.

```tsx
import { Badge } from "@/components/ui/Badge";
```

**Props:** variant: default|secondary|success|warning|danger|outline · size: sm|md|lg

```tsx
<Badge variant="success">Active</Badge>
```

- ✅ Use semantic variants only for real state.
- ❌ Don't make badges interactive — use a small Button.

Source: `src/components/ui/Badge.tsx`

---

## Avatar

**Use when:** Person/account identity.

```tsx
import { Avatar } from "@/components/ui/Avatar";
```

**Props:** initials, size: sm|md|lg, online?

```tsx
<Avatar initials="IH" size="sm" online />
```

- ✅ Use initials when no image; online dot only where presence matters.
- ❌ Don't use for non-person entities — use a Featured icon.

Source: `src/components/ui/Avatar.tsx`

---

## Table

**Use when:** Tabular data; supports selection, sort, row actions.

```tsx
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell, SortableTableHead } from "@/components/ui/Table";
```

**Props:** SortableTableHead: sort: asc|desc|false, onSort · selection via Checkbox + row data-state

```tsx
<Table><TableHeader><TableRow><SortableTableHead sort={dir} onSort={s}>Members</SortableTableHead></TableRow></TableHeader><TableBody>…</TableBody></Table>
```

- ✅ Right-align numerics (tabular-nums); row actions in a trailing ghost menu.
- ❌ Don't add vertical borders or make every header sortable.

Source: `src/components/ui/Table.tsx`

---

## Card

**Use when:** Container for one entity / grouped content.

```tsx
import { Card, CardHeader, CardContent, CardFooter } from "@/components/ui/Card";
```

**Props:** CardHeader: title, description, icon, actions, badge, divider

```tsx
<Card><CardHeader title="Snowflake" badge={<Badge>Active</Badge>} /><CardContent>…</CardContent></Card>
```

- ✅ One card per entity; header = title + one supporting line.
- ❌ Don't nest cards inside cards.

Source: `src/components/ui/Card.tsx`

---

## Metric card

**Use when:** A single KPI with trend.

```tsx
import { MetricCard } from "@/components/ui/MetricCard";
```

**Props:** label, value, delta?: {value, direction}, hint?, icon?

```tsx
<MetricCard label="Revenue" value="$2.4M" delta={{ value: "12%", direction: "up" }} />
```

- ✅ One metric per card.
- ❌ Don't use red/green deltas when direction isn't good/bad.

Source: `src/components/ui/MetricCard.tsx`

---

## Activity feed

**Use when:** Timeline of events (no avatar).

```tsx
import { ActivityFeed } from "@/components/ui/ActivityFeed";
```

**Props:** items: { id, icon?, title, description?, time? }[]

```tsx
<ActivityFeed items={[{ id: "1", title: "Segment created", time: "2h ago" }]} />
```

- ✅ Lead each item with a verb + affected object; relative timestamps.
- ❌ Don't write paragraphs per item — link to detail.

Source: `src/components/ui/ActivityFeed.tsx`

---

## Code snippet

**Use when:** Copyable code block with filename bar.

```tsx
import { CodeSnippet } from "@/components/ui/CodeSnippet";
```

**Props:** code, filename?, language?

```tsx
<CodeSnippet filename="segment.json" code={json} />
```

- ✅ Show filename/language for context; keep snippets short.
- ❌ Don't paste huge files.

Source: `src/components/ui/CodeSnippet.tsx`

---

## Empty state

**Use when:** Nothing to show yet / no results.

```tsx
import { EmptyState } from "@/components/ui/EmptyState";
```

**Props:** icon?, title, description?, children (actions)

```tsx
<EmptyState icon={<RiSearchLine />} title="No segments" description="Try a different search." />
```

- ✅ Say what's empty and how to fill it; offer the primary action.
- ❌ Don't show during loading — use Skeleton.

Source: `src/components/ui/EmptyState.tsx`

---

## Featured icon

**Use when:** Anchor an empty state / dialog / alert with a tinted icon.

```tsx
import { FeaturedIcon } from "@/components/ui/FeaturedIcon";
```

**Props:** color: brand|gray|success|warning|error · size: sm|md|lg

```tsx
<FeaturedIcon color="brand"><RiDatabase2Line /></FeaturedIcon>
```

- ✅ Match color to intent; decorative only.
- ❌ Don't use it as a button.

Source: `src/components/ui/FeaturedIcon.tsx`
