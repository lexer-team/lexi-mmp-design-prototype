import { useEffect, useMemo, useState } from "react";
import { RiFocus3Line, RiPencilLine, RiExpandDiagonalLine } from "@remixicon/react";
import type { ReasoningAssumption } from "../types";

export interface SegmentConfirmedPayload {
  id: string;
  name: string;
  description: string;
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
  const [descriptionDraft, setDescriptionDraft] = useState("");
  const [editingDescription, setEditingDescription] = useState(false);
  const [descriptionEdited, setDescriptionEdited] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [activated, setActivated] = useState(false);

  useEffect(() => {
    setCurrentAssumptions(assumptions);
  }, [assumptions]);

  const description = useMemo(() => {
    if (isEarlyAccessFlow) {
      return "Black Friday customers targeted early-access sequencing and premium bundles before broad discount sends";
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

  const approveValidation = () => {
    setValidateApproved(true);
  };

  const payload: SegmentConfirmedPayload = {
    id: segmentId,
    name: segmentName,
    description: segmentDescription,
    population: populationValue,
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

  const rejectFromVerifyCard = () => {
    const shouldCancel = window.confirm("Are you sure you want to cancel? Segment build will be lost.");
    if (!shouldCancel) return;
    setDismissed(true);
    onReject?.();
  };

  if (dismissed) return null;

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
              <dt className="text-sm font-medium text-foreground-secondary">{a.label}</dt>
              <dd className="text-sm text-foreground">{a.value}</dd>
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
      <div className="flex items-center gap-1.5">
        <RiFocus3Line className="size-3.5 text-primary" />
        <span className="text-sm font-semibold text-foreground">Verify assumptions</span>
      </div>

      {/* Goal — what Lexi is optimising for */}
      <p className="mt-2 text-sm font-medium leading-relaxed text-foreground">{goal}</p>

      <div className="mt-2 rounded-lg border border-border/70 bg-background px-3 py-2">
        <p className="text-xs font-medium text-foreground-secondary">Population</p>
        <p className="mt-0.5 text-sm font-semibold text-foreground tabular-nums">{populationValue}</p>
      </div>

      {/* Editable assumptions */}
      <dl className="mt-2.5 space-y-1.5">
        {currentAssumptions
          .filter((a) => !a.label.toLowerCase().includes("population") && !a.label.toLowerCase().includes("audience"))
          .map((a) => (
          <div key={a.id} className="flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-0.5">
            <dt className="text-sm font-medium text-foreground-secondary">{a.label}</dt>
            <dd className="text-sm text-foreground">{a.value}</dd>
          </div>
        ))}
      </dl>

      <div className="mt-3 flex justify-end gap-2">
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

      {validateApproved ? (
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
              <h4 className="text-sm font-semibold text-foreground">{segmentName}</h4>
            )}

            <div className="flex items-center gap-1.5">
              {!editingName && !finalApproved ? (
                <button
                  type="button"
                  onClick={() => {
                    setNameDraft(segmentName);
                    setEditingName(true);
                  }}
                  className="inline-flex items-center gap-1 rounded-lg border border-border bg-card px-2.5 py-1 text-xs font-medium text-foreground transition-colors hover:bg-accent"
                >
                  <RiPencilLine className="size-3.5" /> Edit
                </button>
              ) : null}
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
              {!finalApproved && !editingDescription ? (
                <button
                  type="button"
                  onClick={() => {
                    setDescriptionDraft(segmentDescription);
                    setEditingDescription(true);
                  }}
                  className="inline-flex items-center gap-1 rounded-lg border border-border bg-card px-2.5 py-1 text-xs font-medium text-foreground transition-colors hover:bg-accent"
                >
                  <RiPencilLine className="size-3.5" /> Edit
                </button>
              ) : null}
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
              <p className="mt-1 text-sm leading-relaxed text-foreground-secondary">{segmentDescription}</p>
            )}

            <p className="mt-2 text-sm text-foreground">
              <span className="font-medium">Population:</span>{" "}
              {populationValue}
            </p>
          </div>

          <div className="mt-3">
            <p className="text-xs font-semibold uppercase tracking-[0.02em] text-foreground-secondary">Validated assumptions</p>
            <dl className="mt-2 space-y-1.5">
              {currentAssumptions
                .filter((a) => !a.label.toLowerCase().includes("population"))
                .map((a) => (
                <div key={`validated-${a.id}`} className="flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-0.5">
                  <dt className="text-sm font-medium text-foreground-secondary">{a.label}</dt>
                  <dd className="text-sm text-foreground">{a.value}</dd>
                </div>
              ))}
            </dl>
          </div>

          <div className="mt-3 flex justify-end gap-2">
            {!finalApproved ? (
              <button
                type="button"
                onClick={onReject}
                className="rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-accent"
              >
                Start Over
              </button>
            ) : null}
            {finalApproved ? (
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
              {finalApproved ? "Approved" : "Approve"}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function inferSmartSegmentName(assumptions: ReasoningAssumption[], goal: string): string {
  const all = `${goal} ${assumptions.map((a) => `${a.label} ${a.value}`).join(" ")}`.toLowerCase();
  const isEarlyAccessCardView =
    all.includes("early access card view")
    || (all.includes("early access") && all.includes("black friday"))
    || (all.includes("total orders") && all.includes("2+") && all.includes("past 12 months") && all.includes("6-9 month"));
  const hasHighValue = all.includes("high value") || all.includes("$1000") || all.includes("lifetime");
  const hasBf = all.includes("november") || all.includes("black friday") || all.includes("bf");
  const hasCountry = all.includes("country") || all.includes("australia");

  if (isEarlyAccessCardView) return "Early Access Customers for Black Friday";

  if (hasHighValue && hasBf && hasCountry) return "High-Value Black Friday Customers (AU)";
  if (hasHighValue && hasBf) return "High-Value Black Friday Customers";
  if (hasHighValue) return "High-Value Active Customers";
  return "Validated Priority Segment";
}
