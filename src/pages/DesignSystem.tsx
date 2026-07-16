import { useEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { RiSearchLine, RiArrowRightSLine } from "@remixicon/react";
import { Input } from "@/components/ui/Input";
import { ActiveDocContext } from "./design-system/doc";
import { FoundationsSections } from "./design-system/foundations";
import { FormsSections } from "./design-system/forms";
import { ActionsSections } from "./design-system/actions";
import { DataSections } from "./design-system/data";
import { FeedbackSections } from "./design-system/feedback";
import { NavigationSections } from "./design-system/navigation";
import { PatternsSections } from "./design-system/patterns";
import { LayoutSections } from "./design-system/layout";
import { ChangelogSection } from "./design-system/changelog";

/* Catalogue-driven design system browser.
   Structure mirrors mature systems (Atlassian/Polaris/Primer): four layers —
   Foundations → Components → Patterns → Pages — with Components sub-grouped by
   function. Each leaf is its own single-component page (gated via ActiveDocContext),
   the tree categories collapse, and the search box filters leaves. */

type GroupKey =
  | "foundations" | "forms" | "actions" | "data" | "feedback"
  | "navigation" | "patterns" | "layout" | "changelog";

const GROUPS: Record<GroupKey, () => React.ReactNode> = {
  foundations: FoundationsSections,
  forms: FormsSections,
  actions: ActionsSections,
  data: DataSections,
  feedback: FeedbackSections,
  navigation: NavigationSections,
  patterns: PatternsSections,
  layout: LayoutSections,
  changelog: ChangelogSection,
};

interface Leaf { id: string; title: string; group: GroupKey }
interface Category { title?: string; leaves: Leaf[] }
interface Layer { title: string; categories: Category[] }

const LAYERS: Layer[] = [
  {
    title: "Foundations",
    categories: [{
      leaves: [
        { id: "colors", title: "Colors", group: "foundations" },
        { id: "typography", title: "Typography", group: "foundations" },
        { id: "shadows", title: "Shadows", group: "foundations" },
        { id: "radius", title: "Border radius", group: "foundations" },
        { id: "spacing", title: "Spacing", group: "foundations" },
      ],
    }],
  },
  {
    title: "Components",
    categories: [
      { title: "Forms", leaves: [
        { id: "input", title: "Input", group: "forms" },
        { id: "textarea", title: "Textarea", group: "forms" },
        { id: "select", title: "Select", group: "forms" },
        { id: "date-picker", title: "Date picker", group: "forms" },
        { id: "checkbox", title: "Checkbox", group: "forms" },
        { id: "radio", title: "Radio group", group: "forms" },
        { id: "toggle", title: "Toggle", group: "forms" },
        { id: "file-uploader", title: "File uploader", group: "forms" },
      ]},
      { title: "Actions", leaves: [
        { id: "button", title: "Button", group: "actions" },
        { id: "dropdown", title: "Dropdown menu", group: "actions" },
        { id: "command-menu", title: "Command menu", group: "actions" },
        { id: "filter-bar", title: "Filter bar", group: "actions" },
      ]},
      { title: "Data display", leaves: [
        { id: "badge", title: "Badge", group: "data" },
        { id: "avatar", title: "Avatar", group: "data" },
        { id: "table", title: "Table", group: "data" },
        { id: "card", title: "Card", group: "data" },
        { id: "metric-card", title: "Metric card", group: "data" },
        { id: "activity-feed", title: "Activity feed", group: "data" },
        { id: "code-snippet", title: "Code snippet", group: "data" },
        { id: "empty-state", title: "Empty state", group: "data" },
        { id: "featured-icon", title: "Featured icon", group: "data" },
      ]},
      { title: "Feedback", leaves: [
        { id: "alert", title: "Alert", group: "feedback" },
        { id: "skeleton", title: "Skeleton", group: "feedback" },
        { id: "toast", title: "Toast", group: "feedback" },
        { id: "tooltip", title: "Tooltip", group: "feedback" },
        { id: "dialog", title: "Dialog", group: "feedback" },
      ]},
      { title: "Navigation", leaves: [
        { id: "tabs", title: "Tabs", group: "navigation" },
        { id: "breadcrumbs", title: "Breadcrumbs", group: "navigation" },
        { id: "sidebar", title: "Sidebar navigation", group: "navigation" },
        { id: "progress-steps", title: "Progress steps", group: "navigation" },
        { id: "tree-view", title: "Tree view", group: "navigation" },
        { id: "pagination", title: "Pagination", group: "navigation" },
      ]},
      { title: "Layout", leaves: [
        { id: "section-header", title: "Section header", group: "layout" },
        { id: "section-footer", title: "Section footer", group: "layout" },
      ]},
    ],
  },
  {
    title: "Patterns",
    categories: [{
      leaves: [
        { id: "card-anatomy", title: "Card anatomy", group: "patterns" },
        { id: "chat-input", title: "Chat input", group: "patterns" },
        { id: "artifacts", title: "Artifact cards", group: "patterns" },
        { id: "modal", title: "Modal patterns", group: "feedback" },
      ],
    }],
  },
  {
    title: "Pages",
    categories: [{
      leaves: [
        { id: "list-page", title: "List page", group: "layout" },
        { id: "detail-page", title: "Detail page", group: "layout" },
        { id: "split-view", title: "List + detail", group: "layout" },
        { id: "settings-page", title: "Settings page", group: "layout" },
      ],
    }],
  },
  {
    title: "Changelog",
    categories: [{ leaves: [{ id: "changelog", title: "Changelog", group: "changelog" }] }],
  },
];

export function DesignSystem() {
  const [selectedId, setSelectedId] = useState("colors");
  const [query, setQuery] = useState("");
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const mainRef = useRef<HTMLDivElement>(null);

  const index = useMemo(() => {
    const m = new Map<string, { group: GroupKey; layer: string; category?: string }>();
    for (const layer of LAYERS)
      for (const cat of layer.categories)
        for (const leaf of cat.leaves)
          m.set(leaf.id, { group: leaf.group, layer: layer.title, category: cat.title });
    return m;
  }, []);

  const current = index.get(selectedId)!;
  const GroupComp = GROUPS[current.group];

  // reset scroll when the selected component changes
  useEffect(() => {
    mainRef.current?.scrollTo({ top: 0 });
  }, [selectedId]);

  const q = query.trim().toLowerCase();
  const matches = (l: Leaf) => !q || l.title.toLowerCase().includes(q);

  function toggle(key: string) {
    setCollapsed((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  }

  const anyResults = LAYERS.some((layer) => layer.categories.some((c) => c.leaves.some(matches)));

  function LeafButton({ leaf, indent }: { leaf: Leaf; indent: boolean }) {
    return (
      <button
        onClick={() => setSelectedId(leaf.id)}
        className={cn(
          "w-full rounded-lg py-1.5 pr-2 text-left text-sm transition-colors",
          indent ? "pl-7" : "pl-2",
          "focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ring/40",
          selectedId === leaf.id
            ? "bg-sidebar-active font-medium text-sidebar-active-foreground"
            : "text-sidebar-foreground hover:bg-sidebar-accent",
        )}
      >
        {leaf.title}
      </button>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Side navigation */}
      <aside className="flex w-64 shrink-0 flex-col border-r border-border bg-sidebar">
        <div className="p-4 pb-3">
          <h1 className="text-sm font-semibold text-foreground">Lexer Design System</h1>
          <div className="relative mt-3">
            <RiSearchLine className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search components"
              className="h-9 pl-9"
            />
          </div>
        </div>

        <nav className="flex flex-1 flex-col gap-5 overflow-y-auto px-3 pb-6">
          {!anyResults && <p className="px-2 text-sm text-muted-foreground">No components match “{query}”.</p>}
          {LAYERS.map((layer) => {
            const visibleCats = layer.categories
              .map((c) => ({ ...c, leaves: c.leaves.filter(matches) }))
              .filter((c) => c.leaves.length > 0);
            if (visibleCats.length === 0) return null;
            return (
              <div key={layer.title} className="flex flex-col gap-1">
                <p className="px-2 text-xs font-semibold text-foreground">{layer.title}</p>
                {visibleCats.map((cat) => {
                  if (!cat.title) {
                    return (
                      <ul key="_" className="flex flex-col gap-0.5">
                        {cat.leaves.map((leaf) => (
                          <li key={leaf.id}><LeafButton leaf={leaf} indent={false} /></li>
                        ))}
                      </ul>
                    );
                  }
                  const key = `${layer.title}/${cat.title}`;
                  const isCollapsed = collapsed.has(key) && !q;
                  return (
                    <div key={key} className="flex flex-col gap-0.5">
                      <button
                        onClick={() => toggle(key)}
                        className={cn(
                          "flex w-full items-center gap-1 rounded-md px-2 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground",
                          "focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ring/40",
                        )}
                      >
                        <RiArrowRightSLine className={cn("size-3.5 shrink-0 transition-transform", !isCollapsed && "rotate-90")} />
                        {cat.title}
                      </button>
                      {!isCollapsed && (
                        <ul className="flex flex-col gap-0.5">
                          {cat.leaves.map((leaf) => (
                            <li key={leaf.id}><LeafButton leaf={leaf} indent /></li>
                          ))}
                        </ul>
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </nav>
      </aside>

      {/* Single-component page */}
      <div ref={mainRef} className="flex-1 overflow-y-auto">
        <div className="mx-auto flex max-w-4xl flex-col gap-6 px-6 py-8">
          <p className="text-xs font-medium text-primary">
            {current.layer}
            {current.category ? <span className="text-muted-foreground"> / {current.category}</span> : null}
          </p>
          <ActiveDocContext.Provider value={selectedId}>
            <GroupComp />
          </ActiveDocContext.Provider>
          <div className="h-8" />
        </div>
      </div>
    </div>
  );
}
