import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/Dialog";
import { cn } from "@/lib/utils";
import { RiAddLine, RiArrowRightSLine, RiCloseLine, RiSearchLine } from "@remixicon/react";
import type { MentionGroup } from "../../lexi-shared-brain/MentionComposer";
import { getDef, type DefRef } from "@/data/def-registry";
import { DefinitionCard } from "@/components/definitions/DefinitionCard";
import { MentionText } from "./RichText";

type PickerItem = {
  id: string;
  name: string;
  group: string;
  def?: DefRef;
};

export function ConditionComposer({
  value,
  onValueChange,
  onApply,
  placeholder,
  groups,
  conditions,
  onRemoveCondition,
  onClearConditions,
  onConfirmAction,
}: {
  value: string;
  onValueChange: (value: string) => void;
  onApply: () => void;
  placeholder: string;
  groups: MentionGroup[];
  conditions: string[];
  onRemoveCondition?: (index: number) => void;
  onClearConditions: () => void;
  onConfirmAction?: (payload: { committedConditions: string[]; committedInput: string }) => void;
}) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuSource, setMenuSource] = useState<"plus" | "at" | "smart">("plus");
  const [mentionQuery, setMentionQuery] = useState("");
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState(0);
  const [confirmClearOpen, setConfirmClearOpen] = useState(false);
  const [preview, setPreview] = useState<{ def: DefRef; anchor: DOMRect; placement: "right" | "top" } | null>(null);
  const hidePreviewTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const allItems = useMemo<PickerItem[]>(() => {
    const flat = groups.flatMap((group) => (
      group.items.map((item) => ({
        id: item.id,
        name: item.name,
        group: group.label,
        def: getDef(item.id),
      }))
    ));

    const deduped = new Map<string, PickerItem>();
    for (const item of flat) {
      if (!deduped.has(item.id)) deduped.set(item.id, item);
    }
    return [...deduped.values()];
  }, [groups]);

  const categories = useMemo(() => {
    const q = search.trim().toLowerCase();
    return groups
      .map((group) => {
        const items = allItems.filter((item) => {
          if (item.group !== group.label) return false;
          if (!q) return true;
          const initials = item.name
            .split(/\s+/)
            .filter(Boolean)
            .map((part) => part[0])
            .join("")
            .toLowerCase();
          return item.name.toLowerCase().includes(q)
            || item.id.toLowerCase().includes(q)
            || initials.includes(q);
        });
        return { label: group.label, items };
      })
      .filter((group) => group.items.length > 0);
  }, [allItems, groups, search]);

  useEffect(() => {
    if (activeCategory >= categories.length) setActiveCategory(0);
  }, [activeCategory, categories.length]);

  const visibleItems = categories[activeCategory]?.items ?? [];
  const hasInput = value.trim().length > 0 || conditions.length > 0;

  useEffect(() => {
    const onPointerDown = (event: MouseEvent) => {
      if (!rootRef.current) return;
      if (!rootRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
        setPreview(null);
      }
    };
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, []);

  useEffect(() => () => {
    if (hidePreviewTimer.current) clearTimeout(hidePreviewTimer.current);
  }, []);

  const showPreview = useCallback((def: DefRef | undefined, anchor: DOMRect, placement: "right" | "top") => {
    if (!def) return;
    if (hidePreviewTimer.current) clearTimeout(hidePreviewTimer.current);
    setPreview({ def, anchor, placement });
  }, []);

  const scheduleHidePreview = useCallback(() => {
    if (hidePreviewTimer.current) clearTimeout(hidePreviewTimer.current);
    hidePreviewTimer.current = setTimeout(() => setPreview(null), 150);
  }, []);

  const insertFromMenu = (itemName: string) => {
    const current = value;
    const caret = inputRef.current?.selectionStart ?? current.length;

    if (menuSource === "at") {
      const before = current.slice(0, caret);
      const after = current.slice(caret);
      const atIndex = before.lastIndexOf("@");

      if (atIndex >= 0) {
        const nextValue = `${before.slice(0, atIndex)}${itemName} ${after}`;
        onValueChange(nextValue);
        requestAnimationFrame(() => {
          const nextCursor = atIndex + itemName.length + 1;
          inputRef.current?.focus();
          inputRef.current?.setSelectionRange(nextCursor, nextCursor);
        });
      } else {
        const nextValue = current.trim().length > 0 ? `${current} ${itemName}` : itemName;
        onValueChange(nextValue);
      }
    } else if (menuSource === "smart") {
      const before = current.slice(0, caret);
      const after = current.slice(caret);
      const tokenMatch = before.match(/(^|\s)([a-z][a-z0-9_-]{1,})$/i);
      if (tokenMatch && typeof tokenMatch.index === "number") {
        const token = tokenMatch[2] ?? "";
        const tokenStart = before.length - token.length;
        const nextValue = `${before.slice(0, tokenStart)}${itemName} ${after}`;
        onValueChange(nextValue);
        requestAnimationFrame(() => {
          const nextCursor = tokenStart + itemName.length + 1;
          inputRef.current?.focus();
          inputRef.current?.setSelectionRange(nextCursor, nextCursor);
        });
      } else {
        const nextValue = current.trim().length > 0 ? `${current} ${itemName}` : itemName;
        onValueChange(nextValue);
      }
    } else {
      const nextValue = current.trim().length > 0 ? `${current} ${itemName}` : itemName;
      onValueChange(nextValue);
    }

    setMentionQuery("");
    setSearch("");
    setMenuOpen(false);
    setPreview(null);
    inputRef.current?.focus();
  };

  const handleInputChange = (nextValue: string) => {
    onValueChange(nextValue);

    const input = inputRef.current;
    const caret = input?.selectionStart ?? nextValue.length;
    const before = nextValue.slice(0, caret);
    const match = before.match(/(?:^|\s)@([^\s@]*)$/);

    if (match) {
      setMenuSource("at");
      setMentionQuery(match[1] ?? "");
      setSearch(match[1] ?? "");
      setMenuOpen(true);
      return;
    }

    const tokenMatch = before.match(/(^|\s)([a-z][a-z0-9_-]{1,})$/i);
    const smartToken = tokenMatch?.[2]?.trim() ?? "";
    if (smartToken.length >= 2) {
      const q = smartToken.toLowerCase();
      const hasSmartMatch = allItems.some((item) => {
        const name = item.name.toLowerCase();
        const initials = item.name
          .split(/\s+/)
          .filter(Boolean)
          .map((part) => part[0])
          .join("")
          .toLowerCase();
        return name.startsWith(q) || name.includes(q) || item.id.toLowerCase().includes(q) || initials.startsWith(q);
      });
      if (hasSmartMatch) {
        setMenuSource("smart");
        setMentionQuery(smartToken);
        setSearch(smartToken);
        setMenuOpen(true);
        return;
      }
    }

    if (menuSource === "at" || menuSource === "smart") {
      setMenuOpen(false);
      setMentionQuery("");
      setSearch("");
    }
  };

  const clearEverything = () => {
    onValueChange("");
    onClearConditions();
    setMenuOpen(false);
    setConfirmClearOpen(false);
    inputRef.current?.focus();
  };

  return (
    <div ref={rootRef} className="relative">
      <div className="space-y-2 rounded-xl border border-input-border bg-input p-2">
        <div className="flex items-center gap-2">
          <Textarea
            ref={inputRef}
            value={value}
            onChange={(event) => handleInputChange(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                onApply();
              }
            }}
            className="min-h-[108px] resize-none"
            placeholder={placeholder}
          />
          <Button variant="outline" onClick={onApply} className="shrink-0">Apply</Button>
        </div>
        {conditions.length > 0 ? (
          <div className="flex flex-wrap gap-2 px-0.5">
            {conditions.map((condition, index) => (
              <span
                key={`${condition}-${index}`}
                className="inline-flex items-center gap-1.5 rounded-full border border-border bg-muted px-3 py-1 text-xs text-foreground"
              >
                <span className="break-words leading-relaxed"><MentionText content={condition} /></span>
                <button
                  type="button"
                  className="rounded-full text-muted-foreground hover:text-foreground"
                  aria-label={`Remove condition ${condition}`}
                  onClick={() => onRemoveCondition?.(index)}
                >
                  <RiCloseLine className="size-3.5" />
                </button>
              </span>
            ))}
          </div>
        ) : null}
        <div className="flex items-center justify-start">
          <Button
            variant="outline"
            size="icon"
            className="h-9 w-9 shrink-0"
            onClick={() => {
              setMenuSource("plus");
              setMentionQuery("");
              setSearch("");
              setMenuOpen((open) => !open);
              inputRef.current?.focus();
            }}
            title="Add item"
            aria-label="Add item"
          >
            <RiAddLine className="size-4" />
          </Button>
          <div className="ml-auto flex items-center gap-2">
            <Button
              variant="outline"
              disabled={!hasInput}
              onClick={() => setConfirmClearOpen(true)}
            >
              Clear
            </Button>
            <Button
              disabled={!hasInput}
              onClick={() => {
                const pending = (inputRef.current?.value ?? value).trim();
                if (pending) {
                  onApply();
                  onConfirmAction?.({
                    committedConditions: [...conditions, pending],
                    committedInput: "",
                  });
                } else {
                  onConfirmAction?.({
                    committedConditions: [...conditions],
                    committedInput: value,
                  });
                }
              }}
            >
              Confirm
            </Button>
          </div>
        </div>
      </div>

      {menuOpen ? (
        <div className="absolute left-0 right-0 top-[calc(100%+0.5rem)] z-20 overflow-hidden rounded-xl border border-border bg-popover shadow-lg">
          <div className="flex items-center gap-2 border-b border-border px-2.5 py-2">
            <RiSearchLine className="size-3.5 text-muted-foreground" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder={menuSource === "at" ? "Search mentions" : "Search objects"}
              className="h-8 border-0 bg-transparent px-0 text-sm shadow-none focus-visible:ring-0"
            />
          </div>
          <div className="grid h-56 grid-cols-[11rem_1fr]">
            <div className="overflow-y-auto border-r border-border p-1">
              {categories.map((category, index) => (
                <button
                  key={category.label}
                  type="button"
                  onClick={() => setActiveCategory(index)}
                  className={cn(
                    "flex w-full items-center rounded-lg px-2 py-1.5 text-left text-xs",
                    index === activeCategory
                      ? "bg-accent text-accent-foreground"
                      : "text-muted-foreground hover:bg-accent/50 hover:text-foreground",
                  )}
                >
                  <span className="truncate">{category.label}</span>
                  <RiArrowRightSLine className="ml-auto size-3.5" />
                </button>
              ))}
            </div>
            <div className="overflow-y-auto p-1">
              {visibleItems.length > 0 ? visibleItems.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => insertFromMenu(item.name)}
                  onMouseEnter={(event) => showPreview(item.def, event.currentTarget.getBoundingClientRect(), "right")}
                  onMouseLeave={scheduleHidePreview}
                  className={cn(
                    "flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-left text-sm",
                    "hover:bg-accent hover:text-accent-foreground",
                  )}
                >
                  <span className="truncate text-foreground">{item.name}</span>
                  <span className="ml-3 shrink-0 text-[11px] text-muted-foreground">{item.group}</span>
                </button>
              )) : (
                <p className="px-2.5 py-2 text-xs text-muted-foreground">No matching items.</p>
              )}
            </div>
          </div>
        </div>
      ) : null}

      {preview ? createPortal(
        <div
          className="fixed z-[9999]"
          style={preview.placement === "right"
            ? { top: preview.anchor.top, left: preview.anchor.right + 10 }
            : { top: preview.anchor.top - 12, left: preview.anchor.left }}
          onMouseEnter={() => {
            if (hidePreviewTimer.current) clearTimeout(hidePreviewTimer.current);
          }}
          onMouseLeave={scheduleHidePreview}
        >
          <DefinitionCard def={preview.def} />
        </div>,
        document.body,
      ) : null}

      <ConfirmDialog
        open={confirmClearOpen}
        onOpenChange={setConfirmClearOpen}
        title="Clear all inputs?"
        description="Are you sure you want to clear everything? This cannot be undone and you will need to start again."
        confirmLabel="Yes, clear everything"
        cancelLabel="Cancel"
        variant="destructive"
        onConfirm={clearEverything}
      />
    </div>
  );
}
