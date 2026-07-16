# Using the Lexer Design System skill

A short guide for anyone who wants an AI agent to build UI that matches Lexer.

## What it is

A skill that teaches an agent the Lexer design system — its tokens, components, conventions, and page/modal recipes — so generated UI is consistent with the rest of the product. The agent reads a small entry file first, then pulls in only the detail it needs.

## Install

- **Cowork / Claude.ai:** Settings → Capabilities → add the skill, or open `lexer-design-system.skill` and choose **Save skill**.
- **Claude Code:** drop the `design-system/` folder (the one containing `SKILL.md`) into your project's skills directory, or keep it in the repo — the root `CLAUDE.md` already points agents to it.

You don't need the whole repo — the `.skill` bundle is self-contained.

## When it kicks in

The skill activates on its own whenever you ask an agent to build or change Lexer UI — screens, components, layouts, forms, dashboards. You can also name it explicitly: "use the Lexer design system."

## How to get good results

- **Describe the screen, not the CSS.** Say "a segments list page with search and a New button," not "a flex row with gap-2." The skill knows the tokens and components.
- **Name the surface type** when you can — list page, detail page, split view, settings, dashboard. These map to recipes the skill already knows.
- **Let it pick components.** Ask for "a status pill" or "a confirmation modal" and it will reach for `Badge` / `ConfirmDialog` rather than inventing one.
- **Point at examples** if you have them: "like the Data panel" or "match the segments screen."

Example prompt:
> Build a settings page for notification preferences using the Lexer design system — a section nav rail, grouped toggles, and a sticky save footer.

## What to expect

The agent will use Lexer's tokens and existing components, follow the conventions (sentence-case labels, the 3-tier text colour, the inset-panel look, one primary action per surface), and reach for new dependencies only with your sign-off. If something isn't in the system yet, it builds it in the same shadcn-structured style.

## Keeping it current

The component list is generated from the codebase. After adding or changing components, run `npm run docs:agents` and re-zip `docs/design-system/` as `lexer-design-system.skill` so the shared bundle stays accurate. Details in `CONTRIBUTING.md`.
