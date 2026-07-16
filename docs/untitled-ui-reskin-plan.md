# Untitled UI re-skin plan

**Approach (locked):** keep the shadcn token structure & component API, retune all values to Untitled UI. Lexer teal mapped to `brand-*`. Light + dark shipped together.

**Why this works:** UUI React is also Tailwind v4 + copy-paste, so its styling recipes translate directly. Re-skinning avoids the React Aria dependency and any PRO licensing — we only borrow visual specs (free Figma/source as reference).

**Current surface:** 5 components in `src/components/ui/` (Button, Badge, Avatar, Skeleton, CommandMenu), consumed by 19 files. Raw `<input>`, `<textarea>`, `<select>`, `<table>` used in a handful of places. `src/pages/DesignSystem.tsx` is the living spec page.

---

## Phase 0 — Foundations (`src/index.css`) · ~1 session

Everything else inherits from this. All in one file.

- [ ] **Font:** Inter (body + display), `font-feature-settings: 'cv11'`, letter-spacing `-0.02em` on display sizes
- [ ] **Type scale:** keep current scale (Tailwind defaults already match UUI's text-xs→xl: 12/18 … 20/30)
- [ ] **Brand scale:** `--color-brand-50…950` → Lexer teal (existing stops). UUI's `brand-25` is an ultra-light tint for subtle fills (banner/active-nav/hover backgrounds); skip it for now — **ask Izac before adding a brand-25 stop** when a component build actually calls for it
- [ ] **Radii:** `--radius: 0.5rem` (UUI buttons/inputs = 8px, cards = 12px via `rounded-xl`)
- [ ] **Shadows:** UUI `shadow-xs` `0 1px 2px rgb(16 24 40 / .05)`, `shadow-sm/md` equivalents
- [ ] **Focus ring:** UUI-style 4px soft ring (`ring-4 ring-brand-500/24`-ish) replacing current 2px ring
- [ ] ~~**Semantic token retune**~~ — implemented then **reverted by Izac (12 Jun): UUI color values didn't look good; original Lexer palette kept.** Table below retained for reference only:

| shadcn var | Light | Dark | Note |
|---|---|---|---|
| `--background` | white | neutral-950 | UUI apps use white primary bg (currently neutral-50) |
| `--foreground` | neutral-900 `#171717` | neutral-50 | UUI text-primary |
| `--muted-foreground` | neutral-600 `#525252` | neutral-400 | UUI text-tertiary — current neutral-400 is too light |
| `--card` | white | neutral-900 | |
| `--border` | neutral-200 `#e5e5e5` | neutral-800 | UUI border-secondary |
| `--primary` | brand-600 | brand-500 | |
| `--secondary` | white + border | neutral-900 + border | UUI secondary button is bordered, not filled gray |
| `--ring` | brand-500/24% | brand-400/24% | |

---

## Phase 1 — Restyle existing components · ~1 session

No API changes; consumers untouched.

- [x] **Button** — heights 36/40/44, `font-semibold`, `rounded-lg`, `shadow-xs` on solid/bordered, soft 4px focus ring, `link` variant added (structure only; colors stay Lexer)
- [x] **Badge** — pill + 1px inset ring, sizes sm/md/lg added (existing Lexer color variants kept)
- [x] **Avatar** — circular, inset contrast ring, online-dot prop, UUI sizes
- [x] **Skeleton** — radius matched to 8px scale
- [x] **CommandMenu** — already matched UUI spec (rounded-xl, shadow-lg); no change needed

---

## Phase 2 — Form & data primitives (replace raw HTML usage) · ~1–2 sessions

Built shadcn-pattern, styled per UUI free source.

- [x] **Input** — Field anatomy (label/hint/error), shadow-xs, UUI focus ring
- [x] **Textarea**
- [x] **Select** — Radix (installed alongside other primitives)
- [x] **Table** — card-wrapped, gray header band, xs/medium headers, 1px dividers

---

## Phase 3 — Pick what you need (each ~0.5 session unless noted)

App-UI only, no marketing components.

All built 12 Jun on shadcn foundation (Radix primitives + sonner), UUI-skinned, colors untouched:

- [x] **Sidebar nav restyle** — nav items medium → semibold (UUI weight); colors untouched per revert
- [x] Tooltip (Radix)
- [x] Dropdown menu (Radix)
- [x] Modal / Dialog (Radix)
- [x] Tabs — underline + segmented variants (Radix)
- [x] Empty state
- [x] Featured icon
- [x] Toggle / Checkbox / Radio (Radix)
- [x] Breadcrumbs
- [x] Pagination
- ~~Progress bar~~ — skipped per Izac
- [x] Toast / Notification (sonner, mounted in App)
- [x] Metrics card (chart-less)

---

## Review workflow (after each phase)

1. **DesignSystem page as review surface** — each phase ends with `src/pages/DesignSystem.tsx` updated to show everything that changed (all variants, sizes, colors, token swatches). Run `npm run dev`, open the page, toggle light/dark.
2. **Real pages in context** — component APIs are unchanged, so spot-check Chat, DataPanel, KnowledgePanel for anything that looks off in situ.
3. **Git diff per phase** — each phase is one commit-sized change (Phase 0 = `index.css` only), reviewable and cleanly revertible.
4. **Checkpoint** — work stops after each phase with a summary of what changed and what to look at; next phase starts only after Izac signs off.

## Verification

- [ ] Extend `DesignSystem.tsx` with a section per phase; side-by-side screenshot vs Figma (node `1023-36715`)
- [ ] Dark-mode pass: contrast-check retuned tokens (esp. muted-foreground, borders)
- [ ] Grep for hardcoded `text-neutral-*` / `bg-neutral-*` in pages that should use semantic tokens

## Reference sources

- Free UUI React source per component: untitledui.com/react/components/* ("Code" tab)
- Token values pulled from your Figma file (Inter scale, `#171717 / #525252 / #e5e5e5` neutrals = Tailwind neutral ramp — conveniently what playground already uses)
