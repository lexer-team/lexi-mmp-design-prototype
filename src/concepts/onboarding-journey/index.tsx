import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { LexerLogo } from "@/components/layout/LexerLogo";
import { LexiIcon } from "@/components/chat/LexiIcon";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/Tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/Table";
import { ConfirmDialog } from "@/components/ui/Dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuTrigger,
} from "@/components/ui/DropdownMenu";
import * as DropdownMenuPrimitive from "@radix-ui/react-dropdown-menu";
import { TooltipProvider } from "@/components/ui/Tooltip";
import {
  RiSidebarFoldLine,
  RiMessage2Line,
  RiAddLine,
  RiBrainLine,
  RiDatabase2Line,
  RiArrowRightSLine,
  RiArrowUpDownLine,
  RiLayoutRightLine,
  RiCloseLine,
  RiCheckLine,
  RiGroupLine,
  RiBookOpenLine,
  RiPlanetLine,
  RiBroadcastLine,
  RiDashboardLine,
  RiPlugLine,
  RiSearchLine,
  RiArrowLeftCircleLine,
  RiArrowRightCircleLine,
  RiArrowLeftRightLine,
  RiArrowDownSLine,
  RiSendPlane2Line,
  RiListUnordered,
  RiPlayCircleLine,
  RiProhibitedLine,
  RiExpandDiagonalLine,
  RiPushpinLine,
  RiFullscreenLine,
  RiFullscreenExitLine,
  RiSettings3Line,
} from "@remixicon/react";
import { getDef } from "@/data/def-registry";
import { KIND_META } from "@/components/definitions/kind-meta";
import { ChatPanel } from "./ChatPanel";
import { buildMentionGroups } from "./ChatPanel";
import { ContextPanel } from "./ContextPanel";
import { SegmentsPage, DefinitionsPage, MetricsPage, BenchmarksPage, ScorecardPage, DashboardsPage, InsightsPage } from "./pages";
import { PlaybookPage } from "./PlaybookPage";
import { SpacePage } from "./SpacePage";
import { SpacesPage } from "./SpacesPage";
import { ActivationsPage, ActivationDetail } from "./ActivationsPage";
import { ACTIVATION_STATUS_META, getActivation, type ActivationStatus } from "./activations-mock";
import { INITIAL_SPACES, type Space } from "./spaces-data";
import { GroupDetail } from "../lexi-shared-brain-v2/GroupDetail";
import { BRAIN_GROUPS } from "../lexi-shared-brain/data";
import { segmentArtifactToGroup, segmentToLogic } from "./segment-logic";
import { SessionProvider, useSession } from "./store";

type Page = "welcome" | "chat" | "space" | "space-detail" | "segments" | "segment-detail" | "definitions" | "metrics" | "benchmarks" | "scorecard" | "dashboards" | "playbook" | "calendar" | "insights" | "sources" | "integrations" | "activations" | "context" | "users";
type OnboardingStep = "welcome" | "users" | "integrations" | "context" | "completed";
type ActivationNavFilter = "all" | ActivationStatus;
type PlaybookSection = "glossary" | "rules" | "calendar" | "documents";
import { registerDefs } from "@/data/def-registry";
import { DEFAULT_CONVERSATION_ID, DEMO_DEFS, DEMO_SEGMENT_DEFS, CONVERSATIONS } from "./demo-data";
import { DUMMY_SEGMENT_BY_ID } from "./segment-dummy-data";

type SavedSpaceItems = {
  segmentIds: string[];
  insightIds: string[];
  activationIds: string[];
  segmentItems: Record<string, { id: string; name: string; meta: string }>;
  activationItems: Record<string, { id: string; name: string; channel: string; status: string }>;
  insightItems: Record<string, { id: string; name: string; meta: string; updated: string }>;
};

type SavedSpaceChat = {
  id: string;
  title: string;
  updated: string;
};

type OnboardingGuidance = {
  disclaimerVisible: boolean;
  onAcknowledge: () => void;
  onNext: () => void;
  nextLabel: string;
  promptTitle: string;
  promptDescription: string;
  actionLabel: string;
  disclaimerText: string;
};

const EMPTY_SAVED_ITEMS: SavedSpaceItems = {
  segmentIds: [],
  insightIds: [],
  activationIds: [],
  segmentItems: {},
  activationItems: {},
  insightItems: {},
};

// ─── Constants ────────────────────────────────────────────────────────────────

const MOCK_USER = { firstName: "Izac", initials: "IH", org: "Lexer" };

registerDefs([...DEMO_DEFS, ...DEMO_SEGMENT_DEFS]);

// ─── Root ─────────────────────────────────────────────────────────────────────

export default function SegmentV1() {
  return (
    <SessionProvider>
      <TooltipProvider delayDuration={150}>
        <SegmentV1Inner />
      </TooltipProvider>
    </SessionProvider>
  );
}

function SegmentV1Inner() {
  // session state is consumed by the panels; the shell owns layout + view nav
  const { state, dispatch } = useSession();
  const [collapsed, setCollapsed] = useState(true);
  const [sidebarHovered, setSidebarHovered] = useState(false);
  const [contextPanelOpen, setContextPanelOpen] = useState(true);
  const [page, setPage] = useState<Page>("welcome");
  const [onboardingStep, setOnboardingStep] = useState<OnboardingStep>("welcome");
  const [usersStepAcknowledged, setUsersStepAcknowledged] = useState(false);
  const [integrationsStepAcknowledged, setIntegrationsStepAcknowledged] = useState(false);
  const [contextStepAcknowledged, setContextStepAcknowledged] = useState(false);
  const [showChatSyncPopup, setShowChatSyncPopup] = useState(false);
  const [showChatSyncDisclaimer, setShowChatSyncDisclaimer] = useState(false);
  const [chatSyncNoticeConsumed, setChatSyncNoticeConsumed] = useState(false);
  const [selectedSegmentId, setSelectedSegmentId] = useState<string | null>(null);
  // Activation detail opens in a right inset panel (like the segment side panel),
  // independent of the chat-driven slot.
  const [openActivationId, setOpenActivationId] = useState<string | null>(null);
  const [activationNavFilter, setActivationNavFilter] = useState<ActivationNavFilter>("all");
  const [openInsightId, setOpenInsightId] = useState<string | null>(null);
  const [playbookSection, setPlaybookSection] = useState<PlaybookSection>("glossary");
  // Spaces — local CRUD over the mock list; persists while the app is open.
  const [spaces, setSpaces] = useState<Space[]>(INITIAL_SPACES);
  const [selectedSpaceId, setSelectedSpaceId] = useState<string | null>("sp-black-friday");
  const [pendingActivationSegmentId, setPendingActivationSegmentId] = useState<string | null>(null);
  const [spaceRailOpen, setSpaceRailOpen] = useState(true);
  const [spaceSavedItems, setSpaceSavedItems] = useState<Record<string, SavedSpaceItems>>({});
  const [spaceSavedChats, setSpaceSavedChats] = useState<Record<string, SavedSpaceChat[]>>({});
  const [pinnedChatIds, setPinnedChatIds] = useState<string[]>([]);
  const [segmentPanelFullScreen, setSegmentPanelFullScreen] = useState(false);
  const selectedSpace = spaces.find((s) => s.id === selectedSpaceId);
  const selectedSpaceSavedItems = selectedSpaceId
    ? (spaceSavedItems[selectedSpaceId] ?? EMPTY_SAVED_ITEMS)
    : EMPTY_SAVED_ITEMS;
  const selectedSpaceSavedChats = selectedSpaceId
    ? (spaceSavedChats[selectedSpaceId] ?? [])
    : [];
  const isChat = page === "chat";
  const onboardingActive = onboardingStep !== "completed";
  const showSidebar = !onboardingActive;
  const usersOnboarding = onboardingStep === "users"
    ? {
      disclaimerVisible: usersStepAcknowledged,
      onAcknowledge: () => setUsersStepAcknowledged(true),
      onNext: () => {
        setOnboardingStep("integrations");
        setPage("integrations");
      },
      nextLabel: "Next: Connect your accounts",
      promptTitle: "Set up accounts",
      promptDescription: "Complete your own account setup first. When you are finished, you may create and invite additional users, or do it later when you are ready.",
      actionLabel: "Create your account",
      disclaimerText: "We recommend setting yourself up first so you can start exploring Lexer right away. You can invite the rest of your team now or skip this and add them anytime from Settings > Users.",
    } satisfies OnboardingGuidance
    : undefined;
  const integrationsOnboarding = onboardingStep === "integrations"
    ? {
      disclaimerVisible: integrationsStepAcknowledged,
      onAcknowledge: () => setIntegrationsStepAcknowledged(true),
      onNext: () => {
        setOnboardingStep("context");
        setPage("context");
      },
      nextLabel: "Next: Set up your context",
      promptTitle: "Connect your required sources",
      promptDescription: "Link your core integrations so Lexi can reason over live customer, campaign, and conversion signals.",
      actionLabel: "Connect required sources",
      disclaimerText: "Connecting your sources is the first step in setting up Lexer. Some integrations sync instantly; others (like POS or loyalty platforms) can take up to 24-48 hours to fully populate. We'll notify you once each source is ready.",
    } satisfies OnboardingGuidance
    : undefined;
  const contextOnboarding = onboardingStep === "context"
    ? {
      disclaimerVisible: contextStepAcknowledged,
      onAcknowledge: () => setContextStepAcknowledged(true),
      onNext: () => {
        setOnboardingStep("completed");
        setPage("chat");
        if (!chatSyncNoticeConsumed) {
          setShowChatSyncPopup(true);
          setShowChatSyncDisclaimer(true);
        }
      },
      nextLabel: "Ask a question!",
      promptTitle: "Describe your business context in plain language",
      promptDescription: "Lexi will translate and apply this when working with you.",
      actionLabel: "Describe my business context",
      disclaimerText: "Lexer has pre-filled some context based on your connected sources (Shopify, Klaviyo). These are starting points, not fixed rules - thresholds, timeframes, and definitions may not perfectly match how your business thinks about these segments yet. Please review each section and confirm, edit, or remove anything that doesn't apply.",
    } satisfies OnboardingGuidance
    : undefined;
  // Retain the last panel so it keeps its content while sliding out.
  const [shownPanel, setShownPanel] = useState<
    | { kind: "segment"; id: string }
    | { kind: "sources"; ids: string[] }
    | null
  >(null);
  const segmentPanelOpen = shownPanel?.kind === "segment" && (page === "segments" || page === "chat");
  const sourcesPanelOpen = isChat && state.openSourcesIds != null;
  // The side panel (segment detail OR sources list) opens beside chat and segments pages.
  const sidePanelOpen = segmentPanelOpen || sourcesPanelOpen;
  const previousPageRef = useRef<Page>(page);
  useEffect(() => {
    if (state.openSegmentId) setShownPanel({ kind: "segment", id: state.openSegmentId });
    else if (state.openSourcesIds) setShownPanel({ kind: "sources", ids: state.openSourcesIds });
  }, [state.openSegmentId, state.openSourcesIds]);

  useEffect(() => {
    if (!state.openSegmentId) setSegmentPanelFullScreen(false);
  }, [state.openSegmentId]);

  useEffect(() => {
    const previousPage = previousPageRef.current;
    const enteringChat = page === "chat" && previousPage !== "chat";
    const leavingChat = previousPage === "chat" && page !== "chat";

    if (enteringChat || leavingChat) {
      if (state.openSourcesIds) {
        dispatch({ type: "CLOSE_SOURCES" });
      }
      if (state.openSegmentId) {
        dispatch({ type: "CLOSE_SEGMENT" });
      }
      setSegmentPanelFullScreen(false);
      setShownPanel(null);
    }

    if (leavingChat && !chatSyncNoticeConsumed) {
      setShowChatSyncPopup(false);
      setShowChatSyncDisclaimer(false);
      setChatSyncNoticeConsumed(true);
    }

    previousPageRef.current = page;
  }, [page, state.openSourcesIds, state.openSegmentId, dispatch, chatSyncNoticeConsumed]);

  useEffect(() => {
    if (page === "chat") return;

    let changed = false;
    if (state.openSourcesIds) {
      dispatch({ type: "CLOSE_SOURCES" });
      changed = true;
    }
    if (changed) {
      setSegmentPanelFullScreen(false);
      setShownPanel((current) => (current?.kind === "sources" ? null : current));
    }
  }, [page, state.openSourcesIds, state.openSegmentId, dispatch]);

  useEffect(() => {
    if (page !== "segments" && page !== "chat" && state.openSegmentId) {
      setShownPanel((current) => (current?.kind === "segment" ? null : current));
      dispatch({ type: "CLOSE_SEGMENT" });
    }
  }, [page, state.openSegmentId, dispatch]);

  // Resizable side panel.
  const [panelWidth, setPanelWidth] = useState(420);
  const [resizing, setResizing] = useState(false);
  const startResize = (e: React.MouseEvent) => {
    e.preventDefault();
    setResizing(true);
    const onMove = (ev: MouseEvent) => {
      setPanelWidth(Math.min(720, Math.max(340, window.innerWidth - ev.clientX)));
    };
    const onUp = () => {
      setResizing(false);
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  };

  function openSegment(id: string) {
    setSelectedSegmentId(id);
    setPage("segment-detail");
  }

  function openSegmentPanelPage(id: string) {
    setPage("segments");
    setSegmentPanelFullScreen(false);
    setShownPanel({ kind: "segment", id });
    dispatch({ type: "OPEN_SEGMENT", id });
  }

  // Open an insight's source — the chat that produced it, or the segment it's about.
  function openSource(src: { kind: "chat" | "segment"; id: string }) {
    if (src.kind === "chat") {
      dispatch({ type: "SELECT_CONVERSATION", id: src.id });
      setPage("chat");
    } else {
      openSegment(src.id);
    }
  }

  function openSpace(id: string) {
    setSelectedSpaceId(id);
    setPage("space-detail");
  }

  function openActivation(id: string) {
    setOpenActivationId(id);
  }

  function openActivationPage(id: string) {
    setOpenActivationId(id);
    setPage("activations");
  }

  useEffect(() => {
    const onOpenActivationPanel = (event: Event) => {
      const customEvent = event as CustomEvent<{ activationId?: string }>;
      const activationId = customEvent.detail?.activationId;
      if (!activationId) return;

      setOpenActivationId(activationId);

      // In chat, replace segment/sources side panels with the shared activation panel.
      if (page === "chat") {
        if (state.openSourcesIds) dispatch({ type: "CLOSE_SOURCES" });
        if (state.openSegmentId) dispatch({ type: "CLOSE_SEGMENT" });
        setSegmentPanelFullScreen(false);
        setShownPanel(null);
      }
    };

    const onCloseActivationPanel = () => {
      setOpenActivationId(null);
    };

    window.addEventListener("prototype-master:open-activation-panel", onOpenActivationPanel as EventListener);
    window.addEventListener("prototype-master:close-activation-panel", onCloseActivationPanel);

    return () => {
      window.removeEventListener("prototype-master:open-activation-panel", onOpenActivationPanel as EventListener);
      window.removeEventListener("prototype-master:close-activation-panel", onCloseActivationPanel);
    };
  }, [page, state.openSourcesIds, state.openSegmentId, dispatch]);

  function kickoffActivationFromSegment(segmentId: string) {
    const artifact = state.artifacts.get(segmentId);
    const dummy = DUMMY_SEGMENT_BY_ID[segmentId];
    const group = BRAIN_GROUPS.find((item) => item.id === segmentId);

    const segmentName = artifact?.name ?? dummy?.name ?? group?.name ?? "Segment";
    const criteria = artifact?.body?.kind === "segment"
      ? artifact.body.criteria
      : (dummy?.validation ?? group?.criteria.map((criterion) => criterion.detail) ?? []);
    const inferredPopulationFromCriteria = criteria.find((item) => item.toLowerCase().startsWith("population:"))
      ?.split(":")
      .slice(1)
      .join(":")
      .trim();
    const population = artifact?.body?.kind === "segment"
      ? (artifact.body.population ?? inferredPopulationFromCriteria ?? dummy?.population ?? "2,840")
      : (dummy?.population ?? group?.population.toLocaleString() ?? "2,840");
    const description = artifact?.body?.kind === "segment"
      ? (artifact.body.purpose ?? dummy?.summary ?? group?.summary ?? "")
      : (dummy?.summary ?? group?.summary ?? "");
    const recommendations = artifact?.body?.kind === "segment"
      ? artifact.body.recommendations
      : dummy?.recommendations;

    registerDefs([
      {
        id: segmentId,
        kind: "segment",
        name: segmentName,
        entity: "customer",
        description,
        stat: { label: "customers", value: population },
      },
    ]);

    dispatch({ type: "NEW_CHAT" });
    dispatch({
      type: "ADD_ARTIFACT",
      artifact: {
        id: segmentId,
        type: "segment",
        name: segmentName,
        status: "saved",
        body: {
          kind: "segment",
          purpose: description,
          population,
          criteria,
          recommendations,
        },
      },
    });

    setPage("chat");
    window.setTimeout(() => {
      window.dispatchEvent(new CustomEvent("prototype-master:start-next-turn", {
        detail: { text: "Build a new activation", mentionIds: [segmentId] },
      }));
    }, 40);
  }

  function openInsight(id: string) {
    setOpenInsightId(id);
    setPage("insights");
  }

  function createSpace(name: string, description: string) {
    const id = `sp-${Date.now()}`;
    setSpaces((prev) => [
      { id, name, description, updatedLabel: "Just now", counts: { segments: 0, workflows: 0, activations: 0, insights: 0 } },
      ...prev,
    ]);
    setSelectedSpaceId(id);
    setPage("space-detail");
  }
  function deleteSpace(id: string) {
    setSpaces((prev) => prev.filter((s) => s.id !== id));
    if (selectedSpaceId === id) setSelectedSpaceId(null);
  }

  function addSavedItemToSpace(spaceId: string, kind: "segment" | "insight" | "activation", itemId: string) {
    if (kind === "segment") {
      const artifact = state.artifacts.get(itemId);
      if (artifact && artifact.status !== "saved") {
        dispatch({ type: "SAVE_ARTIFACT", id: itemId });
      }
    }

    setSpaceSavedItems((prev) => {
      const rawCurrent = prev[spaceId] ?? EMPTY_SAVED_ITEMS;
      const current: SavedSpaceItems = {
        segmentIds: rawCurrent.segmentIds ?? [],
        insightIds: rawCurrent.insightIds ?? [],
        activationIds: rawCurrent.activationIds ?? [],
        segmentItems: rawCurrent.segmentItems ?? {},
        activationItems: rawCurrent.activationItems ?? {},
        insightItems: rawCurrent.insightItems ?? {},
      };
      if (kind === "segment") {
        const artifact = state.artifacts.get(itemId);
        const def = getDef(itemId);
        const segmentName = artifact?.name ?? def?.name ?? itemId;
        const segmentMeta = artifact?.body?.kind === "segment"
          ? (artifact.body.population ? `${artifact.body.population} customers` : "Saved segment")
          : (def?.stat ? `${def.stat.value} ${def.stat.label}` : "Saved segment");
        const alreadyTracked = current.segmentIds.includes(itemId);
        const hasSegmentItem = Boolean(current.segmentItems[itemId]);
        if (alreadyTracked && hasSegmentItem) return prev;
        return {
          ...prev,
          [spaceId]: {
            ...current,
            segmentIds: alreadyTracked ? current.segmentIds : [...current.segmentIds, itemId],
            segmentItems: {
              ...current.segmentItems,
              [itemId]: { id: itemId, name: segmentName, meta: segmentMeta },
            },
          },
        };
      }

      if (kind === "activation") {
        const activation = state.activations.find((a) => a.id === itemId) ?? getActivation(itemId);
        const statusLabel = activation
          ? ACTIVATION_STATUS_META[activation.status].label
          : "Saved";
        const alreadyTracked = current.activationIds.includes(itemId);
        const hasActivationItem = Boolean(current.activationItems[itemId]);
        if (alreadyTracked && hasActivationItem) return prev;
        return {
          ...prev,
          [spaceId]: {
            ...current,
            activationIds: alreadyTracked ? current.activationIds : [...current.activationIds, itemId],
            activationItems: {
              ...current.activationItems,
              [itemId]: {
                id: itemId,
                name: activation?.name ?? itemId,
                channel: activation?.channel ?? "Activation",
                status: statusLabel,
              },
            },
          },
        };
      }

      if (current.insightIds.includes(itemId)) return prev;
      return {
        ...prev,
        [spaceId]: {
          ...current,
          insightIds: [...current.insightIds, itemId],
        },
      };
    });
  }

  function addInsightToSpace(spaceId: string, insight: { id: string; title: string; finding: string; savedAt: string }) {
    setSpaceSavedItems((prev) => {
      const rawCurrent = prev[spaceId] ?? EMPTY_SAVED_ITEMS;
      const current: SavedSpaceItems = {
        segmentIds: rawCurrent.segmentIds ?? [],
        insightIds: rawCurrent.insightIds ?? [],
        activationIds: rawCurrent.activationIds ?? [],
        segmentItems: rawCurrent.segmentItems ?? {},
        activationItems: rawCurrent.activationItems ?? {},
        insightItems: rawCurrent.insightItems ?? {},
      };
      const nextInsightIds = current.insightIds.includes(insight.id)
        ? current.insightIds
        : [...current.insightIds, insight.id];
      return {
        ...prev,
        [spaceId]: {
          ...current,
          insightIds: nextInsightIds,
          insightItems: {
            ...current.insightItems,
            [insight.id]: {
              id: insight.id,
              name: insight.title,
              meta: insight.finding,
              updated: insight.savedAt,
            },
          },
        },
      };
    });
  }

  function openChatById(chatId: string) {
    const exists = CONVERSATIONS.some((conversation) => conversation.id === chatId);
    if (exists) dispatch({ type: "SELECT_CONVERSATION", id: chatId });
    else dispatch({ type: "NEW_CHAT" });
    setPage("chat");
  }
  function updateSpaceGoal(id: string, description: string) {
    setSpaces((prev) => prev.map((s) => (
      s.id === id
        ? { ...s, description, updatedLabel: "Just now" }
        : s
    )));
  }

  // A saved segment is shown in the standard detail page via a synthesized group.
  const detailArtifact = page === "segment-detail" && selectedSegmentId ? state.artifacts.get(selectedSegmentId) : undefined;
  const detailIsSegment = detailArtifact?.type === "segment";

  const activeConv = CONVERSATIONS.find((c) => c.id === state.activeConversationId);
  const activeConversationPinned = state.activeConversationId != null && pinnedChatIds.includes(state.activeConversationId);
  const headerTitle = page === "welcome" ? "Welcome"
    : page === "space" ? "Spaces"
    : page === "space-detail" ? (selectedSpace?.name ?? "Space")
    : page === "segments" ? "Segments"
    : page === "segment-detail" ? (detailArtifact?.name ?? "Segment detail")
    : page === "definitions" ? "Definitions"
    : page === "metrics" ? "Metrics"
    : page === "benchmarks" ? "Benchmarks"
    : page === "scorecard" ? "Scorecard"
    : page === "dashboards" ? "Dashboards"
    : page === "playbook" ? "Playbook"
    : page === "calendar" ? "Calendar"
    : page === "insights" ? "Insights"
    : page === "users" ? "Users"
    : page === "context" ? "Context"
    : page === "sources" ? "Sources"
    : page === "integrations" ? "Integrations"
    : page === "activations" ? "Activations"
    : (activeConv?.title ?? "New chat");
  const inKnowledge = page === "calendar" || page === "insights" || page === "segments" || page === "segment-detail";
  const inData = page === "playbook" || page === "definitions" || page === "metrics" || page === "benchmarks" || page === "scorecard" || page === "sources" || page === "integrations";
  const inSpace = page === "space" || page === "space-detail";
  const inActivations = page === "activations";
  const HeaderIcon = isChat ? RiMessage2Line : inSpace ? RiPlanetLine : inActivations ? RiBroadcastLine : inKnowledge ? RiBrainLine : RiDatabase2Line;
  const sidebarCollapsed = collapsed && !sidebarHovered;

  return (
    <div className="flex h-screen overflow-hidden bg-sidebar">
      {/* ── Left sidebar ── */}
      {showSidebar && (
        <div
          onMouseEnter={() => {
            if (collapsed) setSidebarHovered(true);
          }}
          onMouseLeave={() => {
            setSidebarHovered(false);
          }}
        >
          <Sidebar
            collapsed={sidebarCollapsed}
            page={page}
            playbookSection={playbookSection}
            activationFilter={activationNavFilter}
            pinnedChatIds={pinnedChatIds}
            onTogglePinnedChat={(id) => {
              setPinnedChatIds((prev) => (prev.includes(id)
                ? prev.filter((chatId) => chatId !== id)
                : [...prev, id]));
            }}
            onSelectActivationFilter={(filter) => {
              setActivationNavFilter(filter);
              setPage("activations");
            }}
            onOpenGlossary={() => {
              setPlaybookSection("glossary");
              setPage("playbook");
            }}
            onOpenRules={() => {
              setPlaybookSection("rules");
              setPage("playbook");
            }}
            onNavigate={setPage}
          />
        </div>
      )}

      {/* ── Main content ── */}
      <main className={cn(
        "relative m-2 flex min-w-0 flex-1 flex-col overflow-hidden rounded-xl border border-border/60 bg-background shadow-sm",
        showSidebar && "ml-0",
      )}>
        {/* Header */}
        <header className="flex h-12 shrink-0 items-center gap-2 border-b border-border px-4">
          {showSidebar && (
            <>
              <button
                onClick={() => setCollapsed((c) => !c)}
                className="flex size-8 items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
              >
                <RiSidebarFoldLine className="size-4" />
              </button>
              <div className="mx-1 h-4 w-px shrink-0 bg-border" />
            </>
          )}
          <HeaderIcon className="size-4 shrink-0 text-muted-foreground" />
          <span className="flex-1 truncate text-sm font-medium text-foreground">{headerTitle}</span>
          {isChat && state.activeConversationId && (
            <Button
              size="sm"
              variant={activeConversationPinned ? "default" : "outline"}
              className="h-8 px-2.5"
              onClick={() => {
                const id = state.activeConversationId;
                if (!id) return;
                setPinnedChatIds((prev) => (prev.includes(id)
                  ? prev.filter((chatId) => chatId !== id)
                  : [...prev, id]));
              }}
            >
              <RiPushpinLine className="size-4" />
              {activeConversationPinned ? "Pinned" : "Pin"}
            </Button>
          )}
          {isChat && state.chatStarted && (
            <button
              onClick={() => setContextPanelOpen((o) => !o)}
              className={cn(
                "flex size-8 items-center justify-center rounded-lg transition-colors",
                contextPanelOpen && !sidePanelOpen
                  ? "bg-accent text-foreground"
                  : "text-muted-foreground hover:text-foreground hover:bg-accent"
              )}
              title="Toggle context panel"
            >
              <RiLayoutRightLine className="size-4" />
            </button>
          )}
          {page === "space-detail" && (
            <button
              onClick={() => setSpaceRailOpen((o) => !o)}
              className={cn(
                "flex size-8 items-center justify-center rounded-lg transition-colors",
                spaceRailOpen
                  ? "bg-accent text-foreground"
                  : "text-muted-foreground hover:text-foreground hover:bg-accent"
              )}
              title="Toggle panel"
            >
              <RiLayoutRightLine className="size-4" />
            </button>
          )}
        </header>

        {/* Content */}
        <div className="flex min-h-0 flex-1 overflow-hidden">
          {page === "welcome" ? (
            <WelcomeOnboardingPage
              onEnter={() => {
                setOnboardingStep("users");
                setPage("users");
              }}
            />
          ) : page === "segment-detail" && selectedSegmentId ? (
            <div className="min-w-0 flex-1 overflow-y-auto">
              <GroupDetail
                key={selectedSegmentId}
                groupId={selectedSegmentId}
                group={detailIsSegment ? segmentArtifactToGroup(detailArtifact!) : undefined}
                definitionTree={detailIsSegment && detailArtifact!.body?.kind === "segment"
                  ? segmentToLogic(detailArtifact!.id, detailArtifact!.body.criteria)
                  : undefined}
                onOpenGroup={openSegment}
                onBack={() => setPage("segments")}
              />
            </div>
          ) : page === "segments" ? (
            <div className="min-w-0 flex-1 overflow-hidden">
              <SegmentsPage
                onOpenSegment={(id) => {
                  setShownPanel({ kind: "segment", id });
                  setSegmentPanelFullScreen(false);
                  dispatch({ type: "OPEN_SEGMENT", id });
                }}
                onStartSegmentWorkflow={() => {
                  dispatch({ type: "NEW_CHAT" });
                  setPage("chat");
                  window.setTimeout(() => {
                    window.dispatchEvent(new CustomEvent("prototype-master:start-next-turn", { detail: { text: "Build a new segment" } }));
                  }, 40);
                }}
              />
            </div>
          ) : page === "activations" ? (
            <div className="min-w-0 flex-1 overflow-hidden">
              <ActivationsPage
                onOpenActivation={openActivation}
                onStartActivationWorkflow={() => {
                  dispatch({ type: "NEW_CHAT" });
                  setPage("chat");
                  window.setTimeout(() => {
                    window.dispatchEvent(new CustomEvent("prototype-master:start-next-turn", { detail: { text: "Build a new activation" } }));
                  }, 40);
                }}
                prefillSegmentId={pendingActivationSegmentId ?? undefined}
                onPrefillComplete={() => setPendingActivationSegmentId(null)}
                initialStatusFilter={activationNavFilter}
              />
            </div>
          ) : page === "definitions" ? (
            <div className="min-w-0 flex-1 overflow-hidden"><DefinitionsPage /></div>
          ) : page === "metrics" ? (
            <div className="min-w-0 flex-1 overflow-hidden"><MetricsPage /></div>
          ) : page === "benchmarks" ? (
            <div className="min-w-0 flex-1 overflow-hidden"><BenchmarksPage /></div>
          ) : page === "scorecard" ? (
            <div className="min-w-0 flex-1 overflow-hidden"><ScorecardPage /></div>
          ) : page === "dashboards" ? (
            <div className="min-w-0 flex-1 overflow-hidden"><DashboardsPage /></div>
          ) : page === "calendar" ? (
            <div className="min-w-0 flex-1 overflow-hidden"><PlaybookPage initialTab="calendar" /></div>
          ) : page === "playbook" ? (
            <div className="min-w-0 flex-1 overflow-hidden"><PlaybookPage initialTab={playbookSection} /></div>
          ) : page === "insights" ? (
            <div className="min-w-0 flex-1 overflow-hidden">
              <InsightsPage
                onOpenSource={openSource}
                initialOpenInsightId={openInsightId ?? undefined}
                onInitialOpenHandled={() => setOpenInsightId(null)}
                spaceOptions={spaces.map((space) => ({ id: space.id, name: space.name }))}
                onAddToSpace={(spaceId, insight) => addInsightToSpace(spaceId, insight)}
              />
            </div>
          ) : page === "sources" ? (
            <div className="min-w-0 flex-1 overflow-y-auto">
              <SourcesPage />
            </div>
          ) : page === "users" ? (
            <div className="min-w-0 flex-1 overflow-y-auto">
              <UsersPage onboarding={usersOnboarding} />
            </div>
          ) : page === "context" ? (
            <div className="min-w-0 flex-1 overflow-y-auto">
              <BusinessContextPage onboarding={contextOnboarding} />
            </div>
          ) : page === "integrations" ? (
            <div className="min-w-0 flex-1 overflow-y-auto">
              <IntegrationsPage onboarding={integrationsOnboarding} />
            </div>
          ) : page === "space" ? (
            <div className="min-w-0 flex-1 overflow-hidden">
              <SpacesPage spaces={spaces} onOpen={openSpace} onCreate={createSpace} onDelete={deleteSpace} />
            </div>
          ) : page === "space-detail" && selectedSpace ? (
            <div className="min-w-0 flex-1 overflow-hidden">
              <SpacePage
                key={selectedSpace.id}
                space={selectedSpace}
                railOpen={spaceRailOpen}
                onBack={() => setPage("space")}
                onUpdateGoal={(goal) => updateSpaceGoal(selectedSpace.id, goal)}
                savedItems={selectedSpaceSavedItems}
                savedChats={selectedSpaceSavedChats}
                onOpenChat={(chatId) => openChatById(chatId)}
                onTakeMeToSegment={(segmentId) => openSegment(segmentId)}
                onTakeMeToActivation={(activationId) => openActivationPage(activationId)}
                onTakeMeToInsight={(insightId) => openInsight(insightId)}
                onAddSavedItem={(kind, itemId) => addSavedItemToSpace(selectedSpace.id, kind, itemId)}
                onStartTask={() => { dispatch({ type: "NEW_CHAT" }); setPage("chat"); }}
              />
            </div>
          ) : (
            <>
              <div className="flex flex-1 flex-col overflow-hidden">
                {isChat && showChatSyncDisclaimer && (
                  <div className="mx-4 mt-4 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
                    Your data is still syncing from your connected sources. Some answers may be incomplete until this finishes - we'll let you know as soon as everything's ready.
                  </div>
                )}
                <ChatPanel />
              </div>
              <ContextPanel open={contextPanelOpen && !sidePanelOpen && state.chatStarted} />
            </>
          )}
        </div>
      </main>

      {/* Segment detail — inset panel beside the main chat panel; slides in/out, resizable */}
      <div
        className={cn(
          "flex shrink-0 overflow-hidden",
          !resizing && "transition-[width,opacity] duration-300 ease-out",
          !sidePanelOpen && "opacity-0",
        )}
        style={{
          width: sidePanelOpen
            ? (shownPanel?.kind === "segment" && segmentPanelFullScreen
              ? "min(calc(100vw - 4rem), 1200px)"
              : panelWidth)
            : 0,
        }}
      >
        {shownPanel?.kind === "segment" && (
          <SegmentSidePanel
            artifactId={shownPanel.id}
            onOpenSegmentPage={openSegmentPanelPage}
            onClose={() => {
              setSegmentPanelFullScreen(false);
              setShownPanel(null);
              dispatch({ type: "CLOSE_SEGMENT" });
            }}
            onActivate={(id) => {
              kickoffActivationFromSegment(id);
            }}
            onOpenActivation={openActivationPage}
            onStartResize={startResize}
            fullScreen={segmentPanelFullScreen}
            onToggleFullScreen={() => setSegmentPanelFullScreen((value) => !value)}
          />
        )}
        {shownPanel?.kind === "sources" && (
          <SourcesSidePanel
            ids={shownPanel.ids}
            onClose={() => dispatch({ type: "CLOSE_SOURCES" })}
            onStartResize={startResize}
          />
        )}
      </div>

      {/* Activation detail — inset panel, opens beside the Activations page */}
      <div
        className={cn(
          "flex shrink-0 overflow-hidden",
          !resizing && "transition-[width,opacity] duration-300 ease-out",
          !(openActivationId && (inActivations || isChat)) && "opacity-0",
        )}
        style={{ width: openActivationId && (inActivations || isChat) ? panelWidth : 0 }}
      >
        {openActivationId && (inActivations || isChat) && (
          <ActivationSidePanel
            activationId={openActivationId}
            onOpenActivationPage={openActivationPage}
            onPromptInChat={(text) => {
              setPage("chat");
              window.setTimeout(() => {
                window.dispatchEvent(new CustomEvent("prototype-master:start-next-turn", { detail: { text } }));
              }, 40);
            }}
            onClose={() => setOpenActivationId(null)}
            onOpenSegment={(id) => {
              setOpenActivationId(null);
              openSegmentPanelPage(id);
            }}
            onStartResize={startResize}
          />
        )}
      </div>

      {isChat && showChatSyncPopup && (
        <OnboardingLexiModal
          title="You're in - but Lexi's still getting to know your data"
          description="Your sources are still syncing, which can take a little time depending on the platform. While that's happening, feel free to explore Lexi, ask questions, and get a feel for how it works - just know that some answers may be based on partial data for now. We'll notify you as soon as everything's fully synced and ready to go."
          actionLabel="Got it, let's explore."
          onAction={() => {
            setShowChatSyncPopup(false);
            setChatSyncNoticeConsumed(true);
          }}
        />
      )}
    </div>
  );
}

// ─── Activation detail side panel (inset, narrow, right) ────────────────────────

function ActivationSidePanel({ activationId, onOpenActivationPage, onPromptInChat, onClose, onOpenSegment, onStartResize }: {
  activationId: string;
  onOpenActivationPage: (id: string) => void;
  onPromptInChat: (text: string) => void;
  onClose: () => void;
  onOpenSegment: (id: string) => void;
  onStartResize: (e: React.MouseEvent) => void;
}) {
  const { state, dispatch } = useSession();
  const activation = state.activations.find((a) => a.id === activationId) ?? getActivation(activationId);
  const [confirmRerunOpen, setConfirmRerunOpen] = useState(false);
  const [confirmCancelOpen, setConfirmCancelOpen] = useState(false);

  const ensureActivationInState = (nextStatus?: ActivationStatus) => {
    if (!activation) return;
    const exists = state.activations.some((item) => item.id === activation.id);
    if (exists) {
      if (nextStatus) {
        dispatch({ type: "UPDATE_ACTIVATION_STATUS", id: activation.id, status: nextStatus });
      }
      return;
    }

    dispatch({
      type: "ADD_ACTIVATION",
      activation: {
        ...activation,
        status: nextStatus ?? activation.status,
      },
    });
  };

  const handleConfirmCancelActivation = () => {
    if (!activation) return;
    ensureActivationInState("cancelled");
    setConfirmCancelOpen(false);
  };

  const handleConfirmRerunActivation = () => {
    if (!activation) return;

    const now = new Date();
    const dateLabel = now.toLocaleDateString("en-AU", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
    const timestamp = now.toISOString();
    const rerunActivationId = `ac-rerun-${Date.now()}`;

    dispatch({
      type: "ADD_ACTIVATION",
      activation: {
        ...activation,
        id: rerunActivationId,
        createdAt: timestamp,
        name: `${activation.name} (Reran ${dateLabel})`,
        status: "scheduled",
        whenLabel: `Reran · ${dateLabel}`,
        result: "Activation rerun has been queued.",
        trail: [
          { at: dateLabel, entry: "Activation rerun requested from activation side panel." },
          ...activation.trail,
        ],
      },
    });

    setConfirmRerunOpen(false);
    onOpenActivationPage(rerunActivationId);
  };

  return (
    <div className="flex h-full w-full">
      <div
        onMouseDown={onStartResize}
        className="group/resize flex w-2 shrink-0 cursor-col-resize items-center justify-center"
        title="Drag to resize"
      >
        <div className="h-10 w-1 rounded-full bg-border transition-colors group-hover/resize:bg-primary/50" />
      </div>
      <div className="my-2 mr-2 flex min-w-0 flex-1 flex-col overflow-hidden rounded-xl border border-border/60 bg-background shadow-sm">
        <header className="flex h-12 shrink-0 items-center gap-2 border-b border-border px-4">
          <RiBroadcastLine className="size-4 shrink-0 text-muted-foreground" />
          <button
            type="button"
            onClick={() => onOpenActivationPage(activationId)}
            className="flex-1 truncate text-left text-sm font-medium text-foreground transition-colors hover:text-primary hover:underline"
            title={activation?.name ?? "Activation"}
          >
            {activation?.name ?? "Activation"}
          </button>
          <button
            onClick={onClose}
            className="flex size-8 items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
            title="Close"
          >
            <RiCloseLine className="size-4" />
          </button>
        </header>
        <div className="min-h-0 flex flex-1 flex-col">
          <div className="border-b border-border px-4 py-2">
            <div className="flex flex-wrap gap-2">
              <Button
                size="xs"
                variant="outline"
                className="h-7"
                onClick={() => {
                  setConfirmRerunOpen(true);
                  onPromptInChat("Do you want to rerun this activation again?");
                }}
                disabled={!activation}
              >
                Re-Run Activation
              </Button>
              <Button
                size="xs"
                variant="destructive"
                className="h-7"
                onClick={() => {
                  setConfirmCancelOpen(true);
                  onPromptInChat("Are you sure you want to cancel the activation? Sends to the activation platform may be incomplete and you will need to run the activation again.");
                }}
                disabled={!activation}
              >
                <RiProhibitedLine className="size-3.5" />
                Cancel Activation
              </Button>
            </div>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto">
            {activation ? (
              <ActivationDetail
                activation={activation}
                onOpenSegment={onOpenSegment}
                categoryOptions={Array.from(new Set(state.activations.map((a) => a.category ?? "Uncategorised"))).sort((a, b) => a.localeCompare(b))}
                onCategoryChange={(nextCategory) => {
                  dispatch({ type: "UPDATE_ACTIVATION_CATEGORY", id: activation.id, category: nextCategory });
                }}
              />
            ) : (
              <div className="flex h-full items-center justify-center p-6">
                <p className="text-sm text-muted-foreground">Activation not found.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={confirmCancelOpen}
        onOpenChange={setConfirmCancelOpen}
        variant="destructive"
        icon={RiProhibitedLine}
        title="Cancel activation?"
        description="Are you sure you want to cancel the activation? Sends to the activation platform may be incomplete and you will need to run the activation again."
        confirmLabel="Yes, cancel activation"
        cancelLabel="Keep activation"
        onConfirm={handleConfirmCancelActivation}
      />

      <ConfirmDialog
        open={confirmRerunOpen}
        onOpenChange={setConfirmRerunOpen}
        title="Re-run activation?"
        description="Do you want to rerun the activation again?"
        confirmLabel="Yes, re-run activation"
        cancelLabel="Cancel"
        onConfirm={handleConfirmRerunActivation}
      />
    </div>
  );
}

// ─── Segment detail side panel (inset, narrow, right) ───────────────────────────

function SegmentSidePanel({ artifactId, onOpenSegmentPage, onClose, onActivate, onOpenActivation, onStartResize, fullScreen, onToggleFullScreen }: {
  artifactId: string;
  onOpenSegmentPage: (id: string) => void;
  onClose: () => void;
  onActivate: (id: string) => void;
  onOpenActivation: (id: string) => void;
  onStartResize: (e: React.MouseEvent) => void;
  fullScreen: boolean;
  onToggleFullScreen: () => void;
}) {
  const { state } = useSession();
  const artifact = state.artifacts.get(artifactId);

  const matchedDummy = DUMMY_SEGMENT_BY_ID[artifactId];
  const group = artifact?.type === "segment"
    ? segmentArtifactToGroup(artifact)
    : BRAIN_GROUPS.find((item) => item.id === artifactId);

  const panelName = matchedDummy?.name ?? group?.name ?? artifact?.name ?? "Segment";
  const panelSummary = group?.summary
    ?? matchedDummy?.summary
    ?? artifact?.def?.description
    ?? "Audience definition generated from chat-confirmed assumptions.";
  const inferredPopulationFromCriteria = artifact?.body?.kind === "segment"
    ? artifact.body.criteria.find((item) => item.toLowerCase().startsWith("population:"))?.split(":").slice(1).join(":").trim()
    : undefined;
  const panelPopulation = artifact?.body?.kind === "segment"
    ? (artifact.body.population ?? inferredPopulationFromCriteria ?? matchedDummy?.population ?? "2,840")
    : (matchedDummy?.population ?? group?.population.toLocaleString() ?? "2,840");
  const panelCriteria = artifact?.body?.kind === "segment"
    ? artifact.body.criteria
    : (matchedDummy?.validation ?? group?.criteria.map((criterion) => criterion.detail) ?? []);

  const panelRecommendations = artifact?.body?.kind === "segment" && artifact.body.recommendations && artifact.body.recommendations.length > 0
    ? artifact.body.recommendations
    : (matchedDummy?.recommendations ?? [
    "Launch with a narrow first wave and validate conversion quality",
    "Prioritise high-intent windows before broad expansion",
    "Track incremental revenue and suppression impact",
  ]);

  const panelCustomers = matchedDummy?.customers ?? [
    { id: "cust-panel-1", name: `${panelName} - Ava Thompson`, meta: "AOV $142 · Last purchase 34 days ago" },
    { id: "cust-panel-2", name: `${panelName} - Liam Nguyen`, meta: "AOV $129 · Last purchase 49 days ago" },
    { id: "cust-panel-3", name: `${panelName} - Mia Rodriguez`, meta: "AOV $151 · Last purchase 62 days ago" },
  ];

  const linkedActivations = state.activations
    .filter((activation) => activation.segmentId === artifactId)
    .map((activation) => ({
      id: activation.id,
      name: activation.name,
      status: activation.status,
    }));

  const panelActivations = linkedActivations.length > 0
    ? linkedActivations
    : (matchedDummy?.activations ?? []);

  return (
    <div className="flex h-full w-full">
      {/* Resize handle */}
      {!fullScreen ? (
        <div
          onMouseDown={onStartResize}
          className="group/resize flex w-2 shrink-0 cursor-col-resize items-center justify-center"
          title="Drag to resize"
        >
          <div className="h-10 w-1 rounded-full bg-border transition-colors group-hover/resize:bg-primary/50" />
        </div>
      ) : null}
      <div className="my-2 mr-2 flex min-w-0 flex-1 flex-col overflow-hidden rounded-xl border border-border/60 bg-background shadow-sm">
        <header className="flex h-12 shrink-0 items-center gap-2 border-b border-border px-4">
          <RiGroupLine className="size-4 shrink-0 text-muted-foreground" />
          <button
            type="button"
            onClick={() => onOpenSegmentPage(artifactId)}
            className="flex-1 truncate text-left text-sm font-medium text-foreground transition-colors hover:text-primary hover:underline"
            title={panelName}
          >
            {panelName}
          </button>
          <button
            onClick={onToggleFullScreen}
            className="flex size-8 items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
            title={fullScreen ? "Exit full screen" : "Expand to full screen"}
          >
            {fullScreen ? <RiFullscreenExitLine className="size-4" /> : <RiFullscreenLine className="size-4" />}
          </button>
          <Button
            size="sm"
            onClick={() => onActivate(artifactId)}
            className="h-8"
          >
            <RiPlayCircleLine className="size-4" /> Activate
          </Button>
          <button
            onClick={onClose}
            className="flex size-8 items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
            title="Close"
          >
            <RiCloseLine className="size-4" />
          </button>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto p-4">
          {group || matchedDummy ? (
            <Tabs defaultValue="details" className="flex h-full flex-col gap-3">
              <TabsList variant="underline" className="w-full">
                <TabsTrigger value="details">Details</TabsTrigger>
                <TabsTrigger value="customers">Customers</TabsTrigger>
                <TabsTrigger value="activations">In activations</TabsTrigger>
              </TabsList>

              <TabsContent value="details" className="space-y-3">
                <div className="rounded-xl border border-border bg-card p-4">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="text-sm font-semibold text-foreground">{panelName}</h3>
                    <Badge variant="success" size="sm">Confirmed</Badge>
                  </div>
                  <p className="mt-2 text-sm text-foreground-secondary">{panelSummary}</p>
                </div>

                <div className="rounded-xl border border-border bg-card p-4">
                  <p className="text-xs font-medium uppercase tracking-normal text-muted-foreground">Population</p>
                  <p className="mt-1 text-2xl font-semibold text-foreground tabular-nums">{panelPopulation}</p>
                  <p className="mt-3 text-xs font-medium uppercase tracking-normal text-muted-foreground">Segment name</p>
                  <p className="mt-1 text-sm font-medium text-foreground">{panelName}</p>
                </div>

                <div className="rounded-xl border border-border bg-card p-4">
                  <h4 className="text-sm font-semibold text-foreground">Validation</h4>
                  <ul className="mt-3 space-y-2">
                    {(panelCriteria.length > 0 ? panelCriteria : ["No validation criteria available yet"]).map((item, index) => (
                      <li key={`${item}-${index}`} className="rounded-lg border border-border/70 bg-background px-3 py-2 text-sm text-foreground-secondary">
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="rounded-xl border border-border bg-card p-4">
                  <h4 className="text-sm font-semibold text-foreground">Recommendations</h4>
                  <ul className="mt-3 space-y-2">
                    {panelRecommendations.map((item) => (
                      <li key={item} className="text-sm text-foreground-secondary">• {item}</li>
                    ))}
                  </ul>
                </div>
              </TabsContent>

              <TabsContent value="customers" className="space-y-3">
                <div className="rounded-xl border border-border bg-card p-4">
                  <h4 className="text-sm font-semibold text-foreground">Dummy customers</h4>
                  <div className="mt-3 space-y-2">
                    {panelCustomers.map((customer) => (
                      <div key={customer.id} className="rounded-lg border border-border/70 bg-background px-3 py-2">
                        <p className="text-sm font-medium text-foreground">{customer.name}</p>
                        <p className="mt-0.5 text-xs text-foreground-secondary">{customer.meta}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="activations" className="space-y-3">
                <div className="rounded-xl border border-border bg-card p-4">
                  <h4 className="text-sm font-semibold text-foreground">In activations</h4>
                  <p className="mt-2 text-sm text-foreground-secondary">Number of activations: {panelActivations.length}</p>
                  <div className="mt-3 space-y-2">
                    {panelActivations.length > 0 ? panelActivations.map((activation) => (
                      <button
                        key={activation.id}
                        onClick={() => onOpenActivation(activation.id)}
                        className="flex w-full items-center justify-between rounded-lg border border-border/70 bg-background px-3 py-2 text-left hover:bg-accent"
                      >
                        <span className="text-sm font-medium text-foreground">{activation.name}</span>
                        <span className="text-xs text-muted-foreground">{activation.status}</span>
                      </button>
                    )) : (
                      <p className="text-sm text-muted-foreground">No activations for this segment yet.</p>
                    )}
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          ) : (
            <div className="flex h-full items-center justify-center p-6">
              <p className="text-sm text-muted-foreground">Segment not found.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Sources side panel (inset, narrow, right) ──────────────────────────────────

function SourcesSidePanel({ ids, onClose, onStartResize }: {
  ids: string[];
  onClose: () => void;
  onStartResize: (e: React.MouseEvent) => void;
}) {
  const defs = ids.map((id) => getDef(id)).filter((d): d is NonNullable<typeof d> => Boolean(d));

  return (
    <div className="flex h-full w-full">
      {/* Resize handle */}
      <div
        onMouseDown={onStartResize}
        className="group/resize flex w-2 shrink-0 cursor-col-resize items-center justify-center"
        title="Drag to resize"
      >
        <div className="h-10 w-1 rounded-full bg-border transition-colors group-hover/resize:bg-primary/50" />
      </div>
      <div className="my-2 mr-2 flex min-w-0 flex-1 flex-col overflow-hidden rounded-xl border border-border/60 bg-background shadow-sm">
        <header className="flex h-12 shrink-0 items-center gap-2 border-b border-border px-4">
          <RiBookOpenLine className="size-4 shrink-0 text-muted-foreground" />
          <span className="flex-1 truncate text-sm font-medium text-foreground">
            Sources
            <span className="ml-1.5 text-muted-foreground">{defs.length}</span>
          </span>
          <button
            onClick={onClose}
            className="flex size-8 items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
            title="Close"
          >
            <RiCloseLine className="size-4" />
          </button>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto p-3">
          {defs.length > 0 ? (
            <div className="flex flex-col gap-2.5">
              <p className="text-xs text-muted-foreground">
                Definitions this response drew on — the shared, governed terms that decide who's included.
              </p>
              {defs.map((d) => (
                <SourceRow key={d.id} def={d} />
              ))}
            </div>
          ) : (
            <div className="flex h-full items-center justify-center p-6">
              <p className="text-sm text-muted-foreground">No sources for this response.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// A full-width source definition row (fills the panel at any width).
function SourceRow({ def }: { def: import("@/data/def-registry").DefRef }) {
  const Icon = KIND_META[def.kind]?.icon ?? RiBookOpenLine;
  const kindLabel = KIND_META[def.kind]?.label ?? def.kind;
  return (
    <div className="rounded-lg border border-border bg-card p-3">
      <div className="flex items-start gap-2.5">
        <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Icon className="size-4" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline justify-between gap-2">
            <span className="truncate text-sm font-semibold text-foreground">{def.name}</span>
            {def.stat && (
              <span className="shrink-0 text-xs text-muted-foreground">
                <span className="font-medium text-foreground">{def.stat.value}</span> {def.stat.label}
              </span>
            )}
          </div>
          <p className="mt-0.5 text-xs text-muted-foreground">{kindLabel}</p>
          {def.description && (
            <p className="mt-1.5 text-sm leading-relaxed text-foreground-secondary">{def.description}</p>
          )}
          {def.logic && (
            <p className="mt-1.5 break-words rounded-md bg-muted px-2 py-1.5 font-mono text-xs leading-relaxed text-foreground-secondary">
              {def.logic}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function SourcesPage() {
  const [source, setSource] = useState<"shopify" | "klaviyo">("shopify");
  const [sourceTab, setSourceTab] = useState<"data" | "logs" | "dataset">("data");

  const sourceMeta = {
    shopify: {
      label: "Shopify",
      description: "Transactional commerce datasets synced from Shopify storefront and order APIs.",
      datasets: [
        {
          id: "shopify-customers",
          name: "Customers",
          records: "182,430",
          dailyDelta: "2,914",
          linkValue: "customer_id",
          linkType: "Primary key",
          processingTime: "2m 18s",
          updated: "Synced 5 min ago",
          fields: "customer_id, email, first_order_date, lifetime_value",
          sampleColumns: ["customer_id", "email", "first_order_date", "lifetime_value"],
          sampleRows: [
            ["cust_10294", "sophia.nguyen@demo.com", "2023-11-04", "$2,180"],
            ["cust_10312", "liam.carter@demo.com", "2025-02-18", "$740"],
          ],
        },
        {
          id: "shopify-orders",
          name: "Orders",
          records: "1,084,219",
          dailyDelta: "18,340",
          linkValue: "order_id",
          linkType: "Primary key",
          processingTime: "3m 04s",
          updated: "Synced 2 min ago",
          fields: "order_id, customer_id, created_at, total_price, discount_amount",
          sampleColumns: ["order_id", "customer_id", "created_at", "total_price", "discount_amount"],
          sampleRows: [
            ["ord_77812", "cust_10294", "2026-07-18 09:22", "$129.00", "$10.00"],
            ["ord_77844", "cust_10312", "2026-07-18 09:18", "$74.00", "$0.00"],
          ],
        },
        {
          id: "shopify-products",
          name: "Products",
          records: "12,912",
          dailyDelta: "104",
          linkValue: "product_id",
          linkType: "Primary key",
          processingTime: "1m 12s",
          updated: "Synced 14 min ago",
          fields: "product_id, sku, product_type, vendor, status",
          sampleColumns: ["product_id", "sku", "product_type", "vendor", "status"],
          sampleRows: [
            ["prd_10092", "BI-JEANS-08", "Denim", "Blue Illusion", "Active"],
            ["prd_10218", "BI-SCARF-12", "Accessories", "Blue Illusion", "Active"],
          ],
        },
      ],
    },
    klaviyo: {
      label: "Klaviyo",
      description: "Email engagement and profile datasets synced from Klaviyo marketing events.",
      datasets: [
        {
          id: "klaviyo-profiles",
          name: "Profiles",
          records: "209,881",
          dailyDelta: "3,102",
          linkValue: "profile_id",
          linkType: "Primary key",
          processingTime: "2m 26s",
          updated: "Synced 6 min ago",
          fields: "profile_id, email, consent_status, sms_opt_in, predicted_clv",
          sampleColumns: ["profile_id", "email", "consent_status", "sms_opt_in", "predicted_clv"],
          sampleRows: [
            ["prf_22091", "sophia.nguyen@demo.com", "Subscribed", "true", "$2,430"],
            ["prf_22387", "liam.carter@demo.com", "Subscribed", "false", "$810"],
          ],
        },
        {
          id: "klaviyo-events",
          name: "Events",
          records: "5,940,311",
          dailyDelta: "192,441",
          linkValue: "event_id",
          linkType: "Primary key",
          processingTime: "4m 51s",
          updated: "Synced 1 min ago",
          fields: "event_id, profile_id, event_name, timestamp, campaign_id",
          sampleColumns: ["event_id", "profile_id", "event_name", "timestamp", "campaign_id"],
          sampleRows: [
            ["evt_eml_11920", "prf_22091", "email_opened", "2026-07-18 09:10", "cmp_9812"],
            ["evt_eml_11763", "prf_22387", "email_clicked", "2026-07-18 09:06", "cmp_9812"],
          ],
        },
        {
          id: "klaviyo-campaigns",
          name: "Campaign performance",
          records: "18,204",
          dailyDelta: "322",
          linkValue: "campaign_id",
          linkType: "Foreign key",
          processingTime: "1m 38s",
          updated: "Synced 11 min ago",
          fields: "campaign_id, send_time, opens, clicks, attributed_revenue",
          sampleColumns: ["campaign_id", "send_time", "opens", "clicks", "attributed_revenue"],
          sampleRows: [
            ["cmp_9812", "2026-07-17 18:00", "28,410", "6,114", "$48,920"],
            ["cmp_9745", "2026-07-15 17:30", "19,223", "3,087", "$27,330"],
          ],
        },
      ],
    },
  } as const;

  const sourceLogs = {
    shopify: [
      { id: "log-sh-1", dataset: "Orders", loadType: "Incremental", startedAt: "2026-07-18 09:16", duration: "3m 04s", rows: "18,340", status: "Success" },
      { id: "log-sh-2", dataset: "Customers", loadType: "Incremental", startedAt: "2026-07-18 09:12", duration: "2m 18s", rows: "2,914", status: "Success" },
      { id: "log-sh-3", dataset: "Products", loadType: "Incremental", startedAt: "2026-07-18 09:09", duration: "1m 12s", rows: "104", status: "Success" },
    ],
    klaviyo: [
      { id: "log-kl-1", dataset: "Events", loadType: "Incremental", startedAt: "2026-07-18 09:14", duration: "4m 51s", rows: "192,441", status: "Success" },
      { id: "log-kl-2", dataset: "Profiles", loadType: "Incremental", startedAt: "2026-07-18 09:10", duration: "2m 26s", rows: "3,102", status: "Success" },
      { id: "log-kl-3", dataset: "Campaign performance", loadType: "Snapshot", startedAt: "2026-07-18 08:58", duration: "1m 38s", rows: "322", status: "Success" },
    ],
  } as const;

  const current = sourceMeta[source];
  const logs = sourceLogs[source];

  return (
    <div className="relative flex h-full flex-col px-6 py-6">
      <div className="mb-4 flex flex-col gap-1">
        <h1 className="text-xl font-semibold text-foreground">Sources</h1>
        <p className="text-sm text-foreground-secondary">Toggle between Shopify and Klaviyo to inspect each source's datasets independently.</p>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="flex min-h-0 gap-4">
          <aside className="w-56 shrink-0 rounded-xl border border-border bg-card p-3">
            <p className="text-xs font-semibold text-muted-foreground">Integrations</p>
            <div className="mt-2 flex flex-col gap-2">
              <Button
                size="sm"
                variant={source === "shopify" ? "default" : "outline"}
                className="justify-start"
                onClick={() => setSource("shopify")}
              >
                Shopify
              </Button>
              <Button
                size="sm"
                variant={source === "klaviyo" ? "default" : "outline"}
                className="justify-start"
                onClick={() => setSource("klaviyo")}
              >
                Klaviyo
              </Button>
            </div>
          </aside>

          <div className="min-w-0 flex-1 rounded-xl border border-border bg-card p-4">
            <div className="rounded-lg border border-border bg-background p-3">
              <p className="text-sm font-medium text-foreground">{current.label} datasets</p>
              <p className="mt-1 text-sm text-foreground-secondary">{current.description}</p>
            </div>

            <Tabs value={sourceTab} onValueChange={(value) => setSourceTab(value as "data" | "logs" | "dataset")} className="mt-3">
              <TabsList variant="underline" className="w-full">
                <TabsTrigger value="data">Data</TabsTrigger>
                <TabsTrigger value="dataset">Dataset</TabsTrigger>
                <TabsTrigger value="logs">Logs</TabsTrigger>
              </TabsList>

              <TabsContent value="dataset" className="space-y-3">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Dataset</TableHead>
                      <TableHead className="w-32">Records</TableHead>
                      <TableHead className="w-40">Deltas sent daily</TableHead>
                      <TableHead className="w-32">Link value</TableHead>
                      <TableHead className="w-32">Link type</TableHead>
                      <TableHead className="w-36">Processing time</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {current.datasets.map((dataset) => (
                      <TableRow key={`${dataset.id}-summary`}>
                        <TableCell className="text-sm font-medium text-foreground">{dataset.name}</TableCell>
                        <TableCell className="tabular-nums text-foreground">{dataset.records}</TableCell>
                        <TableCell className="tabular-nums text-foreground">{dataset.dailyDelta}</TableCell>
                        <TableCell className="font-mono text-xs text-foreground-secondary">{dataset.linkValue}</TableCell>
                        <TableCell className="text-sm text-foreground-secondary">{dataset.linkType}</TableCell>
                        <TableCell className="text-sm text-foreground-secondary">{dataset.processingTime}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>

                <div className="flex flex-col gap-2.5">
                  {current.datasets.map((dataset) => (
                    <div key={`${dataset.id}-dataset-sample`} className="rounded-lg border border-border bg-background p-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-foreground">{dataset.name} sample data</p>
                          <p className="mt-0.5 text-xs text-foreground-secondary">{dataset.fields}</p>
                        </div>
                        <p className="shrink-0 text-xs text-muted-foreground">{dataset.updated}</p>
                      </div>

                      <div className="mt-2">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              {dataset.sampleColumns.map((column) => (
                                <TableHead key={`${dataset.id}-dataset-${column}`} className="font-mono text-[11px]">{column}</TableHead>
                              ))}
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {dataset.sampleRows.map((row, rowIndex) => (
                              <TableRow key={`${dataset.id}-dataset-row-${rowIndex}`}>
                                {row.map((value, colIndex) => (
                                  <TableCell key={`${dataset.id}-dataset-cell-${rowIndex}-${colIndex}`} className="font-mono text-xs text-foreground-secondary">
                                    {value}
                                  </TableCell>
                                ))}
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </div>
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="data" className="space-y-3">
                <div className="flex flex-col gap-2.5">
                  {current.datasets.map((dataset) => (
                    <div key={dataset.id} className="rounded-lg border border-border bg-background p-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-foreground">{dataset.name}</p>
                          <p className="mt-0.5 text-xs text-foreground-secondary">{dataset.fields}</p>
                        </div>
                        <div className="shrink-0 text-right">
                          <p className="text-xs font-medium text-foreground">{dataset.records} rows</p>
                          <p className="text-xs text-muted-foreground">{dataset.updated}</p>
                        </div>
                      </div>

                      <div className="mt-2">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              {dataset.sampleColumns.map((column) => (
                                <TableHead key={`${dataset.id}-${column}`} className="font-mono text-[11px]">{column}</TableHead>
                              ))}
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {dataset.sampleRows.map((row, rowIndex) => (
                              <TableRow key={`${dataset.id}-row-${rowIndex}`}>
                                {row.map((value, colIndex) => (
                                  <TableCell key={`${dataset.id}-cell-${rowIndex}-${colIndex}`} className="font-mono text-xs text-foreground-secondary">
                                    {value}
                                  </TableCell>
                                ))}
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </div>
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="logs" className="space-y-3">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Dataset load</TableHead>
                      <TableHead className="w-32">Type</TableHead>
                      <TableHead className="w-44">Started</TableHead>
                      <TableHead className="w-32">Timing</TableHead>
                      <TableHead className="w-28">Rows</TableHead>
                      <TableHead className="w-28">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {logs.map((log) => (
                      <TableRow key={log.id}>
                        <TableCell className="text-sm font-medium text-foreground">{log.dataset}</TableCell>
                        <TableCell className="text-sm text-foreground-secondary">{log.loadType}</TableCell>
                        <TableCell className="text-sm text-foreground-secondary">{log.startedAt}</TableCell>
                        <TableCell className="tabular-nums text-foreground">{log.duration}</TableCell>
                        <TableCell className="tabular-nums text-foreground">{log.rows}</TableCell>
                        <TableCell><Badge variant="success" size="sm">{log.status}</Badge></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </div>
  );
}

function WelcomeOnboardingPage({ onEnter }: { onEnter: () => void }) {
  return (
    <div className="flex h-full flex-1 items-center justify-center bg-gradient-to-b from-background to-sidebar/40 px-6 py-10">
      <div className="w-full max-w-2xl rounded-xl border border-border/70 bg-card p-8 shadow-sm">
        <div className="mb-6 flex items-center gap-3">
          <div className="rounded-lg border border-border bg-background p-2 text-foreground">
            <LexiIcon className="size-4" />
          </div>
          <LexerLogo collapsed={false} tone="primary" size="lg" label="onboarding journey" />
        </div>
        <h1 className="text-3xl font-semibold text-foreground">Welcome to Lexer</h1>
        <p className="mt-3 max-w-xl text-sm text-foreground-secondary">
          Before you get started, we will guide you through a quick onboarding journey to set up your team and data sources.
        </p>
        <div className="mt-8">
          <Button size="lg" onClick={onEnter}>
            Enter Lexer
            <RiArrowRightSLine className="size-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

function OnboardingLexiModal({
  title,
  description,
  actionLabel,
  onAction,
}: {
  title: string;
  description: string;
  actionLabel: string;
  onAction: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/35 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-xl border border-border bg-card p-5 shadow-xl">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 rounded-full bg-accent p-2 text-foreground">
            <LexiIcon className="size-4" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-foreground">Lexi</p>
            <p className="mt-1 text-sm text-foreground-secondary">{title}</p>
            <p className="mt-2 text-xs text-muted-foreground">{description}</p>
            <div className="mt-4 flex items-center gap-2">
              <Button size="sm" onClick={onAction}>{actionLabel}</Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function UsersPage({ onboarding }: { onboarding?: OnboardingGuidance }) {
  type UserStatus = "Active" | "Invited" | "Suspended";
  type ManagedUser = {
    id: string;
    fullName: string;
    email: string;
    role: string;
    team: string;
    timeZone: string;
    addedDate: string;
    loginLog: Array<{ id: string; timestamp: string; activity: string; channel: string }>;
    status: UserStatus;
    lastUpdated: string;
  };

  const [roleOptions, setRoleOptions] = useState(["Admin", "Manager", "User", "Viewer"]);
  const [teamOptions, setTeamOptions] = useState(["Operations", "Growth", "Data", "Marketing", "Lifecycle"]);
  const timeZoneOptions = [
    "Australia/Sydney",
    "Australia/Melbourne",
    "America/Los_Angeles",
    "America/New_York",
    "Europe/London",
  ];

  const [users, setUsers] = useState<ManagedUser[]>([
    {
      id: "usr-1",
      fullName: "Izac Hall",
      email: "izac@lexer.ai",
      role: "Admin",
      team: "Operations",
      timeZone: "Australia/Sydney",
      addedDate: "2026-05-11",
      loginLog: [
        { id: "log-1", timestamp: "2026-07-17 09:14", activity: "Successful login", channel: "Web app" },
        { id: "log-2", timestamp: "2026-07-16 18:03", activity: "MFA challenge completed", channel: "Web app" },
        { id: "log-3", timestamp: "2026-07-15 08:22", activity: "Password reset", channel: "Email link" },
      ],
      status: "Active",
      lastUpdated: "Just now",
    },
    {
      id: "usr-2",
      fullName: "Mina Lee",
      email: "mina@lexer.ai",
      role: "Manager",
      team: "Growth",
      timeZone: "Australia/Melbourne",
      addedDate: "2026-06-04",
      loginLog: [
        { id: "log-4", timestamp: "2026-07-17 07:42", activity: "Successful login", channel: "Web app" },
        { id: "log-5", timestamp: "2026-07-16 16:57", activity: "Session timeout", channel: "Web app" },
      ],
      status: "Active",
      lastUpdated: "2 hr ago",
    },
    {
      id: "usr-3",
      fullName: "Ryan Ortiz",
      email: "ryan@lexer.ai",
      role: "User",
      team: "Data",
      timeZone: "America/Los_Angeles",
      addedDate: "2026-07-13",
      loginLog: [
        { id: "log-6", timestamp: "2026-07-13 11:05", activity: "Invite accepted", channel: "Email link" },
      ],
      status: "Invited",
      lastUpdated: "1 day ago",
    },
  ]);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(users[0]?.id ?? null);
  const [newUserName, setNewUserName] = useState("");
  const [newUserEmail, setNewUserEmail] = useState("");
  const [newUserRole, setNewUserRole] = useState("User");
  const [newUserTeam, setNewUserTeam] = useState("Data");
  const [newUserTimeZone, setNewUserTimeZone] = useState("Australia/Sydney");
  const [showAddRole, setShowAddRole] = useState(false);
  const [newRoleName, setNewRoleName] = useState("");
  const [showAddTeam, setShowAddTeam] = useState(false);
  const [newTeamName, setNewTeamName] = useState("");
  const [createUserCollapsed, setCreateUserCollapsed] = useState(false);

  const selectedUser = selectedUserId ? users.find((u) => u.id === selectedUserId) ?? null : null;

  const updateSelectedUser = (updater: (user: ManagedUser) => ManagedUser) => {
    if (!selectedUserId) return;
    setUsers((prev) => prev.map((user) => (
      user.id === selectedUserId ? updater(user) : user
    )));
  };

  const removeSelectedUser = () => {
    if (!selectedUserId) return;
    setUsers((prev) => {
      const nextUsers = prev.filter((user) => user.id !== selectedUserId);
      setSelectedUserId(nextUsers[0]?.id ?? null);
      return nextUsers;
    });
  };

  const addUser = () => {
    if (!newUserName.trim() || !newUserEmail.trim()) return;
    const id = `usr-${Date.now()}`;
    const nextUser: ManagedUser = {
      id,
      fullName: newUserName.trim(),
      email: newUserEmail.trim(),
      role: newUserRole,
      team: newUserTeam,
      timeZone: newUserTimeZone,
      addedDate: new Date().toISOString().slice(0, 10),
      loginLog: [
        {
          id: `log-${Date.now()}`,
          timestamp: "Not signed in yet",
          activity: "User account created",
          channel: "Admin panel",
        },
      ],
      status: "Invited",
      lastUpdated: "Just now",
    };
    setUsers((prev) => [nextUser, ...prev]);
    setSelectedUserId(id);
    setNewUserName("");
    setNewUserEmail("");
  };

  return (
    <div className={cn("relative flex h-full flex-col px-6 py-6", onboarding && "pb-24")}>
      <div className="mb-4 flex flex-col gap-1">
        <h1 className="text-xl font-semibold text-foreground">Users</h1>
        <p className="text-sm text-foreground-secondary">Create new users and manage account details, roles, and access status.</p>
      </div>

      {onboarding?.disclaimerVisible && (
        <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          {onboarding.disclaimerText}
        </div>
      )}

      <div className={cn(
        "grid min-h-0 flex-1 grid-cols-1 gap-4",
        createUserCollapsed ? "lg:grid-cols-[3.5rem_minmax(0,1fr)]" : "lg:grid-cols-[360px_minmax(0,1fr)]",
      )}>
        <div className={cn(
          "min-h-0 rounded-xl border border-border bg-card transition-all duration-200",
          createUserCollapsed ? "overflow-hidden p-2" : "overflow-y-auto p-4",
        )}>
          <div className="flex min-h-0 flex-col gap-4">
            <div className={cn("rounded-lg border border-border bg-background", createUserCollapsed ? "p-1" : "p-3")}>
              <div className={cn("flex items-center", createUserCollapsed ? "justify-center" : "justify-between gap-2")}>
                {!createUserCollapsed && <p className="text-xs font-semibold text-muted-foreground">Create user</p>}
                <button
                  type="button"
                  onClick={() => setCreateUserCollapsed((prev) => !prev)}
                  className="inline-flex items-center rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  aria-label={createUserCollapsed ? "Expand create user" : "Collapse create user to the left"}
                  title={createUserCollapsed ? "Expand create user" : "Collapse create user to the left"}
                >
                  {createUserCollapsed ? <RiArrowRightCircleLine className="size-5" /> : <RiArrowLeftCircleLine className="size-5" />}
                </button>
              </div>

              {!createUserCollapsed && (
                <div className="mt-3 space-y-3">
                  <div>
                    <p className="text-[11px] font-semibold text-muted-foreground">Full name</p>
                    <Input className="mt-1" value={newUserName} onChange={(e) => setNewUserName(e.target.value)} placeholder="Enter full name" />
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold text-muted-foreground">Email</p>
                    <Input className="mt-1" value={newUserEmail} onChange={(e) => setNewUserEmail(e.target.value)} placeholder="name@company.com" />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <p className="text-[11px] font-semibold text-muted-foreground">Role</p>
                      <select
                        className="mt-1 h-9 w-full rounded-md border border-border bg-background px-2.5 text-sm text-foreground"
                        value={newUserRole}
                        onChange={(e) => {
                          const value = e.target.value;
                          if (value === "__add_role__") {
                            setShowAddRole(true);
                            return;
                          }
                          setNewUserRole(value);
                        }}
                      >
                        {roleOptions.map((option) => (
                          <option key={option} value={option}>{option}</option>
                        ))}
                        <option value="__add_role__">+ Add Role</option>
                      </select>
                      {showAddRole && (
                        <div className="mt-2 rounded-md border border-border bg-card p-2">
                          <p className="text-[11px] font-semibold text-muted-foreground">New role</p>
                          <Input
                            className="mt-1 h-8"
                            value={newRoleName}
                            onChange={(e) => setNewRoleName(e.target.value)}
                            placeholder="Enter role name"
                          />
                          <div className="mt-2 flex items-center justify-end gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setShowAddRole(false);
                                setNewRoleName("");
                              }}
                            >
                              Cancel
                            </Button>
                            <Button
                              size="sm"
                              onClick={() => {
                                const role = newRoleName.trim();
                                if (!role) return;
                                const exists = roleOptions.some((option) => option.toLowerCase() === role.toLowerCase());
                                if (!exists) {
                                  setRoleOptions((prev) => [...prev, role]);
                                }
                                setNewUserRole(role);
                                setShowAddRole(false);
                                setNewRoleName("");
                              }}
                            >
                              Save
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                    <div>
                      <p className="text-[11px] font-semibold text-muted-foreground">Team</p>
                      <select
                        className="mt-1 h-9 w-full rounded-md border border-border bg-background px-2.5 text-sm text-foreground"
                        value={newUserTeam}
                        onChange={(e) => {
                          const value = e.target.value;
                          if (value === "__add_team__") {
                            setShowAddTeam(true);
                            return;
                          }
                          setNewUserTeam(value);
                        }}
                      >
                        {teamOptions.map((option) => (
                          <option key={option} value={option}>{option}</option>
                        ))}
                        <option value="__add_team__">+ Add Team</option>
                      </select>
                      {showAddTeam && (
                        <div className="mt-2 rounded-md border border-border bg-card p-2">
                          <p className="text-[11px] font-semibold text-muted-foreground">New team</p>
                          <Input
                            className="mt-1 h-8"
                            value={newTeamName}
                            onChange={(e) => setNewTeamName(e.target.value)}
                            placeholder="Enter team name"
                          />
                          <div className="mt-2 flex items-center justify-end gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setShowAddTeam(false);
                                setNewTeamName("");
                              }}
                            >
                              Cancel
                            </Button>
                            <Button
                              size="sm"
                              onClick={() => {
                                const team = newTeamName.trim();
                                if (!team) return;
                                const exists = teamOptions.some((option) => option.toLowerCase() === team.toLowerCase());
                                if (!exists) {
                                  setTeamOptions((prev) => [...prev, team]);
                                }
                                setNewUserTeam(team);
                                setShowAddTeam(false);
                                setNewTeamName("");
                              }}
                            >
                              Save
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold text-muted-foreground">Time zone</p>
                    <select
                      className="mt-1 h-9 w-full rounded-md border border-border bg-background px-2.5 text-sm text-foreground"
                      value={newUserTimeZone}
                      onChange={(e) => setNewUserTimeZone(e.target.value)}
                    >
                      {timeZoneOptions.map((option) => (
                        <option key={option} value={option}>{option}</option>
                      ))}
                    </select>
                  </div>
                  <Button className="w-full" onClick={addUser}>Create user</Button>

                  <div className="rounded-lg border border-border bg-card p-3">
                    <p className="text-xs font-semibold text-muted-foreground">Role definitions</p>
                    <div className="mt-2 space-y-2 text-xs text-foreground-secondary">
                      <p>
                        <span className="font-semibold text-foreground">Admin</span> - Full access. Can manage integrations, users, permissions, billing, and all context, definitions, rules, activations, and segments.
                      </p>
                      <p>
                        <span className="font-semibold text-foreground">Manager</span> - Can set up and manage integrations, activations, and segments, and manage users - but can't edit context, definitions, or rules, and can't access billing.
                      </p>
                      <p>
                        <span className="font-semibold text-foreground">User</span> - Can access chat, view dashboards/reports, and query data - but can't edit context, definitions, rules, or manage integrations/users.
                      </p>
                      <p>
                        <span className="font-semibold text-foreground">Viewer</span> - Can view dashboards, reports, and existing chat threads - but can't query, edit, or manage anything.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="min-h-0 overflow-hidden rounded-xl border border-border bg-card p-4">
          <div className="flex h-full min-h-0 flex-col gap-4">
            <div className="h-56 rounded-lg border border-border bg-background p-3">
              <div className="flex h-full min-h-0 flex-col">
                <p className="text-xs font-semibold text-muted-foreground">User directory</p>
                <div className="mt-2 min-h-0 flex-1 space-y-1 overflow-y-auto">
                  {users.map((user) => (
                    <button
                      key={user.id}
                      onClick={() => setSelectedUserId(user.id)}
                      className={cn(
                        "w-full rounded-md border px-2.5 py-2 text-left transition-colors",
                        selectedUserId === user.id
                          ? "border-primary/30 bg-primary/5"
                          : "border-transparent hover:border-border hover:bg-muted/40",
                      )}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <p className="truncate text-sm font-medium text-foreground">{user.fullName}</p>
                        <Badge
                          size="sm"
                          variant={user.status === "Active" ? "success" : user.status === "Invited" ? "outline" : "destructive"}
                        >
                          {user.status}
                        </Badge>
                      </div>
                      <p className="mt-0.5 truncate text-xs text-foreground-secondary">{user.email}</p>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="min-h-0 flex-1 rounded-lg border border-border bg-background p-3">
              <div className="flex h-full min-h-0 flex-col">
                <p className="text-xs font-medium text-muted-foreground">Account details</p>
                <div className="mt-2 min-h-0 flex-1 overflow-y-auto">
              {selectedUser ? (
                <div className="space-y-3 pr-1">
                  <div className="flex items-start justify-between gap-2">
                    <h2 className="text-base font-semibold text-foreground">{selectedUser.fullName}</h2>
                    <Badge
                      size="sm"
                      variant={selectedUser.status === "Active" ? "success" : selectedUser.status === "Invited" ? "outline" : "destructive"}
                    >
                      {selectedUser.status}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                    <div>
                      <p className="text-[11px] font-semibold text-muted-foreground">Full name</p>
                      <Input className="mt-1" value={selectedUser.fullName} onChange={(e) => updateSelectedUser((u) => ({ ...u, fullName: e.target.value, lastUpdated: "Just now" }))} />
                    </div>
                    <div>
                      <p className="text-[11px] font-semibold text-muted-foreground">Email</p>
                      <Input className="mt-1" value={selectedUser.email} onChange={(e) => updateSelectedUser((u) => ({ ...u, email: e.target.value, lastUpdated: "Just now" }))} />
                    </div>
                    <div>
                      <p className="text-[11px] font-semibold text-muted-foreground">Role</p>
                      <Input className="mt-1" value={selectedUser.role} onChange={(e) => updateSelectedUser((u) => ({ ...u, role: e.target.value, lastUpdated: "Just now" }))} />
                    </div>
                    <div>
                      <p className="text-[11px] font-semibold text-muted-foreground">Team</p>
                      <Input className="mt-1" value={selectedUser.team} onChange={(e) => updateSelectedUser((u) => ({ ...u, team: e.target.value, lastUpdated: "Just now" }))} />
                    </div>
                    <div>
                      <p className="text-[11px] font-semibold text-muted-foreground">Time zone</p>
                      <select
                        className="mt-1 h-9 w-full rounded-md border border-border bg-background px-2.5 text-sm text-foreground"
                        value={selectedUser.timeZone}
                        onChange={(e) => updateSelectedUser((u) => ({ ...u, timeZone: e.target.value, lastUpdated: "Just now" }))}
                      >
                        {timeZoneOptions.map((option) => (
                          <option key={option} value={option}>{option}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <p className="text-[11px] font-semibold text-muted-foreground">User added date</p>
                      <Input className="mt-1" value={selectedUser.addedDate} onChange={(e) => updateSelectedUser((u) => ({ ...u, addedDate: e.target.value, lastUpdated: "Just now" }))} />
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 border-t border-border pt-3">
                    {selectedUser.status !== "Active" && (
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={selectedUser.status === "Invited"}
                        onClick={() => updateSelectedUser((u) => ({ ...u, status: "Invited", lastUpdated: "Just now" }))}
                      >
                        Invited
                      </Button>
                    )}

                    {selectedUser.status !== "Invited" && (
                      <Button
                        size="sm"
                        disabled={selectedUser.status === "Active"}
                        onClick={() => updateSelectedUser((u) => ({ ...u, status: "Active", lastUpdated: "Just now" }))}
                      >
                        Active
                      </Button>
                    )}

                    <Button size="sm" className="bg-black text-white hover:bg-black/90" onClick={() => updateSelectedUser((u) => ({ ...u, status: "Suspended", lastUpdated: "Just now" }))}>Suspend</Button>
                    {selectedUser.status !== "Invited" && (
                      <Button size="sm" variant="destructive" onClick={removeSelectedUser}>Remove</Button>
                    )}
                  </div>

                  <div className="rounded-lg border border-border bg-background p-3">
                    <p className="text-xs font-semibold text-muted-foreground">Login log</p>
                    <div className="mt-2 space-y-1.5">
                      {selectedUser.loginLog.map((entry) => (
                        <div key={entry.id} className="rounded-md border border-border/70 bg-card px-2.5 py-2">
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-xs font-medium text-foreground">{entry.activity}</p>
                            <p className="text-[11px] text-muted-foreground">{entry.timestamp}</p>
                          </div>
                          <p className="mt-0.5 text-[11px] text-foreground-secondary">{entry.channel}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  <p className="text-xs text-muted-foreground">Last updated: {selectedUser.lastUpdated}</p>
                </div>
              ) : (
                <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                  Select a user to manage account details.
                </div>
              )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {onboarding && (
        <div className="sticky bottom-0 mt-4 flex items-center justify-end border-t border-border bg-background/95 pt-4 backdrop-blur">
          <Button onClick={onboarding.onNext} disabled={!onboarding.disclaimerVisible}>
            {onboarding.nextLabel}
            <RiArrowRightSLine className="size-4" />
          </Button>
        </div>
      )}

      {onboarding && !onboarding.disclaimerVisible && (
        <OnboardingLexiModal
          title={onboarding.promptTitle}
          description={onboarding.promptDescription}
          actionLabel={onboarding.actionLabel}
          onAction={onboarding.onAcknowledge}
        />
      )}
    </div>
  );
}

function BusinessContextPage({ onboarding }: { onboarding?: OnboardingGuidance }) {
  type ContextCard = {
    id: string;
    label: string;
    isCustom: boolean;
    text: string;
    savedText: string;
    isEditing: boolean;
    isSaved: boolean;
    isConfirmed: boolean;
    category?: string;
    createdBy?: string;
    createdDate?: string;
    lastUpdatedDate?: string;
  };

  const CONTEXT_SUBCATEGORY_DESCRIPTIONS: Record<string, string> = {
    "brand-name": "The names your business trades under so Lexi can reference your brand correctly.",
    "brand-context": "A short summary of your brand position, voice, and customer promise.",
    "customer-terminology": "The terms you use for customers (for example customers, members, or guests).",
    "data-sources-systems": "The key systems feeding data into Lexer and what each source contributes.",
    "source-system-identifiers": "How connected platforms are identified so records can be linked correctly.",
    "field-mappings": "How source attributes are translated into business-ready concepts in Lexer.",
    "identity-resolution-logic": "How Lexer matches records across sources into one customer profile.",
    "sync-frequency-freshness": "How often data updates and how current the latest synced information is.",
    "household-income-tiers": "How customer household income bands are grouped for targeting and analysis.",
    "purchase-history": "How past order behavior is summarized for lifecycle and value insights.",
    "customer-lifecycle-stage": "How customers are classified by recency and activity stage.",
    "email-engagement": "How email interaction quality is interpreted for messaging and cadence decisions.",
    "list-segment-membership": "Which key audiences customers belong to for campaign targeting.",
    "rfm-fields": "How recency, frequency, and spend are used to prioritize customer value.",
    "exclusion-groups": "Which groups should be excluded from analysis or campaign audiences.",
    "financial-year": "Your financial year boundary used for reporting and period comparisons.",
    "peak-periods": "The high-demand dates and event windows important to your business.",
    "campaign-vs-bau": "How campaign periods are distinguished from always-on business activity.",
    "channel-defaults": "Default audience and policy expectations by channel.",
    "active-flows": "The key automated journeys currently running across channels.",
    "opt-in-consent-status": "How contact permissions determine who can be messaged.",
    "channel-identifiers": "The customer contact identifiers used to route channel activity.",
    "suppression-rules": "Rules that define who should not receive campaign communications.",
    "category-taxonomy": "How products are grouped into categories for reporting and targeting.",
    "product-taxonomy": "The hierarchy used to organize your product assortment.",
    "price-points-variants": "How pricing bands and product options are structured.",
    "inventory-status": "How stock availability is tracked for activation and merchandising.",
    "product-metadata": "Additional product attributes used for segmentation and personalization.",
  };

  const [cards, setCards] = useState<ContextCard[]>([
    {
      id: "brand",
      label: "Brand",
      isCustom: false,
      text: "",
      savedText: "",
      isEditing: false,
      isSaved: false,
      isConfirmed: false,
    },
    {
      id: "brand-name",
      label: "Brand Name(s)",
      isCustom: false,
      text: "",
      savedText: "",
      isEditing: false,
      isSaved: false,
      isConfirmed: false,
    },
    {
      id: "brand-context",
      label: "Brand Context",
      isCustom: false,
      text: "",
      savedText: "",
      isEditing: false,
      isSaved: false,
      isConfirmed: false,
    },
    {
      id: "customer-terminology",
      label: "Customer terminology",
      isCustom: false,
      text: "",
      savedText: "",
      isEditing: false,
      isSaved: false,
      isConfirmed: false,
    },
    {
      id: "data",
      label: "Data",
      isCustom: false,
      text: "",
      savedText: "",
      isEditing: false,
      isSaved: false,
      isConfirmed: false,
    },
    {
      id: "data-sources-systems",
      label: "Data sources and systems",
      isCustom: false,
      text: "",
      savedText: "",
      isEditing: false,
      isSaved: false,
      isConfirmed: false,
    },
    {
      id: "source-system-identifiers",
      label: "Source system identifiers",
      isCustom: false,
      text: "Connected source identifiers represent how commerce and messaging systems are recognized across trading, customer, and campaign activity for review.\n\n- **Primary trading storefront** — The business operates one main online storefront for daily sales, with customer and order activity treated as the default commerce context. ([Shopify])\n- **Market coverage profile** — Activity is concentrated in Australia and New Zealand, with AUD as the primary reporting currency for value comparisons. ([Shopify])\n- **Customer identity anchor** — Most active shoppers are consistently recognized by email for cross-journey continuity. ([Klaviyo])\n- **Messaging account ownership** — One central marketing account drives lifecycle and campaign engagement tracking. ([Klaviyo])\n- **Cross-source linkage baseline** — Purchase and message behavior is connected at a person level for audience planning. ([Klaviyo])",
      savedText: "Connected source identifiers represent how commerce and messaging systems are recognized across trading, customer, and campaign activity for review.\n\n- **Primary trading storefront** — The business operates one main online storefront for daily sales, with customer and order activity treated as the default commerce context. ([Shopify])\n- **Market coverage profile** — Activity is concentrated in Australia and New Zealand, with AUD as the primary reporting currency for value comparisons. ([Shopify])\n- **Customer identity anchor** — Most active shoppers are consistently recognized by email for cross-journey continuity. ([Klaviyo])\n- **Messaging account ownership** — One central marketing account drives lifecycle and campaign engagement tracking. ([Klaviyo])\n- **Cross-source linkage baseline** — Purchase and message behavior is connected at a person level for audience planning. ([Klaviyo])",
      isEditing: false,
      isSaved: true,
      isConfirmed: true,
    },
    {
      id: "field-mappings",
      label: "Field mappings",
      isCustom: false,
      text: "Field mappings explain how shopper, order, product, and engagement signals are translated into business-friendly context for planning and activation.\n\n- **Customer profile rollup** — Shopper traits are unified into one profile view so teams can work from one customer story. ([Shopify])\n- **Order value normalization** — Purchase values are standardized for fair spend-tier and VIP evaluation. ([Shopify])\n- **Product context alignment** — Product family and assortment cues are grouped into usable merchandising concepts. ([Shopify])\n- **Engagement outcome alignment** — Message responses are interpreted as opened, clicked, and recently engaged states. ([Klaviyo])\n- **Conversion window framing** — Response impact is read within practical retail windows to keep performance comparisons fair. ([Klaviyo])",
      savedText: "Field mappings explain how shopper, order, product, and engagement signals are translated into business-friendly context for planning and activation.\n\n- **Customer profile rollup** — Shopper traits are unified into one profile view so teams can work from one customer story. ([Shopify])\n- **Order value normalization** — Purchase values are standardized for fair spend-tier and VIP evaluation. ([Shopify])\n- **Product context alignment** — Product family and assortment cues are grouped into usable merchandising concepts. ([Shopify])\n- **Engagement outcome alignment** — Message responses are interpreted as opened, clicked, and recently engaged states. ([Klaviyo])\n- **Conversion window framing** — Response impact is read within practical retail windows to keep performance comparisons fair. ([Klaviyo])",
      isEditing: false,
      isSaved: true,
      isConfirmed: true,
    },
    {
      id: "identity-resolution-logic",
      label: "Identity resolution logic",
      isCustom: false,
      text: "Identity resolution logic describes how customer records are stitched into a reliable person-level view across commerce and messaging channels.\n\n- **Email-first matching** — Profiles are first matched by email because it gives the highest-confidence cross-source continuity. ([Klaviyo])\n- **Phone-assisted matching** — Mobile identity supports matching when email coverage is incomplete. ([Klaviyo])\n- **Recency conflict handling** — More recent confirmed activity is prioritized when profile signals disagree. ([Shopify])\n- **Duplicate collapse threshold** — Repeated overlapping identity signals trigger consolidation into one shopper view. ([Klaviyo])\n- **History preservation** — Purchase history remains attached after matching to protect lifecycle and value accuracy. ([Shopify])",
      savedText: "Identity resolution logic describes how customer records are stitched into a reliable person-level view across commerce and messaging channels.\n\n- **Email-first matching** — Profiles are first matched by email because it gives the highest-confidence cross-source continuity. ([Klaviyo])\n- **Phone-assisted matching** — Mobile identity supports matching when email coverage is incomplete. ([Klaviyo])\n- **Recency conflict handling** — More recent confirmed activity is prioritized when profile signals disagree. ([Shopify])\n- **Duplicate collapse threshold** — Repeated overlapping identity signals trigger consolidation into one shopper view. ([Klaviyo])\n- **History preservation** — Purchase history remains attached after matching to protect lifecycle and value accuracy. ([Shopify])",
      isEditing: false,
      isSaved: true,
      isConfirmed: true,
    },
    {
      id: "sync-frequency-freshness",
      label: "Sync frequency and freshness",
      isCustom: false,
      text: "Sync and freshness context reflects how quickly connected data is refreshed and how current it is for operational decisions.\n\n- **Order feed cadence** — New and updated orders refresh in near-real-time windows suitable for daily optimization. ([Shopify])\n- **Customer profile cadence** — Signup and profile changes flow through regular hourly-style refresh cycles. ([Shopify])\n- **Engagement feed cadence** — Campaign and flow responses update in frequent batches after send activity. ([Klaviyo])\n- **Daily completeness checkpoint** — Overnight reconciliation improves previous-day reporting completeness. ([Shopify])\n- **Latency risk guidance** — Extended lag indicates campaign decisions should pause until freshness normalizes. ([Klaviyo])",
      savedText: "Sync and freshness context reflects how quickly connected data is refreshed and how current it is for operational decisions.\n\n- **Order feed cadence** — New and updated orders refresh in near-real-time windows suitable for daily optimization. ([Shopify])\n- **Customer profile cadence** — Signup and profile changes flow through regular hourly-style refresh cycles. ([Shopify])\n- **Engagement feed cadence** — Campaign and flow responses update in frequent batches after send activity. ([Klaviyo])\n- **Daily completeness checkpoint** — Overnight reconciliation improves previous-day reporting completeness. ([Shopify])\n- **Latency risk guidance** — Extended lag indicates campaign decisions should pause until freshness normalizes. ([Klaviyo])",
      isEditing: false,
      isSaved: true,
      isConfirmed: true,
    },
    {
      id: "household-income-tiers",
      label: "Household income tiers",
      isCustom: false,
      text: "",
      savedText: "",
      isEditing: false,
      isSaved: false,
      isConfirmed: false,
    },
    {
      id: "customer-intelligence",
      label: "Customer intelligence",
      isCustom: false,
      text: "",
      savedText: "",
      isEditing: false,
      isSaved: false,
      isConfirmed: false,
    },
    {
      id: "lifecycle-tiers",
      label: "Lifecycle tiers",
      isCustom: false,
      text: "",
      savedText: "",
      isEditing: false,
      isSaved: false,
      isConfirmed: false,
    },
    {
      id: "purchase-history",
      label: "Purchase history",
      isCustom: false,
      text: "Purchase history context summarizes recent and repeat buying behavior used for lifecycle and value planning.\n\n- **Recent buyer window** — Customers with at least one purchase in the last 30 days are treated as current buyers. ([Shopify])\n- **Repeat purchase marker** — Customers with 2 or more orders in 12 months are prioritized for retention programs. ([Shopify])\n- **High-value buyer threshold** — Customers above key spend bands are routed to premium experiences over broad discounting. ([Shopify])\n- **Dormant purchaser cohort** — Customers with long purchase gaps are grouped for winback strategy. ([Shopify])\n- **Order cadence profile** — Typical reorder timing guides campaign spacing by customer need cycle. ([Shopify])",
      savedText: "Purchase history context summarizes recent and repeat buying behavior used for lifecycle and value planning.\n\n- **Recent buyer window** — Customers with at least one purchase in the last 30 days are treated as current buyers. ([Shopify])\n- **Repeat purchase marker** — Customers with 2 or more orders in 12 months are prioritized for retention programs. ([Shopify])\n- **High-value buyer threshold** — Customers above key spend bands are routed to premium experiences over broad discounting. ([Shopify])\n- **Dormant purchaser cohort** — Customers with long purchase gaps are grouped for winback strategy. ([Shopify])\n- **Order cadence profile** — Typical reorder timing guides campaign spacing by customer need cycle. ([Shopify])",
      isEditing: false,
      isSaved: true,
      isConfirmed: true,
    },
    {
      id: "customer-lifecycle-stage",
      label: "Customer lifecycle stage",
      isCustom: false,
      text: "Lifecycle stage context classifies customer momentum so outreach timing, tone, and offers match customer maturity and risk.\n\n- **New customer** — First purchase completed recently and still in onboarding to second-order conversion. ([Shopify])\n- **Active customer** — Repeat recent buyers with stable momentum are suitable for cross-sell and newness. ([Shopify])\n- **Lapsing customer** — Customers with growing purchase gaps are flagged for early re-engagement. ([Shopify])\n- **Lapsed customer** — Long-inactive purchasers are grouped for stronger recovery journeys. ([Shopify])\n- **VIP active customer** — High-value and recent buyers are routed to exclusivity-led experiences. ([Shopify])",
      savedText: "Lifecycle stage context classifies customer momentum so outreach timing, tone, and offers match customer maturity and risk.\n\n- **New customer** — First purchase completed recently and still in onboarding to second-order conversion. ([Shopify])\n- **Active customer** — Repeat recent buyers with stable momentum are suitable for cross-sell and newness. ([Shopify])\n- **Lapsing customer** — Customers with growing purchase gaps are flagged for early re-engagement. ([Shopify])\n- **Lapsed customer** — Long-inactive purchasers are grouped for stronger recovery journeys. ([Shopify])\n- **VIP active customer** — High-value and recent buyers are routed to exclusivity-led experiences. ([Shopify])",
      isEditing: false,
      isSaved: true,
      isConfirmed: true,
    },
    {
      id: "email-engagement",
      label: "Email engagement",
      isCustom: false,
      text: "Email engagement context summarizes response quality and audience readiness for message cadence, offer strength, and lifecycle progression.\n\n- **Highly engaged audience** — Opened or clicked recently and suitable for conversion-led messaging. ([Klaviyo])\n- **Click-active shoppers** — Recent clickers indicate strong purchase intent and short-term response potential. ([Klaviyo])\n- **Passive readers** — Open behavior without clicks suggests awareness but weaker offer relevance. ([Klaviyo])\n- **At-risk subscribers** — No recent interaction indicates fatigue risk and cadence adjustment need. ([Klaviyo])\n- **Suppressed profile pool** — Excluded audience protects deliverability and compliance quality. ([Klaviyo])",
      savedText: "Email engagement context summarizes response quality and audience readiness for message cadence, offer strength, and lifecycle progression.\n\n- **Highly engaged audience** — Opened or clicked recently and suitable for conversion-led messaging. ([Klaviyo])\n- **Click-active shoppers** — Recent clickers indicate strong purchase intent and short-term response potential. ([Klaviyo])\n- **Passive readers** — Open behavior without clicks suggests awareness but weaker offer relevance. ([Klaviyo])\n- **At-risk subscribers** — No recent interaction indicates fatigue risk and cadence adjustment need. ([Klaviyo])\n- **Suppressed profile pool** — Excluded audience protects deliverability and compliance quality. ([Klaviyo])",
      isEditing: false,
      isSaved: true,
      isConfirmed: true,
    },
    {
      id: "list-segment-membership",
      label: "List and segment membership",
      isCustom: false,
      text: "List and segment membership context reflects the audiences currently available for lifecycle orchestration and campaign targeting.\n\n- **Newsletter subscribers** — Core consented audience for regular promotional and content sends. ([Klaviyo])\n- **VIP early-access group** — High-value cohort receives priority product access and premium treatment. ([Klaviyo])\n- **Recent purchasers segment** — Buyers from recent windows are used for replenishment and cross-sell journeys. ([Klaviyo])\n- **Winback candidates segment** — Inactive purchasers are grouped for staged recovery campaigns. ([Klaviyo])\n- **High-intent browsers segment** — Active browsers without purchase are prioritized for conversion reminders. ([Klaviyo])",
      savedText: "List and segment membership context reflects the audiences currently available for lifecycle orchestration and campaign targeting.\n\n- **Newsletter subscribers** — Core consented audience for regular promotional and content sends. ([Klaviyo])\n- **VIP early-access group** — High-value cohort receives priority product access and premium treatment. ([Klaviyo])\n- **Recent purchasers segment** — Buyers from recent windows are used for replenishment and cross-sell journeys. ([Klaviyo])\n- **Winback candidates segment** — Inactive purchasers are grouped for staged recovery campaigns. ([Klaviyo])\n- **High-intent browsers segment** — Active browsers without purchase are prioritized for conversion reminders. ([Klaviyo])",
      isEditing: false,
      isSaved: true,
      isConfirmed: true,
    },
    {
      id: "rfm-fields",
      label: "RFM fields",
      isCustom: false,
      text: "RFM context defines value prioritization using recency, frequency, and spend behavior for practical activation targeting.\n\n- **Recency banding** — Customers are grouped by days since last purchase to support timing relevance. ([Shopify])\n- **Frequency banding** — Order-count bands separate casual from habitual shoppers for treatment strategy. ([Shopify])\n- **Monetary banding** — Spend tiers distinguish broad-value from high-value customers. ([Shopify])\n- **High-priority RFM cluster** — Recent, frequent, high-spend customers are prioritized for retention value. ([Shopify])\n- **Recovery RFM cluster** — Historically valuable but less recent customers are prioritized for selective winback. ([Shopify])",
      savedText: "RFM context defines value prioritization using recency, frequency, and spend behavior for practical activation targeting.\n\n- **Recency banding** — Customers are grouped by days since last purchase to support timing relevance. ([Shopify])\n- **Frequency banding** — Order-count bands separate casual from habitual shoppers for treatment strategy. ([Shopify])\n- **Monetary banding** — Spend tiers distinguish broad-value from high-value customers. ([Shopify])\n- **High-priority RFM cluster** — Recent, frequent, high-spend customers are prioritized for retention value. ([Shopify])\n- **Recovery RFM cluster** — Historically valuable but less recent customers are prioritized for selective winback. ([Shopify])",
      isEditing: false,
      isSaved: true,
      isConfirmed: true,
    },
    {
      id: "exclusion-groups",
      label: "Exclusion groups",
      isCustom: false,
      text: "",
      savedText: "",
      isEditing: false,
      isSaved: false,
      isConfirmed: false,
    },
    {
      id: "commercial-calendar",
      label: "Commercial calendar",
      isCustom: false,
      text: "",
      savedText: "",
      isEditing: false,
      isSaved: false,
      isConfirmed: false,
    },
    {
      id: "financial-year",
      label: "Financial year",
      isCustom: false,
      text: "",
      savedText: "",
      isEditing: false,
      isSaved: false,
      isConfirmed: false,
    },
    {
      id: "peak-periods",
      label: "Peak periods",
      isCustom: false,
      text: "",
      savedText: "",
      isEditing: false,
      isSaved: false,
      isConfirmed: false,
    },
    {
      id: "campaign-vs-bau",
      label: "Campaign vs BAU",
      isCustom: false,
      text: "",
      savedText: "",
      isEditing: false,
      isSaved: false,
      isConfirmed: false,
    },
    {
      id: "channels-activation",
      label: "Channels and activation",
      isCustom: false,
      text: "",
      savedText: "",
      isEditing: false,
      isSaved: false,
      isConfirmed: false,
    },
    {
      id: "channel-defaults",
      label: "Channel defaults",
      isCustom: false,
      text: "",
      savedText: "",
      isEditing: false,
      isSaved: false,
      isConfirmed: false,
    },
    {
      id: "active-flows",
      label: "Active flows",
      isCustom: false,
      text: "Active flow context summarizes the lifecycle automations currently running and their role in shopper journey progression.\n\n- **Welcome series** — New subscribers are nurtured early to improve first-purchase conversion. ([Klaviyo])\n- **Browse abandonment flow** — Product viewers without cart activity receive timely reminder outreach. ([Klaviyo])\n- **Cart abandonment flow** — Incomplete checkout shoppers are re-engaged in short conversion windows. ([Klaviyo])\n- **Post-purchase follow-up** — Recent buyers receive care, review, and complementary product messaging. ([Klaviyo])\n- **Winback automation** — Inactive customers enter staged reactivation journeys after extended inactivity. ([Klaviyo])",
      savedText: "Active flow context summarizes the lifecycle automations currently running and their role in shopper journey progression.\n\n- **Welcome series** — New subscribers are nurtured early to improve first-purchase conversion. ([Klaviyo])\n- **Browse abandonment flow** — Product viewers without cart activity receive timely reminder outreach. ([Klaviyo])\n- **Cart abandonment flow** — Incomplete checkout shoppers are re-engaged in short conversion windows. ([Klaviyo])\n- **Post-purchase follow-up** — Recent buyers receive care, review, and complementary product messaging. ([Klaviyo])\n- **Winback automation** — Inactive customers enter staged reactivation journeys after extended inactivity. ([Klaviyo])",
      isEditing: false,
      isSaved: true,
      isConfirmed: true,
    },
    {
      id: "opt-in-consent-status",
      label: "Opt-in and consent status",
      isCustom: false,
      text: "Consent status context shows which audiences are safely reachable and where suppression protections apply for channel quality.\n\n- **Email opted-in audience** — Customers with active email permission are eligible for campaign and lifecycle sends. ([Klaviyo])\n- **SMS opted-in audience** — Mobile-consented customers are eligible for faster-response text activation. ([Klaviyo])\n- **Suppressed audience** — Unsubscribed, bounced, or complaint-prone profiles are automatically excluded. ([Klaviyo])\n- **Recent consent growth** — Newly opted-in contacts are prioritized for onboarding journeys. ([Klaviyo])\n- **Consent decay monitoring** — Deteriorating engagement or complaint trends trigger cadence review needs. ([Klaviyo])",
      savedText: "Consent status context shows which audiences are safely reachable and where suppression protections apply for channel quality.\n\n- **Email opted-in audience** — Customers with active email permission are eligible for campaign and lifecycle sends. ([Klaviyo])\n- **SMS opted-in audience** — Mobile-consented customers are eligible for faster-response text activation. ([Klaviyo])\n- **Suppressed audience** — Unsubscribed, bounced, or complaint-prone profiles are automatically excluded. ([Klaviyo])\n- **Recent consent growth** — Newly opted-in contacts are prioritized for onboarding journeys. ([Klaviyo])\n- **Consent decay monitoring** — Deteriorating engagement or complaint trends trigger cadence review needs. ([Klaviyo])",
      isEditing: false,
      isSaved: true,
      isConfirmed: true,
    },
    {
      id: "channel-identifiers",
      label: "Channel identifiers",
      isCustom: false,
      text: "Channel identifier context summarizes the contact keys used to route messaging and connect customer behavior across journeys.\n\n- **Primary email channel key** — Email is the default cross-channel identifier for audience targeting. ([Klaviyo])\n- **Mobile contact key** — Phone identity supports SMS routing and secondary person matching. ([Klaviyo])\n- **Commerce customer identity** — Store-level customer identity anchors purchase and value context. ([Shopify])\n- **Messaging profile identity** — Engagement identity anchors response and suppression decisions. ([Klaviyo])\n- **Cross-channel confidence signal** — Customers with stable multi-contact identifiers support stronger omnichannel orchestration. ([Klaviyo])",
      savedText: "Channel identifier context summarizes the contact keys used to route messaging and connect customer behavior across journeys.\n\n- **Primary email channel key** — Email is the default cross-channel identifier for audience targeting. ([Klaviyo])\n- **Mobile contact key** — Phone identity supports SMS routing and secondary person matching. ([Klaviyo])\n- **Commerce customer identity** — Store-level customer identity anchors purchase and value context. ([Shopify])\n- **Messaging profile identity** — Engagement identity anchors response and suppression decisions. ([Klaviyo])\n- **Cross-channel confidence signal** — Customers with stable multi-contact identifiers support stronger omnichannel orchestration. ([Klaviyo])",
      isEditing: false,
      isSaved: true,
      isConfirmed: true,
    },
    {
      id: "suppression-rules",
      label: "Suppression rules",
      isCustom: false,
      text: "",
      savedText: "",
      isEditing: false,
      isSaved: false,
      isConfirmed: false,
    },
    {
      id: "product-catalog",
      label: "Product and catalog",
      isCustom: false,
      text: "",
      savedText: "",
      isEditing: false,
      isSaved: false,
      isConfirmed: false,
    },
    {
      id: "category-taxonomy",
      label: "Category taxonomy",
      isCustom: false,
      text: "",
      savedText: "",
      isEditing: false,
      isSaved: false,
      isConfirmed: false,
    },
    {
      id: "product-taxonomy",
      label: "Product taxonomy",
      isCustom: false,
      text: "Product taxonomy context reflects how assortment is grouped into practical merchandise families for reporting and campaign relevance.\n\n- **Core category model** — The assortment is grouped into primary retail families for broad planning and performance comparison. ([Shopify])\n- **Collection-led grouping** — Seasonal collections are treated as strategic overlays across core categories. ([Shopify])\n- **Style-level hierarchy** — Performance is interpreted at style level before variant-level detail. ([Shopify])\n- **Commercial priority tiers** — Highest-contributing categories are surfaced for near-term activation focus. ([Shopify])\n- **Long-tail preservation** — Niche category context remains available to protect specialized demand opportunities. ([Shopify])",
      savedText: "Product taxonomy context reflects how assortment is grouped into practical merchandise families for reporting and campaign relevance.\n\n- **Core category model** — The assortment is grouped into primary retail families for broad planning and performance comparison. ([Shopify])\n- **Collection-led grouping** — Seasonal collections are treated as strategic overlays across core categories. ([Shopify])\n- **Style-level hierarchy** — Performance is interpreted at style level before variant-level detail. ([Shopify])\n- **Commercial priority tiers** — Highest-contributing categories are surfaced for near-term activation focus. ([Shopify])\n- **Long-tail preservation** — Niche category context remains available to protect specialized demand opportunities. ([Shopify])",
      isEditing: false,
      isSaved: true,
      isConfirmed: true,
    },
    {
      id: "price-points-variants",
      label: "Price points and variants",
      isCustom: false,
      text: "Price and variant context summarizes how assortment is distributed across entry, core, and premium value bands with option complexity.\n\n- **Entry price band** — Lower-priced items support acquisition and first-purchase behavior. ([Shopify])\n- **Core price band** — Mid-range assortment drives the largest volume of routine purchases. ([Shopify])\n- **Premium price band** — Higher-ticket products align to higher-margin and high-value segments. ([Shopify])\n- **Variant complexity profile** — Size and color structures shape conversion and inventory decisioning needs. ([Shopify])\n- **Variant demand sensitivity** — Performance varies by option, so variant availability informs activation priority. ([Shopify])",
      savedText: "Price and variant context summarizes how assortment is distributed across entry, core, and premium value bands with option complexity.\n\n- **Entry price band** — Lower-priced items support acquisition and first-purchase behavior. ([Shopify])\n- **Core price band** — Mid-range assortment drives the largest volume of routine purchases. ([Shopify])\n- **Premium price band** — Higher-ticket products align to higher-margin and high-value segments. ([Shopify])\n- **Variant complexity profile** — Size and color structures shape conversion and inventory decisioning needs. ([Shopify])\n- **Variant demand sensitivity** — Performance varies by option, so variant availability informs activation priority. ([Shopify])",
      isEditing: false,
      isSaved: true,
      isConfirmed: true,
    },
    {
      id: "inventory-status",
      label: "Inventory status",
      isCustom: false,
      text: "Inventory status context shows stock health signals that influence campaign eligibility and urgency messaging decisions.\n\n- **In-stock baseline** — Most active assortment remains purchasable for broad campaign targeting. ([Shopify])\n- **Low-stock trigger band** — Low unit availability flags products for urgency messaging or exclusions. ([Shopify])\n- **Out-of-stock exclusion logic** — Unavailable products are excluded from broad promotional sends to protect customer experience. ([Shopify])\n- **Backorder-capable assortment** — Eligible products can remain active even when immediate stock is constrained. ([Shopify])\n- **Restock opportunity timing** — Recently replenished demand drivers are prioritized for conversion outreach. ([Shopify])",
      savedText: "Inventory status context shows stock health signals that influence campaign eligibility and urgency messaging decisions.\n\n- **In-stock baseline** — Most active assortment remains purchasable for broad campaign targeting. ([Shopify])\n- **Low-stock trigger band** — Low unit availability flags products for urgency messaging or exclusions. ([Shopify])\n- **Out-of-stock exclusion logic** — Unavailable products are excluded from broad promotional sends to protect customer experience. ([Shopify])\n- **Backorder-capable assortment** — Eligible products can remain active even when immediate stock is constrained. ([Shopify])\n- **Restock opportunity timing** — Recently replenished demand drivers are prioritized for conversion outreach. ([Shopify])",
      isEditing: false,
      isSaved: true,
      isConfirmed: true,
    },
    {
      id: "product-metadata",
      label: "Product metadata",
      isCustom: false,
      text: "Product metadata context captures descriptive attributes that improve personalization, assortment storytelling, and campaign precision.\n\n- **Brand and supplier context** — Product line ownership cues support curated merchandising narratives. ([Shopify])\n- **Seasonal tagging model** — Seasonal labels support launch sequencing and transition planning. ([Shopify])\n- **Material and composition cues** — Fabric-led context supports intent-based product messaging. ([Shopify])\n- **Margin sensitivity markers** — Margin-aware groupings guide discount governance and profitability protection. ([Shopify])\n- **Bestseller designation** — High-demand products are identified for stronger social-proof and urgency use cases. ([Shopify])",
      savedText: "Product metadata context captures descriptive attributes that improve personalization, assortment storytelling, and campaign precision.\n\n- **Brand and supplier context** — Product line ownership cues support curated merchandising narratives. ([Shopify])\n- **Seasonal tagging model** — Seasonal labels support launch sequencing and transition planning. ([Shopify])\n- **Material and composition cues** — Fabric-led context supports intent-based product messaging. ([Shopify])\n- **Margin sensitivity markers** — Margin-aware groupings guide discount governance and profitability protection. ([Shopify])\n- **Bestseller designation** — High-demand products are identified for stronger social-proof and urgency use cases. ([Shopify])",
      isEditing: false,
      isSaved: true,
      isConfirmed: true,
    },
  ]);
  const [expandedSectionIds, setExpandedSectionIds] = useState<string[]>([]);
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [addNewOpen, setAddNewOpen] = useState(true);
  const [newContextInput, setNewContextInput] = useState("");
  const [newContextInterpretation, setNewContextInterpretation] = useState("");
  const [cardInterpretationDrafts, setCardInterpretationDrafts] = useState<Record<string, string>>({});
  const [cardEditOriginalText, setCardEditOriginalText] = useState<Record<string, string>>({});
  const [newCategoryDraft, setNewCategoryDraft] = useState("");
  const [showNewCategoryInputForCardId, setShowNewCategoryInputForCardId] = useState<string | null>(null);
  const preferredSelectedCardIdRef = useRef<string | null>(null);

  const formatDateLabel = () => new Date().toLocaleDateString("en-AU", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

  const updateCard = (cardId: string, updater: (card: ContextCard) => ContextCard) => {
    setCards((prev) => prev.map((card) => {
      if (card.id !== cardId) return card;
      const updated = updater(card);
      if (updated.createdDate || updated.isCustom) {
        return { ...updated, lastUpdatedDate: formatDateLabel() };
      }
      return updated;
    }));
  };

  const startEditing = (cardId: string) => {
    const sourceCard = cards.find((card) => card.id === cardId);
    if (sourceCard) {
      setCardEditOriginalText((prev) => ({ ...prev, [cardId]: sourceCard.text }));
    }
    setCardInterpretationDrafts((prev) => ({ ...prev, [cardId]: "" }));
    updateCard(cardId, (card) => ({ ...card, isEditing: true, isSaved: false, isConfirmed: false }));
  };

  const updateCardText = (cardId: string, text: string) => {
    updateCard(cardId, (card) => ({ ...card, text }));
  };

  const updateCardLabel = (cardId: string, label: string) => {
    updateCard(cardId, (card) => ({ ...card, label }));
  };

  const saveCard = (cardId: string) => {
    updateCard(cardId, (card) => ({ ...card, savedText: card.text, isSaved: true, isConfirmed: false, isEditing: false }));
  };

  const confirmCard = (cardId: string) => {
    updateCard(cardId, (card) => ({ ...card, savedText: card.text, isSaved: true, isConfirmed: true, isEditing: false }));
  };

  const addMoreCard = () => {
    const id = `custom-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    setCards((prev) => [
      ...prev,
      {
        id,
        label: "New context box",
        isCustom: true,
        text: "",
        savedText: "",
        isEditing: true,
        isSaved: false,
        isConfirmed: false,
        category: "Uncategorised",
        createdBy: MOCK_USER.firstName,
        createdDate: formatDateLabel(),
        lastUpdatedDate: formatDateLabel(),
      },
    ]);
    setSelectedCardId(id);
    setExpandedSectionIds((prev) => (prev.includes("custom-uncategorised") ? prev : [...prev, "custom-uncategorised"]));
  };

  const saveEntirePage = () => {
    setCards((prev) => prev.map((card) => ({
      ...card,
      savedText: card.text,
      isSaved: true,
      isConfirmed: false,
      isEditing: false,
    })));
  };

  const sectionIds = new Set([
    "brand",
    "data",
    "customer-intelligence",
    "commercial-calendar",
    "channels-activation",
    "product-catalog",
  ]);

  const validContextCardIds = new Set(cards.filter((card) => !sectionIds.has(card.id)).map((card) => card.id));

  type ContextSectionGroup = {
    id: string;
    label: string;
    cardIds: string[];
  };

  const sectionOrder: string[] = [];
  const sectionsById: Record<string, ContextSectionGroup> = {};
  let currentSectionId: string | null = null;

  const ensureSection = (id: string, label: string) => {
    if (sectionsById[id]) return;
    sectionsById[id] = { id, label, cardIds: [] };
    sectionOrder.push(id);
  };

  for (const card of cards) {
    if (sectionIds.has(card.id)) {
      currentSectionId = card.id;
      ensureSection(card.id, card.label);
      continue;
    }

    if (card.isCustom) {
      const categoryLabel = card.category?.trim() || "Uncategorised";
      const categoryId = `custom-${categoryLabel.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || "uncategorised"}`;
      const customSectionId = categoryId;
      ensureSection(customSectionId, categoryLabel);
      sectionsById[customSectionId].cardIds.push(card.id);
      continue;
    }

    const fallbackSectionId = "uncategorised";
    const targetSectionId = currentSectionId ?? fallbackSectionId;
    const targetSectionLabel = currentSectionId ? (sectionsById[currentSectionId]?.label ?? "Section") : "Uncategorised";
    ensureSection(targetSectionId, targetSectionLabel);
    sectionsById[targetSectionId].cardIds.push(card.id);
  }

  // Keep an explicit uncategorised bucket visible in the list.
  ensureSection("custom-uncategorised", "Uncategorised");

  const groupedSections = sectionOrder
    .map((sectionId) => sectionsById[sectionId])
    .filter((section) => section.cardIds.length > 0 || section.id === "custom-uncategorised");

  const orderedGroupedSections = groupedSections.sort((a, b) => {
    if (a.id === "custom-uncategorised") return 1;
    if (b.id === "custom-uncategorised") return -1;
    return 0;
  });

  const contextSectionOptions = Array.from(new Set(groupedSections.map((section) => section.label)));

  useEffect(() => {
    if (groupedSections.length === 0) {
      setExpandedSectionIds([]);
      setSelectedCardId(null);
      return;
    }

    setExpandedSectionIds((prev) => {
      const validExpanded = prev.filter((id) => orderedGroupedSections.some((section) => section.id === id));
      return validExpanded;
    });

    setSelectedCardId((prev) => {
      const preferredSelectedCardId = preferredSelectedCardIdRef.current;
      if (preferredSelectedCardId && validContextCardIds.has(preferredSelectedCardId)) {
        preferredSelectedCardIdRef.current = null;
        return preferredSelectedCardId;
      }
      if (prev && validContextCardIds.has(prev)) return prev;
      return orderedGroupedSections[0].cardIds[0] ?? null;
    });
  }, [cards]);

  const selectedCard = selectedCardId
    ? cards.find((card) => card.id === selectedCardId && !sectionIds.has(card.id)) ?? null
    : null;

  const toggleSection = (sectionId: string) => {
    setExpandedSectionIds((prev) => {
      if (prev.includes(sectionId)) return prev.filter((id) => id !== sectionId);
      return [...prev, sectionId];
    });
  };

  const handleSelectCard = (cardId: string) => {
    setAddNewOpen(false);
    setSelectedCardId(cardId);
  };

  const buildLexiInterpretation = (input: string) => {
    const cleaned = input.trim().replace(/\s+/g, " ");
    if (!cleaned) return "";

    const normalized = cleaned.toLowerCase().replace(/[.,]+$/g, "");
    const vipDemoInput = "our vip tiers are based on total spend. bronze is under $500, silver is $500 to $1,500, gold is $1,500 to $5,000";

    if (normalized === vipDemoInput) {
      return "There are 3 VIP tiers based on spend - Bronze under $500, Silver from $500 to $1,500, Gold from $1,500 to $5,000.";
    }

    return `Lexi interprets this context as: ${cleaned}`;
  };

  const buildSmartContextLabel = (input: string, interpretation: string) => {
    const normalizedInput = input.toLowerCase();
    const normalizedInterpretation = interpretation.toLowerCase();

    if (normalizedInput.includes("vip") && normalizedInput.includes("tier")) {
      return "VIP spend tiers";
    }

    if (normalizedInterpretation.includes("tier")) {
      return "Tier definition";
    }

    const words = input.trim().split(/\s+/).filter(Boolean);
    const shortTitle = words.slice(0, 5).join(" ");
    if (!shortTitle) return "Lexi context note";
    return shortTitle.length > 48 ? `${shortTitle.slice(0, 48)}...` : shortTitle;
  };

  const runNewContextInterpretation = () => {
    const interpretation = buildLexiInterpretation(newContextInput);
    setNewContextInterpretation(interpretation);
  };

  const approveNewContext = () => {
    const rawInput = newContextInput.trim();
    const interpretation = newContextInterpretation.trim();
    if (!rawInput || !interpretation) return;

    const id = `custom-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const dateLabel = formatDateLabel();
    const label = buildSmartContextLabel(rawInput, interpretation);
    const defaultCategory = "Uncategorised";

    setCards((prev) => [
      ...prev,
      {
        id,
        label,
        isCustom: true,
        text: interpretation,
        savedText: interpretation,
        isEditing: false,
        isSaved: false,
        isConfirmed: true,
        category: defaultCategory,
        createdBy: MOCK_USER.firstName,
        createdDate: dateLabel,
        lastUpdatedDate: dateLabel,
      },
    ]);
    preferredSelectedCardIdRef.current = id;
    setExpandedSectionIds((prev) => (prev.includes("custom-uncategorised") ? prev : [...prev, "custom-uncategorised"]));
    setSelectedCardId(id);
    setNewContextInput("");
    setNewContextInterpretation("");
    setAddNewOpen(false);
  };

  const cancelNewContext = () => {
    setNewContextInterpretation("");
    setNewContextInput("");
    setAddNewOpen(false);
  };

  const updateCardCategory = (cardId: string, category: string) => {
    updateCard(cardId, (card) => ({ ...card, category }));
  };

  const addCategoryForSelectedCard = () => {
    const selectedId = selectedCardId;
    const name = newCategoryDraft.trim();
    if (!selectedId || !name) return;

    updateCardCategory(selectedId, name);
    setNewCategoryDraft("");
    setShowNewCategoryInputForCardId(null);
  };

  const confirmCardInterpretation = (cardId: string) => {
    const card = cards.find((item) => item.id === cardId);
    if (!card) return;
    const interpretation = buildLexiInterpretation(card.text);
    setCardInterpretationDrafts((prev) => ({ ...prev, [cardId]: interpretation }));
  };

  const approveCardInterpretation = (cardId: string) => {
    const interpretation = (cardInterpretationDrafts[cardId] ?? "").trim();
    if (!interpretation) return;

    const existingCard = cards.find((card) => card.id === cardId);
    if (!existingCard) return;

    const dateLabel = formatDateLabel();
    const nextCategory = (existingCard.category?.trim() || "Uncategorised");

    const hasSmartName = existingCard.label.trim().length > 0 && existingCard.label !== "New context box";
    const nextLabel = hasSmartName
      ? existingCard.label
      : buildSmartContextLabel(existingCard.text, interpretation);

    const nextId = `custom-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

    setCards((prev) => prev.map((card) => {
      if (card.id !== cardId) return card;
      return {
        ...card,
        id: nextId,
        label: nextLabel,
        isCustom: true,
        text: interpretation,
        savedText: interpretation,
        isEditing: false,
        isSaved: false,
        isConfirmed: true,
        category: nextCategory,
        createdBy: card.createdBy ?? MOCK_USER.firstName,
        createdDate: card.createdDate ?? dateLabel,
        lastUpdatedDate: dateLabel,
      };
    }));

    preferredSelectedCardIdRef.current = nextId;
    setSelectedCardId(nextId);
    const normalizedCategoryId = `custom-${nextCategory.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || "uncategorised"}`;
    setExpandedSectionIds((prev) => (prev.includes(normalizedCategoryId) ? prev : [...prev, normalizedCategoryId]));
    setCardInterpretationDrafts((prev) => ({ ...prev, [cardId]: "" }));
    setCardEditOriginalText((prev) => {
      const next = { ...prev };
      delete next[cardId];
      return next;
    });
  };

  const saveApprovedCard = (cardId: string) => {
    updateCard(cardId, (card) => ({
      ...card,
      isSaved: true,
      isConfirmed: true,
      isEditing: false,
    }));
  };

  const cancelCardEditing = (cardId: string) => {
    const originalText = cardEditOriginalText[cardId];
    updateCard(cardId, (card) => ({
      ...card,
      text: originalText ?? card.text,
      isEditing: false,
      isSaved: Boolean(card.savedText),
      isConfirmed: card.savedText === card.text,
    }));
    setCardInterpretationDrafts((prev) => ({ ...prev, [cardId]: "" }));
    setCardEditOriginalText((prev) => {
      const next = { ...prev };
      delete next[cardId];
      return next;
    });
  };

  return (
    <div className={cn("relative flex h-full flex-col px-6 py-6", onboarding && "pb-24")}>
      <div className="mb-4 flex flex-col gap-1">
        <h1 className="text-xl font-semibold text-foreground">Context</h1>
        <p className="text-sm text-foreground-secondary">Capture your business context so Lexer can build your semantic layer.</p>
      </div>

      {onboarding?.disclaimerVisible && (
        <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          {onboarding.disclaimerText}
        </div>
      )}

      <div className="min-h-0 flex-1 overflow-hidden">
        <div className="grid h-full grid-cols-1 gap-4 lg:grid-cols-[18rem_minmax(0,1fr)]">
          <div className="min-h-0 overflow-y-auto rounded-xl border border-border bg-card p-3">
            <div className="mb-3 rounded-lg border border-border/80 bg-background p-2.5">
              <p className="text-xs font-semibold text-muted-foreground">Add new context</p>
              <Button
                variant="outline"
                size="sm"
                className="mt-2 w-full"
                onClick={() => {
                  setAddNewOpen(true);
                  setNewContextInput("");
                  setNewContextInterpretation("");
                }}
              >
                <RiAddLine className="size-4" />
                Add New
              </Button>
            </div>

            <p className="mb-3 text-xs font-semibold text-muted-foreground">Context sections</p>

            <div className="space-y-2">
              {orderedGroupedSections.map((section) => {
                const expanded = expandedSectionIds.includes(section.id);
                return (
                  <div key={section.id} className="rounded-lg border border-border/80 bg-background">
                    <button
                      type="button"
                      className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left"
                      onClick={() => toggleSection(section.id)}
                    >
                      <span className="text-sm font-semibold text-foreground">{section.label}</span>
                      {expanded ? (
                        <RiArrowDownSLine className="size-4 text-foreground-secondary" />
                      ) : (
                        <RiArrowRightSLine className="size-4 text-foreground-secondary" />
                      )}
                    </button>

                    {expanded && (
                      <div className="space-y-1 border-t border-border px-2 py-2">
                        {section.cardIds.map((cardId) => {
                          const card = cards.find((item) => item.id === cardId);
                          if (!card) return null;
                          const selected = selectedCardId === card.id;
                          const hasContextAdded = card.savedText.trim().length > 0 || card.text.trim().length > 0;
                          const emphasizePrefilled = Boolean(onboarding) && hasContextAdded;
                          return (
                            <button
                              key={card.id}
                              type="button"
                              onClick={() => handleSelectCard(card.id)}
                              className={cn(
                                "w-full rounded-md px-2 py-1.5 text-left text-sm transition",
                                selected
                                  ? "bg-accent text-foreground"
                                  : "text-foreground-secondary hover:bg-muted/40 hover:text-foreground",
                              )}
                            >
                              <span
                                className={cn(emphasizePrefilled && "font-semibold")}
                                style={emphasizePrefilled ? { color: "#00BEB7" } : undefined}
                              >
                                {card.label}
                                {emphasizePrefilled ? "*" : ""}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="min-h-0 overflow-y-auto rounded-xl border border-border bg-card p-4">
            {addNewOpen ? (
              <div className="space-y-3 rounded-xl border border-border bg-background p-4">
                <div className="rounded-lg border border-border bg-card p-3">
                  <p className="text-xs font-semibold text-muted-foreground">Add context in plain language</p>
                  <form
                    className="mt-2"
                    onSubmit={(event) => {
                      event.preventDefault();
                      runNewContextInterpretation();
                    }}
                  >
                    <Textarea
                      rows={7}
                      value={newContextInput}
                      onChange={(e) => setNewContextInput(e.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" && !event.shiftKey) {
                          event.preventDefault();
                          runNewContextInterpretation();
                        }
                      }}
                      placeholder="Tell Lexi the context you want to add"
                    />
                    <div className="mt-3 flex items-center justify-end border-t border-border pt-3">
                      <Button type="submit" size="sm" disabled={newContextInput.trim().length === 0}>Confirm</Button>
                    </div>
                  </form>
                </div>

                <div className="rounded-lg border border-border bg-card p-3">
                  <p className="text-xs font-semibold text-muted-foreground">Lexi interpretation</p>
                  <Textarea
                    rows={7}
                    value={newContextInterpretation}
                    readOnly
                    placeholder="Lexi will interpret your context after you confirm."
                    className="mt-2 read-only:cursor-default read-only:bg-muted/25"
                  />
                  <div className="mt-3 flex items-center justify-end gap-2 border-t border-border pt-3">
                    <Button variant="outline" size="sm" onClick={cancelNewContext}>Cancel</Button>
                    <Button size="sm" onClick={approveNewContext} disabled={newContextInterpretation.trim().length === 0}>Approve</Button>
                  </div>
                </div>
              </div>
            ) : selectedCard ? (
              (() => {
                const editing = selectedCard.isEditing;
                const saved = selectedCard.isSaved;
                const confirmed = selectedCard.isConfirmed;
                const interpretationDraft = cardInterpretationDrafts[selectedCard.id] ?? "";

                return (
                  <div className="rounded-xl border border-border bg-background p-3">
                    <Input
                      value={selectedCard.label}
                      onChange={(e) => updateCardLabel(selectedCard.id, e.target.value)}
                      className="h-8 text-sm font-semibold"
                    />

                    {CONTEXT_SUBCATEGORY_DESCRIPTIONS[selectedCard.id] && (
                      <p className="mt-2 text-xs text-foreground-secondary">
                        {CONTEXT_SUBCATEGORY_DESCRIPTIONS[selectedCard.id]}
                      </p>
                    )}

                    <p className="mt-3 text-[11px] font-semibold text-muted-foreground">Description</p>
                    <Textarea
                      rows={6}
                      value={selectedCard.text}
                      readOnly={!editing}
                      onChange={(e) => updateCardText(selectedCard.id, e.target.value)}
                      className="mt-1 min-h-28 read-only:cursor-default read-only:bg-muted/25"
                    />

                    {editing && (
                      <div className="mt-3 flex flex-wrap items-center justify-end gap-2 border-t border-border pt-3">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => cancelCardEditing(selectedCard.id)}
                        >
                          Cancel
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => confirmCardInterpretation(selectedCard.id)}
                          disabled={selectedCard.text.trim().length === 0}
                        >
                          Confirm
                        </Button>
                      </div>
                    )}

                    {editing && (
                      <div className="mt-3 rounded-lg border border-border bg-card p-3">
                        <p className="text-[11px] font-semibold text-muted-foreground">Lexi interpretation</p>
                        <Textarea
                          rows={6}
                          value={interpretationDraft}
                          readOnly
                          placeholder="Select Confirm to generate Lexi's interpretation."
                          className="mt-1 min-h-28 read-only:cursor-default read-only:bg-muted/25"
                        />
                        <div className="mt-3 flex flex-wrap items-center justify-end gap-2 border-t border-border pt-3">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => cancelCardEditing(selectedCard.id)}
                          >
                            Cancel
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => approveCardInterpretation(selectedCard.id)}
                            disabled={interpretationDraft.trim().length === 0}
                          >
                            Approve
                          </Button>
                        </div>
                      </div>
                    )}

                    {selectedCard.isCustom && (
                      <div className="mt-3 rounded-lg border border-border bg-card p-3">
                        <p className="text-[11px] font-semibold text-muted-foreground">Context section</p>
                        <select
                          value={selectedCard.category ?? "Uncategorised"}
                          onChange={(e) => {
                            const value = e.target.value;
                            if (value === "__new__") {
                              setShowNewCategoryInputForCardId(selectedCard.id);
                              return;
                            }
                            setShowNewCategoryInputForCardId(null);
                            updateCardCategory(selectedCard.id, value);
                          }}
                          className="mt-1 h-9 w-full rounded-lg border border-border bg-background px-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                        >
                          {contextSectionOptions.map((sectionLabel) => (
                            <option key={sectionLabel} value={sectionLabel}>{sectionLabel}</option>
                          ))}
                          <option value="__new__">New category...</option>
                        </select>

                        {showNewCategoryInputForCardId === selectedCard.id && (
                          <div className="mt-2 flex items-center gap-2">
                            <Input
                              value={newCategoryDraft}
                              onChange={(e) => setNewCategoryDraft(e.target.value)}
                              placeholder="Add a new context section"
                            />
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={addCategoryForSelectedCard}
                              disabled={newCategoryDraft.trim().length === 0}
                            >
                              Add
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setShowNewCategoryInputForCardId(null);
                                setNewCategoryDraft("");
                              }}
                            >
                              Cancel
                            </Button>
                          </div>
                        )}

                        <div className="mt-3 grid grid-cols-1 gap-1 text-xs text-foreground-secondary">
                          <p>
                            <span className="font-medium text-foreground">Created by:</span> {selectedCard.createdBy ?? "-"}
                          </p>
                          <p>
                            <span className="font-medium text-foreground">Created date:</span> {selectedCard.createdDate ?? "-"}
                          </p>
                          <p>
                            <span className="font-medium text-foreground">Last updated:</span> {selectedCard.lastUpdatedDate ?? "-"}
                          </p>
                        </div>
                      </div>
                    )}

                    <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-border pt-3">
                      {!editing && (
                        <>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => startEditing(selectedCard.id)}
                          >
                            Edit
                          </Button>
                          {confirmed && (
                            <Button
                              size="sm"
                              onClick={() => saveApprovedCard(selectedCard.id)}
                              disabled={saved}
                            >
                              {saved ? "Saved" : "Save"}
                            </Button>
                          )}
                        </>
                      )}
                    </div>

                    {saved && !confirmed && !editing && (
                      <p className="mt-2 text-xs text-foreground-secondary">
                        Changes have been saved but not approved or applied to your context layer.
                      </p>
                    )}

                    {confirmed && saved && !editing && (
                      <p className="mt-2 text-xs text-foreground-secondary">
                        Changes have been saved, approved and applied to your context layer.
                      </p>
                    )}

                    {confirmed && !saved && !editing && (
                      <p className="mt-2 text-xs text-foreground-secondary">
                        Please review and save. This information has not been applied to your context layer.
                      </p>
                    )}
                  </div>
                );
              })()
            ) : (
              <div className="flex h-full items-center justify-center rounded-xl border border-border bg-background p-6 text-sm text-muted-foreground">
                Select a context box from the left to view and edit it.
              </div>
            )}
          </div>
        </div>
      </div>

      {onboarding && (
        <div className="sticky bottom-0 mt-4 flex items-center justify-end border-t border-border bg-background/95 pt-4 backdrop-blur">
          <Button onClick={onboarding.onNext} disabled={!onboarding.disclaimerVisible}>
            {onboarding.nextLabel}
            <RiArrowRightSLine className="size-4" />
          </Button>
        </div>
      )}

      {onboarding && !onboarding.disclaimerVisible && (
        <OnboardingLexiModal
          title={onboarding.promptTitle}
          description={onboarding.promptDescription}
          actionLabel={onboarding.actionLabel}
          onAction={onboarding.onAcknowledge}
        />
      )}
    </div>
  );
}

function IntegrationsPage({ onboarding }: { onboarding?: OnboardingGuidance }) {
  type IntegrationStatus = "Connected" | "Available" | "Disconnected";
  type IntegrationRecord = {
    id: string;
    name: string;
    category: string;
    status: IntegrationStatus;
    summary: string;
    updated: string;
  };
  type AccountDraft = {
    accountName: string;
    username: string;
    password: string;
    apiKey: string;
    secretKey: string;
  };
  type ConnectedAccount = AccountDraft & { id: string };
  type OfflineEventSetDraft = {
    id: string;
    title: string;
    expanded: boolean;
    conversionTracking: string;
    dataset: string;
    trackingPixelId: string;
    saved: boolean;
    disconnected: boolean;
  };

  const [query, setQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [openIntegrationId, setOpenIntegrationId] = useState<string | null>(null);
  const [panelExpanded, setPanelExpanded] = useState(false);
  const [showAccountFrame, setShowAccountFrame] = useState(false);
  const [accountFrameExpanded, setAccountFrameExpanded] = useState(false);
  const [cancelConfirmOpen, setCancelConfirmOpen] = useState(false);
  const [pendingDisconnectIntegrationId, setPendingDisconnectIntegrationId] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<"name" | "category" | "syncDirection" | "summary" | "updated" | "status">("category");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [offlineEventSetsByIntegration, setOfflineEventSetsByIntegration] = useState<Record<string, OfflineEventSetDraft[]>>({});
  const [onlineEventSetsByIntegration, setOnlineEventSetsByIntegration] = useState<Record<string, OfflineEventSetDraft[]>>({});
  const accountFrameRef = useRef<HTMLDivElement | null>(null);
  const CAPI_DATASETS = [
    "CAPI Purchases Dataset",
    "CAPI Leads Dataset",
    "CAPI Store Visits Dataset",
  ];
  const DUMMY_TRACKING_PIXEL_IDS = ["482910374615", "731640928154", "960182745308"];

  const INITIAL_INTEGRATIONS: IntegrationRecord[] = [
    { id: "lexer-api", name: "Lexer API", category: "API", status: "Connected", summary: "Core Lexer platform endpoints and webhooks are healthy.", updated: "Synced just now" },
    { id: "shopify", name: "Shopify", category: "Transactions", status: "Connected", summary: "Orders, products, and customers sync continuously.", updated: "Synced 4 min ago" },
    { id: "stripe", name: "Stripe", category: "Transactions", status: "Available", summary: "Payment, refund, and dispute events are mapped.", updated: "Not connected" },
    { id: "bigcommerce", name: "BigCommerce", category: "Transactions", status: "Available", summary: "Catalog webhook signature check needs renewal.", updated: "Not connected" },
    { id: "klaviyo", name: "Klaviyo", category: "Email", status: "Connected", summary: "Campaign and list engagement events are available.", updated: "Synced 9 min ago" },
    { id: "mailchimp", name: "Mailchimp", category: "Email", status: "Available", summary: "Audience segments and sends are synced daily.", updated: "Not connected" },
    { id: "sendgrid", name: "SendGrid", category: "Email", status: "Disconnected", summary: "Delivery and bounce feeds are temporarily paused.", updated: "Disconnected 1 hr ago" },
    { id: "attentive", name: "Attentive", category: "SMS", status: "Available", summary: "Subscriber opt-in and campaign clickstream is flowing.", updated: "Not connected" },
    { id: "postscript", name: "Postscript", category: "SMS", status: "Available", summary: "SMS conversion attribution is enabled.", updated: "Not connected" },
    { id: "meta-ads", name: "Meta Ads", category: "Paid ads", status: "Available", summary: "Spend, reach, and conversion performance is ingested.", updated: "Not connected" },
    { id: "google-ads", name: "Google Ads", category: "Paid ads", status: "Disconnected", summary: "One account lost token scope for cost imports.", updated: "Disconnected 2 hr ago" },
    { id: "tiktok-ads", name: "TikTok Ads", category: "Paid ads", status: "Available", summary: "Creative and ad group metrics sync hourly.", updated: "Not connected" },
    { id: "ga4", name: "Google Analytics", category: "Web analytics", status: "Available", summary: "Session, source, and funnel events are unified.", updated: "Not connected" },
    { id: "segment", name: "Segment", category: "CDP", status: "Available", summary: "Event routing to warehouse and activation tools is healthy.", updated: "Not connected" },
    { id: "snowflake", name: "Snowflake", category: "Warehouse", status: "Connected", summary: "Modeled tables refresh every 30 minutes.", updated: "Synced 15 min ago" },
  ];

  const buildDefaultAccount = (integration: IntegrationRecord): AccountDraft => {
    const id = integration.id.replace(/-/g, "_");
    return {
      accountName: `${integration.name} primary account`,
      username: `demo_${id}@lexer.local`,
      password: "DemoPass_2026!",
      apiKey: `lxr_pk_${id}_a1b2c3d4`,
      secretKey: `lxr_sk_${id}_9x8y7z6w`,
    };
  };

  const [integrations, setIntegrations] = useState<IntegrationRecord[]>(INITIAL_INTEGRATIONS);
  const [accountDrafts, setAccountDrafts] = useState<Record<string, AccountDraft>>({});
  const [connectedAccountsByIntegration, setConnectedAccountsByIntegration] = useState<Record<string, ConnectedAccount[]>>(() => {
    const seeded: Record<string, ConnectedAccount[]> = {};
    for (const integration of INITIAL_INTEGRATIONS) {
      if (integration.status !== "Connected" && integration.status !== "Disconnected") continue;
      seeded[integration.id] = [{ id: `acc-seed-${integration.id}`, ...buildDefaultAccount(integration) }];
    }
    return seeded;
  });
  const [activeAccountIdByIntegration, setActiveAccountIdByIntegration] = useState<Record<string, string | null>>(() => {
    const seeded: Record<string, string | null> = {};
    for (const integration of INITIAL_INTEGRATIONS) {
      seeded[integration.id] = integration.status === "Connected" || integration.status === "Disconnected" ? `acc-seed-${integration.id}` : null;
    }
    return seeded;
  });

  const defaultAccountForIntegration = (integration: IntegrationRecord): AccountDraft => {
    return buildDefaultAccount(integration);
  };

  const getAccountDraft = (integration: IntegrationRecord): AccountDraft => {
    return accountDrafts[integration.id] ?? defaultAccountForIntegration(integration);
  };

  const createNewAccountDraft = (integration: IntegrationRecord): AccountDraft => {
    const nextOrdinal = (connectedAccountsByIntegration[integration.id]?.length ?? 0) + 1;
    return {
      accountName: `${integration.name} account ${nextOrdinal}`,
      username: "",
      password: "",
      apiKey: "",
      secretKey: "",
    };
  };

  const updateAccountDraft = (integrationId: string, field: keyof AccountDraft, value: string) => {
    setAccountDrafts((prev) => {
      const integration = integrations.find((item) => item.id === integrationId);
      const current = prev[integrationId] ?? (integration ? defaultAccountForIntegration(integration) : {
        accountName: "",
        username: "",
        password: "",
        apiKey: "",
        secretKey: "",
      });
      return {
        ...prev,
        [integrationId]: {
          ...current,
          [field]: value,
        },
      };
    });
  };

  const createOfflineEventSetDraft = (currentLength: number): OfflineEventSetDraft => {
    return {
      id: `offline-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      title: "New Offline Event Set",
      expanded: true,
      conversionTracking: "Meta - Conversion API",
      dataset: CAPI_DATASETS[currentLength % CAPI_DATASETS.length],
      trackingPixelId: DUMMY_TRACKING_PIXEL_IDS[currentLength % DUMMY_TRACKING_PIXEL_IDS.length],
      saved: false,
      disconnected: false,
    };
  };

  const addOfflineEventSet = (integrationId: string) => {
    setOfflineEventSetsByIntegration((prev) => {
      const current = prev[integrationId] ?? [];
      const next = createOfflineEventSetDraft(current.length);
      return { ...prev, [integrationId]: [...current, next] };
    });
  };

  const updateOfflineEventSet = (
    integrationId: string,
    setId: string,
    field: "conversionTracking" | "dataset" | "trackingPixelId",
    value: string,
  ) => {
    setOfflineEventSetsByIntegration((prev) => {
      const current = prev[integrationId] ?? [];
      const next = current.map((item) => (
        item.id === setId
          ? { ...item, [field]: value, saved: false, disconnected: false }
          : item
      ));
      return { ...prev, [integrationId]: next };
    });
  };

  const toggleOfflineEventSetExpanded = (integrationId: string, setId: string) => {
    setOfflineEventSetsByIntegration((prev) => {
      const current = prev[integrationId] ?? [];
      const next = current.map((item) => (
        item.id === setId ? { ...item, expanded: !item.expanded } : item
      ));
      return { ...prev, [integrationId]: next };
    });
  };

  const saveOfflineEventSet = (integrationId: string, setId: string) => {
    setOfflineEventSetsByIntegration((prev) => {
      const current = prev[integrationId] ?? [];
      const next = current.map((item) => (
        item.id === setId
          ? {
            ...item,
            saved: true,
            title: item.conversionTracking.trim() || item.title,
          }
          : item
      ));
      return { ...prev, [integrationId]: next };
    });
  };

  const disconnectOfflineEventSet = (integrationId: string, setId: string) => {
    setOfflineEventSetsByIntegration((prev) => {
      const current = prev[integrationId] ?? [];
      const next = current.map((item) => (
        item.id === setId ? { ...item, disconnected: true } : item
      ));
      return { ...prev, [integrationId]: next };
    });
  };

  const removeOfflineEventSet = (integrationId: string, setId: string) => {
    setOfflineEventSetsByIntegration((prev) => {
      const current = prev[integrationId] ?? [];
      const next = current.filter((item) => item.id !== setId);
      return { ...prev, [integrationId]: next };
    });
  };

  const createOnlineEventSetDraft = (currentLength: number): OfflineEventSetDraft => {
    return {
      id: `online-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      title: "New Online Event Set",
      expanded: true,
      conversionTracking: "Meta - Conversion API",
      dataset: CAPI_DATASETS[currentLength % CAPI_DATASETS.length],
      trackingPixelId: DUMMY_TRACKING_PIXEL_IDS[currentLength % DUMMY_TRACKING_PIXEL_IDS.length],
      saved: false,
      disconnected: false,
    };
  };

  const addOnlineEventSet = (integrationId: string) => {
    setOnlineEventSetsByIntegration((prev) => {
      const current = prev[integrationId] ?? [];
      const next = createOnlineEventSetDraft(current.length);
      return { ...prev, [integrationId]: [...current, next] };
    });
  };

  const updateOnlineEventSet = (
    integrationId: string,
    setId: string,
    field: "conversionTracking" | "dataset" | "trackingPixelId",
    value: string,
  ) => {
    setOnlineEventSetsByIntegration((prev) => {
      const current = prev[integrationId] ?? [];
      const next = current.map((item) => (
        item.id === setId
          ? { ...item, [field]: value, saved: false, disconnected: false }
          : item
      ));
      return { ...prev, [integrationId]: next };
    });
  };

  const toggleOnlineEventSetExpanded = (integrationId: string, setId: string) => {
    setOnlineEventSetsByIntegration((prev) => {
      const current = prev[integrationId] ?? [];
      const next = current.map((item) => (
        item.id === setId ? { ...item, expanded: !item.expanded } : item
      ));
      return { ...prev, [integrationId]: next };
    });
  };

  const saveOnlineEventSet = (integrationId: string, setId: string) => {
    setOnlineEventSetsByIntegration((prev) => {
      const current = prev[integrationId] ?? [];
      const next = current.map((item) => (
        item.id === setId
          ? {
            ...item,
            saved: true,
            title: item.conversionTracking.trim() || item.title,
          }
          : item
      ));
      return { ...prev, [integrationId]: next };
    });
  };

  const disconnectOnlineEventSet = (integrationId: string, setId: string) => {
    setOnlineEventSetsByIntegration((prev) => {
      const current = prev[integrationId] ?? [];
      const next = current.map((item) => (
        item.id === setId ? { ...item, disconnected: true } : item
      ));
      return { ...prev, [integrationId]: next };
    });
  };

  const removeOnlineEventSet = (integrationId: string, setId: string) => {
    setOnlineEventSetsByIntegration((prev) => {
      const current = prev[integrationId] ?? [];
      const next = current.filter((item) => item.id !== setId);
      return { ...prev, [integrationId]: next };
    });
  };

  const saveAccountDraft = (integrationId: string) => {
    const integration = integrations.find((item) => item.id === integrationId);
    if (!integration) return;
    const draft = getAccountDraft(integration);
    const activeId = activeAccountIdByIntegration[integrationId];
    if (!activeId) return;
    setConnectedAccountsByIntegration((prev) => {
      const current = prev[integrationId] ?? [];
      const next = current.map((account) => (
        account.id === activeId ? { ...account, ...draft } : account
      ));
      return { ...prev, [integrationId]: next };
    });
  };

  const connectIntegration = (integrationId: string) => {
    const integration = integrations.find((item) => item.id === integrationId);
    if (!integration) return;
    const draft = getAccountDraft(integration);
    const activeId = activeAccountIdByIntegration[integrationId] ?? null;
    const current = connectedAccountsByIntegration[integrationId] ?? [];
    const existing = activeId ? current.find((account) => account.id === activeId) : null;
    const targetId = existing?.id ?? `acc-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const nextAccounts = existing
      ? current.map((account) => (account.id === targetId ? { ...account, ...draft } : account))
      : [...current, { id: targetId, ...draft }];

    setConnectedAccountsByIntegration((prev) => ({ ...prev, [integrationId]: nextAccounts }));
    setActiveAccountIdByIntegration((prev) => ({ ...prev, [integrationId]: targetId }));
    setIntegrations((prev) => prev.map((item) => (
      item.id === integrationId
        ? { ...item, status: "Connected", updated: "Synced just now" }
        : item
    )));
  };

  const disconnectIntegration = (integrationId: string) => {
    setConnectedAccountsByIntegration((prev) => ({ ...prev, [integrationId]: [] }));
    setActiveAccountIdByIntegration((prev) => ({ ...prev, [integrationId]: null }));

    setIntegrations((prev) => prev.map((item) => (
      item.id === integrationId
        ? { ...item, status: "Available", updated: "Not connected" }
        : item
    )));
  };

  const confirmDisconnectIntegration = () => {
    if (!pendingDisconnectIntegrationId) return;
    disconnectIntegration(pendingDisconnectIntegrationId);
    setPendingDisconnectIntegrationId(null);
  };

  const handleAddNewAccount = (integration: IntegrationRecord) => {
    setShowAccountFrame(true);
    setAccountFrameExpanded(false);
    setActiveAccountIdByIntegration((prev) => ({ ...prev, [integration.id]: null }));
    setAccountDrafts((prev) => ({ ...prev, [integration.id]: createNewAccountDraft(integration) }));
  };

  const selectConnectedAccount = (integration: IntegrationRecord, accountId: string) => {
    const accounts = connectedAccountsByIntegration[integration.id] ?? [];
    const selected = accounts.find((account) => account.id === accountId);
    if (!selected) return;

    setShowAccountFrame(true);
    setAccountFrameExpanded(false);
    setActiveAccountIdByIntegration((prev) => ({ ...prev, [integration.id]: accountId }));
    setAccountDrafts((prev) => ({
      ...prev,
      [integration.id]: {
        accountName: selected.accountName,
        username: selected.username,
        password: selected.password,
        apiKey: selected.apiKey,
        secretKey: selected.secretKey,
      },
    }));
  };

  const categories = [
    "All",
    "Available sources",
    "Connected sources",
    "Disconnected sources",
    ...Array.from(new Set(integrations.map((integration) => integration.category))).sort((a, b) => a.localeCompare(b)),
  ];

  const syncDirectionForCategory = (category: string): "Inbound" | "Outbound" | "Bidirectional" => {
    if (category === "Transactions") return "Inbound";
    if (category === "Paid ads") return "Outbound";
    if (category === "Web analytics") return "Inbound";
    return "Bidirectional";
  };

  const syncDirectionIcon = (direction: "Inbound" | "Outbound" | "Bidirectional") => {
    if (direction === "Inbound") return <RiArrowLeftCircleLine className="size-4" />;
    if (direction === "Outbound") return <RiArrowRightCircleLine className="size-4" />;
    return <RiArrowLeftRightLine className="size-4" />;
  };

  const q = query.trim().toLowerCase();
  const filtered = integrations.filter((integration) => {
    const availableOnly = selectedCategory === "Available sources";
    const connectedOnly = selectedCategory === "Connected sources";
    const disconnectedOnly = selectedCategory === "Disconnected sources";
    const categoryMatch = availableOnly || connectedOnly || disconnectedOnly || selectedCategory === "All" || integration.category === selectedCategory;
    const statusMatch = (availableOnly && integration.status === "Available")
      || (connectedOnly && integration.status === "Connected")
      || (disconnectedOnly && integration.status === "Disconnected")
      || (!availableOnly && !connectedOnly && !disconnectedOnly);
    const nameMatch = q === "" || integration.name.toLowerCase().includes(q);
    return categoryMatch && statusMatch && nameMatch;
  });

  const pinnedIntegration = filtered.find((integration) => integration.id === "lexer-api");
  const filteredWithoutPinned = filtered.filter((integration) => integration.id !== "lexer-api");

  const sortValue = (
    integration: IntegrationRecord,
    key: "name" | "category" | "syncDirection" | "summary" | "updated" | "status",
  ) => {
    if (key === "syncDirection") return syncDirectionForCategory(integration.category).toLowerCase();
    return integration[key].toLowerCase();
  };

  const onSort = (key: "name" | "category" | "syncDirection" | "summary" | "updated" | "status") => {
    if (sortKey === key) {
      setSortDir((prev) => (prev === "asc" ? "desc" : "asc"));
      return;
    }
    setSortKey(key);
    setSortDir("asc");
  };

  const sorted = [...filteredWithoutPinned].sort((a, b) => {
    const left = sortValue(a, sortKey);
    const right = sortValue(b, sortKey);
    const result = left.localeCompare(right);
    if (result === 0) return a.name.localeCompare(b.name);
    return sortDir === "asc" ? result : -result;
  });

  const openIntegration = openIntegrationId ? integrations.find((integration) => integration.id === openIntegrationId) : null;

  useEffect(() => {
    setShowAccountFrame(false);
    setAccountFrameExpanded(false);
  }, [openIntegrationId]);

  useEffect(() => {
    if (openIntegrationId !== "meta-ads" || !showAccountFrame) return;
    setOfflineEventSetsByIntegration((prev) => {
      const current = prev["meta-ads"] ?? [];
      if (current.length > 0) return prev;
      return {
        ...prev,
        "meta-ads": [createOfflineEventSetDraft(0)],
      };
    });
  }, [openIntegrationId, showAccountFrame]);

  useEffect(() => {
    if (openIntegrationId !== "meta-ads" || !showAccountFrame) return;
    setOnlineEventSetsByIntegration((prev) => {
      const current = prev["meta-ads"] ?? [];
      if (current.length > 0) return prev;
      return {
        ...prev,
        "meta-ads": [createOnlineEventSetDraft(0)],
      };
    });
  }, [openIntegrationId, showAccountFrame]);

  useEffect(() => {
    if (!showAccountFrame) return;

    const onPointerDown = (event: MouseEvent) => {
      const frame = accountFrameRef.current;
      if (!frame) return;
      if (frame.contains(event.target as Node)) return;
      setShowAccountFrame(false);
      setAccountFrameExpanded(false);
    };

    document.addEventListener("mousedown", onPointerDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
    };
  }, [showAccountFrame]);

  const countFor = (category: string) => {
    if (category === "Available sources") return integrations.filter((integration) => integration.status === "Available").length;
    if (category === "Connected sources") return integrations.filter((integration) => integration.status === "Connected").length;
    if (category === "Disconnected sources") return integrations.filter((integration) => integration.status === "Disconnected").length;
    if (category === "All") return integrations.length;
    return integrations.filter((integration) => integration.category === category).length;
  };

  const SortHeader = ({ label, keyName, className }: { label: string; keyName: "name" | "category" | "syncDirection" | "summary" | "updated" | "status"; className?: string }) => {
    const active = sortKey === keyName;
    return (
      <TableHead className={className}>
        <button
          onClick={() => onSort(keyName)}
          className="inline-flex items-center gap-1.5 text-left text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          <span>{label}</span>
          {active ? <RiArrowDownSLine className={cn("size-4", sortDir === "asc" && "rotate-180")} /> : <RiArrowUpDownLine className="size-3.5" />}
        </button>
      </TableHead>
    );
  };

  const renderAccountEditor = (integration: IntegrationRecord, mode: "docked" | "expanded") => {
    const draft = getAccountDraft(integration);
    const inputBgClass = mode === "docked" ? "bg-card" : "bg-background";
    const showApiCredentials = integration.id !== "meta-ads";
    const showOfflineEventSets = integration.id === "meta-ads";
    const offlineEventSets = offlineEventSetsByIntegration[integration.id] ?? [];
    const canAddOfflineEventSet = offlineEventSets.some((eventSet) => eventSet.saved);
    const onlineEventSets = onlineEventSetsByIntegration[integration.id] ?? [];
    const canAddOnlineEventSet = onlineEventSets.some((eventSet) => eventSet.saved);
    const activeAccountId = activeAccountIdByIntegration[integration.id] ?? null;
    const connected = activeAccountId != null && (connectedAccountsByIntegration[integration.id] ?? []).some((account) => account.id === activeAccountId);
    const isDisconnectedIntegration = integration.status === "Disconnected";
    const isReconnectAction = isDisconnectedIntegration && connected;
    const connectButtonDisabled = connected && !isReconnectAction;

    return (
      <>
        <div className="space-y-2 rounded-lg border border-border bg-background p-2.5">
          <div>
            <p className="text-[11px] font-semibold text-muted-foreground">Account Name</p>
            <Input
              value={draft.accountName}
              onChange={(e) => updateAccountDraft(integration.id, "accountName", e.target.value)}
              className={cn("mt-0.5 h-8", inputBgClass)}
            />
          </div>
          <div>
            <p className="text-[11px] font-semibold text-muted-foreground">Username</p>
            <Input
              value={draft.username}
              onChange={(e) => updateAccountDraft(integration.id, "username", e.target.value)}
              className={cn("mt-0.5 h-8 font-mono text-xs", inputBgClass)}
            />
          </div>
          <div>
            <p className="text-[11px] font-semibold text-muted-foreground">Password</p>
            <Input
              type="password"
              value={draft.password}
              onChange={(e) => updateAccountDraft(integration.id, "password", e.target.value)}
              className={cn("mt-0.5 h-8 font-mono text-xs", inputBgClass)}
            />
          </div>
          {showApiCredentials ? (
            <>
              <div>
                <p className="text-[11px] font-semibold text-muted-foreground">API key</p>
                <Input
                  value={draft.apiKey}
                  onChange={(e) => updateAccountDraft(integration.id, "apiKey", e.target.value)}
                  className={cn("mt-0.5 h-8 font-mono text-xs", inputBgClass)}
                />
              </div>
              <div>
                <p className="text-[11px] font-semibold text-muted-foreground">Secret key</p>
                <Input
                  value={draft.secretKey}
                  onChange={(e) => updateAccountDraft(integration.id, "secretKey", e.target.value)}
                  className={cn("mt-0.5 h-8 font-mono text-xs", inputBgClass)}
                />
              </div>
            </>
          ) : null}

          <div className="mt-2 flex items-center justify-end gap-2 border-t border-border pt-2">
            <Button variant="outline" size={mode === "docked" ? "sm" : undefined} onClick={() => saveAccountDraft(integration.id)}>Save</Button>
            {connected ? (
              <Button variant="destructive" size={mode === "docked" ? "sm" : undefined} onClick={() => setPendingDisconnectIntegrationId(integration.id)}>Remove</Button>
            ) : (
              <Button variant="destructive" size={mode === "docked" ? "sm" : undefined} onClick={() => setCancelConfirmOpen(true)}>Cancel</Button>
            )}
            <Button
              size={mode === "docked" ? "sm" : undefined}
              className={cn("bg-emerald-600 text-white hover:bg-emerald-700", connectButtonDisabled && "pointer-events-none opacity-60")}
              disabled={connectButtonDisabled}
              onClick={() => connectIntegration(integration.id)}
            >
              {isReconnectAction ? "Reconnect" : connected ? "Connected" : "Connect"}
            </Button>
          </div>
        </div>

        {showOfflineEventSets ? (
          <div className="space-y-2 rounded-lg border border-border bg-background p-2.5">
            <p className="text-[11px] font-semibold text-muted-foreground">Offline event sets</p>

            {offlineEventSets.map((eventSet) => (
              <div key={eventSet.id} className="rounded-lg border border-border bg-card">
                <button
                  type="button"
                  onClick={() => toggleOfflineEventSetExpanded(integration.id, eventSet.id)}
                  className="flex w-full items-center justify-between px-3 py-2 text-left"
                >
                  <span className="text-xs font-medium text-foreground">{eventSet.title}</span>
                  <RiArrowDownSLine className={cn("size-4 text-muted-foreground transition-transform", eventSet.expanded && "rotate-180")} />
                </button>

                {eventSet.expanded ? (
                  <div className="space-y-2 border-t border-border px-3 pb-3 pt-2">
                    <div>
                      <p className="text-[11px] font-semibold text-muted-foreground">Conversion tracking</p>
                      <Input
                        value={eventSet.conversionTracking}
                        onChange={(e) => updateOfflineEventSet(integration.id, eventSet.id, "conversionTracking", e.target.value)}
                        className={cn("mt-0.5 h-8", inputBgClass)}
                      />
                    </div>

                    <div>
                      <p className="text-[11px] font-semibold text-muted-foreground">Dataset</p>
                      <select
                        value={eventSet.dataset}
                        onChange={(e) => updateOfflineEventSet(integration.id, eventSet.id, "dataset", e.target.value)}
                        className={cn(
                          "mt-0.5 h-8 w-full rounded-md border border-border px-2 text-xs text-foreground outline-none ring-offset-background",
                          "focus:ring-2 focus:ring-ring focus:ring-offset-1",
                          inputBgClass,
                        )}
                      >
                        {CAPI_DATASETS.map((dataset) => (
                          <option key={dataset} value={dataset}>{dataset}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <p className="text-[11px] font-semibold text-muted-foreground">Tracking/Pixel ID</p>
                      <Input
                        value={eventSet.trackingPixelId}
                        onChange={(e) => updateOfflineEventSet(integration.id, eventSet.id, "trackingPixelId", e.target.value)}
                        className={cn("mt-0.5 h-8 font-mono text-xs", inputBgClass)}
                      />
                    </div>

                    <div className="mt-2 flex items-center justify-end gap-2 border-t border-border pt-2">
                      <Button
                        variant="outline"
                        size={mode === "docked" ? "sm" : undefined}
                        disabled={!eventSet.saved}
                        onClick={() => disconnectOfflineEventSet(integration.id, eventSet.id)}
                      >
                        {eventSet.disconnected ? "Disconnected" : "Disconnect"}
                      </Button>
                      <Button
                        variant="destructive"
                        size={mode === "docked" ? "sm" : undefined}
                        disabled={!eventSet.saved}
                        onClick={() => removeOfflineEventSet(integration.id, eventSet.id)}
                      >
                        Remove
                      </Button>
                      <Button
                        size={mode === "docked" ? "sm" : undefined}
                        disabled={eventSet.saved}
                        onClick={() => saveOfflineEventSet(integration.id, eventSet.id)}
                      >
                        {eventSet.saved ? "Saved!" : "Save"}
                      </Button>
                    </div>
                  </div>
                ) : null}
              </div>
            ))}

            {canAddOfflineEventSet ? (
              <Button
                variant="outline"
                size={mode === "docked" ? "sm" : undefined}
                className="w-full"
                onClick={() => addOfflineEventSet(integration.id)}
              >
                New Offline Event Set
              </Button>
            ) : null}
          </div>
        ) : null}

        {showOfflineEventSets ? (
          <div className="space-y-2 rounded-lg border border-border bg-background p-2.5">
            <p className="text-[11px] font-semibold text-muted-foreground">Online event sets</p>

            {onlineEventSets.map((eventSet) => (
              <div key={eventSet.id} className="rounded-lg border border-border bg-card">
                <button
                  type="button"
                  onClick={() => toggleOnlineEventSetExpanded(integration.id, eventSet.id)}
                  className="flex w-full items-center justify-between px-3 py-2 text-left"
                >
                  <span className="text-xs font-medium text-foreground">{eventSet.title}</span>
                  <RiArrowDownSLine className={cn("size-4 text-muted-foreground transition-transform", eventSet.expanded && "rotate-180")} />
                </button>

                {eventSet.expanded ? (
                  <div className="space-y-2 border-t border-border px-3 pb-3 pt-2">
                    <div>
                      <p className="text-[11px] font-semibold text-muted-foreground">Conversion tracking</p>
                      <Input
                        value={eventSet.conversionTracking}
                        onChange={(e) => updateOnlineEventSet(integration.id, eventSet.id, "conversionTracking", e.target.value)}
                        className={cn("mt-0.5 h-8", inputBgClass)}
                      />
                    </div>

                    <div>
                      <p className="text-[11px] font-semibold text-muted-foreground">Dataset</p>
                      <select
                        value={eventSet.dataset}
                        onChange={(e) => updateOnlineEventSet(integration.id, eventSet.id, "dataset", e.target.value)}
                        className={cn(
                          "mt-0.5 h-8 w-full rounded-md border border-border px-2 text-xs text-foreground outline-none ring-offset-background",
                          "focus:ring-2 focus:ring-ring focus:ring-offset-1",
                          inputBgClass,
                        )}
                      >
                        {CAPI_DATASETS.map((dataset) => (
                          <option key={dataset} value={dataset}>{dataset}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <p className="text-[11px] font-semibold text-muted-foreground">Tracking/Pixel ID</p>
                      <Input
                        value={eventSet.trackingPixelId}
                        onChange={(e) => updateOnlineEventSet(integration.id, eventSet.id, "trackingPixelId", e.target.value)}
                        className={cn("mt-0.5 h-8 font-mono text-xs", inputBgClass)}
                      />
                    </div>

                    <div className="mt-2 flex items-center justify-end gap-2 border-t border-border pt-2">
                      <Button
                        variant="outline"
                        size={mode === "docked" ? "sm" : undefined}
                        disabled={!eventSet.saved}
                        onClick={() => disconnectOnlineEventSet(integration.id, eventSet.id)}
                      >
                        {eventSet.disconnected ? "Disconnected" : "Disconnect"}
                      </Button>
                      <Button
                        variant="destructive"
                        size={mode === "docked" ? "sm" : undefined}
                        disabled={!eventSet.saved}
                        onClick={() => removeOnlineEventSet(integration.id, eventSet.id)}
                      >
                        Remove
                      </Button>
                      <Button
                        size={mode === "docked" ? "sm" : undefined}
                        disabled={eventSet.saved}
                        onClick={() => saveOnlineEventSet(integration.id, eventSet.id)}
                      >
                        {eventSet.saved ? "Saved!" : "Save"}
                      </Button>
                    </div>
                  </div>
                ) : null}
              </div>
            ))}

            {canAddOnlineEventSet ? (
              <Button
                variant="outline"
                size={mode === "docked" ? "sm" : undefined}
                className="w-full"
                onClick={() => addOnlineEventSet(integration.id)}
              >
                New Online Event Set
              </Button>
            ) : null}
          </div>
        ) : null}
      </>
    );
  };

  const renderAddAccountFrame = (integration: IntegrationRecord, mode: "docked" | "expanded") => {
    const connectedAccounts = connectedAccountsByIntegration[integration.id] ?? [];
    const activeAccountId = activeAccountIdByIntegration[integration.id] ?? null;
    const frameClass = mode === "docked"
      ? "rounded-lg border border-border bg-background p-3"
      : "rounded-xl border border-border bg-card p-4";
    const buttonSize = mode === "docked" ? "sm" : undefined;

    return (
      <div className={frameClass}>
        <p className="text-xs font-medium text-muted-foreground">Add account</p>
        <Button size={buttonSize} className="mt-3 w-full" variant="outline" onClick={() => handleAddNewAccount(integration)}>
          {`Add New ${integration.name} Account`}
        </Button>

        {connectedAccounts.length > 0 && (
          <div className="mt-3 rounded-lg border border-border bg-muted/20 p-2">
            <p className="px-1 text-[11px] font-semibold text-muted-foreground">Connected accounts</p>
            <div className="mt-1 max-h-32 space-y-1 overflow-y-auto">
              {connectedAccounts.map((account) => (
                <button
                  key={account.id}
                  onClick={() => selectConnectedAccount(integration, account.id)}
                  className={cn(
                    "flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left text-xs transition-colors",
                    activeAccountId === account.id
                      ? "bg-accent text-foreground"
                      : "text-foreground-secondary hover:bg-muted hover:text-foreground",
                  )}
                >
                  <span className="truncate pr-2">{account.accountName}</span>
                  {integration.status === "Disconnected" ? (
                    <RiCloseLine className="size-3.5 shrink-0 text-red-600" />
                  ) : (
                    <RiCheckLine className="size-3.5 shrink-0 text-emerald-600" />
                  )}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderIntegrationRow = (integration: IntegrationRecord) => (
    <TableRow
      key={integration.id}
      onClick={() => setOpenIntegrationId(integration.id)}
      className={cn("cursor-pointer", openIntegrationId === integration.id && "bg-accent/40")}
    >
      <TableCell>
        <div className="inline-flex items-center gap-2">
          <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <RiPlugLine className="size-4" />
          </span>
          <span className="font-medium text-foreground">{integration.name}</span>
          {integration.id === "lexer-api" && <Badge variant="default" size="sm">Pinned</Badge>}
        </div>
      </TableCell>
      <TableCell><Badge variant="default" size="sm">{integration.category}</Badge></TableCell>
      <TableCell>
        <span className="inline-flex items-center gap-1.5 text-sm text-foreground-secondary">
          {syncDirectionIcon(syncDirectionForCategory(integration.category))}
          <span>{syncDirectionForCategory(integration.category)}</span>
        </span>
      </TableCell>
      <TableCell className="border-r border-border text-sm text-foreground-secondary">{integration.summary}</TableCell>
      <TableCell>
        <Badge
          variant={integration.status === "Connected" ? "success" : "outline"}
          size="sm"
          className={cn(
            integration.status === "Available" && "bg-foreground/70 text-background ring-foreground/30",
            integration.status === "Disconnected" && "border-red-200 bg-red-50 text-red-700 ring-red-200",
          )}
        >
          {integration.status}
        </Badge>
      </TableCell>
      <TableCell className="text-sm text-muted-foreground">{integration.updated}</TableCell>
    </TableRow>
  );

  const groupedRows: React.ReactNode[] = [];
  let currentCategory: string | null = null;

  if (pinnedIntegration) groupedRows.push(renderIntegrationRow(pinnedIntegration));
  for (const integration of sorted) {
    if (integration.category !== currentCategory) {
      currentCategory = integration.category;
      groupedRows.push(
        <TableRow key={`category-${currentCategory}`}>
          <TableCell colSpan={6} className="bg-muted/30 py-2 text-xs font-semibold text-foreground-secondary">
            {currentCategory}
          </TableCell>
        </TableRow>,
      );
    }
    groupedRows.push(renderIntegrationRow(integration));
  }

  return (
    <div className={cn("relative flex h-full flex-col px-6 py-6", onboarding && "pb-24")}>
      <div className="mb-4 flex flex-col gap-1">
        <h1 className="text-xl font-semibold text-foreground">Integrations</h1>
        <p className="text-sm text-foreground-secondary">Manage connected systems that power your definitions, metrics, and sources.</p>
      </div>

      {onboarding?.disclaimerVisible && (
        <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          {onboarding.disclaimerText}
        </div>
      )}

      <div className="min-h-0 flex flex-1 gap-4 overflow-hidden">
        <aside className="w-56 shrink-0 overflow-y-auto rounded-xl border border-border bg-card p-2">
          <p className="px-2 pb-2 pt-1 text-xs font-semibold text-muted-foreground">Categories</p>
          <ul className="flex list-none flex-col gap-1">
            {categories.map((category) => {
              const active = category === selectedCategory;
              return (
                <li key={category}>
                  <button
                    onClick={() => setSelectedCategory(category)}
                    className={cn(
                      "flex w-full items-center justify-between rounded-lg px-2 py-1.5 text-left text-sm transition-colors",
                      active ? "bg-accent text-foreground" : "text-foreground-secondary hover:bg-muted hover:text-foreground",
                    )}
                  >
                    <span className="truncate">{category}</span>
                    <span className="text-xs tabular-nums text-muted-foreground">{countFor(category)}</span>
                  </button>
                  {category === "Disconnected sources" && <div className="my-2 border-b border-border" />}
                </li>
              );
            })}
          </ul>
        </aside>

        <div className="min-w-0 flex-1 overflow-y-auto">
          <div className="mb-3">
            <div className="relative max-w-md">
              <RiSearchLine className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search integration names"
                className="h-9 pl-8"
              />
            </div>
          </div>

          <div className="overflow-hidden rounded-xl border border-border bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <SortHeader label="Integration" keyName="name" />
                  <SortHeader label="Category" keyName="category" className="w-40" />
                  <SortHeader label="Sync direction" keyName="syncDirection" className="w-44" />
                  <SortHeader label="Description" keyName="summary" className="border-r border-border" />
                  <SortHeader label="Status" keyName="status" className="w-40" />
                  <SortHeader label="Last sync" keyName="updated" className="w-40" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {groupedRows}
                {groupedRows.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="py-8 text-center text-sm text-muted-foreground">
                      No integrations match this search and category.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </div>

        {openIntegration && !panelExpanded && (
          <button
            className="fixed inset-0 z-30 cursor-default bg-transparent"
            aria-label="Close integration panel"
            onClick={() => setOpenIntegrationId(null)}
          />
        )}

        {openIntegration && !panelExpanded && (
          <div className="relative z-40 w-[31.25rem] shrink-0 overflow-y-auto rounded-xl border border-border bg-card">
            <div className="sticky top-0 z-10 border-b border-border bg-card px-4 py-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs font-medium text-muted-foreground">Integration details</p>
                  <h2 className="mt-0.5 truncate text-sm font-semibold text-foreground">{openIntegration.name}</h2>
                </div>
                <div className="flex flex-col items-end gap-1.5">
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setPanelExpanded(true)}
                      className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                      title="Expand panel"
                      aria-label="Expand panel"
                    >
                      <RiExpandDiagonalLine className="size-4" />
                    </button>
                    <button
                      onClick={() => setOpenIntegrationId(null)}
                      className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                      title="Close panel"
                      aria-label="Close panel"
                    >
                      <RiCloseLine className="size-4" />
                    </button>
                  </div>
                  <Badge
                    variant={openIntegration.status === "Connected" ? "success" : "outline"}
                    size="sm"
                    className={cn(
                      openIntegration.status === "Available" && "bg-foreground/70 text-background ring-foreground/30",
                      openIntegration.status === "Disconnected" && "border-red-200 bg-red-50 text-red-700 ring-red-200",
                    )}
                  >
                    {openIntegration.status}
                  </Badge>
                </div>
              </div>
            </div>

            <div className="space-y-4 p-4">
              {(() => {
                return (
                  <>
                    <div className="grid grid-cols-1 gap-3">
                      {openIntegration.status === "Disconnected" && (
                        <div className="rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">
                          This account has disconnected and needs to be reconnected to avoid disruption.
                        </div>
                      )}

                      <div className="space-y-3">
                        <div className="grid grid-cols-2 gap-3">
                          <div className="rounded-lg border border-border bg-background p-3">
                            <p className="text-[11px] font-semibold text-muted-foreground">Category</p>
                            <p className="mt-0.5 text-sm text-foreground">{openIntegration.category}</p>
                          </div>
                          <div className="rounded-lg border border-border bg-background p-3">
                            <p className="text-[11px] font-semibold text-muted-foreground">Sync direction</p>
                            <div className="mt-0.5 inline-flex items-center gap-1.5 text-sm text-foreground-secondary">
                              {syncDirectionIcon(syncDirectionForCategory(openIntegration.category))}
                              <span>{syncDirectionForCategory(openIntegration.category)}</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="rounded-lg border border-border bg-background p-3">
                        <p className="text-xs font-medium text-muted-foreground">Description</p>
                        <p className="mt-1 text-sm text-foreground-secondary">{openIntegration.summary}</p>
                      </div>

                      {showAccountFrame ? (
                        accountFrameExpanded ? (
                          <div className="grid grid-cols-2 gap-3">
                            <div ref={accountFrameRef} className="col-span-2 flex h-full flex-col rounded-lg border border-border bg-background p-3">
                              <div className="flex items-center justify-between gap-2">
                                <p className="text-xs font-medium text-muted-foreground">Account details</p>
                                <div className="flex items-center gap-1">
                                  <button
                                    onClick={() => setAccountFrameExpanded(false)}
                                    className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                                    title="Collapse account details"
                                    aria-label="Collapse account details"
                                  >
                                    <RiFullscreenExitLine className="size-4" />
                                  </button>
                                  <button
                                    onClick={() => {
                                      setShowAccountFrame(false);
                                      setAccountFrameExpanded(false);
                                    }}
                                    className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                                    title="Close account details"
                                    aria-label="Close account details"
                                  >
                                    <RiCloseLine className="size-4" />
                                  </button>
                                </div>
                              </div>
                              <div className="mt-2 space-y-2">
                                {renderAccountEditor(openIntegration, "docked")}
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="grid grid-cols-2 gap-3">
                            {renderAddAccountFrame(openIntegration, "docked")}
                            <div ref={accountFrameRef} className="flex h-full flex-col rounded-lg border border-border bg-background p-3">
                              <div className="flex items-center justify-between gap-2">
                                <p className="text-xs font-medium text-muted-foreground">Account details</p>
                                <div className="flex items-center gap-1">
                                  <button
                                    onClick={() => setAccountFrameExpanded(true)}
                                    className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                                    title="Expand account details"
                                    aria-label="Expand account details"
                                  >
                                    <RiExpandDiagonalLine className="size-4" />
                                  </button>
                                  <button
                                    onClick={() => {
                                      setShowAccountFrame(false);
                                      setAccountFrameExpanded(false);
                                    }}
                                    className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                                    title="Close account details"
                                    aria-label="Close account details"
                                  >
                                    <RiCloseLine className="size-4" />
                                  </button>
                                </div>
                              </div>
                              <div className="mt-2 space-y-2">
                                {renderAccountEditor(openIntegration, "docked")}
                              </div>
                            </div>
                          </div>
                        )
                      ) : (
                        <div className="grid grid-cols-2 gap-3">
                          <div className="col-span-2">{renderAddAccountFrame(openIntegration, "docked")}</div>
                        </div>
                      )}

                      <div className="rounded-lg border border-border bg-background p-3">
                        <p className="text-xs font-medium text-muted-foreground">Sync Log</p>
                        <div className="mt-2">
                          <p className="text-sm text-foreground-secondary">{openIntegration.updated}</p>
                        </div>
                      </div>
                    </div>

                  </>
                );
              })()}
            </div>
          </div>
        )}

        {openIntegration && panelExpanded && (
          <div className="absolute inset-0 z-50 bg-background">
            <div className="flex h-full flex-col">
              <div className="border-b border-border px-6 py-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-muted-foreground">Integration details</p>
                    <h2 className="mt-0.5 truncate text-base font-semibold text-foreground">{openIntegration.name}</h2>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setPanelExpanded(false)}
                      className="inline-flex items-center gap-1 rounded-lg border border-border px-2.5 py-1.5 text-sm text-foreground-secondary transition-colors hover:bg-muted hover:text-foreground"
                      title="Collapse panel"
                      aria-label="Collapse panel"
                    >
                      <RiFullscreenExitLine className="size-4" />
                      <span>Collapse</span>
                    </button>
                    <button
                      onClick={() => {
                        setPanelExpanded(false);
                        setOpenIntegrationId(null);
                      }}
                      className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                      title="Close panel"
                      aria-label="Close panel"
                    >
                      <RiCloseLine className="size-4" />
                    </button>
                  </div>
                </div>
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
                {(() => {
                  return (
                    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                      {openIntegration.status === "Disconnected" && (
                        <div className="rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700 lg:col-span-2">
                          This account has disconnected and needs to be reconnected to avoid disruption.
                        </div>
                      )}

                      <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="rounded-xl border border-border bg-card p-4">
                            <p className="text-[11px] font-semibold text-muted-foreground">Category</p>
                            <p className="mt-0.5 text-sm text-foreground">{openIntegration.category}</p>
                          </div>
                          <div className="rounded-xl border border-border bg-card p-4">
                            <p className="text-[11px] font-semibold text-muted-foreground">Sync direction</p>
                            <div className="mt-0.5 inline-flex items-center gap-1.5 text-sm text-foreground-secondary">
                              {syncDirectionIcon(syncDirectionForCategory(openIntegration.category))}
                              <span>{syncDirectionForCategory(openIntegration.category)}</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="rounded-xl border border-border bg-card p-4 lg:col-span-2">
                        <p className="text-xs font-medium text-muted-foreground">Description</p>
                        <p className="mt-1 text-sm text-foreground-secondary">{openIntegration.summary}</p>
                      </div>

                      {showAccountFrame ? (
                        accountFrameExpanded ? (
                          <div className="grid grid-cols-1 gap-4 lg:col-span-2">
                            <div ref={accountFrameRef} className="flex h-full flex-col rounded-xl border border-border bg-card p-4">
                              <div className="flex items-center justify-between gap-2">
                                <p className="text-xs font-medium text-muted-foreground">Account details</p>
                                <div className="flex items-center gap-1">
                                  <button
                                    onClick={() => setAccountFrameExpanded(false)}
                                    className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                                    title="Collapse account details"
                                    aria-label="Collapse account details"
                                  >
                                    <RiFullscreenExitLine className="size-4" />
                                  </button>
                                  <button
                                    onClick={() => {
                                      setShowAccountFrame(false);
                                      setAccountFrameExpanded(false);
                                    }}
                                    className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                                    title="Close account details"
                                    aria-label="Close account details"
                                  >
                                    <RiCloseLine className="size-4" />
                                  </button>
                                </div>
                              </div>
                              <div className="mt-2 space-y-2">
                                {renderAccountEditor(openIntegration, "expanded")}
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="grid grid-cols-1 gap-4 lg:col-span-2">
                            {renderAddAccountFrame(openIntegration, "expanded")}
                            <div ref={accountFrameRef} className="flex h-full flex-col rounded-xl border border-border bg-card p-4">
                              <div className="flex items-center justify-between gap-2">
                                <p className="text-xs font-medium text-muted-foreground">Account details</p>
                                <div className="flex items-center gap-1">
                                  <button
                                    onClick={() => setAccountFrameExpanded(true)}
                                    className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                                    title="Expand account details"
                                    aria-label="Expand account details"
                                  >
                                    <RiExpandDiagonalLine className="size-4" />
                                  </button>
                                  <button
                                    onClick={() => {
                                      setShowAccountFrame(false);
                                      setAccountFrameExpanded(false);
                                    }}
                                    className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                                    title="Close account details"
                                    aria-label="Close account details"
                                  >
                                    <RiCloseLine className="size-4" />
                                  </button>
                                </div>
                              </div>
                              <div className="mt-2 space-y-2">
                                {renderAccountEditor(openIntegration, "expanded")}
                              </div>
                            </div>
                          </div>
                        )
                      ) : (
                        <div className="lg:col-span-2">{renderAddAccountFrame(openIntegration, "expanded")}</div>
                      )}

                      <div className="rounded-xl border border-border bg-card p-4 lg:col-span-2">
                        <p className="text-xs font-medium text-muted-foreground">Sync Log</p>
                        <div className="mt-2">
                          <p className="text-sm text-foreground-secondary">{openIntegration.updated}</p>
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>
          </div>
        )}
      </div>

      <ConfirmDialog
        open={cancelConfirmOpen}
        onOpenChange={setCancelConfirmOpen}
        variant="destructive"
        icon={RiProhibitedLine}
        title="Cancel and close integration setup?"
        description="If you cancel now, the panel will close and your work will not be saved."
        confirmLabel="Cancel and close"
        cancelLabel="Keep editing"
        onConfirm={() => {
          setPanelExpanded(false);
          setOpenIntegrationId(null);
        }}
      />

      <ConfirmDialog
        open={pendingDisconnectIntegrationId != null}
        onOpenChange={(open) => {
          if (!open) setPendingDisconnectIntegrationId(null);
        }}
        variant="destructive"
        icon={RiProhibitedLine}
        title="Remove account?"
        description="Are you sure you want to remove this account? This will cause a data disruption until the account is connected again."
        confirmLabel="Yes, remove"
        cancelLabel="Keep account"
        onConfirm={confirmDisconnectIntegration}
      />

      {onboarding && (
        <div className="sticky bottom-0 mt-4 flex items-center justify-end border-t border-border bg-background/95 pt-4 backdrop-blur">
          <Button onClick={onboarding.onNext} disabled={!onboarding.disclaimerVisible}>
            {onboarding.nextLabel}
            <RiArrowRightSLine className="size-4" />
          </Button>
        </div>
      )}

      {onboarding && !onboarding.disclaimerVisible && (
        <OnboardingLexiModal
          title={onboarding.promptTitle}
          description={onboarding.promptDescription}
          actionLabel={onboarding.actionLabel}
          onAction={onboarding.onAcknowledge}
        />
      )}
    </div>
  );
}

// ─── Sidebar ───────────────────────────────────────────────────────────────────

function Sidebar({
  collapsed,
  page,
  playbookSection,
  activationFilter,
  pinnedChatIds,
  onTogglePinnedChat,
  onSelectActivationFilter,
  onOpenGlossary,
  onOpenRules,
  onNavigate,
}: {
  collapsed: boolean;
  page: Page;
  playbookSection: PlaybookSection;
  activationFilter: ActivationNavFilter;
  pinnedChatIds: string[];
  onTogglePinnedChat: (id: string) => void;
  onSelectActivationFilter: (status: ActivationNavFilter) => void;
  onOpenGlossary: () => void;
  onOpenRules: () => void;
  onNavigate: (p: Page) => void;
}) {
  const { state, dispatch } = useSession();
  const inSegments = page === "segments" || page === "segment-detail";
  const inActivations = page === "activations";
  const [activationsOpen, setActivationsOpen] = useState(false);
  const activationCount = {
    all: state.activations.length,
    live: state.activations.filter((a) => a.status === "live").length,
    scheduled: state.activations.filter((a) => a.status === "scheduled").length,
    "awaiting-approval": state.activations.filter((a) => a.status === "awaiting-approval").length,
    sent: state.activations.filter((a) => a.status === "sent").length,
    completed: state.activations.filter((a) => a.status === "completed").length,
  } as const;

  const newChat = () => {
    dispatch({ type: "NEW_CHAT" });
    onNavigate("chat");
  };
  const kickoffWorkflowChat = (prompt: string) => {
    dispatch({ type: "SELECT_CONVERSATION", id: DEFAULT_CONVERSATION_ID, autoStart: false });
    onNavigate("chat");
    // Let the chat panel mount/reset first, then inject the guided kickoff prompt.
    window.setTimeout(() => {
      window.dispatchEvent(new CustomEvent("prototype-master:start-next-turn", { detail: { text: prompt } }));
    }, 50);
  };
  const startNewSegmentWorkflow = () => kickoffWorkflowChat("Build a new segment");
  const startNewActivationWorkflow = () => kickoffWorkflowChat("Build a new activation");
  const pinnedWorkflowChats: Array<{ id: string; title: string; onClick: () => void }> = [
    { id: "workflow-build-activation", title: "Build a new activation", onClick: startNewActivationWorkflow },
    { id: "workflow-build-segment", title: "Build a new segment", onClick: startNewSegmentWorkflow },
  ];
  const openConversation = (id: string) => {
    dispatch({ type: "SELECT_CONVERSATION", id });
    onNavigate("chat");
  };
  const pinnedChats = CONVERSATIONS.filter((conversation) => pinnedChatIds.includes(conversation.id));
  const recentChats = CONVERSATIONS.filter((conversation) => !pinnedChatIds.includes(conversation.id));
  // "New Chat" is the active row only on a fresh, unselected chat.
  const onNewChat = page === "chat" && state.activeConversationId == null;

  return (
    <div className={cn("flex h-full shrink-0 flex-col overflow-hidden bg-sidebar p-2 transition-[width] duration-200", collapsed ? "w-14" : "w-[16rem]")}>
      <div className="flex h-full flex-col overflow-hidden rounded-lg bg-sidebar">
        <div className={cn("flex items-center p-2", collapsed && "justify-center")}>
          <LexerLogo collapsed={collapsed} tone="primary" size="lg" label="prototype onboarding" />
        </div>
        <div className={cn("flex flex-1 flex-col gap-4 overflow-y-auto py-2", collapsed ? "px-0" : "px-2")}>
          <ul className="flex list-none flex-col gap-0.5">
            <li><NavRow icon={RiAddLine} label="New Chat" main collapsed={collapsed} active={onNewChat} onClick={newChat} /></li>
            <li>
              <NavRow
                icon={RiGroupLine}
                label="Segments"
                collapsed={collapsed}
                active={inSegments}
                onClick={() => onNavigate("segments")}
              />
            </li>
            <li>
              <NavRow
                icon={RiBroadcastLine}
                label="Activations"
                collapsed={collapsed}
                active={collapsed ? inActivations : inActivations && !activationsOpen}
                onClick={() => onSelectActivationFilter("all")}
                trailingToggle={!collapsed ? <RiArrowRightSLine className={cn("size-4 shrink-0 text-sidebar-foreground/40 transition-transform", activationsOpen && "rotate-90")} /> : undefined}
                onTrailingToggle={!collapsed ? () => setActivationsOpen((o) => !o) : undefined}
                trailingToggleLabel="Toggle activation filters"
              />
              {!collapsed && activationsOpen && (
                <ul className="mt-0.5 flex list-none flex-col gap-0.5 pl-9">
                  <li><SubNavRow label="All activations" active={inActivations && activationFilter === "all"} onClick={() => onSelectActivationFilter("all")} /></li>
                  {activationCount.live > 0 && <li><SubNavRow label="Live" active={inActivations && activationFilter === "live"} onClick={() => onSelectActivationFilter("live")} /></li>}
                  {activationCount.scheduled > 0 && <li><SubNavRow label="Scheduled" active={inActivations && activationFilter === "scheduled"} onClick={() => onSelectActivationFilter("scheduled")} /></li>}
                  {activationCount["awaiting-approval"] > 0 && <li><SubNavRow label="Awaiting approval" active={inActivations && activationFilter === "awaiting-approval"} onClick={() => onSelectActivationFilter("awaiting-approval")} /></li>}
                  {activationCount.sent > 0 && <li><SubNavRow label="Sent" active={inActivations && activationFilter === "sent"} onClick={() => onSelectActivationFilter("sent")} /></li>}
                  {activationCount.completed > 0 && <li><SubNavRow label="Completed" active={inActivations && activationFilter === "completed"} onClick={() => onSelectActivationFilter("completed")} /></li>}
                </ul>
              )}
            </li>
            <li><NavRow icon={RiDashboardLine} label="Dashboards (WIP)" collapsed={collapsed} active={page === "dashboards"} onClick={() => onNavigate("dashboards")} /></li>
            {!collapsed && (
              <li>
                <div className="px-3 pb-1 pt-2 text-[11px] font-semibold text-sidebar-foreground/60">Pinned Chats</div>
                <ul className="max-h-[11.25rem] overflow-y-auto pr-1">
                  {pinnedWorkflowChats.map((chat) => (
                    <li key={chat.id}>
                      <RecentRow
                        title={chat.title}
                        meta="Workflow"
                        pinned
                        active={false}
                        onClick={chat.onClick}
                        showPinToggle={false}
                      />
                    </li>
                  ))}
                  {pinnedChats.length > 0 ? pinnedChats.map((c) => (
                    <li key={c.id}>
                      <RecentRow
                        title={c.title}
                        meta={c.updatedLabel}
                        pinned
                        active={page === "chat" && state.activeConversationId === c.id}
                        onClick={() => openConversation(c.id)}
                        onTogglePin={() => onTogglePinnedChat(c.id)}
                      />
                    </li>
                  )) : pinnedWorkflowChats.length === 0 ? (
                    <li className="px-3 py-2 text-xs text-sidebar-foreground/50">No pinned chats yet.</li>
                  ) : null}
                </ul>
                <div className="px-3 pb-1 pt-2 text-[11px] font-semibold text-sidebar-foreground/60">Recent Chats</div>
                <ul className="max-h-[11.25rem] overflow-y-auto pr-1">
                  {recentChats.map((c) => (
                    <li key={c.id}>
                      <RecentRow
                        title={c.title}
                        meta={c.updatedLabel}
                        pinned={false}
                        active={page === "chat" && state.activeConversationId === c.id}
                        onClick={() => openConversation(c.id)}
                        onTogglePin={() => onTogglePinnedChat(c.id)}
                      />
                    </li>
                  ))}
                </ul>
              </li>
            )}
          </ul>
        </div>
        <div className="space-y-2 p-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              {collapsed ? (
                <button className="flex w-full justify-center rounded-lg py-0.5 transition-colors hover:bg-sidebar-accent">
                  <Avatar initials={MOCK_USER.initials} size="sm" />
                </button>
              ) : (
                <button className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left transition-colors hover:bg-sidebar-accent">
                  <Avatar initials={MOCK_USER.initials} size="sm" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-semibold text-sidebar-foreground">{MOCK_USER.firstName}</p>
                    <p className="truncate text-xs text-sidebar-foreground/60">{MOCK_USER.org}</p>
                  </div>
                  <RiArrowUpDownLine className="size-3.5 shrink-0 text-sidebar-foreground/40" />
                </button>
              )}
            </DropdownMenuTrigger>
            <DropdownMenuContent align={collapsed ? "center" : "end"} side="top" className="w-56">
              <DropdownMenuLabel>
                <div className="flex flex-col">
                  <span className="text-sm font-semibold text-foreground">{MOCK_USER.firstName}</span>
                  <span className="text-xs text-muted-foreground">{MOCK_USER.org}</span>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuSeparator />
              <DropdownMenuSub>
                <DropdownMenuPrimitive.SubTrigger
                  className={cn(
                    "relative flex cursor-default select-none items-center gap-2 rounded-md px-2.5 py-2 text-sm font-medium outline-none",
                    "focus:bg-accent focus:text-accent-foreground data-[state=open]:bg-accent data-[state=open]:text-accent-foreground",
                  )}
                >
                  <RiSettings3Line className="size-4 shrink-0 text-muted-foreground" />
                  <span className="flex-1">Settings</span>
                  <RiArrowRightSLine className="size-4 shrink-0 text-muted-foreground" />
                </DropdownMenuPrimitive.SubTrigger>
                <DropdownMenuPrimitive.Portal>
                  <DropdownMenuPrimitive.SubContent
                    sideOffset={6}
                    alignOffset={-4}
                    className={cn(
                      "z-50 min-w-44 overflow-hidden rounded-lg border border-border bg-popover p-1 text-popover-foreground shadow-lg",
                      "data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95",
                    )}
                  >
                    <DropdownMenuSub>
                      <DropdownMenuPrimitive.SubTrigger
                        className={cn(
                          "relative flex cursor-default select-none items-center gap-2 rounded-md px-2.5 py-2 text-sm font-medium outline-none",
                          "focus:bg-accent focus:text-accent-foreground data-[state=open]:bg-accent data-[state=open]:text-accent-foreground",
                        )}
                      >
                        <RiDatabase2Line className="size-4 shrink-0 text-muted-foreground" />
                        <span className="flex-1">Data</span>
                        <RiArrowRightSLine className="size-4 shrink-0 text-muted-foreground" />
                      </DropdownMenuPrimitive.SubTrigger>
                      <DropdownMenuPrimitive.Portal>
                        <DropdownMenuPrimitive.SubContent
                          sideOffset={6}
                          alignOffset={-4}
                          className={cn(
                            "z-50 min-w-44 overflow-hidden rounded-lg border border-border bg-popover p-1 text-popover-foreground shadow-lg",
                            "data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95",
                          )}
                        >
                          <DropdownMenuItem onSelect={() => onNavigate("definitions")}>Source Definitions</DropdownMenuItem>
                          <DropdownMenuItem onSelect={() => onNavigate("metrics")}>Calculated Defintions</DropdownMenuItem>
                          <DropdownMenuItem onSelect={onOpenGlossary}>Custom Definitions</DropdownMenuItem>
                          <DropdownMenuItem onSelect={onOpenRules}>Rules</DropdownMenuItem>
                          <DropdownMenuItem onSelect={() => onNavigate("sources")}>Sources</DropdownMenuItem>
                        </DropdownMenuPrimitive.SubContent>
                      </DropdownMenuPrimitive.Portal>
                    </DropdownMenuSub>
                    <DropdownMenuItem onSelect={() => onNavigate("integrations")}>Integrations</DropdownMenuItem>
                    <DropdownMenuItem onSelect={() => onNavigate("context")}>Context</DropdownMenuItem>
                    <DropdownMenuItem onSelect={() => onNavigate("users")}>Users</DropdownMenuItem>
                  </DropdownMenuPrimitive.SubContent>
                </DropdownMenuPrimitive.Portal>
              </DropdownMenuSub>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  );
}

// ─── Nav helper ────────────────────────────────────────────────────────────────
// Mirrors Shared brain v1's NavRow: circle-wrapped icon (filled for the primary
// "New" action), sidebar-active highlight, font-semibold, collapsed icon button.

function NavRow({
  icon: Icon,
  label,
  collapsed,
  active,
  main,
  trailing,
  trailingToggle,
  trailingToggleLabel,
  onClick,
  onTrailingToggle,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  collapsed: boolean;
  active?: boolean;
  main?: boolean;
  trailing?: React.ReactNode;
  trailingToggle?: React.ReactNode;
  trailingToggleLabel?: string;
  onClick?: () => void;
  onTrailingToggle?: () => void;
}) {
  if (!collapsed && trailingToggle && onTrailingToggle) {
    return (
      <div className="flex w-full items-center gap-1">
        <button
          onClick={onClick}
          title={collapsed ? label : undefined}
          className={cn(
            "flex min-w-0 flex-1 items-center gap-2 rounded-lg px-2 py-1.5 text-sm font-semibold transition-colors text-sidebar-foreground hover:bg-sidebar-accent",
            active && "bg-sidebar-active text-sidebar-active-foreground hover:bg-sidebar-active",
          )}
        >
          <span className={cn("flex size-6 shrink-0 items-center justify-center rounded-full", main && "bg-sidebar-primary text-sidebar-primary-foreground")}>
            <Icon className="size-4" />
          </span>
          <span className="flex-1 truncate text-left">{label}</span>
          {trailing}
        </button>
        <button
          onClick={onTrailingToggle}
          title={trailingToggleLabel}
          className={cn(
            "flex size-8 shrink-0 items-center justify-center rounded-lg transition-colors text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground",
            active && "bg-sidebar-active text-sidebar-active-foreground hover:bg-sidebar-active",
          )}
          aria-label={trailingToggleLabel}
        >
          {trailingToggle}
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={onClick}
      title={collapsed ? label : undefined}
      className={cn(
        "flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-sm font-semibold transition-colors text-sidebar-foreground hover:bg-sidebar-accent",
        active && "bg-sidebar-active text-sidebar-active-foreground hover:bg-sidebar-active",
        collapsed && "mx-auto size-9 justify-center px-0",
      )}
    >
      <span className={cn("flex size-6 shrink-0 items-center justify-center rounded-full", main && "bg-sidebar-primary text-sidebar-primary-foreground")}>
        <Icon className="size-4" />
      </span>
      {!collapsed && <span className="flex-1 truncate text-left">{label}</span>}
      {!collapsed && trailing}
    </button>
  );
}

function SubNavRow({
  label,
  active,
  trailing,
  onClick,
}: {
  label: string;
  active?: boolean;
  trailing?: React.ReactNode;
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm transition-colors",
        active ? "bg-sidebar-active font-medium text-sidebar-active-foreground" : "text-sidebar-foreground hover:bg-sidebar-accent",
      )}
    >
      <span className="flex-1 truncate">{label}</span>
      {trailing}
    </button>
  );
}

// A recent-conversation entry: title + faint timestamp, chat-bubble icon.
function RecentRow({
  title,
  meta,
  pinned,
  active,
  onClick,
  onTogglePin,
  showPinToggle = true,
}: {
  title: string;
  meta: string;
  pinned: boolean;
  active?: boolean;
  onClick?: () => void;
  onTogglePin?: () => void;
  showPinToggle?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex items-center gap-1 rounded-lg transition-colors",
        active ? "bg-sidebar-active text-sidebar-active-foreground" : "text-sidebar-foreground hover:bg-sidebar-accent",
      )}
    >
      <button
        onClick={onClick}
        title={title}
        className="flex min-w-0 flex-1 items-center gap-2 px-2 py-1.5 text-left"
      >
        <RiMessage2Line className={cn("size-4 shrink-0", active ? "text-sidebar-active-foreground" : "text-sidebar-foreground/40")} />
        <span className="min-w-0 flex-1 truncate text-sm">{title}</span>
        <span className="shrink-0 text-[11px] text-sidebar-foreground/40">{meta}</span>
      </button>
      {showPinToggle ? (
        <button
          onClick={onTogglePin}
          title={pinned ? "Unpin chat" : "Pin chat"}
          className={cn(
            "mr-1 inline-flex size-6 items-center justify-center rounded-md transition-colors",
            pinned
              ? "text-primary hover:bg-sidebar-accent"
              : "text-sidebar-foreground/40 hover:bg-sidebar-accent hover:text-sidebar-foreground/70"
          )}
        >
          <RiPushpinLine className="size-3.5" />
        </button>
      ) : (
        <span className="mr-2 inline-flex size-6 items-center justify-center text-primary/70">
          <RiPushpinLine className="size-3.5" />
        </span>
      )}
    </div>
  );
}
