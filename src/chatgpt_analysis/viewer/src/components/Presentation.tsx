import type { ReactNode } from "react";
import type { ScoreAvailability, ScoreDeltaAvailability } from "../domain/atlas.ts";
import type { AggregateStatus, ClaimStatus } from "../domain/values.ts";

export type StatusBadgeProps = {
  readonly status: AggregateStatus | ClaimStatus;
};

function badgeClass(status: AggregateStatus | ClaimStatus): string {
  switch (status) {
    case "strong progression":
      return "rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-900";
    case "suggestive progression":
      return "rounded-full bg-sky-100 px-2.5 py-1 text-xs font-semibold text-sky-900";
    case "mixed":
      return "rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-900";
    case "insufficient":
      return "rounded-full bg-slate-200 px-2.5 py-1 text-xs font-semibold text-slate-800";
    case "supported":
      return "rounded-full bg-violet-100 px-2.5 py-1 text-xs font-semibold text-violet-900";
  }
}

export function StatusBadge({ status }: StatusBadgeProps): ReactNode {
  return <span className={badgeClass(status)}>{status}</span>;
}

export function humanise(value: string): string {
  return value.replaceAll(/[_/]/g, " ");
}

export function formatConfidence(value: number): string {
  return value.toFixed(2);
}

export function formatScore(value: ScoreAvailability): string {
  if (value.kind === "score_unavailable") {
    return "Not scorable";
  }

  return `${value.value.value.toFixed(2)} / 4`;
}

export function formatScoreDelta(value: ScoreDeltaAvailability): string {
  if (value.kind === "score_delta_unavailable") {
    return "Not scorable";
  }

  return `${value.value.value >= 0 ? "+" : ""}${value.value.value.toFixed(2)}`;
}
