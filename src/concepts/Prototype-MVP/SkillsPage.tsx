import { useState } from "react";
import { RiAddLine, RiDeleteBinLine, RiEditLine, RiGlobalLine, RiSearchLine } from "@remixicon/react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Switch } from "@/components/ui/Switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/Tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/Table";
import { ConfirmDialog, Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/Dialog";
import { Markdown } from "./Markdown";
import { SkillEditor } from "./SkillEditor";

type SkillRevision = {
  version: number;
  name: string;
  description: string;
  body: string;
  enabled: boolean;
  updatedBy: string;
  updatedAt: string;
};

type GlobalSkill = {
  id: string;
  categoryId?: string | null;
  name: string;
  description: string;
  body?: string;
  enabled: boolean;
  updatedBy: string;
  updatedAt: string;
  history?: SkillRevision[];
};

type SkillCategory = { id: string; name: string };

const SKILL_CATEGORIES: SkillCategory[] = [
  { id: "black-friday", name: "Black Friday" },
  { id: "promotions", name: "Promotions" },
  { id: "customers", name: "Customer insights" },
  { id: "email-lifecycle", name: "Email & lifecycle" },
  { id: "segments", name: "Segments" },
  { id: "analysis", name: "Analysis" },
];

const DEFAULT_CATEGORY_BY_SKILL: Record<string, string> = {
  "bfcm-sale-strategy": "black-friday",
  "customer-mix": "customers",
  "customer-quality": "customers",
  "email-list-health": "email-lifecycle",
  "executive-brief": "analysis",
  "new-user-onboarding": "email-lifecycle",
  "product-mix": "promotions",
  "promotion-event-windows": "promotions",
  "promotion-opportunities": "promotions",
  "promotion-segment-builder": "segments",
  "second-order-conversion": "customers",
  "building-customer-segment": "segments",
  "segment-performance": "segments",
  "what-if-scenarios": "analysis",
};

function SkillCategoryPanel({
  categories,
  selectedCategoryId,
  skillCounts,
  uncategorisedCount,
  totalCount,
  onSelect,
  onCreate,
  onEdit,
  onDelete,
}: {
  categories: SkillCategory[];
  selectedCategoryId: string;
  skillCounts: Record<string, number>;
  uncategorisedCount: number;
  totalCount: number;
  onSelect: (id: string) => void;
  onCreate: () => void;
  onEdit: (category: SkillCategory) => void;
  onDelete: (category: SkillCategory) => void;
}) {
  const renderCategory = (id: string, label: string, count: number, category?: SkillCategory) => (
    <div key={id} className={`group flex items-center gap-1 rounded-lg ${selectedCategoryId === id ? "bg-accent text-foreground" : "text-foreground-secondary hover:bg-muted/50 hover:text-foreground"}`}>
      <button type="button" onClick={() => onSelect(id)} className="flex min-w-0 flex-1 items-center justify-between gap-2 rounded-lg px-2.5 py-2 text-left text-sm">
        <span className="truncate">{label}</span>
        <span className="text-xs tabular-nums text-muted-foreground">{count}</span>
      </button>
      {category && (
        <div className="flex shrink-0 items-center pr-1 opacity-70 group-hover:opacity-100 focus-within:opacity-100">
          <button type="button" aria-label={`Rename ${category.name}`} title={`Rename ${category.name}`} onClick={() => onEdit(category)} className="rounded-md p-1 text-muted-foreground hover:bg-background hover:text-foreground">
            <RiEditLine className="size-3.5" />
          </button>
          <button type="button" aria-label={`Delete ${category.name}`} title={`Delete ${category.name}`} onClick={() => onDelete(category)} className="rounded-md p-1 text-muted-foreground hover:bg-background hover:text-destructive">
            <RiDeleteBinLine className="size-3.5" />
          </button>
        </div>
      )}
    </div>
  );

  return (
    <aside className="flex w-64 shrink-0 flex-col border-r border-border bg-background px-3 py-4">
      <div className="mb-3 flex items-center justify-between gap-2 px-2">
        <h2 className="text-sm font-semibold text-foreground">Categories</h2>
        <button type="button" aria-label="Add category" title="Add category" onClick={onCreate} className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground">
          <RiAddLine className="size-4" />
        </button>
      </div>
      <nav aria-label="Skill categories" className="flex flex-col gap-1 overflow-y-auto">
        {renderCategory("all", "All skills", totalCount)}
        {categories.map((category) => renderCategory(category.id, category.name, skillCounts[category.id] ?? 0, category))}
        {uncategorisedCount > 0 && renderCategory("uncategorised", "Uncategorised", uncategorisedCount)}
      </nav>
    </aside>
  );
}

const BFCM_SALE_STRATEGY_BODY = [
  "# BFCM sale strategy (playbook)",
  "",
  "## Input",
  "- Any handoff blocks already in the conversation. Reuse them, and mark those steps ✅ without re-running them.",
  "",
  "## Steps",
  "Run **one step per turn**, in this order:",
  "",
  "| # | Stage | Skill |",
  "|---|---|---|",
  "| 1 | 📅 Dates | `promo-event-windows` |",
  "| 2 | 🛍️ Products | `product-mix` |",
  "| 3 | ✉️ Email | `email-list-health`, only if the user mentions email or the client KB shows email data. Otherwise strike it through as skipped |",
  "| 4 | 👥 Customers | `customer-mix` |",
  "| 5 | 💎 Quality | `customer-quality` |",
  "| 6 | 💡 Opportunities | `promo-opportunities` |",
  "| 7 | 🎯 Segment | Offer `promo-segment-builder` for O1 |",
  "",
  "After each step, wait for the user's reply before the next one.",
  "",
  "## Output",
  "Every turn uses the same three-part shape.",
  "",
  "**1. Progress header and tracker**, as two separate lines with a blank line between them:",
  "```",
  "### Step 2 of 7 · 🛍️ Product Mix",
  "",
  "✅ Dates · **🛍️ Product Mix** · Email Health · Customer Mix · Customer Quality · Opportunities · Segments",
  "```",
  "- Done stages get ✅. The current stage is **bold** with its emoji. Upcoming stages are plain text.",
  "- Skipped stages are struck through with the reason, e.g. ~~Email~~ (no email data).",
  "- No progress dots, arrows or empty boxes.",
  "",
  "**2. This step's result:** only what the user needs to see.",
  "- Dates: one line per year.",
  "- Product Mix: the product-mix table.",
  "- Email Health: the flags only.",
  "- Customer Mix: the customer-mix table.",
  "- Customer Quality: the one-line verdict.",
  "- Opportunities: the 3 opportunities.",
  "- Keep that skill's handoff block to one line.",
  "",
  "**3. Next step:**",
  "```",
  "Next: 👥 Customer Mix",
  "1. Continue · 2. Skip this step · 3. Stop here",
  "```",
  "",
  "**After the last step:** show the tracker with every stage ✅ or struck through, then a summary card.",
  "```",
  "### ✅ BFCM sale strategy complete",
  "| Stage | Headline |",
  "|---|---|",
  "| 📅 Dates | 28/11 to 01/12 last year |",
  "| 🛍️ Product Mix | 6 to include, 3 to hold |",
  "| ... | ... |",
  "```",
  "Then the segment offer for O1.",
  "",
  "## Rules",
  "- Total query budget: 6. One per stage. Opportunities and Segment use no queries.",
  "- One step per turn, so each answer stays short.",
  "- No charts or visualisations unless the user asks for one.",
  "- Don't repeat earlier steps' results. The tracker and the summary card carry them forward.",
  "- Accept 1, 2 or 3, or a free-text redirect (e.g. \"skip to opportunities\").",
  "- If the user stops early, show the summary card for the completed steps and offer to pick up later.",
].join("\n");

const BFCM_REVISIONS: SkillRevision[] = [5, 4, 3, 2, 1].map((version, index) => ({
  version,
  name: "BFCM Sale Strategy",
  description: "Playbook for planning an upcoming BFCM sale and its customer, product, email and segment opportunities.",
  body: BFCM_SALE_STRATEGY_BODY,
  enabled: true,
  updatedBy: "divyesh.prakash@lexer.io",
  updatedAt: ["22 Oct 2026, 14:07", "21 Oct 2026, 11:42", "20 Oct 2026, 16:07", "19 Oct 2026, 14:59", "17 Oct 2026, 10:12"][index],
}));

const GLOBAL_SKILLS: GlobalSkill[] = [
  { id: "bfcm-sale-strategy", name: "BFCM Sale Strategy", description: "Playbook for planning an upcoming BFCM sale: sale dates, what to include or exclude, the email list impact, who buys and whether they fit worth it, then opportunities and a segment. Runs one step per turn with a visible progress tracker. Use when asked to plan BFCM, prepare for the sale, or get a broad view that should do this Black Friday.", body: BFCM_SALE_STRATEGY_BODY, enabled: true, updatedBy: "divyesh.prakash@lexer.io", updatedAt: "22 Oct 2026, 14:07", history: BFCM_REVISIONS },
  { id: "customer-mix", name: "Customer Mix", description: "Show how buyers break during a sale or requested time period: new, returning and reactivated customers, with their orders, revenue and AOV. Use when asked who bought in a specific sale or time period e.g. last month, how many new customers were brought in, or how first-time buyers compare with existing customers.", enabled: true, updatedBy: "divyesh.prakash@lexer.io", updatedAt: "26 Oct 2026, 09:00" },
  { id: "customer-quality", name: "Customer Quality", description: "Judge whether customers first acquired in BFCM were worth it, comparing their repeat rate and value with customers acquired outside the sale. Use when asked about BFCM's impact on CLV, whether sale customers come back, or whether discounting attracts low-value customers.", enabled: true, updatedBy: "divyesh.prakash@lexer.io", updatedAt: "19 Oct 2026, 14:59" },
  { id: "email-list-health", name: "Email List Health", description: "Show how a sale affected the email list: sign-ups, opt-outs, bounces and spam complaints, before, during and after. Use when asked about email subscribers, unsubscribes or deliverability around BFCM or any sale.", enabled: true, updatedBy: "divyesh.prakash@lexer.io", updatedAt: "19 Oct 2026, 14:59" },
  { id: "executive-brief", name: "Executive brief", description: "Use this when someone asks for a summary, a brief, ‘something for my boss’, ‘for the board’ or ‘for Slack’, to boil an answer down.", enabled: true, updatedBy: "divyesh.prakash@lexer.io", updatedAt: "20 Oct 2026, 16:17" },
  { id: "new-user-onboarding", name: "New User Onboarding", description: "Welcome a new user to Lexi, learn about them with 8 quick questions (team, role, priority, reporting cadence, reporting audience, answer style, format, 30-day goal), save their answers to memory, then finish with starter prompts that fit them. Use in a user's first conversation when memory holds nothing about them, or when they say they're new, ask how to get started or how to use Lexi, or ask to set up or update their preferences.", enabled: true, updatedBy: "divyesh.prakash@lexer.io", updatedAt: "23 Oct 2026, 07:56" },
  { id: "product-mix", name: "Product Mix", description: "Rank products or categories for a BFCM sale: which to include or exclude based on margin and past sale uplift, and what to promote or hold back based on stock. Use when asked what to put on sale, what did well last BFCM, which offers worked, or what to promote or stop promoting.", enabled: true, updatedBy: "divyesh.prakash@lexer.io", updatedAt: "23 Oct 2026, 07:56" },
  { id: "promotion-event-windows", name: "Promotion Event Windows", description: "Find the sale dates for Black Friday / Cyber Monday (BFCM) in each year of the client's data and return an EVENT_WINDOWS block. If the client's own dates aren't known, infer them from the data (order spikes, discount use, promotion names) and confirm with the user. Use whenever a question mentions Black Friday, Cyber Monday, BFCM, or sale or campaign timing. Run once per conversation and reuse the block after that.", enabled: true, updatedBy: "divyesh.prakash@lexer.io", updatedAt: "22 Oct 2026, 14:04" },
  { id: "promotion-opportunities", name: "Promotion Opportunities", description: "Turn findings from the analysis skills into at most 3 actionable opportunities. Use after product-mix, customer-mix, customer-quality, email-list-health or segment-performance, or when asked ‘so what should we do?’ about a sale.", enabled: true, updatedBy: "divyesh.prakash@lexer.io", updatedAt: "19 Oct 2026, 14:59" },
  { id: "promotion-segment-builder", name: "Promotion Segment Builder", description: "Turn one opportunity into a Segment. Use when the user accepts a segment offer, asks to build or activate an audience from an insight, or names an opportunity ID.", enabled: true, updatedBy: "divyesh.prakash@lexer.io", updatedAt: "20 Oct 2026, 16:07" },
  { id: "second-order-conversion", name: "Second-order conversion", description: "Use this when someone asks about repeat purchase: repeat rate, second-order conversion, one-and-done buyers, how many new customers come back, time to second purchase, when customers lapse, which first products or channels bring people back, what drives repeat purchase, or a plan to lift it. For a single metric, choose the right window and show one answer before expanding.", enabled: false, updatedBy: "divyesh.prakash@lexer.io", updatedAt: "19 Oct 2026, 14:25" },
  { id: "building-customer-segment", name: "Building a customer segment", description: "Use this when someone asks to create, save, build or define a segment, audience or cohort.", enabled: false, updatedBy: "divyesh.prakash@lexer.io", updatedAt: "19 Oct 2026, 14:25" },
  { id: "segment-performance", name: "Segment Performance", description: "Report how an activated segment performed. Use when asked how a segment, campaign or activation went, whether it worked, or for results on a segment.", enabled: true, updatedBy: "divyesh.prakash@lexer.io", updatedAt: "20 Oct 2026, 16:08" },
  { id: "what-if-scenarios", name: "What-if scenarios", description: "Use when someone asks ‘what if’, ‘what would it be worth’, ‘how much could we make if’, or wants to size an opportunity.", enabled: false, updatedBy: "divyesh.prakash@lexer.io", updatedAt: "19 Oct 2026, 14:25" },
];

function skillSlug(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

function updatedNow() {
  return new Date().toLocaleString("en-AU", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function SkillsPage() {
  const [skills, setSkills] = useState(() => GLOBAL_SKILLS.map((skill) => ({
    ...skill,
    categoryId: DEFAULT_CATEGORY_BY_SKILL[skill.id] ?? null,
  })));
  const [categories, setCategories] = useState(SKILL_CATEGORIES);
  const [selectedCategoryId, setSelectedCategoryId] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [editingSkillId, setEditingSkillId] = useState<string | null>(null);
  const [newSkillOpen, setNewSkillOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [categoryName, setCategoryName] = useState("");
  const [categoryError, setCategoryError] = useState("");
  const [categoryToDelete, setCategoryToDelete] = useState<SkillCategory | null>(null);

  const createSkill = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const normalizedName = name.trim();
    if (!normalizedName) return;
    const id = skillSlug(normalizedName);
    setSkills((current) => [
      {
        id: `${id}-${Date.now()}`,
        categoryId: selectedCategoryId === "all" || selectedCategoryId === "uncategorised" ? null : selectedCategoryId,
        name: normalizedName,
        description: description.trim(),
        body: "",
        enabled: true,
        updatedBy: "Amy Vong",
        updatedAt: updatedNow(),
      },
      ...current,
    ]);
    setName("");
    setDescription("");
    setNewSkillOpen(false);
  };

  const editingSkill = skills.find((skill) => skill.id === editingSkillId);
  const skillCounts = Object.fromEntries(categories.map((category) => [
    category.id,
    skills.filter((skill) => skill.categoryId === category.id).length,
  ]));
  const normalizedSearch = searchQuery.trim().toLocaleLowerCase();
  const filteredSkills = skills.filter((skill) => {
    const matchesCategory = normalizedSearch.length > 0
      || selectedCategoryId === "all"
      || (selectedCategoryId === "uncategorised" ? !skill.categoryId : skill.categoryId === selectedCategoryId);
    const categoryName = categories.find((category) => category.id === skill.categoryId)?.name ?? "Uncategorised";
    const matchesSearch = !normalizedSearch || [skill.name, skill.description, skill.body ?? "", categoryName]
      .some((value) => value.toLocaleLowerCase().includes(normalizedSearch));
    return matchesCategory && matchesSearch;
  });
  const uncategorisedCount = skills.filter((skill) => !skill.categoryId).length;
  const saveSkill = (updatedSkill: GlobalSkill) => {
    setSkills((current) => current.map((skill) => skill.id === updatedSkill.id ? updatedSkill : skill));
  };
  const deleteEditingSkill = () => {
    if (!editingSkillId) return;
    setSkills((current) => current.filter((skill) => skill.id !== editingSkillId));
    setEditingSkillId(null);
  };

  const openNewCategoryDialog = () => {
    setEditingCategoryId(null);
    setCategoryName("");
    setCategoryError("");
    setCategoryDialogOpen(true);
  };

  const openEditCategoryDialog = (category: SkillCategory) => {
    setEditingCategoryId(category.id);
    setCategoryName(category.name);
    setCategoryError("");
    setCategoryDialogOpen(true);
  };

  const saveCategory = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const normalizedName = categoryName.trim();
    if (!normalizedName) return;
    if (categories.some((category) => category.name.toLowerCase() === normalizedName.toLowerCase() && category.id !== editingCategoryId)) {
      setCategoryError("A category with this name already exists.");
      return;
    }
    if (editingCategoryId) {
      setCategories((current) => current.map((category) => category.id === editingCategoryId ? { ...category, name: normalizedName } : category));
    } else {
      const newCategory = { id: `category-${skillSlug(normalizedName)}-${Date.now()}`, name: normalizedName };
      setCategories((current) => [...current, newCategory]);
      setSelectedCategoryId(newCategory.id);
    }
    setCategoryDialogOpen(false);
  };

  const deleteCategory = () => {
    if (!categoryToDelete) return;
    setCategories((current) => current.filter((category) => category.id !== categoryToDelete.id));
    setSkills((current) => current.map((skill) => skill.categoryId === categoryToDelete.id ? { ...skill, categoryId: null } : skill));
    if (selectedCategoryId === categoryToDelete.id) setSelectedCategoryId("uncategorised");
    setCategoryToDelete(null);
  };

  const categoryRail = (
    <SkillCategoryPanel
      categories={categories}
      selectedCategoryId={selectedCategoryId}
      skillCounts={skillCounts}
      uncategorisedCount={uncategorisedCount}
      totalCount={skills.length}
      onSelect={(id) => { setSelectedCategoryId(id); setEditingSkillId(null); }}
      onCreate={openNewCategoryDialog}
      onEdit={openEditCategoryDialog}
      onDelete={setCategoryToDelete}
    />
  );

  const categoryDialogs = (
    <>
      <Dialog open={categoryDialogOpen} onOpenChange={setCategoryDialogOpen}>
        <DialogContent size="sm">
          <DialogHeader>
            <DialogTitle>{editingCategoryId ? "Rename category" : "New category"}</DialogTitle>
            <DialogDescription>Organise global skills by theme.</DialogDescription>
          </DialogHeader>
          <form onSubmit={saveCategory} className="mt-4 space-y-3">
            <div>
              <label htmlFor="skill-category-name" className="text-sm font-medium text-foreground">Category name</label>
              <Input id="skill-category-name" value={categoryName} onChange={(event) => { setCategoryName(event.target.value); setCategoryError(""); }} className="mt-1" autoFocus required />
              {categoryError && <p role="alert" className="mt-1 text-xs text-destructive">{categoryError}</p>}
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setCategoryDialogOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={!categoryName.trim()}>{editingCategoryId ? "Save changes" : "Create category"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      <ConfirmDialog
        open={Boolean(categoryToDelete)}
        onOpenChange={(open) => { if (!open) setCategoryToDelete(null); }}
        title={`Delete ${categoryToDelete?.name ?? "category"}?`}
        description="Skills in this category will move to Uncategorised."
        confirmLabel="Delete category"
        cancelLabel="Keep category"
        variant="destructive"
        onConfirm={deleteCategory}
      />
    </>
  );
  const searchBar = (
    <div className="relative w-full">
      <RiSearchLine className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        type="search"
        value={searchQuery}
        onChange={(event) => setSearchQuery(event.target.value)}
        placeholder="Search skills across all categories"
        aria-label="Search skills across all categories"
        className="pl-9"
      />
    </div>
  );

  if (editingSkill) {
    return (
      <div className="flex h-full min-w-0 overflow-hidden bg-background">
        {categoryRail}
        <div className="min-w-0 flex-1 overflow-y-auto px-6 py-6">
          <div className="mb-4">{searchBar}</div>
          <SkillEditor
            key={editingSkill.id}
            skill={editingSkill}
            onSave={saveSkill}
            onDelete={deleteEditingSkill}
            onBack={() => setEditingSkillId(null)}
          />
        </div>
        {categoryDialogs}
      </div>
    );
  }

  return (
    <div className="flex h-full min-w-0 overflow-hidden bg-background">
      {categoryRail}
      <div className="relative min-w-0 flex-1 overflow-y-auto px-6 py-6">
        <header className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-semibold text-foreground">Skills</h1>
            <p className="mt-1 text-sm text-foreground-secondary">{selectedCategoryId === "all" ? "All clients" : selectedCategoryId === "uncategorised" ? "Uncategorised skills" : categories.find((category) => category.id === selectedCategoryId)?.name}</p>
          </div>
          <Button size="sm" onClick={() => setNewSkillOpen(true)}>
            <RiAddLine className="size-4" />
            New skill
          </Button>
        </header>

        <div className="mt-4">{searchBar}</div>

      <div className="mt-3 min-w-0 overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Skill</TableHead>
              <TableHead className="w-24">Status</TableHead>
              <TableHead className="w-44">Updated</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredSkills.length === 0 ? (
              <TableRow>
                <TableCell colSpan={3} className="py-10 text-center text-sm text-muted-foreground">
                  {normalizedSearch ? "No skills match your search." : "No skills in this category yet."}
                </TableCell>
              </TableRow>
            ) : filteredSkills.map((skill) => (
              <TableRow key={skill.id}>
                <TableCell className="min-w-[34rem] py-2.5">
                  <div className="flex items-center gap-2">
                    {skill.id === "bfcm-sale-strategy" ? (
                      <button type="button" onClick={() => setEditingSkillId(skill.id)} className="text-left text-sm font-semibold text-foreground hover:text-primary hover:underline">
                        {skill.name}
                      </button>
                    ) : <p className="text-sm font-semibold text-foreground" aria-disabled="true">{skill.name}</p>}
                    <Badge variant="outline" size="sm" className="border-blue-300 bg-blue-50 text-blue-700 dark:border-blue-800 dark:bg-blue-950/40 dark:text-blue-300">
                      <RiGlobalLine className="size-3" />
                      Global
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">{skill.id}</p>
                  <p className="mt-0.5 text-xs leading-relaxed text-foreground-secondary">{skill.description}</p>
                </TableCell>
                <TableCell className="align-top">
                  {skill.enabled ? (
                    <div className="flex flex-col items-start gap-0.5">
                      <Badge variant="success" size="sm">Enabled</Badge>
                      <span className="text-[11px] text-muted-foreground">Live</span>
                    </div>
                  ) : <Badge variant="secondary" size="sm">Disabled</Badge>}
                </TableCell>
                <TableCell className="align-top text-xs text-foreground-secondary">
                  <p className="truncate">{skill.updatedBy}</p>
                  <p className="mt-0.5 text-muted-foreground">{skill.updatedAt}</p>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={newSkillOpen} onOpenChange={setNewSkillOpen}>
        <DialogContent size="md">
          <DialogHeader>
            <DialogTitle>New global skill</DialogTitle>
            <DialogDescription>Add a skill to the shared catalog.</DialogDescription>
          </DialogHeader>
          <form onSubmit={createSkill} className="mt-4 space-y-4">
            <div>
              <label htmlFor="global-skill-name" className="text-sm font-medium text-foreground">Skill name</label>
              <Input id="global-skill-name" value={name} onChange={(event) => setName(event.target.value)} className="mt-1" required />
            </div>
            <div>
              <label htmlFor="global-skill-description" className="text-sm font-medium text-foreground">Description</label>
              <Textarea id="global-skill-description" value={description} onChange={(event) => setDescription(event.target.value)} className="mt-1" rows={5} required />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setNewSkillOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={!name.trim() || !description.trim()}>Create skill</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      </div>
      {categoryDialogs}
    </div>
  );
}
