import { useState } from "react";
import { RiArrowDownSLine } from "@remixicon/react";
import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Textarea";
import { TOUR_PROGRESS_EVENT } from "./tourData";

type Message = { id: number; role: "user" | "lexi"; text: string };

const FIRST_QUESTION = "How many people shopped in the last 3 years?";
const FOLLOW_UP_QUESTION = "How many of them shopped in the last 12 months?";

export function NewChatTrainingExperience() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState("");
  const [stage, setStage] = useState(0);
  const [sourcesOpen, setSourcesOpen] = useState(false);

  const submitQuestion = (question: string) => {
    const text = question.trim();
    if (!text || stage > 1) return;

    window.dispatchEvent(new CustomEvent(TOUR_PROGRESS_EVENT, {
      detail: { feature: "new-chat", action: "chat-submit", text },
    }));

    const answer = stage === 0
      ? "In this training example, 42,680 unique customers placed at least one order over the last three years."
      : "In this training example, 18,240 of those customers placed an order in the last 12 months, about 42.7% of the three-year total.";

    setMessages((current) => [
      ...current,
      { id: current.length, role: "user", text },
      { id: current.length + 1, role: "lexi", text: answer },
    ]);
    setDraft("");
    setStage((current) => Math.min(current + 1, 2));
  };

  const openSources = () => {
    setSourcesOpen(true);
    window.dispatchEvent(new CustomEvent(TOUR_PROGRESS_EVENT, {
      detail: { feature: "new-chat", action: "check-answer" },
    }));
  };

  return (
    <section aria-label="New Chat training conversation" className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-6 sm:px-6">
        <div className="mx-auto flex w-full max-w-3xl flex-col gap-4">
          {messages.length === 0 && (
            <div className="max-w-[85%] rounded-xl border border-border bg-card px-4 py-3 text-sm text-foreground-secondary">
              Try asking a question about your customers. This guided example uses illustrative training data.
            </div>
          )}
          {messages.map((message) => (
            <div
              key={message.id}
              className={`max-w-[85%] whitespace-pre-line rounded-xl px-4 py-3 text-sm leading-relaxed ${message.role === "user" ? "ml-auto bg-primary text-primary-foreground" : "border border-border bg-card text-foreground-secondary"}`}
            >
              {message.text}
              {message.role === "lexi" && message.id >= 1 && (
                <p className="mt-2 text-[11px] text-muted-foreground">Illustrative training answer</p>
              )}
              {message.role === "lexi" && stage === 2 && message.id === messages.length - 1 && (
                <button type="button" className="mt-3 block text-xs font-medium text-primary underline underline-offset-2" onClick={openSources}>
                  Check the answer
                </button>
              )}
            </div>
          ))}

          {sourcesOpen && (
            <div className="ml-auto w-full max-w-[85%] rounded-lg border border-border/70 bg-muted/40 p-3 text-xs text-foreground-secondary">
              <p className="font-semibold text-foreground">Training data only · Shopify order example</p>
              <p className="mt-1">This fictional query demonstrates how the three-year and 12-month counts are checked. It does not access live customer data.</p>
              <details className="group mt-3 overflow-hidden rounded-lg border border-border/70 bg-card">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-3 py-2.5 font-semibold text-foreground">
                  <span className="flex items-center gap-2"><span className="size-1.5 rounded-full bg-primary" />7 STEPS</span>
                  <RiArrowDownSLine className="size-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180" />
                </summary>
                <div className="space-y-2 border-t border-border p-3">
                  <ol className="space-y-1.5 text-foreground-secondary">
                    {[
                      "Looked for order and customer reference fields",
                      "Checked completed-order status and date ranges",
                      "Queried orders from the last three years",
                      "Counted distinct customer IDs",
                      "Compared the last 12 months within that period",
                      "Checked both totals against the training example",
                      "Prepared the answer with its time window and method",
                    ].map((step) => <li key={step}>{step}</li>)}
                  </ol>
                  <div className="rounded-md border border-border/70 bg-muted/40 p-2.5">
                    <p className="mb-1.5 font-semibold text-foreground">SQL query</p>
                    <pre className="overflow-x-auto whitespace-pre-wrap font-mono text-[11px] leading-relaxed text-foreground-secondary">{`SELECT
  COUNT(DISTINCT customer_id) AS shoppers_3_years,
  COUNT(DISTINCT CASE
    WHEN order_date >= DATE_SUB(CURRENT_DATE(), INTERVAL 12 MONTH)
    THEN customer_id
  END) AS shoppers_12_months
FROM training_shopify.orders
WHERE order_status = 'completed'
  AND order_date >= DATE_SUB(CURRENT_DATE(), INTERVAL 3 YEAR);`}</pre>
                  </div>
                  <div className="rounded-md border border-border/70 bg-background p-2.5">
                    <p className="font-semibold text-foreground">Illustrative result</p>
                    <p className="mt-1 font-mono text-[11px]">shoppers_3_years: 42,680 · shoppers_12_months: 18,240</p>
                  </div>
                </div>
              </details>
            </div>
          )}

          {stage === 1 && (
            <div className="ml-4 flex flex-col items-start gap-1">
              <p className="text-[11px] font-medium text-muted-foreground">Suggested follow-up</p>
              <button type="button" className="rounded-lg border border-dashed border-border bg-card px-3 py-2 text-left text-sm text-foreground-secondary hover:bg-accent" onClick={() => submitQuestion(FOLLOW_UP_QUESTION)}>
                {FOLLOW_UP_QUESTION}
              </button>
            </div>
          )}
        </div>
      </div>

      <form
        className="mx-auto w-full max-w-3xl shrink-0 px-4 pb-4 sm:px-6"
        onSubmit={(event) => {
          event.preventDefault();
          submitQuestion(draft);
        }}
      >
        <div className="rounded-xl border border-border bg-card p-3 shadow-sm">
          <Textarea
            rows={2}
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                submitQuestion(draft);
              }
            }}
            disabled={stage > 1}
            placeholder={stage === 0 ? FIRST_QUESTION : stage === 1 ? FOLLOW_UP_QUESTION : "Training conversation complete"}
            aria-label="Ask Lexi a training question"
          />
          <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
            <span className="text-[11px] text-muted-foreground">Training uses illustrative answers, not live customer data.</span>
            <div className="flex items-center gap-2">
              {stage === 0 && <Button type="button" size="sm" variant="outline" onClick={() => submitQuestion(FIRST_QUESTION)}>Try the sample question</Button>}
              <Button type="submit" size="sm" disabled={!draft.trim() || stage > 1}>Send</Button>
            </div>
          </div>
        </div>
      </form>
    </section>
  );
}