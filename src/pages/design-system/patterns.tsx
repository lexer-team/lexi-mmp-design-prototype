import { Section } from "./doc";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { ChatInput } from "@/components/chat/ChatInput";
import { ArtifactCard } from "@/components/artifacts/ArtifactCard";
import { TOP_CUSTOMERS_BAR, REVENUE_TREND, SEGMENT_TABLE_COLS, SEGMENT_TABLE_ROWS } from "@/data/mock";
import { RiSparklingLine, RiInformationLine } from "@remixicon/react";

export function PatternsSections() {
  const mockBarArtifact = {
    type: "artifact" as const,
    artifact: {
      type: "bar_chart" as const,
      name: "Top Customers by Revenue",
      description: "Revenue by customer, last 30 days.",
      data: TOP_CUSTOMERS_BAR,
    },
  };
  const mockLineArtifact = {
    type: "artifact" as const,
    artifact: { type: "line_chart" as const, name: "Revenue Trend", data: REVENUE_TREND },
  };
  const mockTableArtifact = {
    type: "artifact" as const,
    artifact: {
      type: "data_table" as const,
      name: "Segment Overview",
      cols: SEGMENT_TABLE_COLS,
      rows: SEGMENT_TABLE_ROWS,
    },
  };

  return (
    <>
      <Section id="card-anatomy" title="Card anatomy">
        <div className="grid grid-cols-2 gap-4">
          <div className="rounded-xl border border-border bg-card shadow-sm p-4 flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <RiSparklingLine className="size-3.5 text-primary shrink-0" />
              <span className="text-sm font-medium">Metric card</span>
              <Badge variant="success" className="ml-auto">+12%</Badge>
            </div>
            <p className="text-2xl font-bold">$2.4M</p>
            <p className="text-xs text-muted-foreground">Total revenue, last 30 days</p>
          </div>
          <div className="rounded-xl border border-border bg-card shadow-sm p-4 flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <RiInformationLine className="size-3.5 text-muted-foreground shrink-0" />
              <span className="text-sm font-medium">Segment card</span>
            </div>
            <p className="text-lg font-semibold">Loyalty Gold</p>
            <p className="text-xs text-muted-foreground">4,821 members · 38% revenue share</p>
            <Button variant="outline" size="sm" className="mt-1 w-fit">View segment</Button>
          </div>
        </div>
      </Section>

      <Section id="chat-input" title="Chat input">
        <div className="max-w-2xl">
          <ChatInput placeholder="Try: Analyse my best customers in the last 30 days" />
        </div>
      </Section>

      <Section id="artifacts" title="Artifact cards">
        <div className="flex flex-col gap-4">
          <ArtifactCard block={mockBarArtifact} />
          <ArtifactCard block={mockLineArtifact} />
          <ArtifactCard block={mockTableArtifact} />
        </div>
      </Section>
    </>
  );
}
