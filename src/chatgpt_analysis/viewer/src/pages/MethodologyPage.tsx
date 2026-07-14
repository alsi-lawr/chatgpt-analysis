import type { ReactNode } from "react";
import type { Atlas } from "../domain/atlas.ts";

export type MethodologyPageProps = {
  readonly atlas: Atlas;
};

export function MethodologyPage({ atlas }: MethodologyPageProps): ReactNode {
  return (
    <div className="grid gap-8">
      <section aria-labelledby="methodology-heading">
        <p className="text-sm font-semibold tracking-wide text-sky-800">Methodology</p>
        <h2 className="mt-1 text-3xl font-bold tracking-tight text-slate-950" id="methodology-heading">
          What this atlas does—and does not—measure
        </h2>
        <p className="mt-3 max-w-4xl text-base leading-7 text-slate-700">The viewer consumes the static atlas generated from {atlas.metadata.generatedFrom}. It does not upload, enrich, or otherwise transmit the data.</p>
      </section>

      <section aria-labelledby="coverage-heading" className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="text-lg font-bold text-slate-950" id="coverage-heading">Displayed coverage</h3>
        <dl className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <dt className="text-sm text-slate-600">Displayed chats</dt>
            <dd className="mt-1 text-2xl font-bold text-slate-950">{atlas.coverage.chatCount.value}</dd>
          </div>
          <div>
            <dt className="text-sm text-slate-600">Topic occurrences</dt>
            <dd className="mt-1 text-2xl font-bold text-slate-950">{atlas.coverage.topicOccurrenceCount.value}</dd>
          </div>
          <div>
            <dt className="text-sm text-slate-600">Claims</dt>
            <dd className="mt-1 text-2xl font-bold text-slate-950">{atlas.coverage.claimCount.value}</dd>
          </div>
          <div>
            <dt className="text-sm text-slate-600">Optional metric / event rows</dt>
            <dd className="mt-1 text-2xl font-bold text-slate-950">{atlas.rolling.length} / {atlas.architectureEpisodes.length}</dd>
          </div>
        </dl>
      </section>

      <section aria-labelledby="reading-heading" className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="text-lg font-bold text-slate-950" id="reading-heading">How to read the evidence</h3>
        <ol className="mt-4 grid list-decimal gap-3 pl-5 text-sm leading-6 text-slate-700">
          <li>Topic occurrences are evidence-linked and may include bounded excerpts and turn coordinates when the generator permits their disclosure.</li>
          <li>Claims distinguish evidence, counterevidence, alternatives, and coverage. They do not establish diagnoses, universal trait statements, correctness, or causality.</li>
          <li>Optional metrics appear only when the analysis produced a defined aggregate basis. An unavailable metric is not a score of zero.</li>
          <li>Optional rolling or event records retain the privacy constraints stated by the generating analysis.</li>
        </ol>
      </section>

      <section aria-labelledby="limits-heading" className="rounded-xl border border-amber-200 bg-amber-50 p-5">
        <h3 className="text-lg font-bold text-slate-950" id="limits-heading">Limits carried with the atlas</h3>
        <ul className="mt-4 grid list-disc gap-2 pl-5 text-sm leading-6 text-slate-800">
          {atlas.limits.map((limit) => (
            <li key={limit}>{limit}</li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="privacy-heading" className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="text-lg font-bold text-slate-950" id="privacy-heading">Privacy and provenance boundaries</h3>
        <p className="mt-3 text-sm leading-6 text-slate-700">{atlas.metadata.privacyNotice} No client-side analytics, storage, or external requests are used beyond loading the local atlas JSON and user-selected report links.</p>
      </section>
    </div>
  );
}
