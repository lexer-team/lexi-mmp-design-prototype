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
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/Table";
import ActivationFlowBlock from "./components/ActivationFlowBlock";
import {
  RiSearchLine, RiBroadcastLine, RiGroupLine, RiShieldCheckLine,
  RiPlayLine, RiTimeLine, RiFlag2Line, RiArrowRightSLine, RiPriceTag3Line,
  RiFullscreenLine, RiFullscreenExitLine, RiCloseLine,
} from "@remixicon/react";
import type { RemixiconComponentType } from "@remixicon/react";
import { getDef } from "@/data/def-registry";
import type { ContentBlock } from "./types";
import { ACTIVATION_STATUS_META, approvalLabel, type Activation, type ActivationStatus } from "./activations-mock";
import { useSession } from "./store";
import { buildMentionGroups } from "./ChatPanel";
import { ConfirmDialog } from "@/components/ui/Dialog";

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

  const activations = state.activations;
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

export function ActivationDetail({ activation, onOpenSegment, categoryOptions, onCategoryChange }: {
  activation: Activation;
  onOpenSegment?: (id: string) => void;
  categoryOptions?: string[];
  onCategoryChange?: (category: string) => void;
}) {
  const s = ACTIVATION_STATUS_META[activation.status];
  return (
    <div className="flex flex-col gap-6 p-4">
      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-base font-semibold text-foreground">{activation.name}</h2>
          <Badge variant={s.variant} size="sm">{s.label}</Badge>
        </div>
        <p className="text-xs text-muted-foreground">{activation.context} · {activation.whenLabel}</p>
      </div>

      {/* Links */}
      <div className="flex flex-col gap-1.5">
        {activation.segmentName && (
          <LinkRow
            icon={RiGroupLine}
            label="Segment"
            value={activation.segmentName}
            onClick={onOpenSegment && activation.segmentId ? () => onOpenSegment(activation.segmentId!) : undefined}
          />
        )}
        <LinkRow icon={RiBroadcastLine} label="Channel" value={activation.channel} />
        <CategoryRow
          icon={RiPriceTag3Line}
          label="Category"
          value={activation.category ?? "Uncategorised"}
          options={categoryOptions ?? ["Uncategorised"]}
          onChange={onCategoryChange}
        />
      </div>

      {/* Approval */}
      <div className="flex flex-col gap-2">
        <h3 className="text-sm font-semibold text-foreground">Approval</h3>
        <div className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2">
          {activation.approval.kind === "auto" ? (
            <><RiPlayLine className="size-4 text-muted-foreground" /><span className="text-sm text-foreground-secondary">Proceeded automatically.</span></>
          ) : activation.approval.kind === "pending" ? (
            <><RiTimeLine className="size-4 text-amber-600" /><span className="text-sm text-foreground-secondary">Awaiting human sign-off.</span></>
          ) : (
            <><RiShieldCheckLine className="size-4 text-emerald-600" /><span className="text-sm text-foreground-secondary">Approved by {activation.approval.by} · {activation.approval.at}</span></>
          )}
        </div>
      </div>

      {/* Skills invoked */}
      <div className="flex flex-col gap-2">
        <h3 className="text-sm font-semibold text-foreground">Skills invoked</h3>
        <div className="flex flex-col gap-2">
          {activation.invocations.map((inv, i) => (
            <div key={i} className="rounded-lg border border-border bg-card p-3">
              <div className="flex items-center gap-2">
                <RiFlag2Line className="size-3.5 shrink-0 text-primary" />
                <span className="text-sm font-medium text-foreground">{inv.skill}</span>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">{inv.params}</p>
              <p className="mt-1 text-sm text-foreground-secondary"><span className="text-muted-foreground">Result:</span> {inv.result}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Outcome */}
      {activation.result && (
        <div className="flex flex-col gap-1.5">
          <h3 className="text-sm font-semibold text-foreground">Outcome</h3>
          <p className="text-sm leading-relaxed text-foreground-secondary">{activation.result}</p>
        </div>
      )}

      {/* Audit trail */}
      <div className="flex flex-col gap-2">
        <h3 className="text-sm font-semibold text-foreground">Decision trail</h3>
        <ol className="flex flex-col gap-2 border-l border-border pl-4">
          {activation.trail.map((t, i) => (
            <li key={i} className="relative">
              <span className="absolute -left-[1.3rem] top-1 size-2 rounded-full bg-primary/50" />
              <p className="text-sm text-foreground-secondary">{t.entry}</p>
              <p className="text-xs text-muted-foreground">{t.at}</p>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}

function CategoryRow({
  icon: Icon,
  label,
  value,
  options,
  onChange,
}: {
  icon: RemixiconComponentType;
  label: string;
  value: string;
  options: string[];
  onChange?: (category: string) => void;
}) {
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState("");
  const sortedOptions = Array.from(new Set([value, ...options])).sort((a, b) => a.localeCompare(b));

  const commitAdd = () => {
    const next = draft.trim();
    if (!next) return;
    onChange?.(next);
    setDraft("");
    setAdding(false);
  };

  return (
    <div className="flex flex-col gap-2 px-2 py-1.5">
      <div className="flex items-center gap-2">
        <Icon className="size-4 shrink-0 text-muted-foreground" />
        <span className="w-20 shrink-0 text-xs text-muted-foreground">{label}</span>
        <select
          value={value}
          onChange={(e) => {
            const next = e.target.value;
            if (next === "__add_new__") {
              setAdding(true);
              return;
            }
            onChange?.(next);
          }}
          className="h-8 min-w-0 flex-1 rounded-md border border-input-border bg-input px-2.5 text-sm text-foreground"
        >
          {sortedOptions.map((option) => (
            <option key={option} value={option}>{option}</option>
          ))}
          <option value="__add_new__">+ Add new category</option>
        </select>
      </div>

      {adding ? (
        <div className="ml-[6.5rem] flex min-w-0 items-center gap-2">
          <Input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") commitAdd();
              if (e.key === "Escape") {
                setAdding(false);
                setDraft("");
              }
            }}
            placeholder="New category"
            className="h-8"
          />
          <Button size="sm" className="h-8 px-2.5" onClick={commitAdd}>Add</Button>
          <Button
            size="sm"
            variant="outline"
            className="h-8 px-2.5"
            onClick={() => {
              setAdding(false);
              setDraft("");
            }}
          >
            Cancel
          </Button>
        </div>
      ) : null}
    </div>
  );
}

function LinkRow({ icon: Icon, label, value, onClick }: {
  icon: RemixiconComponentType; label: string; value: string; onClick?: () => void;
}) {
  const inner = (
    <>
      <Icon className="size-4 shrink-0 text-muted-foreground" />
      <span className="w-20 shrink-0 text-xs text-muted-foreground">{label}</span>
      <span className={cn("min-w-0 flex-1 truncate text-sm", onClick ? "font-medium text-foreground" : "text-foreground-secondary")}>{value}</span>
      {onClick && <RiArrowRightSLine className="size-4 shrink-0 text-muted-foreground" />}
    </>
  );
  return onClick ? (
    <button onClick={onClick} className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-left transition-colors hover:bg-accent">{inner}</button>
  ) : (
    <div className="flex items-center gap-2 px-2 py-1.5">{inner}</div>
  );
}
