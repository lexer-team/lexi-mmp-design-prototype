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
  | "live" | "scheduled" | "awaiting-approval" | "sent" | "completed" | "failed" | "cancelled";

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
export interface ActivationHistoryPoint {
  date: string;
  profilesSent: number;
  delta: number;
  note: string;
  failed?: boolean;
}

export interface Activation {
  id: string;
  name: string;
  /** ISO timestamp when activation record was created. */
  createdAt?: string;
  /** Person or system that created the activation. */
  createdBy?: string;
  /** plain-text campaign/plan this belongs to (non-navigable) */
  context: string;
  segmentId?: string;
  segmentName?: string;
  destinationPlatform?: string;
  platformType?: string;
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
  /** Time used with `scheduledDate` when available (HH:mm). */
  scheduledTime?: string;
  /** Optional end date for a scheduled delivery window (YYYY-MM-DD). */
  scheduledEndDate?: string;
  /** ISO start date for recurring schedules (YYYY-MM-DD). */
  recurringStartDate?: string;
  /** Preferred recurring run time (HH:mm). */
  recurringTime?: string;
  /** ISO end date for recurring schedules when defined (YYYY-MM-DD). */
  recurringEndDate?: string;
  /** Optional recurring end time when defined (HH:mm). */
  recurringEndTime?: string;
  /** User-editable cadence, independent of fixed delivery timing fields. */
  activationCadence?: "Once Off" | "Recurring";
  /** Number of profiles reached by this activation, when reported by the source. */
  profilesReached?: number;
  activationDefinition?: string;
  result?: string;
  /** Number of resend attempts recorded for this activation. */
  resendCount?: number;
  invocations: SkillInvocation[];
  /** chronological audit log entries */
  trail: { at: string; entry: string }[];
  /** Optional payload captured from MVP activation build in chat. */
  mvpDetails?: {
    population: string;
    activationName: string;
    activationDefinition: string;
    segmentName: string;
    dataSource: string;
    accounts: string[];
    fieldMapping: string[];
    timing: string;
    cadence: string;
    recurringTime?: string;
    customers: Array<{ id: string; name: string; meta: string }>;
  };
  history?: ActivationHistoryPoint[];
}

export function estimateReachableProfileCount(population: string): number {
  const profileCount = Number(population.replace(/,/g, ""));
  if (!Number.isFinite(profileCount) || profileCount <= 0) return 0;
  return Math.min(profileCount - 1, Math.round(profileCount * 0.972));
}

export function getActivationDestinationPlatform(activation: Activation): string {
  if (activation.destinationPlatform) return activation.destinationPlatform;

  const metadata = [activation.mvpDetails?.dataSource, activation.channel, activation.skill, activation.context]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  const platform = ["Klaviyo", "Braze", "Attentive", "Meta"]
    .find((name) => metadata.includes(name.toLowerCase()));

  return platform ?? "Not specified";
}

export function getActivationPlatformType(activation: Activation): string {
  if (activation.platformType) return activation.platformType;

  const channel = activation.channel.toLowerCase();
  const types = [
    ["Email", "email"],
    ["SMS", "sms"],
    ["Paid social", "paid social"],
    ["Push", "push"],
    ["In-app", "in-app"],
  ] as const;
  const matchingTypes = types
    .filter(([, keyword]) => channel.includes(keyword))
    .map(([label]) => label);

  if (matchingTypes.length > 0) return matchingTypes.join(" · ");
  if (channel === "klaviyo" || channel === "braze" || channel === "attentive") return "Email";
  return activation.channel || "Not specified";
}

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
  cancelled: { label: "Cancelled", variant: "danger" },
};

export function approvalLabel(a: Approval): string {
  if (a.kind === "auto") return "Auto";
  if (a.kind === "pending") return "Pending";
  return `Approved · ${a.by}`;
}

export const DEFAULT_ACTIVATION_HISTORY: ActivationHistoryPoint[] = [
  { date: "Sep 04", profilesSent: 16540, delta: 0, note: "Initial sync" },
  { date: "Sep 07", profilesSent: 18120, delta: 9.6, note: "Audience refresh" },
  { date: "Sep 10", profilesSent: 17280, delta: -4.6, note: "Paused ad spend" },
  { date: "Sep 12", profilesSent: 19350, delta: 11.9, note: "Re-engagement lift" },
  { date: "Sep 14", profilesSent: 21120, delta: 9.2, note: "Peak delivery" },
];

export const RECURRING_FAILED_HISTORY: ActivationHistoryPoint[] = [
  { date: "Sep 04", profilesSent: 16540, delta: 0, note: "Initial sync" },
  { date: "Sep 07", profilesSent: 18120, delta: 9.6, note: "Audience refresh" },
  { date: "Sep 10", profilesSent: 17280, delta: -4.6, note: "Paused ad spend" },
  { date: "Sep 12", profilesSent: 19350, delta: 11.9, note: "Re-engagement lift" },
  { date: "Sep 14", profilesSent: 12630, delta: -34.7, note: "Audience sync failed", failed: true },
];

// ─── Seed data ───────────────────────────────────────────────────────────────

export const ACTIVATIONS: Activation[] = [
  {
    id: "ac-holiday-winback",
    name: "Holiday win-back activation",
    createdBy: "Lexi",
    context: "Holiday customer re-engagement",
    segmentId: "seg-winback",
    segmentName: "Holiday win-back",
    destinationPlatform: "Klaviyo",
    platformType: "Email",
    channel: "Email",
    category: "Holiday",
    skill: "Send Klaviyo Campaign",
    approval: { kind: "approved", by: "Amy", at: "7 Oct 2026" },
    status: "sent",
    whenLabel: "Sent · 7 Oct 2026",
    scheduledDate: "2026-10-07",
    scheduledTime: "09:00",
    activationCadence: "Once Off",
    profilesReached: 7642,
    resendCount: 1,
    activationDefinition: "Re-engage lapsed but valuable customers before the holiday sale.",
    result: "One-off Holiday win-back email sent to 7,642 profiles; 2,184 opens, 642 clicks, and $18,420 attributed revenue.",
    invocations: [
      { skill: "Send Klaviyo Campaign", params: "Holiday win-back, one-off email send", result: "Sent" },
    ],
    trail: [
      { at: "7 Oct 2026", entry: "One-off Holiday win-back email sent to the Holiday win-back segment." },
      { at: "7 Oct 2026", entry: "One resend recorded for non-openers." },
    ],
    mvpDetails: {
      population: "8,200",
      activationName: "Holiday win-back activation",
      activationDefinition: "Re-engage lapsed but valuable customers before the holiday sale.",
      segmentName: "Holiday win-back",
      dataSource: "Klaviyo",
      accounts: ["Klaviyo AU account"],
      fieldMapping: ["Email -> Email address (98%)"],
      timing: "Send Now",
      cadence: "Once Off",
      customers: [
        { id: "ac-holiday-winback-cust-1", name: "Ava Thompson", meta: "AOV $142 · Last purchase 94 days ago" },
        { id: "ac-holiday-winback-cust-2", name: "Liam Nguyen", meta: "AOV $129 · Last purchase 108 days ago" },
        { id: "ac-holiday-winback-cust-3", name: "Mia Rodriguez", meta: "AOV $151 · Last purchase 121 days ago" },
      ],
    },
    history: [
      { date: "Oct 07", profilesSent: 7642, delta: 0, note: "One-off Holiday win-back email send" },
    ],
  },
  {
    id: "ac-dummy-always",
    name: "Full-Price Early Adopters activation",
    createdBy: "Lexi automation",
    context: "Prototype seed",
    segmentId: "g-bi-fullprice",
    segmentName: "Full-Price Early Adopters",
    channel: "Email",
    category: "Demo",
    skill: "Push Meta Audience",
    approval: { kind: "auto" },
    status: "failed",
    whenLabel: "Demo · 08:42 AM",
    scheduledDate: "2026-12-01",
    profilesReached: 0,
    result: "Audience sync did not complete for the scheduled push.",
    resendCount: 0,
    invocations: [
      { skill: "Push Meta Audience", params: "Demo audience, failed sync", result: "Failed" },
    ],
    trail: [
      { at: "Seed", entry: "This is a permanent demo failure example for the Activations page." },
      { at: "Root cause", entry: "The Meta account token expired mid-push, so no customers were added to the audience." },
      { at: "Resolution", entry: "Refresh the token, re-authenticate the integration, and retry the activation after confirming the audience mapping." },
    ],
    history: DEFAULT_ACTIVATION_HISTORY,
  },
  {
    id: "ac-demo-one-off",
    name: "One-off activation — VIP replenishment email",
    createdBy: "Amy",
    context: "Prototype seed",
    segmentId: "g-bi-fullprice",
    segmentName: "Full-Price Early Adopters",
    channel: "Email",
    category: "Demo",
    skill: "Draft Klaviyo Campaign",
    approval: { kind: "approved", by: "Amy", at: "today" },
    status: "scheduled",
    whenLabel: "Scheduled · 2026-11-18",
    scheduledDate: "2026-11-18",
    scheduledTime: "09:00",
    result: "Queued for a single send to the target audience.",
    invocations: [
      { skill: "Draft Klaviyo Campaign", params: "VIP replenishment email, single send", result: "Scheduled" },
    ],
    trail: [
      { at: "Seed", entry: "This demonstrates a one-off activation example for the Activations page." },
    ],
  },
  {
    id: "ac-demo-recurring",
    name: "Recurring activation — weekly win-back refresh",
    createdBy: "Lexi automation",
    context: "Prototype seed",
    segmentId: "g-bi-hv-lapsed",
    segmentName: "High-value lapsed",
    channel: "Email · Paid social",
    category: "Demo",
    skill: "Push Meta Audience",
    approval: { kind: "auto" },
    status: "live",
    whenLabel: "Live · weekly cadence",
    recurringStartDate: "2026-09-01",
    recurringTime: "09:00",
    result: "Recurring audience sync is active and refreshes each week.",
    invocations: [
      { skill: "Push Meta Audience", params: "Weekly win-back refresh, recurring sync", result: "Live" },
    ],
    trail: [
      { at: "Seed", entry: "This demonstrates a recurring activation example for the Activations page." },
    ],
  },
  {
    id: "ac-demo-recurring-failed",
    name: "Recurring failed activation — win-back refresh",
    context: "Prototype seed",
    segmentId: "g-bi-hv-lapsed",
    segmentName: "High-value lapsed",
    channel: "Email · Paid social",
    category: "Demo",
    skill: "Push Meta Audience",
    approval: { kind: "auto" },
    status: "failed",
    whenLabel: "Failed · weekly cadence",
    recurringStartDate: "2026-09-01",
    recurringTime: "09:00",
    result: "The weekly sync failed after the connected audience service stopped refreshing.",
    invocations: [
      { skill: "Push Meta Audience", params: "Weekly win-back refresh, recurring sync failed", result: "Failed" },
    ],
    trail: [
      { at: "Seed", entry: "This is a recurring demo failure example for the Activations page." },
      { at: "Root cause", entry: "The source connection dropped before the refresh completed, causing the latest run to fail." },
      { at: "Resolution", entry: "Reconnect the source, verify credentials, and rerun the scheduled refresh before the next cadence window." },
    ],
    history: RECURRING_FAILED_HISTORY,
  },
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
    scheduledDate: "2026-09-15",
    scheduledTime: "09:30",
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
    scheduledDate: "2026-09-25",
    scheduledTime: "16:00",
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
    scheduledDate: "2026-11-29",
    scheduledTime: "10:30",
    scheduledEndDate: "2026-12-05",
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
    scheduledDate: "2026-09-26",
    scheduledTime: "08:30",
    result: "Sent to 3,400 customers; 18% conversion.",
    invocations: [{ skill: "Draft Klaviyo Campaign", params: "High-value lapsed, 15% off", result: "Sent" }],
    trail: [
      { at: "3 days ago", entry: "Flagged for sign-off." },
      { at: "3 days ago", entry: "Approved by Izac — sent." },
    ],
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
    scheduledDate: "2026-09-10",
    scheduledTime: "08:15",
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
    scheduledDate: "2026-10-13",
    scheduledTime: "09:00",
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
    scheduledTime: "09:00",
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
    scheduledTime: "12:00",
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
    scheduledTime: "16:30",
    scheduledEndDate: "2026-11-30",
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

export const ALWAYS_AVAILABLE_ACTIVATION_ID = "ac-dummy-always";
