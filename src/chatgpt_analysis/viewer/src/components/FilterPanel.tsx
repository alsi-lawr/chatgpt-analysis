import type { FormEvent, ReactNode } from "react";
import type { Atlas } from "../domain/atlas.ts";
import type { AtlasFilters, ContextFilter, DateFilter, ReportFilter, SubjectFilter } from "../domain/filters.ts";
import { serialiseAtlasRoute, type AtlasRoute } from "../domain/url-state.ts";
import type { AggregateStatus, AtlasDomain, InteractionMode, Provenance } from "../domain/values.ts";

export type FilterPanelProps = {
  readonly atlas: Atlas;
  readonly route: AtlasRoute;
  readonly onApply: (parameters: URLSearchParams) => void;
  readonly onClear: () => void;
};

type DateInputs = {
  readonly from: string;
  readonly to: string;
};

const scorableStatuses: ReadonlyArray<AggregateStatus> = ["strong progression", "suggestive progression", "mixed", "insufficient"];
const fieldClass = "grid min-w-0 gap-1.5 text-sm font-semibold text-slate-800";
const controlClass = "block h-11 w-full min-w-0 rounded-lg border border-slate-300 bg-white px-3 py-2 font-normal text-slate-950 shadow-sm outline-none transition hover:border-slate-400 focus:border-sky-700 focus:ring-2 focus:ring-sky-200";
const selectClass = `${controlClass} appearance-auto pr-9`;

function dateInputs(filter: DateFilter): DateInputs {
  switch (filter.kind) {
    case "all_dates":
      return { from: "", to: "" };
    case "between_dates":
      return { from: filter.start.value, to: filter.end.value };
    case "from_date":
      return { from: filter.start.value, to: "" };
    case "to_date":
      return { from: "", to: filter.end.value };
  }
}

function subjectInputValue(filter: SubjectFilter): string {
  switch (filter.kind) {
    case "all_subjects":
      return "all";
    case "thread_subject":
      return `thread:${filter.threadId.value}`;
    case "topic_subject":
      return `topic:${filter.topicId.value}`;
  }
}

function reportInputValue(filter: ReportFilter): string {
  switch (filter.kind) {
    case "all_reports":
      return "all";
    case "report":
      return filter.reportId.value;
  }
}

function contextInputValue(filter: ContextFilter): string {
  switch (filter.kind) {
    case "all_contexts":
      return "all";
    case "domain_context":
      return `domain:${filter.domain.value}`;
    case "mode_context":
      return `mode:${filter.mode.value}`;
  }
}

function provenanceInputValue(filters: AtlasFilters): string {
  if (filters.provenance.kind === "provenance") {
    return filters.provenance.provenance.value;
  }

  return "all";
}

function confidenceInputValue(filters: AtlasFilters): string {
  if (filters.confidence.kind === "minimum_confidence") {
    return filters.confidence.minimum.value.toFixed(2);
  }

  return "all";
}

function statusInputValue(filters: AtlasFilters): string {
  if (filters.scorableStatus.kind === "scorable_status") {
    return filters.scorableStatus.status;
  }

  return "all";
}

function uniqueDomains(atlas: Atlas): ReadonlyArray<AtlasDomain> {
  const values = new Map<string, AtlasDomain>();

  for (const chat of atlas.chats) {
    for (const domain of chat.domains) {
      values.set(domain.value, domain);
    }
  }

  return [...values.values()].sort((first, second) => first.value.localeCompare(second.value));
}

function uniqueModes(atlas: Atlas): ReadonlyArray<InteractionMode> {
  const values = new Map<string, InteractionMode>();

  for (const chat of atlas.chats) {
    for (const mode of chat.modes) {
      values.set(mode.value, mode);
    }
  }

  return [...values.values()].sort((first, second) => first.value.localeCompare(second.value));
}

function uniqueProvenance(atlas: Atlas): ReadonlyArray<Provenance> {
  const values = new Map<string, Provenance>();

  for (const occurrence of atlas.occurrences) {
    values.set(occurrence.provenance.value, occurrence.provenance);
  }

  return [...values.values()].sort((first, second) => first.value.localeCompare(second.value));
}

function readable(value: string): string {
  return value.replaceAll(/[_/]/g, " ");
}

function formParameters(form: HTMLFormElement): URLSearchParams {
  const parameters = new URLSearchParams();

  for (const [name, value] of new FormData(form).entries()) {
    if (typeof value === "string") {
      parameters.set(name, value);
    }
  }

  return parameters;
}

export function FilterPanel({ atlas, route, onApply, onClear }: FilterPanelProps): ReactNode {
  const initialDates = dateInputs(route.filters.date);
  const formKey = serialiseAtlasRoute(route).toString();
  const domains = uniqueDomains(atlas);
  const modes = uniqueModes(atlas);
  const provenance = uniqueProvenance(atlas);

  const apply = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault();
    onApply(formParameters(event.currentTarget));
  };

  return (
    <section aria-labelledby="filter-heading" className="min-w-0 overflow-visible rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-col gap-3 border-b border-slate-200 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
        <div>
          <h2 className="text-base font-bold text-slate-950" id="filter-heading">
            Atlas filters
          </h2>
          <p className="mt-1 text-sm leading-5 text-slate-600">Narrow evidence, reports, and metrics. Selections are preserved in the page URL.</p>
        </div>
        <button
          className="self-start rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-slate-400 hover:bg-slate-50 hover:text-slate-950 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-950 sm:self-auto"
          onClick={onClear}
          type="button"
        >
          Clear filters
        </button>
      </div>
      <form className="grid min-w-0 gap-4 p-4 sm:grid-cols-2 sm:p-5 xl:grid-cols-3 2xl:grid-cols-4" key={formKey} onSubmit={apply}>
        <input name="view" type="hidden" value={route.view} />
        <fieldset className="grid min-w-0 grid-cols-1 gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3 sm:col-span-2 sm:grid-cols-2 xl:col-span-1">
          <legend className="text-sm font-semibold text-slate-800">Date range</legend>
          <label className="grid min-w-0 gap-1.5 text-sm text-slate-700" htmlFor="filter-from">
            From
            <input className={controlClass} defaultValue={initialDates.from} id="filter-from" name="from" type="date" />
          </label>
          <label className="grid min-w-0 gap-1.5 text-sm text-slate-700" htmlFor="filter-to">
            To
            <input className={controlClass} defaultValue={initialDates.to} id="filter-to" name="to" type="date" />
          </label>
        </fieldset>
        <label className={fieldClass} htmlFor="filter-subject">
          Topic or recurring thread
          <select className={selectClass} defaultValue={subjectInputValue(route.filters.subject)} id="filter-subject" name="subject">
            <option value="all">All topics and threads</option>
            <optgroup label="Topics">
              {atlas.topics.map((topic) => (
                <option key={topic.topicId.value} value={`topic:${topic.topicId.value}`}>
                  {topic.label}
                </option>
              ))}
            </optgroup>
            <optgroup label="Recurring threads">
              {atlas.threads.map((thread) => (
                <option key={thread.threadId.value} value={`thread:${thread.threadId.value}`}>
                  {thread.label}
                </option>
              ))}
            </optgroup>
          </select>
        </label>
        <label className={fieldClass} htmlFor="filter-report">
          Report
          <select className={selectClass} defaultValue={reportInputValue(route.filters.report)} id="filter-report" name="report">
            <option value="all">All reports</option>
            {atlas.reports.map((report) => (
              <option key={report.reportId.value} value={report.reportId.value}>
                {report.title}
              </option>
            ))}
          </select>
        </label>
        <label className={fieldClass} htmlFor="filter-context">
          Domain or interaction mode
          <select className={selectClass} defaultValue={contextInputValue(route.filters.context)} id="filter-context" name="context">
            <option value="all">All domains and modes</option>
            <optgroup label="Domains">
              {domains.map((domain) => (
                <option key={domain.value} value={`domain:${domain.value}`}>
                  {readable(domain.value)}
                </option>
              ))}
            </optgroup>
            <optgroup label="Interaction modes">
              {modes.map((mode) => (
                <option key={mode.value} value={`mode:${mode.value}`}>
                  {readable(mode.value)}
                </option>
              ))}
            </optgroup>
          </select>
        </label>
        <label className={fieldClass} htmlFor="filter-provenance">
          Provenance
          <select className={selectClass} defaultValue={provenanceInputValue(route.filters)} id="filter-provenance" name="provenance">
            <option value="all">All provenance</option>
            {provenance.map((value) => (
              <option key={value.value} value={value.value}>
                {readable(value.value)}
              </option>
            ))}
          </select>
        </label>
        <label className={fieldClass} htmlFor="filter-confidence">
          Occurrence confidence
          <select className={selectClass} defaultValue={confidenceInputValue(route.filters)} id="filter-confidence" name="confidence">
            <option value="all">All confidence levels</option>
            <option value="0.90">0.90 or above</option>
            <option value="0.95">0.95 or above</option>
          </select>
        </label>
        <label className={fieldClass} htmlFor="filter-status">
          Scorable result status
          <select className={selectClass} defaultValue={statusInputValue(route.filters)} id="filter-status" name="status">
            <option value="all">All result statuses</option>
            {scorableStatuses.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
        </label>
        <div className="flex min-w-0 items-end">
          <button className="h-11 w-full rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-950" type="submit">
            Apply filters
          </button>
        </div>
      </form>
    </section>
  );
}
