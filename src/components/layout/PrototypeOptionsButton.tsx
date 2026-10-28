import { RiArrowLeftLine } from "@remixicon/react";
import { Button } from "@/components/ui/Button";

export const BACK_TO_PROTOTYPE_OPTIONS_EVENT = "prototype-playground:back-to-options";

export function PrototypeOptionsButton() {
  return (
    <Button
      type="button"
      size="sm"
      variant="outline"
      className="h-8 shrink-0"
      aria-label="Back to prototype options"
      onClick={() => window.dispatchEvent(new Event(BACK_TO_PROTOTYPE_OPTIONS_EVENT))}
    >
      <RiArrowLeftLine className="size-4" />
      Prototype options
    </Button>
  );
}