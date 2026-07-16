import { Section } from "./doc";

const CHANGELOG: { date: string; title: string; items: string[] }[] = [
  {
    date: "2026-06-16",
    title: "Text colour hierarchy (3 tiers)",
    items: [
      "Root cause of washed-out body text: only two text tiers existed (foreground neutral-700, muted-foreground neutral-400), and shadcn defaults secondary text to muted — so the very light grey got used for body copy everywhere.",
      "Added a middle tier: --foreground-secondary (neutral-600 light / neutral-300 dark), utility text-foreground-secondary.",
      "Reclassified readable descriptions/body off muted → secondary across components/ui, components/layout, and the design-system doc primitive (ComponentDoc, PageHeader, SectionHeader, Card, Dialog, Alert, Activity feed, Stepper, Empty state). Muted (light grey) now reserved for captions, timestamps, placeholders, hints, and disabled states.",
      "Documented the hierarchy in Foundations → Typography. Live app pages and frozen mockups left untouched per scope.",
    ],
  },
  {
    date: "2026-06-16",
    title: "application-UI components batch",
    items: [
      "Enhanced existing: Breadcrumbs (chevron/slash divider + leading icon), Tabs (count pills), Table (SortableTableHead, selection column, row-actions menu), Section header (badge + tabs slots). Command menu reviewed (kept; cmdk noted for a full palette). Sidebar documented as the canonical, interactive recipe.",
      "New on shadcn base: Alert (info/success/warning/error, dismiss + actions), Card (+ card-header anatomy), plus the SectionFooter primitive.",
      "New shadcn-style (no deps): Activity feed (timeline, no avatar), Code snippet (copy bar), Filter bar (search + dropdowns + removable chips), Progress steps (horizontal/vertical Stepper), Tree view (expand/collapse + selection), File uploader (dropzone + progress).",
      "Date picker built vanilla (calendar popover); react-day-picker noted as the production base.",
      "Modal taxonomy: Dialog gains size (sm/md/lg) + hideClose; ConfirmDialog adds destructive confirmation (no outside-click/esc dismiss) via the existing Radix dialog — @radix-ui/react-alert-dialog noted as the dedicated primitive. Five documented types + rules.",
      "Per decision: no new npm dependencies added; recommended packages cited on each component's doc page.",
    ],
  },
  {
    date: "2026-06-16",
    title: "Layout templates + primitives",
    items: [
      "New layout primitives (src/components/layout/): Page, PageHeader, Section/SectionHeader, Grid, Panel/PanelHeader/PanelBody, SplitView — Layout rules reconciled to the existing inset-card tokens, no new deps or CSS tokens.",
      "New Layout page in the design system with four recipes (preview + code + dos/don'ts): List page, Detail page, List + detail (split view), Settings page.",
      "All templates render in the inset-panel look (bg-sidebar backdrop, rounded-xl/shadow-sm/border-border/60 cards, h-12 header bar) to match AppShell and the Data panel.",
      "Refinement: section-title dividers removed from SectionHeader — spacing now carries affinity/separation. Detail page breadcrumb moved into the panel header bar. Page-header divider kept.",
      "Inset rule: only the outermost surface is inset. Added Pane (flush sub-panel) for split layouts; SplitView panes now fill the parent panel edge-to-edge, divided by a 1px handle (with hover grip), instead of floating as nested cards.",
    ],
  },
  {
    date: "2026-06-12",
    title: "Mona Sans + sentence-case labels",
    items: [
      "Typeface switched Inter → Mona Sans (GitHub), loaded from Google Fonts; cv11 feature setting removed (Inter-specific).",
      "Label convention changed to sentence case: uppercase/tracking removed from design-system labels, doc headers, page nav, and the app sidebar group label. Concept mockups (data/, data-v2/) left untouched.",
    ],
  },
  {
    date: "2026-06-12",
    title: "Type scale review",
    items: [
      "Confirmed the original playground type scale (Tailwind defaults) is untouched — no custom font-size tokens were ever added.",
      "Button sm label reverted text-sm → text-xs (the one component-level size that had changed); 14px small-button label not adopted.",
    ],
  },
  {
    date: "2026-06-12",
    title: "Design system split into pages",
    items: [
      "One page per group (Foundations, Forms, Actions, Data display, Feedback, Navigation, Patterns, Changelog), each with a consistent header → sections structure.",
      "Side nav switches pages and deep-links to sections; scrollspy highlights within the current page.",
    ],
  },
  {
    date: "2026-06-12",
    title: "Phases 2 & 3 — component library on shadcn foundation",
    items: [
      "Phase 2: Input (+ Field/Label anatomy), Textarea, Select (Radix), Table — design-system skin on shadcn structure.",
      "Phase 3: Tooltip, Dropdown menu, Dialog, Tabs (underline + segmented), Checkbox, Radio group, Toggle, Breadcrumbs, Pagination, Toast (sonner), Empty state, Featured icon, Metric card. Progress bar skipped per Izac.",
      "Radix primitives + sonner installed; shadcn component structure used as the foundation throughout.",
      "App sidebar nav items: medium → semibold (semibold nav weight).",
      "Design System page restructured: grouped sections with a sticky side navigation (Foundations / Forms / Actions / Data display / Feedback / Navigation / Patterns / Changelog).",
    ],
  },
  {
    date: "2026-06-12",
    title: "Skeuomorphic button shadow",
    items: [
      "Added shadow-skeuomorphic + shadow-xs-skeuomorphic tokens, verified against the reference (1px inset ring 18% + inset bottom shade 5% + xs drop).",
      "Solid Button variants additionally get before: inner-border gradient — 1px white/12 ring fading toward the bottom (mask-b-from-0%).",
      "Outline fix: real border removed; the border is now a 1px inset ring inside shadow-xs-skeuomorphic-border (merged-line approach), matching solid buttons' ring weight exactly and adapting to dark mode via --border.",
    ],
  },
  {
    date: "2026-06-12",
    title: "Phase 1 — component structure",
    items: [
      "Button: heights 36/40/44 (sm/md/lg), semibold labels, rounded-lg, soft 4px focus ring, new link variant. xs (32px) size retained from shadcn for dense UI.",
      "Badge: 1px inset ring (style), size prop (sm/md/lg).",
      "Avatar: circular with inset contrast ring, optional online dot.",
      "Skeleton: rounded-lg to match 8px radius scale.",
      "Design System page restructured: preview/code tabs, descriptions, dos & don'ts, changelog.",
    ],
  },
  {
    date: "2026-06-12",
    title: "Color retune reverted",
    items: [
      "semantic color values (white bg, neutral-900 fg, etc.) reverted to the original Lexer palette by Izac — colors stay as-is; only structure is adopted.",
    ],
  },
  {
    date: "2026-06-12",
    title: "Phase 0 — foundations",
    items: [
      "Inter adopted as the UI typeface (feature cv11). Type scale unchanged.",
      "brand-50…950 aliases added for the teal scale (brand-25 intentionally omitted).",
      "Base radius 10px → 8px (: buttons/inputs 8px, cards 12px).",
      "Shadow scale replaced with refined elevation values (xs–2xl).",
    ],
  },
];

export function ChangelogSection() {
  return (
    <Section id="changelog" title="Changelog">
      <div className="flex flex-col gap-4">
        {CHANGELOG.map((entry) => (
          <div key={entry.title} className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-sm font-semibold">{entry.title}</span>
              <span className="text-xs text-muted-foreground ml-auto tabular-nums">{entry.date}</span>
            </div>
            <ul className="flex flex-col gap-1">
              {entry.items.map((item) => (
                <li key={item} className="text-sm text-muted-foreground flex gap-2">
                  <span className="text-border select-none">—</span>{item}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </Section>
  );
}
