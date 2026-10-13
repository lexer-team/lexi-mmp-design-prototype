import { useId } from "react";
import { estimateReachableProfileCount, getAudienceWarning, type ActivationAudience } from "@/lib/activation-audience";

interface PopulationVolumeSelectorProps {
  population: string;
  audience: ActivationAudience;
  onAudienceChange: (audience: ActivationAudience) => void;
}

export function PopulationVolumeSelector({ population, audience, onAudienceChange }: PopulationVolumeSelectorProps) {
  const audienceGroupName = useId();
  const reachablePopulation = estimateReachableProfileCount(population).toLocaleString("en-US");
  const audienceWarning = getAudienceWarning(audience);

  return (
    <div className="mt-3 rounded-xl border border-border bg-background px-4 py-3">
      <p className="text-xs font-medium uppercase tracking-normal text-muted-foreground">Population volume</p>
      <div className="mt-2 grid grid-cols-2 gap-4">
        <div className="min-w-0">
          <p className="text-xs text-foreground-secondary">Profiles in segment</p>
          <p className="mt-1 text-2xl font-semibold text-foreground tabular-nums">{population}</p>
        </div>
        <div className="min-w-0 border-l border-border pl-4">
          <p className="text-xs text-foreground-secondary">Reachable profiles</p>
          <p className="mt-1 text-2xl font-semibold text-foreground tabular-nums">{reachablePopulation}</p>
        </div>
      </div>
      <p className="mt-3 border-t border-border pt-3 text-xs text-foreground-secondary">
        Reachable profiles are an estimate after consent checks. Profiles without the required marketing consent are excluded, so this audience is smaller than the full segment.
      </p>
      <fieldset className="mt-3 space-y-2">
        <legend className="mb-2 text-sm font-medium text-foreground">Who should this activation include?</legend>
        <label className="flex cursor-pointer items-start gap-2 text-sm text-foreground">
          <input
            type="radio"
            name={audienceGroupName}
            value="segment"
            checked={audience === "segment"}
            onChange={() => onAudienceChange("segment")}
            className="mt-0.5 size-4 shrink-0 accent-primary"
          />
          <span>Everyone in the segment ({population})</span>
        </label>
        <label className="flex cursor-pointer items-start gap-2 text-sm text-foreground">
          <input
            type="radio"
            name={audienceGroupName}
            value="reachable"
            checked={audience === "reachable"}
            onChange={() => onAudienceChange("reachable")}
            className="mt-0.5 size-4 shrink-0 accent-primary"
          />
          <span>Reachable profiles only ({reachablePopulation})</span>
        </label>
      </fieldset>
      {audienceWarning ? (
        <p role="alert" className="mt-3 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-foreground">
          {audienceWarning}
        </p>
      ) : null}
    </div>
  );
}