import { useEffect, useMemo, useState } from "react";
import { RiFocus3Line, RiPencilLine, RiExpandDiagonalLine, RiCloseLine } from "@remixicon/react";
import type { ReasoningAssumption } from "../types";
import { MentionText } from "./RichText";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog, Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/Dialog";

export interface SegmentConfirmedPayload {
  id: string;
  name: string;
  description: string;
  purpose: string;
  population: string;
  assumptions: ReasoningAssumption[];
}

function derivePopulationFromAssumptions(assumptions: ReasoningAssumption[], isEarlyAccessFlow: boolean): string {
  const assumptionPopulation = assumptions.find((assumption) => {
    const label = assumption.label.toLowerCase();
    return label.includes("population") || label.includes("audience size") || label.includes("audience");
  })?.value;

  if (assumptionPopulation) return assumptionPopulation;
  if (isEarlyAccessFlow) return "3,420";
  return "2,840";
}

function assumptionsEqual(left: ReasoningAssumption[], right: ReasoningAssumption[]): boolean {
  if (left.length !== right.length) return false;
  for (let index = 0; index < left.length; index += 1) {
    const lhs = left[index];
    const rhs = right[index];
    if (lhs.id !== rhs.id || lhs.label !== rhs.label || lhs.value !== rhs.value) {
      return false;
    }
  }
  return true;
}

interface ReasoningBlockProps {
  goal: string;
  assumptions: ReasoningAssumption[];
  mode?: "verify" | "confirmation";
  /** When live, the card is the pending step: assumptions are editable. The user
   *  confirms simply by typing / sending (no button). */
  live?: boolean;
  onConfirm?: () => void;
  onReject?: () => void;
  onRequestEdit?: () => void;
  editSessionActive?: boolean;
  onSegmentOpenPanel?: (payload: SegmentConfirmedPayload) => void;
  onSegmentApprove?: (payload: SegmentConfirmedPayload) => void;
  onSegmentActivate?: (payload: SegmentConfirmedPayload) => void;
  onVerifyConfirm?: (payload: { assumptions: ReasoningAssumption[]; goal: string; population: string }) => void;
  hideEditSegmentAction?: boolean;
  hideActivateAction?: boolean;
  skipConfirmationCard?: boolean;
}

/**
 * "Verify assumptions" — a gated step. Lexi shows its read of the goal +
 * constraints as an editable card *before* it builds anything; each assumption
 * is traced to the definition it's derived from (hover for detail). The user
 * confirms by typing the next message — no explicit button.
 */
export function ReasoningBlock({
  goal,
  assumptions,
  mode = "verify",
  live,
  onConfirm,
  onReject,
  onRequestEdit,
  editSessionActive,
  onSegmentOpenPanel,
  onSegmentApprove,
  onSegmentActivate,
  onVerifyConfirm,
  hideEditSegmentAction = false,
  hideActivateAction = false,
  skipConfirmationCard = false,
}: ReasoningBlockProps) {
  const isEarlyAccessFlow = useMemo(() => {
    const all = `${goal} ${assumptions.map((a) => `${a.label} ${a.value}`).join(" ")}`.toLowerCase();
    return all.includes("early access") && all.includes("black friday");
  }, [assumptions, goal]);

  const [currentAssumptions, setCurrentAssumptions] = useState<ReasoningAssumption[]>(assumptions);
  const [validateApproved, setValidateApproved] = useState(false);
  const [finalApproved, setFinalApproved] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [segmentId] = useState(() => `seg-confirmed-${Date.now()}-${Math.floor(Math.random() * 10000)}`);
  const [segmentName, setSegmentName] = useState(() => inferSmartSegmentName(currentAssumptions, goal));
  const [nameDraft, setNameDraft] = useState(segmentName);
  const [segmentDescription, setSegmentDescription] = useState("");
  const [segmentPurpose, setSegmentPurpose] = useState("");
  const [purposeDraft, setPurposeDraft] = useState("");
  const [editingPurpose, setEditingPurpose] = useState(false);
  const [descriptionDraft, setDescriptionDraft] = useState("");
  const [editingDescription, setEditingDescription] = useState(false);
  const [descriptionEdited, setDescriptionEdited] = useState(false);
  const [activated, setActivated] = useState(false);
  const [editingAssumptionId, setEditingAssumptionId] = useState<string | null>(null);
  const [assumptionValueDraft, setAssumptionValueDraft] = useState("");
  const [newConditionDraft, setNewConditionDraft] = useState("");
  const [verifyGoalOverride, setVerifyGoalOverride] = useState<string | null>(null);
  const [estimatedPopulationOverride, setEstimatedPopulationOverride] = useState<string | null>(null);
  const [updatedAssumptions, setUpdatedAssumptions] = useState<ReasoningAssumption[]>(assumptions);
  const [appliedGoalOverride, setAppliedGoalOverride] = useState<string | null>(null);
  const [appliedPopulationOverride, setAppliedPopulationOverride] = useState<string | null>(null);
  const [confirmPopulation, setConfirmPopulation] = useState<string | null>(null);
  const [confirmWithoutUpdateOpen, setConfirmWithoutUpdateOpen] = useState(false);
  const [startOverConfirmOpen, setStartOverConfirmOpen] = useState(false);

  useEffect(() => {
    setCurrentAssumptions(assumptions);
    setUpdatedAssumptions(assumptions);
    setVerifyGoalOverride(null);
    setEstimatedPopulationOverride(null);
    setAppliedGoalOverride(null);
    setAppliedPopulationOverride(null);
    setConfirmPopulation(null);
  }, [assumptions]);

  const description = useMemo(() => {
    if (isEarlyAccessFlow) {
      return "Black Friday customers targeted early-access sequencing and premium bundles before broad discount sends";
    }

    const hasOrderDateRecent = currentAssumptions.some((a) => {
      const label = a.label.toLowerCase();
      const value = a.value.toLowerCase();
      return label === "order date" && value.includes("within last 180 days");
    });
    const hasFrequency = currentAssumptions.some((a) => a.label.toLowerCase() === "frequency" && a.value.toLowerCase().includes("4+ orders lifetime"));
    const hasTotalSpend = currentAssumptions.some((a) => a.label.toLowerCase() === "total spend" && a.value.replace(/\s+/g, "") === "$5000");
    const hasLoyaltyTier = currentAssumptions.some((a) => a.label.toLowerCase() === "loyalty tier" && a.value.toLowerCase() === "gold");

    if (hasOrderDateRecent && hasFrequency && hasTotalSpend && hasLoyaltyTier) {
      return "Your most consistently valuable customers - Top 15-20% lifetime spenders with 4+ purchases, and have purchased in the last 180 days. This segment is worth premium experiences over broad promos.";
    }

    const highValue = currentAssumptions.find((a) => a.label.toLowerCase() === "high value")?.value;
    const orderDates = currentAssumptions
      .filter((a) => a.label.toLowerCase() === "order date")
      .map((a) => a.value);
    const country = currentAssumptions.find((a) => a.label.toLowerCase() === "country")?.value;

    const parts = [
      "Customers who match the validated high-value and order timing conditions for this segment.",
      highValue ? `High value threshold: ${highValue}.` : "",
      orderDates.length > 0 ? `Order date constraints: ${orderDates.join(" AND ")}.` : "",
      country ? `Geography constraint: ${country}.` : "",
    ].filter(Boolean);

    return parts.join(" ");
  }, [currentAssumptions, isEarlyAccessFlow]);

  useEffect(() => {
    if (isEarlyAccessFlow) {
      const expectedName = "Early Access Customers for Black Friday";
      setSegmentName(expectedName);
      setNameDraft(expectedName);
    }
  }, [isEarlyAccessFlow]);

  useEffect(() => {
    if (!descriptionEdited) {
      setSegmentDescription(description);
      setDescriptionDraft(description);
    }
  }, [description, descriptionEdited]);

  const populationValue = useMemo(() => {
    return derivePopulationFromAssumptions(currentAssumptions, isEarlyAccessFlow);
  }, [currentAssumptions, isEarlyAccessFlow]);

  const displayedPopulation = estimatedPopulationOverride ?? populationValue;
  const hasPendingInlineChanges = useMemo(
    () => Boolean(editingAssumptionId) || !assumptionsEqual(currentAssumptions, updatedAssumptions),
    [currentAssumptions, editingAssumptionId, updatedAssumptions],
  );

  const payload: SegmentConfirmedPayload = {
    id: segmentId,
    name: segmentName,
    description: segmentDescription,
    purpose: segmentPurpose,
    population: confirmPopulation ?? displayedPopulation,
    assumptions: currentAssumptions,
  };

  const approveFinalCard = () => {
    setFinalApproved(true);
    setEditingName(false);
    onSegmentApprove?.(payload);
    onConfirm?.();
  };

  const applyNameEdit = () => {
    const next = nameDraft.trim();
    if (!next) return;
    setSegmentName(next);
    setEditingName(false);
  };

  const applyDescriptionEdit = () => {
    const next = descriptionDraft.trim();
    if (!next) return;
    setSegmentDescription(next);
    setDescriptionEdited(true);
    setEditingDescription(false);
  };

  const applyPurposeEdit = () => {
    setSegmentPurpose(purposeDraft.trim());
    setEditingPurpose(false);
  };

  const rejectFromVerifyCard = () => {
    onReject?.();
  };

  const beginAssumptionValueEdit = (assumption: ReasoningAssumption) => {
    setEditingAssumptionId(assumption.id);
    setAssumptionValueDraft(assumption.value.trim() ? assumption.value : assumption.label);
  };

  const cancelAssumptionValueEdit = () => {
    setEditingAssumptionId(null);
    setAssumptionValueDraft("");
  };

  const saveAssumptionValueEdit = (assumptionId: string) => {
    setCurrentAssumptions((prev) => prev.map((assumption) => (
      assumption.id === assumptionId
        ? (assumption.value.trim()
          ? { ...assumption, value: assumptionValueDraft.trim() }
          : { ...assumption, label: assumptionValueDraft.trim() })
        : assumption
    )));
    setEditingAssumptionId(null);
    setAssumptionValueDraft("");
  };

  const removeAssumption = (assumptionId: string) => {
    setCurrentAssumptions((prev) => prev.filter((assumption) => assumption.id !== assumptionId));
    if (editingAssumptionId === assumptionId) {
      setEditingAssumptionId(null);
      setAssumptionValueDraft("");
    }
  };

  const addAssumption = () => {
    const raw = newConditionDraft.trim();
    if (!raw) return;

    const pair = raw.match(/^(.+?)\s*(?:=|is|are|should be|to be)\s+(.+)$/i);
    const next: ReasoningAssumption = pair
      ? {
          id: `assumption-added-${Date.now()}`,
          label: pair[1].trim(),
          value: pair[2].trim(),
        }
      : {
          id: `assumption-added-${Date.now()}`,
          label: raw,
          value: "",
        };

    setCurrentAssumptions((prev) => [...prev, next]);
    setNewConditionDraft("");
  };

  const applyUpdatedPreview = () => {
    const workingAssumptions = currentAssumptions.map((assumption) => {
      if (editingAssumptionId !== assumption.id) return assumption;
      const next = assumptionValueDraft.trim();
      return assumption.value.trim()
        ? { ...assumption, value: next }
        : { ...assumption, label: next };
    });

    setCurrentAssumptions(workingAssumptions);
    setUpdatedAssumptions(workingAssumptions);
    setEditingAssumptionId(null);
    setAssumptionValueDraft("");

    const normalized = workingAssumptions.map((assumption) => {
      const label = assumption.label.toLowerCase();
      const value = assumption.value.toLowerCase();
      return { label, value };
    });

    const hasHighValueNo = normalized.some(({ label, value }) => (
      (label.includes("[[def-1]]") || label.includes("high value"))
      && /\bno\b|\bnot\b/.test(value)
    ));

    const hasAustraliaAndNz = normalized.some(({ label, value }) => (
      (label.includes("[[attr-1]]") || label.includes("country"))
      && (
        /australia\s+or\s+new\s+zealand\s+or\s+both/.test(value)
        || /either\s+australia\s+or\s+new\s+zealand/.test(value)
        || (value.includes("australia") && value.includes("new zealand"))
      )
    ));

    const hasNotUsa = normalized.some(({ label, value }) => (
      (label.includes("[[attr-1]]") || label.includes("country"))
      && /not\s+(united\s+states|usa|us|u\.s\.a)/.test(value)
    ));

    const hasShirts = normalized.some(({ label, value }) => (
      (label.includes("[[attr-18]]") || label.includes("product type"))
      && /shirt/.test(value)
    ));

    if (hasHighValueNo && hasAustraliaAndNz && hasNotUsa && hasShirts) {
      const goalOverride = "Description: Customers are not High Value who live in either Australia or New Zealand or both but not in the United States that buy shirts.";
      const populationOverride = "4,260";
      setVerifyGoalOverride(goalOverride);
      setEstimatedPopulationOverride(populationOverride);
      setAppliedGoalOverride(goalOverride);
      setAppliedPopulationOverride(populationOverride);
      return;
    }

    setVerifyGoalOverride(null);
    setEstimatedPopulationOverride(null);
    setAppliedGoalOverride(null);
    setAppliedPopulationOverride(null);
  };

  const commitValidation = (nextAssumptions: ReasoningAssumption[], nextGoalOverride: string | null, nextPopulation: string) => {
    setCurrentAssumptions(nextAssumptions);
    setVerifyGoalOverride(nextGoalOverride);
    setEstimatedPopulationOverride(nextPopulation === derivePopulationFromAssumptions(nextAssumptions, isEarlyAccessFlow) ? null : nextPopulation);
    setConfirmPopulation(nextPopulation);
    if (skipConfirmationCard) {
      onVerifyConfirm?.({
        assumptions: nextAssumptions,
        goal: nextGoalOverride ?? goal,
        population: nextPopulation,
      });
      onConfirm?.();
      return;
    }
    setValidateApproved(true);
  };

  const approveValidation = () => {
    if (hasPendingInlineChanges) {
      setConfirmWithoutUpdateOpen(true);
      return;
    }
    commitValidation(currentAssumptions, verifyGoalOverride, displayedPopulation);
  };

  const confirmWithoutUpdating = () => {
    const baselineAssumptions = updatedAssumptions.map((assumption) => ({ ...assumption }));
    const baselinePopulation = appliedPopulationOverride ?? derivePopulationFromAssumptions(baselineAssumptions, isEarlyAccessFlow);
    setEditingAssumptionId(null);
    setAssumptionValueDraft("");
    commitValidation(baselineAssumptions, appliedGoalOverride, baselinePopulation);
    setConfirmWithoutUpdateOpen(false);
  };

  const returnToVerifyAssumptions = () => {
    setFinalApproved(false);
    setValidateApproved(false);
    setActivated(false);
    setEditingName(false);
    setEditingDescription(false);
    setEditingPurpose(false);
  };

  if (mode === "confirmation") {
    const inferredName = currentAssumptions.find((a) => a.label.toLowerCase() === "segment name")?.value ?? inferSmartSegmentName(currentAssumptions, goal);
    const inferredDescription = currentAssumptions.find((a) => a.label.toLowerCase() === "segment description")?.value ?? "";
    const inferredPopulation = derivePopulationFromAssumptions(currentAssumptions, isEarlyAccessFlow);
    return (
      <div className="rounded-xl border border-border bg-background p-3.5">
        <div className="flex items-center justify-between gap-2">
          <h4 className="text-sm font-semibold text-foreground">{inferredName}</h4>
          <span className="rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">Confirmation</span>
        </div>
        <p className="mt-1 text-sm text-foreground-secondary">{goal}</p>
        {inferredDescription ? (
          <p className="mt-2 text-sm leading-relaxed text-foreground-secondary">{inferredDescription}</p>
        ) : null}
        <p className="mt-2 text-sm text-foreground">
          <span className="font-medium">Population:</span>{" "}
          {inferredPopulation}
        </p>
        <p className="mt-3 text-xs font-semibold uppercase tracking-[0.02em] text-foreground-secondary">Validated assumptions</p>
        <dl className="mt-2.5 space-y-1.5">
          {currentAssumptions
            .filter((a) => {
              const label = a.label.toLowerCase();
              return label !== "segment name" && label !== "segment description" && !label.includes("population");
            })
            .map((a) => (
            <div key={a.id} className="flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-0.5">
              <dt className="text-sm font-medium text-foreground-secondary"><MentionText content={a.label} /></dt>
              {a.value.trim() ? (
                <dd className="text-sm text-foreground"><MentionText content={a.value} /></dd>
              ) : null}
            </div>
            ))}
        </dl>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="rounded-xl border border-border bg-card p-3.5">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-1.5">
          <RiFocus3Line className="size-3.5 text-primary" />
          <span className="text-sm font-semibold text-foreground">Verify assumptions</span>
        </div>
        <div className="rounded-lg border border-teal-300 bg-teal-50 px-3 py-1.5 text-right shadow-sm">
          <p className="text-[11px] font-semibold uppercase tracking-[0.04em] text-teal-700">Estimated population</p>
          <p className="text-lg font-extrabold leading-tight text-teal-900">{displayedPopulation}</p>
        </div>
      </div>

      {/* Goal — what Lexi is optimising for */}
      <p className="mt-2 text-sm font-medium leading-relaxed text-foreground">{verifyGoalOverride ?? goal}</p>

      <p className="mt-2.5 text-xs font-semibold uppercase tracking-[0.02em] text-foreground-secondary">Validated assumptions</p>
      <ul className="mt-2 space-y-1.5">
        {currentAssumptions.map((a) => (
          <li key={a.id} className="flex items-start gap-2 text-sm text-foreground">
            <div className="mt-[7px] size-1.5 shrink-0 rounded-full bg-foreground-secondary/50" />
            <div className="min-w-0 flex-1">
              <span className="font-medium text-foreground-secondary"><MentionText content={a.label} /></span>
              {a.value.trim() ? (
                <>
                  <span>: </span>
                  {editingAssumptionId === a.id ? (
                    <input
                      value={assumptionValueDraft}
                      onChange={(event) => setAssumptionValueDraft(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") {
                          event.preventDefault();
                          saveAssumptionValueEdit(a.id);
                        }
                        if (event.key === "Escape") {
                          event.preventDefault();
                          cancelAssumptionValueEdit();
                        }
                      }}
                      onBlur={() => saveAssumptionValueEdit(a.id)}
                      autoFocus
                      className="min-w-[200px] rounded-md border border-input bg-card px-2 py-0.5 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring/40"
                    />
                  ) : (
                    <button
                      type="button"
                      onClick={() => beginAssumptionValueEdit(a)}
                      className="inline-flex items-center gap-1 rounded px-1 py-0.5 text-left text-sm text-foreground underline-offset-2 transition-colors hover:bg-accent hover:underline"
                      title="Click to edit"
                    >
                      <MentionText content={a.value} />
                      <RiPencilLine className="size-3 text-muted-foreground" />
                    </button>
                  )}
                </>
              ) : (
                <>
                  {editingAssumptionId === a.id ? (
                    <input
                      value={assumptionValueDraft}
                      onChange={(event) => setAssumptionValueDraft(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") {
                          event.preventDefault();
                          saveAssumptionValueEdit(a.id);
                        }
                        if (event.key === "Escape") {
                          event.preventDefault();
                          cancelAssumptionValueEdit();
                        }
                      }}
                      onBlur={() => saveAssumptionValueEdit(a.id)}
                      autoFocus
                      className="ml-1 min-w-[200px] rounded-md border border-input bg-card px-2 py-0.5 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring/40"
                    />
                  ) : (
                    <button
                      type="button"
                      onClick={() => beginAssumptionValueEdit(a)}
                      className="ml-1 inline-flex items-center gap-1 rounded px-1 py-0.5 text-left text-sm text-foreground underline-offset-2 transition-colors hover:bg-accent hover:underline"
                      title="Click to edit"
                    >
                      <RiPencilLine className="size-3 text-muted-foreground" />
                    </button>
                  )}
                </>
              )}
            </div>
            <button
              type="button"
              onClick={() => removeAssumption(a.id)}
              className="mt-0.5 inline-flex size-6 shrink-0 items-center justify-center rounded-md border border-border bg-card text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              aria-label={`Remove condition ${a.label}`}
              title="Remove condition"
            >
              <RiCloseLine className="size-3.5" />
            </button>
          </li>
        ))}
      </ul>

      <div className="mt-2 flex items-center gap-2">
        <input
          value={newConditionDraft}
          onChange={(event) => setNewConditionDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              addAssumption();
            }
          }}
          placeholder="Add condition (e.g. Country is New Zealand)"
          className="h-9 min-w-0 flex-1 rounded-md border border-input bg-card px-2.5 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring/40"
        />
      </div>

      <div className="mt-3 flex justify-end gap-2">
        <button
          type="button"
          onClick={applyUpdatedPreview}
          disabled={Boolean(editSessionActive)}
          className={[
            "rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors",
            editSessionActive
              ? "cursor-not-allowed border-primary/50 bg-primary/10 text-primary"
              : "border-border bg-card text-foreground hover:bg-accent",
          ].join(" ")}
        >
          Update
        </button>
        {!hideEditSegmentAction ? (
          <button
            type="button"
            onClick={onRequestEdit}
            disabled={Boolean(editSessionActive)}
            className={[
              "rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors",
              editSessionActive
                ? "cursor-not-allowed border-primary/50 bg-primary/10 text-primary"
                : "border-border bg-card text-foreground hover:bg-accent",
            ].join(" ")}
          >
            Edit Segment
          </button>
        ) : null}
        <button
          type="button"
          onClick={rejectFromVerifyCard}
          className="rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-accent"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={approveValidation}
          disabled={validateApproved}
          className={[
            "rounded-lg px-3 py-1.5 text-xs font-medium transition-colors",
            validateApproved
              ? "cursor-not-allowed bg-muted text-muted-foreground"
              : "bg-primary text-primary-foreground hover:bg-primary/90",
          ].join(" ")}
        >
          {validateApproved ? "Confirmed!" : "Confirm"}
        </button>
      </div>
      </div>

      <Dialog open={confirmWithoutUpdateOpen} onOpenChange={setConfirmWithoutUpdateOpen}>
        <DialogContent size="sm">
          <DialogHeader>
            <DialogTitle>Confirm Without Updating?</DialogTitle>
            <DialogDescription>Are you sure you want to confirm without updating?</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                applyUpdatedPreview();
                setConfirmWithoutUpdateOpen(false);
              }}
            >
              Update
            </Button>
            <Button onClick={confirmWithoutUpdating}>Confirm</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {validateApproved && !skipConfirmationCard ? (
        <div className="rounded-xl border border-border bg-background p-3.5">
          <div className="flex items-center justify-between gap-2">
            {editingName ? (
              <div className="flex min-w-0 flex-1 items-center gap-2">
                <input
                  value={nameDraft}
                  onChange={(e) => setNameDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") applyNameEdit();
                    if (e.key === "Escape") {
                      setNameDraft(segmentName);
                      setEditingName(false);
                    }
                  }}
                  className="h-8 min-w-0 flex-1 rounded-lg border border-input bg-card px-2.5 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring/40"
                />
                <button
                  type="button"
                  onClick={applyNameEdit}
                  className="rounded-lg bg-primary px-2.5 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90"
                >
                  Save
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => {
                  if (finalApproved) return;
                  setNameDraft(segmentName);
                  setEditingName(true);
                }}
                className="inline-flex items-center gap-1 rounded-md px-1 py-0.5 text-left text-sm font-semibold text-foreground transition-colors hover:bg-accent"
                title={finalApproved ? undefined : "Click to edit segment name"}
              >
                <span>{segmentName}</span>
                {!finalApproved ? <RiPencilLine className="size-3 text-muted-foreground" /> : null}
              </button>
            )}

            <div className="flex items-center gap-1.5">
              {finalApproved ? (
                <button
                  type="button"
                  onClick={() => onSegmentOpenPanel?.(payload)}
                  title="Open segment panel"
                  className="inline-flex size-7 items-center justify-center rounded-lg border border-border bg-card text-foreground transition-colors hover:bg-accent"
                >
                  <RiExpandDiagonalLine className="size-4" />
                </button>
              ) : null}
            </div>
          </div>

          <div className="mt-2">
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm font-semibold text-foreground">Segment Description:</span>
            </div>

            {editingDescription ? (
              <div className="mt-2 space-y-2">
                <textarea
                  value={descriptionDraft}
                  onChange={(e) => setDescriptionDraft(e.target.value)}
                  className="min-h-20 w-full rounded-lg border border-input bg-card px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring/40"
                />
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setDescriptionDraft(segmentDescription);
                      setEditingDescription(false);
                    }}
                    className="rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-accent"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={applyDescriptionEdit}
                    className="rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90"
                  >
                    Save
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => {
                  if (finalApproved) return;
                  setDescriptionDraft(segmentDescription);
                  setEditingDescription(true);
                }}
                className="mt-1 inline-flex w-full items-start gap-1 rounded-md px-1 py-1 text-left text-sm leading-relaxed text-foreground-secondary transition-colors hover:bg-accent"
                title={finalApproved ? undefined : "Click to edit segment description"}
              >
                <span className="flex-1">{segmentDescription || "Add a segment description"}</span>
                {!finalApproved ? <RiPencilLine className="mt-0.5 size-3 shrink-0 text-muted-foreground" /> : null}
              </button>
            )}

            <p className="mt-2 text-sm text-foreground">
              <span className="font-medium">Population:</span>{" "}
              {confirmPopulation ?? displayedPopulation}
            </p>
          </div>

          <div className="mt-3">
            <p className="text-xs font-semibold uppercase tracking-[0.02em] text-foreground-secondary">Validated assumptions</p>
            <dl className="mt-2 space-y-1.5">
              {currentAssumptions
                .filter((a) => !a.label.toLowerCase().includes("population"))
                .map((a) => (
                <div key={`validated-${a.id}`} className="flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-0.5">
                  <dt className="text-sm font-medium text-foreground-secondary"><MentionText content={a.label} /></dt>
                  <dd className="text-sm text-foreground"><MentionText content={a.value} /></dd>
                </div>
              ))}
            </dl>
          </div>

          <div className="mt-3 space-y-1.5">
            <label className="text-xs font-medium text-foreground-secondary">Purpose</label>
            <p className="text-xs text-muted-foreground">Please describe the purpose of building this segment.</p>
            {editingPurpose ? (
              <div className="space-y-2 rounded-lg border border-input bg-card p-2">
                <textarea
                  value={purposeDraft}
                  onChange={(event) => setPurposeDraft(event.target.value)}
                  placeholder=""
                  className="min-h-20 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring/40"
                />
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setPurposeDraft(segmentPurpose);
                      setEditingPurpose(false);
                    }}
                    className="rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-accent"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={applyPurposeEdit}
                    className="rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90"
                  >
                    Save
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setPurposeDraft(segmentPurpose);
                  setEditingPurpose(true);
                }}
                className="inline-flex min-h-20 w-full items-start gap-2 rounded-lg border border-input bg-card px-3 py-2 text-left text-sm text-foreground transition-colors hover:bg-accent"
                title="Click to edit purpose"
              >
                <span className="flex-1 text-foreground-secondary">{segmentPurpose}</span>
                <RiPencilLine className="mt-0.5 size-3 shrink-0 text-muted-foreground" />
              </button>
            )}
          </div>

          <div className="mt-3 flex justify-end gap-2">
            {!finalApproved ? (
              <button
                type="button"
                onClick={() => setStartOverConfirmOpen(true)}
                className="rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-accent"
              >
                Start Over
              </button>
            ) : null}
            {!finalApproved ? (
              <button
                type="button"
                onClick={returnToVerifyAssumptions}
                className="rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-accent"
              >
                Edit
              </button>
            ) : null}
            {finalApproved && !hideActivateAction ? (
              <button
                type="button"
                onClick={() => {
                  setActivated(true);
                  onSegmentActivate?.(payload);
                }}
                disabled={activated}
                className={[
                  "rounded-lg px-3 py-1.5 text-xs font-medium transition-colors",
                  activated
                    ? "cursor-not-allowed bg-muted text-muted-foreground"
                    : "bg-primary text-primary-foreground hover:bg-primary/90",
                ].join(" ")}
              >
                {activated ? "Activated" : "Activate"}
              </button>
            ) : null}
            <button
              type="button"
              onClick={approveFinalCard}
              disabled={finalApproved}
              className={[
                "rounded-lg px-3 py-1.5 text-xs font-medium transition-colors",
                finalApproved
                  ? "cursor-not-allowed bg-muted text-muted-foreground"
                  : "bg-primary text-primary-foreground hover:bg-primary/90",
              ].join(" ")}
            >
              {finalApproved ? "Approved and Saved" : "Approve and Save"}
            </button>
          </div>

          <ConfirmDialog
            open={startOverConfirmOpen}
            onOpenChange={setStartOverConfirmOpen}
            title="Start over?"
            description="If you start over, all work will be lost."
            cancelLabel="Cancel"
            confirmLabel="Start Over"
            variant="destructive"
            onConfirm={() => {
              setValidateApproved(false);
              setFinalApproved(false);
              setActivated(false);
              onReject?.();
            }}
          />
        </div>
      ) : null}
    </div>
  );
}

function inferSmartSegmentName(assumptions: ReasoningAssumption[], goal: string): string {
  const all = `${goal} ${assumptions.map((a) => `${a.label} ${a.value}`).join(" ")}`.toLowerCase();
  const hasVipLoyalistsPattern =
    all.includes("order date")
    && (all.includes("within last 180 days") || all.includes("purchased within last 180 days"))
    && all.includes("frequency")
    && all.includes("4+ orders lifetime")
    && all.includes("total spend")
    && all.includes("$5000")
    && all.includes("loyalty tier")
    && all.includes("gold");
  const isEarlyAccessCardView =
    all.includes("early access card view")
    || (all.includes("early access") && all.includes("black friday"))
    || (all.includes("total orders") && all.includes("2+") && all.includes("past 12 months") && all.includes("6-9 month"));
  const hasHighValue = all.includes("high value") || all.includes("$1000") || all.includes("lifetime");
  const hasBf = all.includes("november") || all.includes("black friday") || all.includes("bf");
  const hasCountry = all.includes("country") || all.includes("australia");

  if (hasVipLoyalistsPattern) return "VIP Loyalists";
  if (isEarlyAccessCardView) return "Early Access Customers for Black Friday";

  if (hasHighValue && hasBf && hasCountry) return "High-Value Black Friday Customers (AU)";
  if (hasHighValue && hasBf) return "High-Value Black Friday Customers";
  if (hasHighValue) return "High-Value Active Customers";
  return "Validated Priority Segment";
}
