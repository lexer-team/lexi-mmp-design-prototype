import { useState } from "react";
import { RiBookOpenLine, RiDatabase2Line, RiSearchLine, RiAddLine, RiArrowLeftLine, RiCheckLine, RiCloseLine, RiExpandDiagonalLine, RiFullscreenExitLine, RiSidebarFoldLine, RiSidebarUnfoldLine } from "@remixicon/react";
import { Badge } from "@/components/ui/Badge";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/Select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/Table";
import { cn } from "@/lib/utils";
import { Markdown } from "./Markdown";
type ContextEntry = {
  id: string;
  category: string;
  title: string;
  summary: string;
  knowledge: string;
  content?: string;
  signals: string[];
  sources: string;
  updated: string;
  addedBy?: string;
  addedAt?: string;
  updatedBy?: string;
  updatedAt?: string;
};

const CONTEXT_CATEGORIES = [
  "Business profile",
  "Data and identity",
  "Customer intelligence",
  "Commercial calendar",
  "Channels and consent",
  "Products and catalog",
];

const SEEDED_CONTEXT_DESCRIPTION = "Defines the four loyalty tiers A, B, C and D, which together make up the top 20% of customers. Each tier is 5% of customers, with A the highest and D the lowest. Use this for questions about tier membership, tier sizes, or who is or isn’t in the loyalty programme.";

const CONTEXT_ENTRIES: ContextEntry[] = [
  {
    id: "geographic-store-attribution",
    category: "Business profile",
    title: "Geographic Dimensions & Store Attribution Logic",
    summary: "How a customer is attributed to a store/channel, and the geographic fields available. Reference this for the LOGIC of store/channel attribution",
    knowledge: "",
    content: `Two physical stores plus an online store:

- **Sydney**: ships-only, no online fulfilment.
- **Melbourne**: fulfils online orders as well as retail.
- **Adelaide**: ships-only, no online fulfilment.
- **Online**: Heel and Wander ecommerce store (AU/NZ).

## Channel preference (determined by purchase channel over lifetime)

Online = orders placed via \`web\` or \`mobile\`. Retail = orders placed via \`pos\`. Manual/phone/wholesale = \`shopify_draft_order\`, treated as retail unless the client specifies otherwise.

- **Ecommerce only**: online spend, no retail spend.
- **Retail only**: retail spend, no online spend.
- **Omnichannel**: both retail and online spend.

## Geography

Billing/shipping country is the reliable market field — Australia or New Zealand. Region (state/province) and city are available at the order level for more granular geographic breakdowns; postcode is available on every order for local-market analysis.`,
    signals: [],
    sources: "Shopify",
    updated: "29 Oct 2026",
  },
  {
    id: "brand-positioning",
    category: "Business profile",
    title: "Brand positioning",
    summary: "A practical outdoor retailer focused on durable gear, helpful advice, and responsible sourcing.",
    knowledge: "Position recommendations around product longevity, useful expertise, and responsible choices. Prefer value-led messaging over broad discounting when the audience has a strong purchase history.",
    signals: ["Primary brand: Northstar Outfitters", "Secondary range: Northstar Home", "Voice: practical, helpful, and direct"],
    sources: "Business context",
    updated: "28 Oct 2026",
  },
  {
    id: "market-footprint",
    category: "Business profile",
    title: "Market footprint",
    summary: "Core trading activity is concentrated in Australia and New Zealand.",
    knowledge: "Use Australian English. Present regional comparisons in local context and use AUD as the default reporting currency unless a view specifies otherwise.",
    signals: ["Primary markets: Australia and New Zealand", "Default currency: AUD", "Default time zone: Australia/Sydney"],
    sources: "Shopify, business context",
    updated: "28 Oct 2026",
  },
  {
    id: "source-systems",
    category: "Data and identity",
    title: "Source systems and ownership",
    summary: "Commerce orders come from Shopify; loyalty activity is managed in Annex; email engagement is synced from Iterable.",
    knowledge: "Use Shopify as the source of truth for orders and product purchases. Use the connected messaging platform for campaign engagement and consent signals. Treat loyalty attributes as a separate enrichment source.",
    signals: ["Orders and products: Shopify", "Loyalty activity: Annex", "Email engagement: Iterable"],
    sources: "Shopify, Annex, Iterable",
    updated: "27 Oct 2026",
  },
  {
    id: "identity-resolution",
    category: "Data and identity",
    title: "Customer identity resolution",
    summary: "Customer records are linked across commerce and messaging activity to create a person-level view.",
    knowledge: "Prefer a verified email match across sources. Use phone as a supporting identifier when email is unavailable, and preserve transaction history when duplicate profiles are consolidated.",
    signals: ["Primary match: normalized email", "Supporting match: verified phone", "Keep original source IDs for traceability"],
    sources: "Shopify, Iterable",
    updated: "26 Oct 2026",
  },
  {
    id: "data-freshness",
    category: "Data and identity",
    title: "Data freshness expectations",
    summary: "Commerce activity refreshes frequently; campaign engagement may arrive in batches.",
    knowledge: "Check source freshness before comparing very recent campaigns. If a feed is delayed, make the reporting window explicit and avoid treating partial-day data as final.",
    signals: ["Orders: near real time", "Customer profiles: regular sync", "Campaign events: batched after sends"],
    sources: "Shopify, Iterable",
    updated: "25 Oct 2026",
  },
  {
    id: "customer-lifecycle",
    category: "Customer intelligence",
    title: "Lifecycle stages",
    summary: "Lifecycle labels distinguish new, active, lapsing, and lapsed customers using purchase recency.",
    knowledge: "Use lifecycle labels as a starting point, not a universal rule. State the recency window used in each analysis and adjust it for the product's typical reorder cycle.",
    signals: ["New: first purchase within 30 days", "Active: purchase within 180 days", "Lapsing: 181-365 days", "Lapsed: no purchase in over a year"],
    sources: "Shopify, business context",
    updated: "24 Oct 2026",
  },
  {
    id: "value-tiers",
    category: "Customer intelligence",
    title: "Customer value tiers",
    summary: "Value tiers group customers by lifetime spend and purchase frequency.",
    knowledge: "Compare tiers within the same reporting period. Reserve VIP treatment for customers with both meaningful spend and recent activity; avoid using spend alone as a proxy for current intent.",
    signals: ["Compare lifetime spend and order count", "Include recency when recommending treatment", "Review thresholds before campaign use"],
    sources: "Shopify, business context",
    updated: "23 Oct 2026",
  },
  {
    id: "repeat-purchase",
    category: "Customer intelligence",
    title: "Repeat purchase behavior",
    summary: "Repeat purchase analysis focuses on the second order and the time between purchases.",
    knowledge: "Use completed orders and exclude cancelled transactions. Compare cohorts by acquisition period and report the time window so repeat-rate comparisons remain consistent.",
    signals: ["Count completed orders", "Measure time to second purchase", "Compare like-for-like acquisition cohorts"],
    sources: "Shopify",
    updated: "22 Oct 2026",
  },
  {
    id: "financial-year",
    category: "Commercial calendar",
    title: "Financial year",
    summary: "The reporting year follows the configured business financial-year boundary.",
    knowledge: "Use the business reporting calendar for year-over-year comparisons. Clearly label calendar-year views when they differ from the financial year.",
    signals: ["Financial year start: 1 July", "Compare equivalent completed periods", "Label partial-year reporting"],
    sources: "Business context",
    updated: "21 Oct 2026",
  },
  {
    id: "peak-periods",
    category: "Commercial calendar",
    title: "Peak trading periods",
    summary: "Black Friday and Cyber Monday are key seasonal trading windows.",
    knowledge: "Derive event windows from the business's own order and promotion data when possible. Keep warm-up, event, and post-event periods distinct in comparisons.",
    signals: ["Black Friday / Cyber Monday", "EOFY sale", "Seasonal product launches"],
    sources: "Shopify, business context",
    updated: "20 Oct 2026",
  },
  {
    id: "channel-consent",
    category: "Channels and consent",
    title: "Messaging consent and suppression",
    summary: "Activation audiences must respect each channel's opt-in and suppression state.",
    knowledge: "Exclude unsubscribed, suppressed, and complaint-prone profiles from outbound messaging. Confirm consent coverage before estimating reachable audience size.",
    signals: ["Check channel-specific opt-in", "Exclude suppression lists", "Report eligible and excluded counts separately"],
    sources: "Iterable, business context",
    updated: "19 Oct 2026",
  },
  {
    id: "channel-defaults",
    category: "Channels and consent",
    title: "Channel defaults",
    summary: "Email is the default channel for lifecycle programs; paid social is used for approved audience activation.",
    knowledge: "Choose the destination based on the stated campaign goal. Do not assume a channel when the user has not selected one; surface audience eligibility and destination constraints before sending.",
    signals: ["Email: lifecycle and campaign messaging", "Paid social: approved audience sync", "Confirm destination before activation"],
    sources: "Iterable, Meta, business context",
    updated: "18 Oct 2026",
  },
  {
    id: "product-taxonomy",
    category: "Products and catalog",
    title: "Product taxonomy",
    summary: "Products are organized by category, product family, and seasonal collection.",
    knowledge: "Use the current product hierarchy when comparing category performance. Treat discontinued products separately and avoid mixing product-level and category-level totals.",
    signals: ["Category and product family", "Seasonal collection", "Active versus discontinued status"],
    sources: "Shopify",
    updated: "17 Oct 2026",
  },
  {
    id: "inventory-status",
    category: "Products and catalog",
    title: "Inventory availability",
    summary: "Stock availability can constrain which products are suitable for promotion.",
    knowledge: "Check current inventory before recommending a high-volume activation. Separate low-stock products from products that are intentionally held out of a campaign.",
    signals: ["Available, low stock, and unavailable states", "Check inventory close to send time", "Flag products with limited supply"],
    sources: "Shopify, business context",
    updated: "16 Oct 2026",
  },
];

export function ContextV1Page({
  initialMode = "editable",
  showModeToggle = false,
}: {
  initialMode?: "read-only" | "editable";
  showModeToggle?: boolean;
} = {}) {
  const [contextMode, setContextMode] = useState<"read-only" | "editable">(initialMode);
  const [selectedCategory, setSelectedCategory] = useState("All context");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedEntryId, setSelectedEntryId] = useState("");
  const [entryExpanded, setEntryExpanded] = useState(false);
  const [categoryBarCollapsed, setCategoryBarCollapsed] = useState(false);
  const [auditEntryId, setAuditEntryId] = useState<string | null>(null);
  const [viewedRevision, setViewedRevision] = useState<{ label: string; summary: string; knowledge: string } | null>(null);
  const [revisionLogByEntry, setRevisionLogByEntry] = useState(() => Object.fromEntries(CONTEXT_ENTRIES.map((entry) => [entry.id, [
    { id: `${entry.id}-revision-3`, label: "Revision 3", summary: entry.summary, knowledge: entry.knowledge || entry.content || entry.summary, updatedBy: entry.updatedBy ?? "Amy Vong", updatedAt: entry.updatedAt ?? entry.updated },
    { id: `${entry.id}-revision-2`, label: "Revision 2", summary: entry.summary, knowledge: entry.knowledge || entry.content || entry.summary, updatedBy: "Amy Vong", updatedAt: entry.updatedAt ?? entry.updated },
    { id: `${entry.id}-revision-1`, label: "Revision 1", summary: entry.summary, knowledge: entry.knowledge || entry.content || entry.summary, updatedBy: "Amy Vong", updatedAt: entry.updatedAt ?? entry.updated },
  ]])));
  const [entries, setEntries] = useState<ContextEntry[]>(CONTEXT_ENTRIES);
  const [isAddingContext, setIsAddingContext] = useState(false);
  const [editingEntryId, setEditingEntryId] = useState<string | null>(null);
  const [newContextName, setNewContextName] = useState("");
  const [newContextCategory, setNewContextCategory] = useState("");
  const [newContextDescription, setNewContextDescription] = useState("");
  const [customCategories, setCustomCategories] = useState<string[]>([]);
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  
  // Lexi interpretation states
  type LexiInterpretation = {
    header: {
      title: string;
      category: string;
      description: string;
      tags: string[];
    };
  };
  const [showInterpretation, setShowInterpretation] = useState(false);
  const [lexiInterpretation, setLexiInterpretation] = useState<LexiInterpretation | null>(null);
  const [interpretationViewMode, setInterpretationViewMode] = useState<"lexi" | "markdown">("lexi");
  const [markdownContent, setMarkdownContent] = useState("");
  const [markdownContentBackup, setMarkdownContentBackup] = useState("");
  const allCategories = [...CONTEXT_CATEGORIES, ...customCategories];
  
  const handleAddContext = () => {
    if (newContextName.trim() && newContextCategory.trim() && newContextDescription.trim()) {
      // In a real app, this would save to state/backend
      console.log("Adding context:", { name: newContextName, category: newContextCategory, description: newContextDescription });
      setNewContextName("");
      setNewContextCategory("");
      setNewContextDescription("");
      setIsAddingContext(false);
    }
  };

  const handleEditContext = (entry: ContextEntry) => {
    setEditingEntryId(entry.id);
    setNewContextName(entry.title);
    setNewContextCategory(entry.category);
    setNewContextDescription(entry.content ?? entry.knowledge ?? entry.summary);
    setShowInterpretation(false);
    setLexiInterpretation(null);
    setIsAddingContext(true);
  };

  const handleAddCategory = () => {
    if (newCategoryName.trim() && !allCategories.includes(newCategoryName)) {
      setCustomCategories([...customCategories, newCategoryName]);
      setNewContextCategory(newCategoryName);
      setNewCategoryName("");
      setIsAddingCategory(false);
    }
  };

  const generateLexiInterpretation = () => {
    if (!newContextName.trim() || !newContextCategory.trim() || !newContextDescription.trim()) {
      return;
    }

    // Generate Lexi interpretation based on description
    const interpretation: LexiInterpretation = {
      header: {
        title: newContextName.trim(),
        category: newContextCategory,
        description: newContextDescription.trim().substring(0, 150) + (newContextDescription.length > 150 ? "..." : ""),
        tags: extractTags(newContextDescription),
      },
    };

    // Format as markdown
    const markdownText = formatInterpretationAsMarkdown(interpretation);
    
    setLexiInterpretation(interpretation);
    setMarkdownContent(markdownText);
    setMarkdownContentBackup(markdownText);
    setInterpretationViewMode("lexi");
    setShowInterpretation(true);
  };

  const extractTags = (text: string): string[] => {
    const keywords = [
      "customer", "loyalty", "lifecycle", "recency", "segment",
      "channel", "product", "category", "order", "purchase",
      "retention", "engagement", "behavior", "transaction"
    ];
    const tags: string[] = [];
    keywords.forEach((keyword) => {
      if (text.toLowerCase().includes(keyword) && tags.length < 4) {
        tags.push(keyword);
      }
    });
    return tags.length > 0 ? tags : ["general", "business"];
  };

  const formatInterpretationAsMarkdown = (interp: LexiInterpretation): string => {
    return `# ${interp.header.title}

**Category:** ${interp.header.category}

**Description:** ${interp.header.description}`;
  };

  const handleReview = () => {
    generateLexiInterpretation();
  };

  const handleEditInterpretation = () => {
    setShowInterpretation(false);
    setInterpretationViewMode("lexi");
  };

  const handleApprove = () => {
    if (!newContextCategory.trim()) return;
    
    // Create new entry
    const newEntry: ContextEntry = {
      id: newContextName.toLowerCase().replace(/\s+/g, "-"),
      category: newContextCategory,
      title: newContextName,
      summary: newContextDescription,
      knowledge: markdownContent || newContextDescription,
      signals: lexiInterpretation?.header.tags || [],
      sources: "Lexi KB",
      updated: new Date().toLocaleDateString("en-AU", { year: "numeric", month: "short", day: "numeric" }),
      addedBy: "Amy Vong",
      addedAt: new Date().toLocaleDateString("en-AU", { year: "numeric", month: "short", day: "numeric" }),
      updatedBy: "Amy Vong",
      updatedAt: new Date().toLocaleDateString("en-AU", { year: "numeric", month: "short", day: "numeric" }),
    };
    
    if (editingEntryId) {
      setEntries((current) => current.map((entry) => entry.id === editingEntryId
        ? {
          ...entry,
          category: newEntry.category,
          title: newEntry.title,
          summary: newEntry.summary,
          knowledge: newEntry.knowledge,
          signals: newEntry.signals,
          sources: newEntry.sources,
          updated: newEntry.updated,
          updatedBy: newEntry.updatedBy,
          updatedAt: newEntry.updatedAt,
        }
        : entry));
      setAuditEntryId(editingEntryId);
      setViewedRevision(null);
      setRevisionLogByEntry((current) => ({
        ...current,
        [editingEntryId]: [
          { id: `${editingEntryId}-revision-current`, label: "Revision 4", summary: newEntry.summary, knowledge: newEntry.knowledge, updatedBy: "Amy Vong", updatedAt: newEntry.updatedAt ?? newEntry.updated },
          ...(current[editingEntryId] ?? []).slice(0, 3),
        ],
      }));
    } else {
      setEntries([...entries, newEntry]);
    }
    setEditingEntryId(null);

    // Reset form and navigate to the updated or new entry
    setNewContextName("");
    setNewContextCategory("");
    setNewContextDescription("");
    setShowInterpretation(false);
    setIsAddingContext(false);
    
    // Navigate to the category and select the new entry
    setSelectedCategory(newContextCategory);
    setSelectedEntryId(newEntry.id);
  };

  const handleCancelInterpretation = () => {
    setShowInterpretation(false);
    setInterpretationViewMode("lexi");
    setMarkdownContent(markdownContentBackup);
  };

  const handleMarkdownSave = () => {
    setMarkdownContentBackup(markdownContent);
    // Could regenerate interpretation from markdown here if needed
  };

  const handleMarkdownCancel = () => {
    setMarkdownContent(markdownContentBackup);
    setInterpretationViewMode("lexi");
  };

  const normalizedSearch = searchQuery.trim().toLocaleLowerCase();
  const filteredEntries = entries.filter((entry) => {
    const matchesCategory = normalizedSearch.length > 0 || selectedCategory === "All context" || entry.category === selectedCategory;
    const matchesSearch = !normalizedSearch || [entry.title, entry.summary, entry.knowledge, entry.sources, entry.category, ...entry.signals]
      .some((value) => value.toLocaleLowerCase().includes(normalizedSearch));
    return matchesCategory && matchesSearch;
  });
  const selectedEntry = filteredEntries.find((entry) => entry.id === selectedEntryId) ?? null;

  return (
    <div className="flex h-full min-w-0 overflow-hidden bg-background">
      <aside className={cn("flex shrink-0 flex-col border-r border-border bg-background py-4 transition-[width]", categoryBarCollapsed ? "w-12 items-center px-2" : "w-64 px-3")}>
        {categoryBarCollapsed ? (
          <button
            type="button"
            onClick={() => setCategoryBarCollapsed(false)}
            className="inline-flex size-8 items-center justify-center rounded-lg text-foreground-secondary transition-colors hover:bg-muted hover:text-foreground"
            aria-label="Expand categories"
            title="Expand categories"
          >
            <RiSidebarUnfoldLine className="size-4" />
          </button>
        ) : (
          <>
        {contextMode === "editable" ? (
          <div className="mb-4">
            <Button 
              onClick={() => {
                setEditingEntryId(null);
                setNewContextDescription(SEEDED_CONTEXT_DESCRIPTION);
                setIsAddingContext(true);
              }} 
              className="w-full gap-2"
              size="sm"
            >
              <RiAddLine className="size-4" />
              Add New Context
            </Button>
          </div>
        ) : null}
        
        <div className="mb-3 flex items-center justify-between gap-2 px-2">
          <h2 className="text-sm font-semibold text-foreground">Categories</h2>
          <button
            type="button"
            onClick={() => setCategoryBarCollapsed(true)}
            className="inline-flex size-7 items-center justify-center rounded-md text-foreground-secondary transition-colors hover:bg-muted hover:text-foreground"
            aria-label="Collapse categories"
            title="Collapse categories"
          >
            <RiSidebarFoldLine className="size-4" />
          </button>
        </div>
        <nav aria-label="Context categories" className="flex flex-col gap-1 overflow-y-auto">
          {["All context", ...CONTEXT_CATEGORIES].map((category) => {
            const count = category === "All context"
              ? entries.length
              : entries.filter((entry) => entry.category === category).length;
            return (
              <button
                key={category}
                type="button"
                aria-pressed={selectedCategory === category}
                onClick={() => {
                  setIsAddingContext(false);
                  setEditingEntryId(null);
                  setShowInterpretation(false);
                  setLexiInterpretation(null);
                  setInterpretationViewMode("lexi");
                  setNewContextName("");
                  setNewContextCategory("");
                  setNewContextDescription("");
                  setIsAddingCategory(false);
                  setNewCategoryName("");
                  setSelectedCategory(category);
                  setSelectedEntryId("");
                }}
                className={cn(
                  "flex items-center justify-between gap-2 rounded-lg px-2.5 py-2 text-left text-sm transition-colors",
                  selectedCategory === category
                    ? "bg-accent text-foreground"
                    : "text-foreground-secondary hover:bg-muted/50 hover:text-foreground",
                )}
              >
                <span className="truncate">{category}</span>
                <span className="text-xs tabular-nums text-muted-foreground">{count}</span>
              </button>
            );
          })}
        </nav>
          </>
        )}
      </aside>

      <div className="flex min-w-0 flex-1 flex-col overflow-y-auto px-6 py-6">
        {isAddingContext ? (
          <>
            <header className="mb-6">
              <div className="flex items-center gap-3 mb-4">
                <button 
                  onClick={() => {
                    setIsAddingContext(false);
                    setEditingEntryId(null);
                    setNewContextName("");
                    setNewContextCategory("");
                    setNewContextDescription("");
                    setIsAddingCategory(false);
                    setNewCategoryName("");
                  }}
                  className="flex items-center gap-2 text-sm text-foreground-secondary hover:text-foreground transition-colors"
                >
                  <RiArrowLeftLine className="size-4" />
                  Back to Context
                </button>
              </div>
              <div className="flex items-center gap-2">
                <RiAddLine className="size-5 text-foreground-secondary" />
                <h1 className="text-xl font-semibold text-foreground">{editingEntryId ? "Edit Context" : "Add New Context"}</h1>
              </div>
              <p className="mt-1 text-sm text-foreground-secondary">{editingEntryId ? "Update this context entry for your knowledge base." : "Create a new context entry for your knowledge base."}</p>
            </header>

            <div className="max-w-2xl space-y-6">
              <div>
                <label className="text-sm font-semibold text-foreground">Name</label>
                <Input 
                  value={newContextName}
                  onChange={(e) => setNewContextName(e.target.value)}
                  placeholder="Enter context name"
                  className="mt-2"
                />
              </div>

              <div>
                <label className="text-sm font-semibold text-foreground">Category</label>
                <Select value={newContextCategory} onValueChange={setNewContextCategory}>
                  <SelectTrigger className="mt-2">
                    <SelectValue placeholder="Select a category" />
                  </SelectTrigger>
                  <SelectContent>
                    {allCategories.map((cat) => (
                      <SelectItem key={cat} value={cat}>
                        {cat}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                
                {isAddingCategory ? (
                  <div className="mt-3 flex gap-2">
                    <Input 
                      value={newCategoryName}
                      onChange={(e) => setNewCategoryName(e.target.value)}
                      placeholder="New category name"
                      className="flex-1"
                      autoFocus
                    />
                    <Button 
                      size="sm" 
                      onClick={handleAddCategory}
                    >
                      Add
                    </Button>
                    <Button 
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setIsAddingCategory(false);
                        setNewCategoryName("");
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                ) : (
                  <button
                    onClick={() => setIsAddingCategory(true)}
                    className="mt-2 text-sm text-primary hover:underline"
                  >
                    + Add new category
                  </button>
                )}
              </div>

              <div>
                <label className="text-sm font-semibold text-foreground">Description</label>
                <Textarea 
                  value={newContextDescription}
                  onChange={(e) => setNewContextDescription(e.target.value)}
                  placeholder="Enter context description"
                  className="mt-2"
                  rows={8}
                />
              </div>

              <div className="flex gap-3 pt-4">
                <Button 
                  onClick={handleReview}
                  disabled={!newContextName.trim() || !newContextCategory.trim() || !newContextDescription.trim()}
                  size="lg"
                >
                  Preview
                </Button>
                <Button 
                  variant="outline"
                  onClick={() => {
                    setIsAddingContext(false);
                    setEditingEntryId(null);
                    setNewContextName("");
                    setNewContextCategory("");
                    setNewContextDescription("");
                    setIsAddingCategory(false);
                    setNewCategoryName("");
                    setShowInterpretation(false);
                  }}
                  size="lg"
                >
                  Cancel
                </Button>
              </div>

              {showInterpretation && lexiInterpretation && (
                <div className="mt-8 space-y-4 rounded-lg border border-border bg-card p-6">
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="text-lg font-semibold text-foreground">Context Preview</h3>
                    <button
                      onClick={() => setInterpretationViewMode(interpretationViewMode === "lexi" ? "markdown" : "lexi")}
                      className="text-xs font-medium text-primary hover:underline"
                    >
                      {interpretationViewMode === "lexi" ? "View Markdown" : "View Interpretation"}
                    </button>
                  </div>

                  {interpretationViewMode === "lexi" ? (
                    <div className="space-y-4 rounded-lg border border-border/50 bg-muted/30 p-4">
                      <div>
                        <p className="text-xs font-semibold text-muted-foreground">TITLE</p>
                        <p className="mt-1 text-base font-semibold text-foreground">{lexiInterpretation.header.title}</p>
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-muted-foreground">CATEGORY</p>
                        <p className="mt-1 text-sm text-foreground">{lexiInterpretation.header.category}</p>
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-muted-foreground">DESCRIPTION</p>
                        <p className="mt-1 text-sm leading-relaxed text-foreground-secondary">{lexiInterpretation.header.description}</p>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <Textarea
                        value={markdownContent}
                        onChange={(e) => setMarkdownContent(e.target.value)}
                        className="font-mono text-sm"
                        rows={12}
                      />
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={handleMarkdownSave}
                        >
                          Save
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={handleMarkdownCancel}
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  )}

                  <div className="flex gap-3 border-t border-border pt-4">
                    <Button
                      variant="outline"
                      onClick={handleEditInterpretation}
                    >
                      Edit
                    </Button>
                    <Button
                      onClick={handleApprove}
                      disabled={!newContextCategory.trim()}
                    >
                      Save
                    </Button>
                    <Button
                      variant="ghost"
                      onClick={handleCancelInterpretation}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              )}

              {editingEntryId ? (
                <aside aria-label="Audit history" className="mt-8 rounded-xl border border-border bg-card p-4">
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="text-sm font-semibold text-foreground">Audit history</h3>
                    <span className="text-xs text-muted-foreground">Revision log</span>
                  </div>
                  <div className="mt-3 divide-y divide-border rounded-lg border border-border">
                    {(revisionLogByEntry[editingEntryId] ?? []).slice(0, 3).map((revision, index) => (
                      <div key={revision.id} className="flex items-center justify-between gap-3 px-3 py-2.5">
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-foreground">{revision.label} {index === 0 ? "· Current" : ""}</p>
                          <p className="mt-0.5 text-xs text-muted-foreground">{revision.updatedBy} · {revision.updatedAt}</p>
                        </div>
                        <div className="flex shrink-0 items-center gap-1.5">
                          <Button type="button" variant="outline" size="sm" onClick={() => {
                            setAuditEntryId(editingEntryId);
                            setViewedRevision({ label: revision.label, summary: revision.summary, knowledge: revision.knowledge });
                          }}>View</Button>
                          {index > 0 ? (
                            <Button type="button" variant="ghost" size="sm" onClick={() => {
                              setEntries((current) => current.map((entry) => entry.id === editingEntryId ? {
                                ...entry,
                                summary: revision.summary,
                                knowledge: revision.knowledge,
                                updated: revision.updatedAt,
                                updatedBy: revision.updatedBy,
                                updatedAt: revision.updatedAt,
                              } : entry));
                              setNewContextName(entries.find((entry) => entry.id === editingEntryId)?.title ?? newContextName);
                              setNewContextDescription(revision.summary);
                              setViewedRevision({ label: revision.label, summary: revision.summary, knowledge: revision.knowledge });
                              setAuditEntryId(editingEntryId);
                            }}>Roll back</Button>
                          ) : null}
                        </div>
                      </div>
                    ))}
                  </div>
                  {auditEntryId === editingEntryId && viewedRevision ? (
                    <div className="mt-3 rounded-lg border border-primary/20 bg-primary/5 p-3">
                      <p className="text-xs font-semibold text-foreground">Viewing {viewedRevision.label}</p>
                      <p className="mt-1 text-sm font-medium text-foreground">{viewedRevision.summary}</p>
                      <p className="mt-1 line-clamp-3 text-xs text-foreground-secondary">{viewedRevision.knowledge}</p>
                    </div>
                  ) : null}
                </aside>
              ) : null}
            </div>
          </>
        ) : (
          <>
            <header className="mb-4">
              {showModeToggle ? (
                <div className="mb-4 flex justify-end">
                  <div className="inline-flex rounded-lg border border-border bg-muted/40 p-1" aria-label="Context mode">
                    <button
                      type="button"
                      aria-pressed={contextMode === "read-only"}
                      onClick={() => {
                        setContextMode("read-only");
                        setIsAddingContext(false);
                        setEditingEntryId(null);
                      }}
                      className={cn("h-8 rounded-md px-3 text-sm transition-colors", contextMode === "read-only" ? "bg-card font-medium text-foreground shadow-xs" : "text-foreground-secondary hover:text-foreground")}
                    >
                      Read only
                    </button>
                    <button
                      type="button"
                      aria-pressed={contextMode === "editable"}
                      onClick={() => setContextMode("editable")}
                      className={cn("h-8 rounded-md px-3 text-sm transition-colors", contextMode === "editable" ? "bg-card font-medium text-foreground shadow-xs" : "text-foreground-secondary hover:text-foreground")}
                    >
                      Editable
                    </button>
                  </div>
                </div>
              ) : null}
              <div className="flex items-center gap-2">
                <RiBookOpenLine className="size-5 text-foreground-secondary" />
                <h1 className="text-xl font-semibold text-foreground">Context</h1>
                {contextMode === "read-only" ? <Badge variant="outline" size="sm">Read only</Badge> : null}
              </div>
              <p className="mt-1 text-sm text-foreground-secondary">Business context and knowledge available to Lexi.</p>
            </header>

        <div className="relative mb-4 w-full">
          <RiSearchLine className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Search context and knowledge"
            aria-label="Search context and knowledge"
            className="pl-9"
          />
        </div>

        <div className={cn("grid min-h-0 flex-1 gap-4", selectedEntry && !entryExpanded && "xl:grid-cols-[minmax(0,1.35fr)_minmax(30.42rem,1.35fr)]")}> 
          <section aria-label="Context entries" className={cn("min-w-0 overflow-x-auto rounded-xl border border-border bg-card", entryExpanded && "hidden xl:hidden")}>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Context entry</TableHead>
                  <TableHead className="w-48">Category</TableHead>
                  <TableHead className="w-48">Sources</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredEntries.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} className="py-10 text-center text-sm text-muted-foreground">No context entries match your search.</TableCell>
                  </TableRow>
                ) : filteredEntries.map((entry) => (
                  <TableRow key={entry.id} className={cn(selectedEntry?.id === entry.id && "bg-primary/10")}>
                    <TableCell className="min-w-[20rem] py-3">
                      <div className="flex items-start gap-3">
                        <button type="button" onClick={() => setSelectedEntryId(entry.id)} className="min-w-0 flex-1 text-left">
                          <span className="block text-sm font-semibold text-foreground">{entry.title}</span>
                          <span className="mt-0.5 block text-xs leading-relaxed text-foreground-secondary">{entry.summary}</span>
                        </button>
                        {contextMode === "editable" ? (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={(event) => {
                              event.stopPropagation();
                              handleEditContext(entry);
                            }}
                          >
                            Edit
                          </Button>
                        ) : null}
                      </div>
                    </TableCell>
                    <TableCell className="align-top text-xs text-foreground-secondary">{entry.category}</TableCell>
                    <TableCell className="align-top text-xs text-foreground-secondary">{entry.sources}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </section>

          {selectedEntry ? (
            <div className="min-w-0 space-y-4">
              <aside aria-label="Selected context entry" className="min-w-0 rounded-xl border border-border bg-card p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h2 className="text-xs font-semibold text-foreground-secondary">Name</h2>
                    <p className="mt-1 text-base font-semibold text-foreground">{selectedEntry.title}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-1.5">
                    {contextMode === "read-only" ? <Badge variant="outline" size="sm">Read only</Badge> : (
                      <Button type="button" variant="outline" size="sm" onClick={() => handleEditContext(selectedEntry)}>Edit</Button>
                    )}
                    <button type="button" onClick={() => setEntryExpanded((expanded) => !expanded)} className="inline-flex size-8 items-center justify-center rounded-lg text-foreground-secondary transition-colors hover:bg-muted hover:text-foreground" aria-label={entryExpanded ? "Collapse context entry" : "Expand context entry"} title={entryExpanded ? "Collapse" : "Expand"}>
                      {entryExpanded ? <RiFullscreenExitLine className="size-4" /> : <RiExpandDiagonalLine className="size-4" />}
                    </button>
                    <button type="button" onClick={() => { setSelectedEntryId(""); setEntryExpanded(false); }} className="inline-flex size-8 items-center justify-center rounded-lg text-foreground-secondary transition-colors hover:bg-muted hover:text-foreground" aria-label="Close context entry" title="Close">
                      <RiCloseLine className="size-4" />
                    </button>
                  </div>
                </div>
                <div className="mt-5 border-t border-border pt-4">
                  <h3 className="text-xs font-semibold text-foreground">Description</h3>
                  <p className="mt-2 text-sm leading-relaxed text-foreground-secondary">{selectedEntry.summary}</p>
                </div>
                <div className="mt-5 border-t border-border pt-4">
                  <h3 className="text-xs font-semibold text-foreground">Context</h3>
                  <div className="mt-2">
                    {selectedEntry.content ? <Markdown source={selectedEntry.content} /> : <p className="text-sm leading-relaxed text-foreground-secondary">{selectedEntry.knowledge}</p>}
                  </div>
                </div>
                <div className="mt-5 border-t border-border pt-4 text-xs text-muted-foreground">
                  <dl className="grid grid-cols-2 gap-x-4 gap-y-3">
                    <div><dt className="font-semibold text-foreground-secondary">Added by</dt><dd className="mt-0.5">{selectedEntry.addedBy ?? "Amy Vong"}</dd></div>
                    <div><dt className="font-semibold text-foreground-secondary">Date added</dt><dd className="mt-0.5">{selectedEntry.addedAt ?? "15 Oct 2026"}</dd></div>
                    <div><dt className="font-semibold text-foreground-secondary">Last updated by</dt><dd className="mt-0.5">{selectedEntry.updatedBy ?? "Amy Vong"}</dd></div>
                    <div><dt className="font-semibold text-foreground-secondary">Last updated</dt><dd className="mt-0.5">{selectedEntry.updatedAt ?? selectedEntry.updated}</dd></div>
                  </dl>
                </div>
              </aside>
              {contextMode === "editable" ? (
                <aside aria-label="Audit history" className="min-w-0 rounded-xl border border-border bg-card p-4">
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="text-sm font-semibold text-foreground">Audit history</h3>
                    <span className="text-xs text-muted-foreground">Revision log</span>
                  </div>
                  <div className="mt-3 divide-y divide-border rounded-lg border border-border">
                    {(revisionLogByEntry[selectedEntry.id] ?? []).slice(0, 3).map((revision, index) => (
                      <div key={revision.id} className="flex items-center justify-between gap-3 px-3 py-2.5">
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-foreground">{revision.label} {index === 0 ? "· Current" : ""}</p>
                          <p className="mt-0.5 text-xs text-muted-foreground">{revision.updatedBy} · {revision.updatedAt}</p>
                        </div>
                        <div className="flex shrink-0 items-center gap-1.5">
                          <Button type="button" variant="outline" size="sm" onClick={() => { setAuditEntryId(selectedEntry.id); setViewedRevision({ label: revision.label, summary: revision.summary, knowledge: revision.knowledge }); }}>View</Button>
                          {index > 0 ? (
                            <Button type="button" variant="ghost" size="sm" onClick={() => {
                              setEntries((current) => current.map((entry) => entry.id === selectedEntry.id ? { ...entry, summary: revision.summary, knowledge: revision.knowledge, updated: revision.updatedAt, updatedBy: revision.updatedBy, updatedAt: revision.updatedAt } : entry));
                              setViewedRevision({ label: revision.label, summary: revision.summary, knowledge: revision.knowledge });
                              setAuditEntryId(selectedEntry.id);
                            }}>Roll back</Button>
                          ) : null}
                        </div>
                      </div>
                    ))}
                  </div>
                  {auditEntryId === selectedEntry.id && viewedRevision ? (
                    <div className="mt-3 rounded-lg border border-primary/20 bg-primary/5 p-3">
                      <p className="text-xs font-semibold text-foreground">Viewing {viewedRevision.label}</p>
                      <p className="mt-1 text-sm font-medium text-foreground">{viewedRevision.summary}</p>
                      <p className="mt-1 line-clamp-3 text-xs text-foreground-secondary">{viewedRevision.knowledge}</p>
                    </div>
                  ) : null}
                </aside>
              ) : null}
            </div>
          ) : null}
        </div>
          </>
        )}
      </div>
    </div>
  );
}