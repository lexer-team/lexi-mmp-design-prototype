import { useState } from "react";
import { ComponentDoc } from "./doc";
import { cn } from "@/lib/utils";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/Tabs";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { Pagination } from "@/components/ui/Pagination";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { Stepper } from "@/components/ui/Stepper";
import { TreeView } from "@/components/ui/TreeView";
import {
  RiHome5Line, RiAddLine, RiMessage2Line, RiDatabase2Line, RiBrainLine,
  RiMoreLine, RiArrowUpDownLine, RiSidebarFoldLine, RiSidebarUnfoldLine,
  RiFolderLine, RiFileTextLine, RiPriceTag3Line,
} from "@remixicon/react";

const TABS_CODE = `import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/Tabs";

// variants: underline (default) | segmented · TabsTrigger takes an optional count
<Tabs defaultValue="overview">
  <TabsList variant="underline">
    <TabsTrigger value="overview">Overview</TabsTrigger>
    <TabsTrigger value="members" count={4821}>Members</TabsTrigger>
    <TabsTrigger value="activity" count={3}>Activity</TabsTrigger>
  </TabsList>
  <TabsContent value="overview">…</TabsContent>
</Tabs>`;

const BREADCRUMBS_CODE = `import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { RiHome5Line } from "@remixicon/react";

// divider: "chevron" (default) | "slash" · crumbs may carry a leading icon
<Breadcrumbs items={[
  { label: "Home", icon: <RiHome5Line />, onClick: goHome },
  { label: "Segments", onClick: goToSegments },
  { label: "Loyalty Gold" },
]} />`;

const SIDEBAR_CODE = `// Prod: src/components/layout/Sidebar.tsx
// Mirrors shadcn Sidebar variant="inset" collapsible="icon":
//  - p-2 outer padding so the inner container floats (inset look)
//  - collapses to a 3rem icon rail; no border — depth from the card shadow
//  - structure: logo → primary nav → labelled section → user footer
// Item anatomy: 6px rounded icon chip + semibold label, bg-sidebar-active when active.`;

const PAGINATION_CODE = `import { Pagination } from "@/components/ui/Pagination";

<Pagination page={page} totalPages={12} onPageChange={setPage} />`;

const STEPPER_CODE = `import { Stepper } from "@/components/ui/Stepper";

// orientation: horizontal (default) | vertical · current = zero-based active index
<Stepper
  current={1}
  steps={[
    { label: "Source", description: "Pick data" },
    { label: "Rules", description: "Define segment" },
    { label: "Review", description: "Confirm" },
  ]}
/>`;

const TREEVIEW_CODE = `import { TreeView } from "@/components/ui/TreeView";

<TreeView
  defaultExpanded={["customers"]}
  selectedId={selected}
  onSelect={setSelected}
  nodes={[
    { id: "customers", label: "Customers", icon: <RiFolderLine />, children: [
      { id: "loyalty", label: "Loyalty Gold", icon: <RiPriceTag3Line /> },
    ]},
  ]}
/>`;

const TREE_NODES = [
  {
    id: "customers",
    label: "Customers",
    icon: <RiFolderLine />,
    children: [
      { id: "loyalty", label: "Loyalty Gold", icon: <RiPriceTag3Line /> },
      { id: "churn", label: "Churn risk", icon: <RiPriceTag3Line /> },
    ],
  },
  {
    id: "products",
    label: "Products",
    icon: <RiFolderLine />,
    children: [
      { id: "apparel", label: "Apparel", icon: <RiPriceTag3Line /> },
      {
        id: "home",
        label: "Home & living",
        icon: <RiFolderLine />,
        children: [{ id: "kitchen", label: "Kitchen", icon: <RiPriceTag3Line /> }],
      },
    ],
  },
  { id: "readme", label: "definitions.md", icon: <RiFileTextLine /> },
];

const STEPPER_STEPS = [
  { label: "Source", description: "Pick data" },
  { label: "Rules", description: "Define segment" },
  { label: "Review", description: "Confirm" },
];

function StepperDemo() {
  const [current, setCurrent] = useState(1);
  return (
    <div className="flex flex-col gap-6">
      <Stepper current={current} steps={STEPPER_STEPS} />
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" disabled={current <= 0} onClick={() => setCurrent((c) => c - 1)}>Back</Button>
        <Button size="sm" disabled={current >= STEPPER_STEPS.length - 1} onClick={() => setCurrent((c) => c + 1)}>Next</Button>
      </div>
      <div className="max-w-xs border-t border-border pt-6">
        <Stepper orientation="vertical" current={current} steps={STEPPER_STEPS} />
      </div>
    </div>
  );
}

function TreeDemo() {
  const [selected, setSelected] = useState("loyalty");
  return (
    <div className="max-w-xs rounded-xl border border-border bg-card p-2">
      <TreeView nodes={TREE_NODES} defaultExpanded={["customers", "products"]} selectedId={selected} onSelect={setSelected} />
    </div>
  );
}

/* Interactive replica of the prod sidebar: click to navigate, toggle to collapse
   to the icon rail. The inset content card widens as the rail collapses. */
const SIDEBAR_ITEMS = [
  { id: "new-chat", icon: <RiAddLine className="size-4" />, label: "New chat", main: true },
  { id: "chats", icon: <RiMessage2Line className="size-4" />, label: "Chats" },
  { id: "data", icon: <RiDatabase2Line className="size-4" />, label: "Data" },
  { id: "knowledge", icon: <RiBrainLine className="size-4" />, label: "Knowledge" },
];
const SIDEBAR_RECENT = ["Best customers Q2", "Lapsed VIPs", "Email engagement"];

function SidebarPreview() {
  const [collapsed, setCollapsed] = useState(false);
  const [active, setActive] = useState("chats");
  const activeLabel = SIDEBAR_ITEMS.find((i) => i.id === active)?.label ?? active;

  return (
    <div className="flex h-[420px] w-full overflow-hidden rounded-lg bg-sidebar">
      {/* Sidebar rail */}
      <div
        className={cn(
          "flex shrink-0 flex-col overflow-hidden transition-[width] duration-200 ease-linear",
          collapsed ? "w-16" : "w-64",
        )}
      >
        {/* Header: logo + collapse toggle */}
        <div className={cn("flex items-center gap-2 p-3", collapsed && "justify-center px-0")}>
          {!collapsed && (
            <>
              <div className="size-6 rounded-md bg-sidebar-primary" />
              <span className="flex-1 text-sm font-semibold text-sidebar-foreground">Lexer</span>
            </>
          )}
          <button
            onClick={() => setCollapsed((c) => !c)}
            title={collapsed ? "Expand" : "Collapse"}
            className="flex size-7 items-center justify-center rounded-md text-sidebar-foreground/60 transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground"
          >
            {collapsed ? <RiSidebarUnfoldLine className="size-4" /> : <RiSidebarFoldLine className="size-4" />}
          </button>
        </div>

        {/* Content */}
        <div className="flex flex-1 flex-col gap-4 overflow-hidden px-2 py-2">
          <ul className="flex flex-col gap-0.5">
            {SIDEBAR_ITEMS.map((it) => (
              <li key={it.id} title={collapsed ? it.label : undefined}>
                <button
                  onClick={() => setActive(it.id)}
                  className={cn(
                    "flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-sm font-semibold text-sidebar-foreground transition-colors hover:bg-sidebar-accent",
                    active === it.id && "bg-sidebar-active text-sidebar-active-foreground hover:bg-sidebar-active",
                    collapsed && "mx-auto size-9 justify-center px-0",
                  )}
                >
                  <div
                    className={cn(
                      "flex size-6 items-center justify-center rounded-full shrink-0",
                      it.main && "bg-sidebar-primary text-sidebar-primary-foreground",
                    )}
                  >
                    {it.icon}
                  </div>
                  {!collapsed && <span className="flex-1 truncate text-left">{it.label}</span>}
                </button>
              </li>
            ))}
          </ul>

          {!collapsed && (
            <div className="flex flex-col gap-1">
              <p className="px-2 text-xs font-medium text-sidebar-foreground/50">Recent chats</p>
              {SIDEBAR_RECENT.map((c) => (
                <button
                  key={c}
                  onClick={() => setActive(c)}
                  className={cn(
                    "group flex items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm text-sidebar-foreground transition-colors hover:bg-sidebar-accent",
                    active === c && "bg-sidebar-accent",
                  )}
                >
                  <span className="flex-1 truncate">{c}</span>
                  <RiMoreLine className="size-3.5 shrink-0 opacity-0 group-hover:opacity-40" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Footer: user */}
        <div className="border-t border-sidebar-border p-2">
          {collapsed ? (
            <div className="flex justify-center py-0.5">
              <Avatar initials="IH" size="sm" />
            </div>
          ) : (
            <button className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left transition-colors hover:bg-sidebar-accent">
              <Avatar initials="IH" size="sm" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-semibold text-sidebar-foreground">Izac</p>
                <p className="truncate text-xs text-sidebar-foreground/50">Lexer</p>
              </div>
              <RiArrowUpDownLine className="size-3.5 shrink-0 text-sidebar-foreground/30" />
            </button>
          )}
        </div>
      </div>

      {/* Inset content card — widens as the rail collapses */}
      <div className="m-2 ml-0 flex flex-1 flex-col overflow-hidden rounded-xl border border-border/60 bg-background shadow-sm">
        <div className="flex h-10 shrink-0 items-center border-b border-border px-4 text-sm font-medium text-foreground">
          {activeLabel}
        </div>
        <div className="flex flex-1 items-center justify-center text-xs text-muted-foreground">
          Main content
        </div>
      </div>
    </div>
  );
}

export function NavigationSections() {
  const [page, setPage] = useState(3);
  return (
    <>
      <ComponentDoc
        id="tabs"
        title="Tabs"
        description="Section switching (Radix). Two styles: underline (page level) and segmented (within cards/toolbars). TabsTrigger takes an optional count pill that tints when active."
        code={TABS_CODE}
        dos={[
          "Use underline tabs at page level, segmented inside cards.",
          "Use count pills to surface how much sits behind each tab.",
          "Keep labels to one or two words.",
        ]}
        donts={[
          "Don't use tabs for sequential steps — use Progress steps.",
          "Don't exceed ~6 tabs; regroup the content instead.",
        ]}
      >
        <div className="flex flex-col gap-6">
          <Tabs defaultValue="overview">
            <TabsList variant="underline">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="members" count={4821}>Members</TabsTrigger>
              <TabsTrigger value="activity" count={3}>Activity</TabsTrigger>
            </TabsList>
            <TabsContent value="overview" className="pt-3 text-sm text-muted-foreground">Underline style — page-level sections.</TabsContent>
            <TabsContent value="members" className="pt-3 text-sm text-muted-foreground">4,821 members.</TabsContent>
            <TabsContent value="activity" className="pt-3 text-sm text-muted-foreground">3 recent events.</TabsContent>
          </Tabs>
          <Tabs defaultValue="7d">
            <TabsList variant="segmented">
              <TabsTrigger value="7d">7d</TabsTrigger>
              <TabsTrigger value="30d">30d</TabsTrigger>
              <TabsTrigger value="90d">90d</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </ComponentDoc>

      <ComponentDoc
        id="breadcrumbs"
        title="Breadcrumbs"
        description="Location trail. sm/medium gray links, semibold current page. Divider is chevron (default) or slash; the root crumb can carry a leading icon."
        code={BREADCRUMBS_CODE}
        dos={[
          "Show the full path from the section root.",
          "Make every item except the last clickable.",
          "Use a home icon on the root when the trail starts at the app root.",
        ]}
        donts={[
          "Don't use breadcrumbs as primary navigation.",
          "Don't truncate to a single item — collapse the middle instead.",
        ]}
      >
        <div className="flex flex-col gap-3">
          <Breadcrumbs
            items={[
              { label: "Home", icon: <RiHome5Line />, onClick: () => {} },
              { label: "Segments", onClick: () => {} },
              { label: "Loyalty Gold" },
            ]}
          />
          <Breadcrumbs
            divider="slash"
            items={[
              { label: "Data", onClick: () => {} },
              { label: "Segments", onClick: () => {} },
              { label: "Loyalty Gold" },
            ]}
          />
        </div>
      </ComponentDoc>

      <ComponentDoc
        id="sidebar"
        title="Sidebar navigation"
        description="The app's primary navigation (src/components/layout/Sidebar.tsx). Mirrors shadcn Sidebar variant='inset' collapsible='icon': the rail floats, collapses to an icon strip, no border (depth from the inset card shadow). Click items to navigate and use the fold toggle to collapse — the inset content widens to match."
        code={SIDEBAR_CODE}
        dos={[
          "Keep primary destinations in the top group; label secondary groups.",
          "Show the active item with bg-sidebar-active; keep one active at a time.",
          "Pin account/workspace switching in the footer.",
        ]}
        donts={[
          "Don't add a visible divider between sidebar and content — depth comes from the card shadow.",
          "Don't nest more than two levels; deep trees belong in a Tree view.",
          "Don't hide the only way to reach a core area behind the collapsed rail without a tooltip.",
        ]}
      >
        <SidebarPreview />
      </ComponentDoc>

      <ComponentDoc
        id="progress-steps"
        title="Progress steps"
        description="A stepper for sequential, multi-step flows (wizards, onboarding). Horizontal or vertical, with complete / current / upcoming states. Use the buttons to step through."
        code={STEPPER_CODE}
        dos={[
          "Use for ordered, must-complete-in-sequence flows.",
          "Show completion with the check state so progress is legible.",
          "Use vertical when each step needs a description or sits in a narrow column.",
        ]}
        donts={[
          "Don't use steppers for parallel views — those are Tabs.",
          "Don't exceed ~5 steps; group sub-tasks within a step instead.",
        ]}
      >
        <StepperDemo />
      </ComponentDoc>

      <ComponentDoc
        id="tree-view"
        title="Tree view"
        description="Hierarchical navigation with expand/collapse and single selection. Built shadcn-style; pass nested nodes with optional icons. Click rows to expand or select."
        code={TREEVIEW_CODE}
        dos={[
          "Use for nested structures: folders, taxonomies, nested segments.",
          "Pre-expand the path to the current selection.",
          "Pair folder/leaf icons to signal which rows expand.",
        ]}
        donts={[
          "Don't use a tree for flat lists — a list or nav is clearer.",
          "Don't nest beyond ~3–4 levels; deep trees get hard to scan.",
        ]}
      >
        <TreeDemo />
      </ComponentDoc>

      <ComponentDoc
        id="pagination"
        title="Pagination"
        description="Page navigation for tables and lists. outline prev/next at the edges, minimal centered page numbers."
        code={PAGINATION_CODE}
        dos={["Keep the current page visually distinct.", "Preserve scroll position contextually when changing pages."]}
        donts={["Don't paginate fewer than ~25 items — show them all.", "Don't combine with infinite scroll."]}
      >
        <Pagination page={page} totalPages={12} onPageChange={setPage} />
      </ComponentDoc>
    </>
  );
}
