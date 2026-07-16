# Concept: The Intention Workspace

*Consolidation of brainstorm — June 2026. Shapes the experience layer for the Lexer AI future-state prototype.*

## Thesis

Move Lexer from **a tool you operate** (go to the segment builder, go to reports, go to the data list) to **a workspace that organizes around your intentions** (a goal is the unit; segments, data objects, and context surface as supporting cast when relevant to that goal).

The four areas we set out to explore are not four features — they are four faces of this one shift:

| Original question | Resolves to |
|---|---|
| How to present data objects users don't browse daily | They stop being a daily list. They surface *inline* (when a goal/claim needs them) and live in an on-demand *governance* view for the few who maintain them. |
| Saved segments — inline vs CRUD | A segment is the canonical *action* the workspace recommends, proposed and edited inline. The library survives, demoted from front door to governance/reuse surface. |
| Onboarding business context / context hub | Setting a goal *is* an act of teaching Lexi. Untrackable goal levers become Definitions in the context layer. The hub is the memory that makes the workspace adaptive. |
| Goal-driven workspace with KPI + AI actions + insights | The spine itself. A **co-pilot**, not a tracker — it decomposes goals into "what to do this week" and adapts as data and actions change. |

## The Model

Four layers, sitting on the existing Context Layer subsystem:

```
FEED            "What needs you today" — cross-goal, urgency-ranked actions
  ↓
GOALS           Intention layer. New top-level object. The experience spine.
  ↓
ACTIONS         The verb the construct model was missing.
                Segment-build + activation is the canonical recommended action.
  ↓
GROUPS & DATA   One universal grouping pattern over data-derived entities.
                + the trust/context layer (supporting cast)
  ↓
BUSINESS JOURNAL  Calendar + history + glossary. The memory that makes the
                  top layer adaptive and makes attribution credible.
```

### 1. Feed (default surface)
Monday morning, the user lands on a curated, cross-goal feed of what needs them today — actions surfaced by urgency, with the goal as context. **Not** a list of goals to browse (that's still a tracker). Drill from feed → into the relevant goal workspace.

### 2. Goals (the new top-level object)
- **Opinionated defaults, not a blank canvas.** Lexer knows the canonical retail outcomes (orders, AOV, retention, new/returning customers) and *proposes* goals from the client's data. Flexibility comes after the default, not instead of it.
- **A goal is a tree, not a KPI.** Three tiers, learned from the real Intimo goal doc:
  - **Outcome** (trackable) — "orders +20%"
  - **Contributing metrics** (trackable) — returning-customer rate, AOV
  - **Levers / tactics** (often *not* trackable in Lexer) — "sales training", "stylists focus new over returning"
- **Partial goals are allowed.** Lexer tracks what it can; for untrackable levers it nudges. Those levers are defined in the business glossary so Lexi understands them.
- **Metrics unify across roles; actions don't.** CRM operator and exec ladder up to the same metrics, but "improve retention" means *build a win-back segment* for one and *reallocate budget / brief the team* for the other. Unified at the goal layer, personalized at the action layer.
- **AI surfaces candidate goals.** Most clients won't arrive with an Intimo-style doc. Lexi mines candidates from data + history + calendar and benchmarks a target; the human supplies the strategic "why" the AI can't see.

### 3. Actions
The activation (segment → channel) is the workflow the construct model never had a home for — here it's the canonical recommended action. Proposed inline inside a goal ("Win back at-risk VIPs · 2,300 customers · activate to Klaviyo"), editable in place, no context-switch to a separate builder.

### 4. Groups & data objects (one pattern, not many libraries)
The key unlock: **there is one grouping pattern, typed by entity.** A segment is a grouping of *customer* definitions; a collection is a grouping of *product* definitions; saved transaction/booking sets are groupings over those entities — exactly the POC's "Grouping" concept.

- **One "Saved groups" surface, filtered by entity tab** — not N competing libraries. Shared card pattern, shared AI-assisted builder, shared governance model.
- **Entity tabs are data-derived, not hardcoded.** Lexi detects entities/themes from the client's data (Phase C bootstrap) and proposes them: a hospitality client gets *Guests · Bookings · Properties · Stays*; Intimo gets *Customers · Products · Transactions*. The experience layer stays universal; only the nouns change per client. This is what makes vertical expansion cheap. Guardrail: confirm/rename/merge curation is mandatory ("table_07" → "Bookings").
- **Cross-entity groupings get a home** ("VIP customers who bought hero SKUs") — the cross-theme composition the POC flagged as powerful-but-homeless.
- **Builder goes bidirectional** — describe in chat *or* refine with the must/should/not criteria UI. (`GuidedBuilder` is the seed.)

### 5. Business journal (the memory / attachment engine)
The differentiator. Lexer becomes the only place that remembers *what you did, why, and what happened* — institutional memory that survives staff turnover (brutal in retail). A switching cost competitors can't copy because it's the client's own history.

- **The data is already the journal, latently.** Every spike/dip in transaction history is the fingerprint of a past decision. Lexi reconstructs the timeline and asks the user to confirm — rather than asking them to author one.
- **Composable / degrades gracefully** — works without a calendar:
  - *Data only* → trends.
  - *+ events* → attribution against a baseline.
  - *+ decision history* → memory-driven recommendations.
- **Capture mechanisms, lowest friction first:**
  1. **Anomaly backfill** (cold-start, needs only their data) — onboarding scan proposes a draft event timeline to confirm/annotate.
  2. **Auto-capture** from connected platforms (sends, activations, spend changes).
  3. **Calendar ingest** (Google/Outlook/marketing calendar), Lexi filters the noise.
  4. **Capture-in-the-flow** — "log this as an event?" when a user activates a campaign.
  5. **Manual add** — reserved for off-platform events (store event, training, PR).
- **One engine, two payoffs:** the anomaly detection that *builds* the journal is the same baseline engine that makes attribution *honest*.

## Information Architecture

```
Feed  →  Goal workspace  →  inline Actions + Objects  →  Saved groups & Context (governance)
                                                              ↑
                                          Business journal (memory) feeds attribution & recommendations
```

## Riskiest Assumption

**Attribution.** An adaptive co-pilot must close the loop: recommend → see if done → attribute the metric move. Retail metrics move for a hundred reasons (seasonality, calendar, competitor sales). Without a baseline, "AI-recommended actions" degrades into a horoscope. The business journal (calendar + history) is what makes attribution honest — so the calendar integration is **load-bearing for the credibility of the whole co-pilot**, not a nice-to-have. Test this early.

Secondary assumptions to watch:
- Users will confirm/curate AI-proposed goals and entities rather than ignore them.
- Anomaly backfill produces a timeline accurate enough to be worth confirming (cold-start quality).
- Off-platform levers can be captured cheaply enough that partial goals don't feel hollow.

## Recommended Prototype Scope

Build the **feed → goal workspace → one recommended action** core loop first, with a single seeded goal (use Intimo's "orders +20% / AOV +5%" as the worked example), because:

- It exercises the spine end-to-end (intention → action) in one screen flow.
- It forces the goal-object shape decision (outcome / metrics / levers) against a real example.
- "What earns a spot in the feed today" is the most underspecified and most important interaction — prototyping it is the fastest way to pressure-test the whole thesis.

Layer in, in order: inline segment→activation; the data-derived "Saved groups" surface; then the business journal (start with anomaly backfill, since it needs no integrations).

## Parked (revisit, not now)

- Full open-ended vertical entity model (hospitality, others) — design the *mechanism* now, prove it on retail first.
- Role-specific action personalization beyond CRM operator vs exec.
- Permission-scoped governance views (org/team/personal) for the groups & context surfaces.
- Forward-planning calendar (planned events as future attribution anchors).
