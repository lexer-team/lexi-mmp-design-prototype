import { createContext, useContext, useState } from "react";
import { cn } from "@/lib/utils";
import { RiCheckLine, RiCloseLine } from "@remixicon/react";

/* Shared scaffolding for design-system docs */

/* When set to an id, only the matching Section/ComponentDoc renders — this lets a
   group page mount but show a single component (one-component-per-page nav).
   When null, everything renders (backward compatible). */
export const ActiveDocContext = createContext<string | null>(null);

export function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  const active = useContext(ActiveDocContext);
  if (active && active !== id) return null;
  return (
    <section id={id} className="flex flex-col gap-4 scroll-mt-6">
      <h2 className="text-base font-semibold text-foreground border-b border-border pb-2">{title}</h2>
      {children}
    </section>
  );
}

export function Row({ label, children }: { label?: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      {label && <p className="text-xs text-muted-foreground font-medium">{label}</p>}
      <div className="flex flex-wrap items-center gap-3">{children}</div>
    </div>
  );
}

interface ComponentDocProps {
  id: string;
  title: string;
  description: string;
  code: string;
  dos: string[];
  donts: string[];
  children: React.ReactNode; // preview
}

export function ComponentDoc({ id, title, description, code, dos, donts, children }: ComponentDocProps) {
  const active = useContext(ActiveDocContext);
  const [tab, setTab] = useState<"preview" | "code">("preview");
  if (active && active !== id) return null;
  return (
    <section id={id} className="flex flex-col gap-3 scroll-mt-6">
      <div className="border-b border-border pb-2">
        <h2 className="text-base font-semibold text-foreground">{title}</h2>
        <p className="text-sm text-foreground-secondary mt-1">{description}</p>
      </div>

      <div className="flex gap-1 border-b border-border">
        {(["preview", "code"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              "px-3 py-1.5 text-sm font-medium capitalize -mb-px border-b-2 transition-colors",
              tab === t
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === "preview" ? (
        <div className="rounded-xl border border-border bg-card p-5 flex flex-col gap-4">{children}</div>
      ) : (
        <pre className="rounded-xl border border-border bg-muted p-4 text-xs leading-relaxed overflow-x-auto">
          <code>{code}</code>
        </pre>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 mb-2">Do</p>
          <ul className="flex flex-col gap-1.5">
            {dos.map((d) => (
              <li key={d} className="flex gap-2 text-sm text-foreground">
                <RiCheckLine className="size-4 shrink-0 mt-0.5 text-emerald-600 dark:text-emerald-400" />{d}
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs font-semibold text-rose-600 dark:text-rose-400 mb-2">Don't</p>
          <ul className="flex flex-col gap-1.5">
            {donts.map((d) => (
              <li key={d} className="flex gap-2 text-sm text-foreground">
                <RiCloseLine className="size-4 shrink-0 mt-0.5 text-rose-600 dark:text-rose-400" />{d}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
