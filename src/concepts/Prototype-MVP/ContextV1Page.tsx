import { useState } from "react";
import { RiBookOpenLine, RiDatabase2Line, RiSearchLine } from "@remixicon/react";
import { Badge } from "@/components/ui/Badge";
import { Input } from "@/components/ui/Input";
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
};

const CONTEXT_CATEGORIES = [
  "Business profile",
  "Data and identity",
  "Customer intelligence",
  "Commercial calendar",
  "Channels and consent",
  "Products and catalog",
];

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

export function ContextV1Page() {
  const [selectedCategory, setSelectedCategory] = useState("All context");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedEntryId, setSelectedEntryId] = useState("");
  const normalizedSearch = searchQuery.trim().toLocaleLowerCase();
  const entries = CONTEXT_ENTRIES.filter((entry) => {
    const matchesCategory = normalizedSearch.length > 0 || selectedCategory === "All context" || entry.category === selectedCategory;
    const matchesSearch = !normalizedSearch || [entry.title, entry.summary, entry.knowledge, entry.sources, entry.category, ...entry.signals]
      .some((value) => value.toLocaleLowerCase().includes(normalizedSearch));
    return matchesCategory && matchesSearch;
  });
  const selectedEntry = entries.find((entry) => entry.id === selectedEntryId) ?? null;

  return (
    <div className="flex h-full min-w-0 overflow-hidden bg-background">
      <aside className="flex w-64 shrink-0 flex-col border-r border-border bg-background px-3 py-4">
        <div className="mb-3 flex items-center justify-between gap-2 px-2">
          <h2 className="text-sm font-semibold text-foreground">Categories</h2>
          <RiDatabase2Line className="size-4 text-muted-foreground" />
        </div>
        <nav aria-label="Context categories" className="flex flex-col gap-1 overflow-y-auto">
          {["All context", ...CONTEXT_CATEGORIES].map((category) => {
            const count = category === "All context"
              ? CONTEXT_ENTRIES.length
              : CONTEXT_ENTRIES.filter((entry) => entry.category === category).length;
            return (
              <button
                key={category}
                type="button"
                aria-pressed={selectedCategory === category}
                onClick={() => {
                  setSelectedCategory(category);
                  setSelectedEntryId(category === "All context"
                    ? ""
                    : CONTEXT_ENTRIES.find((entry) => entry.category === category)?.id ?? "");
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
      </aside>

      <div className="flex min-w-0 flex-1 flex-col overflow-y-auto px-6 py-6">
        <header className="mb-4">
          <div className="flex items-center gap-2">
            <RiBookOpenLine className="size-5 text-foreground-secondary" />
            <h1 className="text-xl font-semibold text-foreground">Context v1</h1>
            <Badge variant="outline" size="sm">Read only</Badge>
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

        <div className="grid min-h-0 flex-1 gap-4 xl:grid-cols-[minmax(0,1.35fr)_minmax(18rem,0.8fr)]">
          <section aria-label="Context entries" className="min-w-0 overflow-x-auto rounded-xl border border-border bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Context entry</TableHead>
                  <TableHead className="w-48">Category</TableHead>
                  <TableHead className="w-48">Sources</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {entries.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} className="py-10 text-center text-sm text-muted-foreground">No context entries match your search.</TableCell>
                  </TableRow>
                ) : entries.map((entry) => (
                  <TableRow key={entry.id} className={cn(selectedEntry?.id === entry.id && "bg-accent/40")}>
                    <TableCell className="min-w-[20rem] py-3">
                      <button type="button" onClick={() => setSelectedEntryId(entry.id)} className="w-full text-left">
                        <span className="block text-sm font-semibold text-foreground">{entry.title}</span>
                        <span className="mt-0.5 block text-xs leading-relaxed text-foreground-secondary">{entry.summary}</span>
                      </button>
                    </TableCell>
                    <TableCell className="align-top text-xs text-foreground-secondary">{entry.category}</TableCell>
                    <TableCell className="align-top text-xs text-foreground-secondary">{entry.sources}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </section>

          <aside aria-label="Selected context entry" className="min-w-0 rounded-xl border border-border bg-card p-4">
            {selectedEntry ? (
              <>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h2 className="text-xs font-semibold text-foreground-secondary">Name</h2>
                    <p className="mt-1 text-base font-semibold text-foreground">{selectedEntry.title}</p>
                  </div>
                  <Badge variant="outline" size="sm">Read only</Badge>
                </div>
                <div className="mt-5 border-t border-border pt-4">
                  <h3 className="text-xs font-semibold text-foreground">Description</h3>
                  <p className="mt-2 text-sm leading-relaxed text-foreground-secondary">{selectedEntry.summary}</p>
                </div>
                <div className="mt-5 border-t border-border pt-4">
                  <h3 className="text-xs font-semibold text-foreground">Context</h3>
                  <div className="mt-2">
                    {selectedEntry.content
                      ? <Markdown source={selectedEntry.content} />
                      : <p className="text-sm leading-relaxed text-foreground-secondary">{selectedEntry.knowledge}</p>}
                </div>
                </div>
                <div className="mt-5 border-t border-border pt-4 text-xs text-muted-foreground">
                  <p>Sources: {selectedEntry.sources}</p>
                  <p className="mt-1">Updated: {selectedEntry.updated}</p>
                </div>
              </>
            ) : (
              <div className="flex h-full min-h-40 items-center justify-center text-sm text-muted-foreground">
                Select a context entry to view its details.
              </div>
            )}
          </aside>
        </div>
      </div>
    </div>
  );
}