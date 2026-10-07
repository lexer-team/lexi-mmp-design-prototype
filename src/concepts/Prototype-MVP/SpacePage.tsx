import { useEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/Tabs";
import { MetricCard } from "@/components/ui/MetricCard";
import { EmptyState } from "@/components/ui/EmptyState";
import {
  RiPlanetLine,
  RiRouteLine,
  RiBroadcastLine,
  RiGroupLine,
  RiLightbulbLine,
  RiFileTextLine,
  RiTimeLine,
  RiFlag2Line,
  RiNotification3Line,
  RiArrowRightLine,
  RiMessage2Line,
  RiBarChartLine,
  RiCheckLine,
  RiArticleLine,
  RiShapesLine,
  RiEditLine,
  RiSearchLine,
  RiUserLine,
  RiTeamLine,
  RiCloseLine,
} from "@remixicon/react";
import type { RemixiconComponentType } from "@remixicon/react";
import type { Space } from "./spaces-data";
import { totalArtifacts } from "./spaces-data";
import { PromptComposer } from "./components/PromptComposer";
import { buildMentionGroups } from "./ChatPanel";
import { ContextCard } from "./ContextPanel";
import { SpaceCanvas } from "./SpaceCanvas";
import { useSession } from "./store";
import { GroupDetail } from "../lexi-shared-brain-v2/GroupDetail";
import { segmentArtifactToGroup, segmentToLogic } from "./segment-logic";
import { ActivationDetail } from "./ActivationsPage";
import { ACTIVATIONS, getActivation, type Activation as ActivationRecord, type ActivationStatus } from "./activations-mock";
import { getInsight, previewText, type Insight as CanonicalInsight } from "./insights-data";
import { Markdown } from "./Markdown";
import { Textarea } from "@/components/ui/Textarea";
import { Input } from "@/components/ui/Input";
import {
  getSpaceContent,
  type Workflow,
  type Update,
  type SpaceSegment,
  type Activation as SpaceActivation,
  type Insight as SpaceInsight,
  SEGMENT_LIBRARY,
  INSIGHT_LIBRARY,
  ACTIVATION_LIBRARY,
} from "./space-mock";

// ─── Space detail ───────────────────────────────────────────────────────────────

export function SpacePage({
  space,
  onBack,
  onStartTask,
  onOpenChat,
  onTakeMeToSegment,
  onTakeMeToActivation,
  onTakeMeToInsight,
  onUpdateGoal,
  savedItems,
  savedChats,
  onAddSavedItem,
  railOpen = true,
}: {
  space: Space;
  onBack?: () => void;
  onStartTask?: () => void;
  onOpenChat?: (chatId: string) => void;
  onTakeMeToSegment?: (segmentId: string) => void;
  onTakeMeToActivation?: (activationId: string) => void;
  onTakeMeToInsight?: (insightId: string) => void;
  onUpdateGoal?: (goal: string) => void;
  savedItems?: {
    segmentIds: string[];
    insightIds: string[];
    activationIds: string[];
    segmentItems?: Record<string, { id: string; name: string; meta: string }>;
    activationItems?: Record<string, { id: string; name: string; channel: string; status: string }>;
    insightItems?: Record<string, { id: string; name: string; meta: string; updated: string }>;
  };
  savedChats?: Array<{ id: string; title: string; updated: string }>;
  onAddSavedItem?: (kind: "segment" | "insight" | "activation", itemId: string) => void;
  railOpen?: boolean;
}) {
  const { state } = useSession();
  const [tab, setTab] = useState("overview");
  const [view, setView] = useState<"page" | "canvas">("page");
  const [labAudience, setLabAudience] = useState<"me" | "team">("me");
  const [editingGoal, setEditingGoal] = useState(false);
  const [goalDraft, setGoalDraft] = useState(space.description);
  const [segmentQuery, setSegmentQuery] = useState("");
  const [activationQuery, setActivationQuery] = useState("");
  const [insightQuery, setInsightQuery] = useState("");
  const [openSegmentPanel, setOpenSegmentPanel] = useState<SpaceSegment | null>(null);
  const [openActivationPanel, setOpenActivationPanel] = useState<SpaceActivation | null>(null);
  const [openInsightPanel, setOpenInsightPanel] = useState<SpaceInsight | null>(null);
  const mentionGroups = useMemo(() => buildMentionGroups(), []);
  const content = useMemo(() => getSpaceContent(space.id), [space.id]);
  const segmentById = useMemo(() => new Map(SEGMENT_LIBRARY.map((item) => [item.id, item])), []);
  const insightById = useMemo(() => new Map(INSIGHT_LIBRARY.map((item) => [item.id, item])), []);
  const activationById = useMemo(() => new Map(ACTIVATION_LIBRARY.map((item) => [item.id, item])), []);

  useEffect(() => {
    setGoalDraft(space.description);
    setEditingGoal(false);
  }, [space.id, space.description]);

  const hasUnsavedGoal = goalDraft !== space.description;

  function saveGoal() {
    onUpdateGoal?.(goalDraft.trim());
    setEditingGoal(false);
  }

  function cancelGoalEdit() {
    setGoalDraft(space.description);
    setEditingGoal(false);
  }

  const hasContent = totalArtifacts(space.counts) > 0;
  const baseSegments = content.segments.slice(0, space.counts.segments);
  const workflows = content.workflows.slice(0, space.counts.workflows);
  const baseActivations = content.workflows
    .flatMap((workflow) => workflow.activations)
    .slice(0, space.counts.activations);
  const baseInsights = content.insights.slice(0, space.counts.insights);
  const segmentSavedIds = savedItems?.segmentIds ?? [];
  const insightSavedIds = savedItems?.insightIds ?? [];
  const activationSavedIds = savedItems?.activationIds ?? [];
  const fallbackSavedInsights = Object.values(savedItems?.insightItems ?? {}).map((item) => ({
    id: item.id,
    name: item.name,
    meta: item.meta,
    updated: item.updated,
  }));
  const fallbackSavedSegments = Object.values(savedItems?.segmentItems ?? {}).map((item) => ({
    id: item.id,
    name: item.name,
    meta: item.meta,
  }));
  const fallbackSavedActivations = Object.values(savedItems?.activationItems ?? {}).map((item) => ({
    id: item.id,
    name: item.name,
    channel: item.channel,
    status: item.status,
  }));
  const segments = uniqueById([
    ...baseSegments,
    ...segmentSavedIds.map((id) => segmentById.get(id)).filter((item): item is SpaceSegment => Boolean(item)),
    ...fallbackSavedSegments,
  ]);
  const insights = uniqueById([
    ...baseInsights,
    ...insightSavedIds.map((id) => insightById.get(id)).filter((item): item is SpaceInsight => Boolean(item)),
    ...fallbackSavedInsights,
  ]);
  const activations = uniqueById([
    ...baseActivations,
    ...activationSavedIds.map((id) => activationById.get(id)).filter((item): item is SpaceActivation => Boolean(item)),
    ...fallbackSavedActivations,
  ]);
  const files = hasContent ? content.files : [];
  const savedSegmentIds = new Set(segments.map((item) => item.id));
  const savedInsightIds = new Set(insights.map((item) => item.id));
  const savedActivationIds = new Set(activations.map((item) => item.id));
  const segmentLibraryResults = SEGMENT_LIBRARY.filter((segment) => {
    const q = segmentQuery.trim().toLowerCase();
    if (!q) return !savedSegmentIds.has(segment.id);
    return !savedSegmentIds.has(segment.id)
      && (segment.name.toLowerCase().includes(q) || segment.meta.toLowerCase().includes(q));
  });
  const insightLibraryResults = INSIGHT_LIBRARY.filter((insight) => {
    const q = insightQuery.trim().toLowerCase();
    if (!q) return !savedInsightIds.has(insight.id);
    return !savedInsightIds.has(insight.id)
      && (
        insight.name.toLowerCase().includes(q)
        || insight.meta.toLowerCase().includes(q)
        || insight.updated.toLowerCase().includes(q)
      );
  });
  const activationLibraryResults = ACTIVATION_LIBRARY.filter((activation) => {
    const q = activationQuery.trim().toLowerCase();
    if (!q) return !savedActivationIds.has(activation.id);
    return !savedActivationIds.has(activation.id)
      && (
        activation.name.toLowerCase().includes(q)
        || activation.channel.toLowerCase().includes(q)
        || activation.status.toLowerCase().includes(q)
      );
  });
  const recentChats = uniqueById([
    ...(savedChats ?? []),
    ...content.recentChats,
  ]);
  const hasOverviewContent = hasContent || recentChats.length > 0;

  const resolveSegmentDetailId = (segment: SpaceSegment): string => {
    if (state.artifacts.has(segment.id)) return segment.id;

    const artifactByName = [...state.artifacts.values()].find(
      (artifact) => artifact.type === "segment" && artifact.name.toLowerCase() === segment.name.toLowerCase(),
    );
    if (artifactByName) return artifactByName.id;

    const libraryMatch = SEGMENT_LIBRARY.find((item) => item.name.toLowerCase() === segment.name.toLowerCase());
    return libraryMatch?.id ?? segment.id;
  };

  const segmentPanelDetailId = openSegmentPanel ? resolveSegmentDetailId(openSegmentPanel) : null;
  const segmentPanelArtifact = segmentPanelDetailId ? state.artifacts.get(segmentPanelDetailId) : undefined;
  const segmentPanelGroup = segmentPanelArtifact?.type === "segment"
    ? segmentArtifactToGroup(segmentPanelArtifact)
    : undefined;
  const segmentPanelTree = segmentPanelArtifact?.type === "segment" && segmentPanelArtifact.body?.kind === "segment"
    ? segmentToLogic(segmentPanelArtifact.id, segmentPanelArtifact.body.criteria)
    : undefined;

  const resolveActivationDetailId = (activation: SpaceActivation): string => {
    if (state.activations.some((item) => item.id === activation.id)) return activation.id;

    const byName = state.activations.find((item) => item.name.toLowerCase() === activation.name.toLowerCase());
    if (byName) return byName.id;

    const libraryMatch = ACTIVATION_LIBRARY.find((item) => item.name.toLowerCase() === activation.name.toLowerCase());
    return libraryMatch?.id ?? activation.id;
  };

  const normalizeActivationStatus = (statusLabel: string): ActivationStatus => {
    const key = statusLabel.trim().toLowerCase();
    if (key === "live") return "live";
    if (key === "scheduled" || key === "draft") return "scheduled";
    if (key === "awaiting approval" || key === "awaiting-approval") return "scheduled";
    if (key === "sent") return "sent";
    if (key === "completed") return "completed";
    if (key === "failed") return "failed";
    return "scheduled";
  };

  const buildFallbackActivationRecord = (activation: SpaceActivation): ActivationRecord => ({
    id: activation.id,
    name: activation.name,
    context: space.name,
    channel: activation.channel,
    skill: "Activation workflow",
    approval: { kind: "auto" },
    status: normalizeActivationStatus(activation.status),
    whenLabel: activation.status,
    result: undefined,
    invocations: [{ skill: activation.channel, params: "Space activation", result: activation.status }],
    trail: [{ at: "Recently", entry: `Activation saved in ${space.name}.` }],
  });

  const findActivationByName = (name: string): ActivationRecord | undefined => ACTIVATIONS.find(
    (item) => item.name.toLowerCase() === name.toLowerCase(),
  );

  const activationPanelDetailId = openActivationPanel ? resolveActivationDetailId(openActivationPanel) : null;
  const activationPanelData: ActivationRecord | undefined = activationPanelDetailId
    ? (
      state.activations.find((item) => item.id === activationPanelDetailId)
      ?? getActivation(activationPanelDetailId)
      ?? (openActivationPanel ? findActivationByName(openActivationPanel.name) : undefined)
      ?? (openActivationPanel ? buildFallbackActivationRecord(openActivationPanel) : undefined)
    )
    : (openActivationPanel ? buildFallbackActivationRecord(openActivationPanel) : undefined);

  const findCanonicalInsight = (insight: SpaceInsight): CanonicalInsight | undefined => {
    const byId = getInsight(insight.id);
    if (byId) return byId;

    const byName = INSIGHT_LIBRARY.find((item) => item.name.toLowerCase() === insight.name.toLowerCase());
    return byName ? getInsight(byName.id) : undefined;
  };

  const resolveInsightDetailId = (insight: SpaceInsight): string => {
    const byArtifact = [...state.artifacts.values()].find(
      (artifact) => artifact.type === "insight" && artifact.name.toLowerCase() === insight.name.toLowerCase(),
    );
    if (byArtifact) return byArtifact.id;

    const canonical = findCanonicalInsight(insight);
    if (canonical) return canonical.id;

    const byName = INSIGHT_LIBRARY.find((item) => item.name.toLowerCase() === insight.name.toLowerCase());
    return byName?.id ?? insight.id;
  };

  const insightPanelDetailId = openInsightPanel ? resolveInsightDetailId(openInsightPanel) : null;
  const insightPanelData = openInsightPanel
    ? (getInsight(insightPanelDetailId ?? "") ?? findCanonicalInsight(openInsightPanel))
    : undefined;

  const canvas = view === "canvas";

  const toggleGroup = (
    <div className="inline-flex shrink-0 rounded-lg border border-border bg-muted p-0.5">
      <ViewToggleButton active={!canvas} onClick={() => setView("page")} icon={RiArticleLine} label="Page" />
      <ViewToggleButton active={canvas} onClick={() => setView("canvas")} icon={RiShapesLine} label="Lab" />
    </div>
  );

  return (
    // Horizontal split: main column (its own header + content) | side rail.
    <div className="relative flex h-full min-h-0">
      <div className="flex min-w-0 flex-1 flex-col">
        {canvas ? (
          /* Compact header — maximises canvas space */
          <div className="flex h-12 shrink-0 items-center gap-2 border-b border-border px-4">
            {onBack && (
              <button
                onClick={onBack}
                className="flex size-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                title="Back to Spaces"
              >
                <RiArrowRightLine className="size-4 rotate-180" />
              </button>
            )}
            <RiPlanetLine className="size-4 shrink-0 text-primary" />
            <h1 className="min-w-0 flex-1 truncate text-sm font-semibold text-foreground">{space.name}</h1>
            <div className="inline-flex shrink-0 rounded-lg border border-border bg-muted p-0.5">
              <ViewToggleButton
                active={labAudience === "me"}
                onClick={() => setLabAudience("me")}
                icon={RiUserLine}
                label="Me only"
              />
              <ViewToggleButton
                active={labAudience === "team"}
                onClick={() => setLabAudience("team")}
                icon={RiTeamLine}
                label="Team"
              />
            </div>
            {toggleGroup}
          </div>
        ) : (
          /* Full header */
          <div className="flex shrink-0 flex-col gap-3 px-6 pb-3 pt-6">
            {onBack && (
              <button
                onClick={onBack}
                className="flex w-fit items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
              >
                <RiArrowRightLine className="size-4 rotate-180" /> Spaces
              </button>
            )}
            <div className="flex flex-wrap items-start gap-4">
              <div className="flex min-w-0 flex-1 basis-80 flex-col gap-1.5">
                <div className="flex items-center gap-2">
                  <RiPlanetLine className="size-5 shrink-0 text-primary" />
                  <h1 className="truncate text-xl font-semibold text-foreground">{space.name}</h1>
                </div>
                <p className="text-sm text-muted-foreground">Created by Izac · Updated {space.updatedLabel}</p>
              </div>
              {toggleGroup}
            </div>
          </div>
        )}

        {/* Content */}
        {canvas ? (
          <div className="min-h-0 flex-1">
            <SpaceCanvas space={space} audience={labAudience} onStartTask={onStartTask} />
          </div>
        ) : (
          <div className="min-h-0 flex-1 overflow-y-auto">
            <div className="flex w-full flex-col gap-6 px-6 pb-6 pt-2">
              {/* Chat composer — same component & @ behaviour as the chat */}
              <PromptComposer
                groups={mentionGroups}
                placeholder="Start a chat in this space."
                onSubmit={() => onStartTask?.()}
              />

              {/* Tabs */}
              <Tabs value={tab} onValueChange={setTab}>
                <TabsList>
                  <TabsTrigger value="overview">Overview</TabsTrigger>
                  <TabsTrigger value="insights" count={insights.length}>Insights</TabsTrigger>
                  <TabsTrigger value="segments" count={segments.length}>Segments</TabsTrigger>
                  <TabsTrigger value="activations" count={activations.length}>Activations</TabsTrigger>
                  <TabsTrigger value="workflows" count={workflows.length}>Workflows</TabsTrigger>
                  <TabsTrigger value="files" count={files.length}>Files</TabsTrigger>
                </TabsList>

                <TabsContent value="overview" className="mt-5 focus-visible:outline-none">
                  {hasOverviewContent ? <Overview kpis={content.kpis} recentChats={recentChats} onOpenChat={(chatId) => onOpenChat?.(chatId) ?? onStartTask?.()} /> : (
                    <EmptyState icon={<RiBarChartLine />} title="No activity yet" description="Start a chat in this space to build segments, workflows and insights — your trackers will populate here." />
                  )}
                </TabsContent>

                <TabsContent value="workflows" className="mt-5 focus-visible:outline-none">
                  {workflows.length > 0 ? (
                    <div className="flex flex-col gap-3">
                      {workflows.map((w) => <WorkflowCard key={w.id} workflow={w} />)}
                    </div>
                  ) : (
                    <EmptyState icon={<RiRouteLine />} title="No workflows yet" description="Workflows and their activations will appear here once you set them up." />
                  )}
                </TabsContent>

                <TabsContent value="segments" className="mt-5 focus-visible:outline-none">
                  {segments.length > 0 || segmentLibraryResults.length > 0 || segmentQuery.trim().length > 0 ? (
                    <SearchableSegmentsList
                      query={segmentQuery}
                      onQueryChange={setSegmentQuery}
                      items={segments}
                      libraryItems={segmentLibraryResults}
                      onAdd={(itemId) => onAddSavedItem?.("segment", itemId)}
                      onOpenSegment={(segment) => {
                        setOpenActivationPanel(null);
                        setOpenInsightPanel(null);
                        setOpenSegmentPanel(segment);
                      }}
                    />
                  ) : (
                    <EmptyState icon={<RiGroupLine />} title="No segments yet" description="Saved segments for this space will appear here." />
                  )}
                </TabsContent>

                <TabsContent value="activations" className="mt-5 focus-visible:outline-none">
                  {activations.length > 0 || activationLibraryResults.length > 0 || activationQuery.trim().length > 0 ? (
                    <SearchableActivationsList
                      query={activationQuery}
                      onQueryChange={setActivationQuery}
                      items={activations}
                      libraryItems={activationLibraryResults}
                      onAdd={(itemId) => onAddSavedItem?.("activation", itemId)}
                      onOpenActivation={(activation) => {
                        setOpenInsightPanel(null);
                        setOpenSegmentPanel(null);
                        setOpenActivationPanel(activation);
                      }}
                    />
                  ) : (
                    <EmptyState icon={<RiBroadcastLine />} title="No activations yet" description="Saved activations for this space will appear here." />
                  )}
                </TabsContent>

                <TabsContent value="insights" className="mt-5 focus-visible:outline-none">
                  {insights.length > 0 || insightLibraryResults.length > 0 || insightQuery.trim().length > 0 ? (
                    <SearchableInsightsList
                      query={insightQuery}
                      onQueryChange={setInsightQuery}
                      items={insights}
                      libraryItems={insightLibraryResults}
                      onAdd={(itemId) => onAddSavedItem?.("insight", itemId)}
                      findCanonicalInsight={findCanonicalInsight}
                      onOpenInsight={(insight) => {
                        setOpenActivationPanel(null);
                        setOpenSegmentPanel(null);
                        setOpenInsightPanel(insight);
                      }}
                    />
                  ) : (
                    <EmptyState icon={<RiLightbulbLine />} title="No insights yet" description="Insights Lexi surfaces and you approve will collect here." />
                  )}
                </TabsContent>

                <TabsContent value="files" className="mt-5 focus-visible:outline-none">
                  {files.length > 0 ? (
                    <div className="flex flex-col">
                      {files.map((f) => (
                        <ListRow
                          key={f.id}
                          icon={RiFileTextLine}
                          title={f.name}
                          trailing={f.updated}
                        />
                      ))}
                    </div>
                  ) : (
                    <EmptyState icon={<RiFileTextLine />} title="No files yet" description="Briefs, guidelines and reference docs shared with this space will appear here." />
                  )}
                </TabsContent>
              </Tabs>
            </div>
          </div>
        )}
      </div>

      {openSegmentPanel && segmentPanelDetailId && (
        <div className="absolute inset-y-0 right-0 z-30 w-[460px] border-l border-border bg-background shadow-xl">
          <div className="flex h-12 items-center gap-2 border-b border-border px-3">
            <span className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">Segment details</span>
            <Button
              size="sm"
              variant="outline"
              className="h-8 px-2.5"
              onClick={() => onTakeMeToSegment?.(segmentPanelDetailId)}
            >
              Take me to Segment
            </Button>
            <button
              onClick={() => setOpenSegmentPanel(null)}
              className="flex size-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              title="Close"
            >
              <RiCloseLine className="size-4" />
            </button>
          </div>
          <div className="h-[calc(100%-3rem)] overflow-y-auto">
            <GroupDetail
              groupId={segmentPanelDetailId}
              group={segmentPanelGroup}
              definitionTree={segmentPanelTree}
              onOpenGroup={(id) => onTakeMeToSegment?.(id)}
            />
          </div>
        </div>
      )}

      {openActivationPanel && activationPanelDetailId && activationPanelData && (
        <div className="absolute inset-y-0 right-0 z-30 w-[460px] border-l border-border bg-background shadow-xl">
          <div className="flex h-12 items-center gap-2 border-b border-border px-3">
            <span className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">Activation details</span>
            <Button
              size="sm"
              variant="outline"
              className="h-8 px-2.5"
              onClick={() => onTakeMeToActivation?.(activationPanelDetailId)}
            >
              Take me to Activation
            </Button>
            <button
              onClick={() => setOpenActivationPanel(null)}
              className="flex size-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              title="Close"
            >
              <RiCloseLine className="size-4" />
            </button>
          </div>
          <div className="h-[calc(100%-3rem)] overflow-y-auto">
            <ActivationDetail
              activation={activationPanelData}
              onOpenSegment={(id) => onTakeMeToSegment?.(id)}
            />
          </div>
        </div>
      )}

      {openInsightPanel && insightPanelDetailId && (
        <div className="absolute inset-y-0 right-0 z-30 w-[460px] border-l border-border bg-background shadow-xl">
          <div className="flex h-12 items-center gap-2 border-b border-border px-3">
            <span className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">Insight details</span>
            <Button
              size="sm"
              variant="outline"
              className="h-8 px-2.5"
              onClick={() => onTakeMeToInsight?.(insightPanelDetailId)}
            >
              Take me to Insight
            </Button>
            <button
              onClick={() => setOpenInsightPanel(null)}
              className="flex size-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              title="Close"
            >
              <RiCloseLine className="size-4" />
            </button>
          </div>
          <div className="h-[calc(100%-3rem)] overflow-y-auto p-4">
            <div className="flex items-start gap-2 rounded-xl border border-border bg-card p-3">
              <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <RiLightbulbLine className="size-4" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-foreground">{openInsightPanel.name}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {insightPanelData?.savedAt ?? openInsightPanel.updated}
                </p>
              </div>
            </div>

            {(insightPanelData?.source || insightPanelData?.owner || insightPanelData?.space) && (
              <div className="mt-3 grid grid-cols-1 gap-2 rounded-xl border border-border bg-card p-3 sm:grid-cols-2">
                {insightPanelData?.source && (
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-muted-foreground">Source</p>
                    <p className="truncate text-sm text-foreground-secondary">{insightPanelData.source.label}</p>
                  </div>
                )}
                {insightPanelData?.space && (
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-muted-foreground">Space</p>
                    <p className="truncate text-sm text-foreground-secondary">{insightPanelData.space}</p>
                  </div>
                )}
                {insightPanelData?.owner && (
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-muted-foreground">Owner</p>
                    <p className="truncate text-sm text-foreground-secondary">{insightPanelData.owner}</p>
                  </div>
                )}
              </div>
            )}

            {insightPanelData?.metrics && insightPanelData.metrics.length > 0 && (
              <div className="mt-3 rounded-xl border border-border bg-card p-3">
                <p className="text-xs font-medium text-muted-foreground">Related metrics</p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {insightPanelData.metrics.map((metric) => (
                    <Badge key={metric} variant="secondary" size="sm">{metric}</Badge>
                  ))}
                </div>
              </div>
            )}

            <div className="mt-3 flex flex-col gap-2 rounded-xl border border-border bg-card p-3">
              <p className="text-xs font-medium text-muted-foreground">Finding</p>
              {insightPanelData?.finding ? (
                <Markdown source={insightPanelData.finding} />
              ) : (
                <p className="text-sm leading-relaxed text-foreground-secondary">{openInsightPanel.meta}</p>
              )}
            </div>

            <div className="mt-3 flex flex-col gap-2 rounded-xl border border-border bg-card p-3">
              <p className="text-xs font-medium text-muted-foreground">What to do about it</p>
              <p className="text-sm leading-relaxed text-foreground-secondary">
                {insightPanelData?.implication ?? openInsightPanel.meta}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ── Right rail — full-height side column; hidden in canvas mode or when collapsed ── */}
      {!canvas && railOpen && (
        <div className="flex w-[280px] shrink-0 flex-col gap-2 overflow-y-auto bg-background p-2">
          <ContextCard icon={RiFlag2Line} title="Goal" tooltip="What this space is set up to achieve" empty={!space.description}>
            {editingGoal ? (
              <div className="flex flex-col gap-2 p-1">
                <Textarea
                  value={goalDraft}
                  onChange={(e) => setGoalDraft(e.target.value)}
                  placeholder="Describe what this space should achieve."
                  className="min-h-24"
                />
                <div className="flex items-center justify-end gap-2">
                  <Button variant="ghost" size="sm" onClick={cancelGoalEdit}>Cancel</Button>
                  <Button size="sm" onClick={saveGoal} disabled={!hasUnsavedGoal}>Save goal</Button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setEditingGoal(true)}
                className="group flex w-full items-start gap-2 rounded-lg px-1 py-1 text-left transition-colors hover:bg-accent"
              >
                <span className="min-w-0 flex-1 text-sm leading-relaxed text-foreground-secondary">
                  {space.description || "No goal set for this space yet."}
                </span>
                <RiEditLine className="mt-0.5 size-3.5 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
              </button>
            )}
          </ContextCard>

          <ContextCard icon={RiFileTextLine} title="Files & sources" tooltip="Reference docs shared with this space" empty={files.length === 0}>
            <div className="flex flex-col gap-0.5">
              {files.map((f) => (
                <div key={f.id} className="flex items-center gap-2 rounded-lg px-2 py-1.5 transition-colors hover:bg-accent">
                  <RiFileTextLine className="size-3.5 shrink-0 text-muted-foreground" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm text-foreground-secondary">{f.name}</p>
                    {f.updated ? <p className="truncate text-xs text-muted-foreground">{f.updated}</p> : null}
                  </div>
                </div>
              ))}
            </div>
          </ContextCard>

          <UpdatesCard enabled={hasContent} initialUpdates={content.updates} />

          <ContextCard icon={RiTimeLine} title="Scheduled tasks" tooltip="Activations and reports that run on a schedule" empty={!hasContent}>
            <div className="flex flex-col gap-0.5">
              {content.scheduled.map((s) => (
                <div key={s.id} className="flex items-start gap-2 rounded-lg px-2 py-1.5">
                  <RiTimeLine className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-foreground">{s.name}</p>
                    <p className="truncate text-xs text-muted-foreground">{s.type} · {s.schedule}</p>
                  </div>
                </div>
              ))}
            </div>
          </ContextCard>
        </div>
      )}
    </div>
  );
}

function SearchableSegmentsList({
  query,
  onQueryChange,
  items,
  libraryItems,
  onAdd,
  onOpenSegment,
}: {
  query: string;
  onQueryChange: (value: string) => void;
  items: SpaceSegment[];
  libraryItems: SpaceSegment[];
  onAdd: (itemId: string) => void;
  onOpenSegment: (segment: SpaceSegment) => void;
}) {
  return (
    <div className="flex flex-col gap-3">
      <LibrarySearchDropdown
        value={query}
        onChange={onQueryChange}
        placeholder="Search segment library"
        items={libraryItems}
        getTitle={(item) => item.name}
        getMeta={(item) => item.meta}
        emptyLabel="No matching library segments"
        onSelect={(item) => onAdd(item.id)}
      />
      <SectionLabel>Saved in this space</SectionLabel>
      {items.length > 0 ? (
        <div className="flex flex-col">
          {items.map((segment) => (
            <ListRow
              key={segment.id}
              icon={RiGroupLine}
              title={segment.name}
              meta={segment.meta}
              onClick={() => onOpenSegment(segment)}
            />
          ))}
        </div>
      ) : (
        <EmptyState icon={<RiGroupLine />} title="No saved segments yet" description="Add one from the library below." />
      )}
    </div>
  );
}

function SearchableActivationsList({
  query,
  onQueryChange,
  items,
  libraryItems,
  onAdd,
  onOpenActivation,
}: {
  query: string;
  onQueryChange: (value: string) => void;
  items: SpaceActivation[];
  libraryItems: SpaceActivation[];
  onAdd: (itemId: string) => void;
  onOpenActivation: (activation: SpaceActivation) => void;
}) {
  return (
    <div className="flex flex-col gap-3">
      <LibrarySearchDropdown
        value={query}
        onChange={onQueryChange}
        placeholder="Search activation library"
        items={libraryItems}
        getTitle={(item) => item.name}
        getMeta={(item) => item.channel}
        getTrailing={(item) => item.status}
        emptyLabel="No matching library activations"
        onSelect={(item) => onAdd(item.id)}
      />
      <SectionLabel>Saved in this space</SectionLabel>
      {items.length > 0 ? (
        <div className="flex flex-col">
          {items.map((activation) => (
            <ListRow
              key={activation.id}
              icon={RiBroadcastLine}
              title={activation.name}
              meta={`${activation.channel} · ${activation.status}`}
              trailing={activation.updated}
              onClick={() => onOpenActivation(activation)}
            />
          ))}
        </div>
      ) : (
        <EmptyState icon={<RiBroadcastLine />} title="No saved activations yet" description="Add one from the library below." />
      )}
    </div>
  );
}

function SearchableInsightsList({
  query,
  onQueryChange,
  items,
  libraryItems,
  onAdd,
  findCanonicalInsight,
  onOpenInsight,
}: {
  query: string;
  onQueryChange: (value: string) => void;
  items: SpaceInsight[];
  libraryItems: SpaceInsight[];
  onAdd: (itemId: string) => void;
  findCanonicalInsight: (insight: SpaceInsight) => CanonicalInsight | undefined;
  onOpenInsight: (insight: SpaceInsight) => void;
}) {
  return (
    <div className="flex flex-col gap-3">
      <LibrarySearchDropdown
        value={query}
        onChange={onQueryChange}
        placeholder="Search insight library"
        items={libraryItems}
        getTitle={(item) => item.name}
        getMeta={(item) => item.meta}
        getTrailing={(item) => item.updated}
        emptyLabel="No matching library insights"
        onSelect={(item) => onAdd(item.id)}
      />
      <SectionLabel>Saved in this space</SectionLabel>
      {items.length > 0 ? (
        <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
          {items.map((insight) => {
            const canonical = findCanonicalInsight(insight);
            const snippet = canonical ? previewText(canonical.finding) : insight.meta;
            return (
              <button
                key={insight.id}
                onClick={() => onOpenInsight(insight)}
                className="flex flex-col gap-2 rounded-xl border border-border bg-card p-4 text-left transition-colors hover:border-primary/40 hover:shadow-sm"
              >
                <div className="flex items-center gap-2">
                  <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <RiLightbulbLine className="size-4" />
                  </span>
                  <span className="min-w-0 flex-1 truncate text-sm font-semibold text-foreground">{insight.name}</span>
                </div>
                <p className="line-clamp-2 text-sm text-foreground-secondary">{snippet}</p>
                <div className="mt-auto flex flex-wrap items-center gap-x-2 gap-y-1 pt-1 text-xs text-muted-foreground">
                  {canonical?.source?.label ? (
                    <span className="inline-flex min-w-0 items-center gap-1">
                      <RiMessage2Line className="size-3.5 shrink-0" />
                      <span className="truncate">{canonical.source.label}</span>
                    </span>
                  ) : null}
                  <span className="inline-flex items-center gap-1">
                    <RiTimeLine className="size-3.5" />
                    {canonical?.savedAt ?? insight.updated}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      ) : (
        <EmptyState icon={<RiLightbulbLine />} title="No saved insights yet" description="Add one from the library below." />
      )}
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <p className="text-xs font-medium text-muted-foreground">{children}</p>;
}

function LibrarySearchDropdown<T extends { id: string }>({
  value,
  onChange,
  placeholder,
  items,
  getTitle,
  getMeta,
  getTrailing,
  emptyLabel,
  onSelect,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  items: T[];
  getTitle: (item: T) => string;
  getMeta?: (item: T) => string | undefined;
  getTrailing?: (item: T) => string | undefined;
  emptyLabel: string;
  onSelect: (item: T) => void;
}) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onPointerDown(event: PointerEvent) {
      if (!containerRef.current) return;
      if (!containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    window.addEventListener("pointerdown", onPointerDown);
    return () => window.removeEventListener("pointerdown", onPointerDown);
  }, []);

  return (
    <div className="relative" ref={containerRef}>
      <SearchInput
        value={value}
        onChange={(next) => {
          onChange(next);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        placeholder={placeholder}
      />
      {open && (
        <div className="absolute left-0 right-0 z-20 mt-1.5 overflow-hidden rounded-lg border border-border bg-popover shadow-lg">
          <div className="max-h-64 overflow-y-auto p-1">
            {items.length > 0 ? (
              items.map((item) => {
                const meta = getMeta?.(item);
                const trailing = getTrailing?.(item);
                return (
                  <button
                    key={item.id}
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => {
                      onSelect(item);
                      onChange("");
                      setOpen(false);
                    }}
                    className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-left transition-colors hover:bg-accent"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-foreground">{getTitle(item)}</p>
                      {meta ? <p className="truncate text-xs text-muted-foreground">{meta}</p> : null}
                    </div>
                    <div className="flex items-center gap-2">
                      {trailing ? <span className="text-xs text-muted-foreground">{trailing}</span> : null}
                      <span className="text-xs font-medium text-primary">Add</span>
                    </div>
                  </button>
                );
              })
            ) : (
              <p className="px-2 py-2 text-sm text-muted-foreground">{emptyLabel}</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function SearchInput({
  value,
  onChange,
  onFocus,
  placeholder,
}: {
  value: string;
  onChange: (value: string) => void;
  onFocus?: () => void;
  placeholder: string;
}) {
  return (
    <div className="relative">
      <RiSearchLine className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={onFocus}
        placeholder={placeholder}
        className="pl-9"
      />
    </div>
  );
}

function uniqueById<T extends { id: string }>(items: T[]): T[] {
  const seen = new Set<string>();
  const result: T[] = [];
  for (const item of items) {
    if (seen.has(item.id)) continue;
    seen.add(item.id);
    result.push(item);
  }
  return result;
}

function ListRow({ icon: Icon, title, meta, trailing, onClick }: {
  icon: RemixiconComponentType;
  title: string;
  meta?: string;
  trailing?: string;
  onClick?: () => void;
}) {
  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className="flex w-full items-center gap-3 border-b border-border/60 py-2.5 text-left transition-colors last:border-0 hover:bg-accent/40"
      >
        <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Icon className="size-4" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-foreground">{title}</p>
          {meta && <p className="truncate text-xs text-muted-foreground">{meta}</p>}
        </div>
        {trailing && <span className="shrink-0 text-xs text-muted-foreground">{trailing}</span>}
      </button>
    );
  }

  return (
    <div className="flex items-center gap-3 border-b border-border/60 py-2.5 last:border-0">
      <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
        <Icon className="size-4" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-foreground">{title}</p>
        {meta && <p className="truncate text-xs text-muted-foreground">{meta}</p>}
      </div>
      {trailing && <span className="shrink-0 text-xs text-muted-foreground">{trailing}</span>}
    </div>
  );
}

// ─── Page / canvas toggle button ────────────────────────────────────────────────

function ViewToggleButton({
  active, onClick, icon: Icon, label,
}: {
  active: boolean; onClick: () => void; icon: RemixiconComponentType; label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
        active ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
      )}
    >
      <Icon className="size-3.5" />
      {label}
    </button>
  );
}

// ─── Overview — KPI trackers + recent chats ─────────────────────────────────────

function Overview({
  kpis,
  recentChats,
  onOpenChat,
}: {
  kpis: Array<{ label: string; value: string; delta?: { value: string; direction: "up" | "down" }; hint: string; icon: RemixiconComponentType }>;
  recentChats: Array<{ id: string; title: string; updated: string }>;
  onOpenChat: (chatId: string) => void;
}) {
  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {kpis.map((k) => (
          <MetricCard key={k.label} label={k.label} value={k.value} delta={k.delta} hint={k.hint} icon={<k.icon />} />
        ))}
      </div>

      <div className="flex flex-col gap-1.5">
        <h2 className="text-sm font-semibold text-foreground">Recent chats</h2>
        <div className="flex flex-col">
          {recentChats.map((c) => (
            <button
              key={c.id}
              onClick={() => onOpenChat(c.id)}
              className="flex items-center gap-3 border-b border-border/60 py-2.5 text-left transition-colors last:border-0 hover:bg-accent/40"
            >
              <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                <RiMessage2Line className="size-4" />
              </span>
              <span className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">{c.title}</span>
              <span className="shrink-0 text-xs text-muted-foreground">{c.updated}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Workflow card (with nested activations) ────────────────────────────────────

function WorkflowCard({ workflow }: { workflow: Workflow }) {
  const statusVariant =
    workflow.status === "Awaiting approval" ? "warning" :
    workflow.status === "Blocked" ? "danger" :
    "success";

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card shadow-xs">
      <div className="flex items-center gap-2.5 border-b border-border/60 px-3 py-2.5">
        <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <RiRouteLine className="size-4" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-foreground">{workflow.name}</p>
          {workflow.description ? (
            <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{workflow.description}</p>
          ) : null}
        </div>
        <Badge variant={statusVariant} size="sm">{workflow.status}</Badge>
      </div>

      <div className="space-y-2.5 p-3">
        <div className="flex items-center justify-between px-1">
          <p className="text-[11px] font-medium uppercase tracking-normal text-muted-foreground">Activations</p>
          <span className="text-[11px] text-foreground-secondary">{workflow.activations.length}</span>
        </div>

        {workflow.activations.map((a) => {
          const badgeVariant =
            a.status === "Live" || a.status === "Approved" || a.status === "Sent" ? "success" :
            a.status === "Scheduled" || a.status === "Awaiting approval" ? "warning" :
            a.status === "Failed" || a.status === "Blocked" ? "danger" :
            "secondary";

          return (
            <div
              key={a.id}
              className="rounded-lg border border-border/70 bg-background/80 p-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.02)] transition-colors hover:border-primary/30 hover:bg-accent/20"
            >
              <div className="flex items-start gap-2.5">
                <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                  <RiBroadcastLine className="size-3.5" />
                </span>

                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <p className="truncate text-sm font-medium text-foreground">{a.name}</p>
                    <Badge variant={badgeVariant} size="sm">{a.status}</Badge>
                  </div>

                  <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-[11px] text-muted-foreground">
                    <span className="rounded-md border border-border/70 bg-muted/40 px-1.5 py-0.5">{a.channel}</span>
                    {a.updated ? <span>{a.updated}</span> : null}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Updates card (approvals + reports) ─────────────────────────────────────────

function UpdatesCard({ enabled, initialUpdates }: { enabled: boolean; initialUpdates: Update[] }) {
  const [updates, setUpdates] = useState<Update[]>(enabled ? initialUpdates : []);
  const remove = (id: string) => setUpdates((u) => u.filter((x) => x.id !== id));

  return (
    <ContextCard icon={RiNotification3Line} title="Updates" tooltip="Approvals Lexi needs and reports that are ready" empty={updates.length === 0}>
      <div className="flex flex-col gap-1.5">
        {updates.map((u) => (
          <div key={u.id} className="rounded-lg border border-border/60 bg-muted/30 px-2.5 py-2">
            <div className="flex items-start gap-1.5">
              <RiNotification3Line className="mt-0.5 size-3.5 shrink-0 text-primary" />
              <p className="min-w-0 flex-1 text-sm font-medium text-foreground">{u.title}</p>
            </div>
            <p className="mt-0.5 pl-5 text-xs text-muted-foreground">{u.desc}</p>
            <div className="mt-1.5 flex items-center gap-1.5 pl-5">
              {u.kind === "approval" ? (
                <>
                  <Button size="xs" className="h-6 gap-1 px-2 text-[11px]" onClick={() => remove(u.id)}>
                    <RiCheckLine className="size-3" /> Approve
                  </Button>
                  <Button size="xs" variant="ghost" className="h-6 px-2 text-[11px]" onClick={() => remove(u.id)}>Dismiss</Button>
                </>
              ) : (
                <>
                  <Button size="xs" variant="outline" className="h-6 px-2 text-[11px]" onClick={() => remove(u.id)}>View report</Button>
                  <Button size="xs" variant="ghost" className="h-6 px-2 text-[11px]" onClick={() => remove(u.id)}>Dismiss</Button>
                </>
              )}
            </div>
          </div>
        ))}
      </div>
    </ContextCard>
  );
}
