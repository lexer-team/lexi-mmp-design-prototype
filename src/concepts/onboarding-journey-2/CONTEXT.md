# Segment - V1 — Context

Chat-first **segment creation**. Forked from Shared brain v2, scoped to one job:
describe an audience in conversation, have Lexi confirm its read, propose a
segment, refine it (via a rich definition builder), and save it. Saved segments
become first-class "groups" with a full detail page.

## What it is

A chat shell with a right **artifact/context panel**, plus **Data** pages
(Groups, Definitions) and a **group detail page** reachable from the nav or by
opening a segment. The throughline is **accountable synthesis**: Lexi leads with
an editable **Verify assumptions** card (`ReasoningBlock` — its read of the goal +
the definitions that drive inclusion) as a *gated step* it waits on, so the user
confirms or corrects assumptions rather than rubber-stamps a finished cut. The segment itself is then editable through a
shared **definition builder** with a Plain ↔ Builder view.

## Demo flow (`demo-data.ts`)

1. User asks for a win-back audience for the holiday sale.
2. Lexi reads the request and shows an editable **Verify assumptions** card
   (lapsed / valuable / reachable) — a **gated step**: it waits for the user to
   confirm or edit before building anything.
3. User confirms → Lexi sizes and proposes the `Holiday win-back` segment (8,200)
   with metrics + definition.
4. User tightens it to recently-engaged customers.
5. Lexi **refines the same segment in place** (8,200 → 3,400) rather than creating
   a second one, then offers to save. Turn 2 carries a `REFINE_SEGMENT` effect; the
   turn-1 card collapses to a compact "first cut · 8,200 — refined below" note, and
   only one `Holiday win-back` ever lands in the Artifacts panel.

## Conversation scripts & animated playback

Conversations are **scripted and streamed back**, mirroring Shared brain v1's
chat (`ChatFlow` + `ChatThinking`). `demo-data.ts` exports
`CONVERSATIONS: Conversation[]` (currently one: Holiday win-back) — add entries
to grow the Recent list. Each `Conversation` has `{ id, title, preview,
updatedLabel, seedPrompt, turns }`; each `ConversationTurn` is
`{ user, thinking: StepSpec[], thinkingLabel, blocks: ContentBlock[] }`.

`ChatPanel.tsx` is the **player**, and it is **turn-driven / interactive** — Lexi
plays exactly one turn, then stops and waits for the user to send the next input
(it does not auto-run the whole script):

- `advance(userText?)` plays one turn: append user bubble → animated
  `ThinkingProcess` (`mode="active"`, spinner→check, authored SQL) → Lexi message
  with the trace collapsed to "💡 label · X.Xs" → word-by-word text reveal
  (reusing `RichText`, so `[[def]]` tokens still hover) → `reasoning`/`proposed`
  blocks fade in after a short skeleton (`BlockReveal`). Then it increments the
  turn cursor and waits. Abortable timers; auto-scrolls the latest user message
  near the top. `turnRef`/`busyRef` are the source of truth; `advanceRef` lets the
  reset effect kick off turn 0 without stale closures.
- **Two ways to advance** (per design decision): a **suggestion chip** above the
  composer shows the next scripted user line — click sends it verbatim — and free
  typing in the composer also advances (the typed text becomes the user bubble,
  Lexi still gives the scripted response). The composer is disabled while a turn
  streams.
- **Empty start screen** ("What are we working on?") lists the seed prompt(s).
  When a conversation is already active (opened from Recent), it shows that
  conversation's seed and clicking begins turn 0 locally. On a blank New Chat it
  lists every conversation's seed; clicking dispatches `SELECT_CONVERSATION` with
  `autoStart` so the chosen conversation begins in one click.
- **Gated verify step**: when the latest Lexi message hosts the
  `Verify assumptions` card and a turn remains, the card stays *live* (assumptions
  editable). **There's no confirm button** — the user confirms by sending the next
  message (the suggestion chip shows "Looks right — build the segment"; free text
  works too). Once advanced, the card locks to a read-only "Confirmed" state.
- **Sources bar** (`SourcesBar`): every Lexi response ends with a single citation
  widget — "Sources: [def] [def] [def] +N more" — built from `turn.sources` (def
  ids), shown once the reply finishes streaming. It truncates to 3 pills + a
  "+N more" count. Clicking the bar dispatches `OPEN_SOURCES` and opens the
  **sources side panel** (same inset/resizable slot as the segment detail), which
  lists each source definition full-width (`SourceRow`: name, kind, description,
  logic). Segment detail and sources share one slot — opening one closes the other.
- After the last scripted turn, a further free-text send gets a brief
  end-of-demo note; **Restart** resets to the waiting start screen.
- Reuses `ThinkingProcess`/`ThinkingStep` and `MentionComposer` from
  `../lexi-shared-brain` rather than duplicating them.
- `data-message-id` is preserved on Lexi messages so crystallisation still works.

## Conversations in the nav (Recent list)

The sidebar **Recent** section lists each `Conversation` (title + faint
timestamp). Clicking one dispatches `SELECT_CONVERSATION` (no `autoStart`) →
routes to chat and **opens the waiting start screen** so the user drives it
interactively from the top. **New Chat** dispatches `NEW_CHAT` → blank empty
start screen. Both reset session artifacts/pins to a fresh copy so each run
starts clean. `store.autoStart` controls whether the player begins turn 0
immediately (New-Chat seed pick) or waits for input (Recent open / Restart). The
chat header shows the active conversation's title (or "New chat").

## Files

| File | Purpose |
|------|---------|
| `index.tsx` | App shell: left sidebar nav, header, ChatPanel + ContextPanel, page routing (chat / groups / group-detail / definitions), and the **resizable segment side panel** |
| `ChatPanel.tsx` | **Scripted-conversation player**: empty start screen, animated thinking trace, word-by-word streaming, block reveal; composer + crystallisation |
| `ContextPanel.tsx` | Right panel, three cards (Artifacts / Definitions / Pinned). Each **collapses to its header when empty and auto-expands when content is added** (manual **chevron** toggle in the header; info text moved to a **tooltip on the card title**). Artifacts = saved segments/insights; Definitions **surface as the conversation references them** (`state.definitionIds`); Pinned added via crystallisation. Expanding an empty card shows the shared designed empty state. |
| `pages.tsx` | `GroupsPage` (table; saved segments listed as Customer groups) + `DefinitionsPage`, ported from Shared brain v1 |
| `SegmentDetail.tsx` | Lightweight detail content (no tabs). **Currently unused** — the side panel and Groups detail both use the full v2 `GroupDetail` instead. Kept for reference. |
| `segment-logic.ts` | Logic model: tree types, seed trees, construct picker, immutable tree edits + reorder, NL interpretation, live metrics, BrainGroup ↔ tree converters |
| `store.tsx` | SessionProvider + reducer; `openSegmentId`, `editingSegmentId`, `activeConversationId`, `replayNonce`; OPEN/CLOSE/START_EDIT/STOP_EDIT_SEGMENT, **SELECT_CONVERSATION / NEW_CHAT** (both reset artifacts/pins), **REFINE_SEGMENT** (narrow a segment in place + snapshot `refinedFrom`), **SURFACE_DEFINITIONS** (append to `definitionIds`), **OPEN_SOURCES / CLOSE_SOURCES** (`openSourcesIds` — shares the side-panel slot with `openSegmentId`); pins + `definitionIds` start empty and reset on select/new-chat |
| `demo-data.ts` | `CONVERSATIONS` scripts (turns with thinking + SQL), segment artifacts (with `purpose` + `metrics`), definitions |
| `types.ts` | Artifact / ChatMessage / ContentBlock; **`Conversation` / `ConversationTurn` / `StepSpec`**; `SegmentMetric`; segment body has `criteria`, `population`, `purpose?`, `metrics?` |
| `components/` | MessageRenderer, RichText, ProposedBlock, ReasoningBlock, SummaryPointer, CrystallisationPopover, **SegmentBuilder** |

## Navigation & layout (`index.tsx`)

- Sidebar mirrors Shared brain v1: **New Chat**, **Data** (collapsible →
  Groups / Definitions), **Knowledge**, plus a **Recent** list of scripted
  conversations (replay on click).
- Pages: `chat` (ChatPanel + ContextPanel), `groups`, `group-detail`,
  `definitions`. `openGroup(id)` routes to `group-detail`; saved-segment ids are
  rendered through the same page via a synthesized group (see below).
- **Side panel** (shared slot): opening a saved segment (`OPEN_SEGMENT`) shows the
  segment detail; clicking a response's **Sources bar** (`OPEN_SOURCES`) shows the
  sources list in the same slot. Opening a saved segment from the artifact panel
  shows an inset panel **beside** the main chat panel (sibling at
  the shell level, not nested). It **slides in/out** (animated width/opacity,
  transition suppressed mid-drag) and is **resizable** via a left-edge drag handle
  (340–720px). While it's open the artifact/context panel auto-collapses; the
  header toggle stays visible and functional.

## Segment builder (`components/SegmentBuilder.tsx` + `segment-logic.ts`)

Controlled component: parent owns the `tree` (`LogicGroupNode`) and `setTree`. A
small React context shares editable state, drag handlers, and mutation callbacks
between the two views.

- **Builder view** — recursive All / Any rule stack. Each condition tile: drag
  grip, definition chip (hover → portaled `DefinitionCard`, never clipped),
  `is / is not` toggle, editable **field ▾ · operator ▾ · value** rows, hover-
  reveal remove. `+ Condition` = construct picker; `+ Group` adds a nested Any
  group (grey left border, one level). Nested groups + conditions are
  **drag-and-drop reorderable** (native HTML5; gutter drop-line indicator + an
  end-of-list drop zone; `moveNode` / `moveNodeToEnd`).
- **Plain view** — "my-read" readout: each condition on its own line as a named
  term + spelled-out rule, with an All/Any toggle inline. Editing allows free-text
  add/edit + delete + reorder.
- **Lexi interpretation** — in Plain edit, `+ Add condition` inserts a free-text
  row; on commit it shows "Lexi is interpreting…", then resolves to either a
  **matched definition** (chip) or a **translated** structured row (field/op/value),
  or an **unclear** state prompting a rephrase. `interpretCondition`.
- **Live metrics** — `computeMetrics` / `computePopulation` recompute population
  (nesting- and is-not-aware; pending/unclear excluded) and two secondary metrics
  from the tree, so headline numbers move as conditions change.
- **Styling** — definition chips use the shared **citation style** (grey dotted
  underline + grey icon, `text-sm`); the **teal dashed underline is reserved for
  editable text**. No leading bullet in read mode.

## Segment card states (`ProposedBlock` → `SegmentCard`)

Driven by `artifact.status` + `state.editingSegmentId`:

- **Preview** (proposed, not editing) — 3 equal-width inline metrics (no card/
  divider), then a **Definition** section: a label + Plain/Builder toggle on one
  line, with the read-only builder below. Ghost pencil edit button in the header.
  Actions: Save / Dismiss.
- **Edit** (`START_EDIT_SEGMENT`) — builder becomes editable; card gets a primary
  ring; the saved item in the context panel highlights. Actions: Save / Cancel.
- **Saved** (`SAVE_ARTIFACT`) — "Saved" badge by the title; **no action footer**
  (open it from the artifact panel instead).
- **Dismissed** — `DismissPopover` collects an optional reason, then the card
  collapses to a "Segment suggestion dismissed" banner with Undo.
- **Refined (first-cut collapsed)** — a proposed block authored with
  `collapseWhenRefined: true` collapses to a compact "First cut · N customers —
  refined below" note once the segment carries `refinedFrom` (set by
  `REFINE_SEGMENT`). Used for the turn-1 card after turn 2 narrows the segment in
  place, so the before/after reads in the transcript while only one segment exists.

## Group detail page (`../lexi-shared-brain-v2/GroupDetail.tsx`)

The shared tabbed page (General / Dependency / Activations / Customers /
Trackers) is used for **both** mock groups and saved segments, and in **both** the
full page and the side panel:

- Header has **Edit** (left of **Activate**, arrow removed). In edit mode the
  buttons become **Cancel / Save**; Cancel reverts the tree + notes.
- **Definition** section: the Plain/Builder `ViewToggle` sits on the section title
  line (outside the block); the block hosts the shared `SegmentBuilder`
  (`editable` follows edit mode). The two notes ("Why we're building this" / "When
  to use") become editable text in edit mode.
- **Responsive**: the page is a `@container`; metric cards stack until `@md`, and
  the tab strip scrolls horizontally — so it reads well in the narrow side panel.
- Saved segments are fed in via `segmentArtifactToGroup(artifact)` (synthesized
  BrainGroup) + `segmentToLogic(...)` as the `definitionTree`. Mock groups fall
  back to `brainGroupToTree(group)`.

## Saved segments in Groups (`pages.tsx`)

`GroupsPage` reads saved segment artifacts from the store and lists them at the
top of the **Customer** tab (tagged "Session" / "Saved"); clicking one opens the
group detail page.

## Known carryover

`store.tsx` and `ProposedBlock.tsx` still carry v2's recommendation / plan-builder
code paths. They're inert here and compile cleanly; could be trimmed if this stays
segment-only. `SegmentDetail.tsx` is currently unused (superseded by `GroupDetail`).

## Verify

`npx tsc -b --force --noEmit` — clean. `npm run dev` → open "Segment - V1".
