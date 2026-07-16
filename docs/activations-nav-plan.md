# Activations in the main nav — design notes

Adds a top-level **Activations** destination to the `segment-v1` prototype.
Grounded in the Product Vision Brief (rev 257). Workflows were explored first
(see history below) but scoped out — Activations alone is the v1.

---

## What an Activation is (vision artifact 10)

The **governed record of one execution event** — the audit trail for the "Act"
stage. From the worked session, "New Season Launch Wave 1" is an Activation. It
captures **which Skills were invoked, with what parameters, what approval was
required, and the result.** Some steps proceed automatically (a Meta audience
push under a spend cap); others are held for human sign-off (a Klaviyo send).
Both decisions are logged.

In the vision an Activation belongs to a Workflow. Workflows are out of scope
for now, so each activation keeps a plain **context** label (the campaign/plan
it belongs to, e.g. "New Season Launch") that is shown but **not navigable** —
enough to avoid orphaning it, without a Workflow surface to maintain.

---

## What was built

| File | Purpose |
|------|---------|
| `activations-mock.ts` | `Activation` type (skill, params, approval, status, result, decision trail, segment ref, context), status metadata, `approvalLabel`, and a flat seeded `ACTIVATIONS` list. `segmentId`s point at real BRAIN_GROUPS so detail can cross-link to segment detail. |
| `ActivationsPage.tsx` | The destination — a flat, filterable table, plus `ActivationDetail` (the side-panel body). |
| `index.tsx` | New top-level **Activations** nav item; routing; the activation side panel. |

### Nav order

```
New Chat
Space
Activations      ← new, top-level (RiBroadcastLine)
Knowledge ▸ Playbook · Calendar · Documents
Data ▸ Segments · Definitions
```

### List page

Mirrors the `SegmentsPage` skeleton: header + a left **Status** filter sidebar
(All · Live · Scheduled · Awaiting approval · Sent · Completed — only non-empty
statuses shown) + search + a table. Columns: **Activation** (name + headline
skill) · **Context** (campaign, muted) · **Channel** · **Approval** (Auto /
Approved by X / Pending) · **Status** (badge) · **When**. Row click opens the
detail panel.

### Detail (right inset side panel)

Reuses the existing resizable side-panel slot. Shows: status + context, the
linked **Segment** (click → segment detail) and channel, the **Approval** state,
the **Skills invoked** with their parameters and per-skill result, the
**Outcome**, and a **Decision trail** (timestamped audit log).

---

## Decisions

- **Workflow context kept as plain text**, not a navigable object — an activation
  with no parent reads oddly, but there's no Workflow page to maintain.
- **Side panel for detail** (not a full page) — an Activation is an event, and
  the inset/resizable slot already exists for segment + sources detail.
- Read-only seeded mock; no New / Approve actions wired.

---

## History — Workflows (scoped out)

An earlier pass added a full **Workflows** destination (list with
Workflows/Activations tabs, a 5-tab workflow detail — Overview / Sequence /
Activations / Scorecard / History — and a richer `workflows-mock.ts`). That was
judged too complex for now and removed (`workflows-mock.ts`, `WorkflowsPage.tsx`,
`WorkflowDetail.tsx` deleted). If Workflows return later, the activations here
slot back in as the child records, and the worked-session data is preserved in
the activation `context` labels.

## Verify

`npx tsc -b --force --noEmit` — clean. `npm run dev` → open "Segment - V1" →
**Activations**. (`vite build` only runs on the user's Mac — the Linux sandbox
lacks the platform rollup binary; type-check is the project's stated
verification step.)
