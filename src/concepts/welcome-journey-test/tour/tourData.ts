export type ExploreFeature = "new-chat" | "segments" | "activations";

export type TourStop = {
  id: string;
  title: string;
  description: string;
  anchor: string;
  explore?: ExploreFeature;
};

export const TOUR_START_EVENT = "welcome-journey-test:take-tour";
export const TOUR_PROGRESS_EVENT = "welcome-journey-test:progress";
export const TOUR_SIDEBAR_EVENT = "welcome-journey-test:tour-sidebar";
export const TOUR_STORAGE_KEY = "welcome-journey-test:tour-status";

export const TOUR_STOPS: TourStop[] = [
  {
    id: "new-chat",
    title: "Ask Lexi",
    description: "Ask questions about your customers in plain language. Follow up to make an answer more specific.",
    anchor: "New Chat",
    explore: "new-chat",
  },
  {
    id: "insights",
    title: "Insights",
    description: "Insights are saved findings from your chats. Each includes the goal, first question, answer, and sometimes an action.",
    anchor: "Insights",
  },
  {
    id: "segments",
    title: "Segments",
    description: "Build and save customer groups. Verify the assumptions before you save a segment.",
    anchor: "Segments",
    explore: "segments",
  },
  {
    id: "activations",
    title: "Activations",
    description: "Choose a segment and destination. Configure fields and timing before sending.",
    anchor: "Activations",
    explore: "activations",
  },
  {
    id: "dashboards",
    title: "Dashboards",
    description: "Track your business with key metrics. Open a dashboard to compare performance.",
    anchor: "Dashboards",
  },
  {
    id: "knowledge",
    title: "Knowledge",
    description: "Review what Lexi knows about your business. Define it with skills, rules, and definitions.",
    anchor: "Knowledge",
  },
  {
    id: "measure",
    title: "Measure",
    description: "Compare results against benchmarks and scorecards. See how customer programs perform over time.",
    anchor: "Measure",
  },
  {
    id: "space",
    title: "Space",
    description: "Shared or personal spaces built around a goal collect insights, segments, and documents. The Lexi Lab toggle turns them into a working board.",
    anchor: "Space",
  },
  {
    id: "chats",
    title: "Your chats",
    description: "Your pinned and recent chats are collected here. Reopen a conversation to continue where you left off.",
    anchor: "Your chats",
  },
  {
    id: "canvas",
    title: "Canvas",
    description: "Canvas is your personal welcome dashboard. It shows your own metrics.",
    anchor: "Canvas",
  },
];

export const TRAINING_STEPS: Record<ExploreFeature, string[]> = {
  "new-chat": ["Ask a question", "Make it more specific", "Check the answer"],
  segments: [
    "Ask Lexi about a customer group",
    "Build a segment from the cohort results",
    "Confirm the assumptions",
    "Save the segment",
    "Explore the segment panel",
    "Open the full Segments page",
  ],
  activations: ["Pick a segment", "Set up rules, destination, and field mapping", "Choose when it goes"],
};

export type ActivationSetupProgress = {
  rules: boolean;
  fieldMapping: boolean;
  destination: boolean;
};

export type TrainingState = {
  feature: ExploreFeature;
  pausedStop: number;
  steps: boolean[];
  chatSubmissions: number;
  activationSetup: ActivationSetupProgress;
  activationCancelled: boolean;
};