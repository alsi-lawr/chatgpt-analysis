import type { ReactNode } from "react";
import type { AnalysisClaim, Atlas, ClaimCoverage, ClaimEvidence } from "../domain/atlas.ts";
import { filterClaims, filterOccurrences, findChat, type AtlasFilters } from "../domain/filters.ts";
import { humanise, StatusBadge } from "../components/Presentation.tsx";

export type EvidencePageProps = {
  readonly atlas: Atlas;
  readonly filters: AtlasFilters;
};

type EvidenceReferenceTableProps = {
  readonly atlas: Atlas;
  readonly caption: string;
  readonly evidence: ReadonlyArray<ClaimEvidence>;
};

function coverageText(coverage: ClaimCoverage): string {
  switch (coverage.kind) {
    case "endpoint_coverage":
      return `Start ${coverage.startCount.value}; end ${coverage.endCount.value}; ${coverage.periods.map((period) => (typeof period === "string" ? period : humanise(period.value))).join(", ")}`;
    case "scoped_coverage":
      return `${coverage.chatCount.value} chats; ${coverage.domains.map((domain) => humanise(domain.value)).join(", ")}; ${coverage.periods.map((period) => (typeof period === "string" ? period : humanise(period.value))).join(", ")}`;
  }
}

function EvidenceReferenceTable({ atlas, caption, evidence }: EvidenceReferenceTableProps): ReactNode {
  if (evidence.length === 0) {
    return <p className="mt-3 text-sm italic text-slate-600">No disclosed {caption.toLowerCase()} references.</p>;
  }

  return (
    <div className="mt-3 overflow-x-auto rounded-xl border border-slate-200">
      <table className="min-w-max border-collapse text-left text-sm">
        <caption className="mb-2 text-left font-semibold text-slate-800">{caption}</caption>
        <thead className="border-b border-slate-300 bg-slate-50 text-slate-700">
          <tr>
            <th className="px-2 py-2 font-semibold" scope="col">Chat</th>
            <th className="px-2 py-2 font-semibold" scope="col">Turns</th>
            <th className="px-2 py-2 font-semibold" scope="col">Provenance</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {evidence.map((reference) => {
            const chat = findChat(atlas, reference.chatId);
            const title = chat.kind === "found" ? chat.value.title : reference.chatId.value;

            return (
              <tr className="odd:bg-white even:bg-slate-50/50" key={`${reference.chatId.value}-${reference.startTurn.value}-${reference.endTurn.value}`}>
                <th className="px-2 py-2 font-medium text-slate-950" scope="row">{title}</th>
                <td className="px-2 py-2 text-slate-700">{reference.startTurn.value}–{reference.endTurn.value}</td>
                <td className="px-2 py-2 text-slate-700">{humanise(reference.provenance.value)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

type ClaimCardProps = {
  readonly atlas: Atlas;
  readonly claim: AnalysisClaim;
};

function ClaimCard({ atlas, claim }: ClaimCardProps): ReactNode {
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-semibold tracking-wide text-slate-500">{humanise(claim.claimType.value)} · {claim.confidence} confidence</p>
          <p className="mt-2 text-base leading-7 text-slate-900">{claim.statement}</p>
        </div>
        <StatusBadge status={claim.status} />
      </header>
      <dl className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
        <div>
          <dt className="font-semibold text-slate-700">Coverage</dt>
          <dd className="mt-1 text-slate-600">{coverageText(claim.coverage)}</dd>
        </div>
        <div>
          <dt className="font-semibold text-slate-700">Privacy</dt>
          <dd className="mt-1 text-slate-600">{humanise(claim.privacy)}</dd>
        </div>
      </dl>
      <section aria-labelledby={`${claim.claimId.value}-alternatives`} className="mt-4">
        <h3 className="font-semibold text-slate-800" id={`${claim.claimId.value}-alternatives`}>Alternatives and limits</h3>
        <ul className="mt-2 grid list-disc gap-1 pl-5 text-sm leading-6 text-slate-700">
          {claim.alternatives.map((alternative) => (
            <li key={`${claim.claimId.value}-${alternative}`}>{alternative}</li>
          ))}
        </ul>
      </section>
      <section aria-label="Claim evidence" className="mt-4 grid gap-4 lg:grid-cols-2">
        <EvidenceReferenceTable atlas={atlas} caption="Support references" evidence={claim.support} />
        <EvidenceReferenceTable atlas={atlas} caption="Counterevidence references" evidence={claim.counterevidence} />
      </section>
    </article>
  );
}

export function EvidencePage({ atlas, filters }: EvidencePageProps): ReactNode {
  const claims = filterClaims(atlas, filters);
  const occurrences = filterOccurrences(atlas, filters);

  return (
    <div className="grid gap-8">
      <section aria-labelledby="evidence-heading">
        <p className="text-sm font-semibold tracking-wide text-sky-800">Evidence and counterevidence</p>
        <h2 className="mt-1 text-3xl font-bold tracking-tight text-slate-950" id="evidence-heading">
          Claims with their disclosed basis and limits
        </h2>
        <p className="mt-3 max-w-4xl text-base leading-7 text-slate-700">Claim filters apply to report and scorable status. The occurrence index below responds to date, subject, domain or mode, provenance, and confidence filters.</p>
      </section>

      <section aria-label="Analysis claims" className="grid gap-4">
        {claims.map((claim) => (
          <ClaimCard atlas={atlas} claim={claim} key={claim.claimId.value} />
        ))}
        {claims.length === 0 ? <p className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-600">No claims match the current report and scorable-status filters.</p> : null}
      </section>

      <section aria-labelledby="occurrence-index-heading" className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="text-lg font-bold text-slate-950" id="occurrence-index-heading">Filtered occurrence index</h3>
        <p className="mt-1 text-sm leading-6 text-slate-600">{occurrences.length} topic occurrences are available under the active evidence filters.</p>
        <details className="mt-4 rounded-lg border border-slate-200 p-3">
          <summary className="cursor-pointer text-sm font-semibold text-slate-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-950">Open occurrence index</summary>
          <div className="mt-3 overflow-x-auto rounded-xl border border-slate-200">
            <table className="min-w-full border-collapse text-left text-sm">
              <thead className="border-b border-slate-300 bg-slate-50 text-slate-700">
                <tr>
                  <th className="px-2 py-2 font-semibold" scope="col">Topic</th>
                  <th className="px-2 py-2 font-semibold" scope="col">Turns</th>
                  <th className="px-2 py-2 font-semibold" scope="col">Stance</th>
                  <th className="px-2 py-2 font-semibold" scope="col">Provenance</th>
                  <th className="px-2 py-2 font-semibold" scope="col">Confidence</th>
                  <th className="px-2 py-2 font-semibold" scope="col">Summary</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {occurrences.map((occurrence) => (
                  <tr className="align-top odd:bg-white even:bg-slate-50/50" key={occurrence.occurrenceId.value}>
                    <th className="px-2 py-2 font-medium text-slate-950" scope="row">{humanise(occurrence.topicId.value)}</th>
                    <td className="px-2 py-2 text-slate-700">{occurrence.startTurn.value}–{occurrence.endTurn.value}</td>
                    <td className="px-2 py-2 text-slate-700">{humanise(occurrence.stance.value)}</td>
                    <td className="px-2 py-2 text-slate-700">{humanise(occurrence.provenance.value)}</td>
                    <td className="px-2 py-2 text-slate-700">{occurrence.confidence.value.toFixed(2)}</td>
                    <td className="min-w-80 max-w-2xl px-2 py-2 text-slate-700">{occurrence.summary.length === 0 ? "No summary disclosed" : occurrence.summary}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
      </section>
    </div>
  );
}
