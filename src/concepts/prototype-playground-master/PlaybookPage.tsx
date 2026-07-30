/**
 * Segment - V1 — Playbook
 *
 * The curated knowledge layer that governs how Lexi interprets a request.
 * Organised by the *kind* of knowledge — Glossary, Rules, Calendar, Documents —
 * not by team access. Each tab has a list/view plus a right-side detail drawer.
 */
import { useMemo, useRef, useState, useEffect, type MouseEvent } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { FilterBar } from "@/components/ui/FilterBar";
import {
  RiSearchLine, RiCloseLine, RiBookOpenLine, RiScales3Line, RiCalendarEventLine,
  RiFileTextLine, RiArrowLeftSLine, RiArrowRightSLine, RiUploadCloud2Line,
  RiFilePdf2Line, RiFileWord2Line, RiFileExcel2Line, RiFilePpt2Line, RiTimeLine,
  RiUserLine,
} from "@remixicon/react";
import type { RemixiconComponentType } from "@remixicon/react";
import {
  GLOSSARY, RULES, CALENDAR_EVENTS, DOCUMENTS,
  getGlossaryTerm, getRule,
  type GlossaryTerm, type PlaybookRule, type CalendarEvent, type PlaybookDoc,
  type DocFileType, type EventCategory,
} from "./playbook-data";
import { useSession } from "./store";

type PlaybookTab = "glossary" | "rules" | "calendar" | "documents";

type Selection =
  | { kind: "glossary"; id: string }
  | { kind: "rule"; id: string }
  | { kind: "event"; id: string }
  | { kind: "doc"; id: string };

type CalendarVisibility = "Me Only" | "Team" | "Organisation" | "Enterprise";
type CalendarCategoryFilter = "All" | EventCategory | "Activations";

type CalendarEntry = CalendarEvent & {
  startTime?: string;
  endTime?: string;
  location?: string;
  owner?: string;
  attendees?: string;
  visibility?: CalendarVisibility;
};

const TAB_META: { value: PlaybookTab; label: string; icon: RemixiconComponentType }[] = [
  { value: "glossary", label: "Custom Definitions", icon: RiBookOpenLine },
  { value: "rules", label: "Rules", icon: RiScales3Line },
  { value: "calendar", label: "Calendar", icon: RiCalendarEventLine },
  { value: "documents", label: "Documents", icon: RiFileTextLine },
];

const DOC_ICON: Record<DocFileType, RemixiconComponentType> = {
  PDF: RiFilePdf2Line, DOCX: RiFileWord2Line, XLSX: RiFileExcel2Line,
  PPTX: RiFilePpt2Line, Figma: RiFileTextLine,
};

const EVENT_DOT: Record<EventCategory, string> = {
  Sale: "bg-rose-500", Campaign: "bg-primary", Seasonal: "bg-emerald-500", Trade: "bg-amber-500",
};

// ─── Date helpers ──────────────────────────────────────────────────────────

const MONTHS = ["January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"];
const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function isoToDate(iso: string): Date { return new Date(iso + "T00:00:00"); }
function fmtDay(iso: string): string {
  return isoToDate(iso).toLocaleDateString("en-AU", { day: "numeric", month: "short" });
}
function fmtFull(iso: string): string {
  return isoToDate(iso).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" });
}
function fmtRange(start: string, end: string): string {
  return start === end ? fmtFull(start) : `${fmtDay(start)} – ${fmtFull(end)}`;
}
/** Days (yyyy-mm-dd) covered by an event, inclusive — used for hit-testing. */
function dayInEvent(day: Date, ev: CalendarEvent): boolean {
  const t = day.getTime();
  return t >= isoToDate(ev.start).getTime() && t <= isoToDate(ev.end).getTime();
}

function dateToIso(day: Date): string {
  const y = day.getFullYear();
  const m = String(day.getMonth() + 1).padStart(2, "0");
  const d = String(day.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function addDays(day: Date, count: number): Date {
  const next = new Date(day);
  next.setDate(next.getDate() + count);
  return next;
}

function buildActivationCalendarDummies(baseDate: Date): CalendarEntry[] {
  const today = new Date(baseDate.getFullYear(), baseDate.getMonth(), baseDate.getDate());
  const planned = [
    { id: "ev-act-1", title: "Email win-back blast", start: addDays(today, -10), end: addDays(today, -10) },
    { id: "ev-act-2", title: "Meta lapsed audience refresh", start: addDays(today, -4), end: addDays(today, 2) },
    { id: "ev-act-3", title: "SMS weekend reminder", start: addDays(today, 3), end: addDays(today, 3) },
    { id: "ev-act-4", title: "Lifecycle nurture series", start: addDays(today, 6), end: addDays(today, 14) },
  ];

  return planned.map((item) => {
    const start = dateToIso(item.start);
    const end = dateToIso(item.end);
    const isPast = item.end.getTime() < today.getTime();
    const prefix = isPast ? "Activation Sent" : "Activations Scheduled";
    const recurring = start !== end;
    return {
      id: item.id,
      name: `${prefix}: ${item.title}`,
      start,
      end,
      category: "Campaign" as EventCategory,
      description: recurring
        ? `${prefix} recurring across ${fmtRange(start, end)}.`
        : `${prefix} on ${fmtFull(start)}.`,
      startTime: "09:00",
      endTime: "09:15",
      owner: "Lifecycle team",
      attendees: "CRM, Growth",
      visibility: "Team",
    };
  });
}

// ─── Page ────────────────────────────────────────────────────────────────────

export function PlaybookPage({ initialTab = "glossary" }: { initialTab?: PlaybookTab }) {
  const { state } = useSession();
  const [tab, setTab] = useState<PlaybookTab>(initialTab);
  const pageTitle = tab === "glossary" ? "Custom Definitions" : tab === "rules" ? "Rules" : "Playbook";
  const visibleTabs = initialTab === "rules"
    ? TAB_META.filter((section) => section.value === "rules")
    : initialTab === "glossary"
      ? TAB_META.filter((section) => section.value === "glossary")
      : TAB_META;
  const showSectionNav = visibleTabs.length > 1;
  const [selected, setSelected] = useState<Selection | null>(null);
  // Documents are lifted here so uploads are visible to both the grid and the drawer.
  const [docs, setDocs] = useState<PlaybookDoc[]>(DOCUMENTS);
  const activationDummies = useMemo(() => buildActivationCalendarDummies(new Date()), []);
  const [calendarEvents, setCalendarEvents] = useState<CalendarEntry[]>(() => [
    ...activationDummies,
    {
      id: "ev-july-1-demo",
      name: "July launch alignment",
      start: "2026-07-01",
      end: "2026-07-01",
      category: "Campaign",
      description: "Demo entry for July 1. Review campaign brief, audience, and channel handoff.",
      startTime: "10:00",
      endTime: "11:00",
      location: "Google Meet",
      owner: "Amy Vong",
      attendees: "Growth, CRM, Merchandising",
      visibility: "Team",
    },
    ...CALENDAR_EVENTS,
  ]);

  const handleSaveCalendarEvent = (event: CalendarEntry) => {
    setCalendarEvents((prev) => {
      const idx = prev.findIndex((e) => e.id === event.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = event;
        return next;
      }
      return [event, ...prev];
    });
    setSelected({ kind: "event", id: event.id });
  };

  const activationWorkflowEvents = useMemo<CalendarEntry[]>(() => {
    const todayIso = dateToIso(new Date());
    return state.activations
      .filter((activation) => activation.status === "scheduled" || activation.status === "sent")
      .map((activation) => {
        const start = activation.recurringStartDate ?? activation.scheduledDate ?? (activation.status === "sent" ? todayIso : undefined);
        if (!start) return null;
        const end = activation.recurringEndDate ?? start;
        const recurring = start !== end;
        const sent = activation.status === "sent";
        return {
          id: `ev-activation-${activation.id}`,
          name: `${sent ? "Activation Sent" : "Activations Scheduled"}: ${activation.name}`,
          start,
          end,
          category: "Campaign",
          description: sent
            ? `Activation sent on ${fmtFull(start)}.`
            : recurring
              ? `Activation scheduled as a recurring send across ${fmtRange(start, end)}.`
              : `Activation scheduled for ${fmtFull(start)}.`,
          startTime: recurring ? undefined : "09:00",
          endTime: recurring ? undefined : "09:15",
          owner: "Activation workflow",
          attendees: "Marketing team",
          visibility: "Team",
        } satisfies CalendarEntry;
      })
      .filter((event): event is CalendarEntry => event !== null);
  }, [state.activations]);

  const mergedCalendarEvents = useMemo(() => {
    const byId = new Map<string, CalendarEntry>();
    [...activationWorkflowEvents, ...calendarEvents].forEach((event) => {
      byId.set(event.id, event);
    });
    return Array.from(byId.values());
  }, [activationWorkflowEvents, calendarEvents]);

  useEffect(() => {
    setTab(initialTab);
  }, [initialTab]);

  return (
    <div className="flex h-full flex-col">
      <div className="flex flex-col gap-1 px-6 pt-6">
        <div className="flex flex-col gap-1">
          <h1 className="text-xl font-semibold text-foreground">{pageTitle}</h1>
          <p className="max-w-2xl text-sm text-foreground-secondary">
            The shared vocabulary, rules, key dates and documents that govern how Lexi interprets a request before it builds anything.
          </p>
        </div>
      </div>

      <div className="flex min-h-0 flex-1">
        {showSectionNav ? (
          <div className="flex w-56 shrink-0 flex-col pl-6">
            <nav className="flex flex-1 flex-col gap-0.5 overflow-y-auto px-2 pb-2 pt-5">
              <span className="px-2 pb-1 text-xs font-medium text-foreground-secondary">Section</span>
              {visibleTabs.map((section) => (
                <button
                  key={section.value}
                  onClick={() => setTab(section.value)}
                  className={cn(
                    "flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm transition-colors",
                    tab === section.value
                      ? "bg-accent font-medium text-foreground"
                      : "text-foreground-secondary hover:bg-accent/50 hover:text-foreground",
                  )}
                >
                  <section.icon className="size-3.5 shrink-0" />
                  <span className="flex-1 truncate">{section.label}</span>
                </button>
              ))}
            </nav>
          </div>
        ) : null}

        <div className="flex min-h-0 min-w-0 flex-1 flex-col">
          {tab === "glossary" && <GlossaryView onOpen={(id) => setSelected({ kind: "glossary", id })} />}
          {tab === "rules" && <RulesView onOpen={(id) => setSelected({ kind: "rule", id })} />}
          {tab === "calendar" && (
            <CalendarView
              events={mergedCalendarEvents}
              onOpen={(id) => setSelected({ kind: "event", id })}
              onSaveEvent={handleSaveCalendarEvent}
            />
          )}
          {tab === "documents" && (
            <DocumentsView docs={docs} onUpload={(d) => setDocs((prev) => [d, ...prev])} onOpen={(id) => setSelected({ kind: "doc", id })} />
          )}
        </div>
      </div>

      {selected && (
        <PlaybookDrawer
          selection={selected}
          docs={docs}
          calendarEvents={mergedCalendarEvents}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  );
}

// ─── Glossary ─────────────────────────────────────────────────────────────────

function GlossaryView({ onOpen }: { onOpen: (id: string) => void }) {
  type ManagedGlossaryTerm = GlossaryTerm & {
    whyThisDefinition?: string;
    generatedFromLexi?: boolean;
  };

  type LexiDefinitionInterpretation = {
    term: string;
    definition: string;
    category: GlossaryTerm["category"];
  };

  const [query, setQuery] = useState("");
  const [definitionPrompt, setDefinitionPrompt] = useState("");
  const [terms, setTerms] = useState<ManagedGlossaryTerm[]>(GLOSSARY);
  const [lexiInterpretation, setLexiInterpretation] = useState<LexiDefinitionInterpretation | null>(null);
  const [definitionSaved, setDefinitionSaved] = useState(false);
  const [activeTermId, setActiveTermId] = useState<string | null>(null);
  const [isNewDefinitionCollapsed, setIsNewDefinitionCollapsed] = useState(false);

  const q = query.trim().toLowerCase();
  const shown = terms.filter((t) =>
    q === "" || t.term.toLowerCase().includes(q) || t.definition.toLowerCase().includes(q) ||
    (t.aka ?? []).some((a) => a.toLowerCase().includes(q)));

  const activeTerm = activeTermId ? terms.find((t) => t.id === activeTermId) ?? null : null;

  const inferCategory = (input: string): GlossaryTerm["category"] => {
    const text = input.toLowerCase();
    if (text.includes("vip") || text.includes("spend") || text.includes("tier")) return "Value";
    if (text.includes("click") || text.includes("open") || text.includes("engage")) return "Engagement";
    if (text.includes("campaign") || text.includes("trade") || text.includes("promo")) return "Trade";
    return "Lifecycle";
  };

  const inferTermName = (input: string) => {
    const text = input.toLowerCase();
    if (text.includes("vip")) return "VIP customer";
    if (text.includes("lapsed")) return "Lapsed customer";
    if (text.includes("new customer")) return "New customer";
    if (text.includes("returning")) return "Returning customer";
    return "New custom definition";
  };

  const generateInterpretation = () => {
    const input = definitionPrompt.trim();
    if (!input) return;
    setDefinitionSaved(false);

    const term = inferTermName(input);
    const category = inferCategory(input);

    setLexiInterpretation({
      term,
      category,
      definition: `Definition for ${term.toLowerCase()} based on governed business language and existing customer behavior signals.`,
    });
  };

  const saveDefinitionDraft = () => {
    if (!lexiInterpretation) return;
    const id = `gl-user-${Date.now()}`;
    const today = new Date().toISOString().slice(0, 10);
    const created: ManagedGlossaryTerm = {
      id,
      term: lexiInterpretation.term.trim() || "New custom definition",
      definition: lexiInterpretation.definition,
      category: lexiInterpretation.category,
      updatedAt: today,
      generatedFromLexi: true,
    };
    setTerms((prev) => [created, ...prev]);
    setActiveTermId(id);
    setDefinitionSaved(true);
  };

  return (
    <div className="flex min-w-0 flex-1 gap-4 overflow-y-auto px-6 py-4">
      {isNewDefinitionCollapsed ? (
        <aside className="w-11 shrink-0 rounded-xl border border-border bg-card p-1.5">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsNewDefinitionCollapsed(false)}
            aria-label="Expand new definition frame"
            className="size-8"
          >
            <RiArrowRightSLine className="size-4" />
          </Button>
        </aside>
      ) : (
        <aside className="w-80 shrink-0 rounded-xl border border-border bg-card p-4">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-sm font-semibold text-foreground">New Definition</p>
              <p className="mt-1 text-xs text-foreground-secondary">
                Describe the business term in plain language. Lexi will generate a governed definition for review.
              </p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsNewDefinitionCollapsed(true)}
              aria-label="Collapse new definition frame"
              className="size-8"
            >
              <RiArrowLeftSLine className="size-4" />
            </Button>
          </div>

          <div className="mt-3 space-y-2">
            <p className="text-[11px] font-semibold text-muted-foreground">Definition request</p>
            <Textarea
              value={definitionPrompt}
              onChange={(e) => setDefinitionPrompt(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  generateInterpretation();
                }
              }}
              placeholder="Example: Define VIP customer for lifecycle campaigns using spend and purchase recency."
              className="min-h-28"
            />
          </div>

          <div className="mt-3 flex items-center justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => { setDefinitionPrompt(""); setLexiInterpretation(null); setDefinitionSaved(false); }}>
              Clear
            </Button>
            <Button size="sm" onClick={generateInterpretation} disabled={definitionPrompt.trim() === ""}>
              Ask Lexi
            </Button>
          </div>

          {lexiInterpretation ? (
            <div className="mt-3 rounded-lg border border-border bg-background p-3">
              <p className="text-[11px] font-semibold text-muted-foreground">Lexi interpretation</p>

              <div className="mt-2 space-y-2">
                <div>
                  <p className="text-[11px] font-semibold text-muted-foreground">Term</p>
                  <Input
                    value={lexiInterpretation.term}
                    onChange={(e) => {
                      const term = e.target.value;
                      setLexiInterpretation((prev) => (prev ? { ...prev, term } : prev));
                      setDefinitionSaved(false);
                    }}
                    className="mt-1 h-8"
                  />
                </div>

                <div>
                  <p className="text-[11px] font-semibold text-muted-foreground">Description</p>
                  <p className="mt-1 text-sm leading-relaxed text-foreground-secondary">{lexiInterpretation.definition}</p>
                </div>

                <div>
                  <p className="text-[11px] font-semibold text-muted-foreground">Category</p>
                  <select
                    value={lexiInterpretation.category}
                    onChange={(e) => {
                      const category = e.target.value as GlossaryTerm["category"];
                      setLexiInterpretation((prev) => (prev ? { ...prev, category } : prev));
                      setDefinitionSaved(false);
                    }}
                    className="mt-1 h-8 w-full rounded-lg border border-input-border bg-input px-2 text-sm text-foreground"
                  >
                    <option value="Lifecycle">Lifecycle</option>
                    <option value="Value">Value</option>
                    <option value="Engagement">Engagement</option>
                    <option value="Trade">Trade</option>
                  </select>
                </div>
              </div>

              <div className="mt-3 flex items-center justify-end gap-2 border-t border-border pt-2">
                <Button size="sm" onClick={saveDefinitionDraft} disabled={definitionSaved}>
                  {definitionSaved ? "Saved" : "Save definition"}
                </Button>
              </div>
            </div>
          ) : null}
        </aside>
      )}

      <div className="min-w-0 flex-1 flex-col gap-3">
        <FilterBar>
          <div className="relative">
            <RiSearchLine className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search terms" className="h-9 w-64 pl-8" />
          </div>
        </FilterBar>

        <div className="flex flex-col divide-y divide-border overflow-hidden rounded-xl border border-border">
          {shown.map((t) => (
            <button
              key={t.id}
              onClick={() => {
                if (t.generatedFromLexi) {
                  setActiveTermId(t.id);
                  return;
                }
                onOpen(t.id);
              }}
              className="flex items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-accent/50"
            >
              <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <RiBookOpenLine className="size-4" />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-foreground">{t.term}</span>
                  <Badge variant="secondary" size="sm">{t.category}</Badge>
                </div>
                <p className="mt-0.5 line-clamp-2 text-sm text-foreground-secondary">{t.definition}</p>
              </div>
            </button>
          ))}
          {shown.length === 0 && (
            <p className="px-4 py-10 text-center text-sm text-muted-foreground">No terms match your search.</p>
          )}
        </div>
        <p className="text-sm text-muted-foreground">Displaying {shown.length} of {terms.length} terms</p>
      </div>

      <div
        className={cn(
          "flex shrink-0 overflow-hidden border-l border-border/60 bg-background transition-[width,opacity] duration-300 ease-out",
          activeTerm ? "w-[360px] opacity-100" : "w-0 opacity-0",
        )}
      >
        {activeTerm ? (
          <div className="flex h-full w-full flex-col">
            <div className="flex items-start justify-between gap-3 border-b border-border/60 px-4 py-3">
              <div className="min-w-0">
                <p className="text-xs font-medium text-foreground-secondary">Definition details</p>
                <h2 className="truncate text-sm font-semibold text-foreground">{activeTerm.term}</h2>
              </div>
              <Button size="sm" variant="outline" onClick={() => setActiveTermId(null)}>Close</Button>
            </div>

            <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4">
              <div className="rounded-lg border border-border bg-card p-3">
                <p className="text-xs font-medium text-foreground-secondary">Description</p>
                <p className="mt-1 text-sm text-foreground-secondary">{activeTerm.definition}</p>
              </div>

              {activeTerm.whyThisDefinition ? (
                <div className="rounded-lg border border-border bg-card p-3">
                  <p className="text-xs font-medium text-foreground-secondary">Why this definition</p>
                  <p className="mt-1 text-sm text-foreground-secondary">{activeTerm.whyThisDefinition}</p>
                </div>
              ) : null}

              <div className="rounded-lg border border-border bg-card p-3">
                <p className="text-xs font-medium text-foreground-secondary">Metadata</p>
                <p className="mt-1 text-sm text-foreground"><span className="font-medium">Category:</span> {activeTerm.category}</p>
                <p className="mt-1 text-sm text-foreground"><span className="font-medium">Updated:</span> {fmtFull(activeTerm.updatedAt)}</p>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

// ─── Rules ─────────────────────────────────────────────────────────────────────

function RulesView({ onOpen }: { onOpen: (id: string) => void }) {
  type ManagedRule = PlaybookRule & {
    logicPreview?: string;
    fieldsUsed?: string[];
    generatedFromLexi?: boolean;
  };

  type LexiInterpretation = {
    name: string;
    description: string;
    logicPreview: string;
    fieldsUsed: string[];
    whyThisRule: string;
  };

  const [query, setQuery] = useState("");
  const [rulePrompt, setRulePrompt] = useState("");
  const [lexiInterpretation, setLexiInterpretation] = useState<LexiInterpretation | null>(null);
  const [ruleSaved, setRuleSaved] = useState(false);
  const [rules, setRules] = useState<ManagedRule[]>(RULES);
  const [activeRuleId, setActiveRuleId] = useState<string | null>(null);
  const [isNewRuleCollapsed, setIsNewRuleCollapsed] = useState(false);
  const q = query.trim().toLowerCase();
  const shown = rules.filter((r) =>
    q === "" || r.name.toLowerCase().includes(q) || r.statement.toLowerCase().includes(q));

  const activeRule = activeRuleId ? rules.find((rule) => rule.id === activeRuleId) ?? null : null;

  const inferRuleName = (input: string) => {
    const text = input.toLowerCase();
    if (text.includes("vip")) return "VIP customer";
    if (text.includes("exclude") || text.includes("suppress")) return "Exclusion rule";
    if (text.includes("email") && text.includes("week")) return "Email frequency cap";
    if (text.includes("churn") || text.includes("lapsed")) return "Churn classification rule";
    if (text.includes("spend") || text.match(/\$\s*[0-9]/)) return "Spend threshold rule";
    return "New customer rule";
  };

  const generateInterpretation = () => {
    const input = rulePrompt.trim();
    if (!input) return;
    setRuleSaved(false);

    const amountMatch = input.match(/\$\s*([0-9][0-9,\.]*)|([0-9][0-9,\.]*)\s*dollars?/i);
    const threshold = amountMatch
      ? `$${(amountMatch[1] ?? amountMatch[2] ?? "500").replace(/,/g, "")}`
      : "$500";
    const windowLabel = "last 12 months";
    const inferredName = inferRuleName(input);

    setLexiInterpretation({
      name: inferredName,
      description: `A customer who has spent more than ${threshold} in the ${windowLabel}, based on purchase history.`,
      logicPreview: `Total Spend (L12M) > ${threshold}`,
      fieldsUsed: [
        "Calculated metric: Total Spend (L12M)",
        "Source definition: Customer ID",
        "Core dataset: Purchase history (Orders)",
      ],
      whyThisRule: "",
    });
  };

  const saveRuleDraft = () => {
    if (!lexiInterpretation) return;
    const id = `rl-user-${Date.now()}`;
    const today = new Date().toISOString().slice(0, 10);
    const createdRule: ManagedRule = {
      id,
      name: lexiInterpretation.name.trim() || "New customer rule",
      statement: lexiInterpretation.description,
      rationale: lexiInterpretation.whyThisRule.trim() || undefined,
      source: "Lexi interpretation",
      updatedAt: today,
      logicPreview: lexiInterpretation.logicPreview,
      fieldsUsed: lexiInterpretation.fieldsUsed,
      generatedFromLexi: true,
    };
    setRules((prev) => [createdRule, ...prev]);
    setActiveRuleId(id);
    setRuleSaved(true);
  };

  return (
    <div className="flex min-w-0 flex-1 gap-4 overflow-y-auto px-6 py-4">
      {isNewRuleCollapsed ? (
        <aside className="w-11 shrink-0 rounded-xl border border-border bg-card p-1.5">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsNewRuleCollapsed(false)}
            aria-label="Expand new rule frame"
            className="size-8"
          >
            <RiArrowRightSLine className="size-4" />
          </Button>
        </aside>
      ) : (
        <aside className="w-80 shrink-0 rounded-xl border border-border bg-card p-4">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-sm font-semibold text-foreground">New Rule</p>
              <p className="mt-1 text-xs text-foreground-secondary">
                Describe your rule in plain language. Lexi will generate an interpretation for review before saving.
              </p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsNewRuleCollapsed(true)}
              aria-label="Collapse new rule frame"
              className="size-8"
            >
              <RiArrowLeftSLine className="size-4" />
            </Button>
          </div>

          <div className="mt-3 space-y-2">
            <p className="text-[11px] font-semibold text-muted-foreground">Rule request</p>
            <Textarea
              value={rulePrompt}
              onChange={(e) => setRulePrompt(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  generateInterpretation();
                }
              }}
              placeholder="Example: Exclude customers with unresolved chargebacks from paid activation audiences for 30 days."
              className="min-h-28"
            />
          </div>

          <div className="mt-3 flex items-center justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => { setRulePrompt(""); setLexiInterpretation(null); setRuleSaved(false); }}>
              Clear
            </Button>
            <Button size="sm" onClick={generateInterpretation} disabled={rulePrompt.trim() === ""}>
              Ask Lexi
            </Button>
          </div>

          {lexiInterpretation ? (
            <div className="mt-3 rounded-lg border border-border bg-background p-3">
              <p className="text-[11px] font-semibold text-muted-foreground">Lexi interpretation</p>

              <div className="mt-2 space-y-2">
                <div>
                  <p className="text-[11px] font-semibold text-muted-foreground">Name</p>
                  <Input
                    value={lexiInterpretation.name}
                    onChange={(e) => {
                      const name = e.target.value;
                      setLexiInterpretation((prev) => (prev ? { ...prev, name } : prev));
                      setRuleSaved(false);
                    }}
                    className="mt-1 h-8"
                  />
                </div>

                <div>
                  <p className="text-[11px] font-semibold text-muted-foreground">Description</p>
                  <p className="mt-1 text-sm leading-relaxed text-foreground-secondary">{lexiInterpretation.description}</p>
                </div>

                <div>
                  <p className="text-[11px] font-semibold text-muted-foreground">Why this rule</p>
                  <Input
                    value={lexiInterpretation.whyThisRule}
                    onChange={(e) => {
                      const whyThisRule = e.target.value;
                      setLexiInterpretation((prev) => (prev ? { ...prev, whyThisRule } : prev));
                      setRuleSaved(false);
                    }}
                    placeholder="Explain why this rule should exist"
                    className="mt-1 h-8"
                  />
                </div>

                <div>
                  <p className="text-[11px] font-semibold text-muted-foreground">Logic preview</p>
                  <p className="mt-1 rounded-md bg-muted px-2 py-1.5 font-mono text-xs text-foreground-secondary">{lexiInterpretation.logicPreview}</p>
                </div>

                <div>
                  <p className="text-[11px] font-semibold text-muted-foreground">Field(s) used</p>
                  <ul className="mt-1 space-y-1">
                    {lexiInterpretation.fieldsUsed.map((field) => (
                      <li key={field} className="text-sm text-foreground-secondary">• {field}</li>
                    ))}
                  </ul>
                </div>

              </div>

              <div className="mt-3 flex items-center justify-end gap-2 border-t border-border pt-2">
                <Button size="sm" onClick={saveRuleDraft} disabled={ruleSaved}>
                  {ruleSaved ? "Saved" : "Save rule"}
                </Button>
              </div>
            </div>
          ) : null}
        </aside>
      )}

      <div className="min-w-0 flex-1 flex-col gap-3">
        <FilterBar>
          <div className="relative">
            <RiSearchLine className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search rules" className="h-9 w-64 pl-8" />
          </div>
        </FilterBar>

        <div className="mt-3 flex flex-col gap-2">
          {shown.map((r) => (
            <button
              key={r.id}
              onClick={() => {
                if ((r as ManagedRule).generatedFromLexi) {
                  setActiveRuleId(r.id);
                  return;
                }
                onOpen(r.id);
              }}
              className="flex flex-col gap-1.5 rounded-xl border border-border bg-card p-4 text-left transition-colors hover:border-primary/40 hover:shadow-sm"
            >
              <div className="flex items-center gap-2">
                <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <RiScales3Line className="size-4" />
                </span>
                <span className="text-sm font-semibold text-foreground">{r.name}</span>
              </div>
              <p className="text-sm leading-relaxed text-foreground-secondary">{r.statement}</p>
              {r.source && <p className="text-xs text-muted-foreground">{r.source}</p>}
            </button>
          ))}
          {shown.length === 0 && (
            <p className="rounded-xl border border-dashed border-border bg-muted/20 px-4 py-10 text-center text-sm text-muted-foreground">
              No rules match your search.
            </p>
          )}
        </div>
        <p className="mt-3 text-sm text-muted-foreground">Displaying {shown.length} of {rules.length} rules</p>
      </div>

      <div
        className={cn(
          "flex shrink-0 overflow-hidden border-l border-border/60 bg-background transition-[width,opacity] duration-300 ease-out",
          activeRule ? "w-[360px] opacity-100" : "w-0 opacity-0",
        )}
      >
        {activeRule ? (
          <div className="flex h-full w-full flex-col">
            <div className="flex items-start justify-between gap-3 border-b border-border/60 px-4 py-3">
              <div className="min-w-0">
                <p className="text-xs font-medium text-foreground-secondary">Rule details</p>
                <h2 className="truncate text-sm font-semibold text-foreground">{activeRule.name}</h2>
              </div>
              <Button size="sm" variant="outline" onClick={() => setActiveRuleId(null)}>Close</Button>
            </div>

            <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4">
              <div className="rounded-lg border border-border bg-card p-3">
                <p className="text-xs font-medium text-foreground-secondary">Description</p>
                <p className="mt-1 text-sm text-foreground-secondary">{activeRule.statement}</p>
              </div>

              {activeRule.logicPreview ? (
                <div className="rounded-lg border border-border bg-card p-3">
                  <p className="text-xs font-medium text-foreground-secondary">Logic preview</p>
                  <p className="mt-1 rounded-md bg-muted px-2 py-1.5 font-mono text-xs text-foreground-secondary">{activeRule.logicPreview}</p>
                </div>
              ) : null}

              {activeRule.fieldsUsed && activeRule.fieldsUsed.length > 0 ? (
                <div className="rounded-lg border border-border bg-card p-3">
                  <p className="text-xs font-medium text-foreground-secondary">Fields used</p>
                  <ul className="mt-2 space-y-1.5">
                    {activeRule.fieldsUsed.map((field) => (
                      <li key={field} className="text-sm text-foreground-secondary">• {field}</li>
                    ))}
                  </ul>
                </div>
              ) : null}

              {activeRule.rationale ? (
                <div className="rounded-lg border border-border bg-card p-3">
                  <p className="text-xs font-medium text-foreground-secondary">Why this rule</p>
                  <p className="mt-1 text-sm text-foreground-secondary">{activeRule.rationale}</p>
                </div>
              ) : null}

              <div className="rounded-lg border border-border bg-card p-3">
                <p className="text-xs font-medium text-foreground-secondary">Metadata</p>
                <p className="mt-1 text-sm text-foreground"><span className="font-medium">Source:</span> {activeRule.source ?? "-"}</p>
                <p className="mt-1 text-sm text-foreground"><span className="font-medium">Updated:</span> {fmtFull(activeRule.updatedAt)}</p>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

// ─── Calendar ──────────────────────────────────────────────────────────────────

function CalendarView({
  events,
  onOpen,
  onSaveEvent,
}: {
  events: CalendarEntry[];
  onOpen: (id: string) => void;
  onSaveEvent: (event: CalendarEntry) => void;
}) {
  const today = useMemo(() => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; }, []);
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [categoryFilter, setCategoryFilter] = useState<CalendarCategoryFilter>("All");
  const [dayMenu, setDayMenu] = useState<{ open: boolean; date: string; x: number; y: number }>({
    open: false,
    date: "",
    x: 0,
    y: 0,
  });
  const [editor, setEditor] = useState<{
    open: boolean;
    id: string;
    subject: string;
    isRange: boolean;
    start: string;
    end: string;
    startTime: string;
    endTime: string;
    category: EventCategory;
    visibility: CalendarVisibility;
    location: string;
    owner: string;
    attendees: string;
    description: string;
  }>({
    open: false,
    id: "",
    subject: "",
    isRange: false,
    start: "",
    end: "",
    startTime: "09:00",
    endTime: "10:00",
    category: "Campaign",
    visibility: "Team",
    location: "",
    owner: "",
    attendees: "",
    description: "",
  });

  // Build the grid: Monday-first, with leading blanks.
  const first = new Date(year, month, 1);
  const startOffset = (first.getDay() + 6) % 7; // 0 = Monday
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (Date | null)[] = [];
  for (let i = 0; i < startOffset; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d));
  while (cells.length % 7 !== 0) cells.push(null);

  const prevMonth = () => { if (month === 0) { setMonth(11); setYear((y) => y - 1); } else setMonth((m) => m - 1); };
  const nextMonth = () => { if (month === 11) { setMonth(0); setYear((y) => y + 1); } else setMonth((m) => m + 1); };
  const goToday = () => { setYear(today.getFullYear()); setMonth(today.getMonth()); };

  const visibleEvents = useMemo(() => (
    categoryFilter === "All"
      ? events
      : categoryFilter === "Activations"
        ? events.filter((event) => (
          event.id.startsWith("ev-activation-")
          || event.id.startsWith("ev-act-")
          || event.name.startsWith("Activation Sent:")
          || event.name.startsWith("Activations Scheduled:")
        ))
        : events.filter((event) => event.category === categoryFilter)
  ), [events, categoryFilter]);

  const upcoming = visibleEvents
    .filter((e) => isoToDate(e.end).getTime() >= today.getTime())
    .sort((a, b) => isoToDate(a.start).getTime() - isoToDate(b.start).getTime());

  const openCreateForDay = (iso: string) => {
    const isJulyDemo = iso === "2026-07-01";
    setEditor({
      open: true,
      id: `ev-custom-${Date.now()}`,
      subject: isJulyDemo ? "July 1 planning sync" : "",
      isRange: false,
      start: iso,
      end: iso,
      startTime: isJulyDemo ? "10:00" : "09:00",
      endTime: isJulyDemo ? "11:00" : "10:00",
      category: "Campaign",
      visibility: "Team",
      location: isJulyDemo ? "Google Meet" : "",
      owner: isJulyDemo ? "Amy Vong" : "",
      attendees: isJulyDemo ? "Growth, CRM, Merchandising" : "",
      description: isJulyDemo ? "Demo details for July 1 launch planning." : "",
    });
  };

  const saveEditor = () => {
    if (!editor.subject.trim()) return;
    onSaveEvent({
      id: editor.id,
      name: editor.subject.trim(),
      start: editor.start,
      end: editor.isRange ? editor.end : editor.start,
      category: editor.category,
      visibility: editor.visibility,
      description: editor.description.trim() || "No description provided.",
      startTime: editor.startTime,
      endTime: editor.endTime,
      location: editor.location.trim(),
      owner: editor.owner.trim(),
      attendees: editor.attendees.trim(),
    });
    setDayMenu({ open: false, date: "", x: 0, y: 0 });
    setEditor((prev) => ({ ...prev, open: false }));
  };

  const openDayMenuAtRect = (day: Date, rect: DOMRect) => {
    setDayMenu({
      open: true,
      date: dateToIso(day),
      x: rect.left + rect.width / 2,
      y: rect.bottom + 6,
    });
  };

  const openDayMenu = (e: MouseEvent<HTMLElement>, day: Date) => {
    const r = e.currentTarget.getBoundingClientRect();
    openDayMenuAtRect(day, r);
  };

  return (
    <div className="flex min-h-0 flex-1 gap-6 overflow-y-auto px-6 py-4">
      {/* Calendar grid */}
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="mb-3 flex items-center gap-2">
          <h2 className="text-base font-semibold text-foreground">{MONTHS[month]} {year}</h2>
          <label className="ml-3 flex items-center gap-2 text-xs text-muted-foreground">
            Category
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value as CalendarCategoryFilter)}
              className="h-8 rounded-lg border border-input bg-background px-2.5 text-xs font-medium text-foreground"
            >
              <option value="All">All categories</option>
              <option value="Activations">Activations</option>
              <option value="Campaign">Campaign</option>
              <option value="Sale">Sale</option>
              <option value="Seasonal">Seasonal</option>
              <option value="Trade">Trade</option>
            </select>
          </label>
          <div className="ml-auto flex items-center gap-1">
            <Button size="xs" variant="ghost" onClick={goToday}>Today</Button>
            <button onClick={prevMonth} className="flex size-7 items-center justify-center rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground transition-colors" title="Previous month">
              <RiArrowLeftSLine className="size-4" />
            </button>
            <button onClick={nextMonth} className="flex size-7 items-center justify-center rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground transition-colors" title="Next month">
              <RiArrowRightSLine className="size-4" />
            </button>
          </div>
        </div>

        <div className="overflow-hidden rounded-xl border border-border">
          <div className="grid grid-cols-7 border-b border-border bg-muted/30">
            {WEEKDAYS.map((d) => (
              <div key={d} className="px-2 py-1.5 text-center text-xs font-medium text-muted-foreground">{d}</div>
            ))}
          </div>
          <div className="grid grid-cols-7">
            {cells.map((day, i) => {
              const isToday = day != null && day.getTime() === today.getTime();
              const dayEvents = day ? visibleEvents.filter((e) => dayInEvent(day, e)) : [];
              return (
                <div
                  key={i}
                  className={cn("min-h-[5.5rem] border-b border-r border-border/60 p-1.5 last:border-r-0", !day && "bg-muted/10", (i + 1) % 7 === 0 && "border-r-0")}
                  onClick={day ? (e) => openDayMenu(e, day) : undefined}
                >
                  {day && (
                    <>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          openDayMenu(e, day);
                        }}
                        className={cn(
                        "inline-flex size-5 items-center justify-center rounded-full text-xs",
                        isToday ? "bg-primary font-semibold text-primary-foreground" : "text-foreground-secondary",
                        )}
                        title="Open date actions"
                      >
                        {day.getDate()}
                      </button>
                      <div className="mt-1 flex flex-col gap-0.5">
                        {dayEvents.slice(0, 2).map((e) => (
                          <button
                            key={e.id}
                            onClick={(ev) => {
                              ev.stopPropagation();
                              onOpen(e.id);
                            }}
                            className="flex items-center gap-1 truncate rounded px-1 py-0.5 text-left text-[11px] text-foreground-secondary transition-colors hover:bg-accent"
                            title={e.name}
                          >
                            <span className={cn("size-1.5 shrink-0 rounded-full", EVENT_DOT[e.category])} />
                            <span className="truncate">{e.name}</span>
                          </button>
                        ))}
                        {dayEvents.length > 2 && (
                          <span className="px-1 text-[10px] text-muted-foreground">+{dayEvents.length - 2} more</span>
                        )}
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Upcoming list */}
      <div className="hidden w-72 shrink-0 flex-col gap-2 lg:flex">
        <h3 className="text-sm font-semibold text-foreground">Upcoming</h3>
        <div className="flex flex-col gap-2">
          {upcoming.map((e) => (
            <button
              key={e.id}
              onClick={() => onOpen(e.id)}
              className="flex flex-col gap-1 rounded-xl border border-border bg-card p-3 text-left transition-colors hover:border-primary/40 hover:shadow-sm"
            >
              <div className="flex items-center gap-2">
                <span className={cn("size-2 shrink-0 rounded-full", EVENT_DOT[e.category])} />
                <span className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">{e.name}</span>
              </div>
              <span className="text-xs text-muted-foreground">{fmtRange(e.start, e.end)}</span>
            </button>
          ))}
          {upcoming.length === 0 && (
            <p className="rounded-xl border border-dashed border-border bg-muted/20 px-3 py-6 text-center text-sm text-muted-foreground">
              No upcoming events.
            </p>
          )}
        </div>
      </div>

      {editor.open && createPortal(
        <div className="fixed inset-0 z-[9999]">
          <div className="absolute inset-0 bg-foreground/20" onClick={() => setEditor((prev) => ({ ...prev, open: false }))} />
          <div className="absolute left-1/2 top-1/2 w-[min(92vw,42rem)] -translate-x-1/2 -translate-y-1/2 rounded-xl border border-border bg-background shadow-lg">
            <div className="flex items-center justify-between border-b border-border px-5 py-3.5">
              <h3 className="text-sm font-semibold text-foreground">New calendar entry</h3>
              <button
                type="button"
                onClick={() => setEditor((prev) => ({ ...prev, open: false }))}
                className="flex size-7 items-center justify-center rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground"
              >
                <RiCloseLine className="size-4" />
              </button>
            </div>
            <div className="grid grid-cols-1 gap-3 px-5 py-4 sm:grid-cols-2">
              <label className="sm:col-span-2">
                <span className="mb-1 block text-xs font-medium text-muted-foreground">Subject</span>
                <Input
                  value={editor.subject}
                  onChange={(e) => setEditor((prev) => ({ ...prev, subject: e.target.value }))}
                  placeholder="Add subject"
                />
              </label>
              <label>
                <span className="mb-1 block text-xs font-medium text-muted-foreground">Date type</span>
                <select
                  value={editor.isRange ? "range" : "single"}
                  onChange={(e) => setEditor((prev) => ({ ...prev, isRange: e.target.value === "range" }))}
                  className="h-9 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground"
                >
                  <option value="single">Single date</option>
                  <option value="range">Date range</option>
                </select>
              </label>
              <label>
                <span className="mb-1 block text-xs font-medium text-muted-foreground">Start date</span>
                <Input
                  type="date"
                  value={editor.start}
                  onChange={(e) => setEditor((prev) => ({
                    ...prev,
                    start: e.target.value,
                    end: prev.isRange ? prev.end : e.target.value,
                  }))}
                />
              </label>
              {editor.isRange && (
                <label>
                  <span className="mb-1 block text-xs font-medium text-muted-foreground">End date</span>
                  <Input
                    type="date"
                    value={editor.end}
                    onChange={(e) => setEditor((prev) => ({ ...prev, end: e.target.value }))}
                  />
                </label>
              )}
              <label>
                <span className="mb-1 block text-xs font-medium text-muted-foreground">Category</span>
                <select
                  value={editor.category}
                  onChange={(e) => setEditor((prev) => ({ ...prev, category: e.target.value as EventCategory }))}
                  className="h-9 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground"
                >
                  <option value="Campaign">Campaign</option>
                  <option value="Sale">Sale</option>
                  <option value="Seasonal">Seasonal</option>
                  <option value="Trade">Trade</option>
                </select>
              </label>
              <label>
                <span className="mb-1 block text-xs font-medium text-muted-foreground">Visibility</span>
                <select
                  value={editor.visibility}
                  onChange={(e) => setEditor((prev) => ({ ...prev, visibility: e.target.value as CalendarVisibility }))}
                  className="h-9 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground"
                >
                  <option value="Me Only">Me Only</option>
                  <option value="Team">Team</option>
                  <option value="Organisation">Organisation</option>
                  <option value="Enterprise">Enterprise</option>
                </select>
              </label>
              <label>
                <span className="mb-1 block text-xs font-medium text-muted-foreground">Start time</span>
                <Input
                  type="time"
                  value={editor.startTime}
                  onChange={(e) => setEditor((prev) => ({ ...prev, startTime: e.target.value }))}
                />
              </label>
              <label>
                <span className="mb-1 block text-xs font-medium text-muted-foreground">End time</span>
                <Input
                  type="time"
                  value={editor.endTime}
                  onChange={(e) => setEditor((prev) => ({ ...prev, endTime: e.target.value }))}
                />
              </label>
              <label>
                <span className="mb-1 block text-xs font-medium text-muted-foreground">Location</span>
                <Input
                  value={editor.location}
                  onChange={(e) => setEditor((prev) => ({ ...prev, location: e.target.value }))}
                  placeholder="Google Meet"
                />
              </label>
              <label>
                <span className="mb-1 block text-xs font-medium text-muted-foreground">Owner</span>
                <Input
                  value={editor.owner}
                  onChange={(e) => setEditor((prev) => ({ ...prev, owner: e.target.value }))}
                  placeholder="Owner"
                />
              </label>
              <label className="sm:col-span-2">
                <span className="mb-1 block text-xs font-medium text-muted-foreground">@ Team members</span>
                <Input
                  value={editor.attendees}
                  onChange={(e) => setEditor((prev) => ({ ...prev, attendees: e.target.value }))}
                  placeholder="@Amy @CRM @Growth"
                />
              </label>
              <label className="sm:col-span-2">
                <span className="mb-1 block text-xs font-medium text-muted-foreground">Description</span>
                <Textarea
                  value={editor.description}
                  onChange={(e) => setEditor((prev) => ({ ...prev, description: e.target.value }))}
                  placeholder="Add details"
                  className="min-h-24"
                />
              </label>
            </div>
            <div className="flex items-center justify-end gap-2 border-t border-border px-5 py-3">
              <Button size="sm" variant="outline" onClick={() => setEditor((prev) => ({ ...prev, open: false }))}>Cancel</Button>
              <Button size="sm" onClick={saveEditor}>Save</Button>
            </div>
          </div>
        </div>,
        document.body,
      )}

      {dayMenu.open && createPortal(
        <div className="fixed inset-0 z-[9997]" onClick={() => setDayMenu({ open: false, date: "", x: 0, y: 0 })}>
          <div
            className="absolute w-44 rounded-lg border border-border bg-card p-1.5 shadow-lg"
            style={{ left: dayMenu.x, top: dayMenu.y, transform: "translateX(-50%)" }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => {
                openCreateForDay(dayMenu.date);
                setDayMenu({ open: false, date: "", x: 0, y: 0 });
              }}
              className="flex w-full items-center rounded-md px-2.5 py-2 text-left text-sm text-foreground-secondary transition-colors hover:bg-accent hover:text-foreground"
            >
              New entry
            </button>
          </div>
        </div>,
        document.body,
      )}
    </div>
  );
}

// ─── Documents ───────────────────────────────────────────────────────────────

const EXT_TO_TYPE: Record<string, DocFileType> = {
  pdf: "PDF", doc: "DOCX", docx: "DOCX", xls: "XLSX", xlsx: "XLSX", csv: "XLSX",
  ppt: "PPTX", pptx: "PPTX", fig: "Figma",
};

function humanSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function DocumentsView({ docs, onUpload, onOpen }: {
  docs: PlaybookDoc[];
  onUpload: (doc: PlaybookDoc) => void;
  onOpen: (id: string) => void;
}) {
  const [query, setQuery] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const q = query.trim().toLowerCase();
  const shown = docs.filter((d) =>
    q === "" || d.name.toLowerCase().includes(q) || d.description.toLowerCase().includes(q) || d.kind.toLowerCase().includes(q));

  function handleFiles(files: FileList | null) {
    if (!files) return;
    const now = new Date().toISOString().slice(0, 10);
    Array.from(files).forEach((f, i) => {
      const ext = f.name.split(".").pop()?.toLowerCase() ?? "";
      onUpload({
        id: `doc-up-${Date.now()}-${i}`,
        name: f.name.replace(/\.[^.]+$/, ""),
        kind: "Brief",
        fileType: EXT_TO_TYPE[ext] ?? "PDF",
        size: humanSize(f.size),
        uploadedBy: "You",
        updatedAt: now,
        description: "Uploaded just now.",
      });
    });
  }

  return (
    <div className="flex min-w-0 flex-1 flex-col gap-3 overflow-y-auto px-6 py-4">
      <FilterBar>
        <div className="relative">
          <RiSearchLine className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search documents" className="h-9 w-64 pl-8" />
        </div>
        <Button size="sm" className="ml-auto shrink-0" onClick={() => fileRef.current?.click()}>
          <RiUploadCloud2Line className="size-3.5" /> Upload
        </Button>
        <input ref={fileRef} type="file" multiple className="hidden" onChange={(e) => { handleFiles(e.target.files); e.target.value = ""; }} />
      </FilterBar>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {shown.map((d) => {
          const Icon = DOC_ICON[d.fileType];
          return (
            <button
              key={d.id}
              onClick={() => onOpen(d.id)}
              className="flex flex-col gap-2 rounded-xl border border-border bg-card p-4 text-left transition-colors hover:border-primary/40 hover:shadow-sm"
            >
              <div className="flex items-center gap-2.5">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Icon className="size-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground">{d.name}</p>
                  <p className="text-xs text-muted-foreground">{d.fileType} · {d.size}</p>
                </div>
              </div>
              <p className="line-clamp-2 text-sm text-foreground-secondary">{d.description}</p>
              <div className="mt-auto flex items-center gap-2 pt-1">
                <Badge variant="secondary" size="sm">{d.kind}</Badge>
                <span className="ml-auto text-xs text-muted-foreground">{fmtDay(d.updatedAt)}</span>
              </div>
            </button>
          );
        })}
      </div>
      {shown.length === 0 && (
        <p className="rounded-xl border border-dashed border-border bg-muted/20 px-4 py-10 text-center text-sm text-muted-foreground">
          No documents match your search.
        </p>
      )}
      <p className="text-sm text-muted-foreground">Displaying {shown.length} of {docs.length} documents</p>
    </div>
  );
}

// ─── Detail drawer ───────────────────────────────────────────────────────────

function DrawerField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <div className="text-sm text-foreground">{children}</div>
    </div>
  );
}

function PlaybookDrawer({ selection, docs, calendarEvents, onClose }: {
  selection: Selection;
  docs: PlaybookDoc[];
  calendarEvents: CalendarEntry[];
  onClose: () => void;
}) {
  const [shown, setShown] = useState(false);
  useEffect(() => {
    const t = requestAnimationFrame(() => setShown(true));
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => { cancelAnimationFrame(t); window.removeEventListener("keydown", onKey); };
  }, [onClose]);

  let title = "";
  let subtitle: React.ReactNode = null;
  let body: React.ReactNode = null;

  if (selection.kind === "glossary") {
    const t = getGlossaryTerm(selection.id);
    if (t) {
      title = t.term;
      subtitle = <span>{t.category}</span>;
      body = <GlossaryBody term={t} />;
    }
  } else if (selection.kind === "rule") {
    const r = getRule(selection.id);
    if (r) {
      title = r.name;
      subtitle = <span>Rule</span>;
      body = <RuleBody rule={r} />;
    }
  } else if (selection.kind === "event") {
    const e = calendarEvents.find((ev) => ev.id === selection.id);
    if (e) {
      title = e.name;
      subtitle = <span className="inline-flex items-center gap-1.5"><span className={cn("size-2 rounded-full", EVENT_DOT[e.category])} />{e.category}</span>;
      body = <EventBody event={e} />;
    }
  } else {
    const d = docs.find((x) => x.id === selection.id);
    if (d) {
      title = d.name;
      subtitle = <span>{d.fileType} · {d.size}</span>;
      body = <DocBody doc={d} />;
    }
  }

  return createPortal(
    <div className="fixed inset-0 z-[9998]">
      <div
        className={cn("absolute inset-0 bg-foreground/20 transition-opacity duration-200", shown ? "opacity-100" : "opacity-0")}
        onClick={onClose}
      />
      <div
        className={cn(
          "absolute right-0 top-0 flex h-full w-[26rem] flex-col bg-background shadow-lg transition-transform duration-200 ease-out",
          shown ? "translate-x-0" : "translate-x-full",
        )}
      >
        <header className="flex items-start gap-2 border-b border-border px-5 py-4">
          <div className="flex min-w-0 flex-1 flex-col gap-1.5">
            <h2 className="truncate text-base font-semibold text-foreground">{title}</h2>
            <div className="flex flex-wrap items-center gap-2 text-xs text-foreground-secondary">{subtitle}</div>
          </div>
          <button
            onClick={onClose}
            className="flex size-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            title="Close"
          >
            <RiCloseLine className="size-4" />
          </button>
        </header>
        <div className="flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto px-5 py-5">{body}</div>
      </div>
    </div>,
    document.body,
  );
}

function GlossaryBody({ term }: { term: GlossaryTerm }) {
  return (
    <>
      <p className="text-sm leading-relaxed text-foreground-secondary">{term.definition}</p>
      <div className="grid grid-cols-2 gap-4">
        <DrawerField label="Category">{term.category}</DrawerField>
        <DrawerField label="Updated">{fmtFull(term.updatedAt)}</DrawerField>
      </div>
      {term.aka && term.aka.length > 0 && (
        <DrawerField label="Also known as">
          <div className="flex flex-wrap gap-1.5 pt-0.5">
            {term.aka.map((a) => <Badge key={a} variant="secondary" size="sm">{a}</Badge>)}
          </div>
        </DrawerField>
      )}
      {term.related && term.related.length > 0 && (
        <DrawerField label="Related terms">
          <div className="mt-0.5 flex flex-col gap-1">
            {term.related.map((id) => {
              const r = getGlossaryTerm(id);
              if (!r) return null;
              return (
                <div key={id} className="flex items-center gap-2">
                  <RiBookOpenLine className="size-4 shrink-0 text-muted-foreground" />
                  <span className="min-w-0 flex-1 truncate text-sm text-foreground">{r.term}</span>
                </div>
              );
            })}
          </div>
        </DrawerField>
      )}
    </>
  );
}

function RuleBody({ rule }: { rule: PlaybookRule }) {
  return (
    <>
      <p className="rounded-lg border border-border bg-muted/30 px-3 py-2.5 text-sm leading-relaxed text-foreground">{rule.statement}</p>
      {rule.rationale && (
        <DrawerField label="Why this rule">
          <p className="leading-relaxed text-foreground-secondary">{rule.rationale}</p>
        </DrawerField>
      )}
      <div className="grid grid-cols-2 gap-4">
        {rule.source && <DrawerField label="Source">{rule.source}</DrawerField>}
        <DrawerField label="Updated">{fmtFull(rule.updatedAt)}</DrawerField>
      </div>
    </>
  );
}

function EventBody({ event }: { event: CalendarEntry }) {
  return (
    <>
      <p className="text-sm leading-relaxed text-foreground-secondary">{event.description}</p>
      <div className="grid grid-cols-2 gap-4">
        <DrawerField label="Dates">
          <span className="inline-flex items-center gap-1.5"><RiCalendarEventLine className="size-3.5 text-muted-foreground" />{fmtRange(event.start, event.end)}</span>
        </DrawerField>
        <DrawerField label="Category">{event.category}</DrawerField>
        {event.visibility && <DrawerField label="Visibility">{event.visibility}</DrawerField>}
        {event.startTime && event.endTime && <DrawerField label="Time">{event.startTime} - {event.endTime}</DrawerField>}
        {event.location && <DrawerField label="Location">{event.location}</DrawerField>}
        {event.owner && <DrawerField label="Owner">{event.owner}</DrawerField>}
        {event.attendees && <DrawerField label="Attendees">{event.attendees}</DrawerField>}
      </div>
    </>
  );
}

function DocBody({ doc }: { doc: PlaybookDoc }) {
  const Icon = DOC_ICON[doc.fileType];
  return (
    <>
      <div className="flex items-center justify-center rounded-xl border border-dashed border-border bg-muted/20 py-10">
        <span className="flex size-14 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <Icon className="size-7" />
        </span>
      </div>
      <p className="text-sm leading-relaxed text-foreground-secondary">{doc.description}</p>
      <div className="grid grid-cols-2 gap-4">
        <DrawerField label="Type"><Badge variant="secondary" size="sm">{doc.kind}</Badge></DrawerField>
        <DrawerField label="File">{doc.fileType} · {doc.size}</DrawerField>
        <DrawerField label="Uploaded by">
          <span className="inline-flex items-center gap-1.5"><RiUserLine className="size-3.5 text-muted-foreground" />{doc.uploadedBy}</span>
        </DrawerField>
        <DrawerField label="Updated">
          <span className="inline-flex items-center gap-1.5"><RiTimeLine className="size-3.5 text-muted-foreground" />{fmtFull(doc.updatedAt)}</span>
        </DrawerField>
      </div>
      <Button size="sm" variant="outline" className="self-start">Download</Button>
    </>
  );
}
