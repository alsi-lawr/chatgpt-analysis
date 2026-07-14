import type { ReactNode } from "react";
import type { TopicOccurrence } from "../domain/atlas.ts";
import { humanise } from "./Presentation.tsx";

export type OccurrenceEvidenceProps = {
  readonly occurrence: TopicOccurrence;
};

export function OccurrenceEvidence({ occurrence }: OccurrenceEvidenceProps): ReactNode {
  return (
    <>
      <div className="flex flex-wrap gap-2 text-xs font-semibold">
        <span className="rounded-full bg-sky-100 px-2 py-1 text-sky-900">{humanise(occurrence.stance.value)}</span>
        <span className="rounded-full bg-slate-200 px-2 py-1 text-slate-800">Turns {occurrence.startTurn.value}–{occurrence.endTurn.value}</span>
        <span className="rounded-full bg-slate-200 px-2 py-1 text-slate-800">{humanise(occurrence.provenance.value)} · {occurrence.confidence.value.toFixed(2)}</span>
      </div>
      {occurrence.summary.length > 0 ? <p className="mt-3 text-sm leading-6 text-slate-700">{occurrence.summary}</p> : <p className="mt-3 text-sm italic text-slate-600">No additional summary is disclosed for this occurrence.</p>}
      {occurrence.excerpts.length === 0 ? <p className="mt-3 text-sm italic text-slate-600">No bounded user excerpt is available.</p> : null}
      <div className="mt-3 grid gap-2">
        {occurrence.excerpts.map((excerpt) => (
          <blockquote className="border-l-4 border-sky-300 pl-3 text-sm leading-6 text-slate-800" key={`${occurrence.occurrenceId.value}-${excerpt.turnNumber.value}`}>
            <p>{excerpt.text}</p>
            <footer className="mt-1 text-xs font-semibold text-slate-500">User turn {excerpt.turnNumber.value}</footer>
          </blockquote>
        ))}
      </div>
    </>
  );
}
