import { useCallback, useEffect, useRef, useState } from "react";
import { RiDraggable } from "@remixicon/react";
import { cn } from "@/lib/utils";

/**
 * SplitView — two resizable panes side by side, separated by a drag handle
 * styled to match AppShell's resize grip. Pass inset `Panel`s as `list` and
 * `detail`; the left pane is the resizable one. General-purpose despite the
 * naming — the canonical use is list + detail.
 */

function ResizeHandle({ onDrag }: { onDrag: (dx: number) => void }) {
  const dragging = useRef(false);
  const lastX = useRef(0);

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    dragging.current = true;
    lastX.current = e.clientX;
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
  }, []);

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (!dragging.current) return;
      onDrag(e.clientX - lastX.current);
      lastX.current = e.clientX;
    };
    const onMouseUp = () => {
      if (!dragging.current) return;
      dragging.current = false;
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
  }, [onDrag]);

  return (
    <div
      onMouseDown={onMouseDown}
      className="group relative w-px shrink-0 cursor-col-resize bg-border transition-colors hover:bg-ring"
    >
      {/* widened invisible hit area so the 1px line is easy to grab */}
      <div className="absolute inset-y-0 -left-1.5 -right-1.5 z-10" />
      {/* grip chip on hover */}
      <div className="pointer-events-none absolute left-1/2 top-1/2 z-20 flex h-8 w-4 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-sm border border-border bg-background opacity-0 shadow-sm transition-opacity group-hover:opacity-100">
        <RiDraggable className="size-3 text-muted-foreground/50" />
      </div>
    </div>
  );
}

export function SplitView({
  list,
  detail,
  initialListWidth = 360,
  minListWidth = 240,
  maxListWidth = 560,
  className,
}: {
  list: React.ReactNode;
  detail: React.ReactNode;
  initialListWidth?: number;
  minListWidth?: number;
  maxListWidth?: number;
  className?: string;
}) {
  const [listWidth, setListWidth] = useState(initialListWidth);

  const handleDrag = useCallback(
    (dx: number) => {
      setListWidth((w) => Math.min(maxListWidth, Math.max(minListWidth, w + dx)));
    },
    [minListWidth, maxListWidth],
  );

  return (
    <div className={cn("flex h-full w-full overflow-hidden", className)}>
      <div className="h-full shrink-0 overflow-hidden" style={{ width: listWidth }}>
        {list}
      </div>
      <ResizeHandle onDrag={handleDrag} />
      <div className="h-full min-w-0 flex-1 overflow-hidden">{detail}</div>
    </div>
  );
}
