/// <reference types="vite/client" />
import type { ComponentType } from "react";

export interface ConceptStaticMeta {
  title?: string;
  description?: string;
  parentId?: string;
}

export interface ConceptEntry {
  slug: string;
  staticMeta: ConceptStaticMeta;
  load: () => Promise<{ default: ComponentType }>;
}

const metaModules = import.meta.glob<{ default: ConceptStaticMeta }>(
  "./*/meta.ts",
  { eager: true }
);

const pageModules = import.meta.glob<{ default: ComponentType }>(
  "./*/index.tsx"
);

const EXCLUDED_CONCEPT_SLUGS = new Set<string>(["prototype-mvp"]);

export const CONCEPT_ENTRIES: ConceptEntry[] = Object.entries(metaModules)
  .map(([path, mod]) => {
    const slug = path.split("/")[1];
    return {
      slug,
      staticMeta: mod.default,
      load: pageModules[`./${slug}/index.tsx`],
    };
  })
  .filter((entry) => !EXCLUDED_CONCEPT_SLUGS.has(entry.slug));
