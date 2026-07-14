import type { ReactNode } from "react";
import type { Atlas } from "../domain/atlas.ts";
import { filterClaims, type AtlasFilters } from "../domain/filters.ts";
import type { ReportId } from "../domain/values.ts";
import { humanise } from "../components/Presentation.tsx";

export type ReportsPageProps = {
  readonly atlas: Atlas;
  readonly filters: AtlasFilters;
  readonly onOpenReport: (reportId: ReportId) => void;
  readonly onSelectReport: (reportId: ReportId) => void;
};

function reportCardClass(isActive: boolean): string {
  if (isActive) {
    return "flex min-w-0 flex-col rounded-2xl border border-sky-300 bg-sky-50 p-5 shadow-sm ring-1 ring-sky-200";
  }

  return "flex min-w-0 flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md";
}

export function ReportsPage({ atlas, filters, onOpenReport, onSelectReport }: ReportsPageProps): ReactNode {
  const visibleClaims = filterClaims(atlas, filters);

  return (
    <div className="grid gap-8">
      <section aria-labelledby="reports-heading">
        <p className="text-sm font-semibold tracking-wide text-sky-800">Reports</p>
        <h2 className="mt-1 text-3xl font-bold tracking-tight text-slate-950" id="reports-heading">
          Report lenses and their evidence
        </h2>
        <p className="mt-3 max-w-4xl text-base leading-7 text-slate-700">
          Each report lens groups a bounded set of profiles and claims. Selecting one updates URL state and scopes the metric and claim views without navigating to a separate route system.
        </p>
      </section>

      <section aria-label="Available reports" className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {atlas.reports.map((report) => {
          const reportClaims = atlas.claims.filter((claim) => claim.reportIds.some((reportId) => reportId.value === report.reportId.value));
          const active = filters.report.kind === "report" && filters.report.reportId.value === report.reportId.value;

          return (
            <article className={reportCardClass(active)} key={report.reportId.value}>
              <div className="flex items-start justify-between gap-3">
                <h3 className="text-lg font-bold text-slate-950">{report.title}</h3>
                {active ? <span className="rounded-full bg-sky-100 px-2.5 py-1 text-xs font-semibold text-sky-900">Active</span> : null}
              </div>
              <p className="mt-3 grow text-sm leading-6 text-slate-700">{report.description}</p>
              <dl className="mt-4 grid gap-2 text-sm">
                <div className="flex justify-between gap-3">
                  <dt className="text-slate-600">Profiles</dt>
                  <dd className="text-right font-medium text-slate-900">{report.profiles.length === 0 ? "Topic and evidence index" : report.profiles.map((profile) => humanise(profile)).join(", ")}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-slate-600">Claims</dt>
                  <dd className="font-medium text-slate-900">{reportClaims.length}</dd>
                </div>
              </dl>
              <div className="mt-5 grid gap-2 sm:grid-cols-2 md:grid-cols-1 2xl:grid-cols-2">
                <button
                  className="rounded-lg bg-slate-900 px-3 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-950"
                  onClick={() => {
                    onSelectReport(report.reportId);
                  }}
                  type="button"
                >
                  {active ? "Selected" : "Use as filter"}
                </button>
                <button
                  className="rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-center text-sm font-semibold text-slate-800 shadow-sm transition hover:border-slate-400 hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-950"
                  onClick={() => {
                    onOpenReport(report.reportId);
                  }}
                  type="button"
                >
                  Open report
                </button>
              </div>
            </article>
          );
        })}
      </section>

      <section aria-labelledby="report-claim-count-heading" className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="text-lg font-bold text-slate-950" id="report-claim-count-heading">
          Current report-filter result
        </h3>
        <p className="mt-2 text-sm leading-6 text-slate-700">
          {visibleClaims.length} claims match the current report and scorable-status filters. Use the Evidence view to inspect their support, counterevidence, alternatives, and coverage boundaries.
        </p>
      </section>
    </div>
  );
}
