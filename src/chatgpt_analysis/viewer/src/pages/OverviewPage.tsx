import type { ReactNode } from "react";
import { summariseArchitectureDesign, summariseProfiles, summariseProvenance, summariseTopics } from "../domain/aggregations.ts";
import type { Atlas } from "../domain/atlas.ts";
import { filterArchitectureEpisodes, filterChats, filterClaims, filterOccurrences, filterScoredAggregates, type AtlasFilters } from "../domain/filters.ts";
import type { TopicId } from "../domain/values.ts";
import { BarChart, type ChartDatum } from "../components/AccessibleCharts.tsx";
import { humanise } from "../components/Presentation.tsx";

export type OverviewPageProps = {
  readonly atlas: Atlas;
  readonly filters: AtlasFilters;
  readonly onSelectTopic: (topicId: TopicId) => void;
};

type KeyFigureProps = {
  readonly label: string;
  readonly value: number;
  readonly explanation: string;
};

function KeyFigure({ label, value, explanation }: KeyFigureProps): ReactNode {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <dt className="text-xs font-bold uppercase tracking-wide text-slate-500">{label}</dt>
      <dd className="mt-2 text-4xl font-bold tracking-tight text-slate-950">{value.toLocaleString()}</dd>
      <p className="mt-2 text-sm leading-6 text-slate-600">{explanation}</p>
    </div>
  );
}

function topicChartData(atlas: Atlas, filters: AtlasFilters): ReadonlyArray<ChartDatum> {
  return summariseTopics(atlas, filterOccurrences(atlas, filters))
    .filter((summary) => summary.occurrenceCount.value > 0)
    .slice(0, 8)
    .map((summary) => ({
      id: summary.topic.topicId.value,
      label: summary.topic.label,
      value: summary.occurrenceCount.value,
      detail: `${summary.chatCount.value} chats`,
    }));
}

export function OverviewPage({ atlas, filters, onSelectTopic }: OverviewPageProps): ReactNode {
  const occurrences = filterOccurrences(atlas, filters);
  const chats = filterChats(atlas, filters);
  const claims = filterClaims(atlas, filters);
  const metrics = filterScoredAggregates(atlas, filters);
  const provenance = summariseProvenance(occurrences).map((summary) => ({
    id: summary.provenance.value,
    label: humanise(summary.provenance.value),
    value: summary.occurrenceCount.value,
    detail: "filtered occurrences",
  }));
  const profileCounts = summariseProfiles(metrics).map((summary) => ({
    id: summary.profile,
    label: humanise(summary.profile),
    value: summary.metricCount.value,
    detail: `mean raw delta ${summary.averageDelta.value >= 0 ? "+" : ""}${summary.averageDelta.value.toFixed(2)}`,
  }));
  const architecture = summariseArchitectureDesign(filterArchitectureEpisodes(atlas, filters)).map((summary) => ({
    id: summary.designStyle,
    label: humanise(summary.designStyle),
    value: summary.episodeCount.value,
    detail: "sanitized architecture episodes",
  }));
  const topTopics = summariseTopics(atlas, occurrences).filter((summary) => summary.occurrenceCount.value > 0).slice(0, 8);

  return (
    <div className="grid gap-8">
      <section aria-labelledby="overview-heading">
        <p className="text-sm font-semibold tracking-wide text-sky-800">Overview</p>
        <h2 className="mt-1 text-3xl font-bold tracking-tight text-slate-950" id="overview-heading">
          {atlas.metadata.title} at a glance
        </h2>
        <p className="mt-3 max-w-4xl text-base leading-7 text-slate-700">
          {atlas.metadata.description}
        </p>
      </section>

      <dl className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KeyFigure explanation="Chats visible under the active date, subject, context, provenance, and confidence filters." label="Filtered chats" value={chats.length} />
        <KeyFigure explanation="Evidence-linked occurrences with their source provenance and confidence." label="Filtered occurrences" value={occurrences.length} />
        <KeyFigure explanation="Claims matched by the selected report and scorable-result status." label="Visible claims" value={claims.length} />
        <KeyFigure explanation="Endpoint metric rows matched by report and result status." label="Scored metric rows" value={metrics.length} />
      </dl>

      <section aria-labelledby="topic-summary-heading" className="grid gap-4 lg:grid-cols-2">
        <BarChart description="The eight most frequently occurring topics in the currently visible evidence." title="Top filtered topics" valueLabel="Occurrences" values={topicChartData(atlas, filters)} />
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <h3 className="text-base font-semibold text-slate-950" id="topic-summary-heading">
            Explore a topic page
          </h3>
          <p className="mt-1 text-sm leading-6 text-slate-600">Open a topic to inspect its chronological chats, evidence summaries, bounded excerpts, and turn coordinates.</p>
          <ol className="mt-4 grid gap-2">
            {topTopics.map((summary) => (
              <li className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 p-3" key={summary.topic.topicId.value}>
                <div>
                  <p className="font-semibold text-slate-900">{summary.topic.label}</p>
                  <p className="text-sm text-slate-600">{summary.occurrenceCount.value} occurrences across {summary.chatCount.value} chats</p>
                </div>
                <button
                  className="rounded-md border border-sky-700 px-3 py-2 text-sm font-semibold text-sky-900 hover:bg-sky-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-950"
                  onClick={() => {
                    onSelectTopic(summary.topic.topicId);
                  }}
                  type="button"
                >
                  Open
                </button>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section aria-label="Evidence distributions" className="grid gap-4 lg:grid-cols-2">
        <BarChart description="How the currently visible topic occurrences are sourced." title="Occurrence provenance" valueLabel="Occurrences" values={provenance} />
        {profileCounts.length > 0 ? <BarChart description="Count of visible scored endpoint rows by profile; table details include average raw deltas." title="Scored metrics by profile" valueLabel="Metric rows" values={profileCounts} /> : null}
      </section>

      {architecture.length > 0 ? (
        <section aria-label="Architecture episodes">
          <BarChart description="Sanitized architecture episodes, grouped by the recorded design style and constrained by active chat filters." title="Architecture episode design styles" valueLabel="Episodes" values={architecture} />
        </section>
      ) : null}
    </div>
  );
}
