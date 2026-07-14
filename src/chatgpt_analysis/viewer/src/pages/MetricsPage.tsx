import type { ReactNode } from "react";
import { longestRollingSeries, summariseArchitectureDesign } from "../domain/aggregations.ts";
import type { Atlas, MatchedDelta, ScoredAggregate } from "../domain/atlas.ts";
import { filterAggregateOnlyMetrics, filterArchitectureEpisodes, filterRollingMetrics, filterScoredAggregates, type AtlasFilters } from "../domain/filters.ts";
import { BarChart, LineChart, type ChartDatum } from "../components/AccessibleCharts.tsx";
import { formatScore, formatScoreDelta, humanise, StatusBadge } from "../components/Presentation.tsx";

export type MetricsPageProps = {
  readonly atlas: Atlas;
  readonly filters: AtlasFilters;
};

function matchedDeltaText(value: MatchedDelta): string {
  if (value.kind === "unavailable") {
    return "Not available";
  }

  return `${value.value.value >= 0 ? "+" : ""}${value.value.value.toFixed(2)}`;
}

function intervalText(metric: ScoredAggregate): string {
  if (metric.bootstrapLower.kind === "score_delta_unavailable" || metric.bootstrapUpper.kind === "score_delta_unavailable") {
    return "Not scorable";
  }

  return `${metric.bootstrapLower.value.value.toFixed(2)} to ${metric.bootstrapUpper.value.value.toFixed(2)}`;
}

function rawDeltaChart(metrics: ReadonlyArray<ScoredAggregate>): ReadonlyArray<ChartDatum> {
  return metrics
    .filter((metric) => metric.rawDelta.kind === "score_delta_available")
    .sort((first, second) => {
      if (first.rawDelta.kind === "score_delta_unavailable" || second.rawDelta.kind === "score_delta_unavailable") {
        return 0;
      }

      return Math.abs(second.rawDelta.value.value) - Math.abs(first.rawDelta.value.value);
    })
    .slice(0, 12)
    .map((metric) => {
      if (metric.rawDelta.kind === "score_delta_unavailable") {
        return {
          id: `${metric.profile}-${metric.dimension.value}`,
          label: humanise(metric.dimension.value),
          value: 0,
          detail: "not scorable",
        };
      }

      return {
        id: `${metric.profile}-${metric.dimension.value}`,
        label: `${humanise(metric.profile)}: ${humanise(metric.dimension.value)}`,
        value: metric.rawDelta.value.value,
        detail: metric.status,
      };
    });
}

export function MetricsPage({ atlas, filters }: MetricsPageProps): ReactNode {
  const scored = filterScoredAggregates(atlas, filters);
  const aggregateOnly = filterAggregateOnlyMetrics(atlas, filters);
  const rolling = filterRollingMetrics(atlas, filters);
  const architectureEpisodes = filterArchitectureEpisodes(atlas, filters);
  const rollingSeries = longestRollingSeries(rolling);
  const architectureChart = summariseArchitectureDesign(architectureEpisodes).map((summary) => ({
    id: summary.designStyle,
    label: humanise(summary.designStyle),
    value: summary.episodeCount.value,
    detail: "sanitized episodes",
  }));
  const sortedMetrics = [...scored].sort((first, second) => first.profile.localeCompare(second.profile) || first.dimension.value.localeCompare(second.dimension.value));

  return (
    <div className="grid gap-8">
      <section aria-labelledby="metrics-heading">
        <p className="text-sm font-semibold tracking-wide text-sky-800">Profiles and metrics</p>
        <h2 className="mt-1 text-3xl font-bold tracking-tight text-slate-950" id="metrics-heading">
          Aggregate evidence-conditioned measurements
        </h2>
        <p className="mt-3 max-w-4xl text-base leading-7 text-slate-700">These rows are fixed aggregate calculations from the validated atlas. Date, topic, context, provenance, and confidence filters do not recompute them; report and scorable-status filters scope the available rows.</p>
      </section>

      <BarChart description="The twelve largest available raw start-to-end changes by absolute magnitude. Green indicates a positive raw change and red a negative raw change." title="Largest available raw score changes" valueLabel="Raw delta" values={rawDeltaChart(scored)} />

      {rollingSeries.kind === "rolling_series_available" ? (
        <LineChart
          description={`Privacy-preserving 90-day rolling mean for ${humanise(rollingSeries.series.profile)} / ${humanise(rollingSeries.series.dimension.value)}. Each table row includes the contributing aggregate chat count.`}
          title="Rolling metric trajectory"
          valueLabel="Mean score / 4"
          values={rollingSeries.series.points.map((point) => ({
            id: point.windowEnd.value,
            label: point.windowEnd.value,
            value: point.mean.value,
            detail: `${point.chatCount.value} aggregate chats`,
          }))}
        />
      ) : (
        <p className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-600">No rolling metrics are available under the selected report and scorable-status filters.</p>
      )}

      <section aria-labelledby="metric-table-heading" className="min-w-0 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="text-lg font-bold text-slate-950" id="metric-table-heading">Endpoint metric rows</h3>
        <div className="mt-4 overflow-x-auto rounded-xl border border-slate-200">
          <table className="min-w-max border-collapse text-left text-sm">
            <thead className="border-b border-slate-300 bg-slate-50 text-slate-700">
              <tr>
                <th className="px-2 py-2 font-semibold" scope="col">Profile</th>
                <th className="px-2 py-2 font-semibold" scope="col">Dimension</th>
                <th className="px-2 py-2 font-semibold" scope="col">Start</th>
                <th className="px-2 py-2 font-semibold" scope="col">End</th>
                <th className="px-2 py-2 font-semibold" scope="col">Raw Δ</th>
                <th className="px-2 py-2 font-semibold" scope="col">95% interval</th>
                <th className="px-2 py-2 font-semibold" scope="col">Matched Δ</th>
                <th className="px-2 py-2 font-semibold" scope="col">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {sortedMetrics.map((metric) => (
                <tr className="align-top odd:bg-white even:bg-slate-50/50" key={`${metric.profile}-${metric.dimension.value}`}>
                  <td className="px-2 py-2 text-slate-700">{humanise(metric.profile)}</td>
                  <th className="px-2 py-2 font-medium text-slate-950" scope="row">{humanise(metric.dimension.value)}</th>
                  <td className="px-2 py-2 text-slate-700">{formatScore(metric.startMean)} ({metric.startCount.value})</td>
                  <td className="px-2 py-2 text-slate-700">{formatScore(metric.endMean)} ({metric.endCount.value})</td>
                  <td className="px-2 py-2 text-slate-700">{formatScoreDelta(metric.rawDelta)}</td>
                  <td className="px-2 py-2 text-slate-700">{intervalText(metric)}</td>
                  <td className="px-2 py-2 text-slate-700">{matchedDeltaText(metric.matchedDelta)}</td>
                  <td className="px-2 py-2"><StatusBadge status={metric.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {sortedMetrics.length === 0 ? <p className="mt-4 rounded-lg border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-600">No score rows match the report and scorable-status filters.</p> : null}
      </section>

      <section aria-label="Architecture metrics">
        <BarChart description="Sanitized architecture episodes by design style. Episode records do not disclose transcript content." title="Architecture episode design styles" valueLabel="Episodes" values={architectureChart} />
      </section>

      <section aria-labelledby="aggregate-only-heading" className="min-w-0 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="text-lg font-bold text-slate-950" id="aggregate-only-heading">Aggregate-only metrics</h3>
        <p className="mt-1 text-sm leading-6 text-slate-600">Privacy-restricted windows are displayed without chat identifiers. They are hidden when a scorable-status filter is active because they have no status field.</p>
        <div className="mt-4 overflow-x-auto rounded-xl border border-slate-200">
          <table className="min-w-max border-collapse text-left text-sm">
            <thead className="border-b border-slate-300 bg-slate-50 text-slate-700">
              <tr>
                <th className="px-2 py-2 font-semibold" scope="col">Profile</th>
                <th className="px-2 py-2 font-semibold" scope="col">Dimension</th>
                <th className="px-2 py-2 font-semibold" scope="col">Window</th>
                <th className="px-2 py-2 font-semibold" scope="col">Mean</th>
                <th className="px-2 py-2 font-semibold" scope="col">Chats</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {aggregateOnly.map((metric) => (
                <tr className="odd:bg-white even:bg-slate-50/50" key={`${metric.profile}-${metric.dimension.value}-${metric.window}`}>
                  <td className="px-2 py-2 text-slate-700">{humanise(metric.profile)}</td>
                  <th className="px-2 py-2 font-medium text-slate-950" scope="row">{humanise(metric.dimension.value)}</th>
                  <td className="px-2 py-2 text-slate-700">{metric.window}</td>
                  <td className="px-2 py-2 text-slate-700">{metric.mean.value.toFixed(2)} / 4</td>
                  <td className="px-2 py-2 text-slate-700">{metric.chatCount.value}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
