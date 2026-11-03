import { useState, type FormEvent } from "react";
import { RiCheckLine, RiGroupLine, RiSaveLine } from "@remixicon/react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Textarea";
import { useSession } from "../store";
import type { Artifact } from "../types";
import { TOUR_PROGRESS_EVENT } from "./tourData";

const SAMPLE_COHORT = {
  name: "Repeat purchasers",
  description: "Customers with at least 3 completed orders in the past 12 months and marketing consent.",
  size: "4,280",
  orders: "3+ completed orders",
  recency: "Purchased in the last 12 months",
  consent: "Opted in to marketing",
};

const DEFAULT_QUESTION = "How many customers match this customer group?";
type PanelTab = "Details" | "Customers" | "In activations";

function sendProgress(action: string) {
  window.dispatchEvent(new CustomEvent(TOUR_PROGRESS_EVENT, { detail: { feature: "segments", action } }));
}

export function SegmentsTrainingExperience({ onOpenSegmentPage }: { onOpenSegmentPage: (id: string) => void }) {
  const { dispatch } = useSession();
  const [segmentId] = useState(() => `training-repeat-purchasers-${Date.now()}`);
  const [question, setQuestion] = useState("");
  const [questionAsked, setQuestionAsked] = useState(false);
  const [building, setBuilding] = useState(false);
  const [assumptionsConfirmed, setAssumptionsConfirmed] = useState(false);
  const [saved, setSaved] = useState(false);
  const [panelTab, setPanelTab] = useState<PanelTab>("Details");

  const askLexi = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const text = question.trim() || DEFAULT_QUESTION;
    if (questionAsked) return;
    setQuestion(text);
    setQuestionAsked(true);
    sendProgress("segment-question-asked");
  };

  const buildSegment = () => {
    setBuilding(true);
    sendProgress("segment-from-chat");
  };

  const confirmAssumptions = () => {
    setAssumptionsConfirmed(true);
    sendProgress("segment-assumptions-confirmed");
  };

  const saveSegment = () => {
    const trainingArtifact: Artifact = {
      id: segmentId,
      type: "segment",
      name: SAMPLE_COHORT.name,
      status: "saved",
      def: {
        id: segmentId,
        kind: "segment",
        name: SAMPLE_COHORT.name,
        entity: "customer",
        description: SAMPLE_COHORT.description,
        logic: "order_count >= 3 AND last_order_within_12_months AND marketing_consent = true",
        stat: { label: "customers", value: SAMPLE_COHORT.size },
      },
      body: {
        kind: "segment",
        purpose: SAMPLE_COHORT.description,
        population: SAMPLE_COHORT.size,
        criteria: [SAMPLE_COHORT.orders, SAMPLE_COHORT.recency, SAMPLE_COHORT.consent],
        metrics: [
          { label: "Orders", value: "12,840" },
          { label: "Average order value", value: "$138" },
        ],
      },
    };
    dispatch({ type: "ADD_ARTIFACT", artifact: trainingArtifact });
    dispatch({ type: "SAVE_ARTIFACT", id: segmentId });
    setSaved(true);
    sendProgress("segment-saved");
  };

  const selectPanelTab = (tab: PanelTab) => {
    setPanelTab(tab);
    if (tab !== "Details") sendProgress("segment-panel-explored");
  };

  const openFullPage = () => onOpenSegmentPage(segmentId);

  if (saved) {
    return (
      <section aria-label="Saved training chat and segment panel" className="flex min-h-0 flex-1 overflow-hidden bg-background">
        <div className="min-w-0 flex-1 overflow-y-auto px-4 py-6 sm:px-6">
          <div className="mx-auto flex w-full max-w-2xl flex-col gap-4">
            <div className="ml-auto max-w-[85%] rounded-xl bg-primary px-4 py-3 text-sm text-primary-foreground">{question}</div>
            <div className="max-w-[85%] rounded-xl border border-border bg-card px-4 py-3 text-sm leading-relaxed text-foreground-secondary">
              <p>In this training example, <strong className="text-foreground">4,280 customers</strong> match the repeat-purchaser group.</p>
              <p className="mt-2 text-[11px] text-muted-foreground">Training data only</p>
            </div>
            <div className="max-w-[85%] rounded-xl border border-emerald-300 bg-emerald-50 px-4 py-3 text-sm text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-200">
              <p className="font-semibold">Segment saved</p>
              <p className="mt-1">Review the segment panel on the right, then open this segment in the real Segments page.</p>
            </div>
          </div>
        </div>
        <aside aria-label="Training segment side panel" className="my-2 mr-2 flex w-[min(420px,48%)] shrink-0 flex-col overflow-hidden rounded-xl border border-border/60 bg-background shadow-sm">
          <header className="flex h-12 shrink-0 items-center gap-2 border-b border-border px-4">
            <RiGroupLine className="size-4 shrink-0 text-muted-foreground" />
            <button type="button" onClick={openFullPage} className="flex-1 truncate text-left text-sm font-medium text-foreground hover:text-primary hover:underline">{SAMPLE_COHORT.name}</button>
            <Badge variant="success" size="sm">Saved</Badge>
          </header>
          <div className="min-h-0 flex-1 overflow-y-auto p-4">
            <div className="flex flex-col gap-3">
              <div data-training-anchor="segment-panel-tabs" className="flex flex-wrap gap-1 border-b border-border" role="tablist" aria-label="Training segment panel sections">
                {(["Details", "Customers", "In activations"] as const).map((tab) => (
                  <button
                    key={tab}
                    type="button"
                    role="tab"
                    aria-selected={panelTab === tab}
                    onClick={() => selectPanelTab(tab)}
                    className={`rounded-t-md px-3 py-2 text-sm ${panelTab === tab ? "border-b-2 border-primary font-medium text-foreground" : "text-foreground-secondary hover:text-foreground"}`}
                  >
                    {tab}
                  </button>
                ))}
              </div>
              {panelTab === "Details" && (
                <>
                  <div className="rounded-xl border border-border/70 bg-card p-4">
                    <p className="text-xs font-medium text-muted-foreground">Population</p>
                    <p className="mt-1 text-2xl font-semibold text-foreground">{SAMPLE_COHORT.size}</p>
                    <p className="mt-3 text-sm text-foreground-secondary">{SAMPLE_COHORT.description}</p>
                  </div>
                  <div className="rounded-xl border border-border/70 bg-card p-4">
                    <h3 className="text-sm font-semibold text-foreground">Validation</h3>
                    <ul className="mt-3 space-y-2">
                      {[SAMPLE_COHORT.orders, SAMPLE_COHORT.recency, SAMPLE_COHORT.consent].map((criterion) => (
                        <li key={criterion} className="rounded-lg border border-border/70 bg-background px-3 py-2 text-sm text-foreground-secondary">{criterion}</li>
                      ))}
                    </ul>
                  </div>
                </>
              )}
              {panelTab === "Customers" && (
                <div className="rounded-xl border border-border/70 bg-card p-4">
                  <h3 className="text-sm font-semibold text-foreground">Dummy customers</h3>
                  <div className="mt-3 space-y-2 text-sm text-foreground-secondary">
                    <p>Avery Chen · 5 orders · last order 24 days ago</p>
                    <p>Jordan Patel · 4 orders · last order 51 days ago</p>
                    <p>Morgan Lee · 3 orders · last order 73 days ago</p>
                  </div>
                </div>
              )}
              {panelTab === "In activations" && (
                <div className="rounded-xl border border-border/70 bg-card p-4">
                  <h3 className="text-sm font-semibold text-foreground">In activations</h3>
                  <p className="mt-2 text-sm text-foreground-secondary">This training segment is not in an activation.</p>
                </div>
              )}
            </div>
          </div>
          <footer className="border-t border-border p-3 text-right">
            <Button type="button" size="sm" onClick={openFullPage}>Open full Segments page</Button>
          </footer>
        </aside>
      </section>
    );
  }

  return (
    <section aria-label="Segments training chat" className="flex min-h-0 flex-1 flex-col overflow-hidden bg-background">
      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-6 sm:px-6">
        <div className="mx-auto flex w-full max-w-3xl flex-col gap-4">
          <div className="max-w-[85%] rounded-xl border border-border bg-card px-4 py-3 text-sm text-foreground-secondary">
            <p className="font-medium text-foreground">Ask Lexi about a customer group</p>
            <p className="mt-1">Start with this sample cohort: repeat purchasers with at least three completed orders in the past 12 months and marketing consent.</p>
            <Badge variant="outline" className="mt-2">Dummy customer cohort · training only</Badge>
          </div>

          {questionAsked && (
            <>
              <div className="ml-auto max-w-[85%] whitespace-pre-line rounded-xl bg-primary px-4 py-3 text-sm leading-relaxed text-primary-foreground">{question}</div>
              <div className="max-w-[85%] rounded-xl border border-border bg-card px-4 py-3 text-sm leading-relaxed text-foreground-secondary">
                <p>In this training example, <strong className="text-foreground">4,280 customers</strong> match the repeat-purchaser group. They placed 19,640 completed orders in the last 12 months, with an average order value of $138.</p>
                <p className="mt-2 text-[11px] text-muted-foreground">Illustrative training answer · no live customer data</p>
                {!building && <Button type="button" size="sm" className="mt-3" onClick={buildSegment}><RiGroupLine className="size-4" />Build a segment from these results</Button>}
              </div>
            </>
          )}

          {building && (
            <div className="ml-auto w-full max-w-[90%] rounded-xl border border-border bg-card p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs text-foreground-secondary">Verify assumptions</p>
                  <h2 className="mt-1 text-base font-semibold text-foreground">Repeat purchasers</h2>
                  <p className="mt-1 text-sm text-foreground-secondary">{SAMPLE_COHORT.description}</p>
                </div>
                <Badge variant="outline">{SAMPLE_COHORT.size} customers</Badge>
              </div>
              <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-foreground-secondary">
                <li>{SAMPLE_COHORT.orders}</li>
                <li>{SAMPLE_COHORT.recency}</li>
                <li>{SAMPLE_COHORT.consent}</li>
              </ul>
              <p className="mt-3 text-[11px] text-muted-foreground">Review these assumptions before saving. This is a training-only segment.</p>
              {!assumptionsConfirmed ? (
                <Button type="button" size="sm" className="mt-3" onClick={confirmAssumptions}>Confirm assumptions</Button>
              ) : (
                <div className="mt-3 flex flex-wrap items-center gap-2 text-sm text-emerald-700">
                  <RiCheckLine className="size-4" /> Assumptions confirmed
                  <Button type="button" size="sm" className="ml-auto" onClick={saveSegment}><RiSaveLine className="size-4" />Save segment</Button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {!questionAsked ? (
        <form className="mx-auto w-full max-w-3xl shrink-0 px-4 pb-4 sm:px-6" onSubmit={askLexi}>
          <div className="rounded-xl border border-border bg-card p-3 shadow-sm">
            <p className="mb-2 text-[11px] font-medium text-muted-foreground">Try this question</p>
            <button type="button" className="mb-2 rounded-lg border border-dashed border-border bg-background px-3 py-2 text-left text-sm text-foreground-secondary hover:bg-accent" onClick={() => setQuestion(DEFAULT_QUESTION)}>
              {DEFAULT_QUESTION}
            </button>
            <Textarea value={question} onChange={(event) => setQuestion(event.target.value)} placeholder="Ask Lexi about this customer group..." aria-label="Ask Lexi about a customer group" rows={2} />
            <div className="mt-2 flex items-center justify-between gap-2">
              <span className="text-[11px] text-muted-foreground">Illustrative cohort only · no real data</span>
              <Button type="submit" size="sm" disabled={!question.trim()}>Ask Lexi</Button>
            </div>
          </div>
        </form>
      ) : null}
    </section>
  );
}