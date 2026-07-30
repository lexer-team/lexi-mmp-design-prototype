import { useMemo, useState, useRef, useEffect, useCallback } from "react";
import { cn } from "@/lib/utils";
import { LexiMark } from "@/components/chat/LexiMark";
import { Skeleton } from "@/components/ui/Skeleton";
import { RiCheckLine, RiResetLeftLine, RiCornerDownLeftLine, RiBookOpenLine, RiThumbUpLine, RiThumbDownLine, RiPushpin2Line, RiExpandDiagonal2Line, RiCollapseDiagonal2Line } from "@remixicon/react";
import { useSession } from "./store";
import { RichText, MentionText, stripMentions } from "./components/RichText";
import { ProposedBlock } from "./components/ProposedBlock";
import { SummaryPointer } from "./components/SummaryPointer";
import { ReasoningBlock, type SegmentConfirmedPayload } from "./components/ReasoningBlock";
import { ChartBlock } from "./components/ResponseBlocks";
import { type MentionGroup } from "../lexi-shared-brain/MentionComposer";
import { PromptComposer } from "./components/PromptComposer";
import { ThinkingProcess, type ThinkingStep } from "../lexi-shared-brain/ChatThinking";
import { getDef, registerDefs, type DefRef } from "@/data/def-registry";
import { BRAIN_GROUPS, ENTITY_META } from "../lexi-shared-brain/data";
import { MOCK_DEFINITIONS } from "@/data/definitions-mock";
import { ACTIVATIONS, type Activation } from "./activations-mock";
import {
  CONVERSATIONS,
  DEFAULT_CONVERSATION_ID,
  DEMO_SEGMENT_DEFS,
  SEGMENT_TRIGGERS,
} from "./demo-data";
import { DUMMY_SEGMENT_BY_ID, DUMMY_SEGMENTS, dummySegmentToDefRef } from "./segment-dummy-data";
import type { Artifact, ContentBlock, Conversation, ReasoningAssumption, StepSpec } from "./types";

// ─── Mention picker content — kept in sync with the Data pages ───────────────
// The @-mention panel offers the same objects the user sees under Data:
// segments come from the Segments page (BRAIN_GROUPS); metrics & attributes come
// from the Definitions page (MOCK_DEFINITIONS, gaps excluded).

// Register each saved segment as a resolvable ref so it renders a chip + hover
// card in the picker and resolves anywhere getDef is used.
const SEGMENT_REFS: DefRef[] = BRAIN_GROUPS.map((g) => ({
  id: g.id,
  kind: "segment" as const,
  name: g.name,
  entity: g.outputEntity,
  description: g.summary,
  stat: { label: ENTITY_META[g.outputEntity].unit, value: g.population.toLocaleString() },
}));
registerDefs(SEGMENT_REFS);

function activationRef(a: Activation): DefRef {
  return {
    id: a.id,
    kind: "group" as const,
    name: a.name,
    entity: "customer",
    description: `${a.context} · ${a.channel}`,
    stat: { label: "status", value: a.status },
  };
}

// Saved demo segments (e.g. "Holiday win-back") lead the Segments list so they're
// front-and-centre in the @-mention picker — mentioning one starts its conversation.
const SEGMENT_PICKER_REFS: DefRef[] = [
  ...DEMO_SEGMENT_DEFS,
  ...SEGMENT_REFS.filter((s) => !DEMO_SEGMENT_DEFS.some((d) => d.id === s.id)),
];

function segmentCreatedAtMs(artifact: Artifact): number {
  if (artifact.savedAt) {
    const ts = Date.parse(artifact.savedAt);
    if (!Number.isNaN(ts)) return ts;
  }

  const idMatch = /seg-[^-]*-(\d{10,})/.exec(artifact.id);
  if (idMatch) {
    const parsed = Number(idMatch[1]);
    if (!Number.isNaN(parsed)) return parsed;
  }

  return 0;
}

export function buildMentionGroups(activations: Activation[] = ACTIVATIONS): MentionGroup[] {
  const def = (id: string) => getDef(id);
  const nonGap = MOCK_DEFINITIONS.filter((d) => d.status !== "gap");
  const refs = (type: "metric" | "attribute") =>
    nonGap.filter((d) => d.type === type).map((d) => def(d.id)).filter((d): d is DefRef => Boolean(d));
  const activationRefs = activations.map(activationRef);
  registerDefs(activationRefs);
  return [
    { label: "Segments", items: SEGMENT_PICKER_REFS },
    { label: "Activations", items: activationRefs },
    { label: "Metrics", items: refs("metric") },
    { label: "Attributes", items: refs("attribute") },
  ];
}

// ─── Playback model (local to the player) ───────────────────────────────────

interface RevealBlock {
  id: string;
  block: ContentBlock;
  /** word count revealed for text blocks; ignored for non-text blocks */
  revealed: number;
}

type PlayedMessage =
  | { id: string; role: "user"; text: string }
  | {
      id: string;
      role: "lexi";
      thinking?: ThinkingStep[];
      thinkingSummary?: string;
      blocks: RevealBlock[];
      /** Definition ids this reply drew on; rendered as a Sources bar once the reply completes. */
      sources?: string[];
    };

type ReactionKey = "up" | "down" | "pin";
type ReactionState = Record<ReactionKey, boolean>;

const EMPTY_REACTIONS: ReactionState = {
  up: false,
  down: false,
  pin: false,
};

type ConversationPlaybackSnapshot = {
  messages: PlayedMessage[];
  messageReactions: Record<string, ReactionState>;
  turnIndex: number;
  activationBuildState?: ActivationBuildState;
};

type ActivationBuildStage = "idle" | "await-segment" | "await-confirmation" | "await-cancel-confirmation";

type ActivationBuildState = {
  stage: ActivationBuildStage;
  segmentId?: string;
  segmentName?: string;
};
type ReasoningCancelMode = "pending-verify" | "restart";

const IDLE_ACTIVATION_BUILD_STATE: ActivationBuildState = { stage: "idle" };

function maxPlaybackSeq(messages: PlayedMessage[]): number {
  let max = 0;
  for (const message of messages) {
    const m = /^pm-(\d+)$/.exec(message.id);
    if (m) max = Math.max(max, Number(m[1]));
    if (message.role === "lexi") {
      for (const block of message.blocks) {
        const b = /^pb-(\d+)$/.exec(block.id);
        if (b) max = Math.max(max, Number(b[1]));
      }
    }
  }
  return max;
}

// ─── Timing helpers (ported from Shared brain v1's ChatFlow) ─────────────────

function wait(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    const t = setTimeout(resolve, ms);
    signal.addEventListener("abort", () => {
      clearTimeout(t);
      reject(new DOMException("Aborted", "AbortError"));
    });
  });
}
const jitter = (base: number) => base * (0.85 + Math.random() * 0.3);

let stepSeq = 0;
function toThinkingSteps(specs: StepSpec[]): ThinkingStep[] {
  return specs.map((s) => ({ ...s, id: `seg-step-${++stepSeq}`, status: "pending" as const }));
}

// Split into words; `[[id]]` tokens contain no spaces so they stay intact.
const words = (s: string) => s.split(/\s+/).filter(Boolean);

// Reveal the first `n` words of a string while preserving original whitespace
// (newlines, indentation) so streamed markdown keeps its structure.
function revealPrefix(content: string, n: number): string {
  if (n <= 0) return "";
  const tokens = [...content.matchAll(/\S+/g)];
  if (n >= tokens.length) return content;
  const last = tokens[n - 1];
  return content.slice(0, (last.index ?? 0) + last[0].length);
}

interface ReasoningEditTarget {
  messageId: string;
  blockId: string;
}

interface ParsedReasoningEdit {
  label: string;
  value: string;
}

function normalizeAssumptionLabel(label: string): string {
  return label.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function formatAssumptionLabel(label: string): string {
  return label
    .trim()
    .replace(/^the\s+/i, "")
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
}

function slugifyLabel(label: string): string {
  return normalizeAssumptionLabel(label).replace(/\s+/g, "-");
}

function parseReasoningEdits(text: string, current: ReasoningAssumption[]): ParsedReasoningEdit[] {
  const clauses = text
    .split(/\n|,|;|\band\b/i)
    .map((chunk) => chunk.trim())
    .filter(Boolean);

  const edits: ParsedReasoningEdit[] = [];
  for (const clause of clauses) {
    const shorthandCustomerCountry = clause.match(/^customers?\s+in\s+([a-z][a-z\s-]*)$/i);
    if (shorthandCustomerCountry) {
      const existingCountry = current.find((assumption) => normalizeAssumptionLabel(assumption.label) === "country");
      edits.push({
        label: existingCountry?.label ?? "Country",
        value: shorthandCustomerCountry[1].trim().replace(/\s+/g, " "),
      });
      continue;
    }

    const shorthandCountry = clause.match(/^country\s+([a-z][a-z\s-]*)$/i);
    if (shorthandCountry) {
      const existingCountry = current.find((assumption) => normalizeAssumptionLabel(assumption.label) === "country");
      edits.push({
        label: existingCountry?.label ?? "Country",
        value: shorthandCountry[1].trim().replace(/\s+/g, " "),
      });
      continue;
    }

    const match = clause.match(/^(.+?)\s*(?:=|is|should be|to be)\s*(.+)$/i);
    if (!match) continue;

    const rawLabel = match[1].trim();
    const rawValue = match[2].trim().replace(/[.]+$/, "");
    if (!rawLabel || !rawValue) continue;

    const normalizedRaw = normalizeAssumptionLabel(rawLabel);

    const countryFromCustomerValue = rawValue.match(/^in\s+([a-z][a-z\s-]*)$/i)?.[1]?.trim();
    if ((normalizedRaw === "customer" || normalizedRaw === "customers") && countryFromCustomerValue) {
      const existingCountry = current.find((assumption) => normalizeAssumptionLabel(assumption.label) === "country");
      edits.push({
        label: existingCountry?.label ?? "Country",
        value: countryFromCustomerValue.replace(/\s+/g, " "),
      });
      continue;
    }

    if (normalizedRaw === "country") {
      const normalizedCountryValue = rawValue.replace(/^in\s+/i, "").trim();
      if (normalizedCountryValue) {
        const existingCountry = current.find((assumption) => normalizeAssumptionLabel(assumption.label) === "country");
        edits.push({
          label: existingCountry?.label ?? "Country",
          value: normalizedCountryValue,
        });
        continue;
      }
    }

    const existing = current.find((assumption) => {
      const normalizedExisting = normalizeAssumptionLabel(assumption.label);
      return normalizedExisting === normalizedRaw
        || normalizedExisting.includes(normalizedRaw)
        || normalizedRaw.includes(normalizedExisting);
    });

    edits.push({
      label: existing?.label ?? formatAssumptionLabel(rawLabel),
      value: rawValue,
    });
  }

  return edits;
}

function applyReasoningEdits(current: ReasoningAssumption[], edits: ParsedReasoningEdit[]): ReasoningAssumption[] {
  if (edits.length === 0) return current;

  const next = [...current];
  for (let i = 0; i < edits.length; i++) {
    const edit = edits[i];
    const normalizedEdit = normalizeAssumptionLabel(edit.label);
    const index = next.findIndex((assumption) => normalizeAssumptionLabel(assumption.label) === normalizedEdit);

    if (index >= 0) {
      next[index] = { ...next[index], value: edit.value };
      continue;
    }

    next.push({
      id: `assumption-${slugifyLabel(edit.label)}-${Date.now()}-${i}`,
      label: edit.label,
      value: edit.value,
    });
  }

  return next;
}

function findReasoningAssumptions(messages: PlayedMessage[], target: ReasoningEditTarget | null): ReasoningAssumption[] | null {
  if (!target) return null;
  const message = messages.find((item) => item.id === target.messageId && item.role === "lexi");
  if (!message || message.role !== "lexi") return null;
  const block = message.blocks.find((item) => item.id === target.blockId);
  if (!block || block.block.type !== "reasoning") return null;
  return block.block.assumptions;
}

function findReasoningBlock(messages: PlayedMessage[], target: ReasoningEditTarget | null): Extract<ContentBlock, { type: "reasoning" }> | null {
  if (!target) return null;
  const message = messages.find((item) => item.id === target.messageId && item.role === "lexi");
  if (!message || message.role !== "lexi") return null;
  const block = message.blocks.find((item) => item.id === target.blockId);
  if (!block || block.block.type !== "reasoning") return null;
  return block.block;
}

function parseRegionFromText(text: string): string | null {
  const m = text.match(/\bin\s+([a-z][a-z\s-]*)$/i);
  if (!m) return null;
  return m[1].trim().replace(/\s+/g, " ");
}

// ─── Non-text block reveal: brief skeleton, then fade in ─────────────────────

function BlockReveal({ skeleton, children }: { skeleton: React.ReactNode; children: React.ReactNode }) {
  const [done, setDone] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setDone(true), 450);
    return () => clearTimeout(t);
  }, []);
  if (!done) return <div className="animate-in fade-in-0 duration-200">{skeleton}</div>;
  return <div className="animate-in fade-in-0 duration-300">{children}</div>;
}

interface ActivationKickoffSegment {
  id: string;
  name: string;
  description?: string;
  population?: string;
  criteria?: string[];
  recommendations?: string[];
}

function ActivationBuildCard({
  block,
  sourceMessageId,
}: {
  block: Extract<ContentBlock, { type: "activationBuild" }>;
  sourceMessageId: string;
}) {
  const { state, dispatch } = useSession();
  const [activationName, setActivationName] = useState(block.activationName);
  const [activationDescription, setActivationDescription] = useState(block.activationDescription);
  const [editingName, setEditingName] = useState(false);
  const [editingDescription, setEditingDescription] = useState(false);
  const [showActivationConnection, setShowActivationConnection] = useState(false);
  const [selectedSourceId, setSelectedSourceId] = useState("src-meta");
  const [selectedAccounts, setSelectedAccounts] = useState<string[]>([]);
  const [connectionConfirmed, setConnectionConfirmed] = useState(false);
  const [approvalSent, setApprovalSent] = useState(false);
  const [showApprovalPanel, setShowApprovalPanel] = useState(false);
  const [latestActivationId, setLatestActivationId] = useState<string | null>(null);
  const [sendTiming, setSendTiming] = useState<"send-now" | "schedule-send">("send-now");
  const [sendCadence, setSendCadence] = useState<"once-off" | "re-occurring">("once-off");
  const [recurringHasEndDate, setRecurringHasEndDate] = useState<"yes" | "no">("no");
  const [scheduledStartDate, setScheduledStartDate] = useState("");
  const [scheduledEndDate, setScheduledEndDate] = useState("");

  const fieldTypeOptions = [
    { value: "email", label: "Email" },
    { value: "phone", label: "Phone" },
    { value: "first-name", label: "First name" },
    { value: "last-name", label: "Last name" },
    { value: "country", label: "Country" },
  ] as const;

  const fieldMatchOptions: Record<string, Array<{ value: string; label: string }>> = {
    email: [
      { value: "email_98", label: "Email (98%)" },
      { value: "contact_email_84", label: "Contact Email (84%)" },
    ],
    phone: [
      { value: "phone_86", label: "Phone (86%)" },
      { value: "cell_79", label: "Cell (79%)" },
      { value: "mobile_92", label: "Mobile (92%)" },
    ],
    "first-name": [
      { value: "first_name_96", label: "First Name (96%)" },
      { value: "given_name_81", label: "Given Name (81%)" },
    ],
    "last-name": [
      { value: "last_name_95", label: "Last Name (95%)" },
      { value: "surname_82", label: "Surname (82%)" },
    ],
    country: [
      { value: "country_code_99", label: "Country Code (99%)" },
      { value: "country_name_93", label: "Country Name (93%)" },
    ],
  };

  const [fieldRows, setFieldRows] = useState<Array<{ id: string; fieldType: string; selectedMatch: string }>>([
    {
      id: "map-email",
      fieldType: "email",
      selectedMatch: "email_98",
    },
    {
      id: "map-phone",
      fieldType: "phone",
      selectedMatch: "mobile_92",
    },
  ]);

  const sourceList = [
    { id: "src-meta", name: "Meta Ads" },
    { id: "src-klaviyo", name: "Klaviyo" },
    { id: "src-braze", name: "Braze" },
    { id: "src-google-ads", name: "Google Ads" },
    { id: "src-sfmc", name: "Salesforce Marketing Cloud" },
    { id: "src-amplitude", name: "Amplitude" },
  ];

  const accountsBySource: Record<string, Array<{ id: string; name: string; region: "AU" | "NZ" | "USA" }>> = {
    "src-meta": [
      { id: "meta-au", name: "Meta AU account", region: "AU" },
      { id: "meta-nz", name: "Meta NZ account", region: "NZ" },
      { id: "meta-usa", name: "Meta USA account", region: "USA" },
    ],
    "src-klaviyo": [
      { id: "klaviyo-au", name: "Klaviyo AU account", region: "AU" },
      { id: "klaviyo-nz", name: "Klaviyo NZ account", region: "NZ" },
      { id: "klaviyo-usa", name: "Klaviyo USA account", region: "USA" },
    ],
    "src-braze": [
      { id: "braze-au", name: "Braze AU account", region: "AU" },
      { id: "braze-nz", name: "Braze NZ account", region: "NZ" },
      { id: "braze-usa", name: "Braze USA account", region: "USA" },
    ],
    "src-google-ads": [
      { id: "gads-au", name: "Google Ads AU account", region: "AU" },
      { id: "gads-nz", name: "Google Ads NZ account", region: "NZ" },
      { id: "gads-usa", name: "Google Ads USA account", region: "USA" },
    ],
    "src-sfmc": [
      { id: "sfmc-au", name: "SFMC AU account", region: "AU" },
      { id: "sfmc-nz", name: "SFMC NZ account", region: "NZ" },
      { id: "sfmc-usa", name: "SFMC USA account", region: "USA" },
    ],
    "src-amplitude": [
      { id: "amp-au", name: "Amplitude AU account", region: "AU" },
      { id: "amp-nz", name: "Amplitude NZ account", region: "NZ" },
      { id: "amp-usa", name: "Amplitude USA account", region: "USA" },
    ],
  };

  const selectedSourceAccounts = accountsBySource[selectedSourceId] ?? [];
  const selectedSource = sourceList.find((source) => source.id === selectedSourceId);
  const selectedAccountNames = selectedSourceAccounts
    .filter((account) => selectedAccounts.includes(account.id))
    .map((account) => account.name);

  const hasSelectedSource = Boolean(selectedSourceId);
  const hasSelectedAccounts = selectedAccounts.length > 0;
  const hasValidFieldMappings = fieldRows.every((row) => Boolean(row.fieldType) && Boolean(row.selectedMatch));
  const requiresStartDate = sendTiming === "schedule-send";
  const hasStartDate = !requiresStartDate || Boolean(scheduledStartDate);
  const requiresEndDate = sendTiming === "schedule-send"
    && sendCadence === "re-occurring"
    && recurringHasEndDate === "yes";
  const hasEndDate = !requiresEndDate || Boolean(scheduledEndDate);
  const canConfirmActivationConnection = hasSelectedSource
    && hasSelectedAccounts
    && hasValidFieldMappings
    && hasStartDate
    && hasEndDate;

  const toggleAccount = (id: string) => {
    setSelectedAccounts((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]));
  };

  const addMoreFields = () => {
    setFieldRows((prev) => {
      return [
        ...prev,
        {
          id: `map-extra-${prev.length + 1}`,
          fieldType: "email",
          selectedMatch: "email_98",
        },
      ];
    });
  };

  return (
    <div className="rounded-xl border border-border bg-card p-3.5">
      <div className="flex items-center gap-2">
        <span className="rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">
          MVP activation build
        </span>
      </div>

      <div className="mt-3 rounded-xl border border-border bg-background px-4 py-3">
        <p className="text-xs font-medium uppercase tracking-normal text-muted-foreground">Population volume</p>
        <p className="mt-1 text-2xl font-semibold text-foreground tabular-nums">{block.population}</p>
      </div>

      <div className="mt-3 rounded-xl border border-border bg-background p-3">
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs font-medium uppercase tracking-normal text-muted-foreground">Activation name</p>
          <button
            type="button"
            onClick={() => setEditingName((v) => !v)}
            className="rounded-lg border border-border bg-card px-2.5 py-1 text-xs font-medium text-foreground hover:bg-accent"
          >
            {editingName ? "Done" : "Edit name"}
          </button>
        </div>
        {editingName ? (
          <input
            value={activationName}
            onChange={(e) => setActivationName(e.target.value)}
            className="mt-2 h-9 w-full rounded-lg border border-input bg-card px-3 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring/40"
          />
        ) : (
          <p className="mt-2 text-sm font-medium text-foreground">{activationName}</p>
        )}
      </div>

      <div className="mt-3 rounded-xl border border-border bg-background p-3">
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs font-medium uppercase tracking-normal text-muted-foreground">Activation description</p>
          <button
            type="button"
            onClick={() => setEditingDescription((v) => !v)}
            className="rounded-lg border border-border bg-card px-2.5 py-1 text-xs font-medium text-foreground hover:bg-accent"
          >
            {editingDescription ? "Done" : "Edit name"}
          </button>
        </div>
        {editingDescription ? (
          <textarea
            value={activationDescription}
            onChange={(e) => setActivationDescription(e.target.value)}
            className="mt-2 min-h-20 w-full rounded-lg border border-input bg-card px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring/40"
          />
        ) : (
          <p className="mt-2 text-sm text-foreground-secondary">{activationDescription}</p>
        )}
      </div>

      <div className="mt-3 rounded-xl border border-border bg-background p-3">
        <p className="text-xs font-medium uppercase tracking-normal text-muted-foreground">Segment contains</p>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-foreground-secondary">
          {block.rules.map((rule, idx) => (
            <li key={`${rule}-${idx}`}>{rule}</li>
          ))}
        </ul>
      </div>

      <div className="mt-3 flex justify-end">
        <button
          type="button"
          onClick={() => setShowActivationConnection(true)}
          className="rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          Confirm
        </button>
      </div>

      {showActivationConnection ? (
        <>
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            <div className="rounded-xl border border-border bg-background p-3">
              <p className="text-xs font-medium uppercase tracking-normal text-muted-foreground">Connected data sources</p>
              <div className="mt-2 max-h-44 overflow-y-auto space-y-2 pr-1">
                {sourceList.map((source) => {
                  const selected = source.id === selectedSourceId;
                  return (
                    <button
                      key={source.id}
                      type="button"
                      onClick={() => {
                        setSelectedSourceId(source.id);
                        setSelectedAccounts([]);
                      }}
                      className={cn(
                        "w-full rounded-lg border px-3 py-2 text-left text-sm transition-colors",
                        selected
                          ? "border-primary/60 bg-primary/10 text-foreground"
                          : "border-border bg-card text-foreground hover:bg-accent",
                      )}
                    >
                      {source.name}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="rounded-xl border border-border bg-background p-3">
              <p className="text-xs font-medium uppercase tracking-normal text-muted-foreground">Accounts (multi select)</p>
              <div className="mt-2 space-y-2">
                {selectedSourceAccounts.map((account) => {
                  const checked = selectedAccounts.includes(account.id);
                  return (
                    <label key={account.id} className="flex items-center gap-2 rounded-lg border border-border/70 bg-card px-2.5 py-2 text-sm text-foreground">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleAccount(account.id)}
                        className="size-4"
                      />
                      <span className="flex-1">{account.name}</span>
                      <span className="text-xs text-muted-foreground">{account.region}</span>
                    </label>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="mt-3 rounded-xl border border-border bg-background p-3">
            <p className="text-xs font-medium uppercase tracking-normal text-muted-foreground">Field mapping</p>
            <div className="mt-2 space-y-2">
              {fieldRows.map((row) => (
                <div key={row.id} className="grid gap-2 md:grid-cols-[170px_1fr] md:items-center">
                  <select
                    value={row.fieldType}
                    onChange={(e) => {
                      const nextFieldType = e.target.value;
                      const defaultMatch = fieldMatchOptions[nextFieldType]?.[0]?.value ?? "";
                      setFieldRows((prev) => prev.map((item) => (
                        item.id === row.id
                          ? { ...item, fieldType: nextFieldType, selectedMatch: defaultMatch }
                          : item
                      )));
                    }}
                    className="h-9 w-full rounded-lg border border-input bg-card px-3 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring/40"
                  >
                    {fieldTypeOptions.map((option) => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                  <select
                    value={row.selectedMatch}
                    onChange={(e) => {
                      const next = e.target.value;
                      setFieldRows((prev) => prev.map((item) => (item.id === row.id ? { ...item, selectedMatch: next } : item)));
                    }}
                    className="h-9 w-full rounded-lg border border-input bg-card px-3 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring/40"
                  >
                    {(fieldMatchOptions[row.fieldType] ?? []).map((option) => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                </div>
              ))}
            </div>

            <div className="mt-3 flex flex-wrap justify-end gap-2">
              <button
                type="button"
                onClick={addMoreFields}
                className="rounded-lg border border-border bg-card px-3 py-1.5 text-sm font-medium text-foreground hover:bg-accent"
              >
                Add More Fields
              </button>
            </div>
          </div>

          <div className="mt-3 rounded-xl border border-border bg-background p-3">
            <p className="text-xs font-medium uppercase tracking-normal text-muted-foreground">Frequency</p>

            <div className="mt-2 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setSendTiming("send-now")}
                className={cn(
                  "rounded-lg border px-3 py-2 text-sm font-medium transition-colors",
                  sendTiming === "send-now"
                    ? "border-primary/60 bg-primary/10 text-foreground"
                    : "border-border bg-card text-foreground hover:bg-accent",
                )}
              >
                Send Now
              </button>
              <button
                type="button"
                onClick={() => setSendTiming("schedule-send")}
                className={cn(
                  "rounded-lg border px-3 py-2 text-sm font-medium transition-colors",
                  sendTiming === "schedule-send"
                    ? "border-primary/60 bg-primary/10 text-foreground"
                    : "border-border bg-card text-foreground hover:bg-accent",
                )}
              >
                Schedule Send
              </button>
            </div>

            <div className="mt-2 grid grid-cols-1 gap-2">
              <button
                type="button"
                onClick={() => {
                  const nextCadence = sendCadence === "re-occurring" ? "once-off" : "re-occurring";
                  setSendCadence(nextCadence);
                  if (nextCadence !== "re-occurring") {
                    setRecurringHasEndDate("no");
                    setScheduledEndDate("");
                  }
                }}
                className={cn(
                  "rounded-lg border px-3 py-2 text-sm font-medium transition-colors",
                  sendCadence === "re-occurring"
                    ? "border-primary/60 bg-primary/10 text-foreground"
                    : "border-border bg-card text-foreground hover:bg-accent",
                )}
              >
                Re-Occuring
              </button>
            </div>

            {sendTiming === "schedule-send" ? (
              <div className="mt-3 rounded-lg border border-border/70 bg-card p-3">
                <p className="text-xs font-medium uppercase tracking-normal text-muted-foreground">Date range</p>

                <div className="mt-2">
                  <label className="text-xs font-medium text-foreground-secondary" htmlFor="activation-schedule-start-date">
                    Start date
                  </label>
                  <input
                    id="activation-schedule-start-date"
                    type="date"
                    value={scheduledStartDate}
                    onChange={(e) => setScheduledStartDate(e.target.value)}
                    className="mt-1 h-9 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring/40"
                  />
                </div>

                {sendCadence === "re-occurring" ? (
                  <div className="mt-3">
                    <p className="text-xs font-medium text-foreground-secondary">Is there an end date?</p>
                    <div className="mt-2 grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setRecurringHasEndDate("yes")}
                        className={cn(
                          "rounded-lg border px-3 py-2 text-sm font-medium transition-colors",
                          recurringHasEndDate === "yes"
                            ? "border-primary/60 bg-primary/10 text-foreground"
                            : "border-border bg-background text-foreground hover:bg-accent",
                        )}
                      >
                        Yes
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setRecurringHasEndDate("no");
                          setScheduledEndDate("");
                        }}
                        className={cn(
                          "rounded-lg border px-3 py-2 text-sm font-medium transition-colors",
                          recurringHasEndDate === "no"
                            ? "border-primary/60 bg-primary/10 text-foreground"
                            : "border-border bg-background text-foreground hover:bg-accent",
                        )}
                      >
                        No
                      </button>
                    </div>
                  </div>
                ) : null}

                {sendCadence === "re-occurring" && recurringHasEndDate === "yes" ? (
                  <div className="mt-3">
                    <label className="text-xs font-medium text-foreground-secondary" htmlFor="activation-schedule-end-date">
                      End date
                    </label>
                    <input
                      id="activation-schedule-end-date"
                      type="date"
                      value={scheduledEndDate}
                      onChange={(e) => setScheduledEndDate(e.target.value)}
                      className="mt-1 h-9 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring/40"
                    />
                  </div>
                ) : null}
              </div>
            ) : null}

            <div className="mt-3 flex justify-end">
              <button
                type="button"
                onClick={() => setConnectionConfirmed(true)}
                disabled={!canConfirmActivationConnection}
                className={cn(
                  "rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
                  canConfirmActivationConnection
                    ? "bg-primary text-primary-foreground hover:bg-primary/90"
                    : "cursor-not-allowed bg-muted text-muted-foreground",
                )}
              >
                {connectionConfirmed ? "Confirmed" : "Confirm"}
              </button>
            </div>

            {connectionConfirmed ? (
              <>
                <div className="mt-3 rounded-xl border border-primary/30 bg-primary/5 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs font-medium uppercase tracking-normal text-muted-foreground">Activation confirmation</p>
                    <button
                      type="button"
                      onClick={() => {
                        if (!latestActivationId) return;
                        if (showApprovalPanel) {
                          window.dispatchEvent(new CustomEvent("prototype-master:close-activation-panel"));
                          setShowApprovalPanel(false);
                          return;
                        }

                        window.dispatchEvent(new CustomEvent("prototype-master:open-activation-panel", {
                          detail: { activationId: latestActivationId },
                        }));
                        setShowApprovalPanel(true);
                      }}
                      disabled={!latestActivationId}
                      className="inline-flex size-7 items-center justify-center rounded-lg border border-border bg-background text-foreground transition-colors hover:bg-accent"
                      title={showApprovalPanel ? "Collapse activation panel" : "Expand activation panel"}
                      aria-label={showApprovalPanel ? "Collapse activation panel" : "Expand activation panel"}
                    >
                      {showApprovalPanel ? (
                        <RiCollapseDiagonal2Line className="size-4" />
                      ) : (
                        <RiExpandDiagonal2Line className="size-4" />
                      )}
                    </button>
                  </div>

                  <div className="mt-2 space-y-2 text-sm">
                    <p className="text-foreground">
                      <span className="font-medium">Activation name:</span>{" "}
                      {activationName}
                    </p>
                    <p className="text-foreground">
                      <span className="font-medium">Activation definition:</span>{" "}
                      {activationDescription}
                    </p>
                    <p className="text-foreground">
                      <span className="font-medium">Population:</span>{" "}
                      {block.population}
                    </p>
                    <p className="text-foreground">
                      <span className="font-medium">Data source:</span>{" "}
                      {selectedSource?.name ?? "Not selected"}
                    </p>
                    <p className="text-foreground">
                      <span className="font-medium">Accounts:</span>{" "}
                      {selectedSourceAccounts
                        .filter((account) => selectedAccounts.includes(account.id))
                        .map((account) => account.name)
                        .join(", ")}
                    </p>

                    <div>
                      <p className="font-medium text-foreground">Field mapping:</p>
                      <ul className="mt-1 list-disc space-y-1 pl-5 text-foreground-secondary">
                        {fieldRows.map((row) => {
                          const fieldLabel = fieldTypeOptions.find((option) => option.value === row.fieldType)?.label ?? row.fieldType;
                          const matchLabel = (fieldMatchOptions[row.fieldType] ?? []).find((option) => option.value === row.selectedMatch)?.label ?? row.selectedMatch;
                          return (
                            <li key={`summary-${row.id}`}>
                              {fieldLabel} {"->"} {matchLabel}
                            </li>
                          );
                        })}
                      </ul>
                    </div>

                    <p className="text-foreground">
                      <span className="font-medium">Timing:</span>{" "}
                      {sendTiming === "schedule-send" ? "Schedule Send" : "Send Now"}
                    </p>
                    <p className="text-foreground">
                      <span className="font-medium">Cadence:</span>{" "}
                      {sendCadence === "re-occurring" ? "Re-Occuring" : "Once Off"}
                    </p>
                    <p className="text-foreground">
                      <span className="font-medium">Date range:</span>{" "}
                      {sendTiming === "schedule-send"
                        ? (sendCadence === "re-occurring"
                          ? (recurringHasEndDate === "yes"
                            ? `${scheduledStartDate || "Not selected"} to ${scheduledEndDate || "Not selected"}`
                            : `${scheduledStartDate || "Not selected"} to No End Date`)
                          : (scheduledStartDate || "Not selected"))
                        : "Not applicable"}
                    </p>

                    {sendTiming === "schedule-send" ? (
                      <>
                        <p className="text-foreground">
                          <span className="font-medium">Start date:</span>{" "}
                          {scheduledStartDate || "Not selected"}
                        </p>
                        {sendCadence === "re-occurring" ? (
                          <p className="text-foreground">
                            <span className="font-medium">End date:</span>{" "}
                            {recurringHasEndDate === "yes" ? (scheduledEndDate || "Not selected") : "No end date"}
                          </p>
                        ) : null}
                      </>
                    ) : null}
                  </div>
                </div>

                <div className="mt-3 rounded-xl border border-border bg-background p-3">
                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={() => {
                        if (approvalSent) return;

                        const activationId = `ac-${Date.now()}`;
                        const timestamp = new Date().toISOString();
                        const dateLabel = new Date().toLocaleDateString("en-AU", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                        });
                        const activationStatus = sendTiming === "schedule-send" ? "scheduled" : "sent";

                        dispatch({
                          type: "ADD_ARTIFACT",
                          artifact: {
                            id: `artifact-${activationId}`,
                            type: "activation",
                            name: activationName,
                            status: "saved",
                            savedAt: timestamp,
                            body: {
                              kind: "activation",
                              segmentId: block.segmentId,
                              segmentName: block.segmentName,
                              sourceMessageId,
                              conversationId: state.activeConversationId ?? undefined,
                            },
                          },
                        });

                        dispatch({
                          type: "ADD_ACTIVATION",
                          activation: {
                            id: activationId,
                            createdAt: timestamp,
                            name: activationName,
                            context: `From segment: ${block.segmentName}`,
                            segmentId: block.segmentId,
                            segmentName: block.segmentName,
                            channel: selectedSource?.name ?? "Multi-channel",
                            category: "MVP activation",
                            skill: "Activation build",
                            approval: { kind: "approved", by: "Izac", at: dateLabel },
                            status: activationStatus,
                            whenLabel: `Approved and sent · ${dateLabel}`,
                            scheduledDate: sendTiming === "schedule-send"
                              ? (scheduledStartDate || undefined)
                              : undefined,
                            recurringStartDate: sendCadence === "re-occurring"
                              ? ((sendTiming === "schedule-send" ? scheduledStartDate : undefined) || undefined)
                              : undefined,
                            recurringEndDate: sendCadence === "re-occurring" && recurringHasEndDate === "yes"
                              ? (scheduledEndDate || undefined)
                              : undefined,
                            result: "Activation approved and sent from MVP build card.",
                            invocations: [
                              {
                                skill: "Activation build",
                                params: `Segment ${block.segmentName} with ${selectedAccounts.length} selected account(s)` ,
                                result: "Sent",
                              },
                            ],
                            trail: [
                              { at: dateLabel, entry: "Activation connection confirmed." },
                              { at: dateLabel, entry: "Approved and sent from chat activation card." },
                            ],
                            mvpDetails: {
                              population: block.population,
                              activationName,
                              activationDefinition: activationDescription,
                              segmentName: block.segmentName,
                              dataSource: selectedSource?.name ?? "Not selected",
                              accounts: selectedSourceAccounts
                                .filter((account) => selectedAccounts.includes(account.id))
                                .map((account) => account.name),
                              fieldMapping: fieldRows.map((row) => {
                                const fieldLabel = fieldTypeOptions.find((option) => option.value === row.fieldType)?.label ?? row.fieldType;
                                const matchLabel = (fieldMatchOptions[row.fieldType] ?? []).find((option) => option.value === row.selectedMatch)?.label ?? row.selectedMatch;
                                return `${fieldLabel} -> ${matchLabel}`;
                              }),
                              timing: sendTiming === "schedule-send" ? "Schedule Send" : "Send Now",
                              cadence: sendCadence === "re-occurring" ? "Re-Occuring" : "Once Off",
                              customers: [
                                { id: `${activationId}-cust-1`, name: `${block.segmentName} - Ava Thompson`, meta: "AOV $142 · Last purchase 34 days ago" },
                                { id: `${activationId}-cust-2`, name: `${block.segmentName} - Liam Nguyen`, meta: "AOV $129 · Last purchase 49 days ago" },
                                { id: `${activationId}-cust-3`, name: `${block.segmentName} - Mia Rodriguez`, meta: "AOV $151 · Last purchase 62 days ago" },
                              ],
                            },
                          },
                        });

                        window.dispatchEvent(new CustomEvent("prototype-master:open-activation-panel", {
                          detail: { activationId },
                        }));

                        setApprovalSent(true);
                        setLatestActivationId(activationId);
                        setShowApprovalPanel(true);
                      }}
                      disabled={approvalSent}
                      className={cn(
                        "rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
                        approvalSent
                          ? "cursor-not-allowed bg-muted text-muted-foreground"
                          : "bg-primary text-primary-foreground hover:bg-primary/90",
                      )}
                    >
                      {approvalSent ? "Approved and Sent" : "Approve and Send"}
                    </button>
                  </div>
                </div>
              </>
            ) : null}
          </div>
        </>
      ) : null}
    </div>
  );
}

// ─── Block renderer (text streams; other blocks reveal with a skeleton) ──────

function PlayedBlockView({
  rb,
  messageId,
  live,
  reasoningEditSessionActive,
  onActionClick,
  onSegmentOpenPanel,
  onSegmentApprove,
  onSegmentActivate,
  onConfirmReasoning,
  onRejectReasoning,
  onRequestEditReasoning,
}: {
  rb: RevealBlock;
  messageId: string;
  live?: boolean;
  reasoningEditSessionActive?: boolean;
  onActionClick?: (actionId: string, label: string) => void;
  onSegmentOpenPanel?: (payload: SegmentConfirmedPayload) => void;
  onSegmentApprove?: (payload: SegmentConfirmedPayload) => void;
  onSegmentActivate?: (payload: SegmentConfirmedPayload) => void;
  onConfirmReasoning?: () => void;
  onRejectReasoning?: () => void;
  onRequestEditReasoning?: () => void;
}) {
  const { block } = rb;
  switch (block.type) {
    case "text": {
      const partial = revealPrefix(block.content, rb.revealed);
      return <RichText content={partial} />;
    }
    case "reasoning":
      return (
        <BlockReveal skeleton={<Skeleton className="h-32 w-full" />}>
          <ReasoningBlock
            goal={block.goal}
            assumptions={block.assumptions}
            mode={block.mode}
            live={live}
            onSegmentOpenPanel={onSegmentOpenPanel}
            onSegmentApprove={onSegmentApprove}
            onSegmentActivate={onSegmentActivate}
            onConfirm={onConfirmReasoning}
            onReject={onRejectReasoning}
            onRequestEdit={onRequestEditReasoning}
            editSessionActive={reasoningEditSessionActive}
          />
        </BlockReveal>
      );
    case "proposed":
      return (
        <BlockReveal skeleton={<Skeleton className="h-44 w-full" />}>
          <ProposedBlock artifactId={block.artifactId} collapseWhenRefined={block.collapseWhenRefined} />
        </BlockReveal>
      );
    case "summary":
      return (
        <BlockReveal skeleton={<Skeleton className="h-16 w-full" />}>
          <SummaryPointer artifactId={block.artifactId} />
        </BlockReveal>
      );
    case "chart":
      return (
        <BlockReveal skeleton={<Skeleton className="h-44 w-full" />}>
          <ChartBlock chart={block.chart} />
        </BlockReveal>
      );
    case "tool":
      return (
        <div className="flex items-center gap-2 rounded-lg border border-border/40 bg-muted/30 px-2.5 py-1.5">
          <RiCheckLine className="size-3 text-primary" />
          <span className="text-sm text-muted-foreground">{block.label}</span>
        </div>
      );

    case "actions":
      return (
        <div className="flex flex-wrap gap-2">
          {block.actions.map((action) => (
            (() => {
              const disabled =
                block.disabledActionIds?.includes(action.id)
                ||
                action.id === "bf-dive-reactivation-window"
                || action.id === "bf-dive-timing-window"
                || action.id === "segment-explore-near-miss"
                || action.id === "segment-explore-timing";
              return (
            <button
              key={action.id}
              onClick={disabled ? undefined : () => onActionClick?.(action.id, action.label)}
              disabled={disabled}
              className={cn(
                "rounded-lg border border-border/70 bg-card px-3 py-1.5 text-sm font-medium text-foreground transition-colors",
                disabled ? "cursor-not-allowed opacity-50" : "hover:bg-accent",
              )}
            >
              {action.label}
            </button>
              );
            })()
          ))}
        </div>
      );

    case "activationBuild":
      return (
        <BlockReveal skeleton={<Skeleton className="h-56 w-full" />}>
          <ActivationBuildCard block={block} sourceMessageId={messageId} />
        </BlockReveal>
      );

    case "activationConnect":
      return null;

    case "flow":
      return null;
  }
}

// ─── Sources bar (common citation widget under each response) ────────────────

function SourcesBar({ ids }: { ids: string[] }) {
  const { dispatch } = useSession();
  const defs = ids.map((id) => getDef(id)).filter((d): d is NonNullable<typeof d> => Boolean(d));
  if (defs.length === 0) return null;

  const MAX = 3;
  const shown = defs.slice(0, MAX);
  const extra = defs.length - shown.length;

  return (
    <button
      onClick={() => dispatch({ type: "OPEN_SOURCES", ids })}
      title="View sources"
      className="mt-0.5 flex w-fit max-w-full items-center gap-1.5 overflow-hidden rounded-lg border border-border/60 bg-muted/30 px-2.5 py-1.5 text-left transition-colors hover:border-primary/40 hover:bg-accent"
    >
      <RiBookOpenLine className="size-3.5 shrink-0 text-muted-foreground" />
      <span className="shrink-0 text-xs font-medium text-muted-foreground">Sources:</span>
      <span className="flex min-w-0 items-center gap-1">
        {shown.map((d) => (
          <span
            key={d.id}
            className="shrink-0 whitespace-nowrap rounded-md border border-border/60 bg-card px-1.5 py-0.5 text-xs text-foreground-secondary"
          >
            {d.name}
          </span>
        ))}
        {extra > 0 && (
          <span className="shrink-0 whitespace-nowrap text-xs font-medium text-muted-foreground">+{extra} more</span>
        )}
      </span>
    </button>
  );
}

// ─── Message view ────────────────────────────────────────────────────────────

function MessageView({
  message,
  userRef,
  liveReasoning,
  reasoningEditSessionActive,
  onActionClick,
  onSegmentOpenPanel,
  onSegmentApprove,
  onSegmentActivate,
  onConfirmReasoning,
  onRejectReasoning,
  onRequestEditReasoning,
  reactions,
  onToggleReaction,
}: {
  message: PlayedMessage;
  userRef?: React.Ref<HTMLDivElement>;
  /** This message hosts the pending verify step (assumptions stay editable). */
  liveReasoning?: boolean;
  reasoningEditSessionActive?: boolean;
  onActionClick?: (actionId: string, label: string) => void;
  onSegmentOpenPanel?: (payload: SegmentConfirmedPayload) => void;
  onSegmentApprove?: (payload: SegmentConfirmedPayload) => void;
  onSegmentActivate?: (payload: SegmentConfirmedPayload) => void;
  onConfirmReasoning?: () => void;
  onRejectReasoning?: () => void;
  onRequestEditReasoning?: () => void;
  reactions: ReactionState;
  onToggleReaction: (messageId: string, key: ReactionKey) => void;
}) {
  if (message.role === "user") {
    return (
      <div ref={userRef} className="flex flex-col gap-3 animate-in fade-in-0 slide-in-from-bottom-2 duration-200">
        <div className="self-end max-w-[85%]">
          <div className="bg-card border border-border rounded-2xl px-4 py-2.5 text-sm text-foreground break-words leading-relaxed">
            <MentionText content={message.text} />
          </div>
        </div>
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-1.5 animate-in fade-in-0 duration-300" data-message-id={message.id}>
      <h4 className="text-sm font-semibold text-primary flex items-center gap-1.5">
        <LexiMark className="size-3.5" />
        Lexi
      </h4>
      <div className="flex flex-col gap-3">
        {message.blocks.map((rb) => (
          <PlayedBlockView
            key={rb.id}
            rb={rb}
            messageId={message.id}
            live={liveReasoning}
            reasoningEditSessionActive={reasoningEditSessionActive}
            onActionClick={onActionClick}
            onSegmentOpenPanel={onSegmentOpenPanel}
            onSegmentApprove={onSegmentApprove}
            onSegmentActivate={onSegmentActivate}
            onConfirmReasoning={onConfirmReasoning}
            onRejectReasoning={onRejectReasoning}
            onRequestEditReasoning={onRequestEditReasoning}
          />
        ))}
        {message.sources && message.sources.length > 0 && <SourcesBar ids={message.sources} />}
        <div className="flex items-center gap-2 pt-1">
          <ReactionButton
            icon={RiThumbUpLine}
            active={reactions.up}
            onClick={() => onToggleReaction(message.id, "up")}
            title="Thumbs up"
          />
          <ReactionButton
            icon={RiThumbDownLine}
            active={reactions.down}
            onClick={() => onToggleReaction(message.id, "down")}
            title="Thumbs down"
          />
          <ReactionButton
            icon={RiPushpin2Line}
            active={reactions.pin}
            onClick={() => onToggleReaction(message.id, "pin")}
            title="Pin"
          />
        </div>
      </div>
    </div>
  );
}

function ReactionButton({
  icon: Icon,
  active,
  onClick,
  title,
}: {
  icon: React.ComponentType<{ className?: string }>;
  active: boolean;
  onClick: () => void;
  title: string;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      className={cn(
        "flex size-8 items-center justify-center rounded-md border text-sm transition-colors",
        active
          ? "border-primary/60 bg-primary/10"
          : "border-border/60 bg-card hover:bg-accent"
      )}
    >
      <Icon className="size-4" aria-hidden="true" />
    </button>
  );
}

// ─── Empty start screen heading (mark + title only) ──────────────────────────
// The prompt editor and its suggested prompts live in the composer block so they
// can ride the centre→bottom transition together.

function StartHero() {
  return (
    <div className="flex flex-col items-center gap-4 text-center animate-in fade-in-0 duration-300">
      <LexiMark className="size-11" />
      <h2 className="text-lg font-semibold text-foreground">What are we working on?</h2>
    </div>
  );
}

// Suggested seed prompts shown under the editor on the empty screen.
function StartPrompts({
  prompts,
  onPick,
  onQuickBuildSegment,
  onQuickBuildActivation,
  onQuickSegmentActivationSingleChat,
}: {
  prompts: { id: string; text: string }[];
  onPick: (p: { id: string; text: string }) => void;
  onQuickBuildSegment: () => void;
  onQuickBuildActivation: () => void;
  onQuickSegmentActivationSingleChat: () => void;
}) {
  const quickStartAnchorPrompt = "Black Friday is in a few weeks and I would like to know about my customers from last year.";

  return (
    <div className="mt-3 flex flex-col gap-2 animate-in fade-in-0 duration-300">
      {prompts.map((p) => (
        <div key={p.id} className="flex flex-col gap-1.5">
          <button
            onClick={() => onPick(p)}
            className="rounded-xl border border-border bg-card px-4 py-2.5 text-left text-sm text-foreground-secondary transition-colors hover:bg-accent"
          >
            “{p.text}”
          </button>
          {p.text.trim() === quickStartAnchorPrompt ? (
            <>
              <button
                type="button"
                onClick={onQuickBuildSegment}
                className="rounded-xl border border-border bg-card px-4 py-2.5 text-left text-sm text-foreground-secondary transition-colors hover:bg-accent"
              >
                "Build a new segment"
              </button>
              <button
                type="button"
                onClick={onQuickBuildActivation}
                className="rounded-xl border border-border bg-card px-4 py-2.5 text-left text-sm text-foreground-secondary transition-colors hover:bg-accent"
              >
                "Build A New Activation"
              </button>
              <button
                type="button"
                onClick={onQuickSegmentActivationSingleChat}
                className="rounded-xl border border-border bg-card px-4 py-2.5 text-left text-sm text-foreground-secondary transition-colors hover:bg-accent"
              >
                "Segment and Activation - single chat"
              </button>
            </>
          ) : null}
        </div>
      ))}
    </div>
  );
}

// ─── Suggested next prompt (guided demo affordance) ──────────────────────────

function SuggestionChip({ text, onSend }: { text: string; onSend: () => void }) {
  return (
    <button
      onClick={onSend}
      className="group mb-2 flex w-full items-center gap-2 rounded-lg border border-dashed border-border bg-card/50 px-3 py-2 text-left text-sm text-foreground-secondary transition-colors hover:border-primary/40 hover:bg-accent"
    >
      <span className="min-w-0 flex-1 truncate text-foreground">{text}</span>
      <RiCornerDownLeftLine className="size-3.5 shrink-0 text-muted-foreground transition-colors group-hover:text-primary" />
    </button>
  );
}

// ─── Chat panel ───────────────────────────────────────────────────────────────

interface ChatPanelProps {
  narrow?: boolean;
}

export function ChatPanel({ narrow }: ChatPanelProps) {
  const { state, dispatch } = useSession();
  const mentionGroups = useMemo(() => buildMentionGroups(state.activations), [state.activations]);
  const plusSegmentItems = useMemo<DefRef[]>(() => {
    const savedSegments = Array.from(state.artifacts.values())
      .filter((artifact) => artifact.type === "segment" && artifact.status === "saved" && artifact.body?.kind === "segment")
      .sort((a, b) => segmentCreatedAtMs(b) - segmentCreatedAtMs(a));

    const savedSegmentRefs = savedSegments.map((artifact) => ({
      id: artifact.id,
      kind: "segment" as const,
      name: artifact.name,
      entity: artifact.def?.entity ?? "customer",
      description: artifact.def?.description
        ?? (artifact.body?.kind === "segment" ? (artifact.body.purpose ?? undefined) : undefined)
        ?? "Segment",
      logic: artifact.def?.logic,
      stat: artifact.def?.stat,
    }));

    const dummyRefs = DUMMY_SEGMENTS.map(dummySegmentToDefRef);
    return [...dummyRefs, ...savedSegmentRefs.filter((saved) => !dummyRefs.some((dummy) => dummy.id === saved.id))];
  }, [state.artifacts]);

  useEffect(() => {
    registerDefs(plusSegmentItems);
  }, [plusSegmentItems]);

  const conversation: Conversation | undefined = useMemo(
    () => CONVERSATIONS.find((c) => c.id === state.activeConversationId),
    [state.activeConversationId],
  );

  const [messages, setMessages] = useState<PlayedMessage[]>([]);
  const [messageReactions, setMessageReactions] = useState<Record<string, ReactionState>>({});
  const [thinking, setThinking] = useState<{ steps: ThinkingStep[] } | null>(null);
  const [busy, setBusy] = useState(false);
  const [turnIndex, setTurnIndex] = useState(0);
  const [awaitingMvpSegmentKind, setAwaitingMvpSegmentKind] = useState(false);
  const [awaitingReasoningEditTarget, setAwaitingReasoningEditTarget] = useState<ReasoningEditTarget | null>(null);
  const [reasoningCancelMode, setReasoningCancelMode] = useState<ReasoningCancelMode | null>(null);
  const [activationBuildState, setActivationBuildState] = useState<ActivationBuildState>(IDLE_ACTIVATION_BUILD_STATE);
  const [pendingActivationCancelId, setPendingActivationCancelId] = useState<string | null>(null);
    const promptReasoningCancelInChat = useCallback(() => {
      const response = "Are you sure you want to cancel? Segment build will be lost.";
      setMessages((ms) => [
        ...ms,
        {
          id: `pm-${++idRef.current}`,
          role: "lexi",
          blocks: [
            {
              id: `pb-${++idRef.current}`,
              block: { type: "text", content: response },
              revealed: words(response).length,
            },
            {
              id: `pb-${++idRef.current}`,
              block: {
                type: "actions",
                actions: [
                  { id: "reasoning-cancel-yes", label: "Yes" },
                  { id: "reasoning-cancel-no", label: "No" },
                ],
              },
              revealed: 1,
            },
          ],
        },
      ]);
    }, []);
  const bfInsightFollowupIndexRef = useRef(0);

  const idRef = useRef(0);
  const turnRef = useRef(0);
  const busyRef = useRef(false);
  const abortRef = useRef<AbortController | null>(null);
  const advanceRef = useRef<(text?: string) => void>(() => {});
  const submitRef = useRef<(text: string, mentionIds: string[]) => void>(() => {});
  const lastUserRef = useRef<HTMLDivElement>(null);
  const prevCount = useRef(0);
  const prevConversationIdRef = useRef<string | null>(null);
  const nextId = () => `pm-${++idRef.current}`;

  // ── Append / mutate helpers ──
  const appendBlock = useCallback((mid: string, rb: RevealBlock) => {
    setMessages((ms) => ms.map((m) => (m.id === mid && m.role === "lexi" ? { ...m, blocks: [...m.blocks, rb] } : m)));
  }, []);
  const setRevealed = useCallback((mid: string, blockId: string, n: number) => {
    setMessages((ms) =>
      ms.map((m) =>
        m.id === mid && m.role === "lexi"
          ? { ...m, blocks: m.blocks.map((b) => (b.id === blockId ? { ...b, revealed: n } : b)) }
          : m,
      ),
    );
  }, []);

  const toggleReaction = useCallback((messageId: string, key: ReactionKey) => {
    let pinNextState: boolean | null = null;
    setMessageReactions((prev) => {
      const current = prev[messageId] ?? EMPTY_REACTIONS;
      let next: ReactionState = { ...current };
      if (key === "up") {
        const nextUp = !current.up;
        next = { ...next, up: nextUp, down: nextUp ? false : current.down };
      } else if (key === "down") {
        const nextDown = !current.down;
        next = { ...next, down: nextDown, up: nextDown ? false : current.up };
      } else {
        next = { ...next, [key]: !current[key] };
      }

      if (key === "pin") pinNextState = next.pin;

      return { ...prev, [messageId]: next };
    });

    if (key === "pin" && pinNextState != null) {
      const pinId = `msg-pin-${messageId}`;
      if (pinNextState) {
        const source = messages.find((m) => m.id === messageId);
        const text =
          source?.role === "lexi"
            ? source.blocks
                .flatMap((b) => (b.block.type === "text" ? [b.block.content.trim()] : []))
                .filter(Boolean)
                .join("\n")
            : "";
        dispatch({
          type: "ADD_PIN",
          pin: {
            id: pinId,
            text: text || "Pinned response",
            sourceMessageId: messageId,
            sentenceStartOffset: 0,
          },
        });
      } else {
        dispatch({ type: "REMOVE_PIN", id: pinId });
      }
    }
  }, [dispatch, messages]);

  // ── Once the first message lands, let the shell slide the context panel in ──
  useEffect(() => {
    if (messages.length > 0 && !state.chatStarted) dispatch({ type: "MARK_CHAT_STARTED" });
  }, [messages.length, state.chatStarted, dispatch]);

  // ── Auto-scroll: bring each new user message near the top ──
  useEffect(() => {
    if (messages.length > prevCount.current) {
      const added = messages[prevCount.current];
      if (added?.role === "user" && lastUserRef.current) {
        const el = lastUserRef.current;
        const sc = el.closest<HTMLElement>('[class*="overflow-y"]');
        if (sc) {
          const top = sc.scrollTop + (el.getBoundingClientRect().top - sc.getBoundingClientRect().top) - 16;
          sc.scrollTo({ top, behavior: "smooth" });
        }
      }
    }
    prevCount.current = messages.length;
  }, [messages]);

  async function runThinking(steps: ThinkingStep[], signal: AbortSignal): Promise<number> {
    const start = Date.now();
    let local: ThinkingStep[] = steps.map((s, i) => ({ ...s, status: i === 0 ? "active" : "pending" }));
    setThinking({ steps: local });
    for (let i = 1; i < steps.length; i++) {
      await wait(jitter(steps[i - 1].durationMs ?? 700), signal);
      local = local.map((s, idx) => (idx === i ? { ...s, status: "active" } : idx === i - 1 ? { ...s, status: "done" } : s));
      setThinking({ steps: [...local] });
    }
    await wait(jitter(steps[steps.length - 1].durationMs ?? 700), signal);
    setThinking({ steps: local.map((s) => ({ ...s, status: "done" as const })) });
    await wait(250, signal);
    return Date.now() - start;
  }

  async function streamBlocks(mid: string, blocks: ContentBlock[], signal: AbortSignal) {
    for (const block of blocks) {
      const bid = `pb-${++idRef.current}`;
      if (block.type === "text") {
        const total = words(block.content).length;
        appendBlock(mid, { id: bid, block, revealed: 0 });
        for (let k = 1; k <= total; k++) {
          await wait(26 + Math.random() * 16, signal);
          setRevealed(mid, bid, k);
        }
      } else {
        await wait(280, signal);
        appendBlock(mid, { id: bid, block, revealed: 1 });
        await wait(70, signal);
      }
    }
  }

  // End-of-script fallback for free-text sent after the last scripted turn.
  const END_NOTE =
    "That's the end of this scripted demo — hit Restart below to run it again, or open another conversation.";

  const bfInsightFollowups: Array<{ blocks: ContentBlock[]; suggestBuildSegment: boolean }> = [
    {
      suggestBuildSegment: true,
      blocks: [
      {
        type: "text",
        content:
          "## Reactivation signal\nWithin lapsed audiences, [[def-lapsed]] customers in the **90-180 day** window materially outperformed deeper-lapsed customers.",
      },
      {
        type: "chart",
        chart: {
          kind: "bar",
          title: "Lapsed cohort conversion (BF week)",
          unit: "%",
          series: ["Conversion"],
          data: [
            { label: "90-180d", values: [16] },
            { label: "180d+", values: [7] },
          ],
          caption: "The 90-180 day group converted more than 2x better.",
        },
      },
      { type: "proposed", artifactId: "bf-insight-reactivation-window" },
      ],
    },
    {
      suggestBuildSegment: false,
      blocks: [
      {
        type: "chart",
        chart: {
          kind: "line",
          title: "Cumulative BF revenue (first 5 days)",
          unit: "$K",
          series: ["Revenue"],
          data: [
            { label: "H12", values: [312] },
            { label: "H24", values: [566] },
            { label: "H48", values: [958] },
            { label: "D3", values: [1225] },
            { label: "D5", values: [1472] },
          ],
          caption: "More than half of revenue arrived in the first 48 hours.",
        },
      },
      { type: "proposed", artifactId: "bf-insight-timing" },
      {
        type: "text",
        content:
          "Those are the key insights from last year's Black Friday customers. If you want, we can now build a segment from the 90-180 day lapsed signal.",
      },
      ],
    },
  ];

  // ── Play exactly one turn, then stop and wait for the next user input ──
  function advance(userText?: string) {
    if (busyRef.current) return;

    // No active conversation (blank New Chat) → start the default one.
    if (!conversation) {
      dispatch({ type: "SELECT_CONVERSATION", id: DEFAULT_CONVERSATION_ID, autoStart: true });
      return;
    }

    const idx = turnRef.current;
    const turn = conversation.turns[idx];

    busyRef.current = true;
    setBusy(true);
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    const signal = controller.signal;

    (async () => {
      try {
        if (!turn) {
          // Past the script — acknowledge the free-text send briefly.
          setMessages((ms) => [...ms, { id: nextId(), role: "user", text: userText || "Thanks!" }]);
          await wait(400, signal);
          const mid = nextId();
          setMessages((arr) => [...arr, { id: mid, role: "lexi", blocks: [] }]);
          await streamBlocks(mid, [{ type: "text", content: END_NOTE }], signal);
          return;
        }

        const text = userText ?? turn.user.text;
        setMessages((ms) => [...ms, { id: nextId(), role: "user", text }]);
        await wait(450, signal);

        const steps = toThinkingSteps(turn.thinking);
        const elapsed = await runThinking(steps, signal);
        setThinking(null);

        // Apply any turn side-effects (e.g. refining the segment in place) so the
        // refined card renders live and the earlier card can collapse.
        turn.effects?.forEach((effect) => dispatch(effect));

        const mid = nextId();
        setMessages((arr) => [
          ...arr,
          {
            id: mid,
            role: "lexi",
            thinking: steps.map((s) => ({ ...s, status: "done" as const })),
            thinkingSummary: `${turn.thinkingLabel} · ${(elapsed / 1000).toFixed(1)}s`,
            blocks: [],
          },
        ]);
        await streamBlocks(mid, turn.blocks, signal);

        // Surface the response's sources once it's finished streaming.
        if (turn.sources?.length) {
          const srcs = turn.sources;
          setMessages((arr) => arr.map((m) => (m.id === mid && m.role === "lexi" ? { ...m, sources: srcs } : m)));
        }

        turnRef.current = idx + 1;
        setTurnIndex(idx + 1);
      } catch {
        // aborted — a newer turn / conversation switch took over
      } finally {
        if (!signal.aborted) {
          busyRef.current = false;
          setBusy(false);
        }
      }
    })();
  }
  advanceRef.current = advance;

  // ── Submit handler: an @-mention of a saved segment can start its conversation ──
  // From the empty start screen, mentioning e.g. "Holiday win-back" selects and
  // auto-plays its scripted conversation. Otherwise we fall through to normal play.
  function handleSubmit(text: string, mentionIds: string[]) {
    const activationPrompt = "Select the segment you would you like to activate from the chat";
    const confirmationPrompt = "Is this the right segment to activate?";

    if (pendingActivationCancelId) {
      const normalizedCancelDecision = stripMentions(text)
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, " ")
        .replace(/\s+/g, " ")
        .trim();
      const confirmsCancel = normalizedCancelDecision === "yes" || normalizedCancelDecision.includes("yes");
      const declinesCancel = normalizedCancelDecision === "no"
        || normalizedCancelDecision.startsWith("no")
        || normalizedCancelDecision.includes(" no ");

      if (confirmsCancel) {
        const activation = state.activations.find((item) => item.id === pendingActivationCancelId)
          ?? getActivation(pendingActivationCancelId);
        dispatch({ type: "UPDATE_ACTIVATION_STATUS", id: pendingActivationCancelId, status: "cancelled" });
        setPendingActivationCancelId(null);

        const confirmText = activation
          ? `Activation ${activation.name} is now cancelled.`
          : "The activation is now cancelled.";
        setMessages((ms) => [
          ...ms,
          { id: nextId(), role: "user", text },
          {
            id: nextId(),
            role: "lexi",
            blocks: [
              {
                id: `pb-${++idRef.current}`,
                block: { type: "text", content: confirmText },
                revealed: words(confirmText).length,
              },
            ],
          },
        ]);
        return;
      }

      if (declinesCancel) {
        setPendingActivationCancelId(null);
        const keepText = "No problem. I will keep the activation running.";
        setMessages((ms) => [
          ...ms,
          { id: nextId(), role: "user", text },
          {
            id: nextId(),
            role: "lexi",
            blocks: [
              {
                id: `pb-${++idRef.current}`,
                block: { type: "text", content: keepText },
                revealed: words(keepText).length,
              },
            ],
          },
        ]);
        return;
      }

      const reprompt = "Please answer Yes or No.";
      setMessages((ms) => [
        ...ms,
        { id: nextId(), role: "user", text },
        {
          id: nextId(),
          role: "lexi",
          blocks: [
            {
              id: `pb-${++idRef.current}`,
              block: { type: "text", content: reprompt },
              revealed: words(reprompt).length,
            },
            {
              id: `pb-${++idRef.current}`,
              block: {
                type: "actions",
                actions: [
                  { id: "activation-cancel-yes", label: "Yes" },
                  { id: "activation-cancel-no", label: "No" },
                ],
              },
              revealed: 1,
            },
          ],
        },
      ]);
      return;
    }

    const findMentionedSegment = (): { id: string; name: string } | null => {
      for (const id of mentionIds) {
        const artifact = state.artifacts.get(id);
        if (artifact?.type === "segment") {
          return { id, name: artifact.name };
        }
        const def = getDef(id);
        if (def?.kind === "segment") {
          return { id, name: def.name };
        }
      }
      return null;
    };

    const ensureSegmentArtifact = (segmentId: string, segmentName: string) => {
      const existing = state.artifacts.get(segmentId);
      if (existing?.type === "segment") return;

      const dummy = DUMMY_SEGMENT_BY_ID[segmentId];
      if (!dummy) return;

      const def = dummySegmentToDefRef(dummy);
      dispatch({
        type: "ADD_ARTIFACT",
        artifact: {
          id: segmentId,
          type: "segment",
          name: segmentName,
          status: "saved",
          def,
          body: {
            kind: "segment",
            purpose: dummy.summary,
            criteria: dummy.validation,
            population: dummy.population,
          },
        },
      });
    };

    const segmentConfirmationCard = (segmentId: string, segmentName: string): Extract<ContentBlock, { type: "reasoning" }> => {
      const dummy = DUMMY_SEGMENT_BY_ID[segmentId];
      const artifact = state.artifacts.get(segmentId);

      const description = dummy?.summary
        ?? (artifact?.body?.kind === "segment" ? (artifact.body.purpose ?? "") : "");
      const population = dummy?.population
        ?? (artifact?.body?.kind === "segment" ? (artifact.body.population ?? "2,840") : "2,840");
      const validation = dummy?.validation
        ?? (artifact?.body?.kind === "segment" ? (artifact.body.criteria ?? []) : []);
      const recommendations = dummy?.recommendations ?? [
        "Launch with a narrow first wave and validate conversion quality",
        "Prioritise high-intent windows before broad expansion",
        "Track incremental revenue and suppression impact",
      ];

      return {
        type: "reasoning",
        mode: "confirmation",
        goal: `Confirm this segment before activation: ${segmentName}`,
        assumptions: [
          { id: `activation-population-${segmentId}`, label: "Population", value: population },
          { id: `activation-segment-name-${segmentId}`, label: "Segment name", value: segmentName },
          ...(description
            ? [{ id: `activation-segment-description-${segmentId}`, label: "Segment description", value: description }]
            : []),
          ...(validation.length > 0
            ? validation.map((item, idx) => ({
                id: `activation-validation-${segmentId}-${idx}`,
                label: "Validation",
                value: item,
              }))
            : [{ id: `activation-validation-${segmentId}-none`, label: "Validation", value: "No validation available" }]),
          ...recommendations.map((item, idx) => ({
            id: `activation-recommendation-${segmentId}-${idx}`,
            label: "Recommendation",
            value: item,
          })),
        ],
      };
    };

    const appendUserAndLexiText = (lexiText: string) => {
      setMessages((ms) => [
        ...ms,
        { id: nextId(), role: "user", text },
        {
          id: nextId(),
          role: "lexi",
          blocks: [
            {
              id: `pb-${++idRef.current}`,
              block: { type: "text", content: lexiText },
              revealed: words(lexiText).length,
            },
          ],
        },
      ]);
    };

    const markLatestActivationConfirmationNo = () => {
      setMessages((ms) => {
        const next = [...ms];
        for (let i = next.length - 1; i >= 0; i--) {
          const message = next[i];
          if (message.role !== "lexi") continue;

          let changed = false;
          const blocks = message.blocks.map((rb) => {
            if (rb.block.type !== "actions") return rb;
            const actionIds = new Set(rb.block.actions.map((action) => action.id));
            if (!actionIds.has("activation-segment-yes") || !actionIds.has("activation-segment-no") || !actionIds.has("activation-segment-cancel")) {
              return rb;
            }

            changed = true;
            return {
              ...rb,
              block: {
                ...rb.block,
                disabledActionIds: ["activation-segment-yes", "activation-segment-cancel"],
              },
            };
          });

          if (changed) {
            next[i] = { ...message, blocks };
            break;
          }
        }
        return next;
      });
    };

    const markLatestActivationConfirmationCanceled = () => {
      setMessages((ms) => {
        const next = [...ms];
        for (let i = next.length - 1; i >= 0; i--) {
          const message = next[i];
          if (message.role !== "lexi") continue;

          let changed = false;
          const blocks = message.blocks.map((rb) => {
            if (rb.block.type !== "actions") return rb;
            const actionIds = new Set(rb.block.actions.map((action) => action.id));
            if (!actionIds.has("activation-segment-yes") || !actionIds.has("activation-segment-no") || !actionIds.has("activation-segment-cancel")) {
              return rb;
            }

            changed = true;
            return {
              ...rb,
              block: {
                ...rb.block,
                disabledActionIds: ["activation-segment-yes", "activation-segment-no", "activation-segment-cancel"],
              },
            };
          });

          if (changed) {
            next[i] = { ...message, blocks };
            break;
          }
        }
        return next;
      });
    };

    const normalizedTextForActivation = stripMentions(text)
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, " ")
      .replace(/\s+/g, " ")
      .trim();

    const startsActivationBuild =
      normalizedTextForActivation.includes("activation")
      && (normalizedTextForActivation.includes("build")
        || normalizedTextForActivation.includes("create")
        || normalizedTextForActivation.includes("new")
        || normalizedTextForActivation.includes("start"));

    if (startsActivationBuild && activationBuildState.stage === "idle") {
      const segment = findMentionedSegment();

      if (!segment) {
        setActivationBuildState({ stage: "await-segment" });
        appendUserAndLexiText(activationPrompt);
        return;
      }

      ensureSegmentArtifact(segment.id, segment.name);
      const detailsCard = segmentConfirmationCard(segment.id, segment.name);
      setActivationBuildState({ stage: "await-confirmation", segmentId: segment.id, segmentName: segment.name });
      setMessages((ms) => [
        ...ms,
        { id: nextId(), role: "user", text },
        {
          id: nextId(),
          role: "lexi",
          blocks: [
            {
              id: `pb-${++idRef.current}`,
              block: detailsCard,
              revealed: 1,
            },
            {
              id: `pb-${++idRef.current}`,
              block: { type: "text", content: confirmationPrompt },
              revealed: words(confirmationPrompt).length,
            },
            {
              id: `pb-${++idRef.current}`,
              block: {
                type: "actions",
                actions: [
                  { id: "activation-segment-yes", label: "Yes" },
                  { id: "activation-segment-no", label: "No" },
                  { id: "activation-segment-cancel", label: "Cancel" },
                ],
              },
              revealed: 1,
            },
          ],
        },
      ]);
      return;
    }

    if (activationBuildState.stage === "await-segment") {
      const segment = findMentionedSegment();

      if (!segment) {
        appendUserAndLexiText(activationPrompt);
        return;
      }

      ensureSegmentArtifact(segment.id, segment.name);
      const detailsCard = segmentConfirmationCard(segment.id, segment.name);
      setActivationBuildState({ stage: "await-confirmation", segmentId: segment.id, segmentName: segment.name });
      setMessages((ms) => [
        ...ms,
        { id: nextId(), role: "user", text },
        {
          id: nextId(),
          role: "lexi",
          blocks: [
            {
              id: `pb-${++idRef.current}`,
              block: detailsCard,
              revealed: 1,
            },
            {
              id: `pb-${++idRef.current}`,
              block: { type: "text", content: confirmationPrompt },
              revealed: words(confirmationPrompt).length,
            },
            {
              id: `pb-${++idRef.current}`,
              block: {
                type: "actions",
                actions: [
                  { id: "activation-segment-yes", label: "Yes" },
                  { id: "activation-segment-no", label: "No" },
                  { id: "activation-segment-cancel", label: "Cancel" },
                ],
              },
              revealed: 1,
            },
          ],
        },
      ]);
      return;
    }

    if (activationBuildState.stage === "await-confirmation") {
      if (normalizedTextForActivation === "yes" || normalizedTextForActivation.includes("yes")) {
        const segmentId = activationBuildState.segmentId ?? "";
        const segmentName = activationBuildState.segmentName ?? "Selected segment";
        const dummy = segmentId ? DUMMY_SEGMENT_BY_ID[segmentId] : undefined;
        const artifact = segmentId ? state.artifacts.get(segmentId) : undefined;
        const population = dummy?.population
          ?? (artifact?.body?.kind === "segment" ? (artifact.body.population ?? "2,840") : "2,840");
        const rules = dummy?.validation
          ?? (artifact?.body?.kind === "segment" ? (artifact.body.criteria ?? []) : []);

        setActivationBuildState(IDLE_ACTIVATION_BUILD_STATE);
        setMessages((ms) => [
          ...ms,
          { id: nextId(), role: "user", text },
          {
            id: nextId(),
            role: "lexi",
            blocks: [
              {
                id: `pb-${++idRef.current}`,
                block: {
                  type: "activationBuild",
                  segmentId,
                  segmentName,
                  population,
                  rules,
                  activationName: `${segmentName} Activation`,
                  activationDescription: `Activation from Segment: ${segmentName}`,
                },
                revealed: 1,
              },
            ],
          },
        ]);
        return;
      }

      if (normalizedTextForActivation === "cancel" || normalizedTextForActivation.includes("cancel")) {
        setActivationBuildState({
          stage: "await-cancel-confirmation",
          segmentId: activationBuildState.segmentId,
          segmentName: activationBuildState.segmentName,
        });
        setMessages((ms) => [
          ...ms,
          { id: nextId(), role: "user", text },
          {
            id: nextId(),
            role: "lexi",
            blocks: [
              {
                id: `pb-${++idRef.current}`,
                block: { type: "text", content: "Are you sure you want to cancel?" },
                revealed: words("Are you sure you want to cancel?").length,
              },
              {
                id: `pb-${++idRef.current}`,
                block: {
                  type: "actions",
                  actions: [
                    { id: "activation-cancel-confirm-yes", label: "Yes" },
                    { id: "activation-cancel-confirm-no", label: "No" },
                  ],
                },
                revealed: 1,
              },
            ],
          },
        ]);
        return;
      }

      if (normalizedTextForActivation === "no" || normalizedTextForActivation.includes(" no ") || normalizedTextForActivation.startsWith("no")) {
        setActivationBuildState({ stage: "await-segment" });
        markLatestActivationConfirmationNo();
        setMessages((ms) => [
          ...ms,
          { id: nextId(), role: "user", text },
          {
            id: nextId(),
            role: "lexi",
            blocks: [
              {
                id: `pb-${++idRef.current}`,
                block: { type: "text", content: activationPrompt },
                revealed: words(activationPrompt).length,
              },
            ],
          },
        ]);
        return;
      }

      setMessages((ms) => [
        ...ms,
        { id: nextId(), role: "user", text },
        {
          id: nextId(),
          role: "lexi",
          blocks: [
            {
              id: `pb-${++idRef.current}`,
              block: { type: "text", content: "Please answer Yes, No, or Cancel." },
              revealed: words("Please answer Yes, No, or Cancel.").length,
            },
            {
              id: `pb-${++idRef.current}`,
              block: {
                type: "actions",
                actions: [
                  { id: "activation-segment-yes", label: "Yes" },
                  { id: "activation-segment-no", label: "No" },
                  { id: "activation-segment-cancel", label: "Cancel" },
                ],
              },
              revealed: 1,
            },
          ],
        },
      ]);
      return;
    }

    if (activationBuildState.stage === "await-cancel-confirmation") {
      const confirmsCancel =
        normalizedTextForActivation === "yes"
        || normalizedTextForActivation === "yes cancel"
        || normalizedTextForActivation.includes("yes");
      const keepsGoing = normalizedTextForActivation === "no" || normalizedTextForActivation.includes(" no ") || normalizedTextForActivation.startsWith("no");

      if (confirmsCancel) {
        setActivationBuildState(IDLE_ACTIVATION_BUILD_STATE);
        markLatestActivationConfirmationCanceled();
        setMessages((ms) => [
          ...ms,
          { id: nextId(), role: "user", text },
          {
            id: nextId(),
            role: "lexi",
            blocks: [
              {
                id: `pb-${++idRef.current}`,
                block: { type: "text", content: "What would you like to work on?" },
                revealed: words("What would you like to work on?").length,
              },
            ],
          },
        ]);
        return;
      }

      if (keepsGoing) {
        setActivationBuildState({
          stage: "await-confirmation",
          segmentId: activationBuildState.segmentId,
          segmentName: activationBuildState.segmentName,
        });
        setMessages((ms) => [
          ...ms,
          { id: nextId(), role: "user", text },
          {
            id: nextId(),
            role: "lexi",
            blocks: [
              {
                id: `pb-${++idRef.current}`,
                block: { type: "text", content: "No problem. We can continue with this activation." },
                revealed: words("No problem. We can continue with this activation.").length,
              },
            ],
          },
        ]);
        return;
      }

      setMessages((ms) => [
        ...ms,
        { id: nextId(), role: "user", text },
        {
          id: nextId(),
          role: "lexi",
          blocks: [
            {
              id: `pb-${++idRef.current}`,
              block: { type: "text", content: "Please answer Yes or No." },
              revealed: words("Please answer Yes or No.").length,
            },
            {
              id: `pb-${++idRef.current}`,
              block: {
                type: "actions",
                actions: [
                  { id: "activation-cancel-confirm-yes", label: "Yes" },
                  { id: "activation-cancel-confirm-no", label: "No" },
                ],
              },
              revealed: 1,
            },
          ],
        },
      ]);
      return;
    }

    if (awaitingReasoningEditTarget) {
      const reasoningBlock = findReasoningBlock(messages, awaitingReasoningEditTarget);
      if (!reasoningBlock) {
        setAwaitingReasoningEditTarget(null);
      } else {
        const edits = parseReasoningEdits(text, reasoningBlock.assumptions);
        const noMatchText = "I can update that. Please phrase it like 'total orders is 3' or 'order date = less than 120 days'.";

        if (edits.length === 0) {
          setMessages((ms) => [
            ...ms,
            { id: nextId(), role: "user", text },
            {
              id: nextId(),
              role: "lexi",
              blocks: [
                {
                  id: `pb-${++idRef.current}`,
                  block: { type: "text", content: noMatchText },
                  revealed: words(noMatchText).length,
                },
              ],
            },
          ]);
          return;
        }

        let nextAssumptions = applyReasoningEdits(reasoningBlock.assumptions, edits);

        const normalizedInput = text.toLowerCase();
        const mentionsCustomer = /\bcustomer(s)?\b/.test(normalizedInput);
        const hasCountryAssumption = nextAssumptions.some((item) => normalizeAssumptionLabel(item.label) === "country");
        const region = parseRegionFromText(text);
        if (mentionsCustomer && region && !hasCountryAssumption) {
          nextAssumptions = [
            ...nextAssumptions,
            {
              id: `assumption-country-${Date.now()}`,
              label: "Country",
              value: region,
            },
          ];
        }

        const nextReasoningMessageId = nextId();
        const nextReasoningBlockId = `pb-${++idRef.current}`;
        setAwaitingReasoningEditTarget({ messageId: nextReasoningMessageId, blockId: nextReasoningBlockId });
        setMessages((ms) => [
          ...ms,
          { id: nextId(), role: "user", text },
          {
            id: nextReasoningMessageId,
            role: "lexi",
            blocks: [
              {
                id: nextReasoningBlockId,
                block: {
                  ...reasoningBlock,
                  assumptions: nextAssumptions,
                },
                revealed: 1,
              },
            ],
          },
        ]);
        return;
      }
    }

    const normalizedText = stripMentions(text)
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, " ")
      .replace(/\s+/g, " ")
      .trim();

    // MVP Segment build workflow (step 1): when the user asks to build a segment,
    // ask for the segment type before triggering any scripted branch.
    const mvpSegmentBuildIntent =
      normalizedText.includes("segment")
      && (
        normalizedText.includes("build")
        || normalizedText.includes("create")
        || normalizedText.includes("make")
        || normalizedText.includes("new segment")
      );

    if (mvpSegmentBuildIntent) {
      const response = "What kind of segment do you want to build?";
      setAwaitingMvpSegmentKind(true);
      setMessages((ms) => [
        ...ms,
        { id: nextId(), role: "user", text },
        {
          id: nextId(),
          role: "lexi",
          blocks: [
            {
              id: `pb-${++idRef.current}`,
              block: { type: "text", content: response },
              revealed: words(response).length,
            },
          ],
        },
      ]);
      return;
    }

    if (awaitingMvpSegmentKind) {
      setAwaitingMvpSegmentKind(false);

      const segmentIntent = text.trim() || "customer segment";
      const normalizedIntent = segmentIntent.toLowerCase();
      const isHighValue = normalizedIntent.includes("high value") || normalizedIntent.includes("vip");
      const isBlackFriday = normalizedIntent.includes("black friday") || normalizedIntent.includes("bf");

      const intro = `Love this direction. I treated "${segmentIntent}" as a first-pass audience idea and did a quick planning read.`;
      const insights = isHighValue && isBlackFriday
        ? "**Insights:** Based on similar audiences, I'd expect this to land around 18.4K customers (about 6.8% of active profiles). They also tend to be materially stronger on value, with average order value closer to $146 vs a $92 account baseline. The biggest signal is seasonality: comparable customers converted around 11.9% in BF week, vs roughly 6.4% overall. In plain terms, this is a high-intent group that is worth prioritising early before broad expansion."
        : "**Insights:** At a first pass, this likely lands in the 24K to 31K range. With focused messaging, I'd expect conversion around 6.8% to 8.9%, and revenue per recipient roughly 18% to 27% above broad targeting. This is a good candidate for a narrow first launch, then expansion once we validate response quality.";
      const validateIntro = "Before we build the segment, let's validate assumptions.";

      const insightBlocks: RevealBlock[] = [
        {
          id: `pb-${++idRef.current}`,
          block: { type: "text", content: intro },
          revealed: words(intro).length,
        },
        {
          id: `pb-${++idRef.current}`,
          block: { type: "text", content: insights },
          revealed: words(insights).length,
        },
      ];

      if (isHighValue && isBlackFriday) {
        insightBlocks.push({
          id: `pb-${++idRef.current}`,
          block: {
            type: "chart",
            chart: {
              kind: "bar",
              title: "Illustrative performance split",
              unit: "%",
              series: ["BF high-value cohort", "Account baseline"],
              data: [
                { label: "Conversion", values: [11.9, 6.4] },
                { label: "Repeat purchase (30d)", values: [23.5, 14.2] },
                { label: "Revenue / recipient index", values: [168, 100] },
              ],
              caption: "Dummy planning data for prototype narrative only.",
            },
          },
          revealed: 1,
        });
      }

      insightBlocks.push({
        id: `pb-${++idRef.current}`,
        block: { type: "text", content: validateIntro },
        revealed: words(validateIntro).length,
      });

      insightBlocks.push({
        id: `pb-${++idRef.current}`,
        block: {
          type: "reasoning",
          goal: `Validate assumptions for segment: ${segmentIntent}`,
          assumptions: [
            {
              id: "assumption-order-date-window",
              label: "Order Date",
              value: "Purchased within last 180 days",
            },
            {
              id: "assumption-frequency",
              label: "Frequency",
              value: "4+ orders lifetime",
            },
            {
              id: "assumption-total-spend",
              label: "Total Spend",
              value: "$5000",
            },
            {
              id: "assumption-loyalty-tier",
              label: "Loyalty Tier",
              value: "Gold",
            },
          ],
        },
        revealed: 1,
      });

      setMessages((ms) => [
        ...ms,
        { id: nextId(), role: "user", text },
        {
          id: nextId(),
          role: "lexi",
          blocks: insightBlocks,
        },
      ]);
      return;
    }

    const triggeredByActivation = mentionIds
      .map((id) => getDef(id))
      .find((d) => {
        if (!d) return false;
        const n = d.name.toLowerCase();
        return n.includes("meta activation")
          && (
            n.includes("bf reactivation core")
            || n.includes("90-180d")
            || n.includes("vip at-risk")
            || n.includes("lapsed vip")
          );
      })
      ? (mentionIds
        .map((id) => getDef(id))
        .some((d) => d?.name.toLowerCase().includes("bf reactivation core") || d?.name.toLowerCase().includes("90-180d"))
        ? "conv-bf-activation-insights"
        : "conv-winback-perf")
      : undefined;

    if (triggeredByActivation && CONVERSATIONS.some((conversation) => conversation.id === triggeredByActivation)) {
      dispatch({ type: "SELECT_CONVERSATION", id: triggeredByActivation, autoStart: true });
      return;
    }

    const holidayWinbackIntent =
      normalizedText.includes("segment")
      && (
        normalizedText.includes("holiday sale")
        || normalizedText.includes("holiday")
      )
      && (
        normalizedText.includes("re engaging")
        || normalizedText.includes("reengaging")
        || normalizedText.includes("re engagement")
      );

    if (!conversation && holidayWinbackIntent) {
      dispatch({ type: "SELECT_CONVERSATION", id: "conv-winback", autoStart: true });
      return;
    }

    if (!conversation) {
      const triggeredBySegment = mentionIds.map((id) => SEGMENT_TRIGGERS[id]).find(Boolean);
      if (triggeredBySegment) {
        dispatch({ type: "SELECT_CONVERSATION", id: triggeredBySegment, autoStart: true });
        return;
      }
    }
    advance(text);
  }
  submitRef.current = handleSubmit;

  useEffect(() => {
    const onKickoff = (event: Event) => {
      const detail = (event as CustomEvent<{ text?: string; mentionIds?: string[] }>).detail;
      const kickoffText = detail?.text?.trim();
      if (kickoffText) {
        submitRef.current(kickoffText, detail?.mentionIds ?? []);
        return;
      }
      advanceRef.current();
    };

    window.addEventListener("prototype-master:start-next-turn", onKickoff as EventListener);
    return () => window.removeEventListener("prototype-master:start-next-turn", onKickoff as EventListener);
  }, []);

  useEffect(() => {
    const onCancelActivationRequest = (event: Event) => {
      const detail = (event as CustomEvent<{ activationId?: string }>).detail;
      const activationId = detail?.activationId;
      if (!activationId) return;

      const activation = state.activations.find((item) => item.id === activationId) ?? getActivation(activationId);
      const activationName = activation?.name ?? "this activation";
      const prompt = "Are you sure you want to cancel the activation? Sends to the activation platform may be incomplete and will need to run the activation again.";

      setPendingActivationCancelId(activationId);
      setMessages((ms) => [
        ...ms,
        {
          id: nextId(),
          role: "lexi",
          blocks: [
            {
              id: `pb-${++idRef.current}`,
              block: { type: "text", content: `${activationName}: ${prompt}` },
              revealed: words(`${activationName}: ${prompt}`).length,
            },
            {
              id: `pb-${++idRef.current}`,
              block: {
                type: "actions",
                actions: [
                  { id: "activation-cancel-yes", label: "Yes" },
                  { id: "activation-cancel-no", label: "No" },
                ],
              },
              revealed: 1,
            },
          ],
        },
      ]);
    };

    window.addEventListener("prototype-master:cancel-activation-request", onCancelActivationRequest as EventListener);
    return () => window.removeEventListener("prototype-master:cancel-activation-request", onCancelActivationRequest as EventListener);
  }, [state.activations]);

  useEffect(() => {
    const onJumpToMessage = (event: Event) => {
      const detail = (event as CustomEvent<{ messageId?: string }>).detail;
      const messageId = detail?.messageId;
      if (!messageId) return;
      const el = document.querySelector(`[data-message-id="${messageId}"]`);
      if (!el) return;
      (el as HTMLElement).scrollIntoView({ behavior: "smooth", block: "start" });
    };

    window.addEventListener("prototype-master:jump-to-message", onJumpToMessage as EventListener);
    return () => window.removeEventListener("prototype-master:jump-to-message", onJumpToMessage as EventListener);
  }, []);

  useEffect(() => {
    const onFocusArtifact = (event: Event) => {
      const detail = (event as CustomEvent<{ artifactId?: string }>).detail;
      const artifactId = detail?.artifactId;
      if (!artifactId) return;

      const artifact = state.artifacts.get(artifactId);
      if (!artifact) return;

      const lexiMessages = messages.filter((message): message is Extract<PlayedMessage, { role: "lexi" }> => message.role === "lexi");
      const targetLexiMessage = [...lexiMessages].reverse().find((message) => (
        message.blocks.some((block) => {
          if (block.block.type === "proposed" || block.block.type === "summary") {
            return block.block.artifactId === artifactId;
          }

          if (block.block.type === "activationBuild") {
            return block.block.segmentId === artifactId || block.block.segmentName === artifact.name;
          }

          if (block.block.type === "reasoning") {
            const hasSegmentNameAssumption = block.block.assumptions.some((assumption) => (
              assumption.label.toLowerCase() === "segment name" && assumption.value === artifact.name
            ));
            const goalMentionsArtifactName = block.block.goal.toLowerCase().includes(artifact.name.toLowerCase());
            return hasSegmentNameAssumption || goalMentionsArtifactName;
          }

          if (block.block.type === "text") {
            return block.block.content.includes(`${artifact.name} is approved and saved.`);
          }

          return false;
        })
      ));

      if (!targetLexiMessage) return;
      const el = document.querySelector(`[data-message-id="${targetLexiMessage.id}"]`);
      if (!el) return;
      (el as HTMLElement).scrollIntoView({ behavior: "smooth", block: "start" });
    };

    window.addEventListener("prototype-master:focus-artifact", onFocusArtifact as EventListener);
    return () => window.removeEventListener("prototype-master:focus-artifact", onFocusArtifact as EventListener);
  }, [messages, state.artifacts]);

  useEffect(() => {
    setAwaitingMvpSegmentKind(false);
    setAwaitingReasoningEditTarget(null);
    setReasoningCancelMode(null);
    setActivationBuildState(IDLE_ACTIVATION_BUILD_STATE);
    setPendingActivationCancelId(null);
    bfInsightFollowupIndexRef.current = 0;
  }, [state.activeConversationId]);

  // ── Reset when the conversation changes / replays; auto-start if requested ──
  useEffect(() => {
    const previousId = prevConversationIdRef.current;
    if (previousId) {
      dispatch({
        type: "UPSERT_CONVERSATION_PLAYBACK",
        id: previousId,
        playback: {
          messages,
          messageReactions,
          turnIndex,
          activationBuildState,
        },
      });
    }

    const activeId = state.activeConversationId;
    const cached = activeId
      ? (state.conversationPlayback[activeId] as ConversationPlaybackSnapshot | undefined)
      : undefined;

    if (activeId && !state.autoStart && cached) {
      abortRef.current?.abort();
      setMessages(cached.messages);
      setMessageReactions(cached.messageReactions);
      setThinking(null);
      setBusy(false);
      busyRef.current = false;
      turnRef.current = cached.turnIndex;
      setTurnIndex(cached.turnIndex);
      setActivationBuildState(cached.activationBuildState ?? IDLE_ACTIVATION_BUILD_STATE);
      idRef.current = maxPlaybackSeq(cached.messages);
      prevCount.current = cached.messages.length;
      prevConversationIdRef.current = activeId;
      return;
    }

    abortRef.current?.abort();
    setMessages([]);
    setMessageReactions({});
    setThinking(null);
    setBusy(false);
    busyRef.current = false;
    turnRef.current = 0;
    setTurnIndex(0);
    setActivationBuildState(IDLE_ACTIVATION_BUILD_STATE);
    idRef.current = 0;
    prevCount.current = 0;

    if (activeId && state.autoStart) {
      advanceRef.current();
    }
    prevConversationIdRef.current = activeId ?? null;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.activeConversationId, state.replayNonce]);

  useEffect(() => {
    if (!state.activeConversationId) return;
    dispatch({
      type: "UPSERT_CONVERSATION_PLAYBACK",
      id: state.activeConversationId,
      playback: {
        messages,
        messageReactions,
        turnIndex,
        activationBuildState,
      },
    });
  }, [dispatch, state.activeConversationId, messages, messageReactions, turnIndex, activationBuildState]);

  // Ref only the latest user message (for scroll anchoring).
  let lastUserIdx = -1;
  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i].role === "user") {
      lastUserIdx = i;
      break;
    }
  }

  const empty = messages.length === 0 && !thinking;
  const nextTurn = conversation?.turns[turnIndex];
  const suggestionChipText = nextTurn ? stripMentions(nextTurn.user.text) : "";
  const normalizedSuggestionChipText = suggestionChipText.trim().toLowerCase();
  const suppressSuggestionChip =
    normalizedSuggestionChipText === "yes, let's build a segment for early access customers for black friday"
    || normalizedSuggestionChipText.includes("bf reactivation core")
    || (normalizedSuggestionChipText.includes("build")
      && normalizedSuggestionChipText.includes("segment")
      && normalizedSuggestionChipText.includes("black friday"));
  const lastIdx = messages.length - 1;
  const lastMsg = messages[lastIdx];

  // The verify-assumptions card is a gated step: while it's the latest message and
  // a turn remains, it stays live (assumptions editable). There's no confirm button
  // — the user confirms by sending the next message (the suggestion chip shows it).
  const pendingVerify =
    !busy && !!nextTurn && lastMsg?.role === "lexi" && lastMsg.blocks.some((b) => b.block.type === "reasoning");

  // Suggestion chip is shown once the thread has started and a turn remains.
  const showSuggestion = !empty && !busy && !!nextTurn && !suppressSuggestionChip;

  const startPrompts = conversation
    ? [{ id: conversation.id, text: conversation.seedPrompt }]
    : CONVERSATIONS.map((c) => ({ id: c.id, text: c.seedPrompt }));

  function pickStart(p: { id: string; text: string }) {
    if (conversation) {
      // Already on this conversation, waiting — begin turn 0 locally.
      advance(p.text);
    } else {
      // Blank New Chat — select + auto-start the chosen conversation.
      dispatch({ type: "SELECT_CONVERSATION", id: p.id, autoStart: true });
    }
  }

  const quickStartNewSegmentChat = useCallback(() => {
    dispatch({ type: "NEW_CHAT" });
    window.setTimeout(() => {
      submitRef.current("Build a new segment", []);
      window.setTimeout(() => {
        submitRef.current("High value customers who shopped Black Friday last year", []);
      }, 60);
    }, 40);
  }, [dispatch]);

  const quickStartNewActivationChat = useCallback(() => {
    dispatch({ type: "NEW_CHAT" });
    window.setTimeout(() => {
      submitRef.current("Build a new activation", []);
    }, 40);
  }, [dispatch]);

  const quickStartSegmentActivationSingleChat = useCallback(() => {
    dispatch({ type: "NEW_CHAT" });
    window.setTimeout(() => {
      submitRef.current("Build a new segment", []);
      window.setTimeout(() => {
        submitRef.current("VIP Loyalists", []);
      }, 60);
    }, 40);
  }, [dispatch]);

  const promptForSegmentClarification = useCallback(() => {
    const clarificationText = "What would you like to do next?";
    setMessages((ms) => [
      ...ms,
      {
        id: `pm-${++idRef.current}`,
        role: "lexi",
        blocks: [
          {
            id: `pb-${++idRef.current}`,
            block: {
              type: "text",
              content: clarificationText,
            },
            revealed: words(clarificationText).length,
          },
        ],
      },
    ]);
  }, []);

  const promptForSegmentEditInChat = useCallback(() => {
    let target: ReasoningEditTarget | null = null;
    for (let i = messages.length - 1; i >= 0; i--) {
      const message = messages[i];
      if (message.role !== "lexi") continue;
      for (let j = message.blocks.length - 1; j >= 0; j--) {
        const block = message.blocks[j];
        if (block.block.type === "reasoning") {
          target = { messageId: message.id, blockId: block.id };
          break;
        }
      }
      if (target) break;
    }

    if (!target) return;

    setAwaitingReasoningEditTarget(target);
    const text = "What would you like to change?";
    setMessages((ms) => [
      ...ms,
      {
        id: `pm-${++idRef.current}`,
        role: "lexi",
        blocks: [
          {
            id: `pb-${++idRef.current}`,
            block: { type: "text", content: text },
            revealed: words(text).length,
          },
        ],
      },
    ]);
  }, [messages]);

  const restartSegmentBuildPrompt = useCallback(() => {
    const response = "Let's try this again. What kind of segment do you want to build?";
    setAwaitingMvpSegmentKind(true);
    setMessages((ms) => [
      ...ms,
      {
        id: `pm-${++idRef.current}`,
        role: "lexi",
        blocks: [
          {
            id: `pb-${++idRef.current}`,
            block: {
              type: "text",
              content: response,
            },
            revealed: words(response).length,
          },
        ],
      },
    ]);
  }, []);

  const assumptionsToCriteria = (items: ReasoningAssumption[]) =>
    items.map((item) => `${item.label}: ${item.value}`);

  const upsertSegmentArtifactFromPayload = useCallback((
    payload: SegmentConfirmedPayload,
    save: boolean,
    recommendations?: string[],
  ) => {
    const existingArtifact = state.artifacts.get(payload.id);
    const existingRecommendations = existingArtifact?.body?.kind === "segment"
      ? existingArtifact.body.recommendations
      : undefined;
    const artifact: Artifact = {
      id: payload.id,
      type: "segment",
      name: payload.name,
      status: save ? "saved" : "proposed",
      body: {
        kind: "segment",
        purpose: payload.description,
        population: payload.population,
        criteria: assumptionsToCriteria(payload.assumptions),
        recommendations: recommendations ?? existingRecommendations,
      },
    };
    dispatch({ type: "ADD_ARTIFACT", artifact });
    if (save) {
      dispatch({ type: "SAVE_ARTIFACT", id: payload.id });
    }
  }, [dispatch, state.artifacts]);

  const handleOpenSegmentPanel = useCallback((payload: SegmentConfirmedPayload) => {
    upsertSegmentArtifactFromPayload(payload, false);
    dispatch({ type: "OPEN_SEGMENT", id: payload.id });
  }, [dispatch, upsertSegmentArtifactFromPayload]);

  const launchActivationFromSegment = useCallback((segment: ActivationKickoffSegment) => {
    registerDefs([
      {
        id: segment.id,
        kind: "segment",
        name: segment.name,
        entity: "customer",
        description: segment.description ?? "",
        stat: { label: "customers", value: segment.population ?? "2,840" },
      },
    ]);

    dispatch({ type: "NEW_CHAT" });
    dispatch({
      type: "ADD_ARTIFACT",
      artifact: {
        id: segment.id,
        type: "segment",
        name: segment.name,
        status: "saved",
        body: {
          kind: "segment",
          purpose: segment.description,
          population: segment.population ?? "2,840",
          criteria: segment.criteria ?? [],
          recommendations: segment.recommendations,
        },
      },
    });

    window.setTimeout(() => {
      window.dispatchEvent(new CustomEvent("prototype-master:start-next-turn", {
        detail: { text: "Build a new activation", mentionIds: [segment.id] },
      }));
    }, 40);
  }, [dispatch]);

  const handleSegmentApproved = useCallback((payload: SegmentConfirmedPayload) => {
    const isVipLoyalistsSegment = payload.name.toLowerCase().includes("vip loyalists");
    const recommendationItems = [
      "Early access / exclusive product preview - rewards loyalty without discounting; roughly 1,630-2,760 converting customers (6.8-8.9% of 24K-31K reach), likely highest-margin since there's no discount cost",
      "Loyalty-tier upgrade or surprise perk - ROI is retention-driven rather than immediate sales; track repeat-purchase rate over the following 90 days as the real signal",
      "Personalised VIP-only bundle/recommendation - biggest potential upside, directly testing the 18-27% revenue-per-recipient uplift on 24K-31K recipients; run against a holdout first since this assumption is most likely to be inflated by novelty",
    ];

    upsertSegmentArtifactFromPayload(payload, true, recommendationItems);
    dispatch({ type: "OPEN_SEGMENT", id: payload.id });

    const recommendationText = [
      `Great, ${payload.name} is approved and saved.`,
      "Recommended actions:",
      ...recommendationItems.map((item) => `- ${item}`),
    ].join("\n");

    setMessages((ms) => [
      ...ms,
      {
        id: `pm-${++idRef.current}`,
        role: "lexi",
        blocks: [
          {
            id: `pb-${++idRef.current}`,
            block: { type: "text", content: recommendationText },
            revealed: words(recommendationText).length,
          },
          {
            id: `pb-${++idRef.current}`,
            block: {
              type: "actions",
              actions: [
                { id: "segment-explore-near-miss", label: "Explore near-miss customer cohort" },
                { id: "segment-explore-timing", label: "Explore campaign timing opportunities" },
                ...(isVipLoyalistsSegment
                  ? [{ id: "segment-activate-chat-test", label: "Activate in Chat (test)" }]
                  : []),
                { id: "segment-activate", label: "Activate" },
              ],
            },
            revealed: 1,
          },
        ],
      },
    ]);
  }, [dispatch, upsertSegmentArtifactFromPayload]);

  const handleSegmentActivate = useCallback((payload: SegmentConfirmedPayload) => {
    launchActivationFromSegment({
      id: payload.id,
      name: payload.name,
      description: payload.description,
      population: payload.population,
      criteria: assumptionsToCriteria(payload.assumptions),
    });
  }, [launchActivationFromSegment]);

  const handleMvpActionClick = useCallback((actionId: string, label: string) => {
    if (actionId === "segment-activate-chat-test") {
      dispatch({ type: "CLOSE_SOURCES" });
      dispatch({ type: "CLOSE_SEGMENT" });

      const mostRecentSavedSegment = [...state.artifacts.values()]
        .reverse()
        .find((artifact) => artifact.type === "segment" && artifact.status === "saved");

      if (mostRecentSavedSegment?.body?.kind === "segment") {
        const segmentId = mostRecentSavedSegment.id;
        const segmentName = mostRecentSavedSegment.name;
        const population = mostRecentSavedSegment.body.population ?? "2,840";
        const rules = mostRecentSavedSegment.body.criteria ?? [];

        setActivationBuildState(IDLE_ACTIVATION_BUILD_STATE);

        setMessages((ms) => [
          ...ms,
          { id: nextId(), role: "user", text: label },
          {
            id: nextId(),
            role: "lexi",
            blocks: [
              {
                id: `pb-${++idRef.current}`,
                block: {
                  type: "activationBuild",
                  segmentId,
                  segmentName,
                  population,
                  rules,
                  activationName: `${segmentName} Activation`,
                  activationDescription: `Activation from Segment: ${segmentName}`,
                },
                revealed: 1,
              },
            ],
          },
        ]);
        return;
      }

      const response = "Please select a segment first, then I can start the activation build card.";
      setMessages((ms) => [
        ...ms,
        { id: nextId(), role: "user", text: label },
        {
          id: nextId(),
          role: "lexi",
          blocks: [
            {
              id: `pb-${++idRef.current}`,
              block: { type: "text", content: response },
              revealed: words(response).length,
            },
          ],
        },
      ]);
      return;
    }

    if (actionId === "segment-activate") {
      const mostRecentSavedSegment = [...state.artifacts.values()]
        .reverse()
        .find((artifact) => artifact.type === "segment" && artifact.status === "saved");

      if (mostRecentSavedSegment?.body?.kind === "segment") {
        launchActivationFromSegment({
          id: mostRecentSavedSegment.id,
          name: mostRecentSavedSegment.name,
          description: mostRecentSavedSegment.body.purpose,
          population: mostRecentSavedSegment.body.population,
          criteria: mostRecentSavedSegment.body.criteria,
          recommendations: mostRecentSavedSegment.body.recommendations,
        });
        return;
      }

      const response = "Please select a segment first, then I can start activation setup immediately.";
      setMessages((ms) => [
        ...ms,
        { id: nextId(), role: "user", text: label },
        {
          id: nextId(),
          role: "lexi",
          blocks: [
            {
              id: `pb-${++idRef.current}`,
              block: { type: "text", content: response },
              revealed: words(response).length,
            },
          ],
        },
      ]);
      return;
    }

    if (actionId === "activation-segment-yes") {
      handleSubmit("Yes", []);
      return;
    }

    if (actionId === "activation-segment-no") {
      handleSubmit("No", []);
      return;
    }

    if (actionId === "activation-segment-cancel") {
      handleSubmit("Cancel", []);
      return;
    }

    if (actionId === "activation-cancel-confirm-yes") {
      handleSubmit("Yes", []);
      return;
    }

    if (actionId === "activation-cancel-confirm-no") {
      handleSubmit("No", []);
      return;
    }

    if (actionId === "activation-cancel-yes") {
      handleSubmit("Yes", []);
      return;
    }

    if (actionId === "activation-cancel-no") {
      handleSubmit("No", []);
      return;
    }

    if (actionId === "reasoning-cancel-yes") {
      const mode = reasoningCancelMode;
      setReasoningCancelMode(null);
      setAwaitingReasoningEditTarget(null);
      if (mode === "pending-verify") {
        promptForSegmentClarification();
      } else {
        restartSegmentBuildPrompt();
      }
      return;
    }

    if (actionId === "reasoning-cancel-no") {
      setReasoningCancelMode(null);
      const response = "No problem. We can continue with this segment.";
      setMessages((ms) => [
        ...ms,
        { id: nextId(), role: "user", text: label },
        {
          id: nextId(),
          role: "lexi",
          blocks: [
            {
              id: `pb-${++idRef.current}`,
              block: { type: "text", content: response },
              revealed: words(response).length,
            },
          ],
        },
      ]);
      return;
    }

    if (actionId === "bf-dive-repeat-value" && state.activeConversationId === "conv-black-friday-planning") {
      setMessages((ms) => [
        ...ms,
        { id: nextId(), role: "user", text: label },
        {
          id: nextId(),
          role: "lexi",
          blocks: [
            {
              id: `pb-${++idRef.current}`,
              block: {
                type: "text",
                content:
                  "Great choice. I dug into last year's repeat-customer cohort and found where the value concentration actually came from.",
              },
              revealed: words("Great choice. I dug into last year's repeat-customer cohort and found where the value concentration actually came from.").length,
            },
            {
              id: `pb-${++idRef.current}`,
              block: {
                type: "text",
                content:
                  "## Key metrics (dummy data)\n- **Repeat buyers:** 6,260 (34% of buyers)\n- **Repeat revenue contribution:** 61% ($1.12M of $1.84M)\n- **Revenue per repeat recipient:** $64.80 (vs $26.40 overall)\n- **Premium bundle attach rate:** 37% (vs 14% for first-time shoppers)",
              },
              revealed: words("## Key metrics (dummy data)\n- **Repeat buyers:** 6,260 (34% of buyers)\n- **Repeat revenue contribution:** 61% ($1.12M of $1.84M)\n- **Revenue per repeat recipient:** $64.80 (vs $26.40 overall)\n- **Premium bundle attach rate:** 37% (vs 14% for first-time shoppers)").length,
            },
            {
              id: `pb-${++idRef.current}`,
              block: {
                type: "chart",
                chart: {
                  kind: "bar",
                  title: "Repeat-customer value concentration",
                  unit: "%",
                  series: ["Share of repeat buyers", "Share of repeat revenue"],
                  data: [
                    { label: "Premium loyalists", values: [22, 41] },
                    { label: "Replenishment shoppers", values: [16, 26] },
                    { label: "Other repeat", values: [62, 33] },
                  ],
                  caption: "A smaller subset of repeat customers generated most repeat-customer revenue.",
                },
              },
              revealed: 1,
            },
            {
              id: `pb-${++idRef.current}`,
              block: { type: "proposed", artifactId: "bf-insight-repeat-drivers-deepdive" },
              revealed: 1,
            },
            {
              id: `pb-${++idRef.current}`,
              block: {
                type: "actions",
                actions: [
                  { id: "bf-dive-reactivation-window", label: "Break down the 90-180 day window" },
                  { id: "bf-dive-timing-window", label: "Explore last year's first-48-hour timing pattern" },
                  { id: "bf-build-segment-from-cohort", label: "Build the early access segment" },
                ],
              },
              revealed: 1,
            },
          ],
        },
      ]);
      return;
    }

    if (actionId === "bf-dive-reactivation-window" && state.activeConversationId === "conv-black-friday-planning") {
      const response = "This cohort is high potential. In last year's Black Friday population, customers lapsed 90-180 days converted at 16.1%, compared with 7.2% for 180+ day lapsed customers. They also produced 1.9x higher revenue per recipient in warm-up sends.";
      setMessages((ms) => [
        ...ms,
        { id: nextId(), role: "user", text: label },
        {
          id: nextId(),
          role: "lexi",
          blocks: [
            {
              id: `pb-${++idRef.current}`,
              block: { type: "text", content: response },
              revealed: words(response).length,
            },
            {
              id: `pb-${++idRef.current}`,
              block: {
                type: "actions",
                actions: [
                  { id: "bf-dive-repeat-value", label: "Explore repeat-customer value drivers from last year" },
                  { id: "bf-dive-timing-window", label: "Explore last year's first-48-hour timing pattern" },
                  { id: "bf-build-segment-from-cohort", label: "Build the early access segment" },
                ],
              },
              revealed: 1,
            },
          ],
        },
      ]);
      return;
    }

    if (actionId === "bf-dive-timing-window" && state.activeConversationId === "conv-black-friday-planning") {
      const response = "Timing is a major lever in your last-year customer base. Around 52% of BF-attributed revenue landed in the first 48 hours, and send windows between 6pm-10pm accounted for 39% of same-day conversions. This suggests front-loading your top offers into evening waves.";
      setMessages((ms) => [
        ...ms,
        { id: nextId(), role: "user", text: label },
        {
          id: nextId(),
          role: "lexi",
          blocks: [
            {
              id: `pb-${++idRef.current}`,
              block: { type: "text", content: response },
              revealed: words(response).length,
            },
            {
              id: `pb-${++idRef.current}`,
              block: {
                type: "actions",
                actions: [
                  { id: "bf-dive-repeat-value", label: "Explore repeat-customer value drivers from last year" },
                  { id: "bf-dive-reactivation-window", label: "Break down the 90-180 day window" },
                  { id: "bf-build-segment-from-cohort", label: "Build the early access segment" },
                ],
              },
              revealed: 1,
            },
          ],
        },
      ]);
      return;
    }

    if (actionId === "bf-build-segment-from-cohort" && state.activeConversationId === "conv-black-friday-planning") {
      advanceRef.current("Yes, let's build a segment for early access customers for Black Friday");
      return;
    }

    if (actionId === "bf-generate-more-insights" && state.activeConversationId === "conv-black-friday-planning") {
      const stepIndex = bfInsightFollowupIndexRef.current;
      const nextStep = bfInsightFollowups[stepIndex];

      if (!nextStep) {
        const response = "You've already seen all available Black Friday customer insights in this thread.";
        setMessages((ms) => [
          ...ms,
          { id: nextId(), role: "user", text: label },
          {
            id: nextId(),
            role: "lexi",
            blocks: [
              {
                id: `pb-${++idRef.current}`,
                block: { type: "text", content: response },
                revealed: words(response).length,
              },
            ],
          },
        ]);
        return;
      }

      const revealBlocks: RevealBlock[] = nextStep.blocks.map((block) => ({
        id: `pb-${++idRef.current}`,
        block,
        revealed: block.type === "text" ? words(block.content).length : 1,
      }));

      if (stepIndex < bfInsightFollowups.length - 1) {
        const actions: { id: string; label: string }[] = [
          { id: "bf-generate-more-insights", label: "Explore another insight from last year's customers" },
        ];
        if (nextStep.suggestBuildSegment) {
          actions.push({ id: "bf-build-segment-from-cohort", label: "Build the early access segment" });
        }

        revealBlocks.push({
          id: `pb-${++idRef.current}`,
          block: {
            type: "actions",
            actions,
          },
          revealed: 1,
        });
      }

      bfInsightFollowupIndexRef.current = stepIndex + 1;
      setMessages((ms) => [
        ...ms,
        { id: nextId(), role: "user", text: label },
        {
          id: nextId(),
          role: "lexi",
          blocks: revealBlocks,
        },
      ]);
      return;
    }

    if (actionId === "build-segment") {
      const response = "Great - what kind of segment do you want to build?";
      setAwaitingMvpSegmentKind(true);
      setMessages((ms) => [
        ...ms,
        { id: nextId(), role: "user", text: label },
        {
          id: nextId(),
          role: "lexi",
          blocks: [
            {
              id: `pb-${++idRef.current}`,
              block: { type: "text", content: response },
              revealed: words(response).length,
            },
          ],
        },
      ]);
      return;
    }

    if (actionId === "explore-insight") {
      const response = "Absolutely. The key insight is intent concentration: this audience typically converts faster in the first 24 to 48 hours, so sequencing and timing matter more than broad reach at launch.";
      setMessages((ms) => [
        ...ms,
        { id: nextId(), role: "user", text: label },
        {
          id: nextId(),
          role: "lexi",
          blocks: [
            {
              id: `pb-${++idRef.current}`,
              block: { type: "text", content: response },
              revealed: words(response).length,
            },
          ],
        },
      ]);
      return;
    }

    if (actionId === "explore-recommendation") {
      const response = "Great choice. I recommend launching with a smaller priority cohort first, validating day-1 conversion quality, then scaling into adjacent audiences with the winning creative variant.";
      setMessages((ms) => [
        ...ms,
        { id: nextId(), role: "user", text: label },
        {
          id: nextId(),
          role: "lexi",
          blocks: [
            {
              id: `pb-${++idRef.current}`,
              block: { type: "text", content: response },
              revealed: words(response).length,
            },
          ],
        },
      ]);
    }
  }, [bfInsightFollowups, dispatch, handleSubmit, launchActivationFromSegment, promptForSegmentClarification, reasoningCancelMode, restartSegmentBuildPrompt, state.activeConversationId, state.artifacts]);

  return (
    <div className={cn("flex h-full flex-col bg-background", narrow && "border-l border-border")}>
      {/* Centre→bottom transition: a 3-row grid whose trailing spacer collapses from
          1fr (composer centred) to 0fr (composer pinned to the bottom) once the
          thread starts. Animating the fr track gives the smooth slide. */}
      <div
        className="grid min-h-0 flex-1 transition-[grid-template-rows] duration-500 ease-out"
        style={{ gridTemplateRows: empty ? "1fr auto 1fr" : "1fr auto 0fr" }}
      >
        {/* Top region — hero on the empty screen, the scrolling thread once started. */}
        <div className="flex min-h-0 flex-col overflow-y-auto">
          <div
            className={cn(
              "mx-auto flex w-full flex-1 flex-col px-5",
              !narrow && "max-w-2xl",
              empty ? "justify-end pb-6" : "py-6",
            )}
          >
            {empty ? (
              <StartHero />
            ) : (
              <div className="flex flex-1 flex-col gap-5">
                {messages.map((m, i) => (
                  <MessageView
                    key={m.id}
                    message={m}
                    userRef={i === lastUserIdx ? lastUserRef : undefined}
                    liveReasoning={i === lastIdx && pendingVerify}
                    reasoningEditSessionActive={
                      i === lastIdx
                      && pendingVerify
                      && !!awaitingReasoningEditTarget
                      && m.id === awaitingReasoningEditTarget.messageId
                    }
                    onActionClick={handleMvpActionClick}
                    onSegmentOpenPanel={handleOpenSegmentPanel}
                    onSegmentApprove={handleSegmentApproved}
                    onSegmentActivate={handleSegmentActivate}
                    onConfirmReasoning={
                      i === lastIdx && pendingVerify && nextTurn
                        ? () => {
                            setAwaitingReasoningEditTarget(null);
                            advance(nextTurn.user.text);
                          }
                        : undefined
                    }
                    onRejectReasoning={
                      i === lastIdx && m.role === "lexi" && m.blocks.some((b) => b.block.type === "reasoning")
                        ? (pendingVerify
                            ? () => {
                                setReasoningCancelMode("pending-verify");
                                promptReasoningCancelInChat();
                              }
                            : () => {
                                setReasoningCancelMode("restart");
                                promptReasoningCancelInChat();
                              })
                        : undefined
                    }
                    onRequestEditReasoning={
                      i === lastIdx && m.role === "lexi" && m.blocks.some((b) => b.block.type === "reasoning")
                        ? promptForSegmentEditInChat
                        : undefined
                    }
                    reactions={messageReactions[m.id] ?? EMPTY_REACTIONS}
                    onToggleReaction={toggleReaction}
                  />
                ))}
                {thinking && (
                  <div className="flex flex-col gap-1.5 animate-in fade-in-0 duration-300">
                    <h4 className="text-sm font-semibold text-primary flex items-center gap-1.5">
                      <LexiMark className="size-3.5" /> Lexi is thinking...
                    </h4>
                    <div className="pl-1">
                      <ThinkingProcess steps={thinking.steps} mode="active" />
                    </div>
                  </div>
                )}
                <div className="min-h-[20svh] shrink-0" aria-hidden="true" />
              </div>
            )}
          </div>
        </div>

        {/* Composer — middle row; stays mounted through the transition. */}
        <div className={cn("shrink-0 px-3 pb-3 pt-2", !narrow && "mx-auto w-full max-w-2xl")}>
          {showSuggestion && nextTurn && (
            <SuggestionChip text={suggestionChipText} onSend={() => advance(nextTurn.user.text)} />
          )}
          <PromptComposer
            groups={mentionGroups}
            plusItems={plusSegmentItems}
            placeholder={empty ? "Message Lexi..." : "Reply to Lexi..."}
            onSubmit={handleSubmit}
            disabled={busy}
            enableMentions={false}
          />
          {empty ? (
            <StartPrompts
              prompts={startPrompts}
              onPick={pickStart}
              onQuickBuildSegment={quickStartNewSegmentChat}
              onQuickBuildActivation={quickStartNewActivationChat}
              onQuickSegmentActivationSingleChat={quickStartSegmentActivationSingleChat}
            />
          ) : (
            <button
              onClick={() => !busy && dispatch({ type: "SELECT_CONVERSATION", id: state.activeConversationId ?? DEFAULT_CONVERSATION_ID, autoStart: false })}
              className="mt-2 flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground disabled:opacity-50"
              disabled={busy}
            >
              <RiResetLeftLine className="size-3.5" /> Restart
            </button>
          )}
        </div>

        {/* Collapsing spacer — 1fr when centred, 0fr once pinned. */}
        <div aria-hidden="true" />
      </div>

    </div>
  );
}
