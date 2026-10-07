import { useMemo } from "react";
import { cn } from "@/lib/utils";
import { useSession } from "../store";
import { getDef } from "@/data/def-registry";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Input } from "@/components/ui/Input";
import { Checkbox } from "@/components/ui/Checkbox";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/Select";
import { RiBookOpenLine, RiCheckLine, RiCloseLine } from "@remixicon/react";
import type { Artifact, ContentBlock } from "../types";
import type { Activation } from "../activations-mock";
import { getBrainGroup } from "../../lexi-shared-brain/data";

const WINDOW_OPTIONS = [90, 120, 180, 365] as const;
const DESTINATION_OPTIONS = ["Klaviyo"] as const;
const CUSTOMER_COUNTS: Record<number, string> = {
  90: "6,412",
  120: "5,530",
  180: "4,218",
  365: "2,940",
};
const CUSTOMER_COUNTS_NUM: Record<number, number> = {
  90: 6412,
  120: 5530,
  180: 4218,
  365: 2940,
};
const CUSTOMER_COUNTS_OVERRIDE_NUM: Record<number, number> = {
  90: 3328,
};
const CUSTOMER_COUNTS_OVERRIDE: Record<number, string> = {
  90: "3,328",
};
const PLAYBOOK_TAKEN = ["lapsed", "vip", "churn risk", "first-time buyers"];
const FIELD_CATALOG = [
  { id: "email_address", label: "Email address", coverage: 99 },
  { id: "optin_email_2026", label: "Opt-in email", coverage: 41 },
  { id: "contact_email", label: "Contact email", coverage: 12 },
  { id: "mobile", label: "Mobile", coverage: 92 },
  { id: "phone", label: "Phone", coverage: 61 },
  { id: "cell", label: "Cell", coverage: 12 },
  { id: "dob_dd_mm_yyyy", label: "Date of birth", coverage: 78 },
  { id: "birth_year", label: "Birth year", coverage: 33 },
  { id: "first_name", label: "First name", coverage: 97 },
  { id: "last_name", label: "Last name", coverage: 96 },
  { id: "suburb", label: "City", coverage: 88 },
  { id: "postcode", label: "Postcode", coverage: 91 },
  { id: "state", label: "State", coverage: 90 },
  { id: "gender", label: "Gender", coverage: 54 },
];
const DESTINATION_LABELS: Record<typeof DESTINATION_OPTIONS[number], { summary: string; details: string }> = {
  Klaviyo: {
    summary: "Email campaign",
    details: "Draft a Klaviyo campaign audience with email addresses and consented contacts.",
  },
  Meta: {
    summary: "Paid social audience",
    details: "Build a Meta custom audience for ads with hashed identifiers and consented profiles.",
  },
  Braze: {
    summary: "Email & in-app",
    details: "Send through Braze to your email and in-app messaging channels.",
  },
};
const LIST_ACTION_OPTIONS = ["append", "maintain", "update"] as const;
const LIST_ACTION_LABELS: Record<typeof LIST_ACTION_OPTIONS[number], { label: string; hint: string }> = {
  append: {
    label: "Append",
    hint: "Adds new customers to your current list without removing anyone already there.",
  },
  maintain: {
    label: "Maintain",
    hint: "Keeps the existing list intact and only refreshes membership based on daily eligibility.",
  },
  update: {
    label: "Update",
    hint: "Rebuilds the full list each run so it always reflects the latest qualifying customers.",
  },
};
const TODAY = new Date().toISOString().slice(0, 10);

function getFieldLabel(fieldId: string) {
  return FIELD_CATALOG.find((item) => item.id === fieldId)?.label ?? fieldId;
}

function getFieldCoverage(fieldId: string) {
  return FIELD_CATALOG.find((item) => item.id === fieldId)?.coverage ?? 0;
}

function formatDate(value: string) {
  try {
    return new Intl.DateTimeFormat("en-AU", { day: "numeric", month: "short", year: "numeric" }).format(new Date(value));
  } catch {
    return value;
  }
}

function formatTime(value: string) {
  const [hours, minutes] = value.split(":");
  if (!hours || !minutes) return value;
  const h = Number(hours);
  const period = h >= 12 ? "pm" : "am";
  const displayHour = h % 12 || 12;
  return `${displayHour}:${minutes} ${period}`;
}

function addDays(dateValue: string, days: number): string {
  const next = new Date(dateValue);
  next.setDate(next.getDate() + days);
  return next.toISOString().slice(0, 10);
}

export interface ActivationFlowBlockProps {
  block: Extract<ContentBlock, { type: "flow" }>;
  messageId: string;
  blockId: string;
  onUpdate: (messageId: string, blockId: string, nextBlock: Extract<ContentBlock, { type: "flow" }>) => void;
  onNext?: (messageId: string, blockId: string, nextBlock: Extract<ContentBlock, { type: "flow" }>) => void;
  onClose?: () => void;
}

export default function ActivationFlowBlock({ block, messageId, blockId, onUpdate, onNext, onClose }: ActivationFlowBlockProps) {
  const { state, dispatch } = useSession();
  const pendingName = block.pendingName ?? "";
  const segmentArtifact = block.segmentId ? state.artifacts.get(block.segmentId) : undefined;
  const segmentDef = block.segmentId ? getDef(block.segmentId) : undefined;
  const segmentGroup = block.segmentId ? getBrainGroup(block.segmentId) : undefined;
  const segmentBody = segmentArtifact?.body?.kind === "segment" ? segmentArtifact.body : undefined;
  const segmentPopulationFromDef = segmentDef?.stat?.value
    ? Number(segmentDef.stat.value.replace(/,/g, ""))
    : undefined;
  const segmentPopulationFromArtifact = segmentBody?.population
    ? Number(segmentBody.population.replace(/,/g, ""))
    : undefined;
  const segmentPopulationNum = segmentPopulationFromDef ?? segmentPopulationFromArtifact ?? segmentGroup?.population;
  const segmentPopulationDisplay = segmentPopulationNum ? segmentPopulationNum.toLocaleString() : undefined;
  const segmentCriteria = segmentBody?.criteria
    ?? segmentGroup?.criteria.map((criterion) => criterion.detail)
    ?? [];
  const isSegmentBackedResolve = Boolean(segmentBody);
  const segmentResolve = block.segmentResolve ?? {
    lastPurchaseOperator: "between" as const,
    lastPurchaseValueA: 90,
    lastPurchaseValueB: 180,
    marketingConsent: "Opted In" as const,
    minOrders: 1,
    ordersMonths: 12,
    notPurchasedDays: 30,
  };
  const lastPurchaseText =
    segmentResolve.lastPurchaseOperator === "between"
      ? `Last purchase was between ${segmentResolve.lastPurchaseValueA} and ${segmentResolve.lastPurchaseValueB} days ago`
      : segmentResolve.lastPurchaseOperator === "greater than"
        ? `Last purchase was greater than ${segmentResolve.lastPurchaseValueA} days ago`
        : segmentResolve.lastPurchaseOperator === "less than"
          ? `Last purchase was less than ${segmentResolve.lastPurchaseValueA} days ago`
          : `Last purchase was ${segmentResolve.lastPurchaseValueA} days ago`;
  const segmentResolveParts = [
    lastPurchaseText,
    segmentResolve.marketingConsent === "Opted In"
      ? "Opted In and not surpressed"
      : "Marketing opted out or suppressed",
    `At least ${segmentResolve.minOrders} order${segmentResolve.minOrders === 1 ? "" : "s"} in the last ${segmentResolve.ordersMonths} month${segmentResolve.ordersMonths === 1 ? "" : "s"}`,
    `Not purchased in the last ${segmentResolve.notPurchasedDays} days`,
  ];
  const isLapsedSubscribedSegment = block.segmentId === "g-bi-lapsed6";
  const subscriptionStatus = block.subscriptionStatus ?? "Subscribed";
  const dismissedResolveFields = block.dismissedResolveFields ?? [];
  const isFieldDismissed = (key: string) => dismissedResolveFields.includes(key);
  const includeLapsed = !isFieldDismissed("lapsed");
  const includeSubscription = isLapsedSubscribedSegment && !isFieldDismissed("subscription-status");
  const includeVip = !isLapsedSubscribedSegment && !isFieldDismissed("vip");

  const buildDefinitionParts = () => {
    const parts: string[] = [];
    if (includeLapsed) parts.push(`No orders in the last ${block.windowDays} days`);
    if (includeVip) parts.push("$1,000 lifetime spend or more");
    if (includeSubscription) parts.push(`Email subscription status = ${subscriptionStatus}`);
    return parts;
  };

  const definitionParts = isSegmentBackedResolve
    ? segmentResolveParts
    : buildDefinitionParts();
  const definitionText = definitionParts.length > 0 ? definitionParts.join(" + ") : "No active rules (all resolve fields removed)";

  const dismissField = (key: string) => {
    if (isFieldDismissed(key)) return;
    const next: Partial<Extract<ContentBlock, { type: "flow" }>> = {
      dismissedResolveFields: [...dismissedResolveFields, key],
    };
    if (key === "lapsed") {
      // Remove date-range refinements that are tied to the lapsed condition.
      next.extraWindows = undefined;
    }
    if (key === "subscription-status") {
      next.subscriptionStatus = undefined;
    }
    updateBlock(next);
  };
  const segmentDescription = segmentArtifact?.def?.description
    ?? segmentBody?.purpose
    ?? segmentGroup?.summary
    ?? "Saved segment audience";
  const isNameTaken = useMemo(() => {
    const name = pendingName.trim().toLowerCase();
    return name.length > 0 && PLAYBOOK_TAKEN.includes(name);
  }, [pendingName]);
  const canSaveName = pendingName.trim().length > 0 && !isNameTaken;
  const fieldMapping = block.fieldMapping?.rows.length
    ? {
        ...block.fieldMapping,
        rows: block.fieldMapping.rows.length === 1
          ? block.fieldMapping.rows.map((row) => ({ ...row, primary: true }))
          : block.fieldMapping.rows,
      }
    : {
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
  };
  // Base numeric and display customer counts; this is recomputed from the
  // currently visible/active resolve fields so updates stay consistent.
  const baseNum = segmentPopulationNum ?? CUSTOMER_COUNTS_NUM[180];
  let customerCountNum = baseNum;
  const orderRow = (block.fieldMapping?.rows ?? fieldMapping.rows).find((r) => r.selected === "order_date");

  if (!isSegmentBackedResolve) {
    if (includeLapsed) {
      customerCountNum = CUSTOMER_COUNTS_NUM[block.windowDays] ?? Math.round(baseNum * Math.min(1.5, Math.max(0.2, block.windowDays / 180)));
    }

    if (isLapsedSubscribedSegment && includeSubscription) {
      if (subscriptionStatus === "Unsubscribed") {
        customerCountNum = Math.max(500, Math.round(customerCountNum * 0.32));
      }
    }

    if (includeVip) {
      customerCountNum = Math.max(500, Math.round(customerCountNum * 0.35));
    }

    // If the user added an Order Date filter, prefer its window for the estimate
    if (includeLapsed && orderRow && block.extraWindows) {
      const v = block.extraWindows[orderRow.id];
      if (typeof v === "number") {
        customerCountNum = CUSTOMER_COUNTS_OVERRIDE_NUM[v] ?? CUSTOMER_COUNTS_NUM[v] ?? Math.round(baseNum * Math.min(1, v / 180));
      } else if (v && typeof v === "object") {
        customerCountNum = CUSTOMER_COUNTS_OVERRIDE_NUM[v.min] ?? CUSTOMER_COUNTS_NUM[v.min] ?? Math.round(baseNum * Math.min(1, v.min / 180));
      }
    }
  }
  const customerCount = customerCountNum.toLocaleString();
  const consentedCount = Math.round(customerCountNum * 0.972);
  const schedule = block.schedule ?? {
    mode: "one-off" as const,
    sendNow: true,
    sendLaterDate: TODAY,
    sendLaterTime: "09:00",
    recurringStartDate: TODAY,
    recurringTime: "06:00",
    recurringEndType: "none" as const,
    recurringEndDate: TODAY,
    listAction: "maintain" as const,
  };
  const audienceName = block.savedName ?? segmentArtifact?.name ?? segmentGroup?.name ?? "Lapsed";

  const updateBlock = (patch: Partial<Extract<ContentBlock, { type: "flow" }>>) => {
    onUpdate(messageId, blockId, { ...block, ...patch });
  };

  const createSegmentArtifact = (): Artifact => {
    const segmentId = `seg-${block.flowId}`;
    const orderRow = (fieldRows || []).find((r) => r.selected === "order_date");
    const orderWindow = orderRow && block.extraWindows ? block.extraWindows[orderRow.id] : undefined;
    const populationDisplay = customerCount;
    const criteria = definitionParts.length > 0 ? [...definitionParts] : ["No active rules"];

    return {
      id: segmentId,
      type: "segment" as const,
      name: audienceName,
      status: "saved" as const,
      body: {
        kind: "segment" as const,
        purpose: `A custom audience built from the Meta activation flow.`,
        criteria: [
          ...criteria,
          ...(orderRow ? [`Has ordered in the last ${typeof orderWindow === 'number' ? orderWindow : (orderWindow && typeof orderWindow === 'object' ? `${orderWindow.min}-${orderWindow.max}` : '30')} days`] : []),
        ],
        population: populationDisplay,
        metrics: [
          { label: "Population", value: populationDisplay, hint: "customers" },
          ...(includeSubscription ? [{ label: "Consented customers", value: consentedCount.toLocaleString(), hint: "estimated" as const }] : []),
          { label: "Primary identifier", value: fieldRows.find((row) => row.primary)?.label ?? fieldRows[0]?.label ?? "Email", hint: "primary" },
        ],
      },
      def: {
        id: segmentId,
        kind: "segment" as const,
        name: audienceName,
        description: `Audience created from chat: ${definitionParts.length > 0 ? definitionParts.join(", ").toLowerCase() : "no active rules"}.`,
        entity: "customer",
        logic: definitionParts.length > 0 ? definitionParts.join(" AND ") : "true",
        stat: { label: "customers", value: customerCount },
      },
      usedBy: [
        {
          id: `act-${block.flowId}`,
          type: "activation" as const,
          name: "Meta activation",
          context: "Meta Ads · audience",
          status: "active",
        },
      ],
    };
  };

  const createActivationRecord = (): Activation => {
    const activationId = `act-${block.flowId}-${Date.now()}`;
    const isRecurring = schedule.mode === "recurring";
    const status: Activation["status"] = isRecurring
      ? (schedule.sendNow ? "live" : "scheduled")
      : (schedule.sendNow ? "sent" : "scheduled");
    const whenLabel = isRecurring
      ? (schedule.sendNow
        ? `Live now · daily at ${formatTime(schedule.recurringTime)}`
        : `Scheduled · starts ${formatDate(schedule.sendLaterDate)} ${formatTime(schedule.sendLaterTime)}, daily at ${formatTime(schedule.recurringTime)}`)
      : (schedule.sendNow
        ? "Just now"
        : `Scheduled · ${formatDate(schedule.sendLaterDate)} ${formatTime(schedule.sendLaterTime)}`);
    const result = !isRecurring && schedule.sendNow ? "Audience live" : undefined;
    const destination = block.destination ?? "Meta";
    const channel = destination === "Meta"
      ? "Paid social (Meta)"
      : destination === "Klaviyo"
        ? "Email (Klaviyo)"
        : "Email (Braze)";
    const skill = destination === "Meta"
      ? "Push Meta Audience"
      : destination === "Klaviyo"
        ? "Draft Klaviyo Campaign"
        : "Send Braze Campaign";
    const params = destination === "Meta"
      ? `${audienceName} → Meta custom audience`
      : `${audienceName} → ${destination} campaign`;
    const scheduledDate = !schedule.sendNow
      ? schedule.sendLaterDate
      : undefined;
    const scheduledTime = !schedule.sendNow
      ? schedule.sendLaterTime
      : undefined;
    const recurringStartDate = isRecurring
      ? (schedule.sendNow ? TODAY : schedule.sendLaterDate)
      : undefined;
    const recurringTime = isRecurring ? schedule.recurringTime : undefined;
    const recurringEndDate = isRecurring
      ? (schedule.recurringEndType === "onDate" ? schedule.recurringEndDate : undefined)
      : undefined;
    const listActionLabel = schedule.listAction ? LIST_ACTION_LABELS[schedule.listAction].label : undefined;
    const listActionHint = schedule.listAction ? LIST_ACTION_LABELS[schedule.listAction].hint : undefined;

    return {
      id: activationId,
      name: `${destination} activation — ${audienceName}`,
      context: destination === "Meta" ? "Meta Ads · audience" : `${destination} campaign`,
      segmentId: block.segmentId,
      segmentName: audienceName,
      destinationPlatform: destination,
      platformType: destination === "Meta" ? "Paid social" : "Email",
      channel,
      skill,
      approval: { kind: "auto" },
      status,
      whenLabel,
      scheduledDate,
      scheduledTime,
      recurringStartDate,
      recurringTime,
      recurringEndDate,
      result,
      invocations: [
        {
          skill,
          params: listActionLabel ? `${params} · List action: ${listActionLabel}` : params,
          result: result ?? "Scheduled",
        },
      ],
      trail: [
        {
          at: whenLabel,
          entry: status === "sent"
            ? `Activation sent to ${destination}.`
            : status === "live"
              ? `Recurring activation is live in ${destination}.`
              : `Activation scheduled in ${destination}.`,
        },
        ...(listActionLabel
          ? [{ at: whenLabel, entry: `List strategy: ${listActionLabel}. ${listActionHint}` }]
          : []),
      ],
    };
  };

  const appendStep = (nextBlock: Extract<ContentBlock, { type: "flow" }>) => {
    onNext?.(messageId, blockId, nextBlock);
  };

  const carryForward = {
    segmentId: block.segmentId,
    savedName: block.savedName,
    destination: block.destination,
    subscriptionStatus: block.subscriptionStatus,
    dismissedResolveFields: block.dismissedResolveFields,
    segmentResolve: block.segmentResolve,
    extraWindows: block.extraWindows,
  };

  const updateSegmentResolve = (patch: Partial<typeof segmentResolve>) => {
    updateBlock({ segmentResolve: { ...segmentResolve, ...patch } });
  };

  const parsePositiveInt = (raw: string, fallback: number) => {
    const parsed = Number(raw);
    if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
    return Math.round(parsed);
  };

  const handleWindowChange = (value: string) => {
    updateBlock({ windowDays: Number(value) });
  };

  const handleResolveConfirm = () => {
    updateBlock({ confirmed: true, confirmedText: "Looks right — I’ll show the next step below." });
    if (block.step === "resolve") {
      if (!isSegmentBackedResolve && includeLapsed && block.windowDays !== 180) {
        appendStep({
          type: "flow",
          flowId: block.flowId,
          ...carryForward,
          step: "playbookPrompt",
          windowDays: block.windowDays,
          confirmed: false,
          selectedAction: undefined,
          pendingName: "",
          savedName: block.savedName,
        });
      } else {
        appendStep({
          type: "flow",
          flowId: block.flowId,
          ...carryForward,
          step: "fieldMapping",
          windowDays: block.windowDays,
          confirmed: false,
          fieldMapping,
          schedule,
          savedName: block.savedName,
        });
      }
    }
  };

  const handleOpenAddMore = () => updateBlock({ addingMore: true });
  const handleCancelAddMore = () => updateBlock({ addingMore: false, addingMoreText: undefined });
  const handleAddMore = () => {
    const text = (block.addingMoreText ?? "").trim();
    if (!text) return;
    // Parse either a single number (e.g. "30 days") or a range ("30-90 days")
    const mRange = text.match(/(\d{1,3})\s*-\s*(\d{1,3})\s*days/i);
    const mSingle = !mRange && text.match(/(\d{1,3})\s*days/i);
    const newRowId = `row-order-${Date.now()}`;
    const newRow = {
      id: newRowId,
      label: "Order date",
      selected: "order_date",
      coverage: 85,
      candidates: ["order_date"] as string[],
      primary: false,
      canPrimary: true,
      removable: true,
    };

    const extraWindows = { ...(block.extraWindows ?? {}) } as Record<string, number | { min: number; max: number }>;
    if (mRange) {
      const min = Number(mRange[1]);
      const max = Number(mRange[2]);
      extraWindows[newRowId] = { min, max };
    } else if (mSingle) {
      extraWindows[newRowId] = Number(mSingle[1]);
    } else {
      // default to 30 days when not explicitly mentioned
      extraWindows[newRowId] = 30;
    }

    updateBlock({
      fieldMapping: { ...fieldMapping, rows: [...fieldMapping.rows, newRow] },
      extraWindows,
      addingMore: false,
      addingMoreText: undefined,
    });
  };

  const handleRemoveExtraField = (rowId: string) => {
    const rows = fieldMapping.rows.filter((r) => r.id !== rowId);
    const ew = { ...(block.extraWindows ?? {}) };
    delete ew[rowId];
    updateBlock({ fieldMapping: { ...fieldMapping, rows }, extraWindows: ew });
  };

  const handleExtraWindowChange = (rowId: string, value: number) => {
    updateBlock({ extraWindows: { ...(block.extraWindows ?? {}), [rowId]: value } });
  };

  const handleReject = () => {
    updateBlock({
      correctionOpen: true,
      correctionText: "",
      correctionMessage: undefined,
    });
  };

  const handleApplyCorrection = () => {
    const text = (block.correctionText ?? "").trim();
    if (!text) {
      updateBlock({ correctionMessage: "Tell me what to change so I can update the fields." });
      return;
    }

    const normalized = text.toLowerCase();
    const nextPatch: Partial<Extract<ContentBlock, { type: "flow" }>> = {
      correctionOpen: false,
      correctionMessage: "Updated from your note.",
    };

    const dayMatch = normalized.match(/(\d{1,3})\s*(day|days|d)\b/);
    if (dayMatch) {
      nextPatch.windowDays = Number(dayMatch[1]);
    }

    if (normalized.includes("unsubscribed") || normalized.includes("not subscribed")) {
      nextPatch.subscriptionStatus = "Unsubscribed";
    } else if (normalized.includes("subscribed")) {
      nextPatch.subscriptionStatus = "Subscribed";
    }

    updateBlock(nextPatch);
  };

  const handleSelectAction = (action: "one-off" | "update-definition" | "add-definition") => {
    if (action === "add-definition") {
      updateBlock({ selectedAction: action, pendingName: "" });
      return;
    }
    const confirmedText =
      action === "one-off"
        ? "Kept as a one-off adjustment — playbook default stays at 180 days."
        : `Playbook definition for lapsed updated to ${block.windowDays} days. Your other audiences using lapsed keep 180 unless you tell me otherwise.`;
    updateBlock({ selectedAction: action, confirmed: true, confirmedText });
    appendStep({
      type: "flow",
      flowId: block.flowId,
      ...carryForward,
      step: "fieldMapping",
      windowDays: block.windowDays,
      confirmed: false,
      fieldMapping,
      schedule,
      savedName: block.savedName,
    });
  };

  const handleSaveDefinition = () => {
    const name = pendingName.trim();
    if (!name || isNameTaken) return;
    updateBlock({
      selectedAction: "add-definition",
      confirmed: true,
      savedName: name,
      confirmedText: `"${name}" added to your playbook — no orders in the last ${block.windowDays} days`,
    });
    appendStep({
      type: "flow",
      flowId: block.flowId,
      ...carryForward,
      step: "fieldMapping",
      windowDays: block.windowDays,
      confirmed: false,
      fieldMapping,
      schedule,
      savedName: name,
    });
  };

  const updateFieldRow = (rowId: string, patch: Partial<typeof fieldMapping.rows[number]>) => {
    updateBlock({
      fieldMapping: {
        ...fieldMapping,
        rows: fieldMapping.rows.map((row) => (row.id === rowId ? { ...row, ...patch } : row)),
      },
    });
  };

  const handleFieldSelect = (rowId: string, value: string) => {
    if (value === `search-${rowId}`) {
      updateBlock({
        fieldMapping: {
          ...fieldMapping,
          searchRowId: rowId,
          searchQuery: "",
        },
      });
      return;
    }

    const currentRow = fieldMapping.rows.find((row) => row.id === rowId);
    const usedInOtherRows = fieldMapping.rows.some(
      (row) => row.id !== rowId && row.selected === value,
    );

    if (usedInOtherRows && value !== currentRow?.selected) {
      return;
    }

    const field = FIELD_CATALOG.find((item) => item.id === value);
    updateFieldRow(rowId, {
      selected: value,
      coverage: field?.coverage ?? fieldMapping.rows.find((r) => r.id === rowId)?.coverage ?? 0,
      candidates: field ? Array.from(new Set([...(fieldMapping.rows.find((r) => r.id === rowId)?.candidates ?? []), value])) : fieldMapping.rows.find((r) => r.id === rowId)?.candidates ?? [],
    });
  };

  const handleTogglePrimary = (rowId: string) => {
    updateBlock({
      fieldMapping: {
        ...fieldMapping,
        rows: fieldMapping.rows.map((row) => ({ ...row, primary: row.id === rowId })),
      },
    });
  };

  const handleRemoveRow = (rowId: string) => {
    if (fieldMapping.rows.length <= 1) return;
    const removedPrimary = fieldMapping.rows.some((row) => row.id === rowId && row.primary);
    const remainingRows = fieldMapping.rows.filter((row) => row.id !== rowId);
    updateBlock({
      fieldMapping: {
        ...fieldMapping,
        rows: remainingRows.map((row, index) => ({
          ...row,
          primary: remainingRows.length === 1 || (removedPrimary && index === 0) ? true : row.primary,
        })),
      },
    });
  };

  const handleSearchQuery = (value: string) => {
    updateBlock({ fieldMapping: { ...fieldMapping, searchQuery: value } });
  };

  const handleSearchPick = (rowId: string, fieldId: string) => {
    const field = FIELD_CATALOG.find((item) => item.id === fieldId);
    if (!field) return;

    const currentRow = fieldMapping.rows.find((row) => row.id === rowId);
    const usedInOtherRows = fieldMapping.rows.some(
      (row) => row.id !== rowId && row.selected === field.id,
    );

    if (usedInOtherRows && field.id !== currentRow?.selected) {
      return;
    }

    updateBlock({
      fieldMapping: {
        ...fieldMapping,
        rows: fieldMapping.rows.map((row) =>
          row.id === rowId
            ? {
                ...row,
                selected: field.id,
                coverage: field.coverage,
                candidates: Array.from(new Set([...row.candidates, field.id])),
              }
            : row,
        ),
        searchRowId: undefined,
        searchQuery: "",
      },
    });
  };

  const handleCloseSearch = () => {
    updateBlock({ fieldMapping: { ...fieldMapping, searchRowId: undefined, searchQuery: "" } });
  };

  const handleConfirmMapping = () => {
    updateBlock({ confirmed: true, confirmedText: "Fields confirmed — what destination should I send this to?" });
    appendStep({
      type: "flow",
      flowId: block.flowId,
      ...carryForward,
      step: "destination",
      windowDays: block.windowDays,
      confirmed: false,
      fieldMapping,
      schedule,
      savedName: block.savedName,
      destination: block.destination,
    });
  };

  const handleSelectDestination = (destination: typeof DESTINATION_OPTIONS[number]) => {
    updateBlock({ destination });
  };

  const handleConfirmDestination = () => {
    if (!block.destination) return;
    updateBlock({ confirmed: true, confirmedText: `Destination confirmed — ${block.destination}.` });
    appendStep({
      type: "flow",
      flowId: block.flowId,
      ...carryForward,
      step: "schedule",
      windowDays: block.windowDays,
      confirmed: false,
      fieldMapping,
      schedule,
      savedName: block.savedName,
      destination: block.destination,
    });
  };

  const handleScheduleChange = (patch: Partial<typeof schedule>) => {
    updateBlock({ schedule: { ...schedule, ...patch } });
  };

  const schedulePreview = useMemo(() => {
    const isRecurring = schedule.mode === "recurring";
    if (!isRecurring) {
      return schedule.sendNow
        ? "Sends now, once"
        : `Once on ${formatDate(schedule.sendLaterDate)} at ${formatTime(schedule.sendLaterTime)}`;
    }
    const listActionLabel = LIST_ACTION_LABELS[schedule.listAction ?? "maintain"].label;
    const endText = schedule.recurringEndType === "onDate" ? `, ending ${formatDate(schedule.recurringEndDate)}` : "";
    const startText = schedule.sendNow
      ? "starting now"
      : `starting ${formatDate(schedule.sendLaterDate)} at ${formatTime(schedule.sendLaterTime)}`;
    return `${listActionLabel} list, daily at ${formatTime(schedule.recurringTime)}, ${startText}${endText}`;
  }, [schedule]);

  const handleConfirmSchedule = () => {
    updateBlock({ confirmed: true, confirmedText: `Schedule confirmed — ${schedulePreview} (AEST)` });
    appendStep({
      type: "flow",
      flowId: block.flowId,
      ...carryForward,
      step: "confirmation",
      windowDays: block.windowDays,
      confirmed: false,
      fieldMapping,
      schedule,
      savedName: block.savedName,
    });
  };

  const handleSendActivation = () => {
    const destination = block.destination ?? "Meta";
    const confirmedText = schedule.mode !== "recurring" && schedule.sendNow
      ? `Activation sent to ${destination}`
      : `Activation scheduled — ${schedulePreview} (AEST)`;
    updateBlock({ confirmed: true, confirmedText });
    dispatch({ type: "ADD_ACTIVATION", activation: createActivationRecord() });
    appendStep({
      type: "flow",
      flowId: block.flowId,
      ...carryForward,
      step: "segmentOffer",
      windowDays: block.windowDays,
      confirmed: false,
      fieldMapping,
      schedule,
      savedName: block.savedName,
      destination: block.destination,
    });
  };

  const handleSegmentChoice = (create: boolean) => {
    if (create && !block.segmentCreated) {
      dispatch({ type: "ADD_ARTIFACT", artifact: createSegmentArtifact() });
    }

    updateBlock({
      confirmed: true,
      confirmedText: create
        ? `Segment "${audienceName}" created — no orders in ${block.windowDays} days + $1,000 lifetime spend. You'll find it in your segments and can reuse it anywhere.`
        : "No segment created — you can always ask me to save it later.",
      segmentCreated: create,
    });
  };

  const fieldRows = fieldMapping.rows.map((row) => ({
    ...row,
    canPrimary: row.canPrimary ?? true,
  }));

  const getAvailableFieldOptions = (rowId: string, row: (typeof fieldRows)[number]) => {
    const usedFields = new Set(
      fieldRows.filter((item) => item.id !== rowId).map((item) => item.selected),
    );

    const preferredIds = [...new Set([...(row.candidates ?? []), ...FIELD_CATALOG.map((field) => field.id)])]
      .filter((fieldId) => fieldId === row.selected || !usedFields.has(fieldId));

    return preferredIds.map((fieldId) => {
      const catalogField = FIELD_CATALOG.find((field) => field.id === fieldId);
      return {
        id: fieldId,
        label: catalogField?.label ?? fieldId,
        coverage: catalogField?.coverage ?? getFieldCoverage(fieldId),
      };
    });
  };

  const searchResults = FIELD_CATALOG.filter((field) => {
    const query = fieldMapping.searchQuery?.trim().toLowerCase() ?? "";
    const rowId = fieldMapping.searchRowId;
    const row = rowId ? fieldRows.find((item) => item.id === rowId) : undefined;
    const usedFields = new Set(fieldRows.filter((item) => item.id !== rowId).map((item) => item.selected));

    const isCurrentSelection = field.id === row?.selected;
    const isAvailable = isCurrentSelection || !usedFields.has(field.id);

    return isAvailable && (query.length === 0 || field.label.toLowerCase().includes(query) || field.id.toLowerCase().includes(query));
  });
  const fieldList = fieldRows
    .map((row) => `${row.label.toLowerCase()} (${row.selected})${row.primary ? " — primary" : ""}`)
    .join(", ");

  if (block.step === "resolve" && isSegmentBackedResolve) {
    return (
      <div className="rounded-xl border border-border bg-card p-4">
        <div className="grid gap-3">
          <div className="rounded-lg border border-border/70 bg-background p-3">
            <p className="text-sm font-semibold text-foreground">Customers who match all of these:</p>
            <div className="mt-2 grid gap-3">
              <div className="grid gap-1.5">
                <p className="text-sm font-medium text-foreground">Last purchase</p>
                <div className="flex items-center gap-2 text-sm text-foreground-secondary">
                  <span>was</span>
                  <Select
                    value={segmentResolve.lastPurchaseOperator}
                    onValueChange={(value) => updateSegmentResolve({ lastPurchaseOperator: value as typeof segmentResolve.lastPurchaseOperator })}
                  >
                    <SelectTrigger className="h-8 w-40">
                      <SelectValue placeholder="Choose" />
                    </SelectTrigger>
                    <SelectContent className="w-44">
                      <SelectItem value="between">between</SelectItem>
                      <SelectItem value="greater than">greater than</SelectItem>
                      <SelectItem value="less than">less than</SelectItem>
                      <SelectItem value="is">is</SelectItem>
                    </SelectContent>
                  </Select>
                  <Input
                    type="number"
                    value={segmentResolve.lastPurchaseValueA}
                    onChange={(event) => updateSegmentResolve({ lastPurchaseValueA: parsePositiveInt(event.target.value, segmentResolve.lastPurchaseValueA) })}
                    className="h-8 w-20"
                  />
                  {segmentResolve.lastPurchaseOperator === "between" ? (
                    <>
                      <span>and</span>
                      <Input
                        type="number"
                        value={segmentResolve.lastPurchaseValueB}
                        onChange={(event) => updateSegmentResolve({ lastPurchaseValueB: parsePositiveInt(event.target.value, segmentResolve.lastPurchaseValueB) })}
                        className="h-8 w-20"
                      />
                    </>
                  ) : null}
                  <span>days ago</span>
                </div>
              </div>

              <div className="grid gap-1.5">
                <p className="text-sm font-medium text-foreground">Marketing consent</p>
                <div className="inline-flex rounded-lg border border-border bg-background p-0.5">
                  <button
                    onClick={() => updateSegmentResolve({ marketingConsent: "Opted In" })}
                    className={cn(
                      "rounded-md px-2 py-1 text-xs font-medium transition-colors",
                      segmentResolve.marketingConsent === "Opted In"
                        ? "bg-primary text-primary-foreground"
                        : "text-foreground-secondary hover:bg-accent"
                    )}
                  >
                    Opted In
                  </button>
                  <button
                    onClick={() => updateSegmentResolve({ marketingConsent: "Opted Out" })}
                    className={cn(
                      "rounded-md px-2 py-1 text-xs font-medium transition-colors",
                      segmentResolve.marketingConsent === "Opted Out"
                        ? "bg-primary text-primary-foreground"
                        : "text-foreground-secondary hover:bg-accent"
                    )}
                  >
                    Opted Out
                  </button>
                </div>
              </div>

              <div className="grid gap-1.5">
                <p className="text-sm font-medium text-foreground">Purchase frequency</p>
                <div className="flex items-center gap-2 text-sm text-foreground-secondary">
                  <span>At least</span>
                  <Input
                    type="number"
                    value={segmentResolve.minOrders}
                    onChange={(event) => updateSegmentResolve({ minOrders: parsePositiveInt(event.target.value, segmentResolve.minOrders) })}
                    className="h-8 w-20"
                  />
                  <span>order(s) in the last</span>
                  <Input
                    type="number"
                    value={segmentResolve.ordersMonths}
                    onChange={(event) => updateSegmentResolve({ ordersMonths: parsePositiveInt(event.target.value, segmentResolve.ordersMonths) })}
                    className="h-8 w-20"
                  />
                  <span>months</span>
                </div>
              </div>

              <div className="grid gap-1.5">
                <p className="text-sm font-medium text-foreground">Not purchased</p>
                <div className="flex items-center gap-2 text-sm text-foreground-secondary">
                  <span>in the last</span>
                  <Input
                    type="number"
                    value={segmentResolve.notPurchasedDays}
                    onChange={(event) => updateSegmentResolve({ notPurchasedDays: parsePositiveInt(event.target.value, segmentResolve.notPurchasedDays) })}
                    className="h-8 w-24"
                  />
                  <span>days</span>
                </div>
              </div>

            </div>
          </div>

          <div className="rounded-lg border border-border/70 bg-background p-3">
            <p className="text-sm font-semibold text-foreground">Customers matching right now</p>
            <p className="mt-1 text-3xl font-semibold text-foreground">{customerCount}</p>
          </div>

          {block.confirmed ? (
            <p className="flex items-center gap-2 text-sm text-emerald-600">
              <RiCheckLine className="size-4" /> Confirmed — I’ll show the next step below.
            </p>
          ) : (
            <div className="flex flex-wrap gap-2">
              <Button size="sm" onClick={handleResolveConfirm}>Looks right</Button>
              <Button size="sm" variant="outline" onClick={handleReject}>This is not what I mean</Button>
              <Button size="sm" variant="ghost" onClick={handleOpenAddMore}>Add more</Button>
            </div>
          )}

          {block.correctionOpen ? (
            <div className="rounded-lg border border-border/70 bg-background p-3">
              <p className="text-sm text-foreground-secondary">Tell me what you expected and I’ll update these fields.</p>
              <div className="mt-2 flex flex-wrap gap-2">
                <Input
                  value={block.correctionText ?? ""}
                  onChange={(e) => updateBlock({ correctionText: e.target.value, correctionMessage: undefined })}
                  placeholder="Example: use between 60 and 120 days and set consent to opted in"
                  className="min-w-[18rem] flex-1"
                />
                <Button size="sm" onClick={handleApplyCorrection}>Update fields</Button>
                <Button size="sm" variant="outline" onClick={() => updateBlock({ correctionOpen: false, correctionText: undefined, correctionMessage: undefined })}>Cancel</Button>
              </div>
              {block.correctionMessage ? (
                <p className="mt-2 text-xs text-foreground-secondary">{block.correctionMessage}</p>
              ) : null}
            </div>
          ) : null}

          {block.addingMore ? (
            <div className="mt-3 rounded-lg border border-border/70 bg-background p-3">
              <p className="text-sm text-foreground-secondary">Describe the extra filter you want (e.g. "exclude customers purchased in last 14 days")</p>
              <div className="mt-2 flex gap-2">
                <Input value={block.addingMoreText ?? ""} onChange={(e) => updateBlock({ addingMoreText: e.target.value })} placeholder="Describe extra filter" />
                <Button size="sm" onClick={handleAddMore}>Add</Button>
                <Button size="sm" variant="outline" onClick={handleCancelAddMore}>Cancel</Button>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    );
  }

  if (block.step === "resolve") {
    return (
      <div className="rounded-xl border border-border bg-card p-4">
        <div className="grid gap-3">
          {!isFieldDismissed("subscription-status") && isLapsedSubscribedSegment ? (
            <div className="relative rounded-lg border border-border/70 bg-background p-3">
              <button
                onClick={() => dismissField("subscription-status")}
                className="absolute right-2 top-2 rounded-md p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                title="Remove field"
              >
                <RiCloseLine className="size-3.5" />
              </button>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold text-foreground">Email Subscription Status</p>
                  <p className="mt-1 text-sm leading-relaxed text-foreground-secondary">Only customers who are subscribed to email marketing.</p>
                  <div className="mt-2 inline-flex rounded-lg border border-border bg-background p-0.5">
                    <button
                      onClick={() => updateBlock({ subscriptionStatus: "Subscribed" })}
                      className={cn(
                        "rounded-md px-2 py-1 text-xs font-medium transition-colors",
                        subscriptionStatus === "Subscribed"
                          ? "bg-primary text-primary-foreground"
                          : "text-foreground-secondary hover:bg-accent"
                      )}
                    >
                      Subscribed
                    </button>
                    <button
                      onClick={() => updateBlock({ subscriptionStatus: "Unsubscribed" })}
                      className={cn(
                        "rounded-md px-2 py-1 text-xs font-medium transition-colors",
                        subscriptionStatus === "Unsubscribed"
                          ? "bg-primary text-primary-foreground"
                          : "text-foreground-secondary hover:bg-accent"
                      )}
                    >
                      Unsubscribed
                    </button>
                  </div>
                </div>
                <Badge variant="secondary" size="sm">Playbook definition</Badge>
              </div>
            </div>
          ) : !isFieldDismissed("vip") ? (
            <div className="relative rounded-lg border border-border/70 bg-background p-3">
              <button
                onClick={() => dismissField("vip")}
                className="absolute right-2 top-2 rounded-md p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                title="Remove field"
              >
                <RiCloseLine className="size-3.5" />
              </button>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold text-foreground">VIP</p>
                  <p className="mt-1 text-sm leading-relaxed text-foreground-secondary">Lifetime spend of $1,000 or more.</p>
                </div>
                <Badge variant="secondary" size="sm">Playbook definition</Badge>
              </div>
            </div>
          ) : null}

          {!isFieldDismissed("lapsed") ? (
          <div className="relative rounded-lg border border-border/70 bg-background p-3">
            <button
              onClick={() => dismissField("lapsed")}
              className="absolute right-2 top-2 rounded-md p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              title="Remove field"
            >
              <RiCloseLine className="size-3.5" />
            </button>
            <div className="flex flex-col gap-3">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-foreground">Lapsed</p>
                  <p className="mt-1 text-sm leading-relaxed text-foreground-secondary">
                    No orders in the last{' '}
                    <Select value={String(block.windowDays)} onValueChange={handleWindowChange}>
                      <SelectTrigger className="inline-flex w-auto min-w-[8rem] px-2 py-1.5 text-sm">
                        <SelectValue placeholder="Choose" />
                      </SelectTrigger>
                      <SelectContent className="w-44">
                        {WINDOW_OPTIONS.map((option) => (
                          <SelectItem key={option} value={String(option)}>
                            {option}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {' '}days.
                  </p>
                </div>
                <Badge variant="secondary" size="sm">Playbook definition</Badge>
              </div>
              <p className="text-xs text-muted-foreground">Playbook default: 180 days.</p>
            </div>
          </div>
          ) : null}

          {/* Render any extra, user-added quick filters (e.g. Order Date window) */}
          {includeLapsed && block.extraWindows && Object.keys(block.extraWindows).length > 0 && (
            Object.keys(block.extraWindows).map((rowId) => {
              const v = block.extraWindows?.[rowId] as number | { min: number; max: number } | undefined;
              const selectValue = typeof v === "number" ? String(v) : typeof v === "object" ? String(v.min) : String(30);
              return (
                <div key={rowId} className="rounded-lg border border-border/70 bg-background p-3">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-sm font-semibold text-foreground">Order Date</p>
                      <p className="mt-1 text-sm leading-relaxed text-foreground-secondary">Has ordered in the last{' '}
                        <Select value={selectValue} onValueChange={(v) => handleExtraWindowChange(rowId, Number(v))}>
                          <SelectTrigger className="inline-flex w-auto min-w-[8rem] px-2 py-1.5 text-sm">
                            <SelectValue placeholder="Choose" />
                          </SelectTrigger>
                          <SelectContent className="w-44">
                            {WINDOW_OPTIONS.map((option) => (
                              <SelectItem key={option} value={String(option)}>
                                {option}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {' '}days.
                      </p>
                      {typeof v === 'object' ? (
                        <p className="text-xs text-muted-foreground">Range: {v.min}-{v.max} days</p>
                      ) : null}
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Badge variant="secondary" size="sm">User filter</Badge>
                      <button
                        onClick={() => handleRemoveExtraField(rowId)}
                        className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                        title="Remove field"
                      >
                        <RiCloseLine className="size-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}

          <div className="rounded-lg border border-border/70 bg-background p-3">
            <p className="text-sm font-semibold text-foreground">Customers matching right now</p>
            <p className="mt-1 text-3xl font-semibold text-foreground">{customerCount}</p>
          </div>

          {block.confirmed ? (
            <p className="flex items-center gap-2 text-sm text-emerald-600">
              <RiCheckLine className="size-4" /> Confirmed — I’ll show the next step below.
            </p>
          ) : (
              <div className="flex flex-wrap gap-2">
              <Button size="sm" onClick={handleResolveConfirm}>Looks right</Button>
              <Button size="sm" variant="outline" onClick={handleReject}>That’s not what I meant</Button>
              <Button size="sm" variant="ghost" onClick={handleOpenAddMore}>Add More</Button>
            </div>
          )}

          {block.correctionOpen ? (
            <div className="rounded-lg border border-border/70 bg-background p-3">
              <p className="text-sm text-foreground-secondary">Tell me what you expected and I’ll update these fields.</p>
              <div className="mt-2 flex flex-wrap gap-2">
                <Input
                  value={block.correctionText ?? ""}
                  onChange={(e) => updateBlock({ correctionText: e.target.value, correctionMessage: undefined })}
                  placeholder="Example: make lapsed 90 days and set subscription to unsubscribed"
                  className="min-w-[18rem] flex-1"
                />
                <Button size="sm" onClick={handleApplyCorrection}>Update fields</Button>
                <Button size="sm" variant="outline" onClick={() => updateBlock({ correctionOpen: false, correctionText: undefined, correctionMessage: undefined })}>Cancel</Button>
              </div>
              {block.correctionMessage ? (
                <p className="mt-2 text-xs text-foreground-secondary">{block.correctionMessage}</p>
              ) : null}
            </div>
          ) : null}

          {/* Inline add-more input */}
          {block.addingMore ? (
            <div className="mt-3 rounded-lg border border-border/70 bg-background p-3">
              <p className="text-sm text-foreground-secondary">Describe the extra filter you want (e.g. "That has ordered in the last 30 days")</p>
              <div className="mt-2 flex gap-2">
                <Input value={block.addingMoreText ?? ""} onChange={(e) => updateBlock({ addingMoreText: e.target.value })} placeholder="Describe extra filter" />
                <Button size="sm" onClick={handleAddMore}>Add</Button>
                <Button size="sm" variant="outline" onClick={handleCancelAddMore}>Cancel</Button>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    );
  }

  if (block.step === "playbookPrompt") {
    return (
      <div className="rounded-xl border border-border bg-card p-4">
        <div className="space-y-4">
          <p className="text-sm leading-relaxed text-foreground">
            You set lapsed to {block.windowDays} days instead of your playbook default of 180. How should I treat that?
          </p>
          {!block.confirmed && block.selectedAction !== "add-definition" ? (
            <div className="flex flex-col gap-2">
              <Button size="sm" onClick={() => handleSelectAction("one-off")}>Just for this audience</Button>
              <Button size="sm" variant="outline" onClick={() => handleSelectAction("update-definition")}>Update playbook definition</Button>
              <Button size="sm" variant="outline" onClick={() => handleSelectAction("add-definition")}>Add new playbook definition</Button>
            </div>
          ) : null}

          {block.selectedAction === "add-definition" && !block.confirmed ? (
            <div className="rounded-lg border border-border/70 bg-background p-4">
              <div className="flex items-center gap-2 text-sm text-foreground-secondary">
                <RiBookOpenLine className="size-4" />
                <span>New playbook definition</span>
              </div>
              <div className="mt-4 grid gap-3">
                <div>
                  <p className="text-sm font-semibold text-foreground">Name</p>
                  <Input
                    value={pendingName}
                    onChange={(event) => updateBlock({ pendingName: event.target.value })}
                    placeholder="Recently lapsed"
                  />
                </div>
                <div className="text-sm text-foreground-secondary">
                  no orders in the last {block.windowDays} days
                </div>
                {isNameTaken ? (
                  <p className="text-sm text-amber-700">That name’s already in your playbook. Try another.</p>
                ) : pendingName ? (
                  <p className="text-sm text-emerald-700">That name is available.</p>
                ) : null}
                <div className="flex justify-end">
                  <Button size="sm" onClick={handleSaveDefinition} disabled={!canSaveName}>Save</Button>
                </div>
              </div>
            </div>
          ) : null}

          {block.confirmed ? (
            <p className="flex items-center gap-2 text-sm text-emerald-600">
              <RiCheckLine className="size-4" /> {block.confirmedText ?? "Confirmed."}
            </p>
          ) : null}
        </div>
      </div>
    );
  }

  if (block.step === "fieldMapping") {
    return (
      <div className="rounded-xl border border-border bg-card p-4">
        <div className="space-y-4">
          {segmentArtifact ? (
            <div className="rounded-lg border border-border/70 bg-background p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-foreground">{segmentArtifact.name}</p>
                  <p className="mt-1 text-sm text-foreground-secondary">
                    {segmentDescription}
                  </p>
                </div>
                <Badge variant="secondary" size="sm">Saved segment</Badge>
              </div>
              {segmentCriteria.length > 0 ? (
                <div className="mt-3 space-y-1 text-sm text-foreground-secondary">
                  {segmentCriteria.slice(0, 3).map((crit: string, index: number) => (
                    <p key={index} className="truncate">{crit}</p>
                  ))}
                  {segmentCriteria.length > 3 ? (
                    <p className="text-xs text-muted-foreground">+{segmentCriteria.length - 3} more rules</p>
                  ) : null}
                </div>
              ) : null}
              {segmentPopulationDisplay ? (
                <p className="mt-3 text-sm text-foreground-secondary">
                  Population estimate: <span className="font-medium text-foreground">{segmentPopulationDisplay}</span>
                </p>
              ) : null}
            </div>
          ) : segmentGroup ? (
            <div className="rounded-lg border border-border/70 bg-background p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-foreground">{segmentGroup.name}</p>
                  <p className="mt-1 text-sm text-foreground-secondary">{segmentDescription}</p>
                </div>
                <Badge variant="secondary" size="sm">Saved segment</Badge>
              </div>
              {segmentCriteria.length > 0 ? (
                <div className="mt-3 space-y-1 text-sm text-foreground-secondary">
                  {segmentCriteria.slice(0, 3).map((crit, index) => (
                    <p key={index} className="truncate">{crit}</p>
                  ))}
                  {segmentCriteria.length > 3 ? (
                    <p className="text-xs text-muted-foreground">+{segmentCriteria.length - 3} more rules</p>
                  ) : null}
                </div>
              ) : null}
              {segmentPopulationDisplay ? (
                <p className="mt-3 text-sm text-foreground-secondary">
                  Population estimate: <span className="font-medium text-foreground">{segmentPopulationDisplay}</span>
                </p>
              ) : null}
            </div>
          ) : null}

          {block.destination === "Meta" ? (
            <div className="flex items-start justify-between gap-3 rounded-lg border border-border/70 bg-background p-4">
              <div>
                <p className="text-sm font-semibold text-foreground">Meta custom audiences</p>
                <p className="mt-1 text-sm text-foreground-secondary">
                  Everything is hashed before it leaves. Swap fields, search your catalog, or change the primary identifier.
                </p>
              </div>
              <Badge variant="secondary" size="sm">Meta</Badge>
            </div>
          ) : null}

          <div className="space-y-3">
            {fieldRows.map((row) => {
              const availableOptions = getAvailableFieldOptions(row.id, row);

              return (
                <div key={row.id} className="rounded-lg border border-border/70 bg-background p-3">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-semibold text-foreground">{row.label}</p>
                        {row.primary ? <Badge variant="success" size="sm">Primary identifier</Badge> : null}
                      </div>
                      <p className="mt-1 text-sm text-foreground-secondary">
                        Using your field {getFieldLabel(row.selected)} — {row.coverage}% populated{row.note ? ` · ${row.note}` : ""}
                      </p>
                    </div>
                    <div className="flex flex-col gap-2 min-w-[12rem]">
                      <Select value={row.selected} onValueChange={(value) => handleFieldSelect(row.id, value)}>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Choose field" />
                        </SelectTrigger>
                        <SelectContent className="w-full">
                          {availableOptions.map((candidate) => (
                            <SelectItem key={candidate.id} value={candidate.id}>
                              {candidate.label} — {candidate.coverage}%
                            </SelectItem>
                          ))}
                          <SelectItem value={`search-${row.id}`}>Search another field…</SelectItem>
                        </SelectContent>
                      </Select>

                      <div className="flex flex-wrap items-center justify-between gap-2">
                        {row.canPrimary ? (
                          <label className="flex items-center gap-2 text-sm text-foreground-secondary">
                            <Checkbox
                              checked={row.primary}
                              onCheckedChange={() => handleTogglePrimary(row.id)}
                              aria-label={`Use ${row.label} as primary key`}
                            />
                            <span>Primary key</span>
                          </label>
                        ) : null}

                        <div className="ml-auto flex items-center gap-2">
                          {row.removable ? (
                            <Button size="icon" variant="ghost" disabled={fieldMapping.rows.length <= 1} onClick={() => handleRemoveRow(row.id)}>
                              <RiCloseLine className="size-4" />
                            </Button>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {includeSubscription ? (
            <div className="rounded-lg border border-border/70 bg-emerald-50 p-3">
              <p className="text-sm font-semibold text-foreground">{consentedCount.toLocaleString()} of {customerCount} customers have marketing consent and will be sent</p>
              <p className="mt-1 text-sm text-foreground-secondary">Consent is calculated from your selected audience size.</p>
            </div>
          ) : null}

          {fieldMapping.searchRowId ? (
            <div className="rounded-lg border border-border/70 bg-background p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-foreground">Search another field</p>
                  <p className="mt-1 text-sm text-foreground-secondary">Browse your full field catalog for a better match.</p>
                </div>
                <Button size="icon" variant="ghost" onClick={handleCloseSearch}>
                  <RiCloseLine className="size-4" />
                </Button>
              </div>
              <div className="mt-3 grid gap-3">
                <Input
                  value={fieldMapping.searchQuery}
                  onChange={(event) => handleSearchQuery(event.target.value)}
                  placeholder="Search fields"
                />
                <div className="grid gap-2">
                  {searchResults.map((field) => (
                    <button
                      key={field.id}
                      type="button"
                      onClick={() => handleSearchPick(fieldMapping.searchRowId!, field.id)}
                      className="w-full rounded-lg border border-border/70 bg-card px-3 py-2 text-left text-sm text-foreground transition-colors hover:bg-accent"
                    >
                      <div className="font-medium">{field.label}</div>
                      <div className="text-xs text-muted-foreground">{field.coverage}% coverage</div>
                    </button>
                  ))}
                  {searchResults.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No matches. Try another term.</p>
                  ) : null}
                </div>
              </div>
            </div>
          ) : null}

          {!block.confirmed ? (
            <div className="flex justify-end">
              <Button size="sm" onClick={handleConfirmMapping}>Confirm mapping</Button>
            </div>
          ) : null}

          {block.confirmed ? (
            <p className="flex items-center gap-2 text-sm text-emerald-600">
              <RiCheckLine className="size-4" /> {block.confirmedText ?? "Confirmed."}
            </p>
          ) : null}
        </div>
      </div>
    );
  }

  if (block.step === "destination") {
    return (
      <div className="rounded-xl border border-border bg-card p-4">
        <div className="space-y-4">
          <p className="text-sm leading-relaxed text-foreground">Where should I send this activation?</p>
          <div className="grid gap-3 sm:grid-cols-3">
            {DESTINATION_OPTIONS.map((option) => {
              const selected = block.destination === option;
              return (
                <button
                  key={option}
                  type="button"
                  onClick={() => handleSelectDestination(option)}
                  className={cn(
                    "rounded-2xl border p-4 text-left transition-colors",
                    selected ? "border-primary bg-primary/10" : "border-border/70 bg-background hover:border-primary/60 hover:bg-accent/20",
                  )}
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-semibold text-foreground">{option}</p>
                    {selected ? <Badge size="sm">Selected</Badge> : null}
                  </div>
                  <p className="mt-2 text-sm text-foreground-secondary">{DESTINATION_LABELS[option].summary}</p>
                </button>
              );
            })}
          </div>

          {block.destination ? (
            <div className="rounded-lg border border-border/70 bg-background p-4">
              <p className="text-sm font-semibold text-foreground">{DESTINATION_LABELS[block.destination].summary}</p>
              <p className="mt-1 text-sm text-foreground-secondary">{DESTINATION_LABELS[block.destination].details}</p>
            </div>
          ) : null}

          {block.destination === "Meta" ? (
            <div className="flex items-start justify-between gap-3 rounded-lg border border-border/70 bg-background p-4">
              <div>
                <p className="text-sm font-semibold text-foreground">Meta custom audiences</p>
                <p className="mt-1 text-sm text-foreground-secondary">
                  Everything is hashed before it leaves. Swap fields, search your catalog, or change the primary identifier.
                </p>
              </div>
              <Badge variant="secondary" size="sm">Meta</Badge>
            </div>
          ) : null}

          {!block.confirmed ? (
            <div className="flex justify-end">
              <Button size="sm" onClick={handleConfirmDestination} disabled={!block.destination}>
                Confirm destination
              </Button>
            </div>
          ) : null}

          {block.confirmed ? (
            <p className="flex items-center gap-2 text-sm text-emerald-600">
              <RiCheckLine className="size-4" /> {block.confirmedText ?? "Confirmed."}
            </p>
          ) : null}
        </div>
      </div>
    );
  }

  if (block.step === "schedule") {
    return (
      <div className="rounded-xl border border-border bg-card p-4">
        <div className="space-y-4">
          <p className="text-sm leading-relaxed text-foreground">When should this go?</p>
          <div className="grid gap-3 rounded-lg border border-border/70 bg-background p-4">
            <div className="grid gap-2">
              <p className="text-sm text-foreground-secondary">Send timing</p>
              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant={schedule.sendNow ? "default" : "outline"} onClick={() => handleScheduleChange({ sendNow: true })}>
                  Send now
                </Button>
                <Button size="sm" variant={!schedule.sendNow ? "default" : "outline"} onClick={() => handleScheduleChange({ sendNow: false })}>
                  Schedule send
                </Button>
              </div>
            </div>

            {!schedule.sendNow ? (
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <p className="text-sm text-foreground-secondary">Date</p>
                  <Input
                    type="date"
                    value={schedule.sendLaterDate}
                    min={TODAY}
                    onChange={(event) => handleScheduleChange({ sendLaterDate: event.target.value })}
                  />
                </div>
                <div>
                  <p className="text-sm text-foreground-secondary">Time</p>
                  <Input
                    type="time"
                    value={schedule.sendLaterTime}
                    onChange={(event) => handleScheduleChange({ sendLaterTime: event.target.value })}
                  />
                </div>
              </div>
            ) : null}

            <div className="grid gap-2">
              <p className="text-sm text-foreground-secondary">Reoccurring</p>
              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant={schedule.mode === "recurring" ? "default" : "outline"}
                  onClick={() => {
                    const nextMode = schedule.mode === "recurring" ? "one-off" : "recurring";
                    handleScheduleChange({
                      mode: nextMode,
                      ...(nextMode === "one-off" ? { recurringEndType: "none", recurringEndDate: schedule.recurringEndDate } : {}),
                    });
                  }}
                >
                  Reoccurring
                </Button>
              </div>
            </div>

            {schedule.mode === "recurring" ? (
              <div className="grid gap-3">
                <div className="grid gap-2">
                  <p className="text-sm text-foreground-secondary">How should we handle your current list?</p>
                  <Select
                    value={schedule.listAction ?? "maintain"}
                    onValueChange={(value) => handleScheduleChange({ listAction: value as "append" | "maintain" | "update" })}
                  >
                    <SelectTrigger className="w-full max-w-sm">
                      <SelectValue placeholder="Select list action" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="append">Append</SelectItem>
                      <SelectItem value="maintain">Maintain</SelectItem>
                      <SelectItem value="update">Update</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">{LIST_ACTION_LABELS[schedule.listAction ?? "maintain"].hint}</p>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <p className="text-sm text-foreground-secondary">Preferred daily send time</p>
                    <Input
                      type="time"
                      value={schedule.recurringTime}
                      onChange={(event) => handleScheduleChange({ recurringTime: event.target.value })}
                    />
                  </div>
                </div>

                <div>
                  <p className="text-sm text-foreground-secondary">End date</p>
                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" variant={schedule.recurringEndType === "none" ? "default" : "outline"} onClick={() => handleScheduleChange({ recurringEndType: "none" })}>
                      No end date
                    </Button>
                    <Button size="sm" variant={schedule.recurringEndType === "onDate" ? "default" : "outline"} onClick={() => handleScheduleChange({ recurringEndType: "onDate" })}>
                      On date
                    </Button>
                  </div>
                  {schedule.recurringEndType === "onDate" ? (
                    <div className="mt-3 max-w-sm">
                      <Input
                        type="date"
                        value={schedule.recurringEndDate}
                        min={schedule.sendNow ? TODAY : schedule.sendLaterDate}
                        onChange={(event) => handleScheduleChange({ recurringEndDate: event.target.value })}
                      />
                    </div>
                  ) : null}
                </div>
              </div>
            ) : null}
          </div>

          <div className="flex items-center gap-2 rounded-lg border border-border/70 bg-background p-3 text-sm text-foreground-secondary">
            <RiBookOpenLine className="size-4 text-muted-foreground" />
            <span>{schedulePreview} · All times AEST</span>
          </div>

          {!block.confirmed ? (
            <div className="flex justify-end">
              <Button size="sm" onClick={handleConfirmSchedule}>Confirm schedule</Button>
            </div>
          ) : null}

          {block.confirmed ? (
            <p className="flex items-center gap-2 text-sm text-emerald-600">
              <RiCheckLine className="size-4" /> {block.confirmedText ?? "Schedule confirmed."}
            </p>
          ) : null}
        </div>
      </div>
    );
  }

  if (block.step === "confirmation") {
    return (
      <div className="rounded-xl border border-border bg-card p-4">
        <div className="space-y-4">
          <p className="text-sm leading-relaxed text-foreground">Here’s everything, updated with your schedule. Ready to go?</p>

          <div className="grid gap-3 rounded-lg border border-border/70 bg-background p-4 text-sm text-foreground-secondary">
            <div className="grid gap-1">
              <span className="font-semibold text-foreground">Audience</span>
              <span>{audienceName} — {customerCount} customers</span>
            </div>
            <div className="grid gap-1">
              <span className="font-semibold text-foreground">Definition</span>
              <span>{definitionText}</span>
            </div>
            <div className="grid gap-1">
              <span className="font-semibold text-foreground">Sent to Meta</span>
              <span>{includeSubscription ? `${consentedCount.toLocaleString()} consented customers` : `${customerCount} customers`}</span>
            </div>
            <div className="grid gap-1">
              <span className="font-semibold text-foreground">Fields</span>
              <span>{fieldList}</span>
            </div>
            <div className="grid gap-1">
              <span className="font-semibold text-foreground">Schedule</span>
              <span>{schedulePreview} (AEST)</span>
            </div>
          </div>

          {!block.confirmed ? (
            <div className="flex justify-end">
              <Button size="sm" onClick={handleSendActivation}>
                {schedule.mode !== "recurring" && schedule.sendNow ? "Send to Meta now" : "Schedule activation"}
              </Button>
            </div>
          ) : null}

          {block.confirmed ? (
            <p className="flex items-center gap-2 text-sm text-emerald-600">
              <RiCheckLine className="size-4" /> {block.confirmedText ?? "Activation confirmed."}
            </p>
          ) : null}
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="space-y-4">
        <p className="text-sm leading-relaxed text-foreground">
          All done. One more thing — want me to save this audience as a reusable segment? It keeps this exact definition so you can use it for other channels, campaigns, or reporting without rebuilding it.
        </p>
        {!block.confirmed ? (
          <div className="flex flex-col gap-2">
            <Button size="sm" onClick={() => handleSegmentChoice(true)}>Create segment</Button>
            <Button size="sm" variant="outline" onClick={() => handleSegmentChoice(false)}>
              Not now
            </Button>
          </div>
        ) : null}
        {block.confirmed ? (
          <p className="flex items-center gap-2 text-sm text-emerald-600">
            <RiCheckLine className="size-4" /> {block.confirmedText}
          </p>
        ) : null}
        {block.confirmed && onClose ? (
          <div className="mt-4 flex justify-end">
            <Button size="sm" variant="outline" onClick={onClose}>
              Close
            </Button>
          </div>
        ) : null}
        {block.confirmed && onClose ? (
          <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
            <div className="flex items-center gap-2">
              <RiCheckLine className="size-4" />
              <span>Activation complete — everything is saved and ready to go.</span>
            </div>
          </div>
        ) : null}
        {block.confirmed && onClose ? (
          <div className="mt-4 flex justify-end">
            <Button size="sm" variant="outline" onClick={onClose}>
              Close
            </Button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
