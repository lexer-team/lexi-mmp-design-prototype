// Spaces — grouped workspaces. Each gathers the artifacts produced while working
// a brief (segments, workflows, activations, insights). Mock data for the
// prototype; the list page does local CRUD over this.

export interface SpaceCounts {
  segments: number;
  workflows: number;
  activations: number;
  insights: number;
}

export interface Space {
  id: string;
  name: string;
  description: string;
  updatedLabel: string;
  counts: SpaceCounts;
}

// Counts stay within the mock artifact list sizes (see SpacePage) so the detail
// tabs and the overview counts line up.
export const INITIAL_SPACES: Space[] = [
  {
    id: "sp-black-friday",
    name: "Black Friday planning",
    description: "Black Friday audience planning, activation sequencing, and performance tracking.",
    updatedLabel: "Just now",
    counts: { segments: 3, workflows: 2, activations: 3, insights: 3 },
  },
  {
    id: "sp-retail",
    name: "Retail season launch",
    description: "Holiday win-back, VIP retention and launch activations for the AU retail season.",
    updatedLabel: "2 weeks ago",
    counts: { segments: 3, workflows: 2, activations: 3, insights: 3 },
  },
  {
    id: "sp-winback",
    name: "Win-back program",
    description: "Always-on re-engagement of lapsed but valuable customers.",
    updatedLabel: "1 month ago",
    counts: { segments: 2, workflows: 1, activations: 2, insights: 3 },
  },
  {
    id: "sp-onboarding",
    name: "New customer onboarding",
    description: "Welcome journeys and first-90-day nurture for first-time buyers.",
    updatedLabel: "3 days ago",
    counts: { segments: 3, workflows: 2, activations: 3, insights: 2 },
  },
  {
    id: "sp-vip",
    name: "VIP retention",
    description: "Loyalty and high-LTV retention plays for the top tier.",
    updatedLabel: "5 days ago",
    counts: { segments: 2, workflows: 1, activations: 1, insights: 1 },
  },
];

export const totalArtifacts = (c: SpaceCounts) =>
  c.segments + c.workflows + c.activations + c.insights;
