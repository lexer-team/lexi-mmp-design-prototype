# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

React 19 + Vite 7 + Tailwind v4 prototype + living design system for Lexer's product concepts. No router — `App.tsx` manages a simple state-based view (concept list / design system / active concept). Concepts are lazy-loaded via `src/concepts/manifest.ts` which auto-discovers `*/meta.ts` + `*/index.tsx` via Vite globs.

## Commands

- `npm run dev` — dev server (playground; open the Design System page to see every component)
- `npm run build` — `tsc -b && vite build` (type-check + bundle)
- `npm run docs:agents` — regenerate agent docs from `docs/design-system/registry.mjs`

No test runner, no linter CLI. Type-checking (`tsc -b --noEmit`) is the verification step.

## Before building or changing any UI

Read **`docs/design-system/SKILL.md`** first — it's the entry point with conventions, token cheat-sheet, and component inventory that tells you which single reference file to open next. Full reference: `tokens.md`, `principles.md`, `recipes.md`, `components/*.md`.

**Locked rules (non-negotiable):**

- **shadcn structure + Lexer styling + palette.** Use existing components from `src/components/`. When something is missing, build it shadcn-style (cva variants, `className` passthrough, `cn()` merging, Radix for behaviour).
- **Semantic tokens only** — never hardcoded neutrals. Use `text-foreground`, `bg-card`, `border-border` etc.
- **3-tier text colour:** body = `text-foreground`; supporting = `text-foreground-secondary`; only captions/hints/disabled = `text-muted-foreground`. Never use muted for body text.
- **Inset-panel look:** only the outermost surface gets `rounded-xl shadow-sm border border-border/60` on `bg-background` over `bg-sidebar` backdrop. Sub-panels use `Pane` (flush, divided). Never nest cards.
- **Radius:** controls `rounded-lg` (8px); cards/panels `rounded-xl` (12px).
- **One primary action per surface.** Secondary = outline/ghost.
- **Sentence case** for all labels. No ALL-CAPS or letter-spacing.
- **Icons:** `@remixicon/react`. Class merging: `cn()` from `@/lib/utils`.
- **No new npm deps** without sign-off.

## Architecture

```
src/
├── App.tsx                 — view router (list | concept | design-system)
├── main.tsx                — React root
├── index.css               — Tailwind @theme + semantic tokens
├── concepts/               — each subfolder is a self-contained prototype
│   ├── manifest.ts         — auto-discovers concepts via glob
│   ├── lexi-shared-brain/  — v1: group builder with Lexi chat
│   └── lexi-shared-brain-v2/ — v2: chat-first artifact interaction
├── components/
│   ├── ui/                 — 32 shadcn-style primitives (Button, Badge, Card, Dialog…)
│   ├── layout/             — Page, Section, Grid, Panel/Pane, SplitView
│   ├── artifacts/          — DataTable, ArtifactCard, LineChart, BarChart
│   ├── chat/               — LexiIcon, MessageBubble, ChatInput
│   └── definitions/        — DefinitionCard, DefToken
├── pages/                  — Design System showcase pages
├── data/                   — shared mock data (definitions, segments)
└── lib/                    — utils (cn, concept helpers)
```

**Concept pattern:** Each concept in `src/concepts/<name>/` has:
- `meta.ts` — exports `default: ConceptStaticMeta` (title, description, parentId)
- `index.tsx` — exports `default` component (the full-screen concept view)
- Optional: `data.ts`, `CONTEXT.md`, other internal files

The manifest auto-registers concepts — no manual imports needed.

**Component reuse:** Always check `src/components/` before building custom UI. Key existing components: `Button`, `Badge`, `Card`, `Dialog`, `Tooltip`, `Tabs`, `Input`, `Select`, `Panel`/`Pane`/`PanelHeader`, `SplitView`, `Page`/`PageHeader`, `Section`, `Grid`, `MetricCard`, `DefinitionCard`, `DefToken`.

## Adding a component

Build it in `src/components/`, add an entry to `docs/design-system/registry.mjs`, run `npm run docs:agents`. See `docs/design-system/CONTRIBUTING.md`.

## Active prototype contexts

**Lexi — Shared brain v1** (`src/concepts/lexi-shared-brain/`): read `src/concepts/lexi-shared-brain/CONTEXT.md` for the group-builder "Builder" view, design decisions, and open items.

**Lexi — Shared brain v2** (`src/concepts/lexi-shared-brain-v2/`): chat-first artifact interaction model with crystallisation (highlight-to-pin), context panel (right sidebar), and canvas mode (@xyflow/react). Prototypes all 11 vision-doc artifact types through conversation. Uses the retail season-launch worked session as mock data.
