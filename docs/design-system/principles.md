# Principles & rationale

The *why* behind the locked rules. Read when a decision feels arbitrary or you're tempted to deviate.

## The reskin approach (locked)

Keep shadcn/ui's **token structure and component APIs**; retune the **values** to Lexer's refined visual spec; keep the **Lexer palette**. shadcn is also Tailwind v4 + copy-paste, so the styling lives in plain utility classes and stays easy to adjust. shadcn structure means: cva-style variants, `className` passthrough, `cn()` merging, Radix primitives for accessible behaviour.

Consequence: when something is missing, first ask "what's the shadcn base?" and restyle it. If there's no shadcn base, build it shadcn-style (composition, semantic tokens, Radix where behaviour is needed).

## Colours stay Lexer

An earlier pass retuned semantic colours to a more generic SaaS palette (white bg, neutral-900 text, etc.) and it was reverted — the Lexer palette is kept. Only structure, spacing, radius, and elevation are standardised. Don't reintroduce those generic colour values.

## Text hierarchy (why 3 tiers)

shadcn defaults secondary text to `muted-foreground`, and our muted is light (neutral-400). With only two tiers, body text got pushed onto that faint grey everywhere. We added `foreground-secondary` (neutral-600) as the middle tier so body stays readable and muted is reserved for genuine side-notes. See `tokens.md`.

## Sentence case labels

No ALL-CAPS or tracking on labels — they read as quieter, more modern, and match the Lexer voice.

## The inset look

The app is inset cards floating on a `bg-sidebar` backdrop (`rounded-xl shadow-sm border border-border/60`, `h-12` header bar, `m-2` gutter). Depth comes from the card shadow, not borders between regions. **Only the outermost surface is inset** — sub-panels (split list/detail) are flush (`Pane`) and divided, never nested cards. This keeps nesting calm and the hierarchy legible.

## No new dependencies (default)

Bundle size and supply-chain surface matter. Build vanilla and cite the recommended production library on the component's doc, so a developer can swap it in deliberately (e.g. react-day-picker for dates, cmdk for a command palette, @radix-ui/react-alert-dialog for destructive modals, react-dropzone for uploads).

## One primary action

Each surface (page, card, modal) has at most one primary (`default`) button; everything else is outline/ghost. Destructive, irreversible actions go through `ConfirmDialog` (no outside-click/esc dismiss).
