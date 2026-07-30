/**
 * Activations — top-level destination.
 *
 * A flat, governed log of every execution event: the audit trail for "Act."
 * Mirrors the SegmentsPage skeleton (header + left status filter + sortable
 * table). Row click opens the Activation detail in the right inset side panel.
 *
 * Also exports `ActivationDetail` — the side-panel body (skills + params,
 * approval, outcome, decision trail).
 */
import { useEffect, useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Checkbox } from "@/components/ui/Checkbox";
import { FilterBar } from "@/components/ui/FilterBar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/Tabs";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/Table";
import ActivationFlowBlock from "./components/ActivationFlowBlock";
import { ConditionComposer } from "./components/ConditionComposer";
import { ReasoningBlock } from "./components/ReasoningBlock";
import {
  RiSearchLine, RiBroadcastLine, RiGroupLine, RiShieldCheckLine,
  RiPlayLine, RiTimeLine, RiFlag2Line, RiArrowRightSLine, RiPriceTag3Line,
  RiFullscreenLine, RiFullscreenExitLine, RiCloseLine,
} from "@remixicon/react";
import { getDef } from "@/data/def-registry";
import type { DefRef } from "@/data/def-registry";
import type { ContentBlock, ReasoningAssumption } from "./types";
import { ACTIVATION_STATUS_META, ALWAYS_AVAILABLE_ACTIVATION_ID, approvalLabel, getActivation, type Activation, type ActivationStatus } from "./activations-mock";
import { useSession } from "./store";
import { ConfirmDialog } from "@/components/ui/Dialog";
import { buildConditionMenuGroups } from "./condition-menu-groups";
import { DUMMY_SEGMENT_BY_ID } from "./segment-dummy-data";
import { BRAIN_GROUPS } from "../lexi-shared-brain/data";

const ACTIVATION_DEMO_PROMPT = "High value customers that live in au but not usa and buy shirts";
const RECURRING_LIST_ACTION_HINT: Record<"append" | "maintain" | "update", string> = {
  append: "Adds new customers to your current list without removing existing members.",
  maintain: "Keeps your current list structure and refreshes eligible members each run.",
  update: "Rebuilds the full list each run so membership always reflects the latest segment state.",
};

// ─── Page ──────────────────────────────────────────────────────────────────────

export function ActivationsPage({
  onOpenActivation,
  onStartActivationWorkflow,
  onOpenSegmentPage,
  prefillSegmentId,
  onPrefillComplete,
  initialStatusFilter,
}: {
  onOpenActivation?: (id: string) => void;
  onStartActivationWorkflow?: () => void;
  onOpenSegmentPage?: (id: string) => void;
  prefillSegmentId?: string;
  onPrefillComplete?: () => void;
  initialStatusFilter?: "all" | ActivationStatus;
}) {
  const { state, dispatch } = useSession();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<"all" | ActivationStatus>("all");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [confirmBulkDeleteOpen, setConfirmBulkDeleteOpen] = useState(false);

  const activations = useMemo(() => {
    const alwaysAvailable = getActivation(ALWAYS_AVAILABLE_ACTIVATION_ID);
    if (!alwaysAvailable) return state.activations;

    return state.activations.some((activation) => activation.id === alwaysAvailable.id)
      ? state.activations
      : [alwaysAvailable, ...state.activations];
  }, [state.activations]);
  const q = query.trim().toLowerCase();
  const matches = (s: string) => q === "" || s.toLowerCase().includes(q);
  const [flowBlocks, setFlowBlocks] = useState<Extract<ContentBlock, { type: "flow" }>[]>([]);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerMounted, setDrawerMounted] = useState(false);
  const [drawerFullScreen, setDrawerFullScreen] = useState(false);
  const [builderPromptInput, setBuilderPromptInput] = useState("");
  const [builderConditions, setBuilderConditions] = useState<string[]>([]);
  const [builderReasoningGoal, setBuilderReasoningGoal] = useState("");
  const [builderReasoningAssumptions, setBuilderReasoningAssumptions] = useState<ReasoningAssumption[]>([]);
  const [builderReasoningVisible, setBuilderReasoningVisible] = useState(false);
  const [builderSelectedSegmentId, setBuilderSelectedSegmentId] = useState<string | undefined>(undefined);
  const [builderSelectedSegmentName, setBuilderSelectedSegmentName] = useState<string>("");
  const [builderEditingActivationName, setBuilderEditingActivationName] = useState(false);
  const [builderEditingActivationDescription, setBuilderEditingActivationDescription] = useState(false);
  const [builderShowActivationConnection, setBuilderShowActivationConnection] = useState(false);
  const [builderConnectionConfirmed, setBuilderConnectionConfirmed] = useState(false);
  const [builderApprovalSent, setBuilderApprovalSent] = useState(false);
  const [builderLatestActivationId, setBuilderLatestActivationId] = useState<string | null>(null);
  const [builderVerifyBaselineAssumptions, setBuilderVerifyBaselineAssumptions] = useState<ReasoningAssumption[]>([]);
  const [builderAssumptionsChangedBeforeSend, setBuilderAssumptionsChangedBeforeSend] = useState(false);
  const [builderSegmentOfferDecision, setBuilderSegmentOfferDecision] = useState<"idle" | "saved" | "declined">("idle");
  const [builderSavedSegmentPreview, setBuilderSavedSegmentPreview] = useState<{
    id: string;
    name: string;
    description: string;
    population: string;
    criteria: string[];
  } | null>(null);
  const [builderSendTiming, setBuilderSendTiming] = useState<"send-now" | "schedule-send">("send-now");
  const [builderSendCadence, setBuilderSendCadence] = useState<"once-off" | "re-occurring">("once-off");
  const [builderRecurringListAction, setBuilderRecurringListAction] = useState<"append" | "maintain" | "update">("maintain");
  const [builderRecurringHasEndDate, setBuilderRecurringHasEndDate] = useState<"yes" | "no">("no");
  const [builderScheduledStartDate, setBuilderScheduledStartDate] = useState("");
  const [builderScheduledStartTime, setBuilderScheduledStartTime] = useState("");
  const [builderRecurringSendTime, setBuilderRecurringSendTime] = useState("09:00");
  const [builderScheduledEndDate, setBuilderScheduledEndDate] = useState("");
  const [builderSelectedSourceId, setBuilderSelectedSourceId] = useState("src-meta");
  const [builderSelectedAccounts, setBuilderSelectedAccounts] = useState<string[]>([]);
  const [builderFieldRows, setBuilderFieldRows] = useState<Array<{ id: string; fieldType: string; selectedMatch: string }>>([
    { id: "map-email", fieldType: "email", selectedMatch: "email_98" },
    { id: "map-phone", fieldType: "phone", selectedMatch: "mobile_92" },
  ]);
  const [builderActivationConfirmation, setBuilderActivationConfirmation] = useState<{
    segmentId?: string;
    activationName: string;
    activationDescription: string;
    population: string;
    rules: string[];
    committedText: string;
  } | null>(null);
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
  const segmentMentionGroups = useMemo(
    () => mentionGroups.filter((group) => group.label === "Segments"),
    [mentionGroups],
  );
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
  const builderHasSelectedSource = Boolean(builderSelectedSourceId);
  const builderHasSelectedAccounts = builderSelectedAccounts.length > 0;
  const builderHasValidFieldMappings = builderFieldRows.every((row) => Boolean(row.fieldType) && Boolean(row.selectedMatch));
  const builderRequiresStartDate = builderSendTiming === "schedule-send";
  const builderHasStartDate = !builderRequiresStartDate || Boolean(builderScheduledStartDate);
  const builderRequiresStartTime = builderSendTiming === "schedule-send";
  const builderHasStartTime = !builderRequiresStartTime || Boolean(builderScheduledStartTime);
  const builderRequiresEndDate = builderSendCadence === "re-occurring"
    && builderRecurringHasEndDate === "yes";
  const builderHasEndDate = !builderRequiresEndDate || Boolean(builderScheduledEndDate);
  const builderRequiresRecurringTime = builderSendCadence === "re-occurring";
  const builderHasRecurringTime = !builderRequiresRecurringTime || Boolean(builderRecurringSendTime);
  const builderCanConfirmActivationConnection = builderHasSelectedSource
    && builderHasSelectedAccounts
    && builderHasValidFieldMappings
    && builderHasStartDate
    && builderHasStartTime
    && builderHasRecurringTime
    && builderHasEndDate;

  const normalizeAssumptionForCompare = (assumption: ReasoningAssumption) => {
    const label = resolveMentionTokens(assumption.label.trim()).replace(/\s+/g, " ").toLowerCase();
    const value = resolveMentionTokens(assumption.value.trim()).replace(/\s+/g, " ").toLowerCase();
    return `${label}::${value}`;
  };

  const didAssumptionsChange = (before: ReasoningAssumption[], after: ReasoningAssumption[]) => {
    if (before.length !== after.length) return true;
    const left = before.map(normalizeAssumptionForCompare).join("||");
    const right = after.map(normalizeAssumptionForCompare).join("||");
    return left !== right;
  };

  const normalizeSegmentText = (value: string) =>
    value
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, " ")
      .replace(/\s+/g, " ")
      .trim();

  const segmentTextAliases: Record<string, string> = {
    "lapsed vip customer": "g-vip-at-risk",
    "lapsed vip customers": "g-vip-at-risk",
    "lapsed vip": "g-vip-at-risk",
    "vip at risk": "g-vip-at-risk",
    "vip at-risk": "g-vip-at-risk",
    "vip-at risk": "g-vip-at-risk",
    "at risk vip": "g-vip-at-risk",
    "at-risk vip": "g-vip-at-risk",
    "vip risk": "g-vip-at-risk",
  };

  const findSegmentIdByText = (text: string) => {
    const normalizedText = normalizeSegmentText(text);
    const alias = segmentTextAliases[normalizedText];
    if (alias) return alias;

    if (
      normalizedText.includes("lapsed vip") ||
      normalizedText.includes("vip at risk") ||
      normalizedText.includes("at risk vip") ||
      normalizedText.includes("vip risk") ||
      normalizedText.includes("at-risk vip")
    ) {
      return "g-vip-at-risk";
    }

    return segmentMentionGroups
      .flatMap((group) => group.items)
      .find((item) => normalizeSegmentText(item.name) === normalizedText)
      ?.id;
  };

  const resolveMentionTokens = (value: string) => {
    return value.replace(/\[\[([^\]]+)\]\]/g, (_match, tokenId: string) => {
      const id = tokenId.trim();
      const def = getDef(id);
      return def?.name ?? id;
    });
  };

  const buildSmartActivationName = (segmentName: string, rules: string[], goal: string) => {
    const clean = (input: string) => resolveMentionTokens(input)
      .replace(/\s+/g, " ")
      .trim();

    if (segmentName.trim()) return `${segmentName.trim()} Activation`;

    const cleanedRules = rules.map(clean).filter(Boolean);
    if (cleanedRules.length > 0) {
      const primary = cleanedRules[0];
      if (cleanedRules.length === 1) {
        const single = primary.length > 52 ? `${primary.slice(0, 52).trimEnd()}...` : primary;
        return `${single} Activation`;
      }

      const shortPrimary = primary.length > 30 ? `${primary.slice(0, 30).trimEnd()}...` : primary;
      return `${shortPrimary} + ${cleanedRules.length - 1} Rules Activation`;
    }

    const cleanedGoal = clean(goal);
    if (cleanedGoal) {
      const shortGoal = cleanedGoal.length > 48 ? `${cleanedGoal.slice(0, 48).trimEnd()}...` : cleanedGoal;
      return `${shortGoal} Activation`;
    }

    return "New Activation";
  };

  const currentBlock = flowBlocks[0];
  const drawerTitle = currentBlock?.savedName ? `Activate ${currentBlock.savedName}` : "Activation workflow";
  const [confirmCloseOpen, setConfirmCloseOpen] = useState(false);
  const hasSent = flowBlocks.some((block) => block.step === "segmentOffer");

  const requestCloseDrawer = () => setConfirmCloseOpen(true);
  const handleConfirmClose = () => {
    closeDrawer();
    setConfirmCloseOpen(false);
  };

  const updateFlowBlock = (messageId: string, blockId: string, patch: Partial<Extract<ContentBlock, { type: "flow" }>>) => {
    setFlowBlocks((blocks) => blocks.map((block) => (block.blockId === blockId ? { ...block, ...patch } : block)));
  };

  const appendFlowBlock = (messageId: string, afterBlockId: string, nextBlock: Extract<ContentBlock, { type: "flow" }>) => {
    const nextBlockWithId = nextBlock.blockId
      ? nextBlock
      : { ...nextBlock, blockId: `${nextBlock.flowId}-${nextBlock.step}-${Date.now()}` };

    setFlowBlocks((blocks) => {
      const index = blocks.findIndex((block) => block.blockId === afterBlockId);
      if (index === -1) return [...blocks, nextBlockWithId];
      return [...blocks.slice(0, index + 1), nextBlockWithId, ...blocks.slice(index + 1)];
    });
  };

  const shown = activations.filter(
    (a) =>
      (status === "all" || a.status === status) &&
      (matches(a.name) || matches(a.context)),
  );

  const formatIsoDate = (value?: string) => {
    if (!value) return null;
    const ymd = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (ymd) {
      return `${ymd[3]}/${ymd[2]}/${ymd[1]}`;
    }

    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return value;
    const dd = String(parsed.getDate()).padStart(2, "0");
    const mm = String(parsed.getMonth() + 1).padStart(2, "0");
    const yyyy = String(parsed.getFullYear());
    return `${dd}/${mm}/${yyyy}`;
  };

  const activationFrequency = (activation: Activation) => {
    if (activation.mvpDetails?.timing) return activation.mvpDetails.timing;
    if (activation.recurringStartDate || activation.scheduledDate) return "Schedule Send";
    return "Send Now";
  };

  const activationCadence = (activation: Activation) => {
    const baseCadence = activation.mvpDetails?.cadence
      ?? (activation.recurringStartDate ? "Re-Occuring" : "Once Off");
    return baseCadence;
  };

  const activationWhen = (activation: Activation) => {
    const frequency = activationFrequency(activation);
    const cadence = activation.mvpDetails?.cadence
      ?? (activation.recurringStartDate ? "Re-Occuring" : "Once Off");

    const isRecurring = cadence.toLowerCase().includes("re-occ");
    const isScheduled = frequency === "Schedule Send";

    const createdDate = formatIsoDate(activation.recurringStartDate)
      ?? formatIsoDate(activation.scheduledDate)
      ?? formatIsoDate(activation.createdAt);
    const sendDate = formatIsoDate(activation.scheduledDate) ?? formatIsoDate(activation.recurringStartDate);
    const endDate = formatIsoDate(activation.recurringEndDate);

    // Send now + re-occurring -> date created to (end date|no end date)
    if (!isScheduled && isRecurring) {
      const start = createdDate ?? "Date created";
      return `${start} to ${endDate ?? "No End Date"}`;
    }

    // Scheduled send + once off -> date of send
    if (isScheduled && !isRecurring) {
      return sendDate ?? activation.whenLabel;
    }

    // Scheduled send + re-occurring -> date of send to end date; if no end, date created to no end date
    if (isScheduled && isRecurring) {
      if (endDate) {
        const start = sendDate ?? createdDate ?? "Date created";
        return `${start} to ${endDate}`;
      }
      const created = createdDate ?? "Date created";
      return `${created} to No End Date`;
    }

    // Fallback for other combinations (e.g. send now + once off)
    return createdDate ?? activation.whenLabel;
  };

  const shownIds = useMemo(() => shown.map((activation) => activation.id), [shown]);
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

  const toggleSelectActivation = (id: string, checked: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  };

  const confirmBulkDelete = () => {
    if (selectedIds.size === 0) return;
    dispatch({ type: "DELETE_ACTIVATIONS", ids: [...selectedIds] });
    setSelectedIds(new Set());
  };

  const handleNewActivationSubmit = (text: string, mentionIds: string[], fromSegmentDetail = false) => {
    const explicitSegmentId = mentionIds[0];
    const inferredSegmentId = explicitSegmentId ? undefined : findSegmentIdByText(text);
    const segmentId = explicitSegmentId ?? inferredSegmentId;
    const segmentDef = segmentId ? getDef(segmentId) : undefined;
    const segmentArtifact = segmentId ? state.artifacts.get(segmentId) : undefined;
    const savedName = segmentDef?.name ?? segmentArtifact?.name ?? text;
    const flowId = `inline-${Date.now()}`;
    const initialStep: "resolve" | "fieldMapping" = segmentId ? "resolve" : "fieldMapping";
    const blockId = `${flowId}-${initialStep}`;
    const initialBlock: Extract<ContentBlock, { type: "flow" }> = {
      type: "flow",
      flowId,
      blockId,
      step: initialStep,
      windowDays: 180,
      confirmed: false,
      pendingName: undefined,
      savedName,
      segmentId,
      subscriptionStatus: segmentId === "g-bi-lapsed6" ? "Subscribed" : undefined,
      destination: undefined,
      ...(initialStep === "fieldMapping" ? {
        fieldMapping: {
          rows: [
            {
              id: "row-email",
              label: "Email",
              selected: "email_address",
              coverage: 99,
              candidates: ["email_address"],
              primary: true,
              canPrimary: true,
              removable: false,
            },
            {
              id: "row-phone",
              label: "Phone",
              selected: "mobile",
              coverage: 92,
              candidates: ["mobile", "phone", "cell"],
              primary: false,
              canPrimary: true,
              removable: true,
              note: "3 phone-like fields found",
            },
          ],
          searchRowId: undefined,
          searchQuery: "",
        },
        schedule: {
          mode: "one-off",
          sendNow: true,
          sendLaterDate: "2026-01-01",
          sendLaterTime: "09:00",
          recurringStartDate: "2026-01-01",
          recurringTime: "06:00",
          recurringEndType: "none",
          recurringEndDate: "2026-01-01",
        },
      } : {}),
    } as Extract<ContentBlock, { type: "flow" }>;
    setFlowBlocks([initialBlock]);
    setBuilderPromptInput("");
    setBuilderConditions([]);
    setDrawerMounted(true);
    setDrawerOpen(false);
    setDrawerFullScreen(false);
  };

  const applyBuilderCondition = () => {
    const next = builderPromptInput.trim();
    if (!next) return;
    setBuilderConditions((prev) => [...prev, next]);
    setBuilderPromptInput("");
    setBuilderActivationConfirmation(null);
    setBuilderShowActivationConnection(false);
    setBuilderConnectionConfirmed(false);
    setBuilderApprovalSent(false);
    setBuilderSegmentOfferDecision("idle");
    setBuilderSavedSegmentPreview(null);
  };

  const removeBuilderCondition = (index: number) => {
    setBuilderConditions((prev) => prev.filter((_, i) => i !== index));
    setBuilderActivationConfirmation(null);
    setBuilderShowActivationConnection(false);
    setBuilderConnectionConfirmed(false);
    setBuilderApprovalSent(false);
    setBuilderSegmentOfferDecision("idle");
    setBuilderSavedSegmentPreview(null);
  };

  const openActivationBuilder = () => {
    setFlowBlocks([]);
    setBuilderPromptInput(ACTIVATION_DEMO_PROMPT);
    setBuilderConditions([]);
    setBuilderReasoningGoal("");
    setBuilderReasoningAssumptions([]);
    setBuilderReasoningVisible(false);
    setBuilderSelectedSegmentId(undefined);
    setBuilderSelectedSegmentName("");
    setBuilderEditingActivationName(false);
    setBuilderEditingActivationDescription(false);
    setBuilderShowActivationConnection(false);
    setBuilderConnectionConfirmed(false);
    setBuilderApprovalSent(false);
    setBuilderLatestActivationId(null);
    setBuilderVerifyBaselineAssumptions([]);
    setBuilderAssumptionsChangedBeforeSend(false);
    setBuilderSegmentOfferDecision("idle");
    setBuilderSavedSegmentPreview(null);
    setBuilderSendTiming("send-now");
    setBuilderSendCadence("once-off");
    setBuilderRecurringListAction("maintain");
    setBuilderRecurringHasEndDate("no");
    setBuilderScheduledStartDate("");
    setBuilderScheduledStartTime("");
    setBuilderRecurringSendTime("09:00");
    setBuilderScheduledEndDate("");
    setBuilderSelectedSourceId("src-meta");
    setBuilderSelectedAccounts([]);
    setBuilderFieldRows([
      { id: "map-email", fieldType: "email", selectedMatch: "email_98" },
      { id: "map-phone", fieldType: "phone", selectedMatch: "mobile_92" },
    ]);
    setBuilderActivationConfirmation(null);
    setConfirmCloseOpen(false);

    if (drawerMounted) {
      setDrawerFullScreen(false);
      setDrawerOpen(true);
      return;
    }

    setDrawerMounted(true);
    setDrawerOpen(false);
    setDrawerFullScreen(false);
  };

  const buildActivationReasoningAssumptions = (source: string[], selectedSegmentId?: string): ReasoningAssumption[] => {
    const parseGenericAssumption = (entry: string, index: number): ReasoningAssumption | null => {
      const cleaned = entry.replace(/[.]+$/, "").trim();
      if (!cleaned) return null;

      if (/^country\s+is\s+new\s+zealand$/i.test(cleaned)) {
        return {
          id: `activation-assumption-${index}`,
          label: "Country is New Zealand",
          value: "",
        };
      }

      const pair = cleaned.match(/^(.+?)\s*(?:=|is|are|should be|to be)\s+(.+)$/i);
      if (pair) {
        return {
          id: `activation-assumption-${index}`,
          label: pair[1].trim(),
          value: pair[2].trim(),
        };
      }
      return {
        id: `activation-assumption-${index}`,
        label: `Assumption ${index + 1}`,
        value: cleaned,
      };
    };

    if (selectedSegmentId) {
      const segmentArtifact = state.artifacts.get(selectedSegmentId);
      const dummy = DUMMY_SEGMENT_BY_ID[selectedSegmentId];
      const group = BRAIN_GROUPS.find((item) => item.id === selectedSegmentId);
      const segmentCriteria = segmentArtifact?.body?.kind === "segment"
        ? segmentArtifact.body.criteria
        : (dummy?.validation ?? group?.criteria.map((criterion) => criterion.detail) ?? []);

      const segmentName = segmentArtifact?.name ?? dummy?.name ?? group?.name ?? "";
      const normalizedSegmentName = normalizeSegmentText(segmentName);
      const additionalAssumptions = source
        .filter((entry) => normalizeSegmentText(entry) !== normalizedSegmentName)
        .map((entry, index) => parseGenericAssumption(entry, index + segmentCriteria.length + 100))
        .filter((item): item is ReasoningAssumption => Boolean(item));

      const fromSegment = segmentCriteria
        .map((criterion, index) => parseGenericAssumption(criterion, index))
        .filter((item): item is ReasoningAssumption => Boolean(item));

      if (fromSegment.length > 0) {
        return [...fromSegment, ...additionalAssumptions];
      }
    }

    const fullText = source.join(" ").toLowerCase();
    const hasHighValue = /high\s*value/.test(fullText);
    const hasAustralia = /\b(australia|au)\b/.test(fullText);
    const hasNotUsa = /\b(not|exclude|without)\b[\s\S]*\b(united states|usa|us|u\.s\.a)\b/.test(fullText);
    const hasShirts = /\bshirts?\b/.test(fullText);

    if (hasHighValue && hasAustralia && hasNotUsa && hasShirts) {
      const baseAssumptions: ReasoningAssumption[] = [
        {
          id: "activation-assumption-high-value",
          label: "[[def-1]]",
          value: "is yes",
        },
        {
          id: "activation-assumption-country-au",
          label: "[[attr-1]]",
          value: "is Australia",
        },
        {
          id: "activation-assumption-country-us",
          label: "[[attr-1]]",
          value: "is not United States",
        },
        {
          id: "activation-assumption-product-type",
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

  const handleActivationComposerConfirm = ({ committedConditions, committedInput }: { committedConditions: string[]; committedInput: string }) => {
    const selectedSegmentId = committedConditions
      .map((condition) => findSegmentIdByText(condition))
      .find((id): id is string => Boolean(id))
      ?? findSegmentIdByText(committedInput);

    const assumptions = buildActivationReasoningAssumptions(committedConditions, selectedSegmentId);
    if (assumptions.length === 0) {
      setBuilderReasoningVisible(false);
      return;
    }

    const selectedSegmentName = selectedSegmentId
      ? segmentMentionGroups.flatMap((group) => group.items).find((item) => item.id === selectedSegmentId)?.name
      : undefined;

    setBuilderSelectedSegmentId(selectedSegmentId);
    setBuilderSelectedSegmentName(selectedSegmentName ?? "");
    setBuilderActivationConfirmation(null);
    setBuilderShowActivationConnection(false);
    setBuilderConnectionConfirmed(false);
    setBuilderApprovalSent(false);
    setBuilderSegmentOfferDecision("idle");
    setBuilderSavedSegmentPreview(null);

    setBuilderReasoningGoal(
      selectedSegmentName
      ? `Build activation using segment: ${selectedSegmentName}`
      :
      committedInput.trim()
      || committedConditions.join(" and ")
      || "Build the activation from the validated assumptions below.",
    );
    setBuilderReasoningAssumptions(assumptions);
    setBuilderVerifyBaselineAssumptions(assumptions);
    setBuilderAssumptionsChangedBeforeSend(false);
    setBuilderReasoningVisible(true);
  };

  const approveAndSendFromBuilder = () => {
    if (!builderActivationConfirmation || builderApprovalSent) return;

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
    const segmentNameForContext = builderSelectedSegmentName || builderActivationConfirmation.activationName.replace(/\s+activation$/i, "");

    dispatch({
      type: "ADD_ARTIFACT",
      artifact: {
        id: `artifact-${activationId}`,
        type: "activation",
        name: builderActivationConfirmation.activationName,
        status: "saved",
        savedAt: timestamp,
        body: {
          kind: "activation",
          segmentId: builderActivationConfirmation.segmentId,
          segmentName: segmentNameForContext,
        },
      },
    });

    dispatch({
      type: "ADD_ACTIVATION",
      activation: {
        id: activationId,
        createdAt: timestamp,
        name: builderActivationConfirmation.activationName,
        context: `From segment: ${segmentNameForContext || "Selected segment"}`,
        segmentId: builderActivationConfirmation.segmentId,
        segmentName: segmentNameForContext,
        channel: builderSelectedSource?.name ?? "Multi-channel",
        category: "MVP activation",
        skill: "Activation build",
        approval: { kind: "approved", by: "Izac", at: dateLabel },
        status: activationStatus,
        whenLabel: builderSendTiming === "schedule-send" ? scheduledWhenLabel : `Approved and sent · ${dateLabel}`,
        scheduledDate: builderSendTiming === "schedule-send"
          ? (builderScheduledStartDate || undefined)
          : undefined,
        recurringStartDate: builderSendCadence === "re-occurring"
          ? ((builderSendTiming === "schedule-send" ? builderScheduledStartDate : timestamp.slice(0, 10)) || undefined)
          : undefined,
        recurringEndDate: builderSendCadence === "re-occurring" && builderRecurringHasEndDate === "yes"
          ? (builderScheduledEndDate || undefined)
          : undefined,
        result: "Activation approved and sent from MVP build card.",
        invocations: [
          {
            skill: "Activation build",
            params: `Segment ${segmentNameForContext || "Selected segment"} with ${builderSelectedAccounts.length} selected account(s)${builderSendCadence === "re-occurring" ? ` · List action: ${builderRecurringListAction}` : ""}`,
            result: "Sent",
          },
        ],
        trail: [
          { at: dateLabel, entry: "Activation connection confirmed." },
          { at: dateLabel, entry: "Approved and sent from activation popout." },
        ],
        mvpDetails: {
          population: builderActivationConfirmation.population,
          activationName: builderActivationConfirmation.activationName,
          activationDefinition: builderActivationConfirmation.activationDescription,
          segmentName: segmentNameForContext,
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
            { id: `${activationId}-cust-1`, name: `${segmentNameForContext} - Ava Thompson`, meta: "AOV $142 · Last purchase 34 days ago" },
            { id: `${activationId}-cust-2`, name: `${segmentNameForContext} - Liam Nguyen`, meta: "AOV $129 · Last purchase 49 days ago" },
            { id: `${activationId}-cust-3`, name: `${segmentNameForContext} - Mia Rodriguez`, meta: "AOV $151 · Last purchase 62 days ago" },
          ],
        },
      },
    });

    setBuilderApprovalSent(true);
    setBuilderLatestActivationId(activationId);
    onOpenActivation?.(activationId);
  };

  useEffect(() => {
    if (drawerMounted) {
      requestAnimationFrame(() => setDrawerOpen(true));
    }
  }, [drawerMounted]);

  useEffect(() => {
    if (!prefillSegmentId) return;
    handleNewActivationSubmit("", [prefillSegmentId], true);
    onPrefillComplete?.();
  }, [prefillSegmentId, onPrefillComplete]);

  useEffect(() => {
    if (!initialStatusFilter) return;
    setStatus(initialStatusFilter);
  }, [initialStatusFilter]);

  useEffect(() => {
    const ids = new Set(activations.map((activation) => activation.id));
    setSelectedIds((prev) => new Set([...prev].filter((id) => ids.has(id))));
  }, [activations]);

  const closeDrawer = () => {
    setDrawerOpen(false);
  };

  return (
    <div className="relative flex h-full flex-col">
      <div className="flex items-start justify-between gap-4 px-6 pt-6">
        <div className="flex flex-col gap-1">
          <h1 className="text-xl font-semibold text-foreground">Activations</h1>
          <p className="text-sm text-foreground-secondary">
            The governed record of every execution event — which skill ran, with what approval, and the result.
          </p>
        </div>
        <Button
          className="shrink-0 bg-teal-600 text-white hover:bg-teal-500"
          onClick={() => {
            if (onStartActivationWorkflow) {
              onStartActivationWorkflow();
              return;
            }
            openActivationBuilder();
          }}
        >
          New Activation
        </Button>
      </div>

      <div className="flex min-h-0 flex-1">
        <div className="flex min-w-0 flex-1 flex-col gap-3 overflow-y-auto px-6 py-4">

          <FilterBar>
            <div className="relative">
              <RiSearchLine className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search activations" className="h-9 w-64 pl-8" />
            </div>
          </FilterBar>

          {selectedCount > 0 ? (
            <div className="flex flex-col gap-3 rounded-lg border border-primary/30 bg-primary/5 px-3 py-3">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-medium text-foreground">{selectedCount} selected</p>
                <Button size="sm" variant="ghost" onClick={() => setSelectedIds(new Set())}>Clear</Button>
              </div>

              <div className="flex flex-wrap items-center gap-2 rounded-md border border-border/70 bg-background/80 px-2.5 py-2">
                <span className="text-xs font-medium text-foreground-secondary">Delete</span>
                <Button size="sm" variant="destructive" onClick={() => setConfirmBulkDeleteOpen(true)}>Delete selected activations</Button>
              </div>

            </div>
          ) : null}

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">
                  <div onClick={(e) => e.stopPropagation()}>
                    <Checkbox
                      checked={allShownSelected ? true : someShownSelected ? "indeterminate" : false}
                      onCheckedChange={(checked) => toggleSelectAllShown(checked === true)}
                      aria-label="Select all activations"
                    />
                  </div>
                </TableHead>
                <TableHead>Activation</TableHead>
                <TableHead>Context</TableHead>
                <TableHead className="w-36">Channel</TableHead>
                <TableHead className="w-32">Frequency</TableHead>
                <TableHead className="w-56">Cadence</TableHead>
                <TableHead className="w-40">Status</TableHead>
                <TableHead className="w-32">When</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {shown.map((a) => {
                const s = ACTIVATION_STATUS_META[a.status];
                return (
                  <TableRow
                    key={a.id}
                    className={onOpenActivation ? "cursor-pointer" : undefined}
                    onClick={onOpenActivation ? () => onOpenActivation(a.id) : undefined}
                  >
                    <TableCell>
                      <div onClick={(e) => e.stopPropagation()}>
                        <Checkbox
                          checked={selectedIds.has(a.id)}
                          onCheckedChange={(checked) => toggleSelectActivation(a.id, checked === true)}
                          aria-label={`Select ${a.name}`}
                        />
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="font-medium text-foreground">{a.name}</span>
                      <p className="mt-0.5 max-w-xs truncate text-sm text-foreground-secondary">{a.skill}</p>
                    </TableCell>
                    <TableCell className="max-w-[12rem] truncate text-sm text-muted-foreground">{a.context}</TableCell>
                    <TableCell className="text-sm text-foreground-secondary">{a.channel}</TableCell>
                    <TableCell className="text-sm text-foreground-secondary">{activationFrequency(a)}</TableCell>
                    <TableCell className="max-w-[18rem] truncate text-sm text-foreground-secondary">{activationCadence(a)}</TableCell>
                    <TableCell><Badge variant={s.variant} size="sm">{s.label}</Badge></TableCell>
                    <TableCell className="text-sm text-foreground-secondary">{activationWhen(a)}</TableCell>
                  </TableRow>
                );
              })}
              {shown.length === 0 && (
                <TableRow><TableCell colSpan={8} className="py-10 text-center text-sm text-muted-foreground">No activations match these filters.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
          <p className="text-sm text-muted-foreground">Displaying {shown.length} of {activations.length} activations</p>
        </div>
      </div>

      {drawerMounted ? (
        <div className="absolute inset-0 z-40 flex items-stretch">
          <div className={cn(
            "absolute inset-0 bg-background/40 backdrop-blur-sm transition-opacity duration-300",
            drawerOpen ? "opacity-100" : "opacity-0 pointer-events-none",
          )}
            onClick={() => {
              if (!drawerOpen) return;
              requestCloseDrawer();
            }}
          />
          <div
            className={cn(
              "relative flex h-full flex-col border-r border-border/70 bg-background shadow-2xl transition-all duration-300 ease-out",
              drawerOpen ? "translate-x-0" : "-translate-x-full",
              drawerFullScreen ? "w-full" : "w-[50vw] max-w-[720px]",
            )}
            onTransitionEnd={(event) => {
              if (!drawerOpen && event.currentTarget === event.target) {
                setDrawerMounted(false);
                setDrawerFullScreen(false);
              }
            }}
          >
            <div className="flex items-center justify-between gap-3 border-b border-border/60 px-4 py-3">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-foreground truncate">{drawerTitle}</p>
                <p className="text-xs text-foreground-secondary">Activation workflow</p>
              </div>
              <div className="flex items-center gap-2">
                <Button size="icon" variant="ghost" onClick={() => setDrawerFullScreen((open) => !open)}>
                  {drawerFullScreen ? <RiFullscreenExitLine className="size-4" /> : <RiFullscreenLine className="size-4" />}
                </Button>
                <Button size="icon" variant="ghost" onClick={requestCloseDrawer}>
                  <RiCloseLine className="size-4" />
                  <span className="sr-only">Close activation workflow</span>
                </Button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              <div className="mb-4 rounded-2xl border border-border/70 bg-card p-3">
                <p className="text-xs font-medium text-foreground-secondary">Describe what you want to build</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Add a full description or add conditions one by one.
                </p>
                <div className="mt-2">
                  <ConditionComposer
                    value={builderPromptInput}
                    onValueChange={setBuilderPromptInput}
                    onApply={applyBuilderCondition}
                    placeholder="Example: Customers who bought in last 90 days and spent over $100"
                    groups={mentionGroups}
                    conditions={builderConditions}
                    onRemoveCondition={removeBuilderCondition}
                    onClearConditions={() => {
                      setBuilderConditions([]);
                      setFlowBlocks([]);
                      setBuilderReasoningVisible(false);
                      setBuilderActivationConfirmation(null);
                      setBuilderShowActivationConnection(false);
                      setBuilderConnectionConfirmed(false);
                      setBuilderApprovalSent(false);
                      setBuilderSegmentOfferDecision("idle");
                      setBuilderSavedSegmentPreview(null);
                    }}
                    onConfirmAction={handleActivationComposerConfirm}
                  />
                </div>
                {builderReasoningVisible ? (
                  <div className="mt-3">
                    <ReasoningBlock
                      goal={builderReasoningGoal}
                      assumptions={builderReasoningAssumptions}
                      hideEditSegmentAction
                      hideActivateAction
                      skipConfirmationCard
                      onReject={() => setBuilderReasoningVisible(false)}
                      onVerifyConfirm={({ assumptions, goal, population }) => {
                        const assumptionsChanged = didAssumptionsChange(builderVerifyBaselineAssumptions, assumptions);
                        const normalizedConditions = assumptions
                          .map((assumption) => {
                            const label = resolveMentionTokens(assumption.label.trim());
                            const value = resolveMentionTokens(assumption.value.trim());
                            if (/^assumption\s+\d+$/i.test(label)) {
                              return value || "";
                            }
                            return value ? `${label} ${value}` : label;
                          })
                          .filter(Boolean);

                        setBuilderConditions(normalizedConditions);
                        setBuilderReasoningAssumptions(assumptions);
                        setBuilderReasoningVisible(false);
                        setBuilderAssumptionsChangedBeforeSend(assumptionsChanged);

                        const activationDescription = builderSelectedSegmentName
                          ? `Activation from Segment: ${builderSelectedSegmentName}`
                          : (goal.trim()
                            || normalizedConditions.join(" and ").trim()
                            || "Activation from verified assumptions");
                        const activationName = buildSmartActivationName(builderSelectedSegmentName, normalizedConditions, goal);
                        const text = normalizedConditions.join(" and ").trim() || activationDescription;

                        setBuilderEditingActivationName(false);
                        setBuilderEditingActivationDescription(false);
                        setBuilderShowActivationConnection(false);
                        setBuilderConnectionConfirmed(false);
                        setBuilderApprovalSent(false);
                        setBuilderLatestActivationId(null);
                        setBuilderSegmentOfferDecision("idle");
                        setBuilderSavedSegmentPreview(null);
                        setBuilderActivationConfirmation({
                          segmentId: builderSelectedSegmentId,
                          activationName,
                          activationDescription,
                          population,
                          rules: normalizedConditions,
                          committedText: text,
                        });
                      }}
                    />
                  </div>
                ) : null}

                {builderActivationConfirmation ? (
                  <div className="mt-3 rounded-xl border border-border bg-card p-3.5">
                    <div className="flex items-center gap-2">
                      <span className="rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">
                        MVP activation build
                      </span>
                    </div>

                    <div className="mt-3 rounded-xl border border-border bg-background px-4 py-3">
                      <p className="text-xs font-medium uppercase tracking-normal text-muted-foreground">Population volume</p>
                      <p className="mt-1 text-2xl font-semibold text-foreground tabular-nums">{builderActivationConfirmation.population}</p>
                    </div>

                    <div className="mt-3 rounded-xl border border-border bg-background p-3">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-xs font-medium uppercase tracking-normal text-muted-foreground">Activation name</p>
                        <button
                          type="button"
                          onClick={() => setBuilderEditingActivationName((value) => !value)}
                          className="rounded-lg border border-border bg-card px-2.5 py-1 text-xs font-medium text-foreground hover:bg-accent"
                        >
                          {builderEditingActivationName ? "Done" : "Edit name"}
                        </button>
                      </div>
                      {builderEditingActivationName ? (
                        <input
                          value={builderActivationConfirmation.activationName}
                          onChange={(event) => setBuilderActivationConfirmation((prev) => (
                            prev
                              ? { ...prev, activationName: event.target.value }
                              : prev
                          ))}
                          className="mt-2 h-9 w-full rounded-lg border border-input bg-card px-3 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring/40"
                        />
                      ) : (
                        <p className="mt-2 text-sm font-medium text-foreground">{builderActivationConfirmation.activationName}</p>
                      )}
                    </div>

                    <div className="mt-3 rounded-xl border border-border bg-background p-3">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-xs font-medium uppercase tracking-normal text-muted-foreground">Activation description</p>
                        <button
                          type="button"
                          onClick={() => setBuilderEditingActivationDescription((value) => !value)}
                          className="rounded-lg border border-border bg-card px-2.5 py-1 text-xs font-medium text-foreground hover:bg-accent"
                        >
                          {builderEditingActivationDescription ? "Done" : "Edit name"}
                        </button>
                      </div>
                      {builderEditingActivationDescription ? (
                        <textarea
                          value={builderActivationConfirmation.activationDescription}
                          onChange={(event) => setBuilderActivationConfirmation((prev) => (
                            prev
                              ? { ...prev, activationDescription: event.target.value }
                              : prev
                          ))}
                          className="mt-2 min-h-20 w-full rounded-lg border border-input bg-card px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring/40"
                        />
                      ) : (
                        <p className="mt-2 text-sm text-foreground-secondary">{builderActivationConfirmation.activationDescription}</p>
                      )}
                    </div>

                    <div className="mt-3 rounded-xl border border-border bg-background p-3">
                      <p className="text-xs font-medium uppercase tracking-normal text-muted-foreground">Segment contains</p>
                      <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-foreground-secondary">
                        {builderActivationConfirmation.rules.map((rule, index) => (
                          <li key={`activation-confirm-rule-${index}`}>{rule}</li>
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
                                      setBuilderApprovalSent(false);
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
                                        setBuilderApprovalSent(false);
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
                                    setBuilderApprovalSent(false);
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
                                    setBuilderApprovalSent(false);
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
                                setBuilderApprovalSent(false);
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
                                setBuilderApprovalSent(false);
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
                                setBuilderApprovalSent(false);
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
                                  <label className="text-xs font-medium text-foreground-secondary" htmlFor="activation-panel-schedule-start-date">
                                    Date
                                  </label>
                                  <input
                                    id="activation-panel-schedule-start-date"
                                    type="date"
                                    value={builderScheduledStartDate}
                                    onChange={(event) => {
                                      setBuilderScheduledStartDate(event.target.value);
                                      setBuilderConnectionConfirmed(false);
                                      setBuilderApprovalSent(false);
                                    }}
                                    className="mt-1 h-9 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring/40"
                                  />
                                </div>
                                <div>
                                  <label className="text-xs font-medium text-foreground-secondary" htmlFor="activation-panel-schedule-start-time">
                                    Time
                                  </label>
                                  <input
                                    id="activation-panel-schedule-start-time"
                                    type="time"
                                    value={builderScheduledStartTime}
                                    onChange={(event) => {
                                      setBuilderScheduledStartTime(event.target.value);
                                      setBuilderConnectionConfirmed(false);
                                      setBuilderApprovalSent(false);
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
                                setBuilderApprovalSent(false);
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
                                <label className="text-xs font-medium text-foreground-secondary" htmlFor="activation-panel-list-action">
                                  List action
                                </label>
                                <select
                                  id="activation-panel-list-action"
                                  value={builderRecurringListAction}
                                  onChange={(event) => {
                                    setBuilderRecurringListAction(event.target.value as "append" | "maintain" | "update");
                                    setBuilderConnectionConfirmed(false);
                                    setBuilderApprovalSent(false);
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
                                <label className="text-xs font-medium text-foreground-secondary" htmlFor="activation-panel-recurring-time">
                                  Preferred daily send time
                                </label>
                                <input
                                  id="activation-panel-recurring-time"
                                  type="time"
                                  value={builderRecurringSendTime}
                                  onChange={(event) => {
                                    setBuilderRecurringSendTime(event.target.value);
                                    setBuilderConnectionConfirmed(false);
                                    setBuilderApprovalSent(false);
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
                                      setBuilderApprovalSent(false);
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
                                      setBuilderApprovalSent(false);
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
                                  <label className="text-xs font-medium text-foreground-secondary" htmlFor="activation-panel-schedule-end-date">
                                    End date
                                  </label>
                                  <input
                                    id="activation-panel-schedule-end-date"
                                    type="date"
                                    value={builderScheduledEndDate}
                                    onChange={(event) => {
                                      setBuilderScheduledEndDate(event.target.value);
                                      setBuilderConnectionConfirmed(false);
                                      setBuilderApprovalSent(false);
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
                              disabled={!builderCanConfirmActivationConnection}
                              className={cn(
                                "rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
                                builderCanConfirmActivationConnection
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
                                <p className="text-foreground"><span className="font-medium">Activation name:</span> {builderActivationConfirmation.activationName}</p>
                                <p className="text-foreground"><span className="font-medium">Activation definition:</span> {builderActivationConfirmation.activationDescription}</p>
                                <p className="text-foreground"><span className="font-medium">Population:</span> {builderActivationConfirmation.population}</p>
                                <p className="text-foreground"><span className="font-medium">Data source:</span> {builderSelectedSource?.name ?? "Not selected"}</p>
                                <p className="text-foreground">
                                  <span className="font-medium">Accounts:</span>{" "}
                                  {builderSelectedSourceAccounts
                                    .filter((account) => builderSelectedAccounts.includes(account.id))
                                    .map((account) => account.name)
                                    .join(", ")}
                                </p>
                                <div>
                                  <p className="font-medium text-foreground">Field mapping:</p>
                                  <ul className="mt-1 list-disc space-y-1 pl-5 text-foreground-secondary">
                                    {builderFieldRows.map((row) => {
                                      const fieldLabel = builderFieldTypeOptions.find((option) => option.value === row.fieldType)?.label ?? row.fieldType;
                                      const matchLabel = (builderFieldMatchOptions[row.fieldType] ?? []).find((option) => option.value === row.selectedMatch)?.label ?? row.selectedMatch;
                                      return <li key={`summary-${row.id}`}>{fieldLabel} {"->"} {matchLabel}</li>;
                                    })}
                                  </ul>
                                </div>
                                <p className="text-foreground"><span className="font-medium">Timing:</span> {builderSendTiming === "schedule-send" ? "Schedule Send" : "Send Now"}</p>
                                <p className="text-foreground"><span className="font-medium">Cadence:</span> {builderSendCadence === "re-occurring" ? "Re-Occuring" : "Once Off"}</p>
                                {builderSendTiming === "schedule-send" ? (
                                  <p className="text-foreground"><span className="font-medium">Scheduled:</span> {builderScheduledStartDate || "No date"} {builderScheduledStartTime || "No time"}</p>
                                ) : null}
                                {builderSendCadence === "re-occurring" ? (
                                  <>
                                    <p className="text-foreground"><span className="font-medium">List action:</span> {builderRecurringListAction}</p>
                                    <p className="text-foreground"><span className="font-medium">Daily send time:</span> {builderRecurringSendTime || "No time"}</p>
                                  </>
                                ) : null}
                              </div>
                            </div>

                            <div className="mt-3 rounded-xl border border-border bg-background p-3">
                              <div className="flex justify-end">
                                <button
                                  type="button"
                                  onClick={approveAndSendFromBuilder}
                                  disabled={builderApprovalSent}
                                  className={cn(
                                    "rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
                                    builderApprovalSent
                                      ? "cursor-not-allowed bg-muted text-muted-foreground"
                                      : "bg-primary text-primary-foreground hover:bg-primary/90",
                                  )}
                                >
                                  {builderApprovalSent ? "Approved and Sent" : "Approve and Send"}
                                </button>
                              </div>

                              {builderApprovalSent
                              && builderSegmentOfferDecision === "idle"
                              && (
                                !builderActivationConfirmation.segmentId
                                || builderAssumptionsChangedBeforeSend
                              ) ? (
                                <div className="mt-3 rounded-xl border border-border/80 bg-card p-3">
                                  <p className="text-sm text-foreground">Would you like to save this audience as a new segment?</p>
                                  <div className="mt-3 flex flex-wrap justify-end gap-2">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        if (!builderActivationConfirmation) return;

                                        const segmentId = `g-generated-${Date.now()}`;
                                        const segmentNameBase = builderActivationConfirmation.activationName
                                          .replace(/\s+activation$/i, "")
                                          .trim();
                                        const segmentName = segmentNameBase || `Generated Segment ${new Date().toLocaleTimeString()}`;

                                        dispatch({
                                          type: "ADD_ARTIFACT",
                                          artifact: {
                                            id: segmentId,
                                            type: "segment",
                                            name: segmentName,
                                            status: "saved",
                                            savedAt: new Date().toISOString(),
                                            def: {
                                              id: segmentId,
                                              kind: "segment",
                                              name: segmentName,
                                              entity: "customer",
                                              description: builderActivationConfirmation.activationDescription,
                                            },
                                            body: {
                                              kind: "segment",
                                              criteria: builderActivationConfirmation.rules,
                                              population: builderActivationConfirmation.population,
                                              purpose: builderActivationConfirmation.activationDescription,
                                            },
                                          },
                                        });

                                        setBuilderSavedSegmentPreview({
                                          id: segmentId,
                                          name: segmentName,
                                          description: builderActivationConfirmation.activationDescription,
                                          population: builderActivationConfirmation.population,
                                          criteria: builderActivationConfirmation.rules,
                                        });
                                        setBuilderSegmentOfferDecision("saved");
                                      }}
                                      className="rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90"
                                    >
                                      Yes, Save As A New Segmet
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setBuilderSegmentOfferDecision("declined")}
                                      className="rounded-lg border border-border bg-background px-3 py-1.5 text-sm font-medium text-foreground hover:bg-accent"
                                    >
                                      No
                                    </button>
                                  </div>
                                </div>
                              ) : null}

                              {builderSegmentOfferDecision === "saved" && builderSavedSegmentPreview ? (
                                <div className="mt-3 rounded-xl border border-primary/30 bg-primary/5 p-3">
                                  <p className="text-xs font-medium uppercase tracking-normal text-muted-foreground">Segment confirmation</p>
                                  <div className="mt-2 space-y-2 text-sm">
                                    <p className="text-foreground">
                                      <span className="font-medium">Segment name:</span>{" "}
                                      {builderSavedSegmentPreview.name}
                                    </p>
                                    <p className="text-foreground">
                                      <span className="font-medium">Segment definition:</span>{" "}
                                      {builderSavedSegmentPreview.description}
                                    </p>
                                    <p className="text-foreground">
                                      <span className="font-medium">Population:</span>{" "}
                                      {builderSavedSegmentPreview.population}
                                    </p>
                                    <div>
                                      <p className="font-medium text-foreground">Segment contains:</p>
                                      <ul className="mt-1 list-disc space-y-1 pl-5 text-foreground-secondary">
                                        {builderSavedSegmentPreview.criteria.map((rule, index) => (
                                          <li key={`saved-segment-rule-${index}`}>{rule}</li>
                                        ))}
                                      </ul>
                                    </div>
                                  </div>
                                  <div className="mt-3 flex flex-wrap justify-end gap-2">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        if (!builderSavedSegmentPreview.id) return;
                                        closeDrawer();
                                        onOpenSegmentPage?.(builderSavedSegmentPreview.id);
                                      }}
                                      className="rounded-lg border border-border bg-background px-3 py-1.5 text-sm font-medium text-foreground hover:bg-accent"
                                    >
                                      Go to Segment
                                    </button>
                                    <button
                                      type="button"
                                      onClick={closeDrawer}
                                      className="rounded-lg border border-border bg-background px-3 py-1.5 text-sm font-medium text-foreground hover:bg-accent"
                                    >
                                      Close
                                    </button>
                                    <button
                                      type="button"
                                      onClick={openActivationBuilder}
                                      className="rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90"
                                    >
                                      Build a New Activation
                                    </button>
                                  </div>
                                </div>
                              ) : null}

                              {builderSegmentOfferDecision === "declined" ? (
                                <div className="mt-3 flex flex-wrap justify-end gap-2">
                                  <button
                                    type="button"
                                    onClick={closeDrawer}
                                    className="rounded-lg border border-border bg-background px-3 py-1.5 text-sm font-medium text-foreground hover:bg-accent"
                                  >
                                    Close
                                  </button>
                                  <button
                                    type="button"
                                    onClick={openActivationBuilder}
                                    className="rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90"
                                  >
                                    Build a New Activation
                                  </button>
                                </div>
                              ) : null}
                            </div>
                          </>
                        ) : null}
                      </>
                    ) : null}
                  </div>
                ) : null}
              </div>

              {flowBlocks.length > 0 ? (
                <div className="space-y-3">
                  {flowBlocks.map((block) => (
                    <ActivationFlowBlock
                      key={block.blockId ?? block.flowId}
                      block={block}
                      messageId="inline-activation"
                      blockId={block.blockId ?? block.flowId}
                      onUpdate={updateFlowBlock}
                      onNext={appendFlowBlock}
                      onClose={closeDrawer}
                    />
                  ))}
                </div>
              ) : (builderReasoningVisible || Boolean(builderActivationConfirmation)) ? null : (
                <div className="flex h-full items-center justify-center rounded-2xl border border-border/70 bg-card p-8 text-sm text-foreground-secondary">
                  Start an activation from the composer to open the workflow here.
                </div>
              )}
            </div>
          </div>
        </div>
      ) : null}

      <ConfirmDialog
        open={confirmCloseOpen}
        onOpenChange={setConfirmCloseOpen}
        title="Close activation workflow?"
        description="All work will be lost if not saved."
        confirmLabel="Yes, close"
        cancelLabel="Keep working"
        variant="destructive"
        onConfirm={handleConfirmClose}
        icon={RiCloseLine}
      />

      <ConfirmDialog
        open={confirmBulkDeleteOpen}
        onOpenChange={setConfirmBulkDeleteOpen}
        title={`Do you really want to delete ${selectedCount} activations?`}
        description="This action cannot be undone."
        confirmLabel="Yes, delete"
        cancelLabel="Cancel"
        variant="destructive"
        onConfirm={confirmBulkDelete}
      />
    </div>
  );
}

// ─── Activation detail (body for the side panel) ───────────────────────────────

export function ActivationDetail({ activation, onOpenSegment, categoryOptions, onCategoryChange }: {
  activation: Activation;
  onOpenSegment?: (id: string) => void;
  categoryOptions?: string[];
  onCategoryChange?: (category: string) => void;
}) {
  const s = ACTIVATION_STATUS_META[activation.status];

  const detailPopulation = activation.mvpDetails?.population ?? "Not specified";
  const detailActivationName = activation.mvpDetails?.activationName ?? activation.name;
  const detailActivationDefinition = activation.mvpDetails?.activationDefinition ?? activation.result ?? "Not specified";
  const detailSegmentUsed = activation.mvpDetails?.segmentName ?? activation.segmentName ?? "Not specified";
  const detailDataSource = activation.mvpDetails?.dataSource ?? activation.channel;
  const detailAccounts = activation.mvpDetails?.accounts?.length
    ? activation.mvpDetails.accounts.join(", ")
    : "No accounts selected";
  const detailFieldMapping = activation.mvpDetails?.fieldMapping?.length
    ? activation.mvpDetails.fieldMapping
    : ["No field mapping configured"];
  const detailTiming = activation.mvpDetails?.timing
    ?? (activation.scheduledDate || activation.recurringStartDate ? "Schedule Send" : "Send Now");
  const detailCadence = activation.mvpDetails?.cadence
    ?? (activation.recurringStartDate ? "Re-Occuring" : "Once Off");
  const detailCustomers = activation.mvpDetails?.customers?.length
    ? activation.mvpDetails.customers
    : [
        { id: `${activation.id}-cust-1`, name: `${detailSegmentUsed} - Ava Thompson`, meta: "AOV $142 · Last purchase 34 days ago" },
        { id: `${activation.id}-cust-2`, name: `${detailSegmentUsed} - Liam Nguyen`, meta: "AOV $129 · Last purchase 49 days ago" },
        { id: `${activation.id}-cust-3`, name: `${detailSegmentUsed} - Mia Rodriguez`, meta: "AOV $151 · Last purchase 62 days ago" },
      ];

  return (
    <div className="flex flex-col gap-6 p-4">
      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-base font-semibold text-foreground">{activation.name}</h2>
          <Badge variant={s.variant} size="sm">{s.label}</Badge>
        </div>
        <p className="text-xs text-muted-foreground">{activation.context} · {activation.whenLabel}</p>
      </div>

      <Tabs defaultValue="details" className="space-y-3">
        <TabsList variant="underline" className="w-full">
          <TabsTrigger value="details">Details</TabsTrigger>
          <TabsTrigger value="customers">Customers</TabsTrigger>
        </TabsList>

        <TabsContent value="details" className="space-y-3">
          <div className="rounded-xl border border-border bg-card p-4">
            <p className="text-xs font-medium uppercase tracking-normal text-muted-foreground">Population</p>
            <p className="mt-1 text-lg font-semibold text-foreground tabular-nums">{detailPopulation}</p>
          </div>

          <div className="rounded-xl border border-border bg-card p-4">
            <p className="text-xs font-medium uppercase tracking-normal text-muted-foreground">Activation name</p>
            <p className="mt-1 text-sm font-medium text-foreground">{detailActivationName}</p>

            <p className="mt-3 text-xs font-medium uppercase tracking-normal text-muted-foreground">Activation definition</p>
            <p className="mt-1 text-sm text-foreground-secondary">{detailActivationDefinition}</p>

            <p className="mt-3 text-xs font-medium uppercase tracking-normal text-muted-foreground">Segment used</p>
            {onOpenSegment && activation.segmentId ? (
              <button
                type="button"
                onClick={() => onOpenSegment(activation.segmentId!)}
                className="mt-1 inline-flex items-center gap-1 text-left text-sm font-medium text-foreground hover:text-primary"
              >
                <span>{detailSegmentUsed}</span>
                <RiArrowRightSLine className="size-4" />
              </button>
            ) : (
              <p className="mt-1 text-sm text-foreground">{detailSegmentUsed}</p>
            )}
          </div>

          <div className="rounded-xl border border-border bg-card p-4">
            <p className="text-xs font-medium uppercase tracking-normal text-muted-foreground">Data source and accounts</p>
            <p className="mt-1 text-sm text-foreground">{detailDataSource}</p>
            <p className="mt-1 text-sm text-foreground-secondary">{detailAccounts}</p>
          </div>

          <div className="rounded-xl border border-border bg-card p-4">
            <p className="text-xs font-medium uppercase tracking-normal text-muted-foreground">Field mapping</p>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-foreground-secondary">
              {detailFieldMapping.map((mapping, index) => (
                <li key={`${activation.id}-map-${index}`}>{mapping}</li>
              ))}
            </ul>
          </div>

          <div className="rounded-xl border border-border bg-card p-4">
            <p className="text-xs font-medium uppercase tracking-normal text-muted-foreground">Timing and cadence</p>
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              <div className="rounded-lg border border-border/70 bg-background px-2.5 py-2">
                <p className="text-xs text-muted-foreground">Timing</p>
                <p className="mt-1 text-sm font-medium text-foreground">{detailTiming}</p>
              </div>
              <div className="rounded-lg border border-border/70 bg-background px-2.5 py-2">
                <p className="text-xs text-muted-foreground">Cadence</p>
                <p className="mt-1 text-sm font-medium text-foreground">{detailCadence}</p>
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="customers" className="space-y-3">
          <div className="rounded-xl border border-border bg-card p-4">
            <p className="text-sm font-semibold text-foreground">Dummy customer data</p>
            <div className="mt-3 space-y-2">
              {detailCustomers.map((customer) => (
                <div key={customer.id} className="rounded-lg border border-border/70 bg-background px-3 py-2">
                  <p className="text-sm font-medium text-foreground">{customer.name}</p>
                  <p className="mt-0.5 text-xs text-foreground-secondary">{customer.meta}</p>
                </div>
              ))}
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
