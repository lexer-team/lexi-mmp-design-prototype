import { getDef, registerDefs, type DefRef } from "@/data/def-registry";
import { customDefs, sourceFields } from "./definitions-data";
import type { MentionGroup } from "../lexi-shared-brain/MentionComposer";
import { DUMMY_SEGMENTS, dummySegmentToDefRef } from "./segment-dummy-data";

const ENTITY_ORDER = ["customer", "product", "order"] as const;

type GroupKind = "source" | "calculated" | "custom";

function fallbackRef(id: string, name: string, description: string, kind: GroupKind): DefRef {
  return {
    id,
    name,
    description,
    kind: kind === "source" ? "attribute" : kind === "calculated" ? "metric" : "term",
  };
}

function refsForRows(rows: Array<{ id: string; name: string; description: string }>, kind: GroupKind): DefRef[] {
  return rows.map((row) => getDef(row.id) ?? fallbackRef(row.id, row.name, row.description, kind));
}

export function buildConditionMenuGroups(savedSegmentRefs: DefRef[] = []): MentionGroup[] {
  const dummySegmentRefs = DUMMY_SEGMENTS.map(dummySegmentToDefRef);
  const segmentRefs = [
    ...savedSegmentRefs,
    ...dummySegmentRefs.filter((segment) => !savedSegmentRefs.some((saved) => saved.id === segment.id)),
  ];
  registerDefs(segmentRefs);
  const sourceRows = ENTITY_ORDER.flatMap((entity) => sourceFields(entity));
  const customRows = ENTITY_ORDER.flatMap((entity) => customDefs(entity));

  const calculatedRows = customRows.filter((row) => row.id.startsWith("met-"));
  const customDefinitionRows = customRows.filter((row) => !row.id.startsWith("met-"));

  return [
    {
      label: "Segments",
      items: segmentRefs,
    },
    {
      label: "Source Definitions",
      items: refsForRows(sourceRows, "source"),
    },
    {
      label: "Calculated Definitions",
      items: refsForRows(calculatedRows, "calculated"),
    },
    {
      label: "Custom Definitions",
      items: refsForRows(customDefinitionRows, "custom"),
    },
  ];
}
