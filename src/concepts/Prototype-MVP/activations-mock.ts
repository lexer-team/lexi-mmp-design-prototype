/**
 * Activations — mock data for the top-level Activations destination.
 *
 * An Activation (vision artifact 10) is the governed record of one execution
 * event: which Skill ran, with what parameters, what approval was required, and
 * the result — the audit trail for "Act."
 *
 * Workflows are intentionally out of scope here. Each activation keeps a plain
 * `context` label (the campaign/plan it belongs to) so it isn't orphaned, but
 * there is no navigable Workflow object. `segmentId`s point at real BRAIN_GROUPS
 * so the detail can cross-link to segment detail.
 */

export type ActivationStatus =
  | "live" | "scheduled" | "awaiting-approval" | "sent" | "completed" | "failed";

/** Approval state of an activation. */
export type Approval =
  | { kind: "auto" }
  | { kind: "approved"; by: string; at: string }
  | { kind: "pending" };

/** A skill invocation logged inside an activation. */
export interface SkillInvocation {
  skill: string;
  params: string;
  result: string;
}

/** The governed record of one execution event. */
export interface Activation {
  id: string;
  name: string;
  /** plain-text campaign/plan this belongs to (non-navigable) */
  context: string;
  segmentId?: string;
  segmentName?: string;
  channel: string;
  /** High-level grouping used in the Activations page (user-manageable in UI). */
  category?: string;
  /** headline skill (the activation may invoke several — see `invocations`) */
  skill: string;
  approval: Approval;
  status: ActivationStatus;
  whenLabel: string;
  /** ISO date used for one-off scheduled activations (YYYY-MM-DD). */
  scheduledDate?: string;
  /** ISO start date for recurring schedules (YYYY-MM-DD). */
  recurringStartDate?: string;
  /** ISO end date for recurring schedules when defined (YYYY-MM-DD). */
  recurringEndDate?: string;
  result?: string;
  invocations: SkillInvocation[];
  /** chronological audit log entries */
  trail: { at: string; entry: string }[];
}

// ─── Labels ────────────────────────────────────────────────────────────────

export const ACTIVATION_STATUS_META: Record<
  ActivationStatus,
  { label: string; variant: "success" | "warning" | "secondary" | "default" | "danger" }
> = {
  live: { label: "Live", variant: "success" },
  scheduled: { label: "Scheduled", variant: "default" },
  "awaiting-approval": { label: "Awaiting approval", variant: "warning" },
  sent: { label: "Sent", variant: "secondary" },
  completed: { label: "Completed", variant: "secondary" },
  failed: { label: "Failed", variant: "danger" },
};

export function approvalLabel(a: Approval): string {
  if (a.kind === "auto") return "Auto";
  if (a.kind === "pending") return "Pending";
  return `Approved · ${a.by}`;
}

// ─── Seed data ───────────────────────────────────────────────────────────────

export const ACTIVATIONS: Activation[] = [
  {
    id: "ac-season-w1",
    name: "New Season Launch Wave 1",
    context: "New Season Launch",
    segmentId: "g-bi-fullprice",
    segmentName: "Full-Price Early Adopters",
    channel: "Email · Paid social",
    category: "Seasonal launch",
    skill: "Draft Klaviyo Campaign · Push Meta Audience",
    approval: { kind: "approved", by: "Izac", at: "2 weeks ago" },
    status: "sent",
    whenLabel: "2 weeks ago",
    result: "Klaviyo campaign sent after sign-off; Meta audience live with conservative spend cap.",
    invocations: [
      { skill: "Push Meta Audience", params: "High-Value Meta Engagers → Meta ad set, conservative spend cap", result: "Audience live" },
      { skill: "Draft Klaviyo Campaign", params: "Full-Price Early Adopters, Week 1, pending review", result: "Drafted, held for sign-off" },
    ],
    trail: [
      { at: "2 weeks ago", entry: "Meta audience push proceeded automatically (conservative spend cap)." },
      { at: "2 weeks ago", entry: "Klaviyo campaign flagged for human sign-off before sending." },
      { at: "2 weeks ago", entry: "Approved by Izac — campaign sent." },
    ],
  },
  {
    id: "ac-season-w2",
    name: "New Season Launch Wave 2",
    context: "New Season Launch",
    segmentId: "g-bi-email-eng",
    segmentName: "High-Value Meta Engagers",
    channel: "Paid social (Meta)",
    category: "Paid audience",
    skill: "Push Meta Audience",
    approval: { kind: "auto" },
    status: "live",
    whenLabel: "4 days ago",
    result: "Mid-flight adjustment: switched from exclusivity framing to free shipping.",
    invocations: [
      { skill: "Push Meta Audience", params: "High-Value Meta Engagers, revised offer — free shipping", result: "Updated, live" },
    ],
    trail: [
      { at: "1 week ago", entry: "Exclusivity framing underperforming for this audience (Insight)." },
      { at: "4 days ago", entry: "Revised offer parameters — free shipping. Adjustment logged." },
    ],
  },
  {
    id: "ac-season-w5",
    name: "New Season Launch Wave 3",
    context: "New Season Launch",
    segmentId: "g-bi-high-disc",
    segmentName: "Promotional Buyers",
    channel: "Email (Klaviyo)",
    category: "Seasonal launch",
    skill: "Draft Klaviyo Campaign",
    approval: { kind: "pending" },
    status: "scheduled",
    whenLabel: "Scheduled · week 5",
    result: undefined,
    invocations: [
      { skill: "Draft Klaviyo Campaign", params: "Promotional Buyers, 20% off, week 5", result: "Not yet run" },
    ],
    trail: [
      { at: "Scheduled", entry: "Held back until week 5 to protect four weeks of full-price sales." },
    ],
  },
  {
    id: "ac-wb-1",
    name: "Win-back email",
    context: "Win-back follow-up",
    segmentId: "g-bi-hv-lapsed",
    segmentName: "High-value lapsed",
    channel: "Email (Klaviyo)",
    category: "Win-back",
    skill: "Draft Klaviyo Campaign",
    approval: { kind: "approved", by: "Izac", at: "3 days ago" },
    status: "sent",
    whenLabel: "3 days ago",
    result: "Sent to 3,400 customers; 18% conversion.",
    invocations: [{ skill: "Draft Klaviyo Campaign", params: "High-value lapsed, 15% off", result: "Sent" }],
    trail: [
      { at: "3 days ago", entry: "Flagged for sign-off." },
      { at: "3 days ago", entry: "Approved by Izac — sent." },
    ],
  },
  {
    id: "ac-wb-2",
    name: "Lapsed lookalike",
    context: "Win-back follow-up",
    segmentId: "g-reengagement",
    segmentName: "Re-engagement pool",
    channel: "Paid social (Meta)",
    category: "Win-back",
    skill: "Push Meta Audience",
    approval: { kind: "pending" },
    status: "awaiting-approval",
    whenLabel: "Pending",
    result: undefined,
    invocations: [{ skill: "Push Meta Audience", params: "Re-engagement pool lookalike seed", result: "Awaiting approval" }],
    trail: [{ at: "Pending", entry: "Needs sign-off before the audience pushes to Meta." }],
  },
  {
    id: "ac-ob-1",
    name: "Welcome email",
    context: "New customer onboarding",
    segmentId: "g-bi-new",
    segmentName: "New customers",
    channel: "Email (Klaviyo)",
    category: "Onboarding",
    skill: "Draft Klaviyo Campaign",
    approval: { kind: "auto" },
    status: "live",
    whenLabel: "Ongoing",
    result: "Triggered on signup; 41% open rate.",
    invocations: [{ skill: "Draft Klaviyo Campaign", params: "New customers, welcome flow", result: "Live" }],
    trail: [{ at: "Ongoing", entry: "Auto-runs on each new signup." }],
  },
  {
    id: "ac-ob-2",
    name: "Second-order SMS nudge",
    context: "New customer onboarding",
    segmentId: "g-bi-new",
    segmentName: "New customers",
    channel: "SMS",
    category: "Onboarding",
    skill: "Send SMS",
    approval: { kind: "auto" },
    status: "scheduled",
    whenLabel: "Day 14 trigger",
    result: undefined,
    invocations: [{ skill: "Send SMS", params: "New customers, day-14 nudge", result: "Scheduled" }],
    trail: [{ at: "Scheduled", entry: "Fires 14 days after first order." }],
  },
  {
    id: "ac-eofy-1",
    name: "VIP early access",
    context: "EOFY VIP retention",
    segmentId: "g-loyalty-gold",
    segmentName: "Lifestyle Club · Pinnacles",
    channel: "Email (Klaviyo)",
    category: "VIP retention",
    skill: "Draft Klaviyo Campaign",
    approval: { kind: "approved", by: "Izac", at: "last EOFY" },
    status: "completed",
    whenLabel: "Last EOFY",
    result: "Sent; VIP churn held at 3.2%.",
    invocations: [{ skill: "Draft Klaviyo Campaign", params: "Pinnacles, VIP early access", result: "Completed" }],
    trail: [{ at: "Last EOFY", entry: "Approved and sent; outcomes recorded." }],
  },
  {
    id: "bfac1",
    name: "Klaviyo — early access email",
    context: "Black Friday warm-up sequence",
    segmentId: "bfs1",
    segmentName: "BF reactivation core (90-180d)",
    channel: "Email",
    category: "Black Friday",
    skill: "Draft Klaviyo Campaign",
    approval: { kind: "approved", by: "Amy", at: "Jul 4, 2026" },
    status: "scheduled",
    whenLabel: "Scheduled · Jul 4, 2026",
    scheduledDate: "2026-11-18",
    result: "Draft complete and scheduled for warm-up launch.",
    invocations: [
      { skill: "Draft Klaviyo Campaign", params: "BF reactivation core, early-access framing", result: "Scheduled" },
    ],
    trail: [
      { at: "Jul 3, 2026", entry: "Audience and offer locked for early-access send." },
      { at: "Jul 4, 2026", entry: "Approved by Amy and scheduled for Nov 18." },
    ],
  },
  {
    id: "bfac2",
    name: "Meta — BF reactivation audience",
    context: "Black Friday warm-up sequence",
    segmentId: "bfs1",
    segmentName: "BF reactivation core (90-180d)",
    channel: "Paid social",
    category: "Black Friday",
    skill: "Push Meta Audience",
    approval: { kind: "auto" },
    status: "live",
    whenLabel: "Live since Jul 1, 2026",
    result: "Audience synced and refreshing daily with engagement exclusions.",
    invocations: [
      { skill: "Push Meta Audience", params: "BF reactivation core with daily refresh", result: "Live" },
    ],
    trail: [
      { at: "Jun 30, 2026", entry: "Audience config prepared with suppression logic." },
      { at: "Jul 1, 2026", entry: "Meta audience push activated." },
    ],
  },
  {
    id: "bfac3",
    name: "SMS — launch day reminder",
    context: "Black Friday launch wave",
    segmentId: "bfs3",
    segmentName: "BF mid-value reactivation",
    channel: "SMS",
    category: "Black Friday",
    skill: "Send SMS",
    approval: { kind: "pending" },
    status: "scheduled",
    whenLabel: "Scheduled · Jul 4, 2026",
    scheduledDate: "2026-11-29",
    result: undefined,
    invocations: [
      { skill: "Send SMS", params: "Launch-day reminder with urgency copy", result: "Awaiting sign-off" },
    ],
    trail: [
      { at: "Jul 2, 2026", entry: "SMS reminder drafted for launch-day cadence." },
      { at: "Jul 4, 2026", entry: "Pending legal/compliance approval before send." },
    ],
  },
  {
    id: "bfac4",
    name: "Meta — high-value refresh",
    context: "Black Friday launch wave",
    segmentId: "bfs2",
    segmentName: "BF high-value reactivation",
    channel: "Paid social",
    category: "Black Friday",
    skill: "Push Meta Audience",
    approval: { kind: "auto" },
    status: "live",
    whenLabel: "Live since Jul 2, 2026",
    result: "VIP-focused ad set updated with tighter frequency cap.",
    invocations: [
      { skill: "Push Meta Audience", params: "BF high-value reactivation, frequency cap 2/day", result: "Live" },
    ],
    trail: [
      { at: "Jul 1, 2026", entry: "Audience narrowed to VIP high-value cohort." },
      { at: "Jul 2, 2026", entry: "Refresh applied and campaign switched live." },
    ],
  },
  {
    id: "bfac5",
    name: "Klaviyo — cart urgency follow-up",
    context: "Black Friday launch wave",
    segmentId: "bfs3",
    segmentName: "BF mid-value reactivation",
    channel: "Email",
    category: "Black Friday",
    skill: "Draft Klaviyo Campaign",
    approval: { kind: "pending" },
    status: "scheduled",
    whenLabel: "Drafted · Jun 29, 2026",
    scheduledDate: "2026-11-29",
    result: undefined,
    invocations: [
      { skill: "Draft Klaviyo Campaign", params: "Abandoned-cart urgency follow-up", result: "Drafted" },
    ],
    trail: [
      { at: "Jun 29, 2026", entry: "Draft created from launch-wave performance template." },
      { at: "Jul 3, 2026", entry: "Queued for review with final offer details pending." },
    ],
  },
];

export function getActivation(id: string): Activation | undefined {
  return ACTIVATIONS.find((a) => a.id === id);
}
