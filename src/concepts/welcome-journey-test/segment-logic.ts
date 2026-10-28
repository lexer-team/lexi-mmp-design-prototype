/**
 * Segment - V1 — logic model
 *
 * Self-contained logic/plain-language model behind the segment builder, extracted
 * from Shared brain v1's group-detail "Definition" builder. A segment's criteria
 * are derived into a nested All / Any tree of condition tiles; each condition can
 * reference a shared definition (read-only chip) or carry its own editable
 * field / operator / value rows. The plain-language view reads the same tree back
 * as a sentence.
 *
 * Seed data maps onto the demo definitions (DEMO_DEFS) so the two proposed
 * segments in the conversation render with real, hover-able constructs.
 */
import { getDef, type DefRef } from "@/data/def-registry";
import { DEMO_DEFS } from "./demo-data";
import { getRule, getBrainGroup, type BrainGroup, type Criterion, type Usage } from "../lexi-shared-brain/data";
import type { Artifact } from "./types";

// ─── Tree types ───────────────────────────────────────────────────────────────

/** one editable field expression line, e.g. "Lifetime value · is greater than · $310" */
export interface LogicRow {
  field: string;
  operator: string;
  value: string;
}

export interface LogicCondition {
  kind: "condition";
  id: string;
  /** negates this single clause, evaluated within its group's connector */
  isNot: boolean;
  /** reference into the shared brain (read-only definition chip) */
  defId?: string;
  /** detached from a saved definition — edited inline, no longer reusable */
  custom?: boolean;
  /** display title for a custom condition — also the raw NL text for free conditions */
  title?: string;
  /** structured editable rows */
  rows?: LogicRow[];
  /** Lexi is currently interpreting this free-text condition */
  pending?: boolean;
  /** how Lexi resolved a free-text condition */
  interp?: { kind: "matched" | "translated" | "unclear"; query: string };
}

export interface LogicGroupNode {
  kind: "group";
  id: string;
  connector: "all" | "any";
  children: LogicNode[];
}

export type LogicNode = LogicGroupNode | LogicCondition;

// ─── Field / operator vocabularies ──────────────────────────────────────────

export const FIELD_OPTIONS = [
  // Value / spend (numeric)
  "Lifetime value", "Average order value", "Total spend", "Order margin",
  // Frequency / recency (numeric)
  "Order count", "Order number", "Days since last order",
  // Dates (date / date range)
  "First order date", "Last order date", "Order date",
  // Categorical / membership
  "Lifestyle Club tier", "Subscription status", "Segment",
  // Product (numeric)
  "SKU revenue rank", "Sell-through rate", "Months available per year",
  // Engagement / consent
  "Email engagement", "Marketing consent", "Last contacted",
  // Blue Illusion fields
  "L12M spend", "L12M order count", "Spend decile", "Average discount level",
  "Return rate", "Channel mix", "Store type", "Country",
];

export const OPERATORS = [
  // Comparison (numeric)
  "equals", "is greater than", "is less than", "is greater or equal to",
  "is less or equal to", "is between", "is in top",
  // Date / recency
  "is within last", "is more than", "within last", "is on or after", "is on or before", "is before", "is after",
  // Membership / presence
  "is", "is set", "is not set",
];

// ─── Construct picker — the "+ Condition" menu ──────────────────────────────

export type ConstructKind = "definition" | "segment";
export interface ConstructItem { kind: ConstructKind; id: string; name: string; sub: string }
export interface ConstructGroupList { label: string; items: ConstructItem[] }

/** everything a condition can reference, grouped for the picker */
export function constructGroups(): ConstructGroupList[] {
  return [
    {
      label: "Customer definitions",
      items: DEMO_DEFS.map((d) => ({
        kind: "definition" as const, id: d.id, name: d.name, sub: d.kind,
      })),
    },
  ];
}

// ─── Resolve a condition to its shared definition ───────────────────────────

export function conditionDef(cond: LogicCondition): DefRef | undefined {
  return cond.defId ? getDef(cond.defId) : undefined;
}

/** A "my read"-style breakdown of a condition: the named term + the spelled-out
 *  rule it stands for. Used by the plain readout on the segment card. */
export function conditionReadout(cond: LogicCondition): { term: string; detail: string } {
  const def = conditionDef(cond);
  const term = def?.name ?? cond.title ?? "Condition";
  const r = cond.rows?.[0];
  let detail = "";
  if (r) {
    detail = [r.field, r.operator, r.value].filter(Boolean).join(" ");
  } else if (def?.description) {
    detail = def.description;
  }
  return { term, detail };
}

// ─── Seed rows per definition ───────────────────────────────────────────────
// What each demo definition contributes as an editable expression row.

const DEF_ROWS: Record<string, LogicRow> = {
  "def-lapsed": { field: "Days since last order", operator: "is greater than", value: "90 days" },
  "def-ltv": { field: "Lifetime value", operator: "is greater than", value: "$310" },
  "def-consent": { field: "Marketing consent", operator: "equals", value: "Opted in" },
  "def-email-eng": { field: "Email engagement", operator: "within last", value: "60 days" },
};

function rowsForDef(defId: string): LogicRow[] {
  const r = DEF_ROWS[defId];
  return r ? [{ ...r }] : [];
}

// ─── ID generation ────────────────────────────────────────────────────────────

let logicSeq = 0;
const lid = () => `sln${++logicSeq}`;

/** build a fresh condition node from a picked construct */
export function conditionFromConstruct(item: ConstructItem): LogicCondition {
  return { kind: "condition", id: lid(), isNot: false, defId: item.id, rows: rowsForDef(item.id) };
}

// ─── Seed trees per segment artifact ────────────────────────────────────────
// Hand-authored so the proposed segments show a real builder state. The refined
// segment adds an email-engagement clause and nests the value gate as an example
// of the All / Any structure carrying over from v1.

const SEGMENT_TREES: Record<string, () => LogicGroupNode> = {
  "seg-winback": () => ({
    kind: "group",
    id: "root",
    connector: "all",
    children: [
      { kind: "condition", id: lid(), isNot: false, defId: "def-lapsed", rows: rowsForDef("def-lapsed") },
      { kind: "condition", id: lid(), isNot: false, defId: "def-ltv", rows: rowsForDef("def-ltv") },
      { kind: "condition", id: lid(), isNot: false, defId: "def-consent", rows: rowsForDef("def-consent") },
    ],
  }),
  "seg-winback-refined": () => ({
    kind: "group",
    id: "root",
    connector: "all",
    children: [
      { kind: "condition", id: lid(), isNot: false, defId: "def-lapsed", rows: rowsForDef("def-lapsed") },
      { kind: "condition", id: lid(), isNot: false, defId: "def-ltv", rows: rowsForDef("def-ltv") },
      { kind: "condition", id: lid(), isNot: false, defId: "def-consent", rows: rowsForDef("def-consent") },
      { kind: "condition", id: lid(), isNot: false, defId: "def-email-eng", rows: rowsForDef("def-email-eng") },
    ],
  }),
};

/** Build a BrainGroup-shaped record from a saved segment artifact so it can be
 *  shown in the standard (tabbed) group detail page. */
export function segmentArtifactToGroup(artifact: Artifact): BrainGroup {
  const body = artifact.body?.kind === "segment" ? artifact.body : undefined;
  const population = computePopulation(segmentToLogic(artifact.id, body?.criteria ?? []));
  const criteria = (body?.criteria ?? []).map((detail, index) => ({
    id: `${artifact.id}-criterion-${index}`,
    mode: "include" as const,
    detail,
  }));
  return {
    id: artifact.id,
    name: artifact.name,
    outputEntity: "customer",
    summary: artifact.def?.description ?? body?.purpose ?? "",
    criteria,
    population,
    status: artifact.status === "saved" ? "active" : "draft",
    scope: "personal",
    owner: "You",
    updatedAt: "Just now",
    folder: "Session segments",
    labels: [],
    purpose: body?.purpose,
    usedBy: artifact.usedBy ?? [],
  };
}

// ─── Typed field rows for shared-brain criteria ─────────────────────────────
// Each saved-segment criterion maps onto an editable field / operator / value row
// whose shape matches the underlying definition's data type — numeric comparisons
// for money & counts, categorical equality for tiers, and date / date-range rows
// for recency windows and calendar events. Without these, the builder renders
// every clause as "No field set".

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** "2025-06-20" → "20 Jun 2025" */
function fmtDate(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return iso;
  return `${d} ${MONTHS[m - 1]} ${y}`;
}

/** {start,end} → "20 Jun 2025 – 30 Jun 2025" */
function fmtRange(r: { start: string; end: string }): string {
  return `${fmtDate(r.start)} – ${fmtDate(r.end)}`;
}

/** Per-definition row builders, keyed by shared-brain definition id. Honour any
 *  operator / value the criterion carries (metrics), else fall back to the
 *  definition's natural data type. */
const BRAIN_DEF_ROWS: Record<string, (c: Criterion) => LogicRow[]> = {
  // ── Customer — value / spend ──
  "def-1": () => [{ field: "Lifetime value", operator: "is greater than", value: "$500" }],
  "def-7": (c) => [{ field: "Average order value", operator: c.operator ?? "is greater than", value: c.value ?? "$150" }],
  "def-bi-l12m-spend": (c) => [{ field: "L12M spend", operator: c.operator ?? "is greater or equal to", value: c.value ?? "$500" }],
  "def-bi-spend-decile": (c) => [{ field: "Spend decile", operator: c.operator ?? "equals", value: c.value ?? "10" }],
  "def-bi-avg-discount": (c) => [{ field: "Average discount level", operator: c.operator ?? "is less than", value: c.value ?? "4%" }],
  "def-bi-return-rate": (c) => [{ field: "Return rate", operator: c.operator ?? "is greater or equal to", value: c.value ?? "30%" }],
  "def-bi-l12m-orders": (c) => [{ field: "L12M order count", operator: c.operator ?? "is greater or equal to", value: c.value ?? "2" }],

  // ── Customer — lifecycle / recency ──
  // Recency reads as a date relative to today, e.g. "Last order date · is more than · 6 months ago".
  "def-2": () => [{ field: "Last order date", operator: "is within last", value: "12 months" }],
  "def-3": () => [{ field: "Last order date", operator: "is more than", value: "180 days ago" }],
  "def-bi-new": () => [{ field: "First order date", operator: "is within last", value: "12 months" }],
  "def-bi-returning": () => [{ field: "First order date", operator: "is more than", value: "12 months ago" }],
  "def-bi-lapsed-6m": () => [{ field: "Last order date", operator: "is more than", value: "6 months ago" }],
  "def-bi-lapsed-24m": () => [{ field: "Last order date", operator: "is more than", value: "24 months ago" }],

  // ── Customer — categorical / membership ──
  "def-5": (c) => [{ field: "Lifestyle Club tier", operator: "is", value: tierValue(c.detail) }],
  "def-bi-channel-mix": (c) => [{ field: "Channel mix", operator: c.operator ?? "is", value: c.value ?? "Omnichannel" }],

  // ── Customer — engagement / consent ──
  "def-bi-email-engaged": () => [{ field: "Email engagement", operator: "is within last", value: "60 days" }],
  "def-bi-subscribed": () => [{ field: "Subscription status", operator: "is", value: "Subscribed" }],

  // ── Order — store / margin ──
  "def-bi-store-type": (c) => [{ field: "Store type", operator: c.operator ?? "is", value: c.value ?? "DJ Concession" }],
  "def-21": () => [{ field: "Order margin", operator: "is greater than", value: "60%" }],
  // First purchase — a date window when phrased as recency, else the first order itself
  "def-20": (c) =>
    /day|month|week|last|within/.test(c.detail.toLowerCase())
      ? [{ field: "First order date", operator: "is within last", value: "30 days" }]
      : [{ field: "Order number", operator: "equals", value: "1" }],

  // ── Product ──
  "def-10": () => [{ field: "SKU revenue rank", operator: "is in top", value: "5%" }],
  "def-11": () => [{ field: "Months available per year", operator: "is less than", value: "6 months" }],
  "def-12": (c) => [{ field: "Sell-through rate", operator: c.operator ?? "is less than", value: c.value ?? "40%" }],
};

/** Pull a tier value out of detail like "tier = High Vitals" → "High Vitals". */
function tierValue(detail: string): string {
  const m = detail.match(/=\s*(.+)$/);
  if (m) return m[1].trim();
  return /\b(Normals|Value|Vitals|High Vitals|Pinnacles)\b/.exec(detail)?.[1] ?? "Pinnacles";
}

/** Turn a raw logic identifier into a readable field label. Keeps known recency
 *  columns and acronyms intact; sentence-cases everything else. */
function prettyField(raw: string): string {
  const key = raw.toLowerCase().trim().replace(/\s+/g, "_");
  const known: Record<string, string> = {
    last_order_date: "Last order date", last_purchase_date: "Last order date",
    first_order_date: "First order date", order_date: "Order date",
  };
  if (known[key]) return known[key];
  const s = raw.trim();
  if (/^[A-Z0-9]+$/.test(s)) return s; // acronyms — LTV, AOV, SKU…
  const words = key.split("_").filter(Boolean);
  return words.map((w, i) => (i === 0 ? w.charAt(0).toUpperCase() + w.slice(1) : w)).join(" ");
}

/** Fallback row for a definition we haven't hand-mapped: use any criterion
 *  operator/value, else derive a readable row from the definition's logic
 *  string. Recency expressions ("col < now() - 6 months") become a relative
 *  date row ("Last order date · is more than · 6 months ago") rather than the
 *  raw "now() - 6 months". */
function defaultDefRows(c: Criterion): LogicRow[] {
  const def = getDef(c.definitionId!);
  if (!def) return [];
  if (c.operator || c.value) return [{ field: def.name, operator: c.operator ?? "is set", value: c.value ?? "" }];
  const m = def.logic?.match(/^\s*([A-Za-z0-9_ ]+?)\s*(>=|<=|>|<|=)\s*(.+)$/);
  if (m) {
    const field = prettyField(m[1]);
    const rawVal = m[3].trim();
    const rel = rawVal.match(/now\(\)\s*-\s*(.+)/i);
    if (rel) {
      const window = rel[1].trim().replace(/[)\s]+$/, "");
      const isBefore = m[2] === "<" || m[2] === "<=";
      return [{ field, operator: isBefore ? "is more than" : "is within last", value: isBefore ? `${window} ago` : window }];
    }
    const op: Record<string, string> = { ">": "is greater than", "<": "is less than", ">=": "is greater or equal to", "<=": "is less or equal to", "=": "equals" };
    return [{ field, operator: op[m[2]] ?? m[2], value: rawVal }];
  }
  return [{ field: def.name, operator: "is set", value: "" }];
}

/** A calendar rule → a date-range row; a threshold rule → a recency row. */
function ruleRows(c: Criterion): LogicRow[] {
  const rule = getRule(c.ruleId);
  if (!rule) return [];
  if (rule.dateRange) return [{ field: "Order date", operator: "is between", value: fmtRange(rule.dateRange) }];
  if (rule.threshold != null) return [{ field: "Last contacted", operator: "is within last", value: `${rule.threshold} days` }];
  return [{ field: rule.name, operator: "is set", value: "" }];
}

/** A saved-group reference → a segment-membership row. */
function groupRefRows(c: Criterion): LogicRow[] {
  const g = getBrainGroup(c.groupRefId);
  return g ? [{ field: "Segment", operator: "is", value: g.name }] : [];
}

/** Convert a shared-brain BrainGroup (v2 group detail) into our logic tree so the
 *  group detail page renders with the same builder. Definition-backed criteria
 *  resolve to their chip; rules become date / recency conditions; group-refs
 *  become a membership condition. Every clause gets a typed field row. */
export function brainGroupToTree(group: BrainGroup): LogicGroupNode {
  const children: LogicNode[] = group.criteria.map((c) => {
    const isNot = c.mode === "exclude";

    // Definition-backed → keep the resolvable chip, attach a typed field row.
    if (c.definitionId && getDef(c.definitionId)) {
      const rows = (BRAIN_DEF_ROWS[c.definitionId]?.(c)) ?? defaultDefRows(c);
      return { kind: "condition", id: lid(), isNot, defId: c.definitionId, rows };
    }

    // Rule-backed (calendar window / guardrail) → titled condition w/ date rows.
    if (c.ruleId) {
      const rule = getRule(c.ruleId);
      return { kind: "condition", id: lid(), isNot, custom: true, title: rule?.name ?? c.detail, rows: ruleRows(c) };
    }

    // Saved-group reference → membership row.
    if (c.groupRefId) {
      const g = getBrainGroup(c.groupRefId);
      return { kind: "condition", id: lid(), isNot, custom: true, title: g?.name ?? c.detail, rows: groupRefRows(c) };
    }

    return { kind: "condition", id: lid(), isNot, custom: true, title: c.detail || c.lead || "Condition", rows: [] };
  });
  return { kind: "group", id: "root", connector: "all", children };
}

/** Derive a logic tree for a segment artifact. Falls back to a flat All group
 *  built from plain-text criteria when no authored tree exists. */
export function segmentToLogic(artifactId: string, criteria: string[]): LogicGroupNode {
  const authored = SEGMENT_TREES[artifactId];
  if (authored) return authored();
  return {
    kind: "group",
    id: "root",
    connector: "all",
    children: criteria.map((c) => ({
      kind: "condition" as const,
      id: lid(),
      isNot: false,
      custom: true,
      title: c,
      rows: [],
    })),
  };
}

// ─── Immutable tree edits, keyed by node id ─────────────────────────────────

export function patchGroupConnector(node: LogicGroupNode, id: string, connector: "all" | "any"): LogicGroupNode {
  return {
    ...node,
    connector: node.id === id ? connector : node.connector,
    children: node.children.map((c) => (c.kind === "group" ? patchGroupConnector(c, id, connector) : c)),
  };
}

export function toggleConditionNot(node: LogicGroupNode, id: string, isNot: boolean): LogicGroupNode {
  return {
    ...node,
    children: node.children.map((c) =>
      c.kind === "group" ? toggleConditionNot(c, id, isNot) : c.id === id ? { ...c, isNot } : c,
    ),
  };
}

export function updateConditionRow(node: LogicGroupNode, id: string, idx: number, patch: Partial<LogicRow>): LogicGroupNode {
  return {
    ...node,
    children: node.children.map((c) =>
      c.kind === "group"
        ? updateConditionRow(c, id, idx, patch)
        : c.id === id
          ? {
              // editing a referenced condition detaches it into a custom tile
              ...c,
              custom: c.defId ? true : c.custom,
              title: c.defId ? conditionDef(c)?.name ?? c.title : c.title,
              defId: undefined,
              rows: (c.rows ?? []).map((r, i) => (i === idx ? { ...r, ...patch } : r)),
            }
          : c,
    ),
  };
}

export function removeNode(node: LogicGroupNode, id: string): LogicGroupNode {
  return {
    ...node,
    children: node.children
      .filter((c) => c.id !== id)
      .map((c) => (c.kind === "group" ? removeNode(c, id) : c)),
  };
}

const uiId = () => `sln${++logicSeq}`;

export function addToGroup(node: LogicGroupNode, groupId: string, child: LogicNode): LogicGroupNode {
  return {
    ...node,
    children:
      node.id === groupId
        ? [...node.children, child]
        : node.children.map((c) => (c.kind === "group" ? addToGroup(c, groupId, child) : c)),
  };
}

export function newGroup(): LogicGroupNode {
  return { kind: "group", id: uiId(), connector: "any", children: [] };
}

/** flatten the tree into its conditions, in order (grouping ignored — used for
 *  the line-by-line plain readout). */
export function flattenConditions(node: LogicGroupNode): LogicCondition[] {
  const out: LogicCondition[] = [];
  for (const c of node.children) {
    if (c.kind === "group") out.push(...flattenConditions(c));
    else out.push(c);
  }
  return out;
}

/** patch a single condition by id (immutable). */
export function patchCondition(node: LogicGroupNode, id: string, patch: Partial<LogicCondition>): LogicGroupNode {
  return {
    ...node,
    children: node.children.map((c) =>
      c.kind === "group" ? patchCondition(c, id, patch) : c.id === id ? { ...c, ...patch } : c,
    ),
  };
}

/** a brand-new empty free-text condition (user types NL, Lexi interprets). */
export function newCustomCondition(): LogicCondition {
  return { kind: "condition", id: lid(), isNot: false, custom: true, title: "", rows: [] };
}

// ─── Drag-and-drop reorder ──────────────────────────────────────────────────

function findNode(node: LogicNode, id: string): LogicNode | undefined {
  if (node.id === id) return node;
  if (node.kind === "group") {
    for (const c of node.children) {
      const f = findNode(c, id);
      if (f) return f;
    }
  }
  return undefined;
}

function nodeContains(node: LogicNode, id: string): boolean {
  if (node.id === id) return true;
  return node.kind === "group" && node.children.some((c) => nodeContains(c, id));
}

function removeById(node: LogicGroupNode, id: string): { node: LogicGroupNode; removed?: LogicNode } {
  let removed: LogicNode | undefined;
  const children: LogicNode[] = [];
  for (const c of node.children) {
    if (c.id === id) { removed = c; continue; }
    if (c.kind === "group") {
      const r = removeById(c, id);
      if (r.removed) removed = r.removed;
      children.push(r.node);
    } else {
      children.push(c);
    }
  }
  return { node: { ...node, children }, removed };
}

function insertBefore(node: LogicGroupNode, targetId: string, item: LogicNode): LogicGroupNode {
  const idx = node.children.findIndex((c) => c.id === targetId);
  if (idx >= 0) {
    const children = [...node.children];
    children.splice(idx, 0, item);
    return { ...node, children };
  }
  return {
    ...node,
    children: node.children.map((c) => (c.kind === "group" ? insertBefore(c, targetId, item) : c)),
  };
}

/** move `dragId` to sit immediately before `targetId`, within `targetId`'s parent. */
export function moveNode(tree: LogicGroupNode, dragId: string, targetId: string): LogicGroupNode {
  if (dragId === targetId) return tree;
  const dragged = findNode(tree, dragId);
  if (!dragged || nodeContains(dragged, targetId)) return tree; // can't drop into own subtree
  const { node: without, removed } = removeById(tree, dragId);
  if (!removed) return tree;
  return insertBefore(without, targetId, removed);
}

function appendToGroup(node: LogicGroupNode, groupId: string, item: LogicNode): LogicGroupNode {
  if (node.id === groupId) return { ...node, children: [...node.children, item] };
  return {
    ...node,
    children: node.children.map((c) => (c.kind === "group" ? appendToGroup(c, groupId, item) : c)),
  };
}

/** move `dragId` to the end of group `groupId`'s children. */
export function moveNodeToEnd(tree: LogicGroupNode, dragId: string, groupId: string): LogicGroupNode {
  const dragged = findNode(tree, dragId);
  if (!dragged || nodeContains(dragged, groupId)) return tree;
  const { node: without, removed } = removeById(tree, dragId);
  if (!removed) return tree;
  return appendToGroup(without, groupId, removed);
}

// ─── Lexi interpretation of free-text conditions ────────────────────────────
// Mock NL → either an existing definition match, or a translated query.

const OP_SYMBOL: Record<string, string> = {
  equals: "=", "is greater than": ">", "is less than": "<",
  "is greater or equal to": ">=", "is less or equal to": "<=", "within last": "within",
};

function snake(field: string): string {
  return field.toLowerCase().trim().replace(/\s+/g, "_");
}

function toQuery(row: LogicRow): string {
  const op = OP_SYMBOL[row.operator] ?? row.operator;
  return `${snake(row.field)} ${op} ${row.value || "?"}`.trim();
}

function parseFreeText(t: string): LogicRow {
  const numMatch = t.match(/\$?\s*([0-9][0-9,.]*)/);
  const num = numMatch ? numMatch[1].replace(/,/g, "") : "";
  const hasMoney = t.includes("$") || /spend|spent|aov|order value|revenue/.test(t);
  let field = "Custom attribute";
  if (hasMoney) field = "Total spend";
  else if (/order|purchase|bought/.test(t)) field = "Order count";
  else if (/visit|session|browse/.test(t)) field = "Sessions";
  else if (/age|year old/.test(t)) field = "Age";
  let operator = "is greater than";
  if (/less|under|below|fewer|<\s/.test(t)) operator = "is less than";
  else if (/exactly|equal|is\s/.test(t) && !/greater|more|over/.test(t)) operator = "equals";
  const value = num ? (hasMoney ? `$${num}` : num) : "";
  return { field, operator, value };
}

export interface Interpretation {
  defId?: string;
  rows: LogicRow[];
  kind: "matched" | "translated" | "unclear";
  /** label for a translated condition (the resolved field) */
  label?: string;
  query: string;
}

export function interpretCondition(text: string): Interpretation {
  const t = text.toLowerCase();
  const has = (...ks: string[]) => ks.some((k) => t.includes(k));
  const matched = (id: string): Interpretation => {
    const def = getDef(id);
    return { defId: id, rows: rowsForDef(id), kind: "matched", query: def?.logic ?? id };
  };
  if (has("email", "opened", "open", "click", "engag", "newsletter")) return matched("def-email-eng");
  if (has("lapsed", "no purchase", "haven't bought", "hasn't", "inactive", "dormant", "since last order", "days since")) return matched("def-lapsed");
  if (has("lifetime", "ltv", "valuable", "high value", "high-value", "big spender", "vip", "top spender")) return matched("def-ltv");
  if (has("consent", "opt-in", "opted", "subscrib", "marketing permission", "not suppressed")) return matched("def-consent");

  const row = parseFreeText(t);
  // Low confidence: no known field and no value to anchor a query → ask to review.
  if (row.field === "Custom attribute" && !row.value) {
    return { rows: [], kind: "unclear", query: "" };
  }
  return { rows: [row], kind: "translated", label: row.field, query: toQuery(row) };
}

// ─── Live metrics — recomputed from the active conditions ────────────────────

const BASE_AUDIENCE = 52000;
const SELECTIVITY: Record<string, number> = {
  "def-lapsed": 0.40, "def-ltv": 0.50, "def-consent": 0.80, "def-email-eng": 0.42,
};
const DEFAULT_SELECTIVITY = 0.62;

/** selectivity of a node in [0,1]; recurses through nested groups and honours
 *  is-not. Pending / unclear / incomplete conditions don't filter (selectivity 1). */
function nodeSelectivity(node: LogicNode): number {
  if (node.kind === "condition") {
    if (node.pending || node.interp?.kind === "unclear") return 1;
    if (!node.defId && (!node.rows || node.rows.length === 0)) return 1;
    const s = node.defId ? SELECTIVITY[node.defId] ?? DEFAULT_SELECTIVITY : DEFAULT_SELECTIVITY;
    return node.isNot ? 1 - s : s;
  }
  if (node.children.length === 0) return 1;
  const sels = node.children.map(nodeSelectivity);
  return node.connector === "any"
    ? 1 - sels.reduce((p, s) => p * (1 - s), 1)
    : sels.reduce((p, s) => p * s, 1);
}

export function computePopulation(tree: LogicGroupNode): number {
  return Math.max(1, Math.round(BASE_AUDIENCE * nodeSelectivity(tree)));
}

export interface MetricView { label: string; value: string }

/** Recompute the headline metrics from the live tree. Population is exact;
 *  the secondary metrics shift with how tightly the audience is filtered. */
export function computeMetrics(tree: LogicGroupNode, seed: { label: string; value: string }[]): MetricView[] {
  const pop = computePopulation(tree);
  const tight = Math.min(1, Math.max(0, 1 - pop / BASE_AUDIENCE));
  return seed.map((m, i) => {
    const label = m.label.toLowerCase();
    if (i === 0 || label.includes("population")) return { label: m.label, value: pop.toLocaleString() };
    if (label.includes("lifetime") || label.includes("ltv") || label.includes("value")) return { label: m.label, value: `$${Math.round(300 + tight * 160)}` };
    if (label.includes("day")) return { label: m.label, value: `${Math.round(40 + tight * 120)}` };
    if (label.includes("engag") || label.includes("reach")) return { label: m.label, value: `${Math.round(60 + tight * 40)}%` };
    return { label: m.label, value: m.value };
  });
}
