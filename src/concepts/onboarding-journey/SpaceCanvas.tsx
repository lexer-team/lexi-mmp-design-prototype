import { useCallback, useEffect, useRef, useState } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  Handle,
  Position,
  addEdge,
  useReactFlow,
  useNodesState,
  useEdgesState,
  type Connection,
  type EdgeMouseHandler,
  type NodeProps,
  type Node,
  type Edge,
  type NodeTypes,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/Badge";
import {
  RiGroupLine, RiRouteLine, RiBroadcastLine, RiLightbulbLine, RiFileTextLine,
  RiStickyNote2Line, RiArrowUpLine, RiSparkling2Line, RiTimeLine,
} from "@remixicon/react";
import type { RemixiconComponentType } from "@remixicon/react";
import type { Space } from "./spaces-data";
import { getSpaceContent } from "./space-mock";
import { getActivation } from "./activations-mock";

// ─── Node components ────────────────────────────────────────────────────────────

const ARTIFACT_META: Record<string, { icon: RemixiconComponentType; label: string }> = {
  segment: { icon: RiGroupLine, label: "Segment" },
  workflow: { icon: RiRouteLine, label: "Workflow" },
  activation: { icon: RiBroadcastLine, label: "Activation" },
  insight: { icon: RiLightbulbLine, label: "Insight" },
  file: { icon: RiFileTextLine, label: "File" },
  "segment-confirmation": { icon: RiGroupLine, label: "Segment confirmation" },
  "activation-confirmation": { icon: RiBroadcastLine, label: "Activation confirmation" },
  "amy-segment": { icon: RiGroupLine, label: "Amy's segment" },
  "amy-insight": { icon: RiLightbulbLine, label: "Amy's insight" },
  "izac-segment": { icon: RiGroupLine, label: "Izac's segment" },
  "izac-insight": { icon: RiLightbulbLine, label: "Izac's insight" },
};

type ArtifactNodeData = {
  label: string;
  type: string;
  meta?: string;
  generated?: boolean;
  description?: string;
  details?: string[];
  filters?: string[];
  populationSize?: string;
  segmentName?: string;
  destination?: string;
  audienceSize?: string;
  previewAction?: "file" | "segment-confirmation" | "activation-confirmation";
  previewCta?: string;
  previewSrc?: string;
  previewTitle?: string;
  previewChannel?: string;
};

const FILE_PREVIEW_ARTIFACTS: Record<string, { src: string; title: string; channel: string }> = {
  bff1: {
    src: "/mock-lab/bf-brief-2026.pdf.svg",
    title: "Black Friday brief 2026 (PDF)",
    channel: "PDF brief preview",
  },
  bff2: {
    src: "/mock-lab/promo-calendar-q4.xlsx.svg",
    title: "Promo calendar Q4 (Spreadsheet)",
    channel: "Campaign calendar preview",
  },
  bff3: {
    src: "/mock-lab/channel-budget-split.csv.svg",
    title: "Channel budget split (CSV)",
    channel: "Budget allocation preview",
  },
  "black friday brief 2026.pdf": {
    src: "/mock-lab/bf-brief-2026.pdf.svg",
    title: "Black Friday brief 2026 (PDF)",
    channel: "PDF brief preview",
  },
  "promo calendar q4.xlsx": {
    src: "/mock-lab/promo-calendar-q4.xlsx.svg",
    title: "Promo calendar Q4 (Spreadsheet)",
    channel: "Campaign calendar preview",
  },
  "channel budget split.csv": {
    src: "/mock-lab/channel-budget-split.csv.svg",
    title: "Channel budget split (CSV)",
    channel: "Budget allocation preview",
  },
};

function escapeSvgText(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function toSvgDataUri(svg: string): string {
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

function segmentConfirmationCardSrc(label: string, filters: string[], populationSize: string): string {
  const [f1, f2] = filters;
  const svg = `
<svg width="1200" height="720" viewBox="0 0 1200 720" fill="none" xmlns="http://www.w3.org/2000/svg">
  <rect width="1200" height="720" rx="40" fill="#F5FAFF"/>
  <rect x="60" y="60" width="1080" height="600" rx="28" fill="#FFFFFF" stroke="#CFE7FB" stroke-width="3"/>
  <rect x="100" y="104" width="220" height="44" rx="12" fill="#E6F4FF"/>
  <text x="210" y="132" text-anchor="middle" font-family="ui-sans-serif, -apple-system, Segoe UI" font-size="20" font-weight="700" fill="#0D5C97">Segment confirmation</text>
  <text x="100" y="206" font-family="ui-sans-serif, -apple-system, Segoe UI" font-size="40" font-weight="700" fill="#0F172A">${escapeSvgText(label)}</text>
  <rect x="100" y="252" width="1000" height="116" rx="16" fill="#F8FBFF" stroke="#DDEEFE"/>
  <text x="130" y="292" font-family="ui-sans-serif, -apple-system, Segoe UI" font-size="22" font-weight="600" fill="#0F172A">Population size</text>
  <text x="130" y="332" font-family="ui-sans-serif, -apple-system, Segoe UI" font-size="26" font-weight="700" fill="#0D5C97">${escapeSvgText(populationSize)}</text>
  <rect x="100" y="390" width="1000" height="190" rx="16" fill="#F8FBFF" stroke="#DDEEFE"/>
  <text x="130" y="432" font-family="ui-sans-serif, -apple-system, Segoe UI" font-size="22" font-weight="600" fill="#0F172A">Filters</text>
  <text x="130" y="474" font-family="ui-sans-serif, -apple-system, Segoe UI" font-size="21" fill="#334155">• ${escapeSvgText(f1 ?? "Filter 1")}</text>
  <text x="130" y="510" font-family="ui-sans-serif, -apple-system, Segoe UI" font-size="21" fill="#334155">• ${escapeSvgText(f2 ?? "Filter 2")}</text>
  <text x="130" y="560" font-family="ui-sans-serif, -apple-system, Segoe UI" font-size="19" fill="#64748B">Post-send step: segment confirmed</text>
</svg>`;
  return toSvgDataUri(svg);
}

function activationConfirmationCardSrc(
  label: string,
  filters: string[],
  segmentName: string,
  destination: string,
  audienceSize: string,
): string {
  const [f1, f2] = filters;
  const svg = `
<svg width="1200" height="760" viewBox="0 0 1200 760" fill="none" xmlns="http://www.w3.org/2000/svg">
  <rect width="1200" height="760" rx="40" fill="#FFF6EF"/>
  <rect x="60" y="60" width="1080" height="640" rx="28" fill="#FFFFFF" stroke="#FFE0CC" stroke-width="3"/>
  <rect x="100" y="104" width="250" height="44" rx="12" fill="#FFEEDF"/>
  <text x="225" y="132" text-anchor="middle" font-family="ui-sans-serif, -apple-system, Segoe UI" font-size="20" font-weight="700" fill="#9A3412">Activation confirmation</text>
  <text x="100" y="206" font-family="ui-sans-serif, -apple-system, Segoe UI" font-size="36" font-weight="700" fill="#0F172A">${escapeSvgText(label)}</text>
  <rect x="100" y="246" width="1000" height="160" rx="16" fill="#FFFBF8" stroke="#FFE7D5"/>
  <text x="130" y="286" font-family="ui-sans-serif, -apple-system, Segoe UI" font-size="21" fill="#334155">Segment: ${escapeSvgText(segmentName)}</text>
  <text x="130" y="322" font-family="ui-sans-serif, -apple-system, Segoe UI" font-size="21" fill="#334155">Destination: ${escapeSvgText(destination)}</text>
  <text x="130" y="358" font-family="ui-sans-serif, -apple-system, Segoe UI" font-size="21" fill="#334155">Audience size: ${escapeSvgText(audienceSize)}</text>
  <rect x="100" y="426" width="1000" height="210" rx="16" fill="#FFFBF8" stroke="#FFE7D5"/>
  <text x="130" y="468" font-family="ui-sans-serif, -apple-system, Segoe UI" font-size="22" font-weight="600" fill="#0F172A">Filters</text>
  <text x="130" y="510" font-family="ui-sans-serif, -apple-system, Segoe UI" font-size="21" fill="#334155">• ${escapeSvgText(f1 ?? "Filter 1")}</text>
  <text x="130" y="546" font-family="ui-sans-serif, -apple-system, Segoe UI" font-size="21" fill="#334155">• ${escapeSvgText(f2 ?? "Filter 2")}</text>
  <text x="130" y="600" font-family="ui-sans-serif, -apple-system, Segoe UI" font-size="19" fill="#64748B">Post-send step: activation confirmed</text>
</svg>`;
  return toSvgDataUri(svg);
}

function filePreviewData(id: string, name: string): { src: string; title: string; channel: string } | undefined {
  return FILE_PREVIEW_ARTIFACTS[id] ?? FILE_PREVIEW_ARTIFACTS[name.toLowerCase()];
}

type InventoryTableNodeData = {
  title: string;
  rows: Array<{ sku: string; channel: string; onHand: number; sellThrough: string }>;
};

type ImageTileNodeData = {
  title: string;
  channel: string;
  src: string;
  backArtifactData?: ArtifactNodeData;
};

type CalendarNodeData = {
  title: string;
};

const ACTIVATION_TIME_HINT: Record<string, string> = {
  ac1: "Sent: 2 weeks ago",
  ac2: "Live since: 12 days ago",
  ac3: "Sent: 3 days ago",
  ac4: "Scheduled: Monday, 9:00am",
  ac5: "Live since: 10 days ago",
  bfac1: "Scheduled: Nov 18, 8:30am",
  bfac2: "Live since: Nov 16",
  bfac3: "Scheduled: Nov 29, 8:00am",
  bfac4: "Live since: Nov 20",
  bfac5: "Scheduled: Nov 29, 4:00pm",
};

function segmentFilterDetails(name: string): string[] {
  const n = name.toLowerCase();
  if (n.includes("90-180")) {
    return [
      "Last purchase: between 90 and 180 days",
      "Engagement: opened or clicked in last 60 days",
    ];
  }
  if (n.includes("high-value") || n.includes("vip")) {
    return [
      "Lifetime value: top customer tier",
      "Recency: purchase in last 12 months",
    ];
  }
  if (n.includes("mid-value")) {
    return [
      "Lifetime value: middle value cohort",
      "Recency: purchase in last 12 months",
    ];
  }
  if (n.includes("first-time")) {
    return [
      "Order count: exactly 1 order",
      "First order date: within last 90 days",
    ];
  }
  return [
    "Lifecycle stage: lapsed or at-risk",
    "Engagement: recent opens, clicks, or visits",
  ];
}

function platformLabel(channel: string): string {
  const c = channel.toLowerCase();
  if (c.includes("meta") || c.includes("social")) return "Platform: Meta";
  if (c.includes("email") || c.includes("klaviyo")) return "Platform: Klaviyo";
  if (c.includes("sms")) return "Platform: SMS";
  return `Platform: ${channel}`;
}

function activationDetails(id: string, channel: string, status: string): string[] {
  return [
    platformLabel(channel),
    ACTIVATION_TIME_HINT[id] ?? (status === "Scheduled" ? "Scheduled: pending date" : `Status: ${status}`),
  ];
}

function populationFromMeta(meta?: string): string {
  if (!meta) return "TBC";
  return meta.split("·")[0].trim();
}

const ARTIFACT_STYLE: Record<string, {
  card: string;
  iconWrap: string;
  icon: string;
  badge: string;
  metaDot: string;
}> = {
  segment: {
    card: "border-primary/40 bg-primary/5",
    iconWrap: "bg-primary/15",
    icon: "text-primary",
    badge: "bg-primary/10 text-primary border border-primary/20",
    metaDot: "bg-primary/50",
  },
  workflow: {
    card: "border-brand-300 bg-brand-50/70",
    iconWrap: "bg-brand-100",
    icon: "text-brand-700",
    badge: "bg-brand-100 text-brand-800 border border-brand-200",
    metaDot: "bg-brand-400",
  },
  activation: {
    card: "border-brand-500/50 bg-brand-100/60",
    iconWrap: "bg-brand-200",
    icon: "text-brand-900",
    badge: "bg-brand-200 text-brand-900 border border-brand-300",
    metaDot: "bg-brand-700",
  },
  insight: {
    card: "border-brand-200 bg-brand-50/50",
    iconWrap: "bg-brand-100",
    icon: "text-brand-600",
    badge: "bg-brand-50 text-brand-700 border border-brand-200",
    metaDot: "bg-brand-500",
  },
  file: {
    card: "border-border bg-card",
    iconWrap: "bg-muted",
    icon: "text-foreground-secondary",
    badge: "bg-muted text-foreground-secondary border border-border",
    metaDot: "bg-muted-foreground",
  },
  "segment-confirmation": {
    card: "border-primary/50 bg-primary/10",
    iconWrap: "bg-primary/20",
    icon: "text-primary",
    badge: "bg-primary/15 text-primary border border-primary/30",
    metaDot: "bg-primary",
  },
  "activation-confirmation": {
    card: "border-brand-700/40 bg-brand-100",
    iconWrap: "bg-brand-200",
    icon: "text-brand-900",
    badge: "bg-brand-200 text-brand-900 border border-brand-300",
    metaDot: "bg-brand-700",
  },
  "amy-segment": {
    card: "border-[#CD4496] bg-[#FCDAEB]",
    iconWrap: "bg-[#CD4496]/20",
    icon: "text-[#A82071]",
    badge: "bg-[#CD4496]/15 text-[#A82071] border border-[#CD4496]/40",
    metaDot: "bg-[#CD4496]",
  },
  "amy-insight": {
    card: "border-[#CD4496] bg-[#FCDAEB]",
    iconWrap: "bg-[#CD4496]/20",
    icon: "text-[#A82071]",
    badge: "bg-[#CD4496]/15 text-[#A82071] border border-[#CD4496]/40",
    metaDot: "bg-[#CD4496]",
  },
  "izac-segment": {
    card: "border-[#35B6B4] bg-[#DDF8F7]",
    iconWrap: "bg-[#35B6B4]/20",
    icon: "text-[#127A78]",
    badge: "bg-[#35B6B4]/15 text-[#127A78] border border-[#35B6B4]/40",
    metaDot: "bg-[#35B6B4]",
  },
  "izac-insight": {
    card: "border-[#35B6B4] bg-[#DDF8F7]",
    iconWrap: "bg-[#35B6B4]/20",
    icon: "text-[#127A78]",
    badge: "bg-[#35B6B4]/15 text-[#127A78] border border-[#35B6B4]/40",
    metaDot: "bg-[#35B6B4]",
  },
};

function ArtifactCardNode({ data }: { data: ArtifactNodeData }) {
  const { setNodes, setEdges } = useReactFlow();

  const removeCard = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    const nodeId = (event.currentTarget.dataset.nodeId ?? "").toString();
    if (!nodeId) return;
    setNodes((nds) => nds.filter((node) => node.id !== nodeId));
    setEdges((eds) => eds.filter((edge) => edge.source !== nodeId && edge.target !== nodeId));
  };

  const meta = ARTIFACT_META[data.type] ?? ARTIFACT_META.workflow;
  const style = ARTIFACT_STYLE[data.type] ?? ARTIFACT_STYLE.workflow;
  const Icon = meta.icon;

  const openPreview = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    const nodeId = (data as unknown as { id?: string }).id;
    if (!nodeId) return;

    if (data.previewAction === "segment-confirmation") {
      const filters = data.filters ?? data.details ?? [];
      const populationSize = data.populationSize ?? populationFromMeta(data.meta);
      setNodes((nds) => nds.map((node) => {
        if (node.id !== nodeId) return node;
        return {
          ...node,
          type: "image",
          data: {
            title: `${data.label} — confirmation`,
            channel: "Segment confirmation card",
            src: segmentConfirmationCardSrc(data.label, filters, populationSize),
            backArtifactData: { ...data },
          },
        };
      }));
      return;
    }

    if (data.previewAction === "activation-confirmation") {
      const filters = data.filters ?? [];
      setNodes((nds) => nds.map((node) => {
        if (node.id !== nodeId) return node;
        return {
          ...node,
          type: "image",
          data: {
            title: `${data.label} — confirmation`,
            channel: "Activation confirmation card",
            src: activationConfirmationCardSrc(
              data.label,
              filters,
              data.segmentName ?? "Unknown segment",
              data.destination ?? "Unknown destination",
              data.audienceSize ?? "TBC",
            ),
            backArtifactData: { ...data },
          },
        };
      }));
      return;
    }

    if (!data.previewSrc) return;

    setNodes((nds) => nds.map((node) => {
      if (node.id !== nodeId) return node;
      return {
        ...node,
        type: "image",
        data: {
          title: data.previewTitle ?? data.label,
          channel: data.previewChannel ?? "PDF brief preview",
          src: data.previewSrc,
          backArtifactData: { ...data },
        },
      };
    }));
  };

  return (
    <div className={cn(
      "relative w-[200px] cursor-grab rounded-xl border bg-card px-3 py-2.5 shadow-sm transition-colors active:cursor-grabbing hover:border-primary/40",
      style.card,
      data.generated && "ring-1 ring-primary/20",
    )}>
      <button
        type="button"
        data-node-id={(data as unknown as { id?: string }).id}
        onClick={removeCard}
        className="nodrag nopan absolute right-1.5 top-1.5 flex size-5 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        title="Delete card"
      >
        ×
      </button>
      <div className="mb-1 flex items-center gap-1.5">
        <span className={cn("flex size-5 shrink-0 items-center justify-center rounded-md", style.iconWrap)}>
          <Icon className={cn("size-3", style.icon)} />
        </span>
        <Badge variant="default" size="sm" className={cn("text-[9px]", style.badge)}>{meta.label}</Badge>
        {data.generated && <span className="ml-auto text-[9px] font-medium text-primary">new</span>}
      </div>
      <p className="text-xs font-medium leading-snug text-foreground">{data.label}</p>
      {data.description && <p className="mt-1 text-[11px] leading-relaxed text-foreground-secondary">{data.description}</p>}
      {data.meta && (
        <p className="mt-0.5 flex items-center gap-1 text-[11px] text-muted-foreground">
          <span className={cn("size-1.5 rounded-full", style.metaDot)} />
          {data.meta}
        </p>
      )}
      {data.details && data.details.length > 0 && (
        <ul className="mt-1.5 space-y-0.5">
          {data.details.slice(0, 2).map((detail) => (
            <li key={detail} className="truncate text-[11px] text-foreground-secondary">• {detail}</li>
          ))}
        </ul>
      )}
      {(data.previewSrc || data.previewAction) && (
        <button
          type="button"
          onClick={openPreview}
          className="nodrag nopan mt-2 w-full rounded-md border border-primary/30 bg-primary/10 px-2 py-1 text-[11px] font-medium text-primary transition-colors hover:bg-primary/15"
          title={data.previewCta ?? "Preview this file"}
        >
          {data.previewCta ?? "Preview file"}
        </button>
      )}
      <Handle type="target" position={Position.Left} className="!size-3 !border-2 !border-background !bg-primary/70" />
      <Handle type="source" position={Position.Right} className="!size-3 !border-2 !border-background !bg-primary/70" />
      <Handle type="target" position={Position.Top} className="!size-3 !border-2 !border-background !bg-primary/70" />
      <Handle type="source" position={Position.Bottom} className="!size-3 !border-2 !border-background !bg-primary/70" />
    </div>
  );
}

function ArtifactCardNodeWrapper(props: NodeProps<Node<ArtifactNodeData>>) {
  return <ArtifactCardNode data={{ ...props.data, id: props.id } as ArtifactNodeData & { id: string }} />;
}

function StickyNoteNode({ id, data }: NodeProps<Node<{ text?: string }>>) {
  const { setNodes, setEdges } = useReactFlow();

  const removeNote = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setNodes((nds) => nds.filter((node) => node.id !== id));
    setEdges((eds) => eds.filter((edge) => edge.source !== id && edge.target !== id));
  };

  return (
    <div className="relative w-[180px] cursor-grab rounded-lg border border-amber-200 bg-amber-100 px-2.5 py-2 shadow-sm active:cursor-grabbing">
      <button
        type="button"
        onClick={removeNote}
        className="nodrag nopan absolute right-1.5 top-1.5 flex size-5 items-center justify-center rounded text-amber-800/80 transition-colors hover:bg-amber-200 hover:text-amber-950"
        title="Delete card"
      >
        ×
      </button>
      <div className="mb-1 flex items-center gap-1 text-[10px] font-medium text-amber-800">
        <RiStickyNote2Line className="size-3" /> Note
      </div>
      <textarea
        defaultValue={data.text}
        placeholder="Type a note…"
        className="nodrag min-h-[44px] w-full resize-none bg-transparent text-xs leading-relaxed text-amber-950 outline-none placeholder:text-amber-700/50"
      />
      <Handle type="target" position={Position.Left} className="!size-2 !border-none !bg-amber-300" />
      <Handle type="source" position={Position.Right} className="!size-2 !border-none !bg-amber-300" />
    </div>
  );
}

function InventoryTableNode({ id, data }: NodeProps<Node<InventoryTableNodeData>>) {
  const { setNodes, setEdges } = useReactFlow();

  const removeTable = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setNodes((nds) => nds.filter((node) => node.id !== id));
    setEdges((eds) => eds.filter((edge) => edge.source !== id && edge.target !== id));
  };

  return (
    <div className="relative w-[360px] cursor-grab rounded-xl border border-[#CD4496] bg-[#FCDAEB] p-3 shadow-sm active:cursor-grabbing">
      <button
        type="button"
        onClick={removeTable}
        className="nodrag nopan absolute right-2 top-2 flex size-5 items-center justify-center rounded text-[#A82071]/80 transition-colors hover:bg-[#CD4496]/20 hover:text-[#A82071]"
        title="Delete card"
      >
        ×
      </button>
      <div className="mb-2 flex items-center gap-2">
        <span className="flex size-5 items-center justify-center rounded-md bg-[#CD4496]/20 text-[#A82071]">
          <RiFileTextLine className="size-3" />
        </span>
        <p className="text-xs font-semibold text-[#A82071]">{data.title}</p>
      </div>

      <div className="overflow-hidden rounded-lg border border-[#CD4496]/50 bg-white/70">
        <table className="w-full border-collapse text-[11px]">
          <thead>
            <tr className="bg-[#FCDAEB] text-left text-[#A82071]">
              <th className="px-2 py-1.5 font-semibold">SKU</th>
              <th className="px-2 py-1.5 font-semibold">Channel</th>
              <th className="px-2 py-1.5 font-semibold">On hand</th>
              <th className="px-2 py-1.5 font-semibold">Sell-through</th>
            </tr>
          </thead>
          <tbody>
            {data.rows.map((row) => (
              <tr key={`${row.sku}-${row.channel}`} className="border-t border-[#CD4496]/25 text-[#A82071]">
                <td className="px-2 py-1.5">{row.sku}</td>
                <td className="px-2 py-1.5">{row.channel}</td>
                <td className="px-2 py-1.5">{row.onHand}</td>
                <td className="px-2 py-1.5">{row.sellThrough}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Handle type="target" position={Position.Left} className="!size-3 !border-2 !border-background !bg-[#CD4496]" />
      <Handle type="source" position={Position.Right} className="!size-3 !border-2 !border-background !bg-[#CD4496]" />
    </div>
  );
}

function ImageTileNode({ id, data }: NodeProps<Node<ImageTileNodeData>>) {
  const { setNodes, setEdges } = useReactFlow();
  const isAmyInsightChart = data.channel.toLowerCase().includes("amy's insight visualization");
  const canGoBack = Boolean(data.backArtifactData);

  const removeTile = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setNodes((nds) => nds.filter((node) => node.id !== id));
    setEdges((eds) => eds.filter((edge) => edge.source !== id && edge.target !== id));
  };

  const goBack = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    if (!data.backArtifactData) return;
    const backData: ArtifactNodeData = data.backArtifactData;

    setNodes((nds) => nds.map((node) => {
      if (node.id !== id) return node;
      return {
        ...node,
        type: "artifact",
        data: backData,
      };
    }));
  };

  return (
    <div className={cn(
      "relative w-[320px] cursor-grab rounded-xl p-2.5 shadow-sm active:cursor-grabbing",
      isAmyInsightChart
        ? "border border-[#CD4496] bg-[#FCDAEB]"
        : "border border-[#BDF966] bg-[#D7FEAF]",
    )}>
      <button
        type="button"
        onClick={removeTile}
        className={cn(
          "nodrag nopan absolute right-2 top-2 z-10 flex size-5 items-center justify-center rounded transition-colors",
          isAmyInsightChart
            ? "text-[#A82071]/80 hover:bg-[#CD4496]/20 hover:text-[#A82071]"
            : "text-[#008D49]/80 hover:bg-[#BDF966]/35 hover:text-[#008D49]",
        )}
        title="Delete card"
      >
        ×
      </button>
      {canGoBack && (
        <button
          type="button"
          onClick={goBack}
          className={cn(
            "nodrag nopan absolute right-8 top-2 z-10 rounded-md border px-2 py-1 text-[10px] font-medium transition-colors",
            isAmyInsightChart
              ? "border-[#CD4496]/45 bg-white/80 text-[#A82071] hover:bg-[#FCDAEB]"
              : "border-[#BDF966] bg-white/80 text-[#008D49] hover:bg-[#ECFFD5]",
          )}
          title="Back to card"
        >
          Back
        </button>
      )}
      <div className="mb-1 flex items-center gap-1.5">
        <span className={cn(
          "flex size-5 items-center justify-center rounded-md",
          isAmyInsightChart ? "bg-[#CD4496]/20 text-[#A82071]" : "bg-[#BDF966]/45 text-[#008D49]",
        )}>
          <RiFileTextLine className="size-3" />
        </span>
        <p className={cn("truncate text-xs font-semibold", isAmyInsightChart ? "text-[#A82071]" : "text-[#008D49]")}>{data.title}</p>
      </div>
      <p className={cn("mb-1.5 text-[11px]", isAmyInsightChart ? "text-[#A82071]/90" : "text-[#008D49]/90")}>{data.channel}</p>
      <img
        src={data.src}
        alt={data.title}
        className={cn(
          "nodrag h-[150px] w-full rounded-lg object-cover",
          isAmyInsightChart ? "border border-[#CD4496]/50" : "border border-[#BDF966]",
        )}
      />
      <Handle type="target" position={Position.Left} className={cn("!size-3 !border-2 !border-background", isAmyInsightChart ? "!bg-[#CD4496]" : "!bg-[#008D49]")} />
      <Handle type="source" position={Position.Right} className={cn("!size-3 !border-2 !border-background", isAmyInsightChart ? "!bg-[#CD4496]" : "!bg-[#008D49]")} />
    </div>
  );
}

function CalendarNode({ id, data }: NodeProps<Node<CalendarNodeData>>) {
  const { setNodes, setEdges } = useReactFlow();

  const removeCard = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setNodes((nds) => nds.filter((node) => node.id !== id));
    setEdges((eds) => eds.filter((edge) => edge.source !== id && edge.target !== id));
  };

  const activations = new Set([18, 22, 27, 29]);
  const inventoryShip = new Set([12, 19, 26]);
  const bfWeekend = new Set([26, 27, 28, 29, 30]);
  const days = Array.from({ length: 30 }, (_, index) => index + 1);

  const goalByDate = [
    { date: "Nov 26", goal: "$280k", ly: "$230k" },
    { date: "Nov 27", goal: "$620k", ly: "$510k" },
    { date: "Nov 28", goal: "$480k", ly: "$395k" },
    { date: "Nov 29", goal: "$410k", ly: "$340k" },
    { date: "Nov 30", goal: "$300k", ly: "$255k" },
  ];

  return (
    <div className="relative w-[520px] cursor-grab rounded-xl border border-[#F1B892] bg-[#FFDECF] p-3 shadow-sm active:cursor-grabbing">
      <button
        type="button"
        onClick={removeCard}
        className="nodrag nopan absolute right-2 top-2 flex size-5 items-center justify-center rounded text-[#8F4A21]/80 transition-colors hover:bg-[#F7C8AF] hover:text-[#8F4A21]"
        title="Delete card"
      >
        ×
      </button>

      <div className="mb-2 flex items-center gap-2">
        <span className="flex size-5 items-center justify-center rounded-md bg-[#F7C8AF] text-[#8F4A21]">
          <RiTimeLine className="size-3" />
        </span>
        <p className="text-xs font-semibold text-[#8F4A21]">{data.title}</p>
      </div>

      <div className="mb-2 grid grid-cols-7 gap-1 text-center text-[10px] font-semibold text-[#8F4A21]/80">
        {"Sun Mon Tue Wed Thu Fri Sat".split(" ").map((label) => (
          <span key={label}>{label}</span>
        ))}
      </div>

      <div className="mb-3 grid grid-cols-7 gap-1">
        {days.map((day) => {
          const isBF = bfWeekend.has(day);
          const isActivation = activations.has(day);
          const isShip = inventoryShip.has(day);
          return (
            <div
              key={day}
              className={cn(
                "min-h-11 rounded-md border px-1 py-1 text-[10px]",
                isBF ? "border-[#CD4496]/60 bg-[#CD4496]/10" : "border-[#F1B892] bg-white/45",
              )}
            >
              <div className="flex items-center justify-between">
                <span className="font-semibold text-[#8F4A21]">{day}</span>
                {isBF && <span className="text-[9px] font-semibold text-[#A82071]">BF</span>}
              </div>
              <div className="mt-1 flex flex-wrap gap-1">
                {isActivation && <span className="h-1.5 w-1.5 rounded-full bg-[#CD4496]" title="Activation" />}
                {isShip && <span className="h-1.5 w-1.5 rounded-full bg-[#008D49]" title="Inventory ship" />}
              </div>
            </div>
          );
        })}
      </div>

      <div className="mb-2 flex flex-wrap items-center gap-3 text-[10px] text-[#8F4A21]">
        <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-[#CD4496]" />Activations</span>
        <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-[#008D49]" />Inventory ship dates</span>
        <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded bg-[#CD4496]/35" />Black Friday weekend (Thu-Mon)</span>
      </div>

      <div className="overflow-hidden rounded-lg border border-[#F1B892] bg-white/55">
        <table className="w-full border-collapse text-[11px]">
          <thead>
            <tr className="bg-[#F7C8AF] text-left text-[#8F4A21]">
              <th className="px-2 py-1.5 font-semibold">Date</th>
              <th className="px-2 py-1.5 font-semibold">Sales goal</th>
              <th className="px-2 py-1.5 font-semibold">LY sales</th>
            </tr>
          </thead>
          <tbody>
            {goalByDate.map((row) => (
              <tr key={row.date} className="border-t border-[#F1B892] text-[#8F4A21]">
                <td className="px-2 py-1.5">{row.date}</td>
                <td className="px-2 py-1.5">{row.goal}</td>
                <td className="px-2 py-1.5">{row.ly}</td>
              </tr>
            ))}
            <tr className="border-t border-[#F1B892] bg-[#F7C8AF]/55 font-semibold text-[#8F4A21]">
              <td className="px-2 py-1.5">Total</td>
              <td className="px-2 py-1.5">$2.09M</td>
              <td className="px-2 py-1.5">$1.73M</td>
            </tr>
          </tbody>
        </table>
      </div>

      <Handle type="target" position={Position.Left} className="!size-3 !border-2 !border-background !bg-[#8F4A21]" />
      <Handle type="source" position={Position.Right} className="!size-3 !border-2 !border-background !bg-[#8F4A21]" />
    </div>
  );
}

const nodeTypes: NodeTypes = {
  artifact: ArtifactCardNodeWrapper,
  note: StickyNoteNode,
  table: InventoryTableNode,
  image: ImageTileNode,
  calendar: CalendarNode,
} as unknown as NodeTypes;

// ─── Graph layout ────────────────────────────────────────────────────────────────

const COL_W = 260;
const COL_GAP = 64;
const CARD_STEP = 138;

interface Column {
  key: string;
  label: string;
  icon: RemixiconComponentType;
  ids: Array<{
    id: string;
    label: string;
    type: string;
    meta?: string;
    description?: string;
    details?: string[];
    filters?: string[];
    populationSize?: string;
    segmentName?: string;
    destination?: string;
    audienceSize?: string;
    previewAction?: "file" | "segment-confirmation" | "activation-confirmation";
    previewCta?: string;
    previewSrc?: string;
    previewTitle?: string;
    previewChannel?: string;
  }>;
}

const NODE_GAP = 20;

function estimateNodeSize(node: Node): { width: number; height: number } {
  if (node.type === "table") return { width: 360, height: 230 };
  if (node.type === "image") return { width: 320, height: 250 };
  if (node.type === "calendar") return { width: 520, height: 500 };
  if (node.type === "note") return { width: 180, height: 120 };
  return { width: 200, height: 190 };
}

function nodesOverlap(a: Node, b: Node): boolean {
  const aSize = estimateNodeSize(a);
  const bSize = estimateNodeSize(b);

  const aLeft = a.position.x;
  const aRight = a.position.x + aSize.width;
  const aTop = a.position.y;
  const aBottom = a.position.y + aSize.height;

  const bLeft = b.position.x;
  const bRight = b.position.x + bSize.width;
  const bTop = b.position.y;
  const bBottom = b.position.y + bSize.height;

  return (
    aLeft < bRight + NODE_GAP
    && aRight + NODE_GAP > bLeft
    && aTop < bBottom + NODE_GAP
    && aBottom + NODE_GAP > bTop
  );
}

function resolveNodeOverlaps(inputNodes: Node[]): Node[] {
  const placed: Node[] = [];
  const sorted = [...inputNodes].sort((a, b) => {
    if (a.position.y === b.position.y) return a.position.x - b.position.x;
    return a.position.y - b.position.y;
  });

  sorted.forEach((node) => {
    const next: Node = {
      ...node,
      position: { ...node.position },
    };

    let moved = true;
    while (moved) {
      moved = false;
      for (const existing of placed) {
        if (!nodesOverlap(next, existing)) continue;
        const existingSize = estimateNodeSize(existing);
        const minimumY = existing.position.y + existingSize.height + NODE_GAP;
        if (next.position.y < minimumY) {
          next.position.y = minimumY;
          moved = true;
        }
      }
    }

    placed.push(next);
  });

  return placed;
}

function buildGraph(space: Space, audience: "me" | "team"): { nodes: Node[]; edges: Edge[] } {
  const content = getSpaceContent(space.id);
  const segments = content.segments.slice(0, space.counts.segments);
  const workflows = content.workflows.slice(0, space.counts.workflows);
  const insights = content.insights.slice(0, space.counts.insights);
  const files = space.counts.workflows + space.counts.insights > 0 ? content.files : [];
  const activations = workflows.flatMap((w) => w.activations.map((a) => ({ ...a, workflowId: w.id })));

  const columns: Column[] = [
    {
      key: "seg",
      label: "Segments",
      icon: RiGroupLine,
      ids: segments.map((s) => ({
        id: `seg-${s.id}`,
        label: s.name,
        type: "segment",
        meta: s.meta,
        description: "Audience filters for targeting.",
        details: segmentFilterDetails(s.name),
        filters: segmentFilterDetails(s.name),
        populationSize: populationFromMeta(s.meta),
        previewAction: "segment-confirmation",
        previewCta: "Preview segment",
      })),
    },
    {
      key: "wf",
      label: "Workflows",
      icon: RiRouteLine,
      ids: workflows.map((w) => ({
        id: `wf-${w.id}`,
        label: w.name,
        type: "workflow",
        meta: w.status,
        description: w.description ?? "Multi-step orchestration plan.",
        details: [`Activations: ${w.activations.length}`, `State: ${w.status}`],
      })),
    },
    {
      key: "act",
      label: "Activations",
      icon: RiBroadcastLine,
      ids: activations.map((a) => {
        const canonical = getActivation(a.id);
        const segmentName = canonical?.segmentName ?? "Unknown segment";
        const segment = content.segments.find((item) => item.id === canonical?.segmentId)
          ?? content.segments.find((item) => item.name === segmentName);
        const audienceSize = populationFromMeta(segment?.meta);
        const filters = segment ? segmentFilterDetails(segment.name) : ["Targeting rules from linked segment"];
        const destination = platformLabel(a.channel).replace("Platform: ", "");

        return {
          id: `act-${a.id}`,
          label: a.name,
          type: "activation",
          meta: `${a.channel} · ${a.status}`,
          description: "Delivery configuration and execution timing.",
          details: activationDetails(a.id, a.channel, a.status),
          filters,
          segmentName,
          destination,
          audienceSize,
          previewAction: "activation-confirmation" as const,
          previewCta: "Preview activation",
        };
      }),
    },
    {
      key: "ins",
      label: "Insights",
      icon: RiLightbulbLine,
      ids: insights.map((i) => ({
        id: `ins-${i.id}`,
        label: i.name,
        type: "insight",
        meta: i.meta,
        description: "Key takeaway from analysis.",
        details: [`Impact: ${i.meta}`, `Updated: ${i.updated}`],
      })),
    },
    {
      key: "file",
      label: "Files",
      icon: RiFileTextLine,
      ids: files.map((f) => {
        const preview = filePreviewData(f.id, f.name);
        return {
          id: `file-${f.id}`,
          label: f.name,
          type: "file",
          description: "Reference asset attached to this space.",
          details: preview ? ["Source material for planning", "Preview available"] : ["Source material for planning"],
          previewSrc: preview?.src,
          previewTitle: preview?.title,
          previewChannel: preview?.channel,
        };
      }),
    },
  ].filter((c) => c.ids.length > 0);

  const xShift = audience === "team" ? 360 : 0;
  const nodes: Node[] = [];

  if (audience === "team") {
    const teamTiles: Array<{
      id: string;
      title: string;
      type: "amy-segment" | "amy-insight" | "izac-segment" | "izac-insight";
      description: string;
      details: string[];
    }> = [
      {
        id: "team-seg-1",
        title: "Black Friday only shoppers — online",
        type: "amy-segment",
        description: "Customers with purchases only from Black Friday assortment in online channel.",
        details: ["Order mix: 90%+ BF assortment SKUs", "Channel: online only"],
      },
      {
        id: "team-seg-2",
        title: "Black Friday only shoppers — store-first",
        type: "amy-segment",
        description: "Customers who buy Black Friday assortment in-store and have no non-BF purchases.",
        details: ["Order mix: 90%+ BF assortment SKUs", "Primary channel: in-store"],
      },
      {
        id: "team-ins-1",
        title: "Online sell-through pacing ahead",
        type: "amy-insight",
        description: "Online BF assortment sell-through is outpacing in-store for hero SKUs.",
        details: ["Online sell-through: 74%", "In-store sell-through: 58%"],
      },
      {
        id: "team-ins-2",
        title: "In-store inventory pressure on key sizes",
        type: "izac-insight",
        description: "Store inventory is tightening fastest on top-size variants in high-traffic locations.",
        details: ["Low stock stores: 37", "Most constrained: M/L variants"],
      },
      {
        id: "team-ins-3",
        title: "Channel imbalance risk by week two",
        type: "izac-insight",
        description: "If online pace continues, online inventory will hit critical threshold before stores.",
        details: ["Online cover: ~6 days", "In-store cover: ~11 days"],
      },
    ];

    teamTiles.forEach((tile, index) => {
      nodes.push({
        id: tile.id,
        type: "artifact",
        position: { x: 20, y: 24 + index * CARD_STEP },
        data: {
          label: tile.title,
          type: tile.type,
          meta: tile.type.includes("segment")
            ? (tile.type.startsWith("amy") ? "Amy's segment" : "Izac's segment")
            : (tile.type.startsWith("amy") ? "Amy's insight" : "Izac's insight"),
          description: tile.description,
          details: tile.details,
        },
      });
    });

    nodes.push({
      id: "team-report-1",
      type: "table",
      position: { x: 20, y: 24 + teamTiles.length * CARD_STEP },
      data: {
        title: "Inventory report — Black Friday assortment",
        rows: [
          { sku: "BF-HOODIE-01", channel: "Online", onHand: 1240, sellThrough: "74%" },
          { sku: "BF-HOODIE-01", channel: "In-store", onHand: 1840, sellThrough: "58%" },
          { sku: "BF-DENIM-07", channel: "Online", onHand: 860, sellThrough: "69%" },
          { sku: "BF-DENIM-07", channel: "In-store", onHand: 1430, sellThrough: "52%" },
        ],
      },
    });

    nodes.push({
      id: "team-image-hoodie",
      type: "image",
      position: { x: 410, y: 24 },
      data: {
        title: "BF email hero — hoodie sweater",
        channel: "Email creative",
        src: "/mock-lab/bf-email-hoodie.svg",
      },
    });

    nodes.push({
      id: "team-image-doorbuster",
      type: "image",
      position: { x: 410, y: 220 },
      data: {
        title: "BF doorbuster promotion",
        channel: "Email blast",
        src: "/mock-lab/bf-email-doorbuster.svg",
      },
    });

    nodes.push({
      id: "team-image-store",
      type: "image",
      position: { x: 410, y: 416 },
      data: {
        title: "BF in-store signage kit",
        channel: "In-store collateral",
        src: "/mock-lab/bf-store-signage.svg",
      },
    });

    nodes.push({
      id: "team-amy-chart-1",
      type: "image",
      position: { x: 410, y: 612 },
      data: {
        title: "Amy insight chart — online vs in-store sell-through",
        channel: "Amy's insight visualization",
        src: "/mock-lab/amy-insight-sellthrough.svg",
      },
    });

    nodes.push({
      id: "team-amy-chart-2",
      type: "image",
      position: { x: 410, y: 808 },
      data: {
        title: "Amy insight chart — channel conversion trend",
        channel: "Amy's insight visualization",
        src: "/mock-lab/amy-insight-conversion.svg",
      },
    });

    nodes.push({
      id: "team-calendar-nov",
      type: "calendar",
      position: { x: 760, y: 24 },
      data: {
        title: "November activation + inventory schedule",
      },
    });
  }

  columns.forEach((col, ci) => {
    const x = ci * (COL_W + COL_GAP);
    col.ids.forEach((item, i) => {
      nodes.push({
        id: item.id,
        type: "artifact",
        position: { x: x + 20 + xShift, y: 24 + i * CARD_STEP },
        data: {
          label: item.label,
          type: item.type,
          meta: item.meta,
          description: item.description,
          details: item.details,
          filters: item.filters,
          populationSize: item.populationSize,
          segmentName: item.segmentName,
          destination: item.destination,
          audienceSize: item.audienceSize,
          previewAction: item.previewAction,
          previewCta: item.previewCta,
          previewSrc: item.previewSrc,
          previewTitle: item.previewTitle,
          previewChannel: item.previewChannel,
        },
      });
    });
  });

  // Start with no connectors; users draw connections manually in Lab.
  const edges: Edge[] = [];

  return { nodes: resolveNodeOverlaps(nodes), edges };
}

// ─── Canvas ──────────────────────────────────────────────────────────────────────

export function SpaceCanvas({
  space,
  audience = "me",
}: {
  space: Space;
  audience?: "me" | "team";
  onStartTask?: () => void;
}) {
  const initial = useRef(buildGraph(space, audience)).current;
  const [nodes, setNodes, onNodesChange] = useNodesState(initial.nodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initial.edges);
  const [prompt, setPrompt] = useState("");
  const [edgeAction, setEdgeAction] = useState<{ id: string; x: number; y: number } | null>(null);

    useEffect(() => {
      const next = buildGraph(space, audience);
      setNodes(next.nodes);
      setEdges(next.edges);
      setEdgeAction(null);
    }, [space.id, audience, setNodes, setEdges]);
  const seq = useRef(0);

  const onConnect = useCallback(
    (connection: Connection) => {
      setEdges((eds) => addEdge({ ...connection, animated: false }, eds));
    },
    [setEdges],
  );

  const onEdgeClick = useCallback<EdgeMouseHandler>(
    (event, edge) => {
      event.preventDefault();
      event.stopPropagation();
      setEdgeAction({ id: edge.id, x: event.clientX, y: event.clientY });
    },
    [],
  );

  const deleteSelectedEdge = useCallback(() => {
    if (!edgeAction) return;
    setEdges((eds) => eds.filter((edge) => edge.id !== edgeAction.id));
    setEdgeAction(null);
  }, [edgeAction, setEdges]);

  const addNote = useCallback(() => {
    const n = seq.current++;
    setNodes((nds) => [
      ...nds,
      { id: `note-${Date.now()}`, type: "note", position: { x: 40 + n * 28, y: 40 + n * 28 }, data: { text: "" }, zIndex: 10 },
    ]);
  }, [setNodes]);

  const generateWorkflow = useCallback(() => {
    const text = prompt.trim();
    if (text === "") return;
    const id = `gen-wf-${Date.now()}`;
    const n = seq.current++;
    const xBase = audience === "team" ? 660 : 300;
    // Drop the generated workflow in open space below the columns, linked to the
    // first segment to show it builds on the existing audience.
    setNodes((nds) => [
      ...nds,
      {
        id,
        type: "artifact",
        position: { x: xBase, y: 520 + n * 110 },
        data: {
          label: text.length > 60 ? text.slice(0, 57) + "…" : text,
          type: "workflow",
          meta: "Draft · from chat",
          description: "Generated from a Lab prompt.",
          details: ["Status: Draft", "Source: Lexi composer"],
          generated: true,
        },
        zIndex: 10,
      },
    ]);
    setPrompt("");
  }, [prompt, setNodes, audience]);

  return (
    <div className="relative h-full w-full">
      {/* Toolbar */}
      <div className="absolute left-3 top-3 z-10 flex items-center gap-1.5">
        <button
          onClick={addNote}
          className="flex items-center gap-1.5 rounded-lg border border-border bg-card px-2.5 py-1.5 text-sm font-medium text-foreground shadow-sm transition-colors hover:bg-accent"
        >
          <RiStickyNote2Line className="size-4 text-muted-foreground" /> Add note
        </button>
      </div>

      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onEdgeClick={onEdgeClick}
        onPaneClick={() => setEdgeAction(null)}
        nodesDraggable
        nodesConnectable
        elementsSelectable
        fitView
        fitViewOptions={{ padding: 0.2 }}
        panOnScroll
        selectionOnDrag
        deleteKeyCode={["Backspace", "Delete"]}
        proOptions={{ hideAttribution: true }}
        defaultEdgeOptions={{ style: { stroke: "var(--color-border)", strokeWidth: 1.5 } }}
      >
        <Background color="var(--color-border)" gap={28} size={1} />
        <Controls
          className="!rounded-lg !border !border-border !bg-card !shadow-sm [&>button]:!border-border [&>button]:!bg-card [&>button]:!text-foreground [&>button]:hover:!bg-accent"
          showInteractive={false}
        />
      </ReactFlow>

      {edgeAction && (
        <div
          className="absolute z-20"
          style={{ left: edgeAction.x, top: edgeAction.y, transform: "translate(-50%, -120%)" }}
        >
          <button
            type="button"
            onClick={deleteSelectedEdge}
            className="rounded-lg border border-border bg-card px-2.5 py-1 text-xs font-medium text-foreground shadow-sm transition-colors hover:bg-accent"
          >
            Delete connection
          </button>
        </div>
      )}

      {/* Lexi composer — generate a workflow from a prompt */}
      <div className="pointer-events-none absolute inset-x-0 bottom-4 z-10 flex justify-center px-4">
        <div className="pointer-events-auto flex w-full max-w-xl items-center gap-2 rounded-2xl border border-input-border bg-input px-3 py-2 shadow-md">
          <RiSparkling2Line className="size-4 shrink-0 text-primary" />
          <input
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") generateWorkflow(); }}
            placeholder="Ask Lexi to generate a workflow…"
            className="min-w-0 flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
          />
          <button
            onClick={generateWorkflow}
            disabled={prompt.trim() === ""}
            className={cn(
              "flex size-7 shrink-0 items-center justify-center rounded-full transition-colors",
              prompt.trim() ? "bg-primary text-primary-foreground hover:bg-primary/90" : "cursor-not-allowed bg-muted text-muted-foreground",
            )}
          >
            <RiArrowUpLine className="size-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
