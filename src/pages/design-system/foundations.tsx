import { Section } from "./doc";

type SwatchDef = { name: string; className: string };

function ColorSwatch({ name, className }: SwatchDef) {
  return (
    <div className="flex flex-col gap-1 w-20">
      <div className={`h-10 rounded-lg ${className} border border-black/5`} />
      <p className="text-xs text-muted-foreground truncate">{name}</p>
    </div>
  );
}

const SEMANTIC_SWATCHES: SwatchDef[] = [
  { name: "background", className: "bg-background border border-border" },
  { name: "foreground", className: "bg-foreground" },
  { name: "foreground-secondary", className: "bg-foreground-secondary" },
  { name: "card", className: "bg-card border border-border" },
  { name: "primary", className: "bg-primary" },
  { name: "primary-fg", className: "bg-primary-foreground border border-border" },
  { name: "secondary", className: "bg-secondary" },
  { name: "muted", className: "bg-muted" },
  { name: "muted-fg", className: "bg-muted-foreground" },
  { name: "accent", className: "bg-accent" },
  { name: "border", className: "bg-border" },
  { name: "destructive", className: "bg-destructive" },
  { name: "ring", className: "bg-ring" },
];

const BRAND_SWATCHES: SwatchDef[] = [
  { name: "brand-50", className: "bg-brand-50" },
  { name: "brand-100", className: "bg-brand-100" },
  { name: "brand-200", className: "bg-brand-200" },
  { name: "brand-300", className: "bg-brand-300" },
  { name: "brand-400", className: "bg-brand-400" },
  { name: "brand-500", className: "bg-brand-500" },
  { name: "brand-600", className: "bg-brand-600" },
  { name: "brand-700", className: "bg-brand-700" },
  { name: "brand-800", className: "bg-brand-800" },
  { name: "brand-900", className: "bg-brand-900" },
  { name: "brand-950", className: "bg-brand-950" },
];

const SIDEBAR_SWATCHES: SwatchDef[] = [
  { name: "sidebar", className: "bg-sidebar border border-border" },
  { name: "sidebar-fg", className: "bg-sidebar-foreground" },
  { name: "sidebar-accent", className: "bg-sidebar-accent" },
  { name: "sidebar-active", className: "bg-sidebar-active" },
  { name: "sidebar-border", className: "bg-sidebar-border" },
];

const SHADOWS = [
  { name: "xs", className: "shadow-xs" },
  { name: "sm", className: "shadow-sm" },
  { name: "md", className: "shadow-md" },
  { name: "lg", className: "shadow-lg" },
  { name: "xl", className: "shadow-xl" },
  { name: "2xl", className: "shadow-2xl" },
];

export function FoundationsSections() {
  return (
    <>
      <Section id="colors" title="Colors">
        <p className="text-xs text-muted-foreground font-medium">Semantic tokens</p>
        <div className="flex flex-wrap gap-3">
          {SEMANTIC_SWATCHES.map((s) => <ColorSwatch key={s.name} {...s} />)}
        </div>
        <p className="text-xs text-muted-foreground font-medium mt-2">Brand scale (Lexer teal, convention)</p>
        <div className="flex flex-wrap gap-3">
          {BRAND_SWATCHES.map((s) => <ColorSwatch key={s.name} {...s} />)}
        </div>
        <p className="text-xs text-muted-foreground">brand-* aliases the teal scale. brand-25 intentionally omitted.</p>
        <p className="text-xs text-muted-foreground font-medium mt-2">Sidebar</p>
        <div className="flex flex-wrap gap-3">
          {SIDEBAR_SWATCHES.map((s) => <ColorSwatch key={s.name} {...s} />)}
        </div>
      </Section>

      <Section id="typography" title="Typography">
        <div className="flex flex-col gap-3 p-4 bg-card rounded-xl border border-border">
          <p className="text-3xl font-bold tracking-tight">Display / Bold</p>
          <p className="text-2xl font-semibold">Heading 1 / Semibold</p>
          <p className="text-xl font-semibold">Heading 2 / Semibold</p>
          <p className="text-base font-medium">Body large / Medium</p>
          <p className="text-sm text-foreground">Body default / Regular — The primary text size for content and UI labels.</p>
          <p className="text-xs font-medium text-foreground-secondary">Label / Sentence case — Section labels and data headers (no full caps)</p>
        </div>

        <p className="text-xs font-medium text-foreground-secondary mt-2">Text colour hierarchy</p>
        <div className="flex flex-col gap-3 p-4 bg-card rounded-xl border border-border">
          <div className="flex flex-col gap-0.5">
            <p className="text-sm text-foreground">Primary — text-foreground</p>
            <p className="text-xs text-foreground-secondary">Default for body content and anything the user must read. Most text lives here.</p>
          </div>
          <div className="flex flex-col gap-0.5">
            <p className="text-sm text-foreground-secondary">Secondary — text-foreground-secondary</p>
            <p className="text-xs text-foreground-secondary">Supporting copy that still must be legible: descriptions, subtitles, table data.</p>
          </div>
          <div className="flex flex-col gap-0.5">
            <p className="text-sm text-muted-foreground">Muted — text-muted-foreground</p>
            <p className="text-xs text-foreground-secondary">Genuinely supplementary only: captions, timestamps, placeholders, hints, disabled.</p>
          </div>
        </div>
        <p className="text-xs text-foreground-secondary">
          Three tiers, not two: neutral-700 → 600 → 400 (light) / 50 → 300 → 400 (dark). Reach for
          <span className="font-medium"> secondary</span> before muted — reserve muted (light grey) for side-notes, never regular body text.
        </p>
        <p className="text-xs text-foreground-secondary">Typeface: Mona Sans (GitHub), display + body. Scale unchanged (Tailwind defaults). Labels use sentence case — no full caps.</p>
      </Section>

      <Section id="shadows" title="Shadows">
        <div className="flex flex-wrap gap-6">
          {SHADOWS.map((s) => (
            <div key={s.name} className="flex flex-col items-center gap-2">
              <div className={`w-20 h-20 rounded-xl bg-card border border-border ${s.className}`} />
              <span className="text-xs text-muted-foreground">{s.name}</span>
            </div>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <div className="w-44 h-10 rounded-lg bg-primary shadow-xs-skeuomorphic flex items-center justify-center text-sm font-semibold text-primary-foreground">xs-skeuomorphic</div>
          <div className="w-52 h-10 rounded-lg bg-card shadow-xs-skeuomorphic-border flex items-center justify-center text-sm font-semibold text-foreground">xs-skeuomorphic-border</div>
        </div>
        <p className="text-xs text-muted-foreground">
          elevation: xs on inputs, xs-skeuomorphic on solid buttons (+ inner-border gradient), xs-skeuomorphic-border on bordered buttons, sm–md on cards, lg+ on overlays.
        </p>
      </Section>

      <Section id="radius" title="Border radius">
        <div className="flex gap-4 items-end flex-wrap">
          {[
            { label: "sm", cls: "rounded-sm" },
            { label: "md", cls: "rounded-md" },
            { label: "lg / default", cls: "rounded-lg" },
            { label: "xl", cls: "rounded-xl" },
            { label: "2xl", cls: "rounded-2xl" },
            { label: "full", cls: "rounded-full" },
          ].map(({ label, cls }) => (
            <div key={label} className="flex flex-col items-center gap-2">
              <div className={`w-16 h-16 bg-primary/20 border-2 border-primary/30 ${cls}`} />
              <span className="text-xs text-muted-foreground text-center">{label}</span>
            </div>
          ))}
        </div>
        <p className="text-xs text-muted-foreground">Base radius: 0.5rem (8px,). Cards use rounded-xl (12px). Inputs/buttons rounded-lg (8px).</p>
      </Section>

      <Section id="spacing" title="Spacing scale">
        <div className="flex flex-wrap gap-3 items-end">
          {[1, 2, 3, 4, 6, 8, 10, 12, 16, 20, 24].map((n) => (
            <div key={n} className="flex flex-col items-center gap-1">
              <div className="bg-primary/20 rounded" style={{ width: `${n * 4}px`, height: `${n * 4}px` }} />
              <span className="text-[10px] text-muted-foreground">{n}</span>
            </div>
          ))}
        </div>
        <p className="text-xs text-muted-foreground">1 unit = 4px. Cards use px-3 py-2 (tight density). Max content width: max-w-3xl.</p>
      </Section>
    </>
  );
}
