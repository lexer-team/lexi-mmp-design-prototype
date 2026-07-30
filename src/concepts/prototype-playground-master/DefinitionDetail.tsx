/**
 * Segment - V1 — Definition detail
 *
 * `TypeLabel` renders a standard data type as text + icon (used in the table),
 * and `DefinitionDrawer` is the right-side detail panel: data details, logic /
 * source column, possible values, and usage (dependents + last used).
 */
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/Badge";
import {
  RiCloseLine, RiText, RiHashtag, RiToggleLine, RiCalendarLine,
  RiGroupLine, RiDatabase2Line, RiStackLine,
} from "@remixicon/react";
import type { RemixiconComponentType } from "@remixicon/react";
import { getDefinition, type DataType, type DefLayer } from "./definitions-data";
import type { EntityType } from "@/data/definitions-mock";

const TYPE_ICON: Record<DataType, RemixiconComponentType> = {
  String: RiText, Integer: RiHashtag, Decimal: RiHashtag, Boolean: RiToggleLine, Date: RiCalendarLine,
};

const ENTITY_LABEL: Record<EntityType, string> = {
  customer: "Customer", product: "Product", order: "Transaction",
};
const SCOPE_LABEL: Record<string, string> = { org: "Org-wide", team: "Team", personal: "Personal" };
const LAYER_LABEL: Record<DefLayer, string> = { source: "Source", custom: "Custom" };
const LAYER_ICON: Record<DefLayer, RemixiconComponentType> = { source: RiDatabase2Line, custom: RiStackLine };

/** Data type as plain text + a leading type icon. */
export function TypeLabel({ type }: { type: DataType }) {
  const Icon = TYPE_ICON[type];
  return (
    <span className="inline-flex items-center gap-1.5 text-sm text-foreground-secondary">
      <Icon className="size-3.5 text-muted-foreground" />
      {type}
    </span>
  );
}

function StatusBadge({ status }: { status?: string }) {
  if (!status) return null;
  if (status === "confirmed") return <Badge variant="success" size="sm">Confirmed</Badge>;
  if (status === "inferred") return <Badge variant="warning" size="sm">Inferred</Badge>;
  return <Badge variant="secondary" size="sm" className="capitalize">{status}</Badge>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <div className="text-sm text-foreground">{children}</div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-3">
      <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      {children}
    </div>
  );
}

export function DefinitionDrawer({
  id, onClose,
}: {
  id: string;
  onClose: () => void;
}) {
  const [shown, setShown] = useState(false);
  const def = getDefinition(id);

  useEffect(() => {
    const t = requestAnimationFrame(() => setShown(true));
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => { cancelAnimationFrame(t); window.removeEventListener("keydown", onKey); };
  }, [onClose]);

  if (!def) return null;
  const LayerIcon = LAYER_ICON[def.layer];

  return createPortal(
    <div className="fixed inset-0 z-[9998]">
      {/* Backdrop */}
      <div
        className={cn("absolute inset-0 bg-foreground/20 transition-opacity duration-200", shown ? "opacity-100" : "opacity-0")}
        onClick={onClose}
      />
      {/* Panel */}
      <div
        className={cn(
          "absolute right-0 top-0 flex h-full w-[26rem] flex-col bg-background shadow-lg transition-transform duration-200 ease-out",
          shown ? "translate-x-0" : "translate-x-full",
        )}
      >
        {/* Header */}
        <header className="flex items-start gap-2 border-b border-border px-5 py-4">
          <div className="flex min-w-0 flex-1 flex-col gap-1.5">
            <h2 className="truncate text-base font-semibold text-foreground">{def.name}</h2>
            <div className="flex flex-wrap items-center gap-2 text-xs text-foreground-secondary">
              <span className="inline-flex items-center gap-1">
                <LayerIcon className="size-3.5 text-muted-foreground" />{LAYER_LABEL[def.layer]}
              </span>
              <span className="text-border">·</span>
              <span>{ENTITY_LABEL[def.entity]}</span>
              <span className="text-border">·</span>
              <TypeLabel type={def.dataType} />
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex size-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            title="Close"
          >
            <RiCloseLine className="size-4" />
          </button>
        </header>

        {/* Body */}
        <div className="flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto px-5 py-5">
          {def.description && (
            <p className="text-sm leading-relaxed text-foreground-secondary">{def.description}</p>
          )}

          <Section title="Details">
            <div className="grid grid-cols-2 gap-4">
              <Field label="Data type"><TypeLabel type={def.dataType} /></Field>
              <Field label="Grain">{ENTITY_LABEL[def.entity]}</Field>
              {def.status && <Field label="Status"><StatusBadge status={def.status} /></Field>}
              {def.scope && <Field label="Scope">{SCOPE_LABEL[def.scope] ?? def.scope}</Field>}
              {def.count != null && <Field label="Matches"><span className="tabular-nums">{def.count.toLocaleString()}</span></Field>}
              {def.updatedAt && <Field label="Updated">{def.updatedAt}</Field>}
            </div>

            {def.possibleValues && def.possibleValues.length > 0 && (
              <Field label="Values">
                <div className="flex flex-wrap gap-1.5 pt-0.5">
                  {def.possibleValues.map((v) => (
                    <Badge key={v} variant="secondary" size="sm">{v}</Badge>
                  ))}
                </div>
              </Field>
            )}

            {def.layer === "source" && def.column && (
              <Field label="Source column">
                <code className="block break-words rounded-md bg-muted px-2 py-1.5 font-mono text-xs text-foreground-secondary">{def.column}</code>
              </Field>
            )}

            {def.layer === "custom" && def.logic && (
              <Field label="Logic">
                <code className="block whitespace-pre-wrap break-words rounded-md bg-muted px-2 py-1.5 font-mono text-xs leading-relaxed text-foreground-secondary">{def.logic}</code>
              </Field>
            )}

            {def.provenance && <Field label="Source">{def.provenance}</Field>}
          </Section>

          <Section title="Usage">
            <Field label={`Used by ${def.usage.length} segment${def.usage.length === 1 ? "" : "s"}`}>
              {def.usage.length > 0 ? (
                <div className="mt-0.5 flex flex-col gap-1">
                  {def.usage.map((u) => (
                    <div key={u.id} className="flex items-center gap-2">
                      <RiGroupLine className="size-4 shrink-0 text-muted-foreground" />
                      <span className="min-w-0 flex-1 truncate text-sm text-foreground">{u.name}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Not used by any segment yet.</p>
              )}
            </Field>
            <Field label="Last used">{def.lastUsed ?? "—"}</Field>
          </Section>
        </div>
      </div>
    </div>,
    document.body,
  );
}
