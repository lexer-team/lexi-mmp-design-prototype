import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { inputClasses } from "./Input";
import { RiCalendar2Line, RiArrowLeftSLine, RiArrowRightSLine } from "@remixicon/react";

/* date picker, built vanilla (no dependency) so the developer can swap in a
   production calendar later. For ranges, locales, and keyboard grids, react-day-picker
   (npm: react-day-picker) is the shadcn base — reskin it to these tokens and keep
   this trigger. */

const WEEKDAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function sameDay(a: Date | undefined, b: Date) {
  return !!a && a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

export function Calendar({
  value,
  onSelect,
  className,
}: {
  value?: Date;
  onSelect?: (d: Date) => void;
  className?: string;
}) {
  const today = new Date();
  const [view, setView] = useState(() => value ?? today);
  const year = view.getFullYear();
  const month = view.getMonth();
  const firstWeekday = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (number | null)[] = [
    ...Array.from({ length: firstWeekday }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  return (
    <div className={cn("w-64 rounded-xl border border-border bg-popover p-3 shadow-lg", className)}>
      <div className="mb-2 flex items-center justify-between">
        <button
          onClick={() => setView(new Date(year, month - 1, 1))}
          aria-label="Previous month"
          className="flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        >
          <RiArrowLeftSLine className="size-4" />
        </button>
        <span className="text-sm font-semibold text-foreground">{MONTHS[month]} {year}</span>
        <button
          onClick={() => setView(new Date(year, month + 1, 1))}
          aria-label="Next month"
          className="flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        >
          <RiArrowRightSLine className="size-4" />
        </button>
      </div>
      <div className="grid grid-cols-7 gap-0.5">
        {WEEKDAYS.map((d) => (
          <div key={d} className="flex h-7 items-center justify-center text-xs font-medium text-muted-foreground/70">{d}</div>
        ))}
        {cells.map((day, i) =>
          day === null ? (
            <span key={`b${i}`} />
          ) : (
            (() => {
              const date = new Date(year, month, day);
              const selected = sameDay(value, date);
              const isToday = sameDay(today, date);
              return (
                <button
                  key={day}
                  onClick={() => onSelect?.(date)}
                  className={cn(
                    "flex size-8 items-center justify-center rounded-lg text-sm tabular-nums transition-colors",
                    "focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ring/40",
                    selected
                      ? "bg-primary font-semibold text-primary-foreground"
                      : "text-foreground hover:bg-accent",
                    !selected && isToday && "font-semibold text-primary",
                  )}
                >
                  {day}
                </button>
              );
            })()
          ),
        )}
      </div>
    </div>
  );
}

export function DatePicker({
  value,
  onChange,
  placeholder = "Pick a date",
  className,
}: {
  value?: Date;
  onChange?: (d: Date) => void;
  placeholder?: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className={cn("relative inline-block", className)}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={cn(inputClasses, "flex h-10 items-center gap-2 px-3 text-left")}
      >
        <RiCalendar2Line className="size-4 shrink-0 text-muted-foreground" />
        <span className={cn("flex-1", !value && "text-muted-foreground")}>
          {value ? value.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" }) : placeholder}
        </span>
      </button>
      {open && (
        <div className="absolute z-50 mt-1 animate-in fade-in-0 zoom-in-95">
          <Calendar
            value={value}
            onSelect={(d) => {
              onChange?.(d);
              setOpen(false);
            }}
          />
        </div>
      )}
    </div>
  );
}
