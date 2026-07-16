import { useState } from "react";
import { ComponentDoc, Row } from "./doc";
import { Badge } from "@/components/ui/Badge";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import {
  Table, TableHeader, TableBody, TableRow, TableHead, TableCell, SortableTableHead,
} from "@/components/ui/Table";
import { Checkbox } from "@/components/ui/Checkbox";
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator,
} from "@/components/ui/DropdownMenu";
import { MetricCard } from "@/components/ui/MetricCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { FeaturedIcon } from "@/components/ui/FeaturedIcon";
import { Card, CardHeader, CardContent, CardFooter } from "@/components/ui/Card";
import { ActivityFeed } from "@/components/ui/ActivityFeed";
import { CodeSnippet } from "@/components/ui/CodeSnippet";
import {
  RiSparklingLine, RiCheckboxCircleLine, RiAlertLine, RiCloseCircleLine,
  RiSearchLine, RiAddLine, RiDatabase2Line, RiUserLine, RiErrorWarningLine, RiLineChartLine,
  RiMoreLine, RiEditLine, RiDeleteBinLine,
} from "@remixicon/react";

type SortDir = "asc" | "desc" | false;

const TABLE_ROWS = [
  { name: "Loyalty Gold", members: 4821, share: 38, status: "Active" as const },
  { name: "Churn risk", members: 1206, share: 9, status: "Review" as const },
  { name: "Lapsed", members: 12094, share: 4, status: "Paused" as const },
];

const tableStatusVariant = { Active: "success", Review: "warning", Paused: "secondary" } as const;

function TableDemo() {
  const [sort, setSort] = useState<{ key: "members" | "share"; dir: SortDir }>({ key: "members", dir: "desc" });
  const [selected, setSelected] = useState<string[]>(["Loyalty Gold"]);

  const allSelected = selected.length === TABLE_ROWS.length;
  const someSelected = selected.length > 0 && !allSelected;

  function toggleAll() {
    setSelected(allSelected ? [] : TABLE_ROWS.map((r) => r.name));
  }
  function toggleRow(name: string) {
    setSelected((s) => (s.includes(name) ? s.filter((n) => n !== name) : [...s, name]));
  }
  function sortBy(key: "members" | "share") {
    setSort((s) => ({ key, dir: s.key === key && s.dir === "desc" ? "asc" : "desc" }));
  }

  const rows = [...TABLE_ROWS].sort((a, b) => {
    const d = a[sort.key] - b[sort.key];
    return sort.dir === "asc" ? d : -d;
  });

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-10">
            <Checkbox
              checked={allSelected ? true : someSelected ? "indeterminate" : false}
              onCheckedChange={toggleAll}
              aria-label="Select all"
            />
          </TableHead>
          <TableHead>Segment</TableHead>
          <SortableTableHead className="text-right" sort={sort.key === "members" ? sort.dir : false} onSort={() => sortBy("members")}>
            Members
          </SortableTableHead>
          <SortableTableHead className="text-right" sort={sort.key === "share" ? sort.dir : false} onSort={() => sortBy("share")}>
            Revenue share
          </SortableTableHead>
          <TableHead>Status</TableHead>
          <TableHead className="w-10" />
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((r) => (
          <TableRow key={r.name} data-state={selected.includes(r.name) ? "selected" : undefined}>
            <TableCell>
              <Checkbox checked={selected.includes(r.name)} onCheckedChange={() => toggleRow(r.name)} aria-label={`Select ${r.name}`} />
            </TableCell>
            <TableCell className="font-medium">{r.name}</TableCell>
            <TableCell className="text-right tabular-nums">{r.members.toLocaleString()}</TableCell>
            <TableCell className="text-right tabular-nums">{r.share}%</TableCell>
            <TableCell><Badge variant={tableStatusVariant[r.status]}>{r.status}</Badge></TableCell>
            <TableCell>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon-sm"><RiMoreLine /></Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem><RiEditLine />Rename</DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem destructive><RiDeleteBinLine />Delete</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

const BADGE_CODE = `import { Badge } from "@/components/ui/Badge";

// Variants: default | secondary | success | warning | danger | outline
// Sizes: sm | md | lg
<Badge variant="success">Completed</Badge>
<Badge variant="warning" size="md"><RiAlertLine className="size-3 mr-1" />Pending</Badge>`;

const AVATAR_CODE = `import { Avatar } from "@/components/ui/Avatar";

<Avatar initials="IH" />
<Avatar initials="IH" size="lg" online />`;

const TABLE_CODE = `import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell, SortableTableHead } from "@/components/ui/Table";
import { Checkbox } from "@/components/ui/Checkbox";

// Selection column + sortable headers + row actions (DropdownMenu)
<Table>
  <TableHeader>
    <TableRow>
      <TableHead className="w-10"><Checkbox checked={allSelected} onCheckedChange={toggleAll} /></TableHead>
      <TableHead>Segment</TableHead>
      <SortableTableHead sort={dir} onSort={sortByMembers} className="text-right">Members</SortableTableHead>
      <TableHead>Status</TableHead>
      <TableHead className="w-10" />
    </TableRow>
  </TableHeader>
  <TableBody>
    <TableRow data-state={isSelected ? "selected" : undefined}>
      <TableCell><Checkbox checked={isSelected} onCheckedChange={toggleRow} /></TableCell>
      <TableCell className="font-medium">Loyalty Gold</TableCell>
      <TableCell className="text-right tabular-nums">4,821</TableCell>
      <TableCell><Badge variant="success">Active</Badge></TableCell>
      <TableCell>{/* DropdownMenu row actions */}</TableCell>
    </TableRow>
  </TableBody>
</Table>`;

const METRIC_CODE = `import { MetricCard } from "@/components/ui/MetricCard";

<MetricCard label="Total revenue" value="$2.4M" delta={{ value: "12%", direction: "up" }} hint="Last 30 days" />`;

const EMPTY_CODE = `import { EmptyState } from "@/components/ui/EmptyState";

<EmptyState icon={<RiSearchLine />} title="No segments found" description="Try a different search.">
  <Button variant="outline">Clear search</Button>
  <Button><RiAddLine />New segment</Button>
</EmptyState>`;

const FEATURED_ICON_CODE = `import { FeaturedIcon } from "@/components/ui/FeaturedIcon";

// Colors: brand | gray | success | warning | error · Sizes: sm | md | lg
<FeaturedIcon color="brand"><RiDatabase2Line /></FeaturedIcon>`;

const CARD_CODE = `import { Card, CardHeader, CardContent, CardFooter } from "@/components/ui/Card";

<Card>
  <CardHeader
    icon={<RiDatabase2Line />}
    title="Snowflake"
    description="Connected · synced 2 min ago"
    badge={<Badge variant="success">Active</Badge>}
    actions={<Button variant="outline" size="sm">Manage</Button>}
    divider
  />
  <CardContent className="pt-5 text-sm text-muted-foreground">12 tables · 4.2M rows</CardContent>
  <CardFooter><Button variant="ghost" size="sm">View schema</Button></CardFooter>
</Card>`;

const ACTIVITY_CODE = `import { ActivityFeed } from "@/components/ui/ActivityFeed";

<ActivityFeed items={[
  { id: "1", icon: <RiAddLine />, title: <><b>Loyalty Gold</b> created</>, time: "2h ago" },
  { id: "2", icon: <RiEditLine />, title: <>Definition updated</>, description: "Lifetime spend > $1,000", time: "1d ago" },
]} />`;

const CODE_SNIPPET_CODE = `import { CodeSnippet } from "@/components/ui/CodeSnippet";

<CodeSnippet filename="segment.json" code={\`{ "name": "Loyalty Gold" }\`} />`;

export function DataSections() {
  return (
    <>
      <ComponentDoc
        id="badge"
        title="Badge"
        description="Statuses, counts, and labels. pill with a 1px inset ring; three sizes."
        code={BADGE_CODE}
        dos={[
          "Use semantic variants (success/warning/danger) only for actual state.",
          "Keep labels to 1–2 words.",
          "Use size sm in tables and dense lists; md/lg in headers and cards.",
        ]}
        donts={[
          "Don't make badges interactive — use a small Button instead.",
          "Don't mix badge sizes within the same list or table column.",
          "Don't use color alone to convey meaning; include a label or icon.",
        ]}
      >
        <Row label="Variants">
          <Badge variant="default">Primary</Badge>
          <Badge variant="secondary">Secondary</Badge>
          <Badge variant="success">Success</Badge>
          <Badge variant="warning">Warning</Badge>
          <Badge variant="danger">Danger</Badge>
          <Badge variant="outline">Outline</Badge>
        </Row>
        <Row label="Sizes">
          <Badge size="sm">Small</Badge>
          <Badge size="md">Medium</Badge>
          <Badge size="lg">Large</Badge>
        </Row>
        <Row label="With icons">
          <Badge variant="success"><RiCheckboxCircleLine className="size-3 mr-1" />Completed</Badge>
          <Badge variant="warning"><RiAlertLine className="size-3 mr-1" />Pending</Badge>
          <Badge variant="danger"><RiCloseCircleLine className="size-3 mr-1" />Failed</Badge>
          <Badge variant="default"><RiSparklingLine className="size-3 mr-1" />AI</Badge>
        </Row>
      </ComponentDoc>

      <ComponentDoc
        id="avatar"
        title="Avatar"
        description="People and account identity. circular, subtle inset contrast ring, optional online indicator."
        code={AVATAR_CODE}
        dos={[
          "Use initials (2 characters) when no image is available.",
          "Use the online dot only where presence is meaningful.",
          "Keep a consistent size per context: sm in lists, md in headers.",
        ]}
        donts={[
          "Don't use avatars for non-person entities — use a Featured icon.",
          "Don't stack more than 5 avatars; collapse to a +N counter.",
        ]}
      >
        <Row label="Sizes">
          <Avatar initials="IH" size="sm" />
          <Avatar initials="IH" size="md" />
          <Avatar initials="IH" size="lg" />
        </Row>
        <Row label="Online indicator">
          <Avatar initials="IH" size="sm" online />
          <Avatar initials="IH" size="md" online />
          <Avatar initials="IH" size="lg" online />
        </Row>
      </ComponentDoc>

      <ComponentDoc
        id="table"
        title="Table"
        description="Tabular data. card-wrapped (rounded-xl, shadow-xs), gray header band, 1px row dividers, hover tint. Composes a selection column (Checkbox), SortableTableHead, and a row-actions menu — try sorting and selecting below."
        code={TABLE_CODE}
        dos={[
          "Right-align numeric columns and use tabular-nums.",
          "Put the selection checkbox in a fixed w-10 leading column; mark rows data-state=\"selected\".",
          "Sort only the columns that benefit; show direction with SortableTableHead.",
          "Tuck row actions into a trailing ghost icon + DropdownMenu.",
        ]}
        donts={[
          "Don't add vertical column borders or mix row heights.",
          "Don't make every header sortable — only the meaningful ones.",
          "Don't expose destructive row actions inline; keep them in the menu.",
        ]}
      >
        <TableDemo />
      </ComponentDoc>

      <ComponentDoc
        id="metric-card"
        title="Metric card"
        description="Metric pattern (chart-less): label, large value, delta badge, optional hint."
        code={METRIC_CODE}
        dos={["Keep one metric per card.", "Use the delta badge direction for trend, not judgement."]}
        donts={["Don't pack secondary stats into the hint line.", "Don't use red/green deltas when direction isn't good/bad."]}
      >
        <div className="grid sm:grid-cols-3 gap-4">
          <MetricCard label="Total revenue" value="$2.4M" delta={{ value: "12%", direction: "up" }} hint="Last 30 days" icon={<RiLineChartLine />} />
          <MetricCard label="Active customers" value="48,210" delta={{ value: "3.2%", direction: "up" }} hint="Last 30 days" icon={<RiUserLine />} />
          <MetricCard label="Churn rate" value="1.8%" delta={{ value: "0.4pt", direction: "down" }} hint="Last 30 days" icon={<RiErrorWarningLine />} />
        </div>
      </ComponentDoc>

      <ComponentDoc
        id="empty-state"
        title="Empty state"
        description="centered featured icon, title, supporting text, optional actions."
        code={EMPTY_CODE}
        dos={["Say what's empty and how to fill it.", "Offer the primary creation action when relevant."]}
        donts={["Don't blame the user (\"You haven't…\") — keep it neutral.", "Don't show empty states while content is still loading — use Skeleton."]}
      >
        <div className="rounded-xl border border-dashed border-border">
          <EmptyState
            icon={<RiSearchLine />}
            title="No segments found"
            description="Your search didn't match any segments. Try different keywords or create a new one."
          >
            <Button variant="outline">Clear search</Button>
            <Button><RiAddLine />New segment</Button>
          </EmptyState>
        </div>
      </ComponentDoc>

      <ComponentDoc
        id="featured-icon"
        title="Featured icon"
        description="tinted square housing an icon. Anchors empty states, dialogs, and alerts."
        code={FEATURED_ICON_CODE}
        dos={["Match the color to the message intent (error dialog → error).", "Use lg in empty states, md in dialogs, sm inline."]}
        donts={["Don't use it as a button — it's decorative.", "Don't mix multiple featured icons in one surface."]}
      >
        <Row label="Colors">
          <FeaturedIcon color="brand"><RiDatabase2Line /></FeaturedIcon>
          <FeaturedIcon color="gray"><RiDatabase2Line /></FeaturedIcon>
          <FeaturedIcon color="success"><RiCheckboxCircleLine /></FeaturedIcon>
          <FeaturedIcon color="warning"><RiAlertLine /></FeaturedIcon>
          <FeaturedIcon color="error"><RiCloseCircleLine /></FeaturedIcon>
        </Row>
        <Row label="Sizes">
          <FeaturedIcon size="sm"><RiDatabase2Line /></FeaturedIcon>
          <FeaturedIcon size="md"><RiDatabase2Line /></FeaturedIcon>
          <FeaturedIcon size="lg"><RiDatabase2Line /></FeaturedIcon>
        </Row>
      </ComponentDoc>

      <ComponentDoc
        id="card"
        title="Card"
        description="Container for a single entity or grouped content (shadcn Card base). CardHeader carries the card-header anatomy — icon, title, supporting text, badge, actions, optional divider — over CardContent and an optional CardFooter."
        code={CARD_CODE}
        dos={[
          "Use one card per entity; keep the header to title + one supporting line.",
          "Put the divider under the header only when the body is visually dense.",
          "Keep footer actions low-emphasis (ghost/outline).",
        ]}
        donts={[
          "Don't nest cards inside cards — flatten or use sections.",
          "Don't overload the header with more than one or two actions.",
        ]}
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Card>
            <CardHeader
              icon={<RiDatabase2Line />}
              title="Snowflake"
              description="Connected · synced 2 min ago"
              badge={<Badge variant="success">Active</Badge>}
              actions={<Button variant="outline" size="sm">Manage</Button>}
              divider
            />
            <CardContent className="pt-5 text-sm text-muted-foreground">12 tables · 4.2M rows indexed.</CardContent>
            <CardFooter><Button variant="ghost" size="sm">View schema</Button></CardFooter>
          </Card>
          <Card>
            <CardHeader title="Loyalty Gold" description="Top-spending repeat customers." badge={<Badge>Segment</Badge>} />
            <CardContent className="text-sm text-muted-foreground">4,821 members · 38% revenue share.</CardContent>
          </Card>
        </div>
      </ComponentDoc>

      <ComponentDoc
        id="activity-feed"
        title="Activity feed"
        description="A vertical timeline of events: connector line, icon dot, and title/description/time. Built shadcn-style (no avatar, per spec)."
        code={ACTIVITY_CODE}
        dos={[
          "Lead each item with a strong verb and the affected object.",
          "Use relative timestamps (2h ago) and keep them subtle.",
          "Pick icons that signal the event type (created, edited, synced).",
        ]}
        donts={[
          "Don't write paragraphs per item — link to detail instead.",
          "Don't mix unrelated event streams in one feed.",
        ]}
      >
        <div className="max-w-md rounded-xl border border-border bg-card p-5">
          <ActivityFeed
            items={[
              { id: "1", icon: <RiAddLine />, title: <><span className="font-medium text-foreground">Loyalty Gold</span> created</>, time: "2h ago" },
              { id: "2", icon: <RiEditLine />, title: "Definition updated", description: "Lifetime spend is greater than $1,000.", time: "1d ago" },
              { id: "3", icon: <RiCheckboxCircleLine />, title: "Sync completed", description: "4,821 members matched.", time: "1d ago" },
              { id: "4", icon: <RiDatabase2Line />, title: "Connected to Snowflake", time: "3d ago" },
            ]}
          />
        </div>
      </ComponentDoc>

      <ComponentDoc
        id="code-snippet"
        title="Code snippet"
        description="A copyable code block with a filename/language bar. Dependency-free token styling; wrap a highlighter (Shiki/Prism) for real syntax colours and keep this chrome."
        code={CODE_SNIPPET_CODE}
        dos={[
          "Show the filename or language in the bar for context.",
          "Keep snippets short and focused on the relevant lines.",
        ]}
        donts={[
          "Don't paste huge files — link to the source instead.",
          "Don't rely on colour alone to convey meaning in code.",
        ]}
      >
        <CodeSnippet
          filename="segment.json"
          code={`{
  "name": "Loyalty Gold",
  "rules": [
    { "field": "lifetime_spend", "op": ">", "value": 1000 }
  ]
}`}
        />
      </ComponentDoc>
    </>
  );
}
