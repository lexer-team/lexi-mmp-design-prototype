import {
  useRef, useState, useMemo, useEffect, useLayoutEffect, useCallback, createElement,
} from "react";
import { createPortal } from "react-dom";
import { renderToStaticMarkup } from "react-dom/server";
import { cn } from "@/lib/utils";
import { RiAtLine, RiAddLine, RiArrowUpLine, RiSearchLine } from "@remixicon/react";
import { getDef, type DefRef, type DefKind } from "@/data/def-registry";
import { KIND_META } from "@/components/definitions/kind-meta";
import { DefinitionCard } from "@/components/definitions/DefinitionCard";
import type { MentionGroup } from "../../lexi-shared-brain/MentionComposer";

// ─── Inline-mention prompt composer ──────────────────────────────────────────
// A contentEditable composer where "@" opens a compact picker — a search header
// over a category column (left) and the matching objects (right), the same shape
// as the original MentionComposer, plus full keyboard navigation. Picking an
// object inserts it *inline* as an atomic token styled exactly like a chat mention
// (icon + name + dotted underline), so it reads inside the plain-language prompt
// and can be removed with a single Backspace. The picker is portalled and anchored
// to the editor so the surrounding panel can never clip it.

interface Flat { ci: number; it: DefRef }

// ── Inline token (mirrors RichText's InlineCitation) ──
const TOKEN_CLASS =
  "lexi-mention inline-flex items-baseline align-baseline cursor-default whitespace-nowrap " +
  "underline decoration-dotted decoration-muted-foreground/60 underline-offset-4";

const ICON_MARKUP = new Map<DefKind, string>();
function iconMarkup(kind: DefKind): string {
  let m = ICON_MARKUP.get(kind);
  if (m == null) {
    const Icon = KIND_META[kind].icon;
    m = renderToStaticMarkup(
      createElement(Icon, { className: "relative top-[1px] mr-0.5 inline size-3 text-muted-foreground" }),
    );
    ICON_MARKUP.set(kind, m);
  }
  return m;
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c] ?? c));
}

function createTokenEl(item: DefRef): HTMLSpanElement {
  const span = document.createElement("span");
  span.dataset.mention = "true";
  span.dataset.id = item.id;
  span.setAttribute("contenteditable", "false");
  span.className = TOKEN_CLASS;
  span.innerHTML = `${iconMarkup(item.kind)}<span class="font-medium text-foreground">${escapeHtml(item.name)}</span>`;
  return span;
}

function placeCaretEnd(el: HTMLElement) {
  const r = document.createRange();
  r.selectNodeContents(el);
  r.collapse(false);
  const sel = window.getSelection();
  sel?.removeAllRanges();
  sel?.addRange(r);
}

export function PromptComposer({
  groups, placeholder, onSubmit, disabled = false, enableMentions = true, plusItems = [],
}: {
  groups: MentionGroup[];
  plusItems?: DefRef[];
  placeholder?: string;
  onSubmit?: (text: string, mentionIds: string[]) => void;
  disabled?: boolean;
  enableMentions?: boolean;
}) {
  const editorRef = useRef<HTMLDivElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  // Insertion point left in the editor while the picker is open.
  const anchorRef = useRef<HTMLElement | null>(null);

  const [open, setOpen] = useState(false);
  const [pickerMode, setPickerMode] = useState<"mention" | "plus">("mention");
  const [search, setSearch] = useState("");
  const [activeFlat, setActiveFlat] = useState(0);
  const [empty, setEmpty] = useState(true);
  const [canSend, setCanSend] = useState(false);
  const [coords, setCoords] = useState<{ left: number; bottom: number; width: number } | null>(null);

  // Hover preview (definition card) — to the right of the picker for list items,
  // and above the token for mentions already placed in the editor.
  const [preview, setPreview] = useState<{ def: DefRef; anchor: DOMRect; placement: "right" | "top" } | null>(null);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const cancelHide = useCallback(() => { if (hideTimer.current) clearTimeout(hideTimer.current); }, []);
  const showPreview = useCallback((def: DefRef, anchor: DOMRect, placement: "right" | "top") => {
    cancelHide();
    setPreview({ def, anchor, placement });
  }, [cancelHide]);
  const scheduleHide = useCallback(() => {
    cancelHide();
    hideTimer.current = setTimeout(() => setPreview(null), 150);
  }, [cancelHide]);

  // Filtered, non-empty categories + a flat index across them for keyboard nav.
  const pickerGroups = useMemo<MentionGroup[]>(() => (
    pickerMode === "plus"
      ? [{ label: "Segments", items: plusItems }]
      : groups
  ), [groups, plusItems, pickerMode]);

  const cats = useMemo(() => {
    const q = search.trim().toLowerCase();
    return pickerGroups
      .map((g) => ({ ...g, items: g.items.filter((it) => q === "" || it.name.toLowerCase().includes(q)) }))
      .filter((g) => g.items.length > 0);
  }, [pickerGroups, search]);
  const flat = useMemo<Flat[]>(() => cats.flatMap((c, ci) => c.items.map((it) => ({ ci, it }))), [cats]);

  useEffect(() => { if (activeFlat >= flat.length) setActiveFlat(0); }, [flat.length, activeFlat]);

  const safeActive = Math.min(activeFlat, Math.max(0, flat.length - 1));
  const activeCat = flat[safeActive]?.ci ?? 0;
  const rightItems = cats[activeCat]?.items ?? [];
  const firstFlatOfCat = (ci: number) => Math.max(0, flat.findIndex((f) => f.ci === ci));

  // ── Serialize editor → plain text + mention ids ──
  const serialize = useCallback(() => {
    const root = editorRef.current;
    if (!root) return { text: "", ids: [] as string[] };
    let text = "";
    const ids: string[] = [];
    const walk = (node: Node) => {
      node.childNodes.forEach((n) => {
        if (n.nodeType === Node.TEXT_NODE) {
          text += n.textContent ?? "";
        } else if (n instanceof HTMLElement) {
          if (n.dataset.mention === "true") {
            // Emit the `[[id]]` token (not the plain name) so the sent message
            // renders the same mention chip in the bubble that the composer shows.
            if (n.dataset.id) {
              text += `[[${n.dataset.id}]]`;
              ids.push(n.dataset.id);
            } else {
              text += n.textContent ?? "";
            }
          } else if (n.tagName === "BR") {
            text += "\n";
          } else if (!n.dataset.anchor) {
            walk(n);
          }
        }
      });
    };
    walk(root);
    return { text, ids };
  }, []);

  const refreshState = useCallback(() => {
    const { text, ids } = serialize();
    const has = text.trim().length > 0 || ids.length > 0;
    setEmpty(!has);
    setCanSend(has && !disabled);
  }, [serialize, disabled]);

  // ── Open / close ──
  const closePicker = useCallback((focusEditor = true) => {
    setOpen(false);
    setSearch("");
    setPickerMode("mention");
    setPreview(null);
    const m = anchorRef.current;
    if (m?.parentNode) m.remove();
    anchorRef.current = null;
    if (focusEditor) editorRef.current?.focus();
  }, []);

  // ── Detect a freshly-typed "@" and hand off to the picker ──
  const onInput = useCallback(() => {
    refreshState();
    if (!enableMentions) return;
    if (open) return; // query is now driven by the picker's search field
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return;
    const range = sel.getRangeAt(0);
    const node = range.startContainer;
    if (node.nodeType !== Node.TEXT_NODE || !editorRef.current?.contains(node)) return;
    const before = (node.textContent ?? "").slice(0, range.startOffset);
    const m = before.match(/(?:^|\s)@(\w*)$/);
    if (!m) return;
    // Replace the typed "@query" with an invisible anchor we insert the token at.
    const r = document.createRange();
    r.setStart(node, Math.max(0, range.startOffset - m[1].length - 1));
    r.setEnd(node, range.startOffset);
    r.deleteContents();
    const marker = document.createElement("span");
    marker.dataset.anchor = "true";
    r.insertNode(marker);
    anchorRef.current = marker;
    setSearch(m[1]);
    setActiveFlat(0);
    setOpen(true);
  }, [open, refreshState, enableMentions]);

  // ── Insert the chosen object as an inline token ──
  const pick = useCallback((item: DefRef) => {
    const editor = editorRef.current;
    const marker = anchorRef.current;
    if (editor && marker?.parentNode) {
      const token = createTokenEl(item);
      marker.replaceWith(token);
      const space = document.createTextNode(" ");
      token.after(space);
      editor.focus();
      const r = document.createRange();
      r.setStart(space, 1);
      r.collapse(true);
      const sel = window.getSelection();
      sel?.removeAllRanges();
      sel?.addRange(r);
    }
    setOpen(false);
    setSearch("");
    setPreview(null);
    anchorRef.current = null;
    refreshState();
  }, [refreshState]);

  // ── Hover a placed token in the editor → preview above it ──
  const onEditorMouseOver = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const el = (e.target as HTMLElement).closest?.("[data-mention]") as HTMLElement | null;
    if (el && editorRef.current?.contains(el) && el.dataset.id) {
      const def = getDef(el.dataset.id);
      if (def) { showPreview(def, el.getBoundingClientRect(), "top"); return; }
    }
    scheduleHide();
  }, [showPreview, scheduleHide]);

  // ── Backspace removes a whole token when the caret sits right after one ──
  const mentionBeforeCaret = useCallback((): HTMLElement | null => {
    const sel = window.getSelection();
    if (!sel || !sel.isCollapsed || sel.rangeCount === 0) return null;
    const r = sel.getRangeAt(0);
    const node = r.startContainer;
    const offset = r.startOffset;
    const isMention = (n: Node | null): n is HTMLElement =>
      !!n && n.nodeType === Node.ELEMENT_NODE && (n as HTMLElement).dataset.mention === "true";
    if (node.nodeType === Node.TEXT_NODE) {
      if (offset > 0) return null;
      return isMention(node.previousSibling) ? (node.previousSibling as HTMLElement) : null;
    }
    const child = node.childNodes[offset - 1] ?? null;
    return isMention(child) ? (child as HTMLElement) : null;
  }, []);

  const submit = useCallback(() => {
    if (disabled) return;
    const { text, ids } = serialize();
    if (text.trim().length === 0 && ids.length === 0) return;
    onSubmit?.(text.trim(), ids);
    if (editorRef.current) editorRef.current.innerHTML = "";
    closePicker(false);
    refreshState();
  }, [disabled, serialize, onSubmit, closePicker, refreshState]);

  const onEditorKeyDown = useCallback((e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submit(); return; }
    if (e.key === "Backspace") {
      const m = mentionBeforeCaret();
      if (m) { e.preventDefault(); m.remove(); refreshState(); }
    }
  }, [submit, mentionBeforeCaret, refreshState]);

  const onSearchKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Escape") { e.preventDefault(); closePicker(); return; }
    if (flat.length === 0) return;
    if (e.key === "ArrowDown") { e.preventDefault(); setActiveFlat((a) => (a + 1) % flat.length); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setActiveFlat((a) => (a - 1 + flat.length) % flat.length); }
    else if (e.key === "Enter" || e.key === "Tab") { e.preventDefault(); pick(flat[Math.min(activeFlat, flat.length - 1)].it); }
  }, [flat, activeFlat, pick, closePicker]);

  // ── @ button: drop an anchor at the caret and open the picker ──
  const insertTrigger = useCallback(() => {
    if (!enableMentions) return;
    if (disabled || open) return;
    const editor = editorRef.current;
    if (!editor) return;
    editor.focus();
    const sel = window.getSelection();
    let range: Range;
    if (sel && sel.rangeCount && editor.contains(sel.anchorNode)) range = sel.getRangeAt(0);
    else { range = document.createRange(); range.selectNodeContents(editor); range.collapse(false); }
    range.collapse(true);
    const marker = document.createElement("span");
    marker.dataset.anchor = "true";
    range.insertNode(marker);
    anchorRef.current = marker;
    setPickerMode("mention");
    setSearch("");
    setActiveFlat(0);
    setOpen(true);
  }, [disabled, open, enableMentions]);

  const insertPlusTrigger = useCallback(() => {
    if (disabled || open || plusItems.length === 0) return;
    const editor = editorRef.current;
    if (!editor) return;
    editor.focus();
    const sel = window.getSelection();
    let range: Range;
    if (sel && sel.rangeCount && editor.contains(sel.anchorNode)) range = sel.getRangeAt(0);
    else { range = document.createRange(); range.selectNodeContents(editor); range.collapse(false); }
    range.collapse(true);
    const marker = document.createElement("span");
    marker.dataset.anchor = "true";
    range.insertNode(marker);
    anchorRef.current = marker;
    setPickerMode("plus");
    setSearch("");
    setActiveFlat(0);
    setOpen(true);
  }, [disabled, open, plusItems.length]);

  // ── Anchor the portal picker just above the editor (fixed, never clipped) ──
  const place = useCallback(() => {
    const el = wrapRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    setCoords({ left: rect.left, bottom: window.innerHeight - rect.top + 8, width: rect.width });
  }, []);
  useLayoutEffect(() => { if (open) place(); }, [open, place]);
  useEffect(() => {
    if (!open) return;
    const handler = () => place();
    window.addEventListener("resize", handler);
    window.addEventListener("scroll", handler, true);
    return () => {
      window.removeEventListener("resize", handler);
      window.removeEventListener("scroll", handler, true);
    };
  }, [open, place]);

  // Focus the search field once the portal is positioned + mounted.
  useEffect(() => { if (open && coords) searchInputRef.current?.focus(); }, [open, coords]);

  // Close on outside click (the portal list is excluded).
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (wrapRef.current?.contains(t) || listRef.current?.contains(t)) return;
      closePicker(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open, closePicker]);

  // Keep the active row in view.
  useEffect(() => {
    if (!open) return;
    listRef.current?.querySelector<HTMLElement>(`[data-flat="${safeActive}"]`)?.scrollIntoView({ block: "nearest" });
  }, [safeActive, open]);

  return (
    <div ref={wrapRef} className="relative">
      <div
        className={cn(
          "flex flex-col rounded-2xl border border-input-border bg-input shadow-sm",
          "transition-[box-shadow,border-color] focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50",
          disabled && "opacity-60",
        )}
      >
        <div className="relative">
          {empty && (
            <span className="pointer-events-none absolute left-4 top-3 text-sm text-muted-foreground">
              {placeholder ?? "Ask Lexi, or @ to mention a segment, metric…"}
            </span>
          )}
          <div
            ref={editorRef}
            contentEditable={!disabled}
            suppressContentEditableWarning
            role="textbox"
            aria-multiline="true"
            spellCheck={false}
            onInput={onInput}
            onKeyDown={onEditorKeyDown}
            onMouseOver={onEditorMouseOver}
            onMouseLeave={scheduleHide}
            className={cn(
              "max-h-32 min-h-[1.5rem] w-full overflow-y-auto whitespace-pre-wrap break-words bg-transparent px-4 pb-1 pt-3 text-sm text-foreground outline-none",
              disabled && "pointer-events-none",
            )}
            style={{ lineHeight: "1.5" }}
          />
        </div>

        <div className="flex items-center gap-1 p-2 pt-1">
          <button
            type="button"
            onClick={insertPlusTrigger}
            disabled={disabled || plusItems.length === 0}
            title="Insert a segment"
            className="flex size-7 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:pointer-events-none disabled:opacity-50"
          >
            <RiAddLine className="size-4" />
          </button>
          {enableMentions ? (
            <button
              type="button"
              onClick={insertTrigger}
              disabled={disabled}
              title="Mention an object"
              className="flex size-7 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:pointer-events-none disabled:opacity-50"
            >
              <RiAtLine className="size-4" />
            </button>
          ) : null}
          <span className="flex-1" />
          <button
            type="button"
            onClick={submit}
            disabled={!canSend}
            className={cn(
              "flex size-7 items-center justify-center rounded-full transition-colors",
              canSend ? "bg-primary text-primary-foreground hover:bg-primary/90" : "cursor-not-allowed bg-muted text-muted-foreground",
            )}
          >
            <RiArrowUpLine className="size-4" />
          </button>
        </div>
      </div>

      {open && coords && createPortal(
        <div
          ref={listRef}
          style={{ position: "fixed", left: coords.left, bottom: coords.bottom, width: Math.min(coords.width, 448) }}
          className="z-[9999] overflow-hidden rounded-xl border border-border bg-popover shadow-lg"
        >
          {/* Header — search */}
          <div className="flex items-center gap-2 border-b border-border px-3 py-2">
            <RiSearchLine className="size-3.5 shrink-0 text-muted-foreground" />
            <input
              ref={searchInputRef}
              value={search}
              onChange={(e) => { setSearch(e.target.value); setActiveFlat(0); }}
              onKeyDown={onSearchKeyDown}
              placeholder={pickerMode === "plus" ? "Search segments…" : "Search segments, metrics…"}
              className="min-w-0 flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
            />
          </div>

          {/* Body — half-height split: categories (left) ⟷ items (right) */}
          <div className="flex h-40">
            <div className="w-32 shrink-0 overflow-y-auto border-r border-border bg-muted/30 p-1.5">
              {cats.length > 0 ? cats.map((c, ci) => (
                <button
                  key={c.label}
                  type="button"
                  onMouseDown={(e) => { e.preventDefault(); setActiveFlat(firstFlatOfCat(ci)); }}
                  className={cn(
                    "flex w-full items-center rounded-lg px-2 py-1.5 text-left text-sm transition-colors",
                    ci === activeCat ? "bg-card font-medium text-foreground shadow-xs" : "text-foreground-secondary hover:bg-accent",
                  )}
                >
                  <span className="flex-1 truncate">{c.label}</span>
                </button>
              )) : (
                <p className="px-2 py-2 text-xs text-muted-foreground">No matches</p>
              )}
            </div>

            <div className="min-w-0 flex-1 overflow-y-auto p-1.5" onMouseLeave={scheduleHide}>
              {rightItems.length > 0 ? rightItems.map((it) => {
                const idx = flat.findIndex((f) => f.it.id === it.id);
                const Icon = KIND_META[it.kind].icon;
                const isActive = idx === safeActive;
                return (
                  <div
                    key={it.id}
                    data-flat={idx}
                    role="option"
                    aria-selected={isActive}
                    onMouseEnter={() => {
                      setActiveFlat(idx);
                      if (listRef.current) showPreview(it, listRef.current.getBoundingClientRect(), "right");
                    }}
                    onMouseDown={(e) => { e.preventDefault(); pick(it); }}
                    className={cn(
                      "flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-sm transition-colors",
                      isActive ? "bg-accent" : "hover:bg-accent/50",
                    )}
                  >
                    <Icon className="size-4 shrink-0 text-primary" />
                    <span className="min-w-0 flex-1 truncate font-medium text-foreground">{it.name}</span>
                  </div>
                );
              }) : (
                <p className="px-2 py-6 text-center text-sm text-muted-foreground">No matches.</p>
              )}
            </div>
          </div>
        </div>,
        document.body,
      )}

      {/* Hover preview — right of the picker (list items) or above the token (editor) */}
      {preview && createPortal(
        <div
          style={preview.placement === "right"
            ? { position: "fixed", left: preview.anchor.right + 8, top: preview.anchor.top }
            : { position: "fixed", left: preview.anchor.left, top: preview.anchor.top - 8 }}
          className={cn("z-[10000]", preview.placement === "top" && "-translate-y-full")}
          onMouseEnter={cancelHide}
          onMouseLeave={scheduleHide}
        >
          <DefinitionCard def={preview.def} />
        </div>,
        document.body,
      )}
    </div>
  );
}
