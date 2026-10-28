import { useState, type ComponentType } from "react";
import { RiCloseLine, RiExpandDiagonalLine, RiSubtractLine } from "@remixicon/react";
import { LexerLogo } from "@/components/layout/LexerLogo";
import { cn } from "@/lib/utils";
import type { MentionGroup } from "@/concepts/lexi-shared-brain/MentionComposer";

type ComposerProps = {
  groups: MentionGroup[];
  placeholder?: string;
  onSubmit?: (text: string, mentionIds: string[]) => void;
};

type DockMessage = { id: string; role: "user" | "lexi"; text: string };

export function FloatingLexiChat({
  Composer,
  mentionGroups,
  pageContext,
  onOpenFullChat,
}: {
  Composer: ComponentType<ComposerProps>;
  mentionGroups: MentionGroup[];
  pageContext: string;
  onOpenFullChat: (prompt: string, usePageContext: boolean) => void;
}) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"page" | "general" | null>(null);
  const [lastPrompt, setLastPrompt] = useState("");
  const welcomeText = "Want to work from this page or start a new question?";
  const [messages, setMessages] = useState<DockMessage[]>([
    { id: "quick-chat-welcome", role: "lexi", text: welcomeText },
  ]);

  const send = (text: string) => {
    const prompt = text.replace(/\[\[([^\]]+)\]\]/g, "@$1").trim();
    if (!prompt) return;
    const usePageContext = mode !== "general";
    setLastPrompt(prompt);
    setMessages((current) => [
      ...current,
      { id: `quick-user-${Date.now()}`, role: "user", text: prompt },
      {
        id: `quick-lexi-${Date.now()}`,
        role: "lexi",
        text: usePageContext
          ? `I’ll use this page as context: ${pageContext || "current workspace"}. Open full chat to continue.`
          : "I’ll treat this as a fresh request. Open full chat to continue.",
      },
    ]);
    setMode(usePageContext ? "page" : "general");
  };

  return (
    <div className="pointer-events-none fixed bottom-5 right-5 z-40 flex flex-col items-end gap-2">
      {open && (
        <section aria-label="Lexi quick chat" className="pointer-events-auto flex h-[420px] w-[min(360px,calc(100vw-2rem))] flex-col overflow-hidden rounded-xl border border-border/70 bg-background shadow-lg">
          <header className="flex items-center justify-between border-b border-border px-3 py-2">
            <div>
              <p className="text-sm font-semibold text-foreground">Lexi quick chat</p>
              <p className="text-xs text-foreground-secondary">Ask anywhere, continue in full chat</p>
            </div>
            <div className="flex items-center gap-1">
              <button type="button" onClick={() => setOpen(false)} aria-label="Minimize Lexi quick chat" className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground">
                <RiSubtractLine className="size-4" />
              </button>
              <button type="button" onClick={() => onOpenFullChat(lastPrompt, mode !== "general")} aria-label="Open full Lexi chat" className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground">
                <RiExpandDiagonalLine className="size-4" />
              </button>
              <button type="button" onClick={() => setOpen(false)} aria-label="Close Lexi quick chat" className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground">
                <RiCloseLine className="size-4" />
              </button>
            </div>
          </header>

          <div className="min-h-0 flex-1 overflow-y-auto bg-muted/20 p-3">
            <p className="rounded-lg border border-border/60 bg-card px-3 py-2 text-xs text-foreground-secondary">{pageContext || "Current page context"}</p>
            <div className="mt-2 space-y-2">
              {messages.map((message) => (
                <div key={message.id} className={cn("max-w-[90%] rounded-lg px-3 py-2 text-sm", message.role === "lexi" ? "bg-card text-foreground" : "ml-auto bg-primary text-primary-foreground")}>
                  {message.text}
                </div>
              ))}
              {mode === null && (
                <div className="flex flex-wrap gap-2">
                  <button type="button" onClick={() => setMode("page")} className="rounded-md border border-border bg-card px-2.5 py-1.5 text-xs font-medium text-foreground hover:bg-muted">Use this page</button>
                  <button type="button" onClick={() => setMode("general")} className="rounded-md border border-border bg-card px-2.5 py-1.5 text-xs font-medium text-foreground hover:bg-muted">Something else</button>
                </div>
              )}
            </div>
          </div>

          <div className="border-t border-border p-2">
            <Composer
              groups={mentionGroups}
              placeholder={mode === "general" ? "Ask Lexi anything" : "Ask Lexi, or @ to mention something"}
              onSubmit={send}
            />
            <button type="button" onClick={() => onOpenFullChat(lastPrompt, mode !== "general")} className="mt-2 text-[11px] font-medium text-foreground-secondary underline-offset-2 hover:text-foreground hover:underline">
              Open in full chat
            </button>
          </div>
        </section>
      )}

      <button type="button" onClick={() => setOpen((current) => !current)} className="pointer-events-auto flex size-12 items-center justify-center rounded-full border border-border/70 bg-background shadow-lg transition-transform hover:scale-[1.03]" aria-label={open ? "Close Lexi quick chat" : "Open Lexi quick chat"} title={open ? "Close Lexi quick chat" : "Open Lexi quick chat"}>
        <LexerLogo collapsed tone="primary" />
      </button>
    </div>
  );
}