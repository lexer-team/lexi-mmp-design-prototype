import { RiArrowLeftLine } from "@remixicon/react";
import { Button } from "@/components/ui/Button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/Tabs";
import type { BrainGroup } from "../lexi-shared-brain/data";

export function GroupDetail({
  groupId,
  group,
  definitionTree,
  onOpenGroup,
  onBack,
}: {
  groupId: string;
  group?: BrainGroup;
  definitionTree?: unknown;
  onOpenGroup?: (id: string) => void;
  onBack?: () => void;
}) {
  const title = group?.name ?? "Segment";
  const summary = group?.summary ?? "Segment details";
  const population = group?.population;
  const criteria = group?.criteria ?? [];
  const customerRows = buildDummyCustomers(title, population ?? 0);
  const recommendedActions = buildRecommendedActions();

  return (
    <div className="space-y-4 p-4">
      <Tabs defaultValue="details" className="space-y-4">
        <TabsList variant="underline" className="w-full">
          <TabsTrigger value="details">Details</TabsTrigger>
          <TabsTrigger value="customers">Customers</TabsTrigger>
          <TabsTrigger value="activations">Activations</TabsTrigger>
        </TabsList>

        <TabsContent value="details" className="space-y-4">
          {population != null ? (
            <div className="rounded-xl border border-border/70 bg-card p-4">
              <p className="text-xs font-medium uppercase tracking-normal text-muted-foreground">Population</p>
              <p className="mt-1 text-3xl font-semibold leading-none text-foreground">{population.toLocaleString()}</p>
            </div>
          ) : null}

          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <h2 className="truncate text-base font-semibold text-foreground">{title}</h2>
            </div>
            {onBack ? (
              <Button size="sm" variant="outline" onClick={onBack}>
                <RiArrowLeftLine className="size-4" /> Back
              </Button>
            ) : null}
          </div>

          <div className="rounded-lg border border-border/60 bg-card p-3">
            <p className="text-xs font-medium uppercase tracking-normal text-muted-foreground">Segment description</p>
            <p className="mt-2 text-sm leading-relaxed text-foreground-secondary">{summary}</p>
          </div>

          {criteria.length > 0 ? (
            <div className="rounded-lg border border-border/60 bg-card p-3">
              <p className="text-xs font-medium uppercase tracking-normal text-muted-foreground">Validated assumptions</p>
              <ul className="mt-2 space-y-1">
                {criteria.map((criterion) => (
                  <li key={criterion.id} className="text-sm text-foreground-secondary">
                    {criterion.detail}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          <div className="rounded-lg border border-border/60 bg-card p-3">
            <p className="text-xs font-medium uppercase tracking-normal text-muted-foreground">Recommeded Actions</p>
            <ul className="mt-2 space-y-1">
              {recommendedActions.steps.map((step) => (
                <li key={step} className="text-sm text-foreground-secondary">
                  {step}
                </li>
              ))}
            </ul>
          </div>

          <div className="flex flex-wrap gap-2">
            {onOpenGroup ? (
              <Button size="sm" variant="ghost" onClick={() => onOpenGroup(groupId)}>
                Open full segment
              </Button>
            ) : null}
          </div>
        </TabsContent>

        <TabsContent value="customers" className="space-y-4">
          {population != null ? (
            <div className="rounded-xl border border-border/70 bg-card p-4">
              <p className="text-xs font-medium uppercase tracking-normal text-muted-foreground">Population</p>
              <p className="mt-1 text-3xl font-semibold leading-none text-foreground">{population.toLocaleString()}</p>
            </div>
          ) : null}

          <div className="rounded-lg border border-border/60 bg-card p-3">
            <p className="text-xs font-medium uppercase tracking-normal text-muted-foreground">Sample customers</p>
            <div className="mt-2 space-y-2">
              {customerRows.map((customer) => (
                <div key={customer.id} className="rounded-lg border border-border/60 bg-background px-3 py-2">
                  <p className="text-sm font-medium text-foreground">{customer.name}</p>
                  <p className="mt-0.5 text-xs text-foreground-secondary">{customer.meta}</p>
                </div>
              ))}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="activations" className="space-y-4">
          <div className="rounded-lg border border-border/60 bg-card p-4">
            <p className="text-sm font-medium text-foreground">No activations yet</p>
            <p className="mt-1 text-sm text-foreground-secondary">This segment is not being used in any activations yet.</p>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function buildDummyCustomers(segmentName: string, population: number) {
  const suffix = segmentName.slice(0, 14);
  return [
    { id: "cust-1", name: `Ava Thompson - ${suffix}`, meta: "AU · LTV $1,980 · Last order 43 days ago" },
    { id: "cust-2", name: `Mia Rodriguez - ${suffix}`, meta: "AU · LTV $1,620 · Last order 57 days ago" },
    { id: "cust-3", name: `Noah Patel - ${suffix}`, meta: `AU · High intent cohort · Pop share ${(population > 0 ? 0.9 : 0.0).toFixed(1)}%` },
    { id: "cust-4", name: `Liam Nguyen - ${suffix}`, meta: "AU · Repeat buyer · Last campaign clicked" },
  ];
}

function buildRecommendedActions() {
  return {
    steps: [
      "- Nudge near-miss customers (1 purchase, high engagement) into the segment before BF with a targeted offer",
      "- Time reactivation sends to the 90-180 day window, where conversion peaks",
      "- Front-load your BF campaign into the first 48 hours, where most conversion activity happens",
    ],
  };
}
