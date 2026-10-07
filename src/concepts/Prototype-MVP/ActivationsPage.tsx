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
import { Textarea } from "@/components/ui/Textarea";
import { Checkbox } from "@/components/ui/Checkbox";
import { FilterBar } from "@/components/ui/FilterBar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/Tabs";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/Table";
import ActivationFlowBlock from "./components/ActivationFlowBlock";
import {
  RiSearchLine, RiBroadcastLine, RiGroupLine, RiShieldCheckLine, RiLockLine,
  RiPlayLine, RiTimeLine, RiFlag2Line, RiArrowRightSLine, RiPriceTag3Line,
  RiFullscreenLine, RiFullscreenExitLine, RiCloseLine,
} from "@remixicon/react";
import { getDef } from "@/data/def-registry";
import type { ContentBlock } from "./types";
import { ACTIVATION_STATUS_META, ALWAYS_AVAILABLE_ACTIVATION_ID, approvalLabel, DEFAULT_ACTIVATION_HISTORY, getActivation, getActivationDestinationPlatform, getActivationPlatformType, type Activation, type ActivationStatus } from "./activations-mock";
import { useSession } from "./store";
import { buildMentionGroups } from "./ChatPanel";
import { ConfirmDialog } from "@/components/ui/Dialog";

function getActivationCreatedBy(activation: Activation) {
  const creator = activation.createdBy;
  if (creator && !["System", "Lexi automation", "Pending approval"].includes(creator)) return creator;
  return activation.approval.kind === "approved" ? activation.approval.by : "Amy";
}

function formatDetailDate(value?: string) {
  if (!value) return "Not set";
  const dateOnly = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (dateOnly) return `${dateOnly[3]}/${dateOnly[2]}/${dateOnly[1]}`;
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleDateString("en-AU", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function formatDetailTime(value?: string) {
  if (!value) return "Not set";
  const time = value.match(/^(\d{1,2}):(\d{2})$/);
  if (!time) return value;
  const hour = Number(time[1]);
  if (Number.isNaN(hour) || hour < 0 || hour > 23) return value;
  return `${hour % 12 || 12}:${time[2]} ${hour >= 12 ? "pm" : "am"}`;
}

// ─── Page ──────────────────────────────────────────────────────────────────────

export function ActivationsPage({
  onOpenActivation,
  onStartActivationWorkflow,
  prefillSegmentId,
  onPrefillComplete,
  initialStatusFilter,
}: {
  onOpenActivation?: (id: string) => void;
  onStartActivationWorkflow?: () => void;
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
  const segmentMentionGroups = useMemo(
    () => buildMentionGroups().filter((group) => group.label === "Segments"),
    [],
  );

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
      a.status !== "awaiting-approval" &&
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

  const formatClock = (value?: string) => {
    if (!value) return undefined;
    const m = value.match(/^(\d{1,2}):(\d{2})$/);
    if (!m) return value;
    const hh = Number(m[1]);
    if (Number.isNaN(hh) || hh < 0 || hh > 23) return value;
    const period = hh >= 12 ? "pm" : "am";
    const displayHour = hh % 12 || 12;
    return `${displayHour}:${m[2]} ${period}`;
  };

  const formatDateTime = (dateValue?: string, timeValue?: string) => {
    const date = formatIsoDate(dateValue);
    if (!date) return "-";
    const time = formatClock(timeValue);
    return time ? `${date} ${time}` : date;
  };

  const activationLatestSync = (activation: Activation) => {
    const syncRows = activation.history?.filter((row) => row.note.startsWith("Manual delta sync:")) ?? [];
    return syncRows[syncRows.length - 1];
  };

  const activationSendDate = (activation: Activation) => {
    const scheduledDate = formatIsoDate(activation.scheduledDate ?? activation.recurringStartDate);
    if (scheduledDate) return scheduledDate;

    if (activation.status === "sent" || activation.status === "completed") {
      const createdDate = formatIsoDate(activation.createdAt);
      if (createdDate) return createdDate;
      return activation.whenLabel.replace(/^(?:Sent|Completed)\s*[·:]?\s*/i, "") || activation.whenLabel;
    }

    const liveSince = activation.whenLabel.match(/^Live since\s+(.+)$/i)?.[1];
    return liveSince ?? formatIsoDate(activation.createdAt) ?? "-";
  };

  const activationEndDateTime = (activation: Activation) => {
    return formatDateTime(activation.recurringEndDate ?? activation.scheduledEndDate, activation.recurringEndTime);
  };

  const activationDeliveryTime = (activation: Activation) => {
    const isRecurring = activationCadence(activation).toLowerCase().includes("recurr");
    const direct = isRecurring
      ? activation.recurringTime ?? activation.mvpDetails?.recurringTime
      : activation.scheduledTime;
    if (direct) return formatClock(direct) ?? direct;

    if (isRecurring) {
      const fromLabel = activation.whenLabel.match(/daily at\s+([^,]+)/i)?.[1]?.trim();
      if (fromLabel) return fromLabel;
      return "-";
    }

    let idHash = 0;
    for (const character of activation.id) idHash = (idHash * 31 + character.charCodeAt(0)) >>> 0;
    const minutesAfterEight = (idHash % 40) * 15;
    const hour = 8 + Math.floor(minutesAfterEight / 60);
    const minute = String(minutesAfterEight % 60).padStart(2, "0");
    return formatClock(`${String(hour).padStart(2, "0")}:${minute}`) ?? "-";
  };

  const activationFrequency = (activation: Activation) => {
    if (activation.mvpDetails?.timing) return activation.mvpDetails.timing;
    if (activation.status === "live" || activation.status === "sent") return "Send Now";
    if (activation.recurringStartDate || activation.scheduledDate) return "Schedule Send";
    return "Send Now";
  };

  const activationCadence = (activation: Activation) => {
    const baseCadence = activation.activationCadence ?? activation.mvpDetails?.cadence
      ?? (activation.recurringStartDate ? "Recurring" : "Once Off");
    return baseCadence;
  };

  const activationWhen = (activation: Activation) => {
    const frequency = activationFrequency(activation);
    const cadence = activation.mvpDetails?.cadence
      ?? (activation.recurringStartDate ? "Recurring" : "Once Off");

    const isRecurring = cadence.toLowerCase().includes("recurr");
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
    setDrawerMounted(true);
    setDrawerOpen(false);
    setDrawerFullScreen(false);
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
    <div className="flex h-full flex-col">
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
            handleNewActivationSubmit("New activation", []);
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
                <TableHead className="w-40">Created by</TableHead>
                <TableHead>Context</TableHead>
                <TableHead className="w-40">Destination platform</TableHead>
                <TableHead className="w-36">Platform type</TableHead>
                <TableHead className="w-32">Frequency</TableHead>
                <TableHead className="w-56">Cadence</TableHead>
                <TableHead className="w-40">Status</TableHead>
                <TableHead className="w-44">Send date</TableHead>
                <TableHead className="w-44">End date</TableHead>
                <TableHead className="w-40">Delivery time</TableHead>
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
                    <TableCell className="text-sm text-foreground-secondary">{getActivationCreatedBy(a)}</TableCell>
                    <TableCell className="max-w-[12rem] truncate text-sm text-muted-foreground">{a.context}</TableCell>
                    <TableCell className="text-sm text-foreground-secondary">{getActivationDestinationPlatform(a)}</TableCell>
                    <TableCell className="text-sm text-foreground-secondary">{getActivationPlatformType(a)}</TableCell>
                    <TableCell className="text-sm text-foreground-secondary">{activationFrequency(a)}</TableCell>
                    <TableCell className="max-w-[18rem] text-sm text-foreground-secondary">
                      <div className="flex flex-wrap items-center gap-2">
                        <span>{activationCadence(a)}</span>
                        {activationLatestSync(a) ? <Badge variant="secondary" size="sm">Synced</Badge> : null}
                      </div>
                    </TableCell>
                    <TableCell><Badge variant={s.variant} size="sm">{s.label}</Badge></TableCell>
                    <TableCell className="text-sm text-foreground-secondary">
                      <div>{activationSendDate(a)}</div>
                      {activationLatestSync(a) ? (
                        <p className="mt-0.5 text-xs text-muted-foreground">Synced {activationLatestSync(a)?.date}</p>
                      ) : null}
                    </TableCell>
                    <TableCell className="text-sm text-foreground-secondary">{activationEndDateTime(a)}</TableCell>
                    <TableCell className="text-sm text-foreground-secondary">{activationDeliveryTime(a)}</TableCell>
                  </TableRow>
                );
              })}
              {shown.length === 0 && (
                <TableRow><TableCell colSpan={12} className="py-10 text-center text-sm text-muted-foreground">No activations match these filters.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
          <p className="text-sm text-muted-foreground">Displaying {shown.length} of {activations.length} activations</p>
        </div>
      </div>

      {drawerMounted ? (
        <div className="fixed inset-0 z-50 flex items-stretch">
          <div className={cn(
            "absolute inset-0 bg-background/40 backdrop-blur-sm transition-opacity duration-300",
            drawerOpen ? "opacity-100" : "opacity-0 pointer-events-none",
          )} />
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
              ) : (
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
        description="Any unsent changes will be lost. Are you sure you want to exit the activation process?"
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

export interface ActivationEditDraft {
  activationDefinition: string;
  cadence: "Once Off" | "Recurring";
  recurringDeliveryTime: string;
  recurringEndDate: string;
}

export function ActivationDetail({ activation, onOpenSegment, categoryOptions, onCategoryChange, isEditing = false, editDraft, onEditDraftChange }: {
  activation: Activation;
  onOpenSegment?: (id: string) => void;
  categoryOptions?: string[];
  onCategoryChange?: (category: string) => void;
  isEditing?: boolean;
  editDraft?: ActivationEditDraft;
  onEditDraftChange?: (patch: Partial<ActivationEditDraft>) => void;
}) {
  const [activeTab, setActiveTab] = useState("details");
  useEffect(() => {
    if (isEditing) setActiveTab("details");
  }, [isEditing]);
  const s = ACTIVATION_STATUS_META[activation.status];

  const detailPopulation = activation.mvpDetails?.population ?? "Not specified";
  const detailActivationName = activation.mvpDetails?.activationName ?? activation.name;
  const detailActivationDefinition = activation.mvpDetails?.activationDefinition ?? activation.activationDefinition ?? activation.result ?? "Not specified";
  const detailCreatedBy = getActivationCreatedBy(activation);
  const detailSegmentUsed = activation.mvpDetails?.segmentName ?? activation.segmentName ?? "Not specified";
  const detailDataSource = activation.mvpDetails?.dataSource ?? activation.channel;
  const detailAccounts = activation.mvpDetails?.accounts?.length
    ? activation.mvpDetails.accounts.join(", ")
    : "No accounts selected";
  const detailFieldMapping = activation.mvpDetails?.fieldMapping?.length
    ? activation.mvpDetails.fieldMapping
    : [
        "Email -> Email address (98%)",
        "Phone -> Mobile (92%)",
        "First name -> First Name (96%)",
        "Last name -> Last Name (95%)",
      ];
  const rankedFieldMappings = detailFieldMapping
    .map((mapping, index) => ({
      mapping: mapping.replace(/\s*\(Primary key\)/i, ""),
      index,
      coverage: Number(mapping.match(/(\d+(?:\.\d+)?)%/)?.[1] ?? -1),
    }))
    .sort((left, right) => right.coverage - left.coverage || left.index - right.index);
  const hasRankedFieldMappings = rankedFieldMappings[0]?.coverage >= 0;
  const detailTiming = activation.mvpDetails?.timing
    ?? (activation.scheduledDate || activation.recurringStartDate ? "Schedule Send" : "Send Now");
  const detailCadence = activation.activationCadence ?? activation.mvpDetails?.cadence
    ?? (activation.recurringStartDate ? "Recurring" : "Once Off");
  const detailSendDate = activation.scheduledDate ?? activation.recurringStartDate
    ?? (activation.status === "sent" || activation.status === "completed" ? activation.createdAt : undefined);
  const detailEndDate = detailCadence === "Recurring" ? activation.recurringEndDate : undefined;
  const detailDeliveryTime = detailCadence === "Recurring"
    ? activation.recurringTime ?? activation.mvpDetails?.recurringTime
    : activation.scheduledTime;
  const detailCustomers = activation.mvpDetails?.customers?.length
    ? activation.mvpDetails.customers
    : [
        { id: `${activation.id}-cust-1`, name: "Ava Thompson", segmentName: detailSegmentUsed, lastPurchase: "Last purchase 34 days ago" },
        { id: `${activation.id}-cust-2`, name: "Liam Nguyen", segmentName: detailSegmentUsed, lastPurchase: "Last purchase 49 days ago" },
        { id: `${activation.id}-cust-3`, name: "Mia Rodriguez", segmentName: detailSegmentUsed, lastPurchase: "Last purchase 62 days ago" },
      ];

  const isOneOffActivation = !activation.recurringStartDate && !!activation.scheduledDate;
  const baseHistoryRows = isOneOffActivation
    ? [{
        date: activation.scheduledDate ?? "Scheduled",
        profilesSent: 18240,
        delta: 0,
        note: "Single send",
      }]
    : (activation.history ?? DEFAULT_ACTIVATION_HISTORY);
  const historyRows = activation.history ?? baseHistoryRows;
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const failedHistoryIndex = historyRows.findIndex((row) => row.failed);
  const chartValues = historyRows.map((row) => row.profilesSent);
  const minValue = Math.min(...chartValues) * 0.9;
  const maxValue = Math.max(...chartValues) * 1.08;
  const padLeft = 42;
  const padRight = 10;
  const padTop = 18;
  const padBottom = 28;
  const chartWidth = 520;
  const chartHeight = 180;
  const chartInnerWidth = chartWidth - padLeft - padRight;
  const chartInnerHeight = chartHeight - padTop - padBottom;
  const pointX = (index: number) => padLeft + (index / Math.max(historyRows.length - 1, 1)) * chartInnerWidth;
  const pointY = (value: number) => padTop + chartInnerHeight - ((value - minValue) / Math.max(maxValue - minValue, 1)) * chartInnerHeight;
  const linePath = historyRows.map((row, index) => `${index === 0 ? "M" : "L"} ${pointX(index)} ${pointY(row.profilesSent)}`).join(" ");
  const hoverPoint = hoveredIndex !== null ? historyRows[hoveredIndex] : null;

  return (
    <div className="flex flex-col gap-6 p-4">
      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-base font-semibold text-foreground">{activation.name}</h2>
          <Badge variant={s.variant} size="sm">{s.label}</Badge>
        </div>
        <p className="text-xs text-muted-foreground">{activation.context} · {activation.whenLabel}</p>
      </div>

      {activation.status === "failed" && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-3">
          <div className="flex items-center gap-2">
            <Badge variant="danger" size="sm">Failed</Badge>
            <p className="text-xs font-medium text-destructive">Why this activation failed</p>
          </div>
          <p className="mt-2 text-sm text-foreground-secondary">
            The Meta account token expired mid-push, so the audience sync stopped before new customers were added.
          </p>
          <div className="mt-3 rounded-lg border border-border bg-background/70 p-2.5">
            <p className="text-[11px] font-medium uppercase tracking-normal text-muted-foreground">Resolution steps</p>
            <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm text-foreground-secondary">
              <li>Refresh the external token and re-authenticate the integration.</li>
              <li>Confirm the audience mapping and target segment are still valid.</li>
              <li>Retry the activation once the connection is restored.</li>
            </ol>
          </div>
        </div>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-3">
        <TabsList variant="underline" className="w-full">
          <TabsTrigger value="details">Details</TabsTrigger>
          <TabsTrigger value="customers">Customers</TabsTrigger>
          <TabsTrigger value="history">Activation history</TabsTrigger>
        </TabsList>

        <TabsContent value="details" className="space-y-3">
          <div className="rounded-xl border border-border bg-card p-4">
            <p className="text-xs font-medium uppercase tracking-normal text-muted-foreground">Population</p>
            <p className="mt-1 text-lg font-semibold text-foreground tabular-nums">{detailPopulation}</p>
          </div>

          <div className="rounded-xl border border-border bg-card p-4">
            <p className="text-xs font-medium uppercase tracking-normal text-muted-foreground">Activation name</p>
            <p className="mt-1 text-sm font-medium text-foreground">{detailActivationName}</p>

            <p className="mt-3 text-xs font-medium uppercase tracking-normal text-muted-foreground">Created by</p>
            <p className="mt-1 text-sm font-medium text-foreground">{detailCreatedBy}</p>

            <p className="mt-3 text-xs font-medium uppercase tracking-normal text-muted-foreground">Activation definition</p>
            {isEditing && editDraft && onEditDraftChange ? (
              <Textarea
                className="mt-1"
                rows={3}
                value={editDraft.activationDefinition}
                onChange={(event) => onEditDraftChange({ activationDefinition: event.target.value })}
              />
            ) : (
              <p className="mt-1 text-sm text-foreground-secondary">{detailActivationDefinition}</p>
            )}

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
            <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm text-foreground-secondary">
              {rankedFieldMappings.map(({ mapping }, index) => (
                <li key={`${activation.id}-map-${index}`} className={hasRankedFieldMappings && index === 0 ? "font-semibold text-foreground" : undefined}>
                  {mapping}{hasRankedFieldMappings && index === 0 ? <span className="ml-1 font-bold text-primary" aria-label="Primary key" title="Primary key">*</span> : null}
                </li>
              ))}
            </ol>
            {hasRankedFieldMappings ? (
              <p className="mt-2 text-xs text-muted-foreground"><span className="font-bold text-primary">*</span> Primary key</p>
            ) : null}
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-border bg-card p-4">
              <p className="text-xs font-medium uppercase tracking-normal text-muted-foreground">Timing</p>
              <p className="mt-2 text-sm font-semibold text-foreground">{detailTiming}</p>
              <dl className="mt-3 space-y-2">
                <div>
                  <dt className="text-xs text-muted-foreground">Delivery time</dt>
                  <dd className="mt-0.5 text-sm font-medium text-foreground">
                    {isEditing
                      ? <span className="inline-flex items-center gap-1.5 rounded-lg bg-muted px-2 py-1 text-muted-foreground"><RiLockLine className="size-3.5" />{formatDetailTime(detailDeliveryTime)}</span>
                      : formatDetailTime(detailDeliveryTime)}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">Send date</dt>
                  <dd className="mt-0.5 text-sm font-medium text-foreground">
                    {isEditing
                      ? <span className="inline-flex items-center gap-1.5 rounded-lg bg-muted px-2 py-1 text-muted-foreground"><RiLockLine className="size-3.5" />{formatDetailDate(detailSendDate)}</span>
                      : formatDetailDate(detailSendDate)}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">End date</dt>
                  <dd className="mt-0.5 text-sm font-medium text-foreground">
                    {isEditing
                      ? <span className="inline-flex items-center gap-1.5 rounded-lg bg-muted px-2 py-1 text-muted-foreground"><RiLockLine className="size-3.5" />{detailEndDate ? formatDetailDate(detailEndDate) : "No end date"}</span>
                      : detailEndDate ? formatDetailDate(detailEndDate) : "No end date"}
                  </dd>
                </div>
              </dl>
              {isEditing ? <p className="mt-3 text-xs italic text-muted-foreground">Scheduling Activations coming soon</p> : null}
            </div>
            <div className="rounded-xl border border-border bg-card p-4">
              <p className="text-xs font-medium uppercase tracking-normal text-muted-foreground">Cadence</p>
              <p className={cn("mt-2 text-sm font-semibold", isEditing ? "inline-flex items-center gap-1.5 rounded-lg bg-muted px-2 py-1 text-muted-foreground" : "text-foreground")}>
                {isEditing ? <RiLockLine className="size-3.5" /> : null}{detailCadence}
              </p>
              {isEditing ? <p className="mt-3 text-xs italic text-muted-foreground">Recurring Activations coming soon</p> : null}
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
                  <p className="mt-1 text-xs text-foreground-secondary">{customer.segmentName}</p>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">{customer.lastPurchase}</p>
                </div>
              ))}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="history" className="space-y-3">
          <div className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium uppercase tracking-normal text-muted-foreground">Activation send history</p>
              <span className="text-xs text-foreground-secondary">Profiles sent</span>
            </div>

            <div className="mt-3 overflow-hidden rounded-lg border border-border/70 bg-background">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Profiles sent</TableHead>
                    <TableHead>Delta</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {historyRows.map((row, index) => (
                    <TableRow key={`${row.date}-${index}`} className={row.failed ? "bg-destructive/5" : undefined}>
                      <TableCell className={row.failed ? "font-medium text-destructive" : "font-medium text-foreground"}>
                        <div>{row.date}</div>
                        {row.note.startsWith("Manual delta sync:") ? (
                          <p className="mt-0.5 text-xs font-normal text-foreground-secondary">{row.note}</p>
                        ) : null}
                      </TableCell>
                      <TableCell className={row.failed ? "tabular-nums text-destructive" : "tabular-nums text-foreground-secondary"}>{row.profilesSent.toLocaleString()}</TableCell>
                      <TableCell className={row.failed ? "text-destructive" : row.delta >= 0 ? "text-emerald-600" : "text-destructive"}>
                        {row.delta > 0 ? "+" : ""}{row.delta}%
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card p-4">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-xs font-medium uppercase tracking-normal text-muted-foreground">Volume trend</p>
              <span className="text-xs text-foreground-secondary">Hover data points for deltas</span>
            </div>

            <div className="relative overflow-hidden rounded-lg border border-border/70 bg-background p-2">
              <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="h-[210px] w-full" preserveAspectRatio="xMidYMid meet">
                {[0, 1, 2, 3].map((tick) => {
                  const y = padTop + (chartInnerHeight * tick) / 3;
                  const value = Math.round(maxValue - ((maxValue - minValue) * tick) / 3);
                  return (
                    <g key={tick}>
                      <line x1={padLeft} x2={chartWidth - padRight} y1={y} y2={y} stroke="currentColor" strokeOpacity={0.08} />
                      <text x={padLeft - 8} y={y + 4} textAnchor="end" fontSize={10} fill="currentColor" fillOpacity={0.5}>{value.toLocaleString()}</text>
                    </g>
                  );
                })}

                <path d={linePath} fill="none" stroke="oklch(62.698% 0.10432 189.917)" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />

                {historyRows.map((row, index) => {
                  const isFailedPoint = Boolean(row.failed);
                  const pointColor = isFailedPoint ? "oklch(56.3% 0.224 18.58)" : "oklch(62.698% 0.10432 189.917)";
                  return (
                    <g key={`${row.date}-${index}`}>
                      <circle
                        cx={pointX(index)}
                        cy={pointY(row.profilesSent)}
                        r={hoveredIndex === index ? 6 : 4}
                        fill={hoveredIndex === index ? pointColor : isFailedPoint ? "#f97316" : "white"}
                        stroke={pointColor}
                        strokeWidth={2}
                        onMouseEnter={() => setHoveredIndex(index)}
                        onMouseLeave={() => setHoveredIndex(null)}
                      />
                    </g>
                  );
                })}

                {historyRows.map((row, index) => (
                  <text key={`${row.date}-axis-${index}`} x={pointX(index)} y={chartHeight - 6} textAnchor="middle" fontSize={9} fill="currentColor" fillOpacity={0.45}>{row.date}</text>
                ))}
              </svg>

              {hoverPoint && (
                <div className="pointer-events-none absolute min-w-[120px] rounded-lg border border-border bg-popover/95 p-2 shadow-sm" style={{ left: `${(pointX(historyRows.indexOf(hoverPoint)) / chartWidth) * 100}%`, top: `${Math.max(10, pointY(hoverPoint.profilesSent) / chartHeight * 100 - 12)}%`, transform: "translate(-50%, -100%)" }}>
                  <div className={hoverPoint.failed ? "text-[10px] font-medium uppercase tracking-normal text-destructive" : "text-[10px] font-medium uppercase tracking-normal text-muted-foreground"}>{hoverPoint.date}</div>
                  <div className={hoverPoint.failed ? "mt-1 text-sm font-semibold text-destructive" : "mt-1 text-sm font-semibold text-foreground"}>{hoverPoint.profilesSent.toLocaleString()} sent</div>
                  <div className={hoverPoint.failed ? "text-xs text-destructive" : hoverPoint.delta >= 0 ? "text-xs text-emerald-600" : "text-xs text-destructive"}>{hoverPoint.delta > 0 ? "+" : ""}{hoverPoint.delta}% vs prior</div>
                  {hoverPoint.note.startsWith("Manual delta sync:") ? <div className="mt-1 text-xs text-foreground-secondary">{hoverPoint.note}</div> : null}
                </div>
              )}
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
