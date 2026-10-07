import { createContext, useContext, useReducer, type Dispatch, type ReactNode } from "react";
import type { Artifact, ArtifactBody, Pin, RecommendationStep } from "./types";
import type { DefRef } from "@/data/def-registry";
import { DEMO_ARTIFACTS } from "./demo-data";
import { ACTIVATIONS, type Activation, type ActivationHistoryPoint } from "./activations-mock";

// ─── State ──────────────────────────────────────────────────────────────────

export interface SessionState {
  artifacts: Map<string, Artifact>;
  pins: Pin[];
  /** per-conversation snapshots so reopening from Recents restores context */
  conversationSnapshots: Record<string, {
    artifacts: Map<string, Artifact>;
    pins: Pin[];
    definitionIds: string[];
    chatStarted: boolean;
  }>;
  /** ids of definitions surfaced so far in the conversation (drives the Definitions panel) */
  definitionIds: string[];
  planBuilderOpen: string | null;
  /** id of the segment whose detail page is open, or null for the chat view */
  openSegmentId: string | null;
  /** definition ids shown in the sources side panel, or null when closed */
  openSourcesIds: string[] | null;
  /** id of the segment artifact currently being edited inline, or null */
  editingSegmentId: string | null;
  /** id of the conversation the chat panel is playing, or null for the empty start */
  activeConversationId: string | null;
  /** persisted chat playback per conversation so Recents can restore history */
  conversationPlayback: Record<string, {
    messages: unknown[];
    messageReactions: Record<string, Record<string, boolean>>;
    turnIndex: number;
    activationBuildState?: {
      stage: "idle" | "await-segment" | "await-confirmation" | "await-cancel-confirmation" | "await-activation-choice";
      segmentId?: string;
      segmentName?: string;
    };
  }>;
  /** the list of activation records created during the session */
  activations: Activation[];
  /** true once the first prompt of a conversation has been sent — drives the
   *  artifact/context panel sliding in (hidden on the empty new-chat screen) */
  chatStarted: boolean;
  /** bumped on every select/new-chat so the player resets from the top */
  replayNonce: number;
  /** when true, the player begins turn 0 immediately on reset (vs. waiting for input) */
  autoStart: boolean;
}

// Fresh copies so each replay starts clean. Pins + definitions start empty and
// accumulate as the conversation flows.
const freshArtifacts = () => new Map(Object.entries(DEMO_ARTIFACTS).map(([k, v]) => [k, { ...v }]));
const freshPins = (): Pin[] => [];
const cloneArtifacts = (artifacts: Map<string, Artifact>) => new Map(
  [...artifacts.entries()].map(([id, artifact]) => [id, { ...artifact }]),
);

// ─── Actions ────────────────────────────────────────────────────────────────

export type SessionAction =
  | { type: "SAVE_ARTIFACT"; id: string }
  | { type: "DISMISS_ARTIFACT"; id: string }
  | { type: "RESTORE_ARTIFACT"; id: string }
  | { type: "ADD_ARTIFACT"; artifact: Artifact }
  | { type: "ADD_ACTIVATION"; activation: Activation }
  | { type: "UPDATE_ACTIVATION"; id: string; updates: Partial<Activation> }
  | { type: "UPDATE_ACTIVATION_STATUS"; id: string; status: Activation["status"] }
  | { type: "UPDATE_ACTIVATION_HISTORY"; id: string; history: ActivationHistoryPoint[] }
  | { type: "UPDATE_ACTIVATION_CATEGORY"; id: string; category: string }
  | { type: "BULK_UPDATE_ACTIVATION_CATEGORY"; ids: string[]; category: string }
  | { type: "DELETE_ACTIVATIONS"; ids: string[] }
  | { type: "ADD_INSIGHT"; artifact: Artifact }
  | { type: "ADD_PIN"; pin: Pin }
  | { type: "REMOVE_PIN"; id: string }
  | { type: "OPEN_PLAN_BUILDER"; id: string }
  | { type: "CLOSE_PLAN_BUILDER" }
  | { type: "EDIT_RECOMMENDATION_STEP"; artifactId: string; step: RecommendationStep }
  | { type: "ADD_RECOMMENDATION_STEP"; artifactId: string; step: RecommendationStep }
  | { type: "REMOVE_RECOMMENDATION_STEP"; artifactId: string; stepId: string }
  | { type: "REORDER_RECOMMENDATION_STEPS"; artifactId: string; stepIds: string[] }
  | { type: "CONFIRM_RECOMMENDATION"; id: string }
  | { type: "OPEN_SEGMENT"; id: string }
  | { type: "CLOSE_SEGMENT" }
  | { type: "OPEN_SOURCES"; ids: string[] }
  | { type: "CLOSE_SOURCES" }
  | { type: "START_EDIT_SEGMENT"; id: string }
  | { type: "STOP_EDIT_SEGMENT" }
  | {
      type: "UPSERT_CONVERSATION_PLAYBACK";
      id: string;
      playback: {
        messages: unknown[];
        messageReactions: Record<string, Record<string, boolean>>;
        turnIndex: number;
        activationBuildState?: {
          stage: "idle" | "await-segment" | "await-confirmation" | "await-cancel-confirmation" | "await-activation-choice";
          segmentId?: string;
          segmentName?: string;
        };
      };
    }
  | { type: "SELECT_CONVERSATION"; id: string; autoStart?: boolean }
  | { type: "NEW_CHAT" }
  | { type: "MARK_CHAT_STARTED" }
  // Refine an existing segment in place (narrow it), snapshotting the first-cut size.
  | { type: "REFINE_SEGMENT"; id: string; body: ArtifactBody; def?: DefRef; firstCutPopulation: string }
  // Surface definitions into the Definitions panel as the conversation references them.
  | { type: "SURFACE_DEFINITIONS"; ids: string[] };

function sessionReducer(state: SessionState, action: SessionAction): SessionState {
  switch (action.type) {
    case "SAVE_ARTIFACT": {
      const artifact = state.artifacts.get(action.id);
      if (!artifact) return state;
      const next = new Map(state.artifacts);
      next.set(action.id, {
        ...artifact,
        status: "saved",
        // Keep the first save timestamp as the artifact's created date in this session.
        savedAt: artifact.savedAt ?? new Date().toISOString(),
      });
      return {
        ...state,
        artifacts: next,
        editingSegmentId: state.editingSegmentId === action.id ? null : state.editingSegmentId,
      };
    }
    case "ADD_ARTIFACT": {
      const next = new Map(state.artifacts);
      next.set(action.artifact.id, action.artifact);
      return { ...state, artifacts: next };
    }
    case "ADD_ACTIVATION": {
      return { ...state, activations: [action.activation, ...state.activations] };
    }
    case "UPDATE_ACTIVATION": {
      return {
        ...state,
        activations: state.activations.map((activation) => (
          activation.id === action.id
            ? { ...activation, ...action.updates }
            : activation
        )),
      };
    }
    case "UPDATE_ACTIVATION_STATUS": {
      return {
        ...state,
        activations: state.activations.map((activation) => (
          activation.id === action.id
            ? { ...activation, status: action.status }
            : activation
        )),
      };
    }
    case "UPDATE_ACTIVATION_HISTORY": {
      return {
        ...state,
        activations: state.activations.map((activation) => (
          activation.id === action.id
            ? { ...activation, history: action.history }
            : activation
        )),
      };
    }
    case "UPDATE_ACTIVATION_CATEGORY": {
      return {
        ...state,
        activations: state.activations.map((activation) => (
          activation.id === action.id
            ? { ...activation, category: action.category }
            : activation
        )),
      };
    }
    case "BULK_UPDATE_ACTIVATION_CATEGORY": {
      const ids = new Set(action.ids);
      return {
        ...state,
        activations: state.activations.map((activation) => (
          ids.has(activation.id)
            ? { ...activation, category: action.category }
            : activation
        )),
      };
    }
    case "DELETE_ACTIVATIONS": {
      const ids = new Set(action.ids);
      return {
        ...state,
        activations: state.activations.filter((activation) => !ids.has(activation.id)),
      };
    }
    case "DISMISS_ARTIFACT": {
      const artifact = state.artifacts.get(action.id);
      if (!artifact) return state;
      const next = new Map(state.artifacts);
      next.set(action.id, { ...artifact, status: "dismissed" });
      return {
        ...state,
        artifacts: next,
        editingSegmentId: state.editingSegmentId === action.id ? null : state.editingSegmentId,
      };
    }
    case "RESTORE_ARTIFACT": {
      const artifact = state.artifacts.get(action.id);
      if (!artifact) return state;
      const next = new Map(state.artifacts);
      next.set(action.id, { ...artifact, status: "proposed" });
      return { ...state, artifacts: next };
    }
    case "ADD_INSIGHT": {
      const next = new Map(state.artifacts);
      next.set(action.artifact.id, action.artifact);
      return { ...state, artifacts: next };
    }
    case "ADD_PIN": {
      const exists = state.pins.some((pin) => pin.id === action.pin.id);
      if (exists) return state;
      return { ...state, pins: [...state.pins, action.pin] };
    }
    case "REMOVE_PIN": {
      return { ...state, pins: state.pins.filter((p) => p.id !== action.id) };
    }
    case "OPEN_PLAN_BUILDER": {
      return { ...state, planBuilderOpen: action.id };
    }
    case "CLOSE_PLAN_BUILDER": {
      return { ...state, planBuilderOpen: null };
    }
    case "EDIT_RECOMMENDATION_STEP": {
      const artifact = state.artifacts.get(action.artifactId);
      if (!artifact || artifact.body?.kind !== "recommendation") return state;
      const next = new Map(state.artifacts);
      const steps = artifact.body.steps.map((s) =>
        s.id === action.step.id ? action.step : s
      );
      next.set(action.artifactId, {
        ...artifact,
        body: { ...artifact.body, steps },
      });
      return { ...state, artifacts: next };
    }
    case "ADD_RECOMMENDATION_STEP": {
      const artifact = state.artifacts.get(action.artifactId);
      if (!artifact || artifact.body?.kind !== "recommendation") return state;
      const next = new Map(state.artifacts);
      next.set(action.artifactId, {
        ...artifact,
        body: { ...artifact.body, steps: [...artifact.body.steps, action.step] },
      });
      return { ...state, artifacts: next };
    }
    case "REMOVE_RECOMMENDATION_STEP": {
      const artifact = state.artifacts.get(action.artifactId);
      if (!artifact || artifact.body?.kind !== "recommendation") return state;
      const next = new Map(state.artifacts);
      next.set(action.artifactId, {
        ...artifact,
        body: { ...artifact.body, steps: artifact.body.steps.filter((s) => s.id !== action.stepId) },
      });
      return { ...state, artifacts: next };
    }
    case "REORDER_RECOMMENDATION_STEPS": {
      const artifact = state.artifacts.get(action.artifactId);
      if (!artifact || artifact.body?.kind !== "recommendation") return state;
      const next = new Map(state.artifacts);
      const ordered = action.stepIds
        .map((id) => artifact.body!.kind === "recommendation" ? artifact.body!.steps.find((s) => s.id === id) : undefined)
        .filter(Boolean) as import("./types").RecommendationStep[];
      next.set(action.artifactId, {
        ...artifact,
        body: { ...artifact.body, steps: ordered },
      });
      return { ...state, artifacts: next };
    }
    case "CONFIRM_RECOMMENDATION": {
      const artifact = state.artifacts.get(action.id);
      if (!artifact) return state;
      const next = new Map(state.artifacts);
      next.set(action.id, { ...artifact, status: "saved", planStatus: "confirmed" });
      return { ...state, artifacts: next, planBuilderOpen: null };
    }
    case "OPEN_SEGMENT": {
      // Segment + sources share one side-panel slot — opening one closes the other.
      return { ...state, openSegmentId: action.id, openSourcesIds: null };
    }
    case "CLOSE_SEGMENT": {
      return { ...state, openSegmentId: null };
    }
    case "OPEN_SOURCES": {
      return { ...state, openSourcesIds: action.ids, openSegmentId: null };
    }
    case "CLOSE_SOURCES": {
      return { ...state, openSourcesIds: null };
    }
    case "START_EDIT_SEGMENT": {
      return { ...state, editingSegmentId: action.id };
    }
    case "STOP_EDIT_SEGMENT": {
      return { ...state, editingSegmentId: null };
    }
    case "UPSERT_CONVERSATION_PLAYBACK": {
      return {
        ...state,
        conversationPlayback: {
          ...state.conversationPlayback,
          [action.id]: action.playback,
        },
      };
    }
    case "SELECT_CONVERSATION": {
      const snapshots = state.activeConversationId
        ? {
            ...state.conversationSnapshots,
            [state.activeConversationId]: {
              artifacts: cloneArtifacts(state.artifacts),
              pins: [...state.pins],
              definitionIds: [...state.definitionIds],
              chatStarted: state.chatStarted,
            },
          }
        : state.conversationSnapshots;

      const cached = snapshots[action.id];

      // Reopening from Recents restores previous context; unseen conversations start fresh.
      return {
        ...state,
        conversationSnapshots: snapshots,
        activeConversationId: action.id,
        autoStart: action.autoStart ?? false,
        chatStarted: cached?.chatStarted ?? false,
        replayNonce: state.replayNonce + 1,
        artifacts: cached ? cloneArtifacts(cached.artifacts) : freshArtifacts(),
        pins: cached ? [...cached.pins] : freshPins(),
        definitionIds: cached ? [...cached.definitionIds] : [],
        openSegmentId: null,
        openSourcesIds: null,
        editingSegmentId: null,
      };
    }
    case "REFINE_SEGMENT": {
      const artifact = state.artifacts.get(action.id);
      if (!artifact) return state;
      const next = new Map(state.artifacts);
      next.set(action.id, {
        ...artifact,
        body: action.body,
        def: action.def ?? artifact.def,
        refinedFrom: { population: action.firstCutPopulation },
      });
      return { ...state, artifacts: next };
    }
    case "SURFACE_DEFINITIONS": {
      const seen = new Set(state.definitionIds);
      const added = action.ids.filter((id) => !seen.has(id));
      if (added.length === 0) return state;
      return { ...state, definitionIds: [...state.definitionIds, ...added] };
    }
    case "MARK_CHAT_STARTED": {
      if (state.chatStarted) return state;
      return { ...state, chatStarted: true };
    }
    case "NEW_CHAT": {
      const snapshots = state.activeConversationId
        ? {
            ...state.conversationSnapshots,
            [state.activeConversationId]: {
              artifacts: cloneArtifacts(state.artifacts),
              pins: [...state.pins],
              definitionIds: [...state.definitionIds],
              chatStarted: state.chatStarted,
            },
          }
        : state.conversationSnapshots;

      return {
        ...state,
        conversationSnapshots: snapshots,
        activeConversationId: null,
        autoStart: false,
        chatStarted: false,
        replayNonce: state.replayNonce + 1,
        artifacts: freshArtifacts(),
        pins: freshPins(),
        definitionIds: [],
        openSegmentId: null,
        openSourcesIds: null,
        editingSegmentId: null,
      };
    }
    default:
      return state;
  }
}

// ─── Context ────────────────────────────────────────────────────────────────

const SessionContext = createContext<{
  state: SessionState;
  dispatch: Dispatch<SessionAction>;
} | null>(null);

export function useSession() {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error("useSession must be used within SessionProvider");
  return ctx;
}

// ─── Provider ───────────────────────────────────────────────────────────────

const INITIAL_STATE: SessionState = {
  artifacts: freshArtifacts(),
  pins: freshPins(),
  conversationSnapshots: {},
  conversationPlayback: {},
  definitionIds: [],
  planBuilderOpen: null,
  openSegmentId: null,
  openSourcesIds: null,
  editingSegmentId: null,
  activeConversationId: null,
  activations: ACTIVATIONS,
  chatStarted: false,
  replayNonce: 0,
  autoStart: false,
};

export function SessionProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(sessionReducer, INITIAL_STATE);
  return (
    <SessionContext value={{ state, dispatch }}>
      {children}
    </SessionContext>
  );
}
