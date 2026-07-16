import {
  RiGroupLine, RiPriceTag3Line, RiBarChartLine, RiBookmark3Line, RiDashboardLine,
} from "@remixicon/react";
import type { DefKind } from "@/data/def-registry";

export const KIND_META: Record<DefKind, { icon: typeof RiGroupLine; label: string }> = {
  term: { icon: RiBookmark3Line, label: "Defined term" },
  attribute: { icon: RiPriceTag3Line, label: "Attribute" },
  metric: { icon: RiBarChartLine, label: "Metric" },
  segment: { icon: RiGroupLine, label: "Segment" },
  dashboard: { icon: RiDashboardLine, label: "Dashboard" },
  group: { icon: RiGroupLine, label: "Group" },
};

export const ENTITY_LABEL: Record<string, string> = {
  customer: "Customer", product: "Product", order: "Transaction",
};
