/**
 * Segment - V1 — Data pages
 *
 * The Segments and Definitions list pages. The Segments page features a split
 * layout with a group sidebar (left) for organisational folders and the segment
 * table (right). Group CRUD is local/ephemeral for the prototype.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Input } from "@/components/ui/Input";
import { Checkbox } from "@/components/ui/Checkbox";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/Tabs";
import { FilterBar } from "@/components/ui/FilterBar";
import { ConfirmDialog } from "@/components/ui/Dialog";
import { MetricCard } from "@/components/ui/MetricCard";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow, SortableTableHead,
} from "@/components/ui/Table";
import { BarChart } from "@/components/artifacts/BarChart";
import { LineChart } from "@/components/artifacts/LineChart";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/DropdownMenu";
import {
  RiAddLine, RiSearchLine, RiGroupLine, RiShoppingBag2Line, RiPriceTag3Line,
  RiFolderLine, RiMore2Line, RiListUnordered, RiPencilLine, RiDeleteBinLine,
  RiLightbulbLine, RiTimeLine,
  RiMessage2Line, RiLayoutGridLine,
} from "@remixicon/react";
import {
  BRAIN_GROUPS, ENTITY_META, foldersForEntity, groupsForEntity,
  type BrainGroup, type OutputEntity,
} from "../lexi-shared-brain/data";
import { MOCK_DEFINITIONS, MOCK_METRICS, type EntityType } from "@/data/definitions-mock";
import { CHANNEL_REVENUE_BAR, REVENUE_TREND } from "@/data/mock";
import { sourceFields, customDefs, type DefRow } from "./definitions-data";
import { TypeLabel, DefinitionDrawer } from "./DefinitionDetail";
import { INSIGHTS, previewText, type Insight, type SourceRef } from "./insights-data";
import { InsightDrawer } from "./InsightDetail";
import { BENCHMARKS } from "./benchmarks-data";
import { useSession } from "./store";
import { DUMMY_SEGMENTS } from "./segment-dummy-data";

// ─── Shared bits ─────────────────────────────────────────────────────────────

type SortKey = "name" | "lastUsed" | "population";


const ENTITY_ICON: Record<OutputEntity, typeof RiGroupLine> = {
  customer: RiGroupLine, product: RiShoppingBag2Line, order: RiPriceTag3Line,
};

const MOCK_LAST_USED: Record<string, string> = {
  "g-vip-at-risk": "2 hours ago",
  "g-hero-winback": "1 day ago",
  "g-loyalty-gold": "3 days ago",
  "g-new-high-potential": "5 days ago",
  "g-reengagement": "1 week ago",
  "g-eofy-vip": "12 hours ago",
  "g-bfcm": "2 weeks ago",
  "g-upsell": "4 days ago",
  "g-markdown": "3 weeks ago",
  "g-eofy-first": "6 days ago",
  "g-high-margin": "1 day ago",
};

const MOCK_CREATED_DATE: Record<string, string> = {
  "g-vip-at-risk": "14 Mar 2026",
  "g-hero-winback": "02 Apr 2026",
  "g-loyalty-gold": "22 Jan 2026",
  "g-new-high-potential": "17 May 2026",
  "g-reengagement": "29 Feb 2026",
  "g-eofy-vip": "07 Jun 2026",
  "g-bfcm": "11 Nov 2025",
  "g-upsell": "19 Apr 2026",
  "g-markdown": "03 Mar 2026",
  "g-eofy-first": "25 May 2026",
  "g-high-margin": "08 Apr 2026",
};

function fmt(n: number) { return n.toLocaleString(); }

function formatCreatedDate(savedAt?: string) {
  if (!savedAt) return "Just now";
  const parsed = new Date(savedAt);
  if (Number.isNaN(parsed.getTime())) return savedAt;
  return parsed.toLocaleDateString("en-AU", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}


// ─── Group sidebar ───────────────────────────────────────────────────────────

function GroupSidebar({
  groups,
  selectedGroup,
  onSelect,
  entityGroups,
  onAddGroup,
  onRenameGroup,
  onDeleteGroup,
}: {
  groups: string[];
  selectedGroup: string | null;
  onSelect: (g: string | null) => void;
  entityGroups: BrainGroup[];
  onAddGroup: (name: string) => void;
  onRenameGroup: (oldName: string, newName: string) => void;
  onDeleteGroup: (name: string) => void;
}) {
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [editingGroup, setEditingGroup] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const createRef = useRef<HTMLInputElement>(null);
  const editRef = useRef<HTMLInputElement>(null);

  useEffect(() => { if (creating) createRef.current?.focus(); }, [creating]);
  useEffect(() => { if (editingGroup) editRef.current?.focus(); }, [editingGroup]);

  const totalCount = entityGroups.length;
  const countFor = (folder: string) => entityGroups.filter((g) => g.folder === folder).length;

  const commitCreate = () => {
    const trimmed = newName.trim();
    if (trimmed && !groups.includes(trimmed)) {
      onAddGroup(trimmed);
    }
    setCreating(false);
    setNewName("");
  };

  const commitRename = (oldName: string) => {
    const trimmed = editValue.trim();
    if (trimmed && trimmed !== oldName && !groups.includes(trimmed)) {
      onRenameGroup(oldName, trimmed);
    }
    setEditingGroup(null);
    setEditValue("");
  };

  return (
    <div className="flex w-56 shrink-0 flex-col pl-6">
      <div className="flex items-center justify-between pr-3 pb-2 pt-5">
        <span className="text-xs font-medium text-foreground-secondary">Groups</span>
        <button
          onClick={() => { setCreating(true); setNewName(""); }}
          className="flex size-6 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
          title="Add group"
        >
          <RiAddLine className="size-3.5" />
        </button>
      </div>
      <nav className="flex flex-1 flex-col gap-0.5 overflow-y-auto px-2 pb-2">
        {/* All segments */}
        <button
          onClick={() => onSelect(null)}
          className={cn(
            "flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm transition-colors",
            selectedGroup === null
              ? "bg-accent font-medium text-foreground"
              : "text-foreground-secondary hover:bg-accent/50 hover:text-foreground",
          )}
        >
          <RiListUnordered className="size-3.5 shrink-0" />
          <span className="flex-1 truncate">All segments</span>
          <span className="text-xs tabular-nums text-muted-foreground">{totalCount}</span>
        </button>

        {/* Group rows */}
        {groups.map((folder) => {
          const count = countFor(folder);
          if (editingGroup === folder) {
            return (
              <div key={folder} className="px-1">
                <Input
                  ref={editRef}
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") commitRename(folder);
                    if (e.key === "Escape") { setEditingGroup(null); setEditValue(""); }
                  }}
                  onBlur={() => commitRename(folder)}
                  className="h-7 text-sm"
                />
              </div>
            );
          }
          return (
            <div key={folder} className="group/row relative flex items-center">
              <button
                onClick={() => onSelect(folder)}
                className={cn(
                  "flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm transition-colors",
                  selectedGroup === folder
                    ? "bg-accent font-medium text-foreground"
                    : "text-foreground-secondary hover:bg-accent/50 hover:text-foreground",
                )}
              >
                <RiFolderLine className="size-3.5 shrink-0" />
                <span className="flex-1 truncate">{folder}</span>
                <span className="text-xs tabular-nums text-muted-foreground">{count}</span>
              </button>
              {/* Context menu trigger */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="absolute right-1 flex size-6 items-center justify-center rounded-md text-muted-foreground opacity-0 transition-opacity hover:bg-accent hover:text-foreground group-hover/row:opacity-100">
                    <RiMore2Line className="size-3.5" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-36">
                  <DropdownMenuItem onSelect={() => { setEditingGroup(folder); setEditValue(folder); }}>
                    <RiPencilLine className="size-3.5" /> Rename
                  </DropdownMenuItem>
                  <DropdownMenuItem className="text-destructive" onSelect={() => onDeleteGroup(folder)}>
                    <RiDeleteBinLine className="size-3.5" /> Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          );
        })}

        {/* Inline creation */}
        {creating && (
          <div className="px-1">
            <Input
              ref={createRef}
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="New group"
              onKeyDown={(e) => {
                if (e.key === "Enter") commitCreate();
                if (e.key === "Escape") { setCreating(false); setNewName(""); }
              }}
              onBlur={() => commitCreate()}
              className="h-7 text-sm"
            />
          </div>
        )}
      </nav>
    </div>
  );
}

// ─── Segments list page ──────────────────────────────────────────────────────

export function SegmentsPage({
  onOpenSegment,
  onStartSegmentWorkflow,
}: {
  onOpenSegment?: (id: string) => void;
  onStartSegmentWorkflow?: () => void;
}) {
  const { state, dispatch } = useSession();
  const [query, setQuery] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("population");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [deletedGroupIds, setDeletedGroupIds] = useState<string[]>([]);
  const [savedSegmentGroup, setSavedSegmentGroup] = useState<Record<string, string>>({});
  const [groupOverrides, setGroupOverrides] = useState<Record<string, string>>({});
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkGroup, setBulkGroup] = useState<string>("");
  const [confirmBulkDeleteOpen, setConfirmBulkDeleteOpen] = useState(false);
  const entity: OutputEntity = "customer";
  const groups = foldersForEntity("customer");

  function toggleSort(k: SortKey) {
    if (sortKey === k) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(k); setSortDir(k === "population" ? "desc" : "asc"); }
  }
  const sortState = (k: SortKey) => (sortKey === k ? sortDir : false);

  const entityGroups = groupsForEntity(entity)
    .filter((group) => !deletedGroupIds.includes(group.id))
    .map((group) => ({
      ...group,
      folder: groupOverrides[group.id] ?? group.folder,
    }));
  const filtered = entityGroups.filter((g: BrainGroup) =>
    (query === "" || g.name.toLowerCase().includes(query.toLowerCase()) || g.summary.toLowerCase().includes(query.toLowerCase())),
  );
  const segments = [...filtered].sort((a, b) => {
    let cmp = 0;
    if (sortKey === "name") cmp = a.name.localeCompare(b.name);
    else if (sortKey === "population") cmp = a.population - b.population;
    else cmp = (MOCK_LAST_USED[a.id] ?? "").localeCompare(MOCK_LAST_USED[b.id] ?? "");
    return sortDir === "asc" ? cmp : -cmp;
  }).filter(() => false);

  // Segments saved during this session
  const savedSegments = [...state.artifacts.values()]
    .filter((a) => a.status === "saved" && a.body?.kind === "segment")
    .filter((a) => query === "" || a.name.toLowerCase().includes(query.toLowerCase()) || (a.def?.description ?? "").toLowerCase().includes(query.toLowerCase()));

  const activationsBySegmentId = useMemo(() => {
    const counts = new Map<string, number>();
    for (const activation of state.activations) {
      if (!activation.segmentId) continue;
      counts.set(activation.segmentId, (counts.get(activation.segmentId) ?? 0) + 1);
    }
    return counts;
  }, [state.activations]);

  const dummySegments = DUMMY_SEGMENTS.filter((segment) => {
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return segment.name.toLowerCase().includes(q) || segment.summary.toLowerCase().includes(q);
  });

  const shownIds = [
    ...dummySegments.map((segment) => segment.id),
    ...savedSegments.map((segment) => segment.id),
    ...segments.map((segment) => segment.id),
  ];
  const allShownSelected = shownIds.length > 0 && shownIds.every((id) => selectedIds.has(id));
  const someShownSelected = !allShownSelected && shownIds.some((id) => selectedIds.has(id));
  const selectedCount = selectedIds.size;

  const toggleSelectAllShown = (checked: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (checked) shownIds.forEach((id) => next.add(id));
      else shownIds.forEach((id) => next.delete(id));
      return next;
    });
  };

  const toggleSelectSegment = (id: string, checked: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  };

  const applyBulkGroup = () => {
    const group = bulkGroup.trim();
    if (!group || selectedIds.size === 0) return;

    const selected = new Set(selectedIds);
    setGroupOverrides((prev) => {
      const next = { ...prev };
      segments.forEach((segment) => {
        if (selected.has(segment.id)) next[segment.id] = group;
      });
      return next;
    });
    setSavedSegmentGroup((prev) => {
      const next = { ...prev };
      savedSegments.forEach((segment) => {
        if (selected.has(segment.id)) next[segment.id] = group;
      });
      return next;
    });
    setSelectedIds(new Set());
    setBulkGroup("");
  };

  const confirmBulkDelete = () => {
    const selected = new Set(selectedIds);
    const groupIds = segments.filter((segment) => selected.has(segment.id)).map((segment) => segment.id);
    const savedIds = savedSegments.filter((segment) => selected.has(segment.id)).map((segment) => segment.id);

    if (groupIds.length > 0) {
      setDeletedGroupIds((prev) => [...new Set([...prev, ...groupIds])]);
    }
    if (savedIds.length > 0) {
      savedIds.forEach((id) => dispatch({ type: "DISMISS_ARTIFACT", id }));
    }

    setSelectedIds(new Set());
  };

  useEffect(() => {
    const visible = new Set([
      ...groupsForEntity("customer").filter((g) => !deletedGroupIds.includes(g.id)).map((g) => g.id),
      ...[...state.artifacts.values()].filter((a) => a.status === "saved" && a.body?.kind === "segment").map((a) => a.id),
    ]);
    setSelectedIds((prev) => new Set([...prev].filter((id) => visible.has(id))));
  }, [deletedGroupIds, state.artifacts]);

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex flex-col gap-4 px-6 pt-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex min-w-0 flex-1 basis-72 flex-col gap-1">
            <h1 className="text-xl font-semibold text-foreground">Segments</h1>
            <p className="text-sm text-foreground-secondary">Reusable audience definitions for customers.</p>
          </div>
          <Button
            size="sm"
            className="shrink-0"
            onClick={() => {
              if (onStartSegmentWorkflow) {
                onStartSegmentWorkflow();
              }
            }}
          >
            <RiAddLine className="size-3.5" /> New segment
          </Button>
        </div>
      </div>

      <div className="flex min-h-0 flex-1">
        <div className="flex min-w-0 flex-1 flex-col gap-3 overflow-y-auto px-6 py-4">
          {selectedCount > 0 ? (
            <div className="flex flex-col gap-3 rounded-lg border border-primary/30 bg-primary/5 px-3 py-3">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-medium text-foreground">{selectedCount} selected</p>
                <Button size="sm" variant="ghost" onClick={() => setSelectedIds(new Set())}>Clear</Button>
              </div>

              <div className="flex flex-wrap items-center gap-2 rounded-md border border-border/70 bg-background/80 px-2.5 py-2">
                <span className="text-xs font-medium text-foreground-secondary">Delete</span>
                <Button size="sm" variant="destructive" onClick={() => setConfirmBulkDeleteOpen(true)}>Delete selected segments</Button>
              </div>

              <div className="flex flex-wrap items-end gap-2 rounded-md border border-border/70 bg-background/80 px-2.5 py-2">
                <div className="flex min-w-[14rem] flex-col gap-1">
                  <label className="text-xs font-medium text-foreground-secondary">Add to groups</label>
                  <select
                    value={bulkGroup}
                    onChange={(e) => setBulkGroup(e.target.value)}
                    className="h-9 rounded-lg border border-input-border bg-input px-3 text-sm text-foreground"
                  >
                    <option value="">Select group</option>
                    {groups.map((group) => (
                      <option key={group} value={group}>{group}</option>
                    ))}
                  </select>
                </div>
                <Button size="sm" variant="outline" onClick={applyBulkGroup} disabled={!bulkGroup}>Apply group</Button>
              </div>
            </div>
          ) : null}

          <FilterBar>
            <div className="relative">
              <RiSearchLine className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search segments" className="h-9 w-64 pl-8" />
            </div>
          </FilterBar>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">
                  <div onClick={(e) => e.stopPropagation()}>
                    <Checkbox
                      checked={allShownSelected ? true : someShownSelected ? "indeterminate" : false}
                      onCheckedChange={(checked) => toggleSelectAllShown(checked === true)}
                      aria-label="Select all segments"
                    />
                  </div>
                </TableHead>
                <SortableTableHead sort={sortState("name")} onSort={() => toggleSort("name")}>Segment</SortableTableHead>
                <SortableTableHead className="w-32" sort={sortState("population")} onSort={() => toggleSort("population")}>Population</SortableTableHead>
                <TableHead className="w-40">Date created</TableHead>
                <SortableTableHead className="w-36" sort={sortState("lastUsed")} onSort={() => toggleSort("lastUsed")}>Last used</SortableTableHead>
                <TableHead className="w-28">In Activations</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {dummySegments.map((segment) => (
                <TableRow
                  key={segment.id}
                  className={onOpenSegment ? "cursor-pointer" : undefined}
                  onClick={onOpenSegment ? () => onOpenSegment(segment.id) : undefined}
                >
                  <TableCell>
                    <div onClick={(e) => e.stopPropagation()}>
                      <Checkbox
                        checked={selectedIds.has(segment.id)}
                        onCheckedChange={(checked) => toggleSelectSegment(segment.id, checked === true)}
                        aria-label={`Select ${segment.name}`}
                      />
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="font-medium text-foreground">{segment.name}</span>
                    <p className="mt-0.5 max-w-md truncate text-sm text-foreground-secondary">{segment.summary}</p>
                  </TableCell>
                  <TableCell className="font-medium tabular-nums text-foreground">{segment.population}</TableCell>
                  <TableCell className="text-sm text-foreground-secondary">{segment.created}</TableCell>
                  <TableCell className="text-sm text-foreground-secondary">{segment.lastUsed}</TableCell>
                  <TableCell className="font-medium tabular-nums text-foreground">{segment.inActivations}</TableCell>
                </TableRow>
              ))}

              {savedSegments.map((s) => (
                <TableRow key={s.id} className={onOpenSegment ? "cursor-pointer" : undefined} onClick={onOpenSegment ? () => onOpenSegment(s.id) : undefined}>
                  <TableCell>
                    <div onClick={(e) => e.stopPropagation()}>
                      <Checkbox
                        checked={selectedIds.has(s.id)}
                        onCheckedChange={(checked) => toggleSelectSegment(s.id, checked === true)}
                        aria-label={`Select ${s.name}`}
                      />
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="font-medium text-foreground">{s.name}</span>
                    <p className="mt-0.5 max-w-md truncate text-sm text-foreground-secondary">{s.def?.description ?? ""}</p>
                  </TableCell>
                  <TableCell className="font-medium tabular-nums text-foreground">{s.body?.kind === "segment" ? (s.body.population ?? "—") : "—"}</TableCell>
                  <TableCell className="text-sm text-foreground-secondary">{formatCreatedDate(s.savedAt)}</TableCell>
                  <TableCell className="text-sm text-foreground-secondary">Just now</TableCell>
                  <TableCell className="font-medium tabular-nums text-foreground">{activationsBySegmentId.get(s.id) ?? 0}</TableCell>
                </TableRow>
              ))}
              {segments.map((g) => (
                <TableRow key={g.id} className={onOpenSegment ? "cursor-pointer" : undefined} onClick={onOpenSegment ? () => onOpenSegment(g.id) : undefined}>
                  <TableCell>
                    <div onClick={(e) => e.stopPropagation()}>
                      <Checkbox
                        checked={selectedIds.has(g.id)}
                        onCheckedChange={(checked) => toggleSelectSegment(g.id, checked === true)}
                        aria-label={`Select ${g.name}`}
                      />
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="font-medium text-foreground">{g.name}</span>
                    <p className="mt-0.5 max-w-md truncate text-sm text-foreground-secondary">{g.summary}</p>
                  </TableCell>
                  <TableCell className="font-medium tabular-nums text-foreground">{fmt(g.population)}</TableCell>
                  <TableCell className="text-sm text-foreground-secondary">{MOCK_CREATED_DATE[g.id] ?? "—"}</TableCell>
                  <TableCell className="text-sm text-foreground-secondary">{MOCK_LAST_USED[g.id] ?? "—"}</TableCell>
                  <TableCell className="font-medium tabular-nums text-foreground">{activationsBySegmentId.get(g.id) ?? 0}</TableCell>
                </TableRow>
              ))}
              {dummySegments.length === 0 && segments.length === 0 && savedSegments.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="py-10 text-center text-sm text-muted-foreground">No segments match these filters.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
          <p className="text-sm text-muted-foreground">
            Displaying {dummySegments.length + segments.length + savedSegments.length} of {dummySegments.length + entityGroups.length} customers
          </p>
        </div>
      </div>

      <ConfirmDialog
        open={confirmBulkDeleteOpen}
        onOpenChange={setConfirmBulkDeleteOpen}
        title={`Do you really want to delete ${selectedCount} Segment(s)?`}
        description="This action cannot be undone."
        confirmLabel="Yes, delete"
        cancelLabel="Cancel"
        variant="destructive"
        onConfirm={confirmBulkDelete}
      />
    </div>
  );
}

// ─── Definitions page (Source layer) ───────────────────────────────────────────
// Definitions now shows Source fields only. The Custom layer has moved to a
// dedicated Metrics page in the main nav.

const DEF_ENTITY_LABEL: Record<string, string> = { customer: "Customer", product: "Product", order: "Transaction" };

const ENTITY_ORDER: EntityType[] = ["customer", "product", "order"];

function EntitySidebar({
  entity,
  onSelect,
}: {
  entity: EntityType;
  onSelect: (entity: EntityType) => void;
}) {
  return (
    <div className="flex w-56 shrink-0 flex-col pl-6">
      <nav className="flex flex-1 flex-col gap-0.5 overflow-y-auto px-2 pb-2 pt-5">
        <span className="px-2 pb-1 text-xs font-medium text-foreground-secondary">Entity</span>
        {ENTITY_ORDER.map((e) => {
          const Icon = ENTITY_ICON[e];
          return (
            <button
              key={e}
              onClick={() => onSelect(e)}
              className={cn(
                "flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm transition-colors",
                entity === e
                  ? "bg-accent font-medium text-foreground"
                  : "text-foreground-secondary hover:bg-accent/50 hover:text-foreground",
              )}
            >
              <Icon className="size-3.5 shrink-0" />
              <span className="flex-1 truncate">{DEF_ENTITY_LABEL[e]}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}

export function DefinitionsPage() {
  const [entity, setEntity] = useState<EntityType>("customer");
  const [query, setQuery] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);

  const source = sourceFields(entity);
  const rows: DefRow[] = source;

  const q = query.trim().toLowerCase();
  const matches = (s: string) => q === "" || s.toLowerCase().includes(q);
  const shown = rows.filter((r) => matches(r.name) || matches(r.description) || matches(r.detail));

  return (
    <div className="flex h-full flex-col">
      <div className="flex flex-col gap-1 px-6 pt-6">
        <div className="flex flex-col gap-1">
          <h1 className="text-xl font-semibold text-foreground">Definitions</h1>
          <p className="text-sm text-foreground-secondary">
            The building blocks Lexi reasons over — raw source fields by entity.
          </p>
        </div>
      </div>

      <div className="flex min-h-0 flex-1">
        <EntitySidebar entity={entity} onSelect={setEntity} />

        <div className="flex min-w-0 flex-1 flex-col gap-3 overflow-y-auto px-6 py-4">
          <FilterBar>
            <div className="relative">
              <RiSearchLine className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search definitions" className="h-9 w-64 pl-8" />
            </div>
          </FilterBar>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Field</TableHead>
                <TableHead className="w-32">Data type</TableHead>
                <TableHead>Source column</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {shown.map((r) => (
                <TableRow key={r.id} className="cursor-pointer" onClick={() => setOpenId(r.id)}>
                  <TableCell>
                    <span className="font-medium text-foreground">{r.name}</span>
                    <p className="mt-0.5 max-w-sm truncate text-sm text-foreground-secondary">{r.description}</p>
                  </TableCell>
                  <TableCell><TypeLabel type={r.dataType} /></TableCell>
                  <TableCell className="max-w-xs truncate font-mono text-xs text-foreground-secondary">{r.detail}</TableCell>
                </TableRow>
              ))}
              {shown.length === 0 && (
                <TableRow><TableCell colSpan={3} className="py-10 text-center text-sm text-muted-foreground">No fields match these filters.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
          <p className="text-sm text-muted-foreground">
            Displaying {shown.length} of {rows.length} fields
          </p>
        </div>
      </div>

      {openId && <DefinitionDrawer id={openId} onClose={() => setOpenId(null)} />}
    </div>
  );
}

export function MetricsPage() {
  const [entity, setEntity] = useState<EntityType>("customer");
  const [query, setQuery] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);

  const rows: DefRow[] = customDefs(entity);
  const q = query.trim().toLowerCase();
  const matches = (s: string) => q === "" || s.toLowerCase().includes(q);
  const shown = rows.filter((r) => matches(r.name) || matches(r.description) || matches(r.detail));

  return (
    <div className="flex h-full flex-col">
      <div className="flex flex-col gap-1 px-6 pt-6">
        <div className="flex flex-col gap-1">
          <h1 className="text-xl font-semibold text-foreground">Metrics</h1>
          <p className="text-sm text-foreground-secondary">
            Curated custom metrics and computed definitions built on top of source fields.
          </p>
        </div>
      </div>

      <div className="flex min-h-0 flex-1">
        <EntitySidebar entity={entity} onSelect={setEntity} />

        <div className="flex min-w-0 flex-1 flex-col gap-3 overflow-y-auto px-6 py-4">
          <FilterBar>
            <div className="relative">
              <RiSearchLine className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search metrics" className="h-9 w-64 pl-8" />
            </div>
          </FilterBar>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Metric</TableHead>
                <TableHead className="w-32">Data type</TableHead>
                <TableHead>Logic</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {shown.map((r) => (
                <TableRow key={r.id} className="cursor-pointer" onClick={() => setOpenId(r.id)}>
                  <TableCell>
                    <span className="font-medium text-foreground">{r.name}</span>
                    <p className="mt-0.5 max-w-sm truncate text-sm text-foreground-secondary">{r.description}</p>
                  </TableCell>
                  <TableCell><TypeLabel type={r.dataType} /></TableCell>
                  <TableCell className="max-w-xs truncate font-mono text-xs text-foreground-secondary">{r.detail}</TableCell>
                </TableRow>
              ))}
              {shown.length === 0 && (
                <TableRow><TableCell colSpan={3} className="py-10 text-center text-sm text-muted-foreground">No metrics match these filters.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
          <p className="text-sm text-muted-foreground">
            Displaying {shown.length} of {rows.length} metrics
          </p>
        </div>
      </div>

      {openId && <DefinitionDrawer id={openId} onClose={() => setOpenId(null)} />}
    </div>
  );
}

export function BenchmarksPage() {
  const [entity, setEntity] = useState<EntityType>("customer");
  const [query, setQuery] = useState("");
  const [openBenchmarkId, setOpenBenchmarkId] = useState<string | null>(null);

  const metricNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const metric of MOCK_METRICS) map.set(metric.id, metric.name);
    return map;
  }, []);

  const definitionNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const def of MOCK_DEFINITIONS) map.set(def.id, def.name);
    return map;
  }, []);

  const q = query.trim().toLowerCase();
  const matches = (s: string) => q === "" || s.toLowerCase().includes(q);
  const rows = BENCHMARKS.filter((row) => row.entity === entity)
    .filter((row) => (
      matches(row.name) ||
      matches(row.owner) ||
      matches(metricNameById.get(row.metricId) ?? row.metricId) ||
      matches(definitionNameById.get(row.definitionId) ?? row.definitionId)
    ));

  const openBenchmark = openBenchmarkId
    ? BENCHMARKS.find((row) => row.id === openBenchmarkId && row.entity === entity)
    : undefined;

  useEffect(() => {
    if (!openBenchmarkId) return;
    const exists = BENCHMARKS.some((row) => row.id === openBenchmarkId && row.entity === entity);
    if (!exists) setOpenBenchmarkId(null);
  }, [entity, openBenchmarkId]);

  return (
    <div className="flex h-full flex-col">
      <div className="flex flex-col gap-1 px-6 pt-6">
        <div className="flex flex-col gap-1">
          <h1 className="text-xl font-semibold text-foreground">Benchmarks</h1>
          <p className="text-sm text-foreground-secondary">
            Target guardrails that connect Benchmark to Metric and its supporting Definition.
          </p>
        </div>
      </div>

      <div className="flex min-h-0 flex-1">
        <EntitySidebar entity={entity} onSelect={setEntity} />

        <div className="flex min-w-0 flex-1 flex-col gap-3 overflow-y-auto px-6 py-4">
          <FilterBar>
            <div className="relative">
              <RiSearchLine className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search benchmarks" className="h-9 w-64 pl-8" />
            </div>
          </FilterBar>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Benchmark</TableHead>
                <TableHead className="w-40">Metric</TableHead>
                <TableHead className="w-44">Definition</TableHead>
                <TableHead className="w-24">Direction</TableHead>
                <TableHead className="w-32">Target</TableHead>
                <TableHead className="w-32">Current</TableHead>
                <TableHead className="w-32">Updated</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => {
                const metricName = metricNameById.get(row.metricId) ?? row.metricId;
                const definitionName = definitionNameById.get(row.definitionId) ?? row.definitionId;
                const onTrack = row.direction === "higher"
                  ? row.currentValue >= row.targetValue
                  : row.currentValue <= row.targetValue;

                return (
                  <TableRow key={row.id} className="cursor-pointer" onClick={() => setOpenBenchmarkId(row.id)}>
                    <TableCell>
                      <span className="font-medium text-foreground">{row.name}</span>
                      <p className="mt-0.5 max-w-md truncate text-sm text-foreground-secondary">{row.note}</p>
                    </TableCell>
                    <TableCell className="text-sm text-foreground-secondary">{metricName}</TableCell>
                    <TableCell className="text-sm text-foreground-secondary">{definitionName}</TableCell>
                    <TableCell className="text-sm text-foreground-secondary">{row.direction === "higher" ? "Higher" : "Lower"}</TableCell>
                    <TableCell className="font-medium tabular-nums text-foreground">{row.targetValue}</TableCell>
                    <TableCell>
                      <span className={cn("text-sm font-medium tabular-nums", onTrack ? "text-emerald-600" : "text-amber-600")}>{row.currentValue}</span>
                    </TableCell>
                    <TableCell className="text-sm text-foreground-secondary">{row.updatedAt}</TableCell>
                  </TableRow>
                );
              })}
              {rows.length === 0 && (
                <TableRow><TableCell colSpan={7} className="py-10 text-center text-sm text-muted-foreground">No benchmarks match these filters.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
          <p className="text-sm text-muted-foreground">Displaying {rows.length} of {BENCHMARKS.filter((row) => row.entity === entity).length} benchmarks</p>
        </div>

        <div
          className={cn(
            "flex shrink-0 overflow-hidden border-l border-border/60 bg-background transition-[width,opacity] duration-300 ease-out",
            openBenchmark ? "w-[360px] opacity-100" : "w-0 opacity-0",
          )}
        >
          {openBenchmark ? (
            <div className="flex h-full w-full flex-col">
              <div className="flex items-start justify-between gap-3 border-b border-border/60 px-4 py-3">
                <div className="min-w-0">
                  <p className="text-xs font-medium text-foreground-secondary">Benchmark details</p>
                  <h2 className="truncate text-sm font-semibold text-foreground">{openBenchmark.name}</h2>
                </div>
                <Button size="sm" variant="outline" onClick={() => setOpenBenchmarkId(null)}>Close</Button>
              </div>

              <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4">
                <div className="rounded-lg border border-border bg-card p-3">
                  <p className="text-xs font-medium text-foreground-secondary">Reference chain</p>
                  <p className="mt-1 text-sm text-foreground"><span className="font-medium">Metric:</span> {metricNameById.get(openBenchmark.metricId) ?? openBenchmark.metricId}</p>
                  <p className="mt-1 text-sm text-foreground"><span className="font-medium">Definition:</span> {definitionNameById.get(openBenchmark.definitionId) ?? openBenchmark.definitionId}</p>
                </div>

                <div className="rounded-lg border border-border bg-card p-3">
                  <p className="text-xs font-medium text-foreground-secondary">How it is tracked</p>
                  <div className="mt-2 space-y-1.5">
                    <p className="text-sm text-foreground"><span className="font-medium">Period:</span> {openBenchmark.period}</p>
                    <p className="text-sm text-foreground"><span className="font-medium">Owner:</span> {openBenchmark.owner}</p>
                    <p className="text-sm text-foreground"><span className="font-medium">Updated:</span> {openBenchmark.updatedAt}</p>
                    {openBenchmark.tracking.map((item) => (
                      <p key={item.label} className="text-sm text-foreground"><span className="font-medium">{item.label}:</span> {item.value}</p>
                    ))}
                  </div>
                </div>

                <div className="rounded-lg border border-border bg-card p-3">
                  <p className="text-xs font-medium text-foreground-secondary">Examples</p>
                  <ul className="mt-2 space-y-1.5">
                    {openBenchmark.examples.map((example) => (
                      <li key={example} className="text-sm text-foreground-secondary">• {example}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export function ScorecardPage() {
  const [entity, setEntity] = useState<EntityType>("customer");
  const [query, setQuery] = useState("");

  const metricNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const metric of MOCK_METRICS) map.set(metric.id, metric.name);
    return map;
  }, []);

  const rows = BENCHMARKS.filter((row) => row.entity === entity);
  const q = query.trim().toLowerCase();
  const filteredRows = rows.filter((row) => {
    if (q === "") return true;
    return row.name.toLowerCase().includes(q) || row.owner.toLowerCase().includes(q);
  });

  const toNumeric = (value: string) => Number(value.replace(/[^0-9.-]/g, ""));
  const scoredRows = filteredRows.map((row) => {
    const current = toNumeric(row.currentValue);
    const target = toNumeric(row.targetValue);
    const onTrack = row.direction === "higher" ? current >= target : current <= target;
    const delta = row.direction === "higher" ? current - target : target - current;
    return { ...row, onTrack, delta };
  });

  const onTrackCount = scoredRows.filter((row) => row.onTrack).length;
  const atRiskCount = Math.max(0, scoredRows.length - onTrackCount);
  const coverage = scoredRows.length === 0 ? 0 : Math.round((onTrackCount / scoredRows.length) * 100);

  return (
    <div className="flex h-full flex-col">
      <div className="flex flex-col gap-1 px-6 pt-6">
        <div className="flex flex-col gap-1">
          <h1 className="text-xl font-semibold text-foreground">Scorecard</h1>
          <p className="text-sm text-foreground-secondary">
            Snapshot of benchmark performance and coverage across the selected entity.
          </p>
        </div>
      </div>

      <div className="flex min-h-0 flex-1">
        <EntitySidebar entity={entity} onSelect={setEntity} />

        <div className="flex min-w-0 flex-1 flex-col gap-3 overflow-y-auto px-6 py-4">
          <div className="grid grid-cols-1 gap-3 xl:grid-cols-4">
            <MetricCard label="Benchmarks" value={String(scoredRows.length)} hint="Included in this scorecard" />
            <MetricCard label="On track" value={String(onTrackCount)} hint="Meeting current targets" />
            <MetricCard label="At risk" value={String(atRiskCount)} hint="Outside target range" />
            <MetricCard label="Coverage" value={`${coverage}%`} hint="Share currently on track" />
          </div>

          <FilterBar>
            <div className="relative">
              <RiSearchLine className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search scorecard rows" className="h-9 w-64 pl-8" />
            </div>
          </FilterBar>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Benchmark</TableHead>
                <TableHead className="w-48">Metric</TableHead>
                <TableHead className="w-24">Target</TableHead>
                <TableHead className="w-24">Current</TableHead>
                <TableHead className="w-24">Delta</TableHead>
                <TableHead className="w-24">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {scoredRows.map((row) => (
                <TableRow key={row.id}>
                  <TableCell>
                    <span className="font-medium text-foreground">{row.name}</span>
                    <p className="mt-0.5 text-sm text-foreground-secondary">Owner: {row.owner}</p>
                  </TableCell>
                  <TableCell className="text-sm text-foreground-secondary">{metricNameById.get(row.metricId) ?? row.metricId}</TableCell>
                  <TableCell className="tabular-nums text-foreground">{row.targetValue}</TableCell>
                  <TableCell className="tabular-nums text-foreground">{row.currentValue}</TableCell>
                  <TableCell className={cn("tabular-nums", row.onTrack ? "text-emerald-600" : "text-amber-600")}>
                    {row.delta > 0 ? `+${row.delta}` : row.delta}
                  </TableCell>
                  <TableCell>
                    <Badge variant={row.onTrack ? "success" : "warning"} size="sm">
                      {row.onTrack ? "On track" : "At risk"}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
              {scoredRows.length === 0 && (
                <TableRow><TableCell colSpan={6} className="py-10 text-center text-sm text-muted-foreground">No scorecard rows match these filters.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}

export function DashboardsPage() {
  const dashboardRows = useMemo(() => {
    const byDashboard = new Map<string, {
      name: string;
      benchmarks: Array<{ id: string; name: string; owner: string; updatedAt: string }>;
      examples: string[];
    }>();

    BENCHMARKS.forEach((benchmark) => {
      const dashboard = benchmark.tracking.find((item) => item.label === "Dashboard")?.value;
      if (!dashboard) return;

      const existing = byDashboard.get(dashboard) ?? {
        name: dashboard,
        benchmarks: [],
        examples: [],
      };

      existing.benchmarks.push({
        id: benchmark.id,
        name: benchmark.name,
        owner: benchmark.owner,
        updatedAt: benchmark.updatedAt,
      });

      benchmark.examples.forEach((example) => {
        if (!existing.examples.includes(example)) existing.examples.push(example);
      });

      byDashboard.set(dashboard, existing);
    });

    return Array.from(byDashboard.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, []);

  const [activeDashboard, setActiveDashboard] = useState<string | null>(null);

  useEffect(() => {
    if (dashboardRows.length === 0) {
      setActiveDashboard(null);
      return;
    }
    if (activeDashboard && dashboardRows.some((dashboard) => dashboard.name === activeDashboard)) return;
    setActiveDashboard(dashboardRows[0].name);
  }, [dashboardRows, activeDashboard]);

  const selectedDashboard = activeDashboard
    ? dashboardRows.find((dashboard) => dashboard.name === activeDashboard)
    : undefined;

  const parseNumeric = (value: string) => Number(value.replace(/[^0-9.-]/g, ""));

  const selectedBenchmarks = useMemo(() => {
    if (!selectedDashboard) return [];
    const ids = new Set(selectedDashboard.benchmarks.map((benchmark) => benchmark.id));
    return BENCHMARKS.filter((benchmark) => ids.has(benchmark.id));
  }, [selectedDashboard]);

  const onTrackCount = selectedBenchmarks.filter((benchmark) => {
    const current = parseNumeric(benchmark.currentValue);
    const target = parseNumeric(benchmark.targetValue);
    return benchmark.direction === "higher" ? current >= target : current <= target;
  }).length;

  const chartSeed = activeDashboard ? activeDashboard.length : 1;
  const trendData = REVENUE_TREND.map((point, index) => ({
    ...point,
    value: Math.round(point.value * (0.85 + ((chartSeed + index) % 7) * 0.03)),
  }));
  const channelData = CHANNEL_REVENUE_BAR.map((bar, index) => ({
    ...bar,
    value: Math.round(bar.value * (0.8 + ((chartSeed + index) % 5) * 0.06)),
  }));

  return (
    <div className="flex h-full flex-col px-6 py-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-xl font-semibold text-foreground">Dashboards</h1>
        <p className="text-sm text-foreground-secondary">
          Operational dashboard view generated from benchmark-linked dashboard references.
        </p>
      </div>

      <div className="mt-4 flex min-h-0 flex-1 gap-4">
        <aside className="w-64 shrink-0 overflow-y-auto rounded-xl border border-border bg-card p-3">
          <p className="px-2 pb-2 text-xs font-medium text-foreground-secondary">Available dashboards</p>
          <div className="space-y-1">
            {dashboardRows.map((dashboard) => (
              <button
                key={dashboard.name}
                onClick={() => setActiveDashboard(dashboard.name)}
                className={cn(
                  "flex w-full items-center justify-between rounded-lg px-2 py-2 text-left text-sm transition-colors",
                  activeDashboard === dashboard.name
                    ? "bg-accent font-medium text-foreground"
                    : "text-foreground-secondary hover:bg-accent/50 hover:text-foreground",
                )}
              >
                <span className="truncate">{dashboard.name}</span>
                <span className="text-xs tabular-nums text-muted-foreground">{dashboard.benchmarks.length}</span>
              </button>
            ))}
          </div>
        </aside>

        <div className="min-w-0 flex-1 overflow-y-auto">
          {selectedDashboard ? (
            <div className="space-y-4">
              <div className="rounded-xl border border-border bg-card p-4">
                <h2 className="text-base font-semibold text-foreground">{selectedDashboard.name}</h2>
                <p className="mt-1 text-sm text-foreground-secondary">
                  This dashboard tracks {selectedDashboard.benchmarks.length} benchmark signals and highlights where performance is drifting.
                </p>
              </div>

              <div className="grid grid-cols-1 gap-3 xl:grid-cols-4">
                <MetricCard label="Benchmarks" value={String(selectedBenchmarks.length)} hint="Linked to this dashboard" />
                <MetricCard label="On track" value={String(onTrackCount)} hint="Meeting benchmark targets" />
                <MetricCard label="Needs attention" value={String(Math.max(0, selectedBenchmarks.length - onTrackCount))} hint="Outside target range" />
                <MetricCard label="Examples" value={String(selectedDashboard.examples.length)} hint="Tracked operating examples" />
              </div>

              <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
                <div className="rounded-xl border border-border bg-card p-4">
                  <p className="text-sm font-semibold text-foreground">Performance trend</p>
                  <p className="text-xs text-foreground-secondary">Synthetic trend view for referenced dashboard tracking.</p>
                  <div className="mt-3 h-56"><LineChart data={trendData} /></div>
                </div>
                <div className="rounded-xl border border-border bg-card p-4">
                  <p className="text-sm font-semibold text-foreground">Channel contribution</p>
                  <p className="text-xs text-foreground-secondary">Current allocation across major activation channels.</p>
                  <div className="mt-3 h-56"><BarChart data={channelData} /></div>
                </div>
              </div>

              <div className="rounded-xl border border-border bg-card p-4">
                <p className="text-sm font-semibold text-foreground">Benchmark tracking</p>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Benchmark</TableHead>
                      <TableHead className="w-24">Direction</TableHead>
                      <TableHead className="w-24">Target</TableHead>
                      <TableHead className="w-24">Current</TableHead>
                      <TableHead className="w-24">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {selectedBenchmarks.map((benchmark) => {
                      const current = parseNumeric(benchmark.currentValue);
                      const target = parseNumeric(benchmark.targetValue);
                      const onTrack = benchmark.direction === "higher" ? current >= target : current <= target;

                      return (
                        <TableRow key={benchmark.id}>
                          <TableCell>
                            <span className="font-medium text-foreground">{benchmark.name}</span>
                            <p className="mt-0.5 text-xs text-foreground-secondary">{benchmark.owner} · {benchmark.updatedAt}</p>
                          </TableCell>
                          <TableCell className="text-sm text-foreground-secondary">{benchmark.direction === "higher" ? "Higher" : "Lower"}</TableCell>
                          <TableCell className="text-sm tabular-nums text-foreground">{benchmark.targetValue}</TableCell>
                          <TableCell className="text-sm tabular-nums text-foreground">{benchmark.currentValue}</TableCell>
                          <TableCell>
                            <Badge variant={onTrack ? "success" : "warning"} size="sm">{onTrack ? "On track" : "At risk"}</Badge>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </div>
          ) : (
            <div className="flex h-full items-center justify-center rounded-xl border border-dashed border-border bg-muted/20 p-8 text-sm text-muted-foreground">
              No dashboards referenced yet. Add dashboard tracking to benchmarks to populate this view.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Insights page (Knowledge) ───────────────────────────────────────────────
// Saved findings across every space — a card feed filterable by space, each
// opening a detail drawer. The shared brain's accumulated learnings.

type InsightView = "cards" | "list";

export function InsightsPage({
  onOpenSource,
  initialOpenInsightId,
  onInitialOpenHandled,
  spaceOptions,
  onAddToSpace,
}: {
  onOpenSource?: (s: SourceRef) => void;
  initialOpenInsightId?: string;
  onInitialOpenHandled?: () => void;
  spaceOptions?: Array<{ id: string; name: string }>;
  onAddToSpace?: (spaceId: string, insight: Insight) => void;
}) {
  const { state } = useSession();
  const [query, setQuery] = useState("");
  const [view, setView] = useState<InsightView>("cards");
  const [openId, setOpenId] = useState<string | null>(null);
  const sessionInsights: Insight[] = [...state.artifacts.values()]
    .filter((artifact) => artifact.type === "insight" && artifact.status === "saved" && artifact.body?.kind === "insight")
    .map((artifact) => ({
      id: artifact.id,
      title: artifact.name,
      finding: artifact.body!.finding,
      implication: artifact.body!.implication,
      space: "Current prototype session",
      source: {
        kind: "chat",
        id: state.activeConversationId ?? "conv-black-friday-planning",
        label: "Saved from chat",
      },
      owner: "You",
      savedAt: "Just now",
    }));
  const allInsights = [...sessionInsights, ...INSIGHTS.filter((insight) => !sessionInsights.some((s) => s.id === insight.id))];
  const insightById = new Map(allInsights.map((insight) => [insight.id, insight]));
  // Edited finding markdown, kept for the session so edits persist while browsing.
  const [edits, setEdits] = useState<Record<string, string>>({});
  const findingOf = (id: string) => edits[id] ?? insightById.get(id)?.finding ?? "";

  const q = query.trim().toLowerCase();
  const matches = (s: string) => q === "" || s.toLowerCase().includes(q);
  const shown = allInsights.filter((i) =>
    matches(i.title) || matches(i.finding) || matches(i.implication) || matches(i.source.label));
  const openInsight = openId ? insightById.get(openId) : undefined;

  useEffect(() => {
    if (!initialOpenInsightId) return;
    if (insightById.has(initialOpenInsightId)) {
      setOpenId(initialOpenInsightId);
    }
    onInitialOpenHandled?.();
  }, [initialOpenInsightId, insightById, onInitialOpenHandled]);

  return (
    <div className="flex h-full flex-col">
      <div className="flex flex-col gap-1 px-6 pt-6">
        <h1 className="text-xl font-semibold text-foreground">Insights</h1>
        <p className="text-sm text-foreground-secondary">
          Findings the team has saved to the shared brain — each with what it means and where it came from.
        </p>
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-3 overflow-y-auto px-6 py-4">
        <FilterBar>
          <div className="relative">
            <RiSearchLine className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search insights" className="h-9 w-64 pl-8" />
          </div>
          <div className="ml-auto inline-flex rounded-lg border border-border bg-muted p-0.5">
            {([["cards", RiLayoutGridLine], ["list", RiListUnordered]] as const).map(([v, Icon]) => (
              <button
                key={v}
                onClick={() => setView(v)}
                title={v === "cards" ? "Card view" : "List view"}
                className={cn(
                  "flex size-7 items-center justify-center rounded-md transition-colors",
                  view === v ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
                )}
              >
                <Icon className="size-4" />
              </button>
            ))}
          </div>
        </FilterBar>

        {shown.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-muted/20 px-4 py-10 text-center">
            <p className="text-sm text-muted-foreground">No insights match your search.</p>
          </div>
        ) : view === "cards" ? (
          <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
            {shown.map((i) => {
              const SrcIcon = i.source.kind === "chat" ? RiMessage2Line : RiGroupLine;
              return (
                <button
                  key={i.id}
                  onClick={() => setOpenId(i.id)}
                  className="flex flex-col gap-2 rounded-xl border border-border bg-card p-4 text-left transition-colors hover:border-primary/40 hover:shadow-sm"
                >
                  <div className="flex items-center gap-2">
                    <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <RiLightbulbLine className="size-4" />
                    </span>
                    <span className="min-w-0 flex-1 text-sm font-semibold text-foreground">{i.title}</span>
                  </div>
                  <p className="line-clamp-2 text-sm text-foreground-secondary">{previewText(findingOf(i.id))}</p>
                  <div className="mt-auto flex flex-wrap items-center gap-x-2 gap-y-1 pt-1 text-xs text-muted-foreground">
                    <span className="inline-flex min-w-0 items-center gap-1">
                      <SrcIcon className="size-3.5 shrink-0" /><span className="truncate">{i.source.label}</span>
                    </span>
                    <span className="text-border">·</span>
                    <span className="inline-flex items-center gap-1"><RiTimeLine className="size-3.5" />{i.savedAt}</span>
                  </div>
                </button>
              );
            })}
          </div>
        ) : (
          <div className="flex flex-col divide-y divide-border overflow-hidden rounded-xl border border-border">
            {shown.map((i) => {
              const SrcIcon = i.source.kind === "chat" ? RiMessage2Line : RiGroupLine;
              return (
                <button
                  key={i.id}
                  onClick={() => setOpenId(i.id)}
                  className="flex items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-accent/50"
                >
                  <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <RiLightbulbLine className="size-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-foreground">{i.title}</p>
                    <p className="truncate text-xs text-muted-foreground">{previewText(findingOf(i.id))}</p>
                  </div>
                  <span className="hidden min-w-0 max-w-[12rem] shrink-0 items-center gap-1 text-xs text-muted-foreground sm:inline-flex">
                    <SrcIcon className="size-3.5 shrink-0" /><span className="truncate">{i.source.label}</span>
                  </span>
                  <span className="shrink-0 text-xs tabular-nums text-muted-foreground">{i.savedAt}</span>
                </button>
              );
            })}
          </div>
        )}

        <p className="text-sm text-muted-foreground">Displaying {shown.length} of {allInsights.length} insights</p>
      </div>

      {openInsight && openId && (
        <InsightDrawer
          insight={openInsight}
          finding={findingOf(openId)}
          onChangeFinding={(md) => setEdits((e) => ({ ...e, [openId]: md }))}
          onClose={() => setOpenId(null)}
          onOpenSource={onOpenSource}
          spaceOptions={spaceOptions}
          onAddToSpace={(spaceId) => onAddToSpace?.(spaceId, openInsight)}
        />
      )}
    </div>
  );
}

