import { DropdownMenuItem } from "@/components/ui/DropdownMenu";
import { TOUR_START_EVENT } from "./tourData";

export function TakeTourMenuItem() {
  return (
    <DropdownMenuItem onSelect={() => window.dispatchEvent(new Event(TOUR_START_EVENT))}>
      Take the tour
    </DropdownMenuItem>
  );
}