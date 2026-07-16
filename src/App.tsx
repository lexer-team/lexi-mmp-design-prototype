import { useState, type ComponentType } from "react";
import { CONCEPT_ENTRIES } from "@/concepts/manifest";
import { ConceptsListing } from "@/pages/ConceptsListing";
import { DesignSystem } from "@/pages/DesignSystem";
import { CommandMenu } from "@/components/ui/CommandMenu";

type View = { kind: "list" } | { kind: "concept"; slug: string } | { kind: "ds" };

export default function App() {
  const [view, setView] = useState<View>({ kind: "list" });
  const [Concept, setConcept] = useState<ComponentType | null>(null);

  function openConcept(slug: string) {
    const entry = CONCEPT_ENTRIES.find((e) => e.slug === slug);
    if (!entry) return;
    setConcept(null);
    setView({ kind: "concept", slug });
    entry.load().then((m) => setConcept(() => m.default));
  }

  return (
    <>
      {view.kind === "list" && (
        <ConceptsListing onOpenConcept={openConcept} onOpenDesignSystem={() => setView({ kind: "ds" })} />
      )}
      {view.kind === "ds" && <DesignSystem />}
      {view.kind === "concept" &&
        (Concept ? <Concept /> : <div className="p-8 text-sm text-muted-foreground">Loading…</div>)}
      <CommandMenu onBack={() => setView({ kind: "list" })} showDesignSystem onDesignSystem={() => setView({ kind: "ds" })} />
    </>
  );
}
