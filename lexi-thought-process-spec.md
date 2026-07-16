# Spec: Lexi thought-process display

**Component:** In-thread agent reasoning indicator
**Status:** Draft for prototype
**Author:** Izac
**Date:** 2026-06-17

---

## Problem statement

When Lexi answers a data question it runs a multi-step process — interpret intent, query data, calculate, visualise — that can take several seconds. Today the full reasoning is dumped inline, unfiltered, with visualisations interleaved through it, so the response is messy and hard to read. This produces two failures at once: during the wait, nothing legible is happening so it feels broken; after the answer lands, the thread is cluttered, which erodes trust and drives confusion. We serve both non-technical marketers (who want a clean answer) and analysts (who want to inspect the how), and the current single-stream display serves neither.

## Background & validation

The chosen direction — **one live status line that rewrites itself as work progresses, collapsing to a single summary that expands into structured steps** — is the converged industry pattern and is supported by research:

- **Collapsed-by-default + expandable is the standard.** Both ChatGPT (reasoning collapses when done; expand for detail) and Claude (thinking hidden by default, expandable, and *summarised* into key steps rather than raw token stream) use exactly this model. ([digestibleux.com](https://www.digestibleux.com/p/how-ai-models-show-their-reasoning), [techradar.com](https://www.techradar.com/computing/artificial-intelligence/how-claudes-3-7s-new-extended-thinking-compares-to-chatgpt-o1s-reasoning))
- **Live feedback materially improves the wait.** Waits with feedback feel 11–15% faster; engaged users perceive waits up to ~30% shorter; in one study users with a progress indicator waited ~3× longer and were more satisfied. ([nngroup.com](https://www.nngroup.com/articles/progress-indicators/))
- **Show step count when you can't show a percentage.** NN/g recommends a looped indicator for 2–9s waits, and for longer/variable waits showing the *number of steps* ("step 2 of 4") rather than a spinner alone, because it lets users form an estimate. Static "Loading…" is discouraged. ([nngroup.com](https://www.nngroup.com/articles/progress-indicators/), [response-time limits](https://www.nngroup.com/articles/response-times-3-important-limits/))
- **Show decisions, not raw chain-of-thought — and surface assumptions.** Revealing reasoning reliably increases trust, but un-calibrated it induces *over-trust* and can crowd out the user's own knowledge; confident tones inflate over-trust even when answers are flawed; models systematically under-report their true reasoning. The takeaway for us: expose structured *decisions, data provenance, and assumptions* (which invite scrutiny), not persuasive prose that manufactures confidence. ([arxiv 2511.04050](https://arxiv.org/html/2511.04050), [arxiv 2511.12001](https://arxiv.org/html/2511.12001), [arxiv 2601.00830](https://arxiv.org/abs/2601.00830))
- **Agentic-UX precedent** for the expanded view: timestamped/structured step logs with a pinned "current step," progressive disclosure, and source attribution. ([uxmag.com](https://uxmag.com/articles/secrets-of-agentic-ux-emerging-design-patterns-for-human-interaction-with-ai-agents), [agentic-design.ai](https://agentic-design.ai/patterns/ui-ux-patterns))

**Net:** the approach is sound. The two things research tells us *not* to do are (a) leave the wait silent, and (b) expand into raw reasoning prose. This spec encodes both.

## Goals

1. **Make the wait feel responsive.** A legible status update appears within 1s of submit and changes as work progresses — no silent gaps > ~3s. (Target: measurably lower abandon-during-generation rate.)
2. **Keep the settled thread clean.** After completion, the thought process occupies a single collapsed line by default; the answer and any visualisation read without clutter.
3. **Make reasoning inspectable on demand.** Any user can expand to a structured, scannable trace (decisions + data touched + assumptions), serving analysts without taxing marketers.
4. **Build calibrated trust.** Surface assumptions and data provenance so users can catch a wrong-question answer — reduce trust-related confusion and support tickets.

## Non-goals

1. **Not showing raw chain-of-thought.** We display summarised, structured steps — never the unfiltered token stream. (Research shows raw prose adds noise and can manufacture over-trust.)
2. **Not a mid-task confirmation/steering gate.** Surfacing an editable interpretation *before* computing ("assumption-first") is a separate, higher-friction initiative. Out of scope here. (Parking lot.)
3. **Not a docked side panel.** Reasoning lives inline in the thread, not in a separate persistent panel. (Revisit if inline depth proves insufficient for analysts.)
4. **Not moving visualisations into the trace.** Charts are *findings* and belong in the answer body, never inside the thinking display. This spec explicitly removes interleaved viz.
5. **Not per-step interactivity in v1.** Clicking a step to drill into the actual SQL/rows is P2, not v1.

## User stories

**Marketer / operator (non-technical)**
- As a marketer, I want a clear sign Lexi is working and roughly how far along it is, so I don't think the app is stuck.
- As a marketer, I want the finished answer to be clean and uncluttered, so I can read the result without wading through process.

**Analyst / data-savvy**
- As an analyst, I want to expand and see which data Lexi queried and what it assumed, so I can trust or challenge the result.
- As an analyst, I want assumptions flagged explicitly, so I can tell when Lexi answered a subtly different question than I asked.

**All users**
- As any user, when something goes wrong mid-process, I want to see which step failed and why, so I know whether to retry or rephrase.

## Functional model

The component has **two lifecycle states** driven by the agent's run.

### State A — In progress (live)

A single row, anchored by Lexi's avatar:

- **A spinner/active indicator** + **the current step label** as a human verb-phrase ("Querying purchase history"), which **rewrites in place** as the agent advances. It does not accumulate lines.
- **A position counter** on the right: `step 2 of 4 · 3s` (elapsed timer; step count shown when total is known).
- Optionally, the **most recent completed step** may persist as one faint line above the active one, to convey motion. (Prototype both with/without.)

Rules:
- Appears within **1s** of submit (NN/g visibility-of-status threshold).
- The label must always be a present-tense action, never raw reasoning text.
- If total step count is unknown, show elapsed time + verb only (degrade gracefully to a looped indicator, never a static "Loading…").

### State B — Completed (settled)

The live row collapses into **one quiet summary line**:

- `⌄ Worked through 4 steps · 8s` — chevron + step count + total duration. Default **collapsed**.
- The answer (and any visualisation) renders below, clean.
- Clicking the summary line **expands** the structured trace.

### Expanded trace (inside State B)

A structured, scannable list — **not prose**. Each step is `[icon] [label] — [one-line detail]`. Recommended step types:

| Step | Label | Detail example |
|---|---|---|
| Interpret | Interpreted request | "Avg order value, repeat vs first-time, last 90 days" |
| Query | Queried data | "orders table · 12,481 rows · Mar–Jun 2026" |
| Calculate | Calculated | "Mean AOV per cohort · refunds excluded" |
| Assumption | **Assumption** | "'Repeat' = 2+ orders. Refunds excluded." (visually emphasised) |

Rules:
- **Assumptions are visually distinct** (e.g. amber accent) — this is the highest-trust element and must not blend in.
- Order reflects execution order; the interpret step is always first.
- Re-collapsing returns to the single summary line.

## Requirements

### Must-have (P0)
- **P0-1 — Live status line.** Single rewriting row with verb-phrase label + spinner. _AC:_ Given a query is submitted, when generation starts, then a status row appears within 1s and its label updates as the agent moves between steps, replacing (not stacking) the previous label.
- **P0-2 — Step position + timer.** _AC:_ Given the total step count is known, when in progress, then the row shows `step N of M` and a live elapsed timer; given step count is unknown, then it shows elapsed time and the verb only.
- **P0-3 — Collapse on completion.** _AC:_ Given the run finishes, when the answer renders, then the live row collapses to a single summary line `Worked through M steps · {duration}`, collapsed by default, and the answer/visualisation render below it cleanly.
- **P0-4 — Expandable structured trace.** _AC:_ Given a completed message, when the user clicks the summary line, then a structured step list expands (label + one-line detail per step); when clicked again, it collapses. Trace contains no raw reasoning prose and no charts.
- **P0-5 — Assumptions surfaced.** _AC:_ Given the run made an assumption, when the trace is expanded, then at least one visually-distinct "Assumption" entry is shown.
- **P0-6 — No interleaved visualisations in process.** _AC:_ Given the run produces a chart, when rendered, then the chart appears only in the answer body, never within the live row or trace.
- **P0-7 — Structured step contract.** The agent must emit named, ordered step checkpoints (type, label, detail, status) rather than a free-text stream the UI scrapes. _AC:_ Given a run, the UI receives a typed list of steps it can render without parsing prose. *(See Open Questions — this is the critical backend dependency.)*

### Nice-to-have (P1)
- **P1-1 — Last-completed-step preview** persisting above the active line during progress.
- **P1-2 — Auto-expand on low confidence / notable assumption.** If the agent flags low confidence in its interpretation, the trace opens by default for that message. (Otherwise always collapsed.)
- **P1-3 — Failure state.** If a step errors, the trace shows which step failed with a short reason and a retry affordance.
- **P1-4 — Remember user preference.** If a user manually expands traces repeatedly, optionally default them to expanded for that user.

### Future considerations (P2)
- **P2-1 — Per-step drill-in:** click a step to view the actual SQL, row sample, or source. Design the step data model to carry an optional payload/reference now so this is additive later.
- **P2-2 — Assumption-first confirm flow** (the separate steering initiative) could reuse the interpret step's data.
- **P2-3 — Copy/share trace** for analysts to paste into a ticket.

## Content & copy rules

- Step labels are **present-tense verbs while active** ("Querying…"), **past-tense in the trace** ("Queried data").
- Labels are **sentence case**, short (≤ ~4 words), and describe the *action*, not the reasoning.
- Details are one line, factual, and prefer **provenance** (table, row count, date range, filters) over narration.
- Avoid confident editorialising in step text (research: confident tone inflates over-trust). State what was done, not how clever it was.
- Reuse existing Lexer semantic colours: green = done, blue = active, amber = assumption/attention, muted grey = pending.

## Edge cases

- **Very fast run (< ~1.5s):** skip the elaborate live row; may go straight to the collapsed summary. Don't flash a spinner for sub-second work.
- **Single-step run:** summary reads "Worked through 1 step"; trace still expandable.
- **Long step with no sub-progress:** keep the timer moving and the verb visible; never let it look frozen (>3s silent = looks broken).
- **Run fails partway:** collapse to a summary that signals failure; expanded trace shows the failed step (P1-3).
- **No assumptions made:** trace simply omits the assumption row — don't fabricate one.
- **Streaming answer:** the collapse should happen as the answer begins streaming, so the summary line sits above the streaming text.

## Success metrics

**Leading (days–weeks)**
- Abandon-during-generation rate (users who leave/cancel mid-run): **decrease**.
- Trace expansion rate: track as engagement signal; segment by user type (expect higher among analysts).
- Perceived-speed proxy: in-product micro-survey or session length to answer; target lower perceived wait.

**Lagging (weeks–months)**
- Trust/confusion support tickets referencing "wrong answer" / "don't understand how": **decrease** (primary goal).
- Thumbs-up rate on data answers: **increase**.
- Analyst retention / repeat-query rate: **stable or up** (transparency shouldn't cost the clean experience).

**Measurement:** instrument step events (start, each step, complete, expand, collapse, fail). Evaluate at 2 weeks (leading) and 1 quarter (lagging).

## Open questions

- **[Engineering — blocking]** Can the agent emit structured, named step checkpoints today (type/label/detail/status), or is its output currently free text we'd have to parse? P0-7 depends on this; it's the make-or-break dependency. (Raised in earlier discussion.)
- **[Engineering]** What's the realistic step-count predictability — do we know `M` (total steps) up front, or only as we go? Determines whether P0-2 shows `of M`.
- **[Design]** Do we keep the last-completed-step preview during progress (P1-1), or is the single rewriting line cleaner? Prototype both.
- **[Design]** Auto-expand on low confidence (P1-2): worth the inconsistency, or always collapse for predictability?
- **[Data/AI]** How do we reliably detect and label an "assumption" vs a normal step? Needs a definition the model can populate.
- **[Design]** Exact collapse animation/timing relative to answer streaming (P0-3 + streaming edge case).

## Timeline / phasing

- **Phase 1 (prototype, this spec):** P0-1 → P0-6 against a mocked/structured step feed to validate the interaction in the playground.
- **Phase 1.5:** P0-7 — wire to the real agent step contract (gated on the blocking engineering question).
- **Phase 2 (fast follow):** P1-1 → P1-4.
- **Phase 3:** P2 items as separate initiatives.

---

### Appendix — references

- NN/g, *Progress Indicators Make a Slow System Less Insufferable* — https://www.nngroup.com/articles/progress-indicators/
- NN/g, *Response Times: The 3 Important Limits* — https://www.nngroup.com/articles/response-times-3-important-limits/
- *How AI models show their reasoning process in real-time* — https://www.digestibleux.com/p/how-ai-models-show-their-reasoning
- *How Claude 3.7's extended thinking compares to o1* — https://www.techradar.com/computing/artificial-intelligence/how-claudes-3-7s-new-extended-thinking-compares-to-chatgpt-o1s-reasoning
- *Revealing AI Reasoning Increases Trust but Crowds Out Unique Human Knowledge* — https://arxiv.org/html/2511.04050
- *Critical or Compliant? The Double-Edged Sword of Reasoning in CoT Explanations* — https://arxiv.org/html/2511.12001
- *Systematic Underreporting in Chain-of-Thought Reasoning* — https://arxiv.org/abs/2601.00830
- *Secrets of Agentic UX* — https://uxmag.com/articles/secrets-of-agentic-ux-emerging-design-patterns-for-human-interaction-with-ai-agents
- *Agentic Design — UI/UX Patterns* — https://agentic-design.ai/patterns/ui-ux-patterns
