export type ActivationAudience = "segment" | "reachable";

export function getAudienceLabel(audience: ActivationAudience): string {
  return audience === "segment" ? "Profiles in segment" : "Reachable profiles";
}

export function getAudienceWarning(audience?: ActivationAudience): string | undefined {
  return audience === "segment"
    ? "Choosing everyone in the segment will send this activation to people who have not consented to marketing or have unsubscribed. Confirm this audience is permitted for your intended use before continuing."
    : undefined;
}

export function estimateReachableProfileCount(population: string): number {
  const profileCount = Number(population.replace(/,/g, "").trim());
  if (!Number.isFinite(profileCount) || profileCount <= 0) return 0;
  return Math.max(0, Math.min(profileCount - 1, Math.round(profileCount * 0.972)));
}

export function getAudiencePopulation(population: string, audience: ActivationAudience): string {
  if (audience === "segment") return population;
  return estimateReachableProfileCount(population).toLocaleString("en-US");
}