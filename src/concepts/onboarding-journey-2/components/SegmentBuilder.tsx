import {
  Fragment, createContext, useContext, useEffect, useRef, useState,
  type HTMLAttributes,
} from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Input } from "@/components/ui/Input";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/DropdownMenu";
import {
  RiAddLine, RiArrowDownSLine, RiCheckLine, RiCloseLine, RiRulerLine, RiPencilLine,
  RiSparkling2Line, RiLoader4Line, RiErrorWarningLine, RiDraggable,
} from "@remixicon/react";
import { DefinitionCard } from "@/components/definitions/DefinitionCard";
import { KIND_META } from "@/components/definitions/kind-meta";
import {
  FIELD_OPTIONS, OPERATORS, conditionDef, conditionReadout, conditionFromConstruct,
  constructGroups, patchGroupConnector, toggleConditionNot, updateConditionRow,
  removeNode, addToGroup, newGroup, newCustomCondition, patchCondition, interpretCondition,
  moveNode, moveNodeToEnd,
  type ConstructItem, type LogicCondition, type LogicGroupNode, type LogicNode, type LogicRow,
} from "../segment-logic";

// ─── View toggle: Plain · Builder ───────────────────────────────────────────

export type DefView = "plain" | "builder";

export function ViewToggle({ value, onChange }: { value: DefView; onChange: (v: DefView) => void }) {
  return (
    <div className="inline-flex shrink-0 rounded-lg border border-border bg-muted p-0.5">
      {(["plain", "builder"] as const).map((v) => (
        <button key={v} onClick={() => onChange(v)} className={cn(
          "rounded-md px-2.5 py-1 text-xs font-medium capitalize transition-colors",
          value === v ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
        )}>{v}</button>
      ))}
    </div>
  );
}

// ─── Shared builder context ──────────────────────────────────────────────────

interface BuilderCtx {
  editable: boolean;
  activeDrop: string | null;
  dragHandle: (id: string) => HTMLAttributes<HTMLElement>;
  dropBefore: (id: string) => HTMLAttributes<HTMLElement>;
  dropEnd: (groupId: string) => HTMLAttributes<HTMLElement>;
  overrides: Record<string, string>;
  setConnector: (id: string, v: "all" | "any") => void;
  toggleNot: (id: string, isNot: boolean) => void;
  remove: (id: string) => void;
  updateRow: (id: string, idx: number, patch: Partial<LogicRow>) => void;
  addConstruct: (groupId: string, item: ConstructItem) => void;
  addCondition: (groupId: string) => void;
  addGroup: (groupId: string) => void;
  commitText: (id: string, text: string) => void;
  editDetail: (id: string, text: string) => void;
}
const Ctx = createContext<BuilderCtx | null>(null);
const useBuilder = () => useContext(Ctx)!;

// ─── Small segmented control (All/Any, is/is not) ───────────────────────────

function Seg<T extends string>({ value, options, onChange, dangerValue }: {
  value: T; options: { value: T; label: string }[]; onChange: (v: T) => void; dangerValue?: T;
}) {
  return (
    <div className="inline-flex shrink-0 rounded-md border border-border bg-muted p-0.5">
      {options.map((o) => {
        const active = value === o.value;
        return (
          <button
            key={o.value}
            onClick={() => onChange(o.value)}
            className={cn(
              "rounded px-2 py-0.5 text-xs font-medium transition-colors",
              active
                ? o.value === dangerValue
                  ? "bg-card text-rose-600 shadow-sm dark:text-rose-400"
                  : "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

const CONNECTOR_OPTS = [{ value: "all" as const, label: "All" }, { value: "any" as const, label: "Any" }];
const ISNOT_OPTS = [{ value: "is" as const, label: "is" }, { value: "is not" as const, label: "is not" }];

function ConnectorControl({ node }: { node: LogicGroupNode }) {
  const { editable, setConnector } = useBuilder();
  if (!editable) return <span className="text-sm font-semibold text-foreground">{node.connector}</span>;
  return <Seg value={node.connector} options={CONNECTOR_OPTS} onChange={(v) => setConnector(node.id, v)} />;
}

/** Drag grip — fixed height so it centres on the first line of the row. */
function Grip({ id }: { id: string }) {
  const { editable, dragHandle } = useBuilder();
  if (!editable) return null;
  return (
    <span
      {...dragHandle(id)}
      className="flex h-5 w-4 shrink-0 cursor-grab items-center justify-center text-muted-foreground/50 hover:text-muted-foreground active:cursor-grabbing"
      title="Drag to reorder"
    >
      <RiDraggable className="size-4" />
    </span>
  );
}

/** A thin insertion line that sits in the gutter above a drop target. */
function GutterLine({ activeKey }: { activeKey: string }) {
  const { activeDrop } = useBuilder();
  if (activeDrop !== activeKey) return null;
  return <span className="pointer-events-none absolute -top-1 left-6 right-1 h-0.5 rounded-full bg-primary" />;
}

function EndDropSlot({ groupId }: { groupId: string }) {
  const { editable, activeDrop, dropEnd } = useBuilder();
  if (!editable) return null;
  return (
    <div {...dropEnd(groupId)} className="relative h-3">
      {activeDrop === `end:${groupId}` && (
        <span className="pointer-events-none absolute left-6 right-1 top-1 h-0.5 rounded-full bg-primary" />
      )}
    </div>
  );
}

// ─── Definition / custom chip ─────────────────────────────────────────────────

function DefChip({ cond, variant }: { cond: LogicCondition; variant: "chip" | "underline" }) {
  const def = conditionDef(cond);
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number }>({ top: 0, left: 0 });
  const triggerRef = useRef<HTMLSpanElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const show = () => {
    if (timer.current) clearTimeout(timer.current);
    if (triggerRef.current) {
      const r = triggerRef.current.getBoundingClientRect();
      setPos({ top: r.bottom + 6, left: r.left });
    }
    setOpen(true);
  };
  const hide = () => { timer.current = setTimeout(() => setOpen(false), 120); };

  // Custom / translated condition — no saved definition behind it.
  if (!def) {
    const label = cond.title || "Custom condition";
    return (
      <span className={cn(
        "inline-flex items-center gap-1.5 align-middle text-sm font-medium text-foreground",
        variant === "chip" && "rounded-md border border-border bg-card px-1.5 py-0.5 shadow-xs",
      )}>
        <RiRulerLine className="size-3.5 text-muted-foreground" />
        {label}
      </span>
    );
  }

  const Icon = KIND_META[def.kind].icon;
  const trigger = variant === "chip" ? (
    <span className="inline-flex cursor-help items-center gap-1.5 rounded-md border border-border bg-card px-1.5 py-0.5 align-middle text-sm font-medium text-foreground shadow-xs">
      <Icon className="size-3.5 text-muted-foreground" />{def.name}
    </span>
  ) : (
    <span className="inline-flex cursor-help items-center gap-1 align-middle text-sm font-medium text-foreground">
      <Icon className="size-3 text-muted-foreground" />
      <span className="underline decoration-dotted decoration-muted-foreground/60 underline-offset-4">{def.name}</span>
    </span>
  );

  return (
    <span ref={triggerRef} className="relative inline-block" onMouseEnter={show} onMouseLeave={hide}>
      {trigger}
      {open && createPortal(
        <div
          className="fixed z-[9999]"
          style={{ top: pos.top, left: pos.left }}
          onMouseEnter={show}
          onMouseLeave={hide}
        >
          <DefinitionCard def={def} />
        </div>,
        document.body,
      )}
    </span>
  );
}

function LexiTag() {
  return (
    <span title="Interpreted by Lexi" className="inline-flex items-center gap-0.5 text-[10px] font-medium text-primary">
      <RiSparkling2Line className="size-3" /> Lexi
    </span>
  );
}

function ReviewNote() {
  return (
    <span className="inline-flex items-center gap-1 text-[11px] text-amber-600 dark:text-amber-400">
      <RiErrorWarningLine className="size-3" /> Couldn't read this — try rephrasing, e.g. "spent over $500".
    </span>
  );
}

// ─── Inline editable text (my-read style) ────────────────────────────────────

function EditableText({ value, startOpen, placeholder, onCommit }: {
  value: string; startOpen?: boolean; placeholder?: string; onCommit: (v: string) => void;
}) {
  const [editing, setEditing] = useState(() => startOpen ?? false);
  const [draft, setDraft] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { if (editing) inputRef.current?.focus(); }, [editing]);
  useEffect(() => { setDraft(value); }, [value]);

  const commit = () => { onCommit(draft.trim()); setEditing(false); };

  if (editing) {
    return (
      <input
        ref={inputRef}
        value={draft}
        placeholder={placeholder}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") commit();
          if (e.key === "Escape") { setDraft(value); setEditing(false); }
        }}
        className="min-w-[12rem] flex-1 rounded border border-primary/40 bg-background px-1.5 py-0.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring/40"
      />
    );
  }
  return (
    <button
      type="button"
      onClick={() => { setDraft(value); setEditing(true); }}
      className="group/edit inline-flex items-center gap-1 text-left text-sm text-foreground underline decoration-dashed decoration-primary/40 underline-offset-4 hover:decoration-primary/70"
      title="Click to adjust"
    >
      {value || <span className="italic text-muted-foreground">{placeholder ?? "add detail"}</span>}
      <RiPencilLine className="size-2.5 text-muted-foreground opacity-0 transition-opacity group-hover/edit:opacity-100" />
    </button>
  );
}

// ─── Editable field / operator dropdowns (builder) ───────────────────────────

function FieldSelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const options = value && !FIELD_OPTIONS.includes(value) ? [value, ...FIELD_OPTIONS] : FIELD_OPTIONS;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-border bg-muted px-2.5 text-sm font-medium text-foreground transition-colors hover:bg-accent">
          {value || "Choose a field"}
          <RiArrowDownSLine className="size-3.5 text-muted-foreground" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="max-h-72 w-56 overflow-y-auto">
        {options.map((f) => (
          <DropdownMenuItem key={f} onSelect={() => onChange(f)}>
            <span className="flex-1">{f}</span>
            {f === value && <RiCheckLine className="size-4 text-primary" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function OperatorSelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm">{value}<RiArrowDownSLine className="size-3.5" /></Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-52">
        {OPERATORS.map((o) => (
          <DropdownMenuItem key={o} onSelect={() => onChange(o)}>
            <span className="flex-1">{o}</span>
            {o === value && <RiCheckLine className="size-4 text-primary" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function AddConditionMenu({ onPick }: { onPick: (item: ConstructItem) => void }) {
  const groups = constructGroups();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="text-foreground-secondary">
          <RiAddLine className="size-3.5" /> Condition
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="max-h-80 w-72 overflow-y-auto">
        {groups.map((g, gi) => (
          <Fragment key={g.label}>
            {gi > 0 && <DropdownMenuSeparator />}
            <div className="px-2 py-1 text-xs font-medium text-muted-foreground">{g.label}</div>
            {g.items.map((it) => (
              <DropdownMenuItem key={it.kind + it.id} onSelect={() => onPick(it)}>
                <span className="flex-1 truncate">{it.name}</span>
                <span className="ml-2 shrink-0 text-xs capitalize text-muted-foreground">{it.sub}</span>
              </DropdownMenuItem>
            ))}
          </Fragment>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// ─── Spelled-out detail (de-duplicates field vs definition name) ──────────────

function defDetail(cond: LogicCondition): string {
  const def = conditionDef(cond);
  const r = cond.rows?.[0];
  if (!r) return def ? conditionReadout(cond).detail : "";
  const nameL = (def?.name ?? "").toLowerCase();
  const fieldL = r.field.toLowerCase();
  const dup = !!def && (nameL.includes(fieldL) || fieldL.includes(nameL));
  return (dup ? [r.operator, r.value] : [r.field, r.operator, r.value]).filter(Boolean).join(" ");
}

// ─── Builder: condition tile + group ─────────────────────────────────────────

function ConditionTile({ cond }: { cond: LogicCondition }) {
  const { editable, dropBefore, toggleNot, remove, updateRow } = useBuilder();
  const unclear = cond.interp?.kind === "unclear";
  return (
    <div
      {...(editable ? dropBefore(cond.id) : {})}
      className="group/row relative flex items-start gap-2.5 rounded-lg border border-border bg-background px-3 py-2.5"
    >
      <GutterLine activeKey={cond.id} />
      <Grip id={cond.id} />
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <DefChip cond={cond} variant="chip" />
          {cond.interp && cond.interp.kind !== "unclear" && <LexiTag />}
          <span className="flex-1" />
          {editable && (
            <Seg value={cond.isNot ? "is not" : "is"} options={ISNOT_OPTS} dangerValue="is not" onChange={(v) => toggleNot(cond.id, v === "is not")} />
          )}
          {!editable && cond.isNot && <Badge variant="secondary" size="sm" className="text-rose-600 dark:text-rose-400">is not</Badge>}
          {editable && (
            <button
              onClick={() => remove(cond.id)}
              className="text-muted-foreground opacity-0 transition-opacity hover:text-foreground group-hover/row:opacity-100"
              title="Remove"
            >
              <RiCloseLine className="size-4" />
            </button>
          )}
        </div>
        {cond.pending ? (
          <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
            <RiLoader4Line className="size-3.5 animate-spin text-primary" /> Lexi is interpreting…
          </span>
        ) : unclear ? (
          <ReviewNote />
        ) : cond.rows && cond.rows.length > 0 ? (
          <div className="flex flex-col gap-1.5">
            {cond.rows.map((r, i) => (
              editable ? (
                <div key={i} className="flex flex-wrap items-center gap-1.5">
                  <FieldSelect value={r.field} onChange={(v) => updateRow(cond.id, i, { field: v })} />
                  <OperatorSelect value={r.operator} onChange={(v) => updateRow(cond.id, i, { operator: v })} />
                  <Input value={r.value} onChange={(e) => updateRow(cond.id, i, { value: e.target.value })} placeholder="value" className="h-8 w-28" />
                </div>
              ) : (
                <p key={i} className="text-sm text-foreground-secondary">
                  <span className="font-medium text-foreground">{r.field}</span> {r.operator} {r.value}
                </p>
              )
            ))}
          </div>
        ) : (
          <span className="text-sm text-muted-foreground">
            {editable ? "Choose a field to define this condition." : "No field set."}
          </span>
        )}
      </div>
    </div>
  );
}

function GroupNode({ node, depth }: { node: LogicGroupNode; depth: number }) {
  const { editable, dropBefore, remove, addConstruct, addGroup } = useBuilder();
  const isRoot = depth === 0;
  return (
    <div
      {...(!isRoot && editable ? dropBefore(node.id) : {})}
      className={cn(
        "relative flex flex-col gap-2.5",
        !isRoot && "border-l-2 border-border pl-3",
      )}
    >
      {!isRoot && <GutterLine activeKey={node.id} />}
      <div className="flex items-center gap-2">
        {!isRoot && <Grip id={node.id} />}
        <span className="text-sm text-foreground-secondary">{isRoot ? "Match" : "Nested — match"}</span>
        <ConnectorControl node={node} />
        <span className="text-sm text-foreground-secondary">{isRoot ? "of the following" : "of these"}</span>
        {!isRoot && editable && (
          <>
            <span className="flex-1" />
            <button onClick={() => remove(node.id)} className="text-muted-foreground hover:text-foreground" title="Remove group">
              <RiCloseLine className="size-4" />
            </button>
          </>
        )}
      </div>
      {node.children.map((child) =>
        child.kind === "group"
          ? <GroupNode key={child.id} node={child} depth={depth + 1} />
          : <ConditionTile key={child.id} cond={child} />,
      )}
      <EndDropSlot groupId={node.id} />
      {editable && (
        <div className="flex items-center gap-2">
          <AddConditionMenu onPick={(item) => addConstruct(node.id, item)} />
          {isRoot && (
            <Button variant="ghost" size="sm" className="text-foreground-secondary" onClick={() => addGroup(node.id)}>
              <RiAddLine className="size-3.5" /> Group
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Plain: recursive group + condition line ─────────────────────────────────

function PlainLine({ cond }: { cond: LogicCondition }) {
  const { editable, dropBefore, remove, commitText, overrides, editDetail } = useBuilder();
  const def = conditionDef(cond);
  const hasRows = !!cond.rows && cond.rows.length > 0;
  const unclear = cond.interp?.kind === "unclear";
  const needsText = !def && !hasRows; // empty / unclear custom
  // The spelled-out rule beneath the named term: "Last order date is more than 6 months ago".
  const detail = overrides[cond.id] ?? defDetail(cond);

  return (
    <li
      {...(editable ? dropBefore(cond.id) : {})}
      className="group/row relative flex items-start gap-2 rounded-md px-1 py-1"
    >
      <GutterLine activeKey={cond.id} />
      {editable && <Grip id={cond.id} />}
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        {/* Line 1 — the named term (definition chip or custom condition) */}
        <div className="flex flex-wrap items-center gap-2">
          {cond.isNot && <span className="text-xs font-semibold uppercase tracking-wide text-rose-600 dark:text-rose-400">Not</span>}
          {cond.pending ? (
            <span className="inline-flex items-center gap-1.5 text-sm">
              <span className="text-foreground">{cond.title}</span>
              <span className="inline-flex items-center gap-1 text-muted-foreground">
                <RiLoader4Line className="size-3.5 animate-spin text-primary" /> Lexi is interpreting…
              </span>
            </span>
          ) : needsText ? (
            editable ? (
              <EditableText
                value={cond.title ?? ""}
                startOpen={!cond.title}
                placeholder="Describe a condition in plain language…"
                onCommit={(v) => commitText(cond.id, v)}
              />
            ) : (
              <span className="text-sm text-foreground">{cond.title}</span>
            )
          ) : (
            <>
              <DefChip cond={cond} variant="underline" />
              {cond.interp && <LexiTag />}
            </>
          )}
        </div>

        {/* Line 2 — the spelled-out field · operator · value, sitting beneath the term */}
        {!cond.pending && !needsText && detail && (
          <div className="pl-0.5">
            {editable ? (
              <EditableText value={detail} onCommit={(v) => editDetail(cond.id, v)} />
            ) : (
              <span className="text-sm text-foreground-secondary">{detail}</span>
            )}
          </div>
        )}

        {needsText && unclear && <ReviewNote />}
      </div>
      {editable && (
        <button
          onClick={() => remove(cond.id)}
          className="shrink-0 text-muted-foreground opacity-0 transition-opacity hover:text-foreground group-hover/row:opacity-100"
          title="Remove condition"
        >
          <RiCloseLine className="size-4" />
        </button>
      )}
    </li>
  );
}

function PlainGroup({ node, depth }: { node: LogicGroupNode; depth: number }) {
  const { editable, dropBefore, remove, addCondition, addGroup } = useBuilder();
  const isRoot = depth === 0;
  return (
    <div
      {...(!isRoot && editable ? dropBefore(node.id) : {})}
      className={cn("relative", !isRoot && "border-l-2 border-border pl-3")}
    >
      {!isRoot && <GutterLine activeKey={node.id} />}
      <div className="flex flex-wrap items-center gap-2">
        {!isRoot && <Grip id={node.id} />}
        <span className="text-sm text-foreground-secondary">{isRoot ? "Customers who match" : "Match"}</span>
        <ConnectorControl node={node} />
        <span className="text-sm text-foreground-secondary">of these:</span>
        {!isRoot && editable && (
          <button onClick={() => remove(node.id)} className="ml-auto text-muted-foreground hover:text-foreground" title="Remove group">
            <RiCloseLine className="size-4" />
          </button>
        )}
      </div>
      <ul className="mt-1.5 flex list-none flex-col gap-1.5">
        {node.children.map((child) =>
          child.kind === "group" ? (
            <li key={child.id}><PlainGroup node={child} depth={depth + 1} /></li>
          ) : (
            <PlainLine key={child.id} cond={child} />
          ),
        )}
        {node.children.length === 0 && (
          <li className="text-sm italic text-muted-foreground">No conditions yet.</li>
        )}
        <EndDropSlot groupId={node.id} />
      </ul>
      {editable && (
        <div className="mt-2 flex items-center gap-3">
          <button
            onClick={() => addCondition(node.id)}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-foreground-secondary hover:text-foreground transition-colors"
          >
            <RiAddLine className="size-3.5" /> Add condition
          </button>
          {isRoot && (
            <button
              onClick={() => addGroup(node.id)}
              className="inline-flex items-center gap-1.5 text-sm font-medium text-foreground-secondary hover:text-foreground transition-colors"
            >
              <RiAddLine className="size-3.5" /> Add group
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Public component ─────────────────────────────────────────────────────────

export function SegmentBuilder({
  tree, setTree, title = "Definition", view, defaultView = "plain", editable = false,
}: {
  tree: LogicGroupNode;
  setTree: React.Dispatch<React.SetStateAction<LogicGroupNode>>;
  title?: string;
  view?: DefView;
  defaultView?: DefView;
  editable?: boolean;
}) {
  const [ownView, setOwnView] = useState<DefView>(defaultView);
  const controlled = view !== undefined;
  const active = view ?? ownView;

  const [detailOverrides, setDetailOverrides] = useState<Record<string, string>>({});
  const [dragId, setDragId] = useState<string | null>(null);
  const [activeDrop, setActiveDrop] = useState<string | null>(null);

  const commitText = (id: string, text: string) => {
    if (!text.trim()) { setTree((t) => removeNode(t, id)); return; }
    setTree((t) => patchCondition(t, id, { title: text, defId: undefined, rows: [], custom: true, pending: true, interp: undefined }));
    window.setTimeout(() => {
      const r = interpretCondition(text);
      setTree((t) => patchCondition(t, id, {
        pending: false,
        defId: r.defId,
        custom: !r.defId,
        title: r.kind === "translated" ? r.label ?? text : text,
        rows: r.rows,
        interp: { kind: r.kind, query: r.query },
      }));
    }, 1100);
  };

  const ctx: BuilderCtx = {
    editable,
    activeDrop,
    dragHandle: (id) => ({
      draggable: true,
      onDragStart: (e) => { setDragId(id); (e as React.DragEvent).dataTransfer.effectAllowed = "move"; },
      onDragEnd: () => { setDragId(null); setActiveDrop(null); },
    }),
    dropBefore: (id) => ({
      onDragOver: (e) => { e.preventDefault(); if (dragId && dragId !== id && activeDrop !== id) setActiveDrop(id); },
      onDragLeave: () => setActiveDrop((a) => (a === id ? null : a)),
      onDrop: (e) => {
        e.preventDefault();
        if (dragId && dragId !== id) setTree((t) => moveNode(t, dragId, id));
        setDragId(null); setActiveDrop(null);
      },
    }),
    dropEnd: (groupId) => {
      const key = `end:${groupId}`;
      return {
        onDragOver: (e) => { e.preventDefault(); if (dragId && activeDrop !== key) setActiveDrop(key); },
        onDragLeave: () => setActiveDrop((a) => (a === key ? null : a)),
        onDrop: (e) => {
          e.preventDefault();
          if (dragId) setTree((t) => moveNodeToEnd(t, dragId, groupId));
          setDragId(null); setActiveDrop(null);
        },
      };
    },
    overrides: detailOverrides,
    setConnector: (id, v) => setTree((t) => patchGroupConnector(t, id, v)),
    toggleNot: (id, isNot) => setTree((t) => toggleConditionNot(t, id, isNot)),
    remove: (id) => setTree((t) => removeNode(t, id)),
    updateRow: (id, idx, patch) => setTree((t) => updateConditionRow(t, id, idx, patch)),
    addConstruct: (groupId, item) => setTree((t) => addToGroup(t, groupId, conditionFromConstruct(item))),
    addCondition: (groupId) => setTree((t) => addToGroup(t, groupId, newCustomCondition())),
    addGroup: (groupId) => setTree((t) => addToGroup(t, groupId, newGroup())),
    commitText,
    editDetail: (id, text) => setDetailOverrides((o) => ({ ...o, [id]: text })),
  };

  return (
    <Ctx value={ctx}>
      <div className="flex flex-col gap-3">
        {!controlled && (
          <div className="flex items-center justify-between gap-2">
            <h4 className="text-sm font-semibold text-foreground">{title}</h4>
            <ViewToggle value={ownView} onChange={setOwnView} />
          </div>
        )}
        {active === "builder"
          ? <GroupNode node={tree} depth={0} />
          : <PlainGroup node={tree} depth={0} />}
      </div>
    </Ctx>
  );
}

export type { LogicNode };
