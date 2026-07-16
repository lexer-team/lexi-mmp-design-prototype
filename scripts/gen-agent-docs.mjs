#!/usr/bin/env node
/**
 * Regenerates the agent-facing component docs from docs/design-system/registry.mjs:
 *   - fills the inventory block in SKILL.md (between the BEGIN/END markers)
 *   - writes one components/<group>.md per group
 *
 * Authored files (principles.md, tokens.md, recipes.md, CONTRIBUTING.md) are NOT
 * touched. Run: `npm run docs:agents`.
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { GROUPS, COMPONENTS } from "../docs/design-system/registry.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DS = resolve(__dirname, "../docs/design-system");
const BEGIN = "<!-- BEGIN inventory (generated — run npm run docs:agents) -->";
const END = "<!-- END inventory -->";

const byGroup = (gid) => COMPONENTS.filter((c) => c.group === gid);

// 1. Inventory block for SKILL.md
function buildInventory() {
  const lines = [BEGIN];
  for (const g of GROUPS) {
    const items = byGroup(g.id);
    if (!items.length) continue;
    lines.push(`\n**${g.title}** — see \`components/${g.id}.md\``, "", "| Component | Use when |", "| --- | --- |");
    for (const c of items) {
      const flag = c.status === "stable" ? "" : ` _(${c.status})_`;
      lines.push(`| ${c.title}${flag} | ${c.useWhen} |`);
    }
  }
  lines.push(END);
  return lines.join("\n");
}

function updateSkill() {
  const path = resolve(DS, "SKILL.md");
  const src = readFileSync(path, "utf8");
  const b = src.indexOf(BEGIN);
  const e = src.indexOf(END);
  if (b === -1 || e === -1) throw new Error("SKILL.md is missing the inventory markers.");
  const next = src.slice(0, b) + buildInventory() + src.slice(e + END.length);
  writeFileSync(path, next);
  console.log("✓ SKILL.md inventory updated");
}

// 2. One file per group
function writeGroupFiles() {
  mkdirSync(resolve(DS, "components"), { recursive: true });
  for (const g of GROUPS) {
    const items = byGroup(g.id);
    if (!items.length) continue;
    const out = [
      `<!-- GENERATED from docs/design-system/registry.mjs — do not edit by hand. Run: npm run docs:agents -->`,
      `# ${g.title}`,
      "",
      g.blurb,
      "",
      "> Conventions in `../principles.md`; tokens in `../tokens.md`; page templates & modal rules in `../recipes.md`.",
    ];
    for (const c of items) {
      const flag = c.status === "stable" ? "" : `  \`${c.status}\``;
      out.push(
        "",
        "---",
        "",
        `## ${c.title}${flag}`,
        "",
        `**Use when:** ${c.useWhen}`,
        "",
        "```tsx",
        c.import,
        "```",
        "",
        `**Props:** ${c.props}`,
        "",
        "```tsx",
        c.snippet,
        "```",
        "",
        `- ✅ ${c.do}`,
        `- ❌ ${c.dont}`,
        "",
        `Source: \`${c.source}\``,
      );
    }
    writeFileSync(resolve(DS, "components", `${g.id}.md`), out.join("\n") + "\n");
    console.log(`✓ components/${g.id}.md (${items.length})`);
  }
}

updateSkill();
writeGroupFiles();
console.log(`\nDone — ${COMPONENTS.length} components across ${GROUPS.length} groups.`);
