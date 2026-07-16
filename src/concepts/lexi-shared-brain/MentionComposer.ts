import type { DefRef } from "@/data/def-registry";

export interface MentionGroup {
  label: string;
  items: DefRef[];
}
