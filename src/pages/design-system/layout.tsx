import { useState } from "react";
import { ComponentDoc } from "./doc";
import { cn } from "@/lib/utils";
import { Page, PageHeader } from "@/components/layout/Page";
import { Section, SectionHeader, SectionFooter } from "@/components/layout/Section";
import { Grid } from "@/components/layout/Grid";
import { Panel, Pane, PanelHeader, PanelBody } from "@/components/layout/Panel";
import { SplitView } from "@/components/layout/SplitView";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Input, Field } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Switch } from "@/components/ui/Switch";
import { MetricCard } from "@/components/ui/MetricCard";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { Pagination } from "@/components/ui/Pagination";
import {
  Table, TableHeader, TableBody, TableRow, TableHead, TableCell,
} from "@/components/ui/Table";
import {
  RiSearchLine, RiAddLine, RiFilter3Line, RiMoreLine, RiEditLine, RiArrowLeftLine,
  RiUser3Line, RiNotification3Line, RiTeamLine, RiBankCard2Line, RiSettings3Line,
} from "@remixicon/react";

/* ── Preview frame: simulates the inset main card on the sidebar backdrop, so
   each recipe reads the way it would inside AppShell. ───────────────────── */
function Frame({
  title,
  header,
  children,
  scroll = true,
  className,
}: {
  title?: string;
  /** override the header-bar content (e.g. breadcrumbs) */
  header?: React.ReactNode;
  children: React.ReactNode;
  scroll?: boolean;
  className?: string;
}) {
  return (
    <div className={cn("overflow-hidden rounded-lg bg-sidebar p-2 h-[480px]", className)}>
      <div className="flex h-full flex-col overflow-hidden rounded-xl border border-border/60 bg-background shadow-sm">
        <div className="flex h-12 shrink-0 items-center gap-2 border-b border-border px-4">
          {header ?? <span className="flex-1 truncate text-sm font-medium text-foreground">{title}</span>}
        </div>
        <div className={cn("min-h-0 flex-1", scroll ? "overflow-y-auto" : "overflow-hidden")}>
          {children}
        </div>
      </div>
    </div>
  );
}

/* ── Mock data ───────────────────────────────────────────────────────────── */
const SEGMENTS = [
  { name: "Loyalty Gold", members: "4,821", share: "38%", status: "Active" as const },
  { name: "Lapsed high-value", members: "1,204", share: "12%", status: "Active" as const },
  { name: "New this quarter", members: "8,930", share: "9%", status: "Draft" as const },
  { name: "Email engaged", members: "12,540", share: "21%", status: "Active" as const },
  { name: "Cart abandoners", members: "3,117", share: "6%", status: "Paused" as const },
];

const statusVariant = { Active: "success", Draft: "secondary", Paused: "warning" } as const;

/* ── 1. List page ────────────────────────────────────────────────────────── */
function ListPagePreview() {
  const [page, setPage] = useState(1);
  return (
    <Frame title="Segments">
      <Page width="full">
        <PageHeader
          title="Segments"
          description="Audience groups built from attributes and behaviours."
          actions={
            <>
              <Button variant="outline" size="sm"><RiFilter3Line />Filter</Button>
              <Button size="sm"><RiAddLine />New segment</Button>
            </>
          }
        />
        <div className="flex items-center gap-3">
          <div className="relative max-w-xs flex-1">
            <RiSearchLine className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Search segments" className="h-9 pl-9" />
          </div>
          <span className="ml-auto text-sm text-muted-foreground tabular-nums">{SEGMENTS.length} segments</span>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Members</TableHead>
              <TableHead>Revenue share</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {SEGMENTS.map((s) => (
              <TableRow key={s.name}>
                <TableCell className="font-medium text-foreground">{s.name}</TableCell>
                <TableCell className="tabular-nums">{s.members}</TableCell>
                <TableCell className="tabular-nums">{s.share}</TableCell>
                <TableCell><Badge variant={statusVariant[s.status]}>{s.status}</Badge></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <Pagination page={page} totalPages={8} onPageChange={setPage} />
      </Page>
    </Frame>
  );
}

const LIST_CODE = `<Page width="full">
  <PageHeader
    title="Segments"
    description="Audience groups built from attributes and behaviours."
    actions={
      <>
        <Button variant="outline" size="sm"><RiFilter3Line />Filter</Button>
        <Button size="sm"><RiAddLine />New segment</Button>
      </>
    }
  />

  {/* Toolbar: search + result count */}
  <div className="flex items-center gap-3">
    <div className="relative max-w-xs flex-1">
      <RiSearchLine className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
      <Input placeholder="Search segments" className="h-9 pl-9" />
    </div>
    <span className="ml-auto text-sm text-muted-foreground">12 segments</span>
  </div>

  <Table>{/* … */}</Table>
  <Pagination page={page} totalPages={8} onPageChange={setPage} />
</Page>`;

/* ── 2. Detail page (standalone) ─────────────────────────────────────────── */
function DetailPagePreview() {
  return (
    <Frame
      header={<Breadcrumbs items={[{ label: "Segments", href: "#" }, { label: "Loyalty Gold" }]} />}
    >
      <Page width="default">
        <PageHeader
          title="Loyalty Gold"
          description="Top-spending repeat customers over the last 12 months."
          actions={
            <>
              <Button variant="outline" size="sm"><RiEditLine />Edit</Button>
              <Button variant="outline" size="icon-sm"><RiMoreLine /></Button>
            </>
          }
        />
        <Section title="Overview">
          <Grid cols={3} gap="md">
            <MetricCard label="Members" value="4,821" delta={{ value: "12%", direction: "up" }} />
            <MetricCard label="Revenue share" value="38%" delta={{ value: "3%", direction: "up" }} />
            <MetricCard label="Avg. order value" value="$184" delta={{ value: "2%", direction: "down" }} />
          </Grid>
        </Section>
        <Section title="Definition" description="Rules every member of this segment matches.">
          <Panel>
            <PanelBody className="flex flex-col gap-3">
              {[
                ["Lifetime spend", "is greater than $1,000"],
                ["Orders", "at least 5 in the last 12 months"],
                ["Last seen", "within 90 days"],
              ].map(([k, v]) => (
                <div key={k} className="flex items-center justify-between gap-4 text-sm">
                  <span className="font-medium text-foreground">{k}</span>
                  <span className="text-muted-foreground">{v}</span>
                </div>
              ))}
            </PanelBody>
          </Panel>
        </Section>
      </Page>
    </Frame>
  );
}

const DETAIL_CODE = `{/* Breadcrumb lives in the panel / app header bar, not the page header */}
<PanelHeader>
  <Breadcrumbs items={[{ label: "Segments", href: "#" }, { label: "Loyalty Gold" }]} />
</PanelHeader>

<Page width="default">
  <PageHeader
    title="Loyalty Gold"
    description="Top-spending repeat customers over the last 12 months."
    actions={
      <>
        <Button variant="outline" size="sm"><RiEditLine />Edit</Button>
        <Button variant="outline" size="icon-sm"><RiMoreLine /></Button>
      </>
    }
  />

  <Section title="Overview">
    <Grid cols={3}>
      <MetricCard label="Members" value="4,821" delta={{ value: "12%", direction: "up" }} />
      {/* … */}
    </Grid>
  </Section>

  <Section title="Definition" description="Rules every member matches.">
    <Panel><PanelBody>{/* rules */}</PanelBody></Panel>
  </Section>
</Page>`;

/* ── 3. List + detail (split view) ───────────────────────────────────────── */
function SplitViewPreview() {
  const [selected, setSelected] = useState(SEGMENTS[0].name);
  const active = SEGMENTS.find((s) => s.name === selected)!;
  return (
    <Frame title="Data" scroll={false}>
      <SplitView
        initialListWidth={240}
        minListWidth={200}
        maxListWidth={320}
        list={
          <Pane>
            <PanelHeader title="Segments" actions={<Button variant="ghost" size="icon-sm"><RiAddLine /></Button>} />
            <PanelBody padded={false}>
              <ul className="flex flex-col p-2">
                {SEGMENTS.map((s) => (
                  <li key={s.name}>
                    <button
                      onClick={() => setSelected(s.name)}
                      className={cn(
                        "flex w-full flex-col gap-0.5 rounded-lg px-3 py-2 text-left transition-colors",
                        s.name === selected ? "bg-accent" : "hover:bg-accent/50",
                      )}
                    >
                      <span className="text-sm font-medium text-foreground">{s.name}</span>
                      <span className="text-xs text-muted-foreground tabular-nums">{s.members} members</span>
                    </button>
                  </li>
                ))}
              </ul>
            </PanelBody>
          </Pane>
        }
        detail={
          <Pane>
            <PanelHeader
              title={active.name}
              actions={<Button variant="outline" size="sm"><RiEditLine />Edit</Button>}
            />
            <PanelBody className="flex flex-col gap-4">
              <Grid cols={2} gap="md">
                <MetricCard label="Members" value={active.members} />
                <MetricCard label="Revenue share" value={active.share} />
              </Grid>
              <p className="text-sm text-muted-foreground">
                {active.name} is currently <Badge variant={statusVariant[active.status]}>{active.status}</Badge>.
              </p>
            </PanelBody>
          </Pane>
        }
      />
    </Frame>
  );
}

const SPLIT_CODE = `// Rule: sub-panes use Pane (flush), NOT Panel (inset card).
// Only the outermost surface is inset; the panes fill it, divided by the handle.
<SplitView
  initialListWidth={240}
  list={
    <Pane>
      <PanelHeader title="Segments" actions={<Button variant="ghost" size="icon-sm"><RiAddLine /></Button>} />
      <PanelBody padded={false}>
        {/* selectable list rows */}
      </PanelBody>
    </Pane>
  }
  detail={
    <Pane>
      <PanelHeader title={active.name} actions={<Button variant="outline" size="sm">Edit</Button>} />
      <PanelBody>{/* detail content */}</PanelBody>
    </Pane>
  }
/>`;

/* ── 4. Settings page ────────────────────────────────────────────────────── */
const SETTINGS_NAV = [
  { id: "general", label: "General", icon: RiSettings3Line },
  { id: "profile", label: "Profile", icon: RiUser3Line },
  { id: "notifications", label: "Notifications", icon: RiNotification3Line },
  { id: "members", label: "Members", icon: RiTeamLine },
  { id: "billing", label: "Billing", icon: RiBankCard2Line },
];

function SettingsPagePreview() {
  const [active, setActive] = useState("profile");
  return (
    <Frame title="Settings" scroll={false}>
      <div className="flex h-full flex-col">
        <div className="flex min-h-0 flex-1">
          <nav className="flex w-48 shrink-0 flex-col gap-0.5 border-r border-border bg-muted/30 p-3">
            {SETTINGS_NAV.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setActive(id)}
                className={cn(
                  "flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm transition-colors",
                  active === id ? "bg-accent font-medium text-accent-foreground" : "text-foreground hover:bg-accent/50",
                )}
              >
                <Icon className="size-4 shrink-0 text-muted-foreground" />
                {label}
              </button>
            ))}
          </nav>
          <div className="min-w-0 flex-1 overflow-y-auto">
            <Page width="default">
              <PageHeader title="Profile" description="How you appear across the workspace." />
              <Section title="Basics">
                <div className="flex flex-col gap-4">
                  <Field label="Full name"><Input defaultValue="Izac Ho" /></Field>
                  <Field label="Email" hint="Used for sign-in and notifications.">
                    <Input type="email" defaultValue="izac.ho@lexer.io" />
                  </Field>
                  <Field label="Bio"><Textarea placeholder="A short description" /></Field>
                </div>
              </Section>
              <Section title="Notifications">
                {[
                  ["Weekly summary", "A digest of segment changes every Monday."],
                  ["Mentions", "When a teammate @mentions you."],
                ].map(([label, desc], i) => (
                  <div key={label} className="flex items-center justify-between gap-4 py-1">
                    <div className="flex flex-col gap-0.5">
                      <span className="text-sm font-medium text-foreground">{label}</span>
                      <span className="text-xs text-muted-foreground">{desc}</span>
                    </div>
                    <Switch defaultChecked={i === 0} />
                  </div>
                ))}
              </Section>
            </Page>
          </div>
        </div>
        <div className="flex shrink-0 items-center justify-end gap-2 border-t border-border bg-background px-6 py-3">
          <Button variant="outline" size="sm">Cancel</Button>
          <Button size="sm">Save changes</Button>
        </div>
      </div>
    </Frame>
  );
}

const SETTINGS_CODE = `<div className="flex h-full flex-col">
  <div className="flex min-h-0 flex-1">
    {/* Section nav rail */}
    <nav className="w-48 shrink-0 border-r border-border bg-muted/30 p-3">
      {/* nav buttons */}
    </nav>

    {/* Scrollable form content */}
    <div className="min-w-0 flex-1 overflow-y-auto">
      <Page width="default">
        <PageHeader title="Profile" description="How you appear across the workspace." />
        <Section title="Basics">
          <Field label="Full name"><Input /></Field>
          <Field label="Email"><Input type="email" /></Field>
        </Section>
        <Section title="Notifications">{/* Switch rows */}</Section>
      </Page>
    </div>
  </div>

  {/* Sticky save footer */}
  <div className="flex shrink-0 items-center justify-end gap-2 border-t border-border px-6 py-3">
    <Button variant="outline" size="sm">Cancel</Button>
    <Button size="sm">Save changes</Button>
  </div>
</div>`;

const SECTION_HEADER_CODE = `import { SectionHeader } from "@/components/layout/Section";

<SectionHeader
  title="Members"
  description="People currently in this segment."
  badge={<Badge>4,821</Badge>}
  actions={<Button variant="outline" size="sm">Export</Button>}
/>`;

const SECTION_FOOTER_CODE = `import { SectionFooter } from "@/components/layout/Section";

<SectionFooter hint="Changes apply to new members only.">
  <Button variant="outline" size="sm">Cancel</Button>
  <Button size="sm">Save changes</Button>
</SectionFooter>`;

/* ── Export ──────────────────────────────────────────────────────────────── */
export function LayoutSections() {
  return (
    <>
      <ComponentDoc
        id="list-page"
        title="List page"
        description="The index screen: page header with a primary action, a search/filter toolbar, a table, and pagination — all inside one inset card. Built from Page, PageHeader, Table, and Pagination."
        code={LIST_CODE}
        dos={[
          "Put the single primary action (New …) top-right in the page header.",
          "Keep the toolbar to search plus a couple of filters; push counts to the right.",
          "Use width=\"full\" so wide tables breathe.",
        ]}
        donts={[
          "Don't stack two primary buttons in the header — secondary actions use outline.",
          "Don't nest the table in its own Panel; the card is the frame already.",
          "Don't paginate fewer than ~2 pages of rows — show all instead.",
        ]}
      >
        <ListPagePreview />
      </ComponentDoc>

      <ComponentDoc
        id="detail-page"
        title="Detail page"
        description="A single record on its own screen: breadcrumb in the panel header bar, then title + actions and stacked Sections. Grouped content sits in nested Panels. Built from Page, PageHeader, Section, Grid, Panel, and MetricCard."
        code={DETAIL_CODE}
        dos={[
          "Put breadcrumbs in the panel header bar so the user can climb back to the list.",
          "Open with an Overview row of metrics, then detail Sections.",
          "Use width=\"default\" to keep reading measure comfortable.",
        ]}
        donts={[
          "Don't hide the back path — always provide breadcrumbs or a back action.",
          "Don't put primary + destructive side by side; tuck destructive in the … menu.",
          "Don't let a detail page exceed one clear primary action.",
        ]}
      >
        <DetailPagePreview />
      </ComponentDoc>

      <ComponentDoc
        id="split-view"
        title="List + detail (split view)"
        description="Master list beside a detail pane, dividing the parent panel. Rule: sub-panes are flush (Pane), not inset cards — only the outermost surface is inset, and the panes fill it edge-to-edge, separated by the drag handle. Mirrors the real Data panel. Built from SplitView, Pane, and PanelHeader."
        code={SPLIT_CODE}
        dos={[
          "Use flush Panes for each side — they fill the parent panel, divided by the handle.",
          "Keep the list pane narrow (≈240–320px) and let detail take the rest.",
          "Persist selection — the detail pane always reflects the highlighted row.",
        ]}
        donts={[
          "Don't wrap split panes in their own inset Panel — only the outermost surface is inset.",
          "Don't use a split view on narrow screens; fall back to list → detail navigation.",
          "Don't let the list pane resize away to nothing — set sensible min/max widths.",
        ]}
      >
        <SplitViewPreview />
      </ComponentDoc>

      <ComponentDoc
        id="settings-page"
        title="Settings page"
        description="Section nav rail beside scrollable form Sections, with a sticky save footer pinned to the card. Built from a sub-nav rail, Page, PageHeader, Section, Field, and a footer action bar."
        code={SETTINGS_CODE}
        dos={[
          "Group fields into Sections with clear titles (Basics, Notifications…).",
          "Pin Save / Cancel in a sticky footer so they're always reachable.",
          "Use the Field anatomy (label + hint) for every control.",
        ]}
        donts={[
          "Don't scatter save buttons per section; one footer commits the page.",
          "Don't exceed one column of fields — settings read top-to-bottom.",
          "Don't omit Cancel; users need a way to discard edits.",
        ]}
      >
        <SettingsPagePreview />
      </ComponentDoc>

      <ComponentDoc
        id="section-header"
        title="Section header"
        description="Header for a content section: title + supporting text, optional badge next to the title and actions on the right, with an optional tabs row beneath. No divider — spacing carries the separation."
        code={SECTION_HEADER_CODE}
        dos={[
          "Pair a count badge with the title when the section lists items.",
          "Keep section actions secondary (outline/ghost) — the page action stays in PageHeader.",
          "Use the tabs slot to switch views within the section.",
        ]}
        donts={[
          "Don't add a divider under the title; let spacing group it with its content.",
          "Don't repeat the page title — section headers are a level down.",
        ]}
      >
        <div className="rounded-xl border border-border bg-card p-5">
          <SectionHeader
            title="Members"
            description="People currently in this segment."
            badge={<Badge>4,821</Badge>}
            actions={<Button variant="outline" size="sm">Export</Button>}
          />
        </div>
      </ComponentDoc>

      <ComponentDoc
        id="section-footer"
        title="Section footer"
        description="In-flow footer that closes a section or form: a top divider with optional helper text on the left and actions on the right. (For a footer pinned to the viewport, use the sticky pattern in the Settings template.)"
        code={SECTION_FOOTER_CODE}
        dos={[
          "Right-align the commit actions; keep at most one primary.",
          "Use the hint slot for a brief consequence or scope note.",
        ]}
        donts={[
          "Don't scatter multiple footers in one form — one commits the whole.",
          "Don't hide a destructive action here; confirm it in a dialog.",
        ]}
      >
        <div className="rounded-xl border border-border bg-card p-5">
          <p className="mb-4 text-sm text-muted-foreground">Form fields go here…</p>
          <SectionFooter hint="Changes apply to new members only.">
            <Button variant="outline" size="sm">Cancel</Button>
            <Button size="sm">Save changes</Button>
          </SectionFooter>
        </div>
      </ComponentDoc>
    </>
  );
}
