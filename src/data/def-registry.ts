import {
  MOCK_SEGMENTS, MOCK_ATTRIBUTES, MOCK_METRICS, MOCK_DEFINITIONS,
  type EntityType,
} from "@/data/definitions-mock";

// ─── A normalised, popover-ready shape for anything that has a definition ──────
// Everything that can surface in chat / a builder / a quote / an @-mention
// resolves to this single shape, so one card can render it everywhere.

export type DefKind = "term" | "attribute" | "metric" | "segment" | "dashboard" | "group";

export interface DefRef {
  id: string;
  kind: DefKind;
  name: string;
  entity?: EntityType;
  description: string;
  logic?: string;            // plain SQL-ish or rule text
  statusLabel?: string;      // Confirmed / Inferred / Active …
  statusTone?: "success" | "warning" | "secondary";
  source?: string;           // where it came from / column
  dataType?: string;
  possibleValues?: string[];
  stat?: { label: string; value: string };
  usedIn?: string[];         // names of things that depend on it
  owner?: string;
  future?: boolean;          // not built yet (e.g. dashboards) — show, don't act
}

const fmt = (n: number) => n.toLocaleString();

function statusMeta(status: string): { statusLabel: string; statusTone: DefRef["statusTone"] } {
  switch (status) {
    case "confirmed":
    case "active":
      return { statusLabel: status === "active" ? "Active" : "Confirmed", statusTone: "success" };
    case "inferred":
    case "draft":
      return { statusLabel: status === "draft" ? "Draft" : "Inferred", statusTone: "warning" };
    default:
      return { statusLabel: status, statusTone: "secondary" };
  }
}

// Build a single registry keyed by the mock ids (already unique: seg- attr- met- def-)
function buildRegistry(): Map<string, DefRef> {
  const reg = new Map<string, DefRef>();

  // Segments
  for (const s of MOCK_SEGMENTS) {
    const sm = statusMeta(s.status);
    reg.set(s.id, {
      id: s.id, kind: "segment", name: s.name, entity: "customer",
      description: s.description, ...sm, owner: s.owner,
      stat: { label: "people", value: fmt(s.population) },
      usedIn: s.activations.map((a) => a.name),
    });
  }

  // Attributes
  for (const a of MOCK_ATTRIBUTES) {
    const sm = statusMeta(a.status);
    reg.set(a.id, {
      id: a.id, kind: "attribute", name: a.name, entity: a.entity,
      description: a.description, ...sm, source: a.athenaColumn,
      dataType: a.dataType, possibleValues: a.possibleValues,
      usedIn: MOCK_SEGMENTS.filter((s) => s.usedAttributes.includes(a.id)).map((s) => s.name),
    });
  }

  // Metrics
  for (const m of MOCK_METRICS) {
    const sm = statusMeta(m.status);
    reg.set(m.id, {
      id: m.id, kind: "metric", name: m.name, entity: m.entity,
      description: m.description, ...sm, logic: m.sql, source: m.athenaColumn,
      dataType: m.dataType,
      usedIn: MOCK_SEGMENTS.filter((s) => s.usedMetrics.includes(m.id)).map((s) => s.name),
    });
  }

  // Semantic "terms" — the named concepts Lexi uses in prose
  for (const d of MOCK_DEFINITIONS) {
    if (d.status === "gap") continue;
    const sm = statusMeta(d.status);
    reg.set(d.id, {
      id: d.id, kind: "term", name: d.name, entity: d.entity,
      description: d.description, ...sm, logic: d.logic, source: d.source,
      stat: d.count != null ? { label: "matches", value: fmt(d.count) } : undefined,
    });
  }

  return reg;
}

export const DEF_REGISTRY = buildRegistry();

/** Add extra refs to the shared registry (e.g. concept-specific segments,
 *  future dashboards) so getDef and inline tokens resolve them everywhere. */
export function registerDefs(defs: DefRef[]): void {
  for (const d of defs) DEF_REGISTRY.set(d.id, d);
}

export const getDef = (id: string): DefRef | undefined => DEF_REGISTRY.get(id);

// ─── Construct treatment ─────────────────────────────────────────────────────
// The rule: saved objects you can open (segments, dashboards, groups) read as a
// chip; concepts that are only a definition or a value (Churned, Black Friday,
// AOV) read as a dotted underline that stays in the flow of prose.

export type TokenTreatment = "chip" | "underline";

export function treatmentForKind(kind: DefKind): TokenTreatment {
  return kind === "segment" || kind === "dashboard" || kind === "group" ? "chip" : "underline";
}
