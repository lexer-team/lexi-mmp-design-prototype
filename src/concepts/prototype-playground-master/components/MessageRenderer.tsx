import { cn } from "@/lib/utils";
import { LexiMark } from "@/components/chat/LexiMark";
import { RiCheckLine } from "@remixicon/react";
import type { ChatMessage, ContentBlock } from "../types";
import { RichText, MentionText } from "./RichText";
import { ProposedBlock } from "./ProposedBlock";
import { SummaryPointer } from "./SummaryPointer";
import { ReasoningBlock } from "./ReasoningBlock";
import { ChartBlock } from "./ResponseBlocks";
import ActivationFlowBlock from "./ActivationFlowBlock";

interface MessageRendererProps {
  message: ChatMessage;
}

export function MessageRenderer({ message }: MessageRendererProps) {
  if (message.role === "user") {
    return (
      <div className="self-end max-w-[85%]">
        <div className="bg-card border border-border rounded-2xl px-4 py-2.5 text-sm text-foreground break-words leading-relaxed">
          {message.text ? <MentionText content={message.text} /> : null}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1.5" data-message-id={message.id}>
      <h4 className="text-sm font-semibold text-primary flex items-center gap-1.5">
        <LexiMark className="size-3.5" />
        Lexi
      </h4>
      <div className="flex flex-col gap-3">
        {message.blocks?.map((block, i) => (
          <BlockRenderer key={i} block={block} messageId={message.id} blockId={`${message.id}-${i}`} />
        ))}
      </div>
    </div>
  );
}

function BlockRenderer({ block, messageId, blockId }: { block: ContentBlock; messageId: string; blockId: string }) {
  switch (block.type) {
    case "text":
      return <RichText content={block.content} />;

    case "proposed":
      return <ProposedBlock artifactId={block.artifactId} />;

    case "summary":
      return <SummaryPointer artifactId={block.artifactId} />;

    case "reasoning":
      return <ReasoningBlock goal={block.goal} assumptions={block.assumptions} />;

    case "chart":
      return <ChartBlock chart={block.chart} />;

    case "tool":
      return (
        <div className={cn(
          "flex items-center gap-2 rounded-lg px-2.5 py-1.5",
          "border border-border/40 bg-muted/30"
        )}>
          <RiCheckLine className="size-3 text-primary" />
          <span className="text-sm text-muted-foreground">{block.label}</span>
        </div>
      );

    case "actions":
      return (
        <div className="flex flex-wrap gap-2">
          {block.actions.map((action) => (
            <button
              key={action.id}
              type="button"
              className="rounded-lg border border-border/70 bg-card px-3 py-1.5 text-sm font-medium text-foreground"
            >
              {action.label}
            </button>
          ))}
        </div>
      );

    case "activationBuild":
    case "activationConnect":
      return null;

    case "flow":
      return <ActivationFlowBlock block={block} messageId={messageId} blockId={blockId} onUpdate={() => {}} />;
  }
}
