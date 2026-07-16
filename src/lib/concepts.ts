import { useState, useEffect, useCallback } from "react";
import { CONCEPT_ENTRIES } from "@/concepts/manifest";

export type ConceptStatus = "in-progress" | "in-review" | "accepted" | "rejected";

export interface ConceptMeta {
  id: string;
  title: string;
  description: string;
  status: ConceptStatus;
  archived: boolean;
  createdAt: string;
  updatedAt: string;
  parentId?: string;
}

interface StoredConceptState {
  status: ConceptStatus;
  archived?: boolean;
  createdAt: string;
  updatedAt: string;
}

const STORAGE_KEY = "playground-concepts";

// Prototypes that start archived (until the user unarchives them).
const DEFAULT_ARCHIVED = new Set<string>(["definitions-library-v1"]);

function loadStore(): Record<string, StoredConceptState> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

function saveStore(store: Record<string, StoredConceptState>): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
}

function buildConcepts(): Record<string, ConceptMeta> {
  const stored = loadStore();
  const now = new Date().toISOString();
  const concepts: Record<string, ConceptMeta> = {};

  for (const entry of CONCEPT_ENTRIES) {
    const state = stored[entry.slug];
    concepts[entry.slug] = {
      id: entry.slug,
      title: entry.staticMeta.title ?? entry.slug,
      description: entry.staticMeta.description ?? "",
      status: state?.status ?? "in-progress",
      archived: state?.archived ?? DEFAULT_ARCHIVED.has(entry.slug),
      createdAt: state?.createdAt ?? now,
      updatedAt: state?.updatedAt ?? now,
      parentId: entry.staticMeta.parentId,
    };
  }

  return concepts;
}

export function useConceptStore() {
  const [concepts, setConcepts] = useState<Record<string, ConceptMeta>>(buildConcepts);

  useEffect(() => {
    const store = loadStore();
    const now = new Date().toISOString();
    let dirty = false;

    for (const entry of CONCEPT_ENTRIES) {
      if (!store[entry.slug]) {
        store[entry.slug] = {
          status: "in-progress",
          archived: DEFAULT_ARCHIVED.has(entry.slug),
          createdAt: now,
          updatedAt: now,
        };
        dirty = true;
      } else if (store[entry.slug].archived === undefined) {
        // Backfill archived for stores created before the field existed.
        store[entry.slug].archived = DEFAULT_ARCHIVED.has(entry.slug);
        dirty = true;
      }
    }

    for (const id of Object.keys(store)) {
      if (!CONCEPT_ENTRIES.find((e) => e.slug === id)) {
        delete store[id];
        dirty = true;
      }
    }

    if (dirty) saveStore(store);
  }, []);

  const update = useCallback((id: string, fields: Partial<Omit<ConceptMeta, "id" | "createdAt">>) => {
    setConcepts((prev) => {
      const existing = prev[id];
      if (!existing) return prev;
      const updatedAt = new Date().toISOString();
      const next = {
        ...prev,
        [id]: { ...existing, ...fields, updatedAt },
      };

      const store = loadStore();
      store[id] = {
        ...store[id],
        status: next[id].status,
        archived: next[id].archived,
        updatedAt,
      };
      saveStore(store);

      return next;
    });
  }, []);

  const setArchived = useCallback(
    (id: string, archived: boolean) => update(id, { archived }),
    [update],
  );

  return { concepts, update, setArchived };
}
