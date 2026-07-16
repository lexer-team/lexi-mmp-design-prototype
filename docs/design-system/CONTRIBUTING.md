# Maintaining these docs

The component docs are **generated** from `registry.mjs`, so they can't drift from a hand-edited list. Authored files stay stable.

## Generated vs authored

- **Generated** (do not hand-edit): `SKILL.md`'s inventory block (between the markers) and everything in `components/`.
- **Authored** (edit freely): `SKILL.md` prose, `principles.md`, `tokens.md`, `recipes.md`, this file.

Regenerate: `npm run docs:agents`.

## Add or change a component

1. Build the component (shadcn structure, Lexer tokens — see `principles.md`).
2. Add/update its entry in `registry.mjs`. Keep it terse:
   - `id, group, title, status` (`stable` | `prototype` | `deprecated`)
   - `import`, `source` (path for full props)
   - `useWhen` (one line), `props` (one-line summary — don't duplicate the full API)
   - one `do`, one `dont`, one short `snippet`
3. Run `npm run docs:agents`.
4. If it's a new page template or modal type, add it to `recipes.md` (authored).
5. If it introduces a token, update `index.css` and `tokens.md` (authored).

## Keep it agent-friendly

- Terse entries. Point to `source` rather than pasting full prop tables — agents open the file when they need detail.
- One file per group so an agent loads only the area it's working in.
- New groups: add to `GROUPS` in `registry.mjs`; the generator creates `components/<group>.md` and an inventory section automatically.

## Sharing as a skill

`docs/design-system/` is structured as a skill (`SKILL.md` entry + reference files). To share: zip the folder as `design-system.skill` and install via Settings → Capabilities. Regenerate first so the bundle is current.
