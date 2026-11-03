import { useState, useEffect, useCallback, useRef, forwardRef } from "react";
import { createPortal } from "react-dom";
import { RiPushpinLine, RiSearchEyeLine, RiCloseLine, RiLightbulbLine } from "@remixicon/react";
import { LexiMark } from "@/components/chat/LexiMark";
import { Button } from "@/components/ui/Button";
import { useSession } from "../store";

export function CrystallisationPopover() {
  const { dispatch } = useSession();
  const [selection, setSelection] = useState<{
    text: string;
    rect: DOMRect;
    messageId: string;
    sentenceStartOffset: number;
  } | null>(null);
  const [digDeeperPanel, setDigDeeperPanel] = useState<{
    text: string;
    rect: DOMRect;
    messageId: string;
    sentenceStartOffset: number;
  } | null>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const handleMouseUp = useCallback(() => {
    if (digDeeperPanel) return;

    const sel = window.getSelection();
    if (!sel || sel.isCollapsed || !sel.rangeCount) {
      setSelection(null);
      return;
    }

    const text = sel.toString().trim();
    if (!text || text.length < 3) {
      setSelection(null);
      return;
    }

    const range = sel.getRangeAt(0);
    const container = range.commonAncestorContainer instanceof Element
      ? range.commonAncestorContainer
      : range.commonAncestorContainer.parentElement;

    const messageEl = container?.closest("[data-message-id]");
    if (!messageEl) {
      setSelection(null);
      return;
    }

    const messageId = messageEl.getAttribute("data-message-id")!;
    const prefixRange = range.cloneRange();
    prefixRange.selectNodeContents(messageEl);
    prefixRange.setEnd(range.startContainer, range.startOffset);
    const startOffset = prefixRange.toString().length;
    const messageText = messageEl.textContent ?? "";
    const sentenceStartOffset = findSentenceStartOffset(messageText, startOffset);
    const rect = range.getBoundingClientRect();
    setSelection({ text, rect, messageId, sentenceStartOffset });
  }, [digDeeperPanel]);

  const handlePin = useCallback(
    (text: string, messageId: string, sentenceStartOffset?: number) => {
      dispatch({
        type: "ADD_PIN",
        pin: {
          id: `pin-${Date.now()}`,
          text,
          sourceMessageId: messageId,
          sentenceStartOffset,
        },
      });
      setSelection(null);
      setDigDeeperPanel(null);
      window.getSelection()?.removeAllRanges();
    },
    [dispatch],
  );

  const handleDigDeeper = useCallback(() => {
    if (!selection) return;
    setDigDeeperPanel(selection);
    setSelection(null);
    window.getSelection()?.removeAllRanges();
  }, [selection]);

  const handleCaptureInsight = useCallback(() => {
    if (!selection) return;
    const cleaned = selection.text.replace(/\s+/g, " ").trim();
    const name = cleaned.length > 64 ? `${cleaned.slice(0, 64).trimEnd()}…` : cleaned;

    dispatch({
      type: "ADD_INSIGHT",
      artifact: {
        id: `ins-${Date.now()}`,
        type: "insight",
        name,
        status: "saved",
        savedAt: new Date().toISOString(),
        body: {
          kind: "insight",
          finding: cleaned,
          implication: "Captured from highlighted conversation context.",
        },
      },
    });

    setSelection(null);
    window.getSelection()?.removeAllRanges();
  }, [dispatch, selection]);

  const handleReject = useCallback(() => {
    setSelection(null);
    window.getSelection()?.removeAllRanges();
  }, []);

  useEffect(() => {
    document.addEventListener("mouseup", handleMouseUp);
    return () => document.removeEventListener("mouseup", handleMouseUp);
  }, [handleMouseUp]);

  useEffect(() => {
    const handleMouseDown = (e: MouseEvent) => {
      if (
        selection &&
        popoverRef.current && !popoverRef.current.contains(e.target as Node)
      ) {
        setSelection(null);
      }
      if (
        digDeeperPanel &&
        panelRef.current && !panelRef.current.contains(e.target as Node)
      ) {
        setDigDeeperPanel(null);
      }
    };
    document.addEventListener("mousedown", handleMouseDown);
    return () => document.removeEventListener("mousedown", handleMouseDown);
  }, [selection, digDeeperPanel]);

  return (
    <>
      {/* Selection popover */}
      {selection && createPortal(
        <div
          ref={popoverRef}
          className="fixed z-[9999] -translate-x-1/2 animate-in fade-in-0 slide-in-from-bottom-1 duration-150"
          style={{
            top: selection.rect.top - 44,
            left: selection.rect.left + selection.rect.width / 2,
          }}
        >
          <div className="flex items-center gap-0.5 rounded-lg border border-border bg-card px-1 py-1 shadow-lg">
            <button
              onClick={() => handlePin(selection.text, selection.messageId, selection.sentenceStartOffset)}
              className="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm font-medium text-foreground-secondary hover:bg-accent hover:text-foreground transition-colors"
            >
              <RiPushpinLine className="size-3" />
              Pin
            </button>
            <div className="h-4 w-px bg-border" />
            <button
              onClick={handleCaptureInsight}
              className="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm font-medium text-foreground-secondary hover:bg-accent hover:text-foreground transition-colors"
            >
              <RiLightbulbLine className="size-3" />
              Capture insight
            </button>
            <div className="h-4 w-px bg-border" />
            <button
              onClick={handleDigDeeper}
              className="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm font-medium text-foreground-secondary hover:bg-accent hover:text-foreground transition-colors"
            >
              <RiSearchEyeLine className="size-3" />
              Dig deeper
            </button>
            <div className="h-4 w-px bg-border" />
            <button
              onClick={handleReject}
              className="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm font-medium text-foreground-secondary hover:bg-accent hover:text-foreground transition-colors"
            >
              <RiCloseLine className="size-3" />
              Reject
            </button>
          </div>
        </div>,
        document.body,
      )}

      {/* Dig deeper panel */}
      {digDeeperPanel && createPortal(
        <DigDeeperPanel
          ref={panelRef}
          text={digDeeperPanel.text}
          messageId={digDeeperPanel.messageId}
          sentenceStartOffset={digDeeperPanel.sentenceStartOffset}
          rect={digDeeperPanel.rect}
          onPin={handlePin}
          onClose={() => setDigDeeperPanel(null)}
        />,
        document.body,
      )}
    </>
  );
}

// ─── Dig deeper floating panel ──────────────────────────────────────────────

interface DigDeeperPanelProps {
  text: string;
  messageId: string;
  sentenceStartOffset: number;
  rect: DOMRect;
  onPin: (text: string, messageId: string, sentenceStartOffset?: number) => void;
  onClose: () => void;
}

const DigDeeperPanel = forwardRef<HTMLDivElement, DigDeeperPanelProps>(
  ({ text, messageId, sentenceStartOffset, rect, onPin, onClose }, ref) => {
    const { dispatch } = useSession();
    const truncated = text.length > 80 ? text.slice(0, 80) + "…" : text;

    const handleSaveAsInsight = () => {
      const id = `ins-${Date.now()}`;
      dispatch({
        type: "ADD_INSIGHT",
        artifact: {
          id,
          type: "insight",
          name: truncated.slice(0, 40),
          status: "proposed",
          body: {
            kind: "insight",
            finding: text,
            implication: "Further analysis needed.",
          },
        },
      });
      onPin(text, messageId, sentenceStartOffset);
    };

    const top = rect.bottom + 8;
    const left = Math.min(rect.left, window.innerWidth - 360);

    return (
      <div
        ref={ref}
        className="fixed z-[9999] w-[340px] animate-in fade-in-0 slide-in-from-top-1 duration-200"
        style={{ top, left }}
      >
        <div className="rounded-xl border border-border bg-card shadow-lg overflow-hidden">
          {/* Header */}
          <div className="flex h-9 items-center gap-2 border-b border-border/60 px-3">
            <LexiMark className="size-3.5" />
            <span className="flex-1 text-sm font-medium text-foreground">Dig deeper</span>
            <button
              onClick={onClose}
              className="flex size-5 items-center justify-center rounded text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
            >
              <RiCloseLine className="size-3.5" />
            </button>
          </div>

          {/* Quoted text */}
          <div className="border-b border-border/60 px-3 py-2">
            <p className="text-sm text-muted-foreground italic leading-relaxed">"{truncated}"</p>
          </div>

          {/* Explanation */}
          <div className="px-3 py-2.5">
            <p className="text-sm text-foreground-secondary leading-relaxed">
              This reflects a pattern across your last three season launches. The underlying data shows
              consistent customer behaviour that supports this observation — suggesting an opportunity
              to adjust timing and targeting for better margin protection.
            </p>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 border-t border-border/60 px-3 py-2">
            <Button
              size="xs"
              variant="ghost"
              className="h-6 gap-1 px-2 text-[11px]"
              onClick={() => onPin(text, messageId, sentenceStartOffset)}
            >
              <RiPushpinLine className="size-3" />
              Pin
            </Button>
            <Button
              size="xs"
              variant="ghost"
              className="h-6 gap-1 px-2 text-[11px]"
              onClick={handleSaveAsInsight}
            >
              <RiLightbulbLine className="size-3" />
              Save as insight
            </Button>
          </div>
        </div>
      </div>
    );
  },
);
DigDeeperPanel.displayName = "DigDeeperPanel";

function findSentenceStartOffset(text: string, selectionStartOffset: number): number {
  const safeOffset = Math.max(0, Math.min(selectionStartOffset, text.length));
  if (!text) return 0;

  for (let i = safeOffset - 1; i >= 0; i -= 1) {
    const ch = text[i];
    if (ch === "." || ch === "!" || ch === "?" || ch === "\n") {
      let start = i + 1;
      while (start < text.length && /[\s"'“”]/.test(text[start])) start += 1;
      return start;
    }
  }

  return 0;
}
