import { useState } from "react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/Badge";
import { useConceptStore, type ConceptMeta, type ConceptStatus } from "@/lib/concepts";
import {
  RiFlaskLine,
  RiPaletteLine,
  RiEditLine,
  RiCloseLine,
  RiArchiveLine,
  RiInboxArchiveLine,
  RiInboxUnarchiveLine,
} from "@remixicon/react";

const STATUS_OPTIONS: { value: ConceptStatus; label: string }[] = [
  { value: "in-progress", label: "In Progress" },
  { value: "in-review", label: "In Review" },
  { value: "accepted", label: "Accepted" },
  { value: "rejected", label: "Rejected" },
];

const STATUS_BADGE_VARIANT: Record<ConceptStatus, "default" | "warning" | "success" | "danger"> = {
  "in-progress": "default",
  "in-review": "warning",
  accepted: "success",
  rejected: "danger",
};

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}

async function saveConceptMeta(slug: string, title: string, description: string) {
  await fetch("/api/concept-meta", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ slug, title, description }),
  });
}

// ─── Edit Modal ──────────────────────────────────────────────────────────────

interface EditModalProps {
  concept: ConceptMeta;
  onSave: (fields: { title: string; description: string; status: ConceptStatus }) => void;
  onClose: () => void;
}

function EditModal({ concept, onSave, onClose }: EditModalProps) {
  const [title, setTitle] = useState(concept.title);
  const [description, setDescription] = useState(concept.description);
  const [status, setStatus] = useState(concept.status);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmedTitle = title.trim();
    if (!trimmedTitle) return;
    onSave({ title: trimmedTitle, description: description.trim(), status });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/20 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-sm rounded-xl border border-border bg-card shadow-lg p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold">Edit Prototype</h2>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <RiCloseLine className="size-4" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-muted-foreground">Title</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="text-sm rounded-lg border border-border bg-background px-3 py-1.5 outline-none focus:border-primary"
              autoFocus
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-muted-foreground">Description</label>
            <input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="text-sm rounded-lg border border-border bg-background px-3 py-1.5 outline-none focus:border-primary"
              placeholder="Optional description..."
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-muted-foreground">Status</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as ConceptStatus)}
              className="text-sm rounded-lg border border-border bg-background px-3 py-1.5 outline-none focus:border-primary cursor-pointer"
            >
              {STATUS_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
          <button
            type="submit"
            className="mt-1 text-sm font-medium rounded-lg bg-primary text-primary-foreground px-3 py-1.5 hover:bg-primary/90 transition-colors"
          >
            Save
          </button>
        </form>
      </div>
    </div>
  );
}

// ─── Concept Row ─────────────────────────────────────────────────────────────

interface ConceptRowProps {
  concept: ConceptMeta;
  onEdit: (concept: ConceptMeta) => void;
  onOpen: (slug: string) => void;
  onToggleArchive: (concept: ConceptMeta) => void;
}

function ConceptRow({ concept, onEdit, onOpen, onToggleArchive }: ConceptRowProps) {
  const archived = concept.archived;
  return (
    <div
      className="group flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
      onClick={() => onOpen(concept.id)}
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium truncate">{concept.title}</span>
          {concept.parentId && (
            <span className="text-xs text-muted-foreground">
              forked from {concept.parentId}
            </span>
          )}
        </div>
        {concept.description && (
          <p className="text-xs text-muted-foreground truncate mt-0.5">
            {concept.description}
          </p>
        )}
      </div>

      <span className="text-xs text-muted-foreground whitespace-nowrap">
        {relativeTime(concept.updatedAt)}
      </span>

      <Badge variant={STATUS_BADGE_VARIANT[concept.status]}>
        {STATUS_OPTIONS.find((o) => o.value === concept.status)?.label}
      </Badge>

      <div className="flex items-center gap-1.5">
        {!archived && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onEdit(concept);
            }}
            className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-foreground transition-opacity"
            title="Edit prototype"
          >
            <RiEditLine className="size-3.5" />
          </button>
        )}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleArchive(concept);
          }}
          className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-foreground transition-opacity"
          title={archived ? "Unarchive" : "Archive"}
        >
          {archived ? (
            <RiInboxUnarchiveLine className="size-3.5" />
          ) : (
            <RiInboxArchiveLine className="size-3.5" />
          )}
        </button>
      </div>
    </div>
  );
}

// ─── Listing Page ────────────────────────────────────────────────────────────

interface ConceptsListingProps {
  onOpenConcept: (slug: string) => void;
  onOpenDesignSystem: () => void;
}

export function ConceptsListing({ onOpenConcept, onOpenDesignSystem }: ConceptsListingProps) {
  const { concepts, update, setArchived } = useConceptStore();
  const [editing, setEditing] = useState<ConceptMeta | null>(null);
  const [tab, setTab] = useState<"active" | "archived">("active");

  const sorted = Object.values(concepts).sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  );
  const activeList = sorted.filter((c) => !c.archived);
  const archivedList = sorted.filter((c) => c.archived);
  const list = tab === "archived" ? archivedList : activeList;

  function handleSave(fields: { title: string; description: string; status: ConceptStatus }) {
    if (!editing) return;
    saveConceptMeta(editing.id, fields.title, fields.description);
    update(editing.id, { title: fields.title, description: fields.description, status: fields.status });
    setEditing(null);
  }

  if (sorted.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-screen gap-3 text-center px-6">
        <div className="size-12 rounded-full bg-muted flex items-center justify-center">
          <RiFlaskLine className="size-5 text-muted-foreground" />
        </div>
        <div>
          <p className="text-sm font-medium">No concepts yet</p>
          <p className="text-xs text-muted-foreground mt-1">
            Use Claude Code to create your first prototype.
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="max-w-3xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-lg font-semibold">Prototypes</h1>
          <button
            onClick={onOpenDesignSystem}
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <RiPaletteLine className="size-3.5" />
            <span>Design System</span>
          </button>
        </div>

        {/* Tabs: Active / Archived */}
        <div className="flex items-center gap-1 border-b border-border mb-2">
          <TabButton
            label="Active"
            count={activeList.length}
            active={tab === "active"}
            onClick={() => setTab("active")}
          />
          <TabButton
            label="Archived"
            count={archivedList.length}
            active={tab === "archived"}
            onClick={() => setTab("archived")}
          />
        </div>

        {list.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 py-16 text-center">
            <div className="size-10 rounded-full bg-muted flex items-center justify-center">
              <RiArchiveLine className="size-4 text-muted-foreground" />
            </div>
            <p className="text-sm font-medium">
              {tab === "archived" ? "Nothing archived" : "No active prototypes"}
            </p>
            <p className="text-xs text-muted-foreground">
              {tab === "archived"
                ? "Archived prototypes will appear here."
                : "Archived prototypes are under the Archived tab."}
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-0.5">
            {list.map((concept) => (
              <ConceptRow
                key={concept.id}
                concept={concept}
                onEdit={setEditing}
                onOpen={onOpenConcept}
                onToggleArchive={(c) => setArchived(c.id, !c.archived)}
              />
            ))}
          </div>
        )}
      </div>
      {editing && (
        <EditModal
          concept={editing}
          onSave={handleSave}
          onClose={() => setEditing(null)}
        />
      )}
    </>
  );
}

// ─── Tab button ──────────────────────────────────────────────────────────────

function TabButton({
  label,
  count,
  active,
  onClick,
}: {
  label: string;
  count: number;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "-mb-px flex items-center gap-1.5 border-b-2 px-3 py-2 text-sm font-medium transition-colors",
        active
          ? "border-primary text-foreground"
          : "border-transparent text-muted-foreground hover:text-foreground"
      )}
    >
      <span>{label}</span>
      <span
        className={cn(
          "rounded-full px-1.5 text-xs tabular-nums",
          active ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
        )}
      >
        {count}
      </span>
    </button>
  );
}
