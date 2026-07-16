import { useEffect, useState, useRef } from "react";
import { cn } from "@/lib/utils";
import { RiArrowLeftLine, RiPaletteLine } from "@remixicon/react";

interface CommandMenuProps {
  onBack: () => void;
  showDesignSystem?: boolean;
  onDesignSystem?: () => void;
}

export function CommandMenu({ onBack, showDesignSystem, onDesignSystem }: CommandMenuProps) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "`" && !e.ctrlKey && !e.metaKey && !e.altKey) {
        const target = e.target as HTMLElement;
        if (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable) {
          return;
        }
        e.preventDefault();
        setOpen((prev) => !prev);
      }
      if (e.key === "Escape" && open) {
        setOpen(false);
      }
    }

    function handleClickOutside(e: MouseEvent) {
      if (open && menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [open]);

  if (!open) return null;

  function handleAction(action: () => void) {
    action();
    setOpen(false);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[20vh]">
      <div className="fixed inset-0 bg-black/20 backdrop-blur-sm" />
      <div
        ref={menuRef}
        className={cn(
          "relative z-10 w-full max-w-xs rounded-xl border border-border bg-card shadow-lg",
          "animate-in fade-in slide-in-from-top-2 duration-150"
        )}
      >
        <div className="p-1.5">
          <button
            onClick={() => handleAction(onBack)}
            className="w-full flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm hover:bg-muted transition-colors text-left"
          >
            <RiArrowLeftLine className="size-4 text-muted-foreground" />
            <span>Back to prototype list</span>
          </button>
          {showDesignSystem && onDesignSystem && (
            <button
              onClick={() => handleAction(onDesignSystem)}
              className="w-full flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm hover:bg-muted transition-colors text-left"
            >
              <RiPaletteLine className="size-4 text-muted-foreground" />
              <span>Design System</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
