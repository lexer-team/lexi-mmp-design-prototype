import { useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Switch } from "@/components/ui/Switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/Tabs";
import { Textarea } from "@/components/ui/Textarea";
import { ConfirmDialog, Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/Dialog";
import { Markdown } from "./Markdown";

export type SkillRevision = {
  version: number;
  name: string;
  description: string;
  body: string;
  enabled: boolean;
  updatedBy: string;
  updatedAt: string;
};

export type SkillRecord = {
  id: string;
  name: string;
  description: string;
  body?: string;
  enabled: boolean;
  updatedBy: string;
  updatedAt: string;
  history?: SkillRevision[];
};

function updatedNow() {
  return new Date().toLocaleString("en-AU", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function SkillEditor({
  skill,
  onSave,
  onDelete,
  onBack,
}: {
  skill: SkillRecord;
  onSave: (skill: SkillRecord) => void;
  onDelete: () => void;
  onBack: () => void;
}) {
  const [draft, setDraft] = useState(skill);
  const [bodyView, setBodyView] = useState<"write" | "preview">("write");
  const [revisionToView, setRevisionToView] = useState<SkillRevision | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [saved, setSaved] = useState(false);

  const saveSkill = () => {
    const updatedAt = updatedNow();
    const revision: SkillRevision = {
      version: Math.max(0, ...(skill.history ?? []).map((item) => item.version)) + 1,
      name: draft.name,
      description: draft.description,
      body: draft.body ?? "",
      enabled: draft.enabled,
      updatedBy: skill.updatedBy,
      updatedAt,
    };
    const updatedSkill: SkillRecord = {
      ...draft,
      updatedBy: skill.updatedBy,
      updatedAt,
      history: [revision, ...(skill.history ?? [])],
    };
    setDraft(updatedSkill);
    onSave(updatedSkill);
    setSaved(true);
  };

  const restoreRevision = (revision: SkillRevision) => {
    setDraft((current) => ({
      ...current,
      name: revision.name,
      description: revision.description,
      body: revision.body,
      enabled: revision.enabled,
    }));
    setRevisionToView(null);
    setBodyView("write");
    setSaved(false);
  };

  return (
    <div className="mx-auto w-full max-w-3xl space-y-4 pb-8">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Edit skill</h1>
          <p className="mt-1 text-sm text-foreground-secondary">Global skill · available to all clients</p>
        </div>
        <div className="flex items-center gap-2">
          <label htmlFor="bfcm-skill-enabled" className="text-sm font-medium text-foreground">Enabled</label>
          <Switch id="bfcm-skill-enabled" checked={draft.enabled} onCheckedChange={(enabled) => { setDraft((current) => ({ ...current, enabled })); setSaved(false); }} />
          {draft.enabled ? <Badge variant="success" size="sm">Live</Badge> : <Badge variant="secondary" size="sm">Disabled</Badge>}
        </div>
      </header>

      <section className="space-y-4 rounded-xl border border-border bg-card p-4">
        <div>
          <label htmlFor="bfcm-skill-title" className="text-xs font-semibold text-foreground-secondary">Title</label>
          <Input id="bfcm-skill-title" value={draft.name} onChange={(event) => { setDraft((current) => ({ ...current, name: event.target.value })); setSaved(false); }} className="mt-1" />
        </div>
        <div>
          <label htmlFor="bfcm-skill-description" className="text-xs font-semibold text-foreground-secondary">Description</label>
          <Textarea id="bfcm-skill-description" value={draft.description} onChange={(event) => { setDraft((current) => ({ ...current, description: event.target.value })); setSaved(false); }} className="mt-1 min-h-20" rows={3} />
        </div>
        <section>
          <div className="flex items-center justify-between gap-3">
            <label htmlFor="bfcm-skill-body" className="text-xs font-semibold text-foreground-secondary">Body (markdown)</label>
            <Tabs value={bodyView} onValueChange={(value) => setBodyView(value as "write" | "preview")}>
              <TabsList variant="segmented">
                <TabsTrigger value="write">Write</TabsTrigger>
                <TabsTrigger value="preview">Preview</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
          {bodyView === "write" ? (
            <Textarea id="bfcm-skill-body" value={draft.body ?? ""} onChange={(event) => { setDraft((current) => ({ ...current, body: event.target.value })); setSaved(false); }} className="mt-2 min-h-[26rem] resize-y font-mono text-xs leading-relaxed" />
          ) : (
            <div className="mt-2 min-h-[26rem] rounded-lg border border-border bg-background p-4">
              <Markdown source={draft.body ?? ""} />
            </div>
          )}
        </section>

        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border pt-3">
          <div className="flex items-center gap-2">
            <Button onClick={saveSkill} disabled={!draft.name.trim() || !draft.description.trim() || !draft.body?.trim()}>{saved ? "Saved" : "Save"}</Button>
            <Button variant="destructive" onClick={() => setDeleteConfirmOpen(true)}>Delete</Button>
            <Button variant="outline" onClick={onBack}>Back to list</Button>
          </div>
          <span className="text-xs text-muted-foreground">Updated {draft.updatedAt} · {draft.updatedBy}</span>
        </div>
      </section>

      <section className="rounded-xl border border-border bg-card">
        <h2 className="border-b border-border px-4 py-3 text-sm font-semibold text-foreground">History</h2>
        {(draft.history ?? []).map((revision) => (
          <div key={revision.version} className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-2.5 last:border-b-0">
            <div>
              <p className="text-sm font-medium text-foreground">Revision {revision.version}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">{revision.updatedBy} · {revision.updatedAt}</p>
            </div>
            <div className="flex items-center gap-2">
              <Button size="sm" variant="outline" onClick={() => setRevisionToView(revision)}>View</Button>
              <Button size="sm" variant="ghost" onClick={() => restoreRevision(revision)}>Roll back</Button>
            </div>
          </div>
        ))}
      </section>

      <Dialog open={Boolean(revisionToView)} onOpenChange={(open) => { if (!open) setRevisionToView(null); }}>
        <DialogContent size="lg">
          <DialogHeader>
            <DialogTitle>Revision {revisionToView?.version}</DialogTitle>
            <DialogDescription>{revisionToView?.updatedBy} · {revisionToView?.updatedAt}</DialogDescription>
          </DialogHeader>
          <div className="max-h-[60vh] overflow-y-auto rounded-lg border border-border bg-background p-4">
            <Markdown source={revisionToView?.body ?? ""} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRevisionToView(null)}>Close</Button>
            {revisionToView && <Button onClick={() => restoreRevision(revisionToView)}>Roll back to this revision</Button>}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={deleteConfirmOpen}
        onOpenChange={setDeleteConfirmOpen}
        variant="destructive"
        title="Delete BFCM Sale Strategy?"
        description="This removes the skill from the global skills list."
        confirmLabel="Delete skill"
        cancelLabel="Keep skill"
        onConfirm={onDelete}
      />
    </div>
  );
}