/**
 * Segment - V1 — Definitions page data
 *
 * Splits the shared mock data into the two-tier model:
 *   • Source — raw columns mapped 1:1 from the warehouse (MOCK_ATTRIBUTES).
 *   • Custom — the curated layer built on top: metrics + computed definitions.
 *
 * Both are sliced by entity (customer / product / order) for the entity tabs.
 * Each row carries a standard query data type (String · Integer · Decimal ·
 * Boolean · Date) and a detail string (source column for raw fields; logic for
 * custom ones). `getDefinition` resolves the full detail + usage for the drawer.
 */
import {
  MOCK_ATTRIBUTES, MOCK_METRICS, MOCK_DEFINITIONS, MOCK_SEGMENTS,
  type Definition, type EntityType,
} from "@/data/definitions-mock";
import { BRAIN_GROUPS } from "../lexi-shared-brain/data";

export type DefLayer = "source" | "custom";

/** Standard data-table / query types — what you'd see in a warehouse schema. */
export type DataType = "String" | "Integer" | "Decimal" | "Boolean" | "Date";

export interface DefRow {
  id: string;
  name: string;
  description: string;
  entity: EntityType;
  dataType: DataType;
  detail: string; // source column (Source) or logic (Custom)
}

// Custom definitions that are boolean classifications but carry no dataType in
// the mock — flagged so they read as Boolean rather than being inferred.
const BOOL_DEFS = new Set([
  "def-1", "def-2", "def-3", "def-10", "def-11", "def-20", "def-21",
  "def-bi-new", "def-bi-returning", "def-bi-lapsed-6m", "def-bi-lapsed-24m",
  "def-bi-email-engaged", "def-bi-subscribed",
]);

// Excluded from Custom on purpose — each already lives elsewhere, so showing it
// here would re-introduce the double-representation we set out to remove:
//   • def-bi-country / def-bi-employee → raw columns, belong in Source
//   • def-6 / def-7 / def-12          → duplicate canonical metrics (met-1/4/9)
const EXCLUDE = new Set([
  "def-bi-country", "def-bi-employee", "def-6", "def-7", "def-12",
]);

/** Resolve a standard data type from the mock dataType + name/description. */
function dataTypeOf(name: string, desc: string, dataType?: string, id?: string): DataType {
  if (id && BOOL_DEFS.has(id)) return "Boolean";
  switch (dataType) {
    case "date": return "Date";
    case "boolean": return "Boolean";
    case "categorical": return "String";
    case "text": return "String";
  }
  const t = `${name} ${desc}`.toLowerCase();
  if (dataType === "numeric") {
    return /count|decile|rank|number|month|orders/.test(t) ? "Integer" : "Decimal";
  }
  return "String";
}

// ─── List rows ────────────────────────────────────────────────────────────────

/** Tier 1 — raw source columns for an entity. */
export function sourceFields(entity: EntityType): DefRow[] {
  return MOCK_ATTRIBUTES
    .filter((a) => a.entity === entity)
    .map((a) => ({
      id: a.id,
      name: a.name,
      description: a.description,
      entity: a.entity,
      dataType: dataTypeOf(a.name, a.description, a.dataType, a.id),
      detail: a.athenaColumn ?? "—",
    }));
}

/** Tier 2 — curated custom definitions (metrics + computed terms) for an entity. */
export function customDefs(entity: EntityType): DefRow[] {
  const metrics: DefRow[] = MOCK_METRICS
    .filter((m) => m.entity === entity)
    .map((m) => ({
      id: m.id,
      name: m.name,
      description: m.description,
      entity: m.entity,
      dataType: dataTypeOf(m.name, m.description, m.dataType, m.id),
      detail: m.sql ?? "—",
    }));

  const defs: DefRow[] = MOCK_DEFINITIONS
    .filter((d) => d.status !== "gap" && !EXCLUDE.has(d.id) && d.entity === entity)
    .map((d) => ({
      id: d.id,
      name: d.name,
      description: d.description,
      entity: d.entity,
      dataType: dataTypeOf(d.name, d.description, d.dataType, d.id),
      detail: d.logic ?? "—",
    }));

  return [...metrics, ...defs];
}

// ─── Detail (drawer) ──────────────────────────────────────────────────────────

export interface DefUsage { id: string; name: string }

export interface DefDetail {
  id: string;
  name: string;
  description: string;
  dataType: DataType;
  entity: EntityType;
  layer: DefLayer;
  status?: string;
  scope?: string;
  count?: number;
  possibleValues?: string[];
  column?: string;     // raw warehouse column
  logic?: string;      // SQL / rule expression for custom defs
  provenance?: string; // where it came from (source / mapping note)
  updatedAt?: string;
  usage: DefUsage[];
  lastUsed?: string;
}

const SOURCE_BY_ID = new Map<string, Definition>(MOCK_ATTRIBUTES.map((a) => [a.id, a]));
const CUSTOM_BY_ID = new Map<string, Definition>(
  [...MOCK_METRICS, ...MOCK_DEFINITIONS].map((d) => [d.id, d]),
);

// Deterministic mock "last used" so the drawer reads realistically.
const LAST_USED_POOL = ["2 hours ago", "Yesterday", "3 days ago", "5 days ago", "1 week ago", "2 weeks ago"];
function hash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}

/** Segments / groups that compose from this definition. */
function usageFor(id: string): DefUsage[] {
  const out: DefUsage[] = [];
  for (const g of BRAIN_GROUPS) {
    if (g.criteria.some((c) => c.definitionId === id)) out.push({ id: g.id, name: g.name });
  }
  for (const s of MOCK_SEGMENTS) {
    if ((s.usedMetrics.includes(id) || s.usedAttributes.includes(id)) && !out.some((o) => o.name === s.name)) {
      out.push({ id: s.id, name: s.name });
    }
  }
  return out;
}

/** Full normalised detail for the drawer, across both tiers. */
export function getDefinition(id: string): DefDetail | undefined {
  const src = SOURCE_BY_ID.get(id);
  const def = src ?? CUSTOM_BY_ID.get(id);
  if (!def) return undefined;
  const layer: DefLayer = src ? "source" : "custom";
  const usage = usageFor(id);
  return {
    id,
    name: def.name,
    description: def.description,
    dataType: dataTypeOf(def.name, def.description, def.dataType, def.id),
    entity: def.entity,
    layer,
    status: def.status,
    scope: def.scope,
    count: def.count,
    possibleValues: def.possibleValues,
    column: def.athenaColumn,
    logic: def.sql ?? def.logic,
    provenance: def.source,
    updatedAt: def.updatedAt,
    usage,
    lastUsed: usage.length ? LAST_USED_POOL[hash(id) % LAST_USED_POOL.length] : undefined,
  };
}
