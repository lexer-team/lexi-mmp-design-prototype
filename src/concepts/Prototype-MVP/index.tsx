import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { LexerLogo } from "@/components/layout/LexerLogo";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/Tabs";
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
  RiArrowDownSLine,
  RiSendPlane2Line,
  RiSubtractLine,
  RiPlayCircleLine,
  RiExpandDiagonalLine,
  RiPushpinLine,
  RiFullscreenLine,
  RiFullscreenExitLine,
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
import { PromptComposer } from "./components/PromptComposer";

type Page = "chat" | "space" | "space-detail" | "segments" | "segment-detail" | "definitions" | "metrics" | "benchmarks" | "scorecard" | "dashboards" | "playbook" | "calendar" | "insights" | "sources" | "activations";
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
  const [page, setPage] = useState<Page>("chat");
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

    previousPageRef.current = page;
  }, [page, state.openSourcesIds, state.openSegmentId, dispatch]);

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
  const headerTitle = page === "space" ? "Spaces"
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
    : page === "sources" ? "Sources"
    : page === "activations" ? "Activations"
    : (activeConv?.title ?? "New chat");
  const inKnowledge = page === "calendar" || page === "insights" || page === "segments" || page === "segment-detail";
  const inData = page === "playbook" || page === "definitions" || page === "metrics" || page === "benchmarks" || page === "scorecard" || page === "sources";
  const inSpace = page === "space" || page === "space-detail";
  const inActivations = page === "activations";
  const HeaderIcon = isChat ? RiMessage2Line : inSpace ? RiPlanetLine : inActivations ? RiBroadcastLine : inKnowledge ? RiBrainLine : RiDatabase2Line;
  const mentionGroups = buildMentionGroups(state.activations);
  const sidebarCollapsed = collapsed && !sidebarHovered;
  const lexiPageContext = [
    `Current page: ${headerTitle}`,
    page === "segment-detail" && selectedSegmentId ? `Selected segment id: ${selectedSegmentId}` : null,
    page === "activations" && openActivationId ? `Open activation id: ${openActivationId}` : null,
    page === "space-detail" && selectedSpace ? `Open space: ${selectedSpace.name}` : null,
  ].filter(Boolean).join(" · ");

  return (
    <div className="flex h-screen overflow-hidden bg-sidebar">
      {/* ── Left sidebar ── */}
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
          onNavigate={setPage}
        />
      </div>

      {/* ── Main content ── */}
      <main className="relative m-2 ml-0 flex min-w-0 flex-1 flex-col overflow-hidden rounded-xl border border-border/60 bg-background shadow-sm">
        {/* Header */}
        <header className="flex h-12 shrink-0 items-center gap-2 border-b border-border px-4">
          <button
            onClick={() => setCollapsed((c) => !c)}
            className="flex size-8 items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
          >
            <RiSidebarFoldLine className="size-4" />
          </button>
          <div className="mx-1 h-4 w-px shrink-0 bg-border" />
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
          {page === "segment-detail" && selectedSegmentId ? (
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
                onActivate={(id) => {
                  kickoffActivationFromSegment(id);
                }}
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
          !(openActivationId && inActivations) && "opacity-0",
        )}
        style={{ width: openActivationId && inActivations ? panelWidth : 0 }}
      >
        {openActivationId && inActivations && (
          <ActivationSidePanel
            activationId={openActivationId}
            onClose={() => setOpenActivationId(null)}
            onOpenSegment={(id) => { setOpenActivationId(null); openSegment(id); }}
            onStartResize={startResize}
          />
        )}
      </div>

      {!isChat && (
        <GlobalLexiDock
          mentionGroups={mentionGroups}
          pageContext={lexiPageContext}
          onOpenFullChat={(latestPrompt, usePageContext) => {
            if (!state.activeConversationId) {
              dispatch({ type: "SELECT_CONVERSATION", id: DEFAULT_CONVERSATION_ID, autoStart: false });
            }
            setPage("chat");

            if (latestPrompt.trim()) {
              const text = usePageContext
                ? `[Page context: ${lexiPageContext}] ${latestPrompt}`
                : latestPrompt;
              window.setTimeout(() => {
                window.dispatchEvent(new CustomEvent("prototype-master:start-next-turn", { detail: { text } }));
              }, 40);
            }
          }}
        />
      )}
    </div>
  );
}

function GlobalLexiDock({
  onOpenFullChat,
  mentionGroups,
  pageContext,
}: {
  onOpenFullChat: (latestPrompt: string, usePageContext: boolean) => void;
  mentionGroups: import("../lexi-shared-brain/MentionComposer").MentionGroup[];
  pageContext: string;
}) {
  const [open, setOpen] = useState(false);
  const [confirmCloseOpen, setConfirmCloseOpen] = useState(false);
  const [mode, setMode] = useState<"page" | "general" | null>(null);
  const welcomeText = "Want to collaborate from what is on this page, or start a completely new request?";
  const [messages, setMessages] = useState<Array<{ id: string; role: "user" | "lexi"; text: string }>>([
    {
      id: "lexi-dock-welcome",
      role: "lexi",
      text: welcomeText,
    },
  ]);
  const [lastPrompt, setLastPrompt] = useState("");

  const presentInline = (value: string) => value.replace(/\[\[([^\]]+)\]\]/g, "@$1").trim();

  const setConversationMode = (nextMode: "page" | "general") => {
    setMode(nextMode);
    setMessages((prev) => [
      ...prev,
      {
        id: `lexi-mode-${Date.now()}`,
        role: "lexi",
        text: nextMode === "page"
          ? `Great. I will use this page as context: ${pageContext || "current workspace"}.`
          : "Perfect. I will treat this as a fresh request, independent of the current page.",
      },
    ]);
  };

  const handleDockSubmit = (text: string) => {
    const prompt = presentInline(text);
    if (!prompt) return;

    const normalized = prompt.toLowerCase().trim();
    if (mode === null) {
      if (normalized === "yes" || normalized === "y" || normalized.includes("this page")) {
        setMessages((prev) => [...prev, { id: `lexi-user-${Date.now()}`, role: "user", text: prompt }]);
        setConversationMode("page");
        return;
      }
      if (normalized.includes("something else") || normalized === "no" || normalized === "n") {
        setMessages((prev) => [...prev, { id: `lexi-user-${Date.now()}`, role: "user", text: prompt }]);
        setConversationMode("general");
        return;
      }
    }

    const effectiveMode = mode ?? "page";
    setLastPrompt(prompt);
    setMessages((prev) => [
      ...prev,
      { id: `lexi-user-${Date.now()}`, role: "user", text: prompt },
      {
        id: `lexi-reply-${Date.now()}`,
        role: "lexi",
        text: effectiveMode === "page"
          ? `I will work from this page context: ${pageContext || "current workspace"}. If you want a deeper thread, open full chat.`
          : "Understood. I will treat this as a fresh query. If you want a deeper thread, open full chat.",
      },
    ]);
  };

  return (
    <div className="pointer-events-none fixed bottom-5 right-5 z-40 flex flex-col items-end gap-2">
      {open && (
        <div className="pointer-events-auto flex h-[420px] w-[360px] flex-col overflow-hidden rounded-xl border border-border/70 bg-background shadow-lg">
          <div className="flex items-center justify-between border-b border-border px-3 py-2">
            <div>
              <p className="text-sm font-semibold text-foreground">Lexi quick chat</p>
              <p className="text-xs text-foreground-secondary">Ask anywhere with @ mentions and continue the thread</p>
            </div>
            <div className="flex items-center gap-1">
              <Button
                size="icon-sm"
                variant="ghost"
                onClick={() => setOpen(false)}
                aria-label="Minimize Lexi quick chat"
                title="Minimize"
              >
                <RiSubtractLine className="size-4" />
              </Button>
              <Button
                size="icon-sm"
                variant="ghost"
                onClick={() => onOpenFullChat(lastPrompt, mode !== "general")}
                aria-label="Open full Lexi chat"
                title="Open full chat"
              >
                <RiExpandDiagonalLine className="size-4" />
              </Button>
              <Button
                size="icon-sm"
                variant="ghost"
                onClick={() => {
                  setConfirmCloseOpen(true);
                }}
                aria-label="Close Lexi quick chat"
                title="Close"
              >
                <RiCloseLine className="size-4" />
              </Button>
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto bg-muted/20 p-3">
            <div className="rounded-lg border border-border/60 bg-card px-3 py-2 text-xs text-foreground-secondary">
              {pageContext || "Current page context"}
            </div>
            <div className="mt-2 space-y-2">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={cn(
                    "max-w-[90%] rounded-lg px-3 py-2 text-sm",
                    message.role === "lexi"
                      ? "bg-card text-foreground"
                      : "ml-auto bg-primary text-primary-foreground",
                  )}
                >
                  {message.text}
                </div>
              ))}

              {mode === null && (
                <div className="flex items-center gap-2 pt-1">
                  <Button
                    size="xs"
                    onClick={() => {
                      setMessages((prev) => [...prev, { id: `lexi-user-choice-${Date.now()}`, role: "user", text: "Yes, use this page" }]);
                      setConversationMode("page");
                    }}
                  >
                    Yes, use this page
                  </Button>
                  <Button
                    size="xs"
                    variant="outline"
                    onClick={() => {
                      setMessages((prev) => [...prev, { id: `lexi-user-choice-${Date.now()}`, role: "user", text: "Something else" }]);
                      setConversationMode("general");
                    }}
                  >
                    Something else
                  </Button>
                </div>
              )}
            </div>
          </div>

          <div className="border-t border-border p-2">
            <PromptComposer
              groups={mentionGroups}
              placeholder={mode === "general"
                ? "Ask Lexi anything"
                : "Ask Lexi, or @ to mention a segment, metric, or activation"}
              onSubmit={(text) => handleDockSubmit(text)}
            />
            <p className="mt-2 text-[11px] text-muted-foreground">Use the top-right expand button to open full Lexi chat.</p>
          </div>

          {confirmCloseOpen && (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/70 p-4 backdrop-blur-[1px]">
              <div className="w-full max-w-[280px] rounded-xl border border-border bg-card p-3 shadow-lg">
                <p className="text-sm font-semibold text-foreground">Close Lexi quick chat?</p>
                <p className="mt-1 text-xs text-foreground-secondary">
                  This will close the mini window and clear this local quick-chat thread.
                </p>
                <div className="mt-3 flex items-center justify-end gap-2">
                  <Button size="xs" variant="outline" onClick={() => setConfirmCloseOpen(false)}>
                    Cancel
                  </Button>
                  <Button
                    size="xs"
                    variant="destructive"
                    onClick={() => {
                      setMessages([
                        {
                          id: "lexi-dock-welcome",
                          role: "lexi",
                          text: welcomeText,
                        },
                      ]);
                      setMode(null);
                      setLastPrompt("");
                      setConfirmCloseOpen(false);
                      setOpen(false);
                    }}
                  >
                    Close
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="pointer-events-auto flex size-12 items-center justify-center rounded-full border border-border/70 bg-background shadow-lg transition-transform hover:scale-[1.03]"
        aria-label={open ? "Close Lexi quick chat" : "Open Lexi quick chat"}
        title={open ? "Close Lexi quick chat" : "Open Lexi quick chat"}
      >
        <LexerLogo collapsed tone="primary" />
      </button>
    </div>
  );
}

// ─── Activation detail side panel (inset, narrow, right) ────────────────────────

function ActivationSidePanel({ activationId, onClose, onOpenSegment, onStartResize }: {
  activationId: string;
  onClose: () => void;
  onOpenSegment: (id: string) => void;
  onStartResize: (e: React.MouseEvent) => void;
}) {
  const { state, dispatch } = useSession();
  const activation = state.activations.find((a) => a.id === activationId) ?? getActivation(activationId);
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
          <span className="flex-1 truncate text-sm font-medium text-foreground">Activation</span>
          <button
            onClick={onClose}
            className="flex size-8 items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
            title="Close"
          >
            <RiCloseLine className="size-4" />
          </button>
        </header>
        <div className="min-h-0 flex flex-1 flex-col">
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
    </div>
  );
}

// ─── Segment detail side panel (inset, narrow, right) ───────────────────────────

function SegmentSidePanel({ artifactId, onClose, onActivate, onOpenActivation, onStartResize, fullScreen, onToggleFullScreen }: {
  artifactId: string;
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
          <span className="flex-1 truncate text-sm font-medium text-foreground">Segment details</span>
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
  const { state } = useSession();
  const defs = state.definitionIds
    .map((id) => getDef(id))
    .filter((d): d is NonNullable<typeof d> => Boolean(d));

  return (
    <div className="flex h-full flex-col px-6 py-6">
      <div className="mb-4 flex flex-col gap-1">
        <h1 className="text-xl font-semibold text-foreground">Sources</h1>
        <p className="text-sm text-foreground-secondary">Definitions and governed terms referenced in this session.</p>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {defs.length > 0 ? (
          <div className="flex flex-col gap-2.5">
            {defs.map((def) => <SourceRow key={def.id} def={def} />)}
          </div>
        ) : (
          <div className="flex h-full items-center justify-center rounded-xl border border-dashed border-border bg-muted/20 p-8 text-sm text-muted-foreground">
            No sources captured yet. Ask Lexi a question to surface definitions here.
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Sidebar ───────────────────────────────────────────────────────────────────

function Sidebar({
  collapsed,
  page,
  activationFilter,
  pinnedChatIds,
  onTogglePinnedChat,
  onSelectActivationFilter,
  onNavigate,
}: {
  collapsed: boolean;
  page: Page;
  activationFilter: ActivationNavFilter;
  pinnedChatIds: string[];
  onTogglePinnedChat: (id: string) => void;
  onSelectActivationFilter: (status: ActivationNavFilter) => void;
  onNavigate: (p: Page) => void;
}) {
  const { state, dispatch } = useSession();
  const inSegments = page === "segments" || page === "segment-detail";
  const inActivations = page === "activations";
  const [activationsOpen, setActivationsOpen] = useState(false);
  const savedSegmentCount = Array.from(state.artifacts.values()).filter(
    (artifact) => artifact.type === "segment" && artifact.status === "saved",
  ).length;
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
          <LexerLogo collapsed={collapsed} tone="primary" size="lg" label="prototype-mvp" />
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
                trailing={!collapsed ? (
                  <span className="rounded-full bg-accent px-2 py-0.5 text-xs font-semibold text-foreground tabular-nums">
                    {savedSegmentCount}
                  </span>
                ) : undefined}
              />
            </li>
            <li><NavRow icon={RiBroadcastLine} label="Activations" collapsed={collapsed} active={collapsed ? inActivations : inActivations && !activationsOpen} onClick={() => onSelectActivationFilter("all")} trailing={!collapsed ? <span className="rounded-full bg-accent px-2 py-0.5 text-xs font-semibold text-foreground tabular-nums">{state.activations.length}</span> : undefined} trailingToggle={!collapsed ? <RiArrowRightSLine className={cn("size-4 shrink-0 text-sidebar-foreground/40 transition-transform", activationsOpen && "rotate-90")} /> : undefined} onTrailingToggle={!collapsed ? () => setActivationsOpen((o) => !o) : undefined} trailingToggleLabel="Toggle activation filters" />
              {!collapsed && activationsOpen && (
                <ul className="mt-0.5 flex list-none flex-col gap-0.5 pl-9">
                  <li><SubNavRow label="All activations" active={inActivations && activationFilter === "all"} trailing={<span className="text-xs tabular-nums text-muted-foreground">{activationCount.all}</span>} onClick={() => onSelectActivationFilter("all")} /></li>
                  {activationCount.live > 0 && <li><SubNavRow label="Live" active={inActivations && activationFilter === "live"} trailing={<span className="text-xs tabular-nums text-muted-foreground">{activationCount.live}</span>} onClick={() => onSelectActivationFilter("live")} /></li>}
                  {activationCount.scheduled > 0 && <li><SubNavRow label="Scheduled" active={inActivations && activationFilter === "scheduled"} trailing={<span className="text-xs tabular-nums text-muted-foreground">{activationCount.scheduled}</span>} onClick={() => onSelectActivationFilter("scheduled")} /></li>}
                  {activationCount["awaiting-approval"] > 0 && <li><SubNavRow label="Awaiting approval" active={inActivations && activationFilter === "awaiting-approval"} trailing={<span className="text-xs tabular-nums text-muted-foreground">{activationCount["awaiting-approval"]}</span>} onClick={() => onSelectActivationFilter("awaiting-approval")} /></li>}
                  {activationCount.sent > 0 && <li><SubNavRow label="Sent" active={inActivations && activationFilter === "sent"} trailing={<span className="text-xs tabular-nums text-muted-foreground">{activationCount.sent}</span>} onClick={() => onSelectActivationFilter("sent")} /></li>}
                  {activationCount.completed > 0 && <li><SubNavRow label="Completed" active={inActivations && activationFilter === "completed"} trailing={<span className="text-xs tabular-nums text-muted-foreground">{activationCount.completed}</span>} onClick={() => onSelectActivationFilter("completed")} /></li>}
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
        <div className="p-2">
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
              <DropdownMenuItem onSelect={() => onNavigate("chat")}>Home</DropdownMenuItem>
              <DropdownMenuItem onSelect={() => onNavigate("segments")}>Segments</DropdownMenuItem>
              <DropdownMenuItem onSelect={() => onSelectActivationFilter("all")}>Activations</DropdownMenuItem>
              <DropdownMenuSeparator />
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
                    <DropdownMenuItem onSelect={() => onNavigate("definitions")}>Definitions</DropdownMenuItem>
                    <DropdownMenuItem onSelect={() => onNavigate("metrics")}>Metrics</DropdownMenuItem>
                    <DropdownMenuItem onSelect={() => onNavigate("sources")}>Sources</DropdownMenuItem>
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
