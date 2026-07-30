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
import { Textarea } from "@/components/ui/Textarea";
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
  RiMessage2Line, RiLayoutGridLine, RiCloseLine, RiFullscreenLine, RiFullscreenExitLine,
} from "@remixicon/react";
import {
  BRAIN_GROUPS, ENTITY_META, foldersForEntity, groupsForEntity,
  type BrainGroup, type OutputEntity,
} from "../lexi-shared-brain/data";
import type { DefRef } from "@/data/def-registry";
import { getDef } from "@/data/def-registry";
import { MOCK_DEFINITIONS, MOCK_METRICS, type EntityType } from "@/data/definitions-mock";
import { CHANNEL_REVENUE_BAR, REVENUE_TREND } from "@/data/mock";
import { sourceFields, customDefs, type DefRow } from "./definitions-data";
import { TypeLabel, DefinitionDrawer } from "./DefinitionDetail";
import { INSIGHTS, previewText, type Insight, type SourceRef } from "./insights-data";
import { InsightDrawer } from "./InsightDetail";
import { BENCHMARKS } from "./benchmarks-data";
import { MasterKpisDashboard } from "./dashboards/MasterKpisDashboard";
import { EnhancedRfmDashboard } from "./dashboards/EnhancedRfmDashboard";
import { GeneralReportingDashboard } from "./dashboards/GeneralReportingDashboard";
import { useSession } from "./store";
import { DUMMY_SEGMENTS } from "./segment-dummy-data";
import { ConditionComposer } from "./components/ConditionComposer";
import { buildConditionMenuGroups } from "./condition-menu-groups";
import { ReasoningBlock, type SegmentConfirmedPayload } from "./components/ReasoningBlock";
import type { ReasoningAssumption } from "./types";

const SEGMENT_DEMO_PROMPT = "High value customers that live in au but not usa and buy shirts";
const RECURRING_LIST_ACTION_HINT: Record<"append" | "maintain" | "update", string> = {
  append: "Adds new customers to your current list without removing existing members.",
  maintain: "Keeps your current list structure and refreshes eligible members each run.",
  update: "Rebuilds the full list each run so membership always reflects the latest segment state.",
};

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
  onOpenActivationPage,
}: {
  onOpenSegment?: (id: string) => void;
  onStartSegmentWorkflow?: () => void;
  onOpenActivationPage?: (id: string) => void;
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
  const [builderMounted, setBuilderMounted] = useState(false);
  const [builderOpen, setBuilderOpen] = useState(false);
  const [builderFullScreen, setBuilderFullScreen] = useState(false);
  const [builderName, setBuilderName] = useState("");
  const [builderPurpose, setBuilderPurpose] = useState("");
  const [builderPopulation, setBuilderPopulation] = useState("2,840");
  const [builderCriteria, setBuilderCriteria] = useState("Last purchase within 180 days\nAOV greater than $100\nEmail consent is opted in");
  const [builderPromptInput, setBuilderPromptInput] = useState("");
  const [builderConditions, setBuilderConditions] = useState<string[]>([]);
  const [builderReasoningGoal, setBuilderReasoningGoal] = useState("");
  const [builderReasoningAssumptions, setBuilderReasoningAssumptions] = useState<ReasoningAssumption[]>([]);
  const [builderReasoningVisible, setBuilderReasoningVisible] = useState(false);
  const [builderApprovedSaved, setBuilderApprovedSaved] = useState(false);
  const [builderApprovedPayload, setBuilderApprovedPayload] = useState<SegmentConfirmedPayload | null>(null);
  const [builderActivationPreview, setBuilderActivationPreview] = useState<{
    activationName: string;
    activationDescription: string;
    population: string;
    rules: string[];
  } | null>(null);
  const [builderShowActivationConnection, setBuilderShowActivationConnection] = useState(false);
  const [builderConnectionConfirmed, setBuilderConnectionConfirmed] = useState(false);
  const [builderActivationApprovedSent, setBuilderActivationApprovedSent] = useState(false);
  const [builderLatestActivationId, setBuilderLatestActivationId] = useState<string | null>(null);
  const [builderSelectedSourceId, setBuilderSelectedSourceId] = useState("src-meta");
  const [builderSelectedAccounts, setBuilderSelectedAccounts] = useState<string[]>([]);
  const [builderFieldRows, setBuilderFieldRows] = useState<Array<{ id: string; fieldType: string; selectedMatch: string }>>([
    { id: "map-email", fieldType: "email", selectedMatch: "email_98" },
    { id: "map-phone", fieldType: "phone", selectedMatch: "mobile_92" },
  ]);
  const [builderSendTiming, setBuilderSendTiming] = useState<"send-now" | "schedule-send">("send-now");
  const [builderSendCadence, setBuilderSendCadence] = useState<"once-off" | "re-occurring">("once-off");
  const [builderRecurringListAction, setBuilderRecurringListAction] = useState<"append" | "maintain" | "update">("maintain");
  const [builderRecurringHasEndDate, setBuilderRecurringHasEndDate] = useState<"yes" | "no">("no");
  const [builderScheduledStartDate, setBuilderScheduledStartDate] = useState("");
  const [builderScheduledStartTime, setBuilderScheduledStartTime] = useState("");
  const [builderRecurringSendTime, setBuilderRecurringSendTime] = useState("09:00");
  const [builderScheduledEndDate, setBuilderScheduledEndDate] = useState("");
  const [confirmBuilderCloseOpen, setConfirmBuilderCloseOpen] = useState(false);
  const [pendingBuilderExitAction, setPendingBuilderExitAction] = useState<"close" | "new-segment" | null>(null);
  const sessionSegmentRefs = useMemo<DefRef[]>(() => {
    return [...state.artifacts.values()]
      .filter((artifact) => artifact.type === "segment" && artifact.status === "saved" && artifact.body?.kind === "segment")
      .map((artifact) => ({
        id: artifact.id,
        kind: "segment" as const,
        name: artifact.name,
        entity: artifact.def?.entity ?? "customer",
        description: artifact.def?.description
          ?? (artifact.body?.kind === "segment" ? artifact.body.purpose : undefined)
          ?? "Segment",
        logic: artifact.def?.logic,
        stat: artifact.def?.stat,
      }));
  }, [state.artifacts]);
  const mentionGroups = useMemo(() => buildConditionMenuGroups(sessionSegmentRefs), [sessionSegmentRefs]);
  const builderSourceList = [
    { id: "src-meta", name: "Meta Ads" },
    { id: "src-klaviyo", name: "Klaviyo" },
    { id: "src-braze", name: "Braze" },
    { id: "src-google-ads", name: "Google Ads" },
    { id: "src-sfmc", name: "Salesforce Marketing Cloud" },
    { id: "src-amplitude", name: "Amplitude" },
  ];
  const builderAccountsBySource: Record<string, Array<{ id: string; name: string; region: "AU" | "NZ" | "USA" }>> = {
    "src-meta": [
      { id: "meta-au", name: "Meta AU account", region: "AU" },
      { id: "meta-nz", name: "Meta NZ account", region: "NZ" },
      { id: "meta-usa", name: "Meta USA account", region: "USA" },
    ],
    "src-klaviyo": [
      { id: "klaviyo-au", name: "Klaviyo AU account", region: "AU" },
      { id: "klaviyo-nz", name: "Klaviyo NZ account", region: "NZ" },
      { id: "klaviyo-usa", name: "Klaviyo USA account", region: "USA" },
    ],
    "src-braze": [
      { id: "braze-au", name: "Braze AU account", region: "AU" },
      { id: "braze-nz", name: "Braze NZ account", region: "NZ" },
      { id: "braze-usa", name: "Braze USA account", region: "USA" },
    ],
    "src-google-ads": [
      { id: "gads-au", name: "Google Ads AU account", region: "AU" },
      { id: "gads-nz", name: "Google Ads NZ account", region: "NZ" },
      { id: "gads-usa", name: "Google Ads USA account", region: "USA" },
    ],
    "src-sfmc": [
      { id: "sfmc-au", name: "SFMC AU account", region: "AU" },
      { id: "sfmc-nz", name: "SFMC NZ account", region: "NZ" },
      { id: "sfmc-usa", name: "SFMC USA account", region: "USA" },
    ],
    "src-amplitude": [
      { id: "amp-au", name: "Amplitude AU account", region: "AU" },
      { id: "amp-nz", name: "Amplitude NZ account", region: "NZ" },
      { id: "amp-usa", name: "Amplitude USA account", region: "USA" },
    ],
  };
  const builderFieldTypeOptions = [
    { value: "email", label: "Email" },
    { value: "phone", label: "Phone" },
    { value: "first-name", label: "First name" },
    { value: "last-name", label: "Last name" },
    { value: "country", label: "Country" },
  ] as const;
  const builderFieldMatchOptions: Record<string, Array<{ value: string; label: string }>> = {
    email: [
      { value: "email_98", label: "Email (98%)" },
      { value: "contact_email_84", label: "Contact Email (84%)" },
    ],
    phone: [
      { value: "phone_86", label: "Phone (86%)" },
      { value: "cell_79", label: "Cell (79%)" },
      { value: "mobile_92", label: "Mobile (92%)" },
    ],
    "first-name": [
      { value: "first_name_96", label: "First Name (96%)" },
      { value: "given_name_81", label: "Given Name (81%)" },
    ],
    "last-name": [
      { value: "last_name_95", label: "Last Name (95%)" },
      { value: "surname_82", label: "Surname (82%)" },
    ],
    country: [
      { value: "country_code_99", label: "Country Code (99%)" },
      { value: "country_name_93", label: "Country Name (93%)" },
    ],
  };
  const builderSelectedSourceAccounts = builderAccountsBySource[builderSelectedSourceId] ?? [];
  const builderSelectedSource = builderSourceList.find((source) => source.id === builderSelectedSourceId);
  const builderCanConfirmConnection = Boolean(builderSelectedSourceId)
    && builderSelectedAccounts.length > 0
    && builderFieldRows.every((row) => Boolean(row.fieldType) && Boolean(row.selectedMatch))
    && (builderSendTiming !== "schedule-send" || Boolean(builderScheduledStartDate))
    && (builderSendTiming !== "schedule-send" || Boolean(builderScheduledStartTime))
    && (builderSendCadence !== "re-occurring" || Boolean(builderRecurringSendTime))
    && !(builderSendCadence === "re-occurring"
      && builderRecurringHasEndDate === "yes"
      && !builderScheduledEndDate);
  const entity: OutputEntity = "customer";
  const groups = foldersForEntity("customer");

  const openSegmentBuilder = () => {
    setBuilderName("");
    setBuilderPurpose("");
    setBuilderPopulation("2,840");
    setBuilderCriteria("Last purchase within 180 days\nAOV greater than $100\nEmail consent is opted in");
    setBuilderPromptInput(SEGMENT_DEMO_PROMPT);
    setBuilderConditions([]);
    setBuilderReasoningGoal("");
    setBuilderReasoningAssumptions([]);
    setBuilderReasoningVisible(false);
    setBuilderApprovedSaved(false);
    setBuilderApprovedPayload(null);
    setBuilderActivationPreview(null);
    setBuilderShowActivationConnection(false);
    setBuilderConnectionConfirmed(false);
    setBuilderActivationApprovedSent(false);
    setBuilderLatestActivationId(null);
    setBuilderSelectedSourceId("src-meta");
    setBuilderSelectedAccounts([]);
    setBuilderFieldRows([
      { id: "map-email", fieldType: "email", selectedMatch: "email_98" },
      { id: "map-phone", fieldType: "phone", selectedMatch: "mobile_92" },
    ]);
    setBuilderSendTiming("send-now");
    setBuilderSendCadence("once-off");
    setBuilderRecurringListAction("maintain");
    setBuilderRecurringHasEndDate("no");
    setBuilderScheduledStartDate("");
    setBuilderScheduledStartTime("");
    setBuilderRecurringSendTime("09:00");
    setBuilderScheduledEndDate("");
    setBuilderMounted(true);
    setBuilderOpen(false);
    setBuilderFullScreen(false);
  };

  const applyBuilderCondition = () => {
    const next = builderPromptInput.trim();
    if (!next) return;
    setBuilderConditions((prev) => [...prev, next]);
    setBuilderPromptInput("");
    setBuilderApprovedSaved(false);
    setBuilderApprovedPayload(null);
    setBuilderActivationPreview(null);
    setBuilderShowActivationConnection(false);
    setBuilderConnectionConfirmed(false);
    setBuilderActivationApprovedSent(false);
    setBuilderLatestActivationId(null);
  };

  const removeBuilderCondition = (index: number) => {
    setBuilderConditions((prev) => prev.filter((_, i) => i !== index));
    setBuilderApprovedSaved(false);
    setBuilderApprovedPayload(null);
    setBuilderActivationPreview(null);
    setBuilderShowActivationConnection(false);
    setBuilderConnectionConfirmed(false);
    setBuilderActivationApprovedSent(false);
    setBuilderLatestActivationId(null);
  };

  const closeSegmentBuilder = () => {
    setBuilderOpen(false);
  };

  const saveApprovedSegment = (payload: SegmentConfirmedPayload) => {
    const criteria = payload.assumptions
      .filter((assumption) => !assumption.label.toLowerCase().includes("population"))
      .map((assumption) => {
        const label = assumption.label.trim();
        const value = assumption.value.trim();
        return value ? `${label} ${value}` : label;
      })
      .filter(Boolean);

    const description = payload.description.trim() || payload.purpose.trim() || "Segment created from the Segments builder.";
    const population = payload.population.trim() || "2,840";

    dispatch({
      type: "ADD_ARTIFACT",
      artifact: {
        id: payload.id,
        type: "segment",
        name: payload.name.trim() || "New segment",
        status: "saved",
        savedAt: new Date().toISOString(),
        def: {
          id: payload.id,
          kind: "segment",
          name: payload.name.trim() || "New segment",
          entity: "customer",
          description,
        },
        body: {
          kind: "segment",
          criteria: criteria.length > 0 ? criteria : ["No criteria added yet"],
          population,
          purpose: payload.purpose.trim() || description,
        },
      },
    });

    setBuilderApprovedSaved(true);
    setBuilderApprovedPayload(payload);
    setBuilderActivationPreview(null);
    setBuilderShowActivationConnection(false);
    setBuilderConnectionConfirmed(false);
    setBuilderActivationApprovedSent(false);
    setBuilderLatestActivationId(null);
  };

  const requestCloseSegmentBuilder = () => {
    setPendingBuilderExitAction("close");
    setConfirmBuilderCloseOpen(true);
  };

  const requestBuildNewSegment = () => {
    if (builderApprovedSaved) {
      openSegmentBuilder();
      return;
    }
    setPendingBuilderExitAction("new-segment");
    setConfirmBuilderCloseOpen(true);
  };

  const handleConfirmSegmentBuilderClose = () => {
    if (pendingBuilderExitAction === "new-segment") {
      openSegmentBuilder();
    } else {
      closeSegmentBuilder();
    }
    setPendingBuilderExitAction(null);
    setConfirmBuilderCloseOpen(false);
  };

  const resolveMentionTokens = (value: string) => value.replace(/\[\[([^\]]+)\]\]/g, (_match, tokenId: string) => {
    const def = getDef(tokenId.trim());
    return def?.name ?? tokenId.trim();
  });

  const activateApprovedSegment = () => {
    if (!builderApprovedPayload) return;

    const rules = builderApprovedPayload.assumptions
      .filter((assumption) => !assumption.label.toLowerCase().includes("population"))
      .map((assumption) => {
        const label = resolveMentionTokens(assumption.label.trim());
        const value = resolveMentionTokens(assumption.value.trim());
        return value ? `${label} ${value}` : label;
      })
      .filter(Boolean);

    const segmentName = builderApprovedPayload.name.trim() || "New segment";
    const activationName = `${segmentName} Activation`;
    const activationDescription = builderApprovedPayload.description.trim()
      || builderApprovedPayload.purpose.trim()
      || `Activation from Segment: ${segmentName}`;

    setBuilderActivationPreview({
      activationName,
      activationDescription,
      population: builderApprovedPayload.population.trim() || "2,840",
      rules,
    });
    setBuilderShowActivationConnection(false);
    setBuilderConnectionConfirmed(false);
    setBuilderActivationApprovedSent(false);
    setBuilderLatestActivationId(null);
  };

  const approveAndSendActivationFromSegmentBuilder = () => {
    if (!builderActivationPreview || builderActivationApprovedSent) return;

    const activationId = `ac-${Date.now()}`;
    const timestamp = new Date().toISOString();
    const dateLabel = new Date().toLocaleDateString("en-AU", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
    const activationStatus = builderSendCadence === "re-occurring"
      ? (builderSendTiming === "schedule-send" ? "scheduled" : "live")
      : (builderSendTiming === "schedule-send" ? "scheduled" : "sent");
    const scheduledWhenLabel = builderScheduledStartDate
      ? `Scheduled · ${builderScheduledStartDate}${builderScheduledStartTime ? ` ${builderScheduledStartTime}` : ""}`
      : "Scheduled";
    const segmentName = builderApprovedPayload?.name?.trim() || "New segment";

    dispatch({
      type: "ADD_ACTIVATION",
      activation: {
        id: activationId,
        createdAt: timestamp,
        name: builderActivationPreview.activationName,
        context: `From segment: ${segmentName}`,
        segmentId: builderApprovedPayload?.id,
        segmentName,
        channel: builderSelectedSource?.name ?? "Multi-channel",
        category: "MVP activation",
        skill: "Activation build",
        approval: { kind: "approved", by: "Izac", at: dateLabel },
        status: activationStatus,
        whenLabel: builderSendTiming === "schedule-send" ? scheduledWhenLabel : `Approved and sent · ${dateLabel}`,
        scheduledDate: builderSendTiming === "schedule-send" ? (builderScheduledStartDate || undefined) : undefined,
        recurringStartDate: builderSendCadence === "re-occurring"
          ? ((builderSendTiming === "schedule-send" ? builderScheduledStartDate : timestamp.slice(0, 10)) || undefined)
          : undefined,
        recurringEndDate: builderSendCadence === "re-occurring" && builderRecurringHasEndDate === "yes"
          ? (builderScheduledEndDate || undefined)
          : undefined,
        result: "Activation approved and sent from segment builder.",
        invocations: [
          {
            skill: "Activation build",
            params: `Segment ${segmentName} with ${builderSelectedAccounts.length} selected account(s)${builderSendCadence === "re-occurring" ? ` · List action: ${builderRecurringListAction}` : ""}`,
            result: "Sent",
          },
        ],
        trail: [
          { at: dateLabel, entry: "Activation connection confirmed." },
          { at: dateLabel, entry: "Approved and sent from segment builder." },
        ],
        mvpDetails: {
          population: builderActivationPreview.population,
          activationName: builderActivationPreview.activationName,
          activationDefinition: builderActivationPreview.activationDescription,
          segmentName,
          dataSource: builderSelectedSource?.name ?? "Not selected",
          accounts: builderSelectedSourceAccounts
            .filter((account) => builderSelectedAccounts.includes(account.id))
            .map((account) => account.name),
          fieldMapping: builderFieldRows.map((row) => {
            const fieldLabel = builderFieldTypeOptions.find((option) => option.value === row.fieldType)?.label ?? row.fieldType;
            const matchLabel = (builderFieldMatchOptions[row.fieldType] ?? []).find((option) => option.value === row.selectedMatch)?.label ?? row.selectedMatch;
            return `${fieldLabel} -> ${matchLabel}`;
          }),
          timing: builderSendTiming === "schedule-send" ? "Schedule Send" : "Send Now",
          cadence: builderSendCadence === "re-occurring" ? "Re-Occuring" : "Once Off",
          customers: [
            { id: `${activationId}-cust-1`, name: `${segmentName} - Ava Thompson`, meta: "AOV $142 · Last purchase 34 days ago" },
            { id: `${activationId}-cust-2`, name: `${segmentName} - Liam Nguyen`, meta: "AOV $129 · Last purchase 49 days ago" },
            { id: `${activationId}-cust-3`, name: `${segmentName} - Mia Rodriguez`, meta: "AOV $151 · Last purchase 62 days ago" },
          ],
        },
      },
    });

    setBuilderActivationApprovedSent(true);
    setBuilderLatestActivationId(activationId);
  };

  const buildReasoningAssumptions = (source: string[]): ReasoningAssumption[] => {
    const parseGenericAssumption = (entry: string, index: number): ReasoningAssumption | null => {
      const cleaned = entry.replace(/[.]+$/, "").trim();
      if (!cleaned) return null;

      if (/^country\s+is\s+new\s+zealand$/i.test(cleaned)) {
        return {
          id: `seg-assumption-${index}`,
          label: "Country is New Zealand",
          value: "",
        };
      }

      const pair = cleaned.match(/^(.+?)\s*(?:=|is|are|should be|to be)\s+(.+)$/i);
      if (pair) {
        return {
          id: `seg-assumption-${index}`,
          label: pair[1].trim(),
          value: pair[2].trim(),
        };
      }
      return {
        id: `seg-assumption-${index}`,
        label: `Assumption ${index + 1}`,
        value: cleaned,
      };
    };

    const fullText = source.join(" ").toLowerCase();
    const hasHighValue = /high\s*value/.test(fullText);
    const hasAustralia = /\b(australia|au)\b/.test(fullText);
    const hasNotUsa = /\b(not|exclude|without)\b[\s\S]*\b(united states|usa|us|u\.s\.a)\b/.test(fullText);
    const hasShirts = /\bshirts?\b/.test(fullText);

    if (hasHighValue && hasAustralia && hasNotUsa && hasShirts) {
      const baseAssumptions: ReasoningAssumption[] = [
        {
          id: "seg-assumption-high-value",
          label: "[[def-1]]",
          value: "is yes",
        },
        {
          id: "seg-assumption-country-au",
          label: "[[attr-1]]",
          value: "is Australia",
        },
        {
          id: "seg-assumption-country-us",
          label: "[[attr-1]]",
          value: "is not United States",
        },
        {
          id: "seg-assumption-product-type",
          label: "[[attr-18]]",
          value: "is Shirts",
        },
      ];

      const demoConditionPattern = /high\s*value[\s\S]*\b(australia|au)\b[\s\S]*\b(not|exclude|without)\b[\s\S]*\b(united states|usa|us|u\.s\.a)\b[\s\S]*\bshirts?\b/i;
      const additionalAssumptions = source
        .map((entry, index) => ({ entry, index }))
        .filter(({ entry }) => !demoConditionPattern.test(entry))
        .map(({ entry, index }) => parseGenericAssumption(entry, index + 100))
        .filter((item): item is ReasoningAssumption => Boolean(item));

      return [...baseAssumptions, ...additionalAssumptions];
    }

    return source
      .map((entry, index) => parseGenericAssumption(entry, index))
      .filter((item): item is ReasoningAssumption => Boolean(item));
  };

  const handleSegmentComposerConfirm = ({ committedConditions, committedInput }: { committedConditions: string[]; committedInput: string }) => {
    const assumptions = buildReasoningAssumptions(committedConditions);
    if (assumptions.length === 0) {
      setBuilderReasoningVisible(false);
      return;
    }
    const fullText = committedConditions.join(" ").toLowerCase();
    const isDemoPrompt = /high\s*value/.test(fullText)
      && /\b(australia|au)\b/.test(fullText)
      && /\b(not|exclude|without)\b[\s\S]*\b(united states|usa|us|u\.s\.a)\b/.test(fullText)
      && /\bshirts?\b/.test(fullText);
    const includesNewZealand = /\b(new\s*zealand|nz)\b/.test(fullText);

    setBuilderReasoningGoal(isDemoPrompt
      ? (includesNewZealand
        ? "Description: High Value Customers who live in Australia and New Zealand but not in the United States that buy shirts."
        : "Description: High Value Customers who live in Australia but not in the United States that buy shirts.")
      : committedInput.trim()
        || committedConditions.join(" and ")
        || "Build the segment from the validated assumptions below.");
    setBuilderReasoningAssumptions(assumptions);
    setBuilderReasoningVisible(true);
    setBuilderApprovedSaved(false);
    setBuilderApprovedPayload(null);
    setBuilderActivationPreview(null);
  };

  const saveSegmentFromBuilder = () => {
    const id = `seg-builder-${Date.now()}`;
    const name = builderName.trim() || "New segment";
    const description = builderPurpose.trim() || "Segment created from the Segments builder.";
    const typedCriteria = builderCriteria
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);
    const criteria = [...builderConditions, ...typedCriteria];

    dispatch({
      type: "ADD_ARTIFACT",
      artifact: {
        id,
        type: "segment",
        name,
        status: "saved",
        savedAt: new Date().toISOString(),
        def: {
          id,
          kind: "segment",
          name,
          entity: "customer",
          description,
        },
        body: {
          kind: "segment",
          criteria: criteria.length > 0 ? criteria : ["No criteria added yet"],
          population: builderPopulation.trim() || "2,840",
          purpose: description,
        },
      },
    });

    closeSegmentBuilder();
    onOpenSegment?.(id);
  };

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

  useEffect(() => {
    if (builderMounted) {
      requestAnimationFrame(() => setBuilderOpen(true));
    }
  }, [builderMounted]);

  return (
    <div className="relative flex h-full flex-col">
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
            onClick={openSegmentBuilder}
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
                  <TableCell className="font-medium tabular-nums text-foreground">{s.body?.kind === "segment" ? (s.body.population ?? "2,840") : "2,840"}</TableCell>
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

      {builderMounted ? (
        <div className="absolute inset-0 z-40 flex items-stretch">
          <div
            className={cn(
              "absolute inset-0 bg-background/40 backdrop-blur-sm transition-opacity duration-300",
              builderOpen ? "opacity-100" : "opacity-0 pointer-events-none",
            )}
            onClick={() => {
              if (!builderOpen) return;
              requestCloseSegmentBuilder();
            }}
          />
          <div
            className={cn(
              "relative flex h-full flex-col border-r border-border/70 bg-background shadow-2xl transition-all duration-300 ease-out",
              builderOpen ? "translate-x-0" : "-translate-x-full",
              builderFullScreen ? "w-full" : "w-[50vw] max-w-[720px]",
            )}
            onTransitionEnd={(event) => {
              if (!builderOpen && event.currentTarget === event.target) {
                setBuilderMounted(false);
                setBuilderFullScreen(false);
              }
            }}
          >
            <div className="flex items-center justify-between gap-3 border-b border-border/60 px-4 py-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-foreground">Build new segment</p>
                <p className="text-xs text-foreground-secondary">Segment workflow</p>
              </div>
              <div className="flex items-center gap-2">
                <Button size="icon" variant="ghost" onClick={() => setBuilderFullScreen((open) => !open)}>
                  {builderFullScreen ? <RiFullscreenExitLine className="size-4" /> : <RiFullscreenLine className="size-4" />}
                </Button>
                <Button size="icon" variant="ghost" onClick={requestCloseSegmentBuilder}>
                  <RiCloseLine className="size-4" />
                  <span className="sr-only">Close segment workflow</span>
                </Button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              <div className="space-y-4 rounded-2xl border border-border/70 bg-card p-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-foreground-secondary">Describe what you want to build</label>
                  <p className="text-xs text-muted-foreground">Add a full description or add conditions one by one.</p>
                  <ConditionComposer
                    value={builderPromptInput}
                    onValueChange={setBuilderPromptInput}
                    onApply={applyBuilderCondition}
                    placeholder="Example: Repeat customers from Australia with AOV above $120"
                    groups={mentionGroups}
                    conditions={builderConditions}
                    onRemoveCondition={removeBuilderCondition}
                    onClearConditions={() => {
                      setBuilderConditions([]);
                      setBuilderReasoningVisible(false);
                      setBuilderApprovedSaved(false);
                      setBuilderApprovedPayload(null);
                      setBuilderActivationPreview(null);
                      setBuilderShowActivationConnection(false);
                      setBuilderConnectionConfirmed(false);
                      setBuilderActivationApprovedSent(false);
                      setBuilderLatestActivationId(null);
                    }}
                    onConfirmAction={handleSegmentComposerConfirm}
                  />
                  {builderReasoningVisible ? (
                    <div className="mt-3">
                      <ReasoningBlock
                        goal={builderReasoningGoal}
                        assumptions={builderReasoningAssumptions}
                        onSegmentApprove={saveApprovedSegment}
                        onReject={() => {
                          setBuilderReasoningVisible(false);
                          setBuilderApprovedSaved(false);
                          setBuilderApprovedPayload(null);
                          setBuilderActivationPreview(null);
                          setBuilderShowActivationConnection(false);
                          setBuilderConnectionConfirmed(false);
                          setBuilderActivationApprovedSent(false);
                          setBuilderLatestActivationId(null);
                        }}
                        hideEditSegmentAction
                        hideActivateAction
                      />
                    </div>
                  ) : null}

                  {builderActivationPreview ? (
                    <div className="rounded-xl border border-border bg-card p-3.5">
                      <div className="flex items-center gap-2">
                        <span className="rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">
                          MVP activation build
                        </span>
                      </div>

                      <div className="mt-3 rounded-xl border border-border bg-background px-4 py-3">
                        <p className="text-xs font-medium uppercase tracking-normal text-muted-foreground">Population volume</p>
                        <p className="mt-1 text-2xl font-semibold tabular-nums text-foreground">{builderActivationPreview.population}</p>
                      </div>

                      <div className="mt-3 rounded-xl border border-border bg-background p-3">
                        <p className="text-xs font-medium uppercase tracking-normal text-muted-foreground">Activation name</p>
                        <p className="mt-2 text-sm font-medium text-foreground">{builderActivationPreview.activationName}</p>
                      </div>

                      <div className="mt-3 rounded-xl border border-border bg-background p-3">
                        <p className="text-xs font-medium uppercase tracking-normal text-muted-foreground">Activation description</p>
                        <p className="mt-2 text-sm text-foreground-secondary">{builderActivationPreview.activationDescription}</p>
                      </div>

                      <div className="mt-3 rounded-xl border border-border bg-background p-3">
                        <p className="text-xs font-medium uppercase tracking-normal text-muted-foreground">Segment contains</p>
                        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-foreground-secondary">
                          {builderActivationPreview.rules.map((rule, index) => (
                            <li key={`segment-activation-preview-rule-${index}`}>{rule}</li>
                          ))}
                        </ul>
                      </div>

                      <div className="mt-3 flex justify-end">
                        <button
                          type="button"
                          onClick={() => setBuilderShowActivationConnection(true)}
                          className="rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90"
                        >
                          Confirm
                        </button>
                      </div>

                      {builderShowActivationConnection ? (
                        <>
                          <div className="mt-3 grid gap-3 md:grid-cols-2">
                            <div className="rounded-xl border border-border bg-background p-3">
                              <p className="text-xs font-medium uppercase tracking-normal text-muted-foreground">Connected data sources</p>
                              <div className="mt-2 max-h-44 overflow-y-auto space-y-2 pr-1">
                                {builderSourceList.map((source) => {
                                  const selected = source.id === builderSelectedSourceId;
                                  return (
                                    <button
                                      key={source.id}
                                      type="button"
                                      onClick={() => {
                                        setBuilderSelectedSourceId(source.id);
                                        setBuilderSelectedAccounts([]);
                                        setBuilderConnectionConfirmed(false);
                                        setBuilderActivationApprovedSent(false);
                                      }}
                                      className={cn(
                                        "w-full rounded-lg border px-3 py-2 text-left text-sm transition-colors",
                                        selected
                                          ? "border-primary/60 bg-primary/10 text-foreground"
                                          : "border-border bg-card text-foreground hover:bg-accent",
                                      )}
                                    >
                                      {source.name}
                                    </button>
                                  );
                                })}
                              </div>
                            </div>

                            <div className="rounded-xl border border-border bg-background p-3">
                              <p className="text-xs font-medium uppercase tracking-normal text-muted-foreground">Accounts (multi select)</p>
                              <div className="mt-2 space-y-2">
                                {builderSelectedSourceAccounts.map((account) => {
                                  const checked = builderSelectedAccounts.includes(account.id);
                                  return (
                                    <label key={account.id} className="flex items-center gap-2 rounded-lg border border-border/70 bg-card px-2.5 py-2 text-sm text-foreground">
                                      <input
                                        type="checkbox"
                                        checked={checked}
                                        onChange={() => {
                                          setBuilderSelectedAccounts((prev) => (
                                            prev.includes(account.id)
                                              ? prev.filter((item) => item !== account.id)
                                              : [...prev, account.id]
                                          ));
                                          setBuilderConnectionConfirmed(false);
                                          setBuilderActivationApprovedSent(false);
                                        }}
                                        className="size-4"
                                      />
                                      <span className="flex-1">{account.name}</span>
                                      <span className="text-xs text-muted-foreground">{account.region}</span>
                                    </label>
                                  );
                                })}
                              </div>
                            </div>
                          </div>

                          <div className="mt-3 rounded-xl border border-border bg-background p-3">
                            <p className="text-xs font-medium uppercase tracking-normal text-muted-foreground">Field mapping</p>
                            <div className="mt-2 space-y-2">
                              {builderFieldRows.map((row) => (
                                <div key={row.id} className="grid gap-2 md:grid-cols-[170px_1fr] md:items-center">
                                  <select
                                    value={row.fieldType}
                                    onChange={(event) => {
                                      const nextFieldType = event.target.value;
                                      const defaultMatch = builderFieldMatchOptions[nextFieldType]?.[0]?.value ?? "";
                                      setBuilderFieldRows((prev) => prev.map((item) => (
                                        item.id === row.id
                                          ? { ...item, fieldType: nextFieldType, selectedMatch: defaultMatch }
                                          : item
                                      )));
                                      setBuilderConnectionConfirmed(false);
                                      setBuilderActivationApprovedSent(false);
                                    }}
                                    className="h-9 w-full rounded-lg border border-input bg-card px-3 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring/40"
                                  >
                                    {builderFieldTypeOptions.map((option) => (
                                      <option key={option.value} value={option.value}>{option.label}</option>
                                    ))}
                                  </select>
                                  <select
                                    value={row.selectedMatch}
                                    onChange={(event) => {
                                      const next = event.target.value;
                                      setBuilderFieldRows((prev) => prev.map((item) => (item.id === row.id ? { ...item, selectedMatch: next } : item)));
                                      setBuilderConnectionConfirmed(false);
                                      setBuilderActivationApprovedSent(false);
                                    }}
                                    className="h-9 w-full rounded-lg border border-input bg-card px-3 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring/40"
                                  >
                                    {(builderFieldMatchOptions[row.fieldType] ?? []).map((option) => (
                                      <option key={option.value} value={option.value}>{option.label}</option>
                                    ))}
                                  </select>
                                </div>
                              ))}
                            </div>

                            <div className="mt-3 flex flex-wrap justify-end gap-2">
                              <button
                                type="button"
                                onClick={() => {
                                  setBuilderFieldRows((prev) => ([
                                    ...prev,
                                    {
                                      id: `map-extra-${prev.length + 1}`,
                                      fieldType: "email",
                                      selectedMatch: "email_98",
                                    },
                                  ]));
                                  setBuilderConnectionConfirmed(false);
                                  setBuilderActivationApprovedSent(false);
                                }}
                                className="rounded-lg border border-border bg-card px-3 py-1.5 text-sm font-medium text-foreground hover:bg-accent"
                              >
                                Add More Fields
                              </button>
                            </div>
                          </div>

                          <div className="mt-3 rounded-xl border border-border bg-background p-3">
                            <p className="text-xs font-medium uppercase tracking-normal text-muted-foreground">Frequency</p>
                            <div className="mt-2 grid grid-cols-2 gap-2">
                              <button
                                type="button"
                                onClick={() => {
                                  setBuilderSendTiming("send-now");
                                  setBuilderConnectionConfirmed(false);
                                  setBuilderActivationApprovedSent(false);
                                }}
                                className={cn(
                                  "rounded-lg border px-3 py-2 text-sm font-medium transition-colors",
                                  builderSendTiming === "send-now"
                                    ? "border-primary/60 bg-primary/10 text-foreground"
                                    : "border-border bg-card text-foreground hover:bg-accent",
                                )}
                              >
                                Send Now
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setBuilderSendTiming("schedule-send");
                                  setBuilderConnectionConfirmed(false);
                                  setBuilderActivationApprovedSent(false);
                                }}
                                className={cn(
                                  "rounded-lg border px-3 py-2 text-sm font-medium transition-colors",
                                  builderSendTiming === "schedule-send"
                                    ? "border-primary/60 bg-primary/10 text-foreground"
                                    : "border-border bg-card text-foreground hover:bg-accent",
                                )}
                              >
                                Schedule Send
                              </button>
                            </div>

                            {builderSendTiming === "schedule-send" ? (
                              <div className="mt-3 rounded-lg border border-border/70 bg-card p-3">
                                <p className="text-xs font-medium uppercase tracking-normal text-muted-foreground">Scheduled send</p>
                                <div className="mt-2 grid gap-3 sm:grid-cols-2">
                                  <div>
                                    <label className="text-xs font-medium text-foreground-secondary" htmlFor="segment-builder-activation-start-date">Date</label>
                                    <input
                                      id="segment-builder-activation-start-date"
                                      type="date"
                                      value={builderScheduledStartDate}
                                      onChange={(event) => {
                                        setBuilderScheduledStartDate(event.target.value);
                                        setBuilderConnectionConfirmed(false);
                                        setBuilderActivationApprovedSent(false);
                                      }}
                                      className="mt-1 h-9 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring/40"
                                    />
                                  </div>
                                  <div>
                                    <label className="text-xs font-medium text-foreground-secondary" htmlFor="segment-builder-activation-start-time">Time</label>
                                    <input
                                      id="segment-builder-activation-start-time"
                                      type="time"
                                      value={builderScheduledStartTime}
                                      onChange={(event) => {
                                        setBuilderScheduledStartTime(event.target.value);
                                        setBuilderConnectionConfirmed(false);
                                        setBuilderActivationApprovedSent(false);
                                      }}
                                      className="mt-1 h-9 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring/40"
                                    />
                                  </div>
                                </div>
                              </div>
                            ) : null}

                            <div className="mt-2 grid grid-cols-1 gap-2">
                              <button
                                type="button"
                                onClick={() => {
                                  const nextCadence = builderSendCadence === "re-occurring" ? "once-off" : "re-occurring";
                                  setBuilderSendCadence(nextCadence);
                                  if (nextCadence !== "re-occurring") {
                                    setBuilderRecurringHasEndDate("no");
                                    setBuilderScheduledEndDate("");
                                  }
                                  setBuilderConnectionConfirmed(false);
                                  setBuilderActivationApprovedSent(false);
                                }}
                                className={cn(
                                  "rounded-lg border px-3 py-2 text-sm font-medium transition-colors",
                                  builderSendCadence === "re-occurring"
                                    ? "border-primary/60 bg-primary/10 text-foreground"
                                    : "border-border bg-card text-foreground hover:bg-accent",
                                )}
                              >
                                Re-Occuring
                              </button>
                            </div>

                            {builderSendCadence === "re-occurring" ? (
                              <div className="mt-3 rounded-lg border border-border/70 bg-card p-3">
                                <p className="text-xs font-medium uppercase tracking-normal text-muted-foreground">Recurring setup</p>
                                <div className="mt-2">
                                  <label className="text-xs font-medium text-foreground-secondary" htmlFor="segment-builder-list-action">List action</label>
                                  <select
                                    id="segment-builder-list-action"
                                    value={builderRecurringListAction}
                                    onChange={(event) => {
                                      setBuilderRecurringListAction(event.target.value as "append" | "maintain" | "update");
                                      setBuilderConnectionConfirmed(false);
                                      setBuilderActivationApprovedSent(false);
                                    }}
                                    className="mt-1 h-9 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring/40"
                                  >
                                    <option value="append">Append</option>
                                    <option value="maintain">Maintain</option>
                                    <option value="update">Update</option>
                                  </select>
                                  <p className="mt-1 text-xs text-muted-foreground">{RECURRING_LIST_ACTION_HINT[builderRecurringListAction]}</p>
                                </div>
                                <div className="mt-3">
                                  <label className="text-xs font-medium text-foreground-secondary" htmlFor="segment-builder-recurring-time">Preferred daily send time</label>
                                  <input
                                    id="segment-builder-recurring-time"
                                    type="time"
                                    value={builderRecurringSendTime}
                                    onChange={(event) => {
                                      setBuilderRecurringSendTime(event.target.value);
                                      setBuilderConnectionConfirmed(false);
                                      setBuilderActivationApprovedSent(false);
                                    }}
                                    className="mt-1 h-9 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring/40"
                                  />
                                </div>
                                <div className="mt-3">
                                  <p className="text-xs font-medium text-foreground-secondary">Is there an end date?</p>
                                  <div className="mt-2 grid grid-cols-2 gap-2">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setBuilderRecurringHasEndDate("yes");
                                        setBuilderConnectionConfirmed(false);
                                        setBuilderActivationApprovedSent(false);
                                      }}
                                      className={cn(
                                        "rounded-lg border px-3 py-2 text-sm font-medium transition-colors",
                                        builderRecurringHasEndDate === "yes"
                                          ? "border-primary/60 bg-primary/10 text-foreground"
                                          : "border-border bg-background text-foreground hover:bg-accent",
                                      )}
                                    >
                                      Yes
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setBuilderRecurringHasEndDate("no");
                                        setBuilderScheduledEndDate("");
                                        setBuilderConnectionConfirmed(false);
                                        setBuilderActivationApprovedSent(false);
                                      }}
                                      className={cn(
                                        "rounded-lg border px-3 py-2 text-sm font-medium transition-colors",
                                        builderRecurringHasEndDate === "no"
                                          ? "border-primary/60 bg-primary/10 text-foreground"
                                          : "border-border bg-background text-foreground hover:bg-accent",
                                      )}
                                    >
                                      No
                                    </button>
                                  </div>
                                </div>

                                {builderRecurringHasEndDate === "yes" ? (
                                  <div className="mt-3">
                                    <label className="text-xs font-medium text-foreground-secondary" htmlFor="segment-builder-activation-end-date">End date</label>
                                    <input
                                      id="segment-builder-activation-end-date"
                                      type="date"
                                      value={builderScheduledEndDate}
                                      onChange={(event) => {
                                        setBuilderScheduledEndDate(event.target.value);
                                        setBuilderConnectionConfirmed(false);
                                        setBuilderActivationApprovedSent(false);
                                      }}
                                      className="mt-1 h-9 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring/40"
                                    />
                                  </div>
                                ) : null}
                              </div>
                            ) : null}

                            <div className="mt-3 flex justify-end">
                              <button
                                type="button"
                                onClick={() => setBuilderConnectionConfirmed(true)}
                                disabled={!builderCanConfirmConnection}
                                className={cn(
                                  "rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
                                  builderCanConfirmConnection
                                    ? "bg-primary text-primary-foreground hover:bg-primary/90"
                                    : "cursor-not-allowed bg-muted text-muted-foreground",
                                )}
                              >
                                {builderConnectionConfirmed ? "Confirmed" : "Confirm"}
                              </button>
                            </div>
                          </div>

                          {builderConnectionConfirmed ? (
                            <>
                              <div className="mt-3 rounded-xl border border-primary/30 bg-primary/5 p-3">
                                <p className="text-xs font-medium uppercase tracking-normal text-muted-foreground">Activation confirmation</p>
                                <div className="mt-2 space-y-2 text-sm">
                                  <p className="text-foreground"><span className="font-medium">Activation name:</span> {builderActivationPreview.activationName}</p>
                                  <p className="text-foreground"><span className="font-medium">Activation definition:</span> {builderActivationPreview.activationDescription}</p>
                                  <p className="text-foreground"><span className="font-medium">Population:</span> {builderActivationPreview.population}</p>
                                  <p className="text-foreground"><span className="font-medium">Data source:</span> {builderSelectedSource?.name ?? "Not selected"}</p>
                                </div>
                              </div>
                              <div className="mt-3 flex justify-end">
                                <button
                                  type="button"
                                  onClick={approveAndSendActivationFromSegmentBuilder}
                                  disabled={builderActivationApprovedSent}
                                  className={cn(
                                    "rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
                                    builderActivationApprovedSent
                                      ? "cursor-not-allowed bg-muted text-muted-foreground"
                                      : "bg-primary text-primary-foreground hover:bg-primary/90",
                                  )}
                                >
                                  {builderActivationApprovedSent ? "Approved and Sent" : "Approve and Send"}
                                </button>
                              </div>

                            </>
                          ) : null}
                        </>
                      ) : null}
                    </div>
                  ) : null}
                </div>

              </div>
            </div>

            <div className="shrink-0 border-t border-border/60 px-4 py-3">
              <div className="flex items-center justify-end gap-2">
                <Button variant="outline" onClick={requestCloseSegmentBuilder}>Close</Button>
                <Button
                  variant="outline"
                  disabled={!builderReasoningVisible}
                  onClick={requestBuildNewSegment}
                >
                  Build a New Segment
                </Button>
                <Button
                  variant="outline"
                  disabled={!builderLatestActivationId}
                  onClick={() => {
                    if (!builderLatestActivationId) return;
                    closeSegmentBuilder();
                    onOpenActivationPage?.(builderLatestActivationId);
                  }}
                >
                  Go to Activation
                </Button>
                <Button
                  disabled={!builderApprovedSaved || Boolean(builderActivationPreview)}
                  onClick={activateApprovedSegment}
                >
                  Activate
                </Button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      <ConfirmDialog
        open={confirmBuilderCloseOpen}
        onOpenChange={(open) => {
          setConfirmBuilderCloseOpen(open);
          if (!open) setPendingBuilderExitAction(null);
        }}
        title={pendingBuilderExitAction === "new-segment"
          ? "Are you sure you want to build a new segment now?"
          : "Are you sure you want to close?"}
        description={pendingBuilderExitAction === "new-segment"
          ? "All work will be lost."
          : "All unsaved work will be lost."}
        confirmLabel="Yes"
        cancelLabel="Keep working"
        variant="destructive"
        onConfirm={handleConfirmSegmentBuilderClose}
        icon={RiCloseLine}
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
  const [query, setQuery] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<"all" | EntityType>("all");
  const [sortKey, setSortKey] = useState<"name" | "dataType" | "entity" | "detail">("name");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  const rows: DefRow[] = ENTITY_ORDER.flatMap((e) => sourceFields(e));

  const q = query.trim().toLowerCase();
  const matches = (s: string) => q === "" || s.toLowerCase().includes(q);
  const filtered = rows.filter((r) => (
    matches(r.name)
    || matches(r.description)
    || matches(r.detail)
    || matches(DEF_ENTITY_LABEL[r.entity])
  )).filter((r) => (categoryFilter === "all" ? true : r.entity === categoryFilter));

  const sorted = [...filtered].sort((a, b) => {
    const left = sortKey === "entity"
      ? DEF_ENTITY_LABEL[a.entity]
      : sortKey === "dataType"
        ? a.dataType
        : sortKey === "detail"
          ? a.detail
          : a.name;
    const right = sortKey === "entity"
      ? DEF_ENTITY_LABEL[b.entity]
      : sortKey === "dataType"
        ? b.dataType
        : sortKey === "detail"
          ? b.detail
          : b.name;
    const result = left.localeCompare(right, undefined, { numeric: true, sensitivity: "base" });
    if (result === 0) return a.name.localeCompare(b.name, undefined, { sensitivity: "base" });
    return sortDir === "asc" ? result : -result;
  });

  const toggleSort = (key: "name" | "dataType" | "entity" | "detail") => {
    if (sortKey === key) {
      setSortDir((prev) => (prev === "asc" ? "desc" : "asc"));
      return;
    }
    setSortKey(key);
    setSortDir("asc");
  };

  const sortState = (key: "name" | "dataType" | "entity" | "detail") => (
    sortKey === key ? sortDir : false
  );

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
        <div className="flex min-w-0 flex-1 flex-col gap-3 overflow-y-auto px-6 py-4">
          <FilterBar>
            <div className="relative">
              <RiSearchLine className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search definitions" className="h-9 w-64 pl-8" />
            </div>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value as "all" | EntityType)}
              className="h-9 rounded-lg border border-input-border bg-input px-3 text-sm text-foreground"
            >
              <option value="all">All categories</option>
              <option value="customer">Customer</option>
              <option value="product">Product</option>
              <option value="order">Transaction</option>
            </select>
          </FilterBar>

          <Table>
            <TableHeader>
              <TableRow>
                <SortableTableHead sort={sortState("name")} onSort={() => toggleSort("name")}>Field</SortableTableHead>
                <SortableTableHead className="w-32" sort={sortState("dataType")} onSort={() => toggleSort("dataType")}>Data type</SortableTableHead>
                <SortableTableHead className="w-36" sort={sortState("entity")} onSort={() => toggleSort("entity")}>Category</SortableTableHead>
                <SortableTableHead sort={sortState("detail")} onSort={() => toggleSort("detail")}>Source column</SortableTableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sorted.map((r) => (
                <TableRow key={r.id} className="cursor-pointer" onClick={() => setOpenId(r.id)}>
                  <TableCell>
                    <span className="font-medium text-foreground">{r.name}</span>
                    <p className="mt-0.5 max-w-sm truncate text-sm text-foreground-secondary">{r.description}</p>
                  </TableCell>
                  <TableCell><TypeLabel type={r.dataType} /></TableCell>
                  <TableCell>
                    <Badge variant="outline" size="sm">{DEF_ENTITY_LABEL[r.entity]}</Badge>
                  </TableCell>
                  <TableCell className="max-w-xs truncate font-mono text-xs text-foreground-secondary">{r.detail}</TableCell>
                </TableRow>
              ))}
              {sorted.length === 0 && (
                <TableRow><TableCell colSpan={4} className="py-10 text-center text-sm text-muted-foreground">No fields match these filters.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
          <p className="text-sm text-muted-foreground">
            Displaying {sorted.length} of {rows.length} fields
          </p>
        </div>
      </div>

      {openId && <DefinitionDrawer id={openId} onClose={() => setOpenId(null)} />}
    </div>
  );
}

export function MetricsPage() {
  const [query, setQuery] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<"all" | EntityType>("all");
  const [sortKey, setSortKey] = useState<"name" | "dataType" | "entity" | "detail">("name");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  const rows: DefRow[] = ENTITY_ORDER.flatMap((e) => customDefs(e));
  const q = query.trim().toLowerCase();
  const matches = (s: string) => q === "" || s.toLowerCase().includes(q);
  const filtered = rows.filter((r) => (
    matches(r.name)
    || matches(r.description)
    || matches(r.detail)
    || matches(DEF_ENTITY_LABEL[r.entity])
  )).filter((r) => (categoryFilter === "all" ? true : r.entity === categoryFilter));

  const sorted = [...filtered].sort((a, b) => {
    const left = sortKey === "entity"
      ? DEF_ENTITY_LABEL[a.entity]
      : sortKey === "dataType"
        ? a.dataType
        : sortKey === "detail"
          ? a.detail
          : a.name;
    const right = sortKey === "entity"
      ? DEF_ENTITY_LABEL[b.entity]
      : sortKey === "dataType"
        ? b.dataType
        : sortKey === "detail"
          ? b.detail
          : b.name;
    const result = left.localeCompare(right, undefined, { numeric: true, sensitivity: "base" });
    if (result === 0) return a.name.localeCompare(b.name, undefined, { sensitivity: "base" });
    return sortDir === "asc" ? result : -result;
  });

  const toggleSort = (key: "name" | "dataType" | "entity" | "detail") => {
    if (sortKey === key) {
      setSortDir((prev) => (prev === "asc" ? "desc" : "asc"));
      return;
    }
    setSortKey(key);
    setSortDir("asc");
  };

  const sortState = (key: "name" | "dataType" | "entity" | "detail") => (
    sortKey === key ? sortDir : false
  );

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
        <div className="flex min-w-0 flex-1 flex-col gap-3 overflow-y-auto px-6 py-4">
          <FilterBar>
            <div className="relative">
              <RiSearchLine className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search metrics" className="h-9 w-64 pl-8" />
            </div>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value as "all" | EntityType)}
              className="h-9 rounded-lg border border-input-border bg-input px-3 text-sm text-foreground"
            >
              <option value="all">All categories</option>
              <option value="customer">Customer</option>
              <option value="product">Product</option>
              <option value="order">Transaction</option>
            </select>
          </FilterBar>

          <Table>
            <TableHeader>
              <TableRow>
                <SortableTableHead sort={sortState("name")} onSort={() => toggleSort("name")}>Metric</SortableTableHead>
                <SortableTableHead className="w-32" sort={sortState("dataType")} onSort={() => toggleSort("dataType")}>Data type</SortableTableHead>
                <SortableTableHead className="w-36" sort={sortState("entity")} onSort={() => toggleSort("entity")}>Category</SortableTableHead>
                <SortableTableHead sort={sortState("detail")} onSort={() => toggleSort("detail")}>Logic</SortableTableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sorted.map((r) => (
                <TableRow key={r.id} className="cursor-pointer" onClick={() => setOpenId(r.id)}>
                  <TableCell>
                    <span className="font-medium text-foreground">{r.name}</span>
                    <p className="mt-0.5 max-w-sm truncate text-sm text-foreground-secondary">{r.description}</p>
                  </TableCell>
                  <TableCell><TypeLabel type={r.dataType} /></TableCell>
                  <TableCell>
                    <Badge variant="outline" size="sm">{DEF_ENTITY_LABEL[r.entity]}</Badge>
                  </TableCell>
                  <TableCell className="max-w-xs truncate font-mono text-xs text-foreground-secondary">{r.detail}</TableCell>
                </TableRow>
              ))}
              {sorted.length === 0 && (
                <TableRow><TableCell colSpan={4} className="py-10 text-center text-sm text-muted-foreground">No metrics match these filters.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
          <p className="text-sm text-muted-foreground">
            Displaying {sorted.length} of {rows.length} metrics
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
  const hiddenDashboards = new Set([
    "Engagement Health Monitor",
    "Hero Product Pulse",
    "Loyalty Performance Board",
    "Margin Guardrails",
    "Returns Risk Tracker",
  ]);

  const dashboardRows = useMemo(() => {
    const byDashboard = new Map<string, {
      name: string;
      kind: "benchmark" | "master-kpis" | "enhanced-rfm" | "general-reporting";
      benchmarks: Array<{ id: string; name: string; owner: string; updatedAt: string }>;
      examples: string[];
    }>();

    BENCHMARKS.forEach((benchmark) => {
      const dashboard = benchmark.tracking.find((item) => item.label === "Dashboard")?.value;
      if (!dashboard) return;

      const existing = byDashboard.get(dashboard) ?? {
        name: dashboard,
        kind: "benchmark" as const,
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

    const benchmarkRows = Array.from(byDashboard.values())
      .filter((dashboard) => !hiddenDashboards.has(dashboard.name))
      .sort((a, b) => a.name.localeCompare(b.name));
    return [
      {
        name: "Master KPIs",
        kind: "master-kpis" as const,
        benchmarks: [],
        examples: [],
      },
      {
        name: "Enhanced RFM",
        kind: "enhanced-rfm" as const,
        benchmarks: [],
        examples: [],
      },
      {
        name: "General Reporting",
        kind: "general-reporting" as const,
        benchmarks: [],
        examples: [],
      },
      ...benchmarkRows,
    ];
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
    if (!selectedDashboard || selectedDashboard.kind !== "benchmark") return [];
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
            selectedDashboard.kind === "master-kpis" ? (
              <MasterKpisDashboard />
            ) : selectedDashboard.kind === "enhanced-rfm" ? (
              <EnhancedRfmDashboard />
            ) : selectedDashboard.kind === "general-reporting" ? (
              <GeneralReportingDashboard />
            ) : (
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
            )
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

