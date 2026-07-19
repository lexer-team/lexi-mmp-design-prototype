import { useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
  ConfirmDialog,
} from "@/components/ui/Dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/DropdownMenu";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/Table";
import {
  RiPlanetLine, RiSearchLine, RiAddLine, RiMore2Line, RiDeleteBinLine,
  RiLayoutGridLine, RiListUnordered,
} from "@remixicon/react";
import { totalArtifacts, type Space } from "./spaces-data";

type View = "cards" | "list";

function countLine(s: Space): string {
  const c = s.counts;
  return `${c.segments} segments · ${c.workflows} workflows · ${c.activations} activations · ${c.insights} insights`;
}

export function SpacesPage({
  spaces,
  onOpen,
  onCreate,
  onDelete,
}: {
  spaces: Space[];
  onOpen: (id: string) => void;
  onCreate: (name: string, description: string) => void;
  onDelete: (id: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [view, setView] = useState<View>("cards");
  const [createOpen, setCreateOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Space | null>(null);

  const q = query.trim().toLowerCase();
  const shown = spaces.filter(
    (s) => q === "" || s.name.toLowerCase().includes(q) || s.description.toLowerCase().includes(q),
  );

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-start gap-3 px-6 pt-6">
        <div className="min-w-0 flex-1">
          <h1 className="text-xl font-semibold text-foreground">Spaces</h1>
          <p className="mt-0.5 max-w-2xl text-sm text-foreground-secondary">
            Grouped workspaces — each gathers the segments, workflows, activations and insights for a brief.
          </p>
        </div>
        <Button size="sm" onClick={() => setCreateOpen(true)}>
          <RiAddLine className="size-4" />
          New space
        </Button>
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-2 px-6 pb-3 pt-4">
        <div className="relative">
          <RiSearchLine className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search spaces"
            className="h-9 w-64 pl-8"
          />
        </div>
        <span className="flex-1" />
        <div className="flex items-center gap-0.5 rounded-lg border border-border p-0.5">
          <ViewButton active={view === "cards"} onClick={() => setView("cards")} icon={RiLayoutGridLine} label="Card view" />
          <ViewButton active={view === "list"} onClick={() => setView("list")} icon={RiListUnordered} label="List view" />
        </div>
      </div>

      {/* Content */}
      <div className="min-h-0 flex-1 overflow-y-auto px-6 pb-6">
        {shown.length === 0 ? (
          <div className="flex h-full items-center justify-center">
            <p className="text-sm text-muted-foreground">
              {q ? "No spaces match your search." : "No spaces yet — create your first one."}
            </p>
          </div>
        ) : view === "cards" ? (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {shown.map((s) => (
              <SpaceCard key={s.id} space={s} onOpen={() => onOpen(s.id)} onDelete={() => setDeleteTarget(s)} />
            ))}
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Space</TableHead>
                <TableHead className="w-24 text-right">Artifacts</TableHead>
                <TableHead className="w-36">Updated</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {shown.map((s) => (
                <TableRow key={s.id} className="cursor-pointer" onClick={() => onOpen(s.id)}>
                  <TableCell>
                    <div className="flex items-center gap-2.5">
                      <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                        <RiPlanetLine className="size-4" />
                      </span>
                      <div className="min-w-0">
                        <span className="font-medium text-foreground">{s.name}</span>
                        <p className="max-w-md truncate text-sm text-muted-foreground">{s.description}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-right text-sm tabular-nums text-foreground-secondary">{totalArtifacts(s.counts)}</TableCell>
                  <TableCell className="text-sm text-foreground-secondary">{s.updatedLabel}</TableCell>
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <RowMenu onDelete={() => setDeleteTarget(s)} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      {/* Create dialog */}
      <CreateSpaceDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreate={(name, description) => { onCreate(name, description); setCreateOpen(false); }}
      />

      {/* Delete confirm */}
      <ConfirmDialog
        open={deleteTarget != null}
        onOpenChange={(o) => { if (!o) setDeleteTarget(null); }}
        title={`Delete "${deleteTarget?.name}"?`}
        description="This removes the space and its grouping. The underlying artifacts aren't deleted."
        confirmLabel="Delete"
        variant="destructive"
        icon={RiDeleteBinLine}
        onConfirm={() => { if (deleteTarget) onDelete(deleteTarget.id); setDeleteTarget(null); }}
      />
    </div>
  );
}

// ─── Card ───────────────────────────────────────────────────────────────────────

function SpaceCard({ space, onOpen, onDelete }: { space: Space; onOpen: () => void; onDelete: () => void }) {
  return (
    <div
      onClick={onOpen}
      className="group flex cursor-pointer flex-col gap-3 rounded-xl border border-border bg-card p-4 shadow-xs transition-colors hover:border-primary/40 hover:bg-accent/30"
    >
      <div className="flex items-start gap-2.5">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <RiPlanetLine className="size-5" />
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-sm font-semibold text-foreground">{space.name}</h3>
          <p className="mt-0.5 text-xs text-muted-foreground">Updated {space.updatedLabel}</p>
        </div>
        <div onClick={(e) => e.stopPropagation()}>
          <RowMenu onDelete={onDelete} />
        </div>
      </div>
      <p className="line-clamp-2 text-sm text-foreground-secondary">{space.description}</p>
      <p className="mt-auto truncate text-xs text-muted-foreground">{countLine(space)}</p>
    </div>
  );
}

// ─── Row / card overflow menu ─────────────────────────────────────────────────

function RowMenu({ onDelete }: { onDelete: () => void }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className="flex size-7 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          title="More"
        >
          <RiMore2Line className="size-4" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onSelect={onDelete} className="text-destructive focus:text-destructive">
          <RiDeleteBinLine className="size-4" />
          Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// ─── View toggle button ─────────────────────────────────────────────────────────

function ViewButton({
  active, onClick, icon: Icon, label,
}: {
  active: boolean; onClick: () => void; icon: typeof RiLayoutGridLine; label: string;
}) {
  return (
    <button
      onClick={onClick}
      title={label}
      className={cn(
        "flex size-7 items-center justify-center rounded-md transition-colors",
        active ? "bg-accent text-foreground" : "text-muted-foreground hover:text-foreground",
      )}
    >
      <Icon className="size-4" />
    </button>
  );
}

// ─── Create dialog ────────────────────────────────────────────────────────────

function CreateSpaceDialog({
  open, onOpenChange, onCreate,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onCreate: (name: string, description: string) => void;
}) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  const submit = () => {
    if (name.trim() === "") return;
    onCreate(name.trim(), description.trim());
    setName("");
    setDescription("");
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { onOpenChange(o); if (!o) { setName(""); setDescription(""); } }}>
      <DialogContent size="md">
        <DialogHeader>
          <DialogTitle>New space</DialogTitle>
          <DialogDescription>Name your space and describe what you want to achieve — Lexi uses your goal to steer the work across this space.</DialogDescription>
        </DialogHeader>
        <div className="mt-4 flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-foreground">Name</label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Spring clearance"
              autoFocus
              onKeyDown={(e) => { if (e.key === "Enter") submit(); }}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-foreground">Goal & intent <span className="text-muted-foreground">(optional)</span></label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What are you trying to achieve in this space? e.g. Clear spring stock by re-engaging lapsed buyers with above-median LTV."
              rows={3}
              className="w-full resize-none rounded-lg border border-input-border bg-input px-3 py-2 text-sm text-foreground shadow-xs outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-4 focus-visible:ring-ring/40"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={submit} disabled={name.trim() === ""}>Create space</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
