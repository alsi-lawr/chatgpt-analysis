import type { Atlas } from "./atlas.ts";
import { confidenceThreshold, defaultAtlasFilters, type AtlasFilters, type ContextFilter, type DateFilter, type ReportFilter, type SubjectFilter } from "./filters.ts";
import { parseAggregateStatus, parseCalendarDay, parseProvenance, type AtlasDomain, type CalendarDay, type InteractionMode } from "./values.ts";

export type AtlasView =
  | "chronology"
  | "evidence"
  | "methodology"
  | "metrics"
  | "overview"
  | "report"
  | "reports"
  | "threads"
  | "topics";

export type AtlasRoute = {
  readonly view: AtlasView;
  readonly filters: AtlasFilters;
};

type ParsedDay = AbsentDay | PresentDay;

type AbsentDay = {
  readonly kind: "absent_day";
};

type PresentDay = {
  readonly kind: "present_day";
  readonly value: CalendarDay;
};

type NamedValueLookup<T> = NamedValueFound<T> | NamedValueMissing;

type NamedValueFound<T> = {
  readonly kind: "found_named_value";
  readonly value: T;
};

type NamedValueMissing = {
  readonly kind: "missing_named_value";
};

function defaultView(): AtlasView {
  return "overview";
}

function parseView(value: string | null): AtlasView {
  if (value === "chronology") {
    return value;
  }
  if (value === "evidence") {
    return value;
  }
  if (value === "methodology") {
    return value;
  }
  if (value === "metrics") {
    return value;
  }
  if (value === "overview") {
    return value;
  }
  if (value === "report") {
    return value;
  }
  if (value === "reports") {
    return value;
  }
  if (value === "threads") {
    return value;
  }
  if (value === "topics") {
    return value;
  }
  return defaultView();
}

function parseDay(value: string | null): ParsedDay {
  if (value === null || value.length === 0) {
    return { kind: "absent_day" };
  }

  const day = parseCalendarDay(value, "URL date");

  if (day.kind === "invalid") {
    return { kind: "absent_day" };
  }

  return { kind: "present_day", value: day.value };
}

function parseDateFilter(parameters: URLSearchParams): DateFilter {
  const start = parseDay(parameters.get("from"));
  const end = parseDay(parameters.get("to"));

  if (start.kind === "absent_day" && end.kind === "absent_day") {
    return { kind: "all_dates" };
  }
  if (start.kind === "present_day" && end.kind === "absent_day") {
    return { kind: "from_date", start: start.value };
  }
  if (start.kind === "absent_day" && end.kind === "present_day") {
    return { kind: "to_date", end: end.value };
  }
  if (start.kind === "present_day" && end.kind === "present_day" && start.value.timestamp <= end.value.timestamp) {
    return { kind: "between_dates", start: start.value, end: end.value };
  }

  return { kind: "all_dates" };
}

function parseSubjectFilter(atlas: Atlas, value: string | null): SubjectFilter {
  if (value === null || value === "all") {
    return { kind: "all_subjects" };
  }
  if (value.startsWith("topic:")) {
    const topicValue = value.slice("topic:".length);

    for (const topic of atlas.topics) {
      if (topic.topicId.value === topicValue) {
        return { kind: "topic_subject", topicId: topic.topicId };
      }
    }
  }
  if (value.startsWith("thread:")) {
    const threadValue = value.slice("thread:".length);

    for (const thread of atlas.threads) {
      if (thread.threadId.value === threadValue) {
        return { kind: "thread_subject", threadId: thread.threadId };
      }
    }
  }

  return { kind: "all_subjects" };
}

function parseReportFilter(atlas: Atlas, value: string | null): ReportFilter {
  if (value === null || value === "all") {
    return { kind: "all_reports" };
  }

  for (const report of atlas.reports) {
    if (report.reportId.value === value) {
      return { kind: "report", reportId: report.reportId };
    }
  }

  return { kind: "all_reports" };
}

function findDomain(atlas: Atlas, value: string): NamedValueLookup<AtlasDomain> {
  for (const chat of atlas.chats) {
    for (const domain of chat.domains) {
      if (domain.value === value) {
        return { kind: "found_named_value", value: domain };
      }
    }
  }

  return { kind: "missing_named_value" };
}

function findMode(atlas: Atlas, value: string): NamedValueLookup<InteractionMode> {
  for (const chat of atlas.chats) {
    for (const mode of chat.modes) {
      if (mode.value === value) {
        return { kind: "found_named_value", value: mode };
      }
    }
  }

  return { kind: "missing_named_value" };
}

function parseContextFilter(atlas: Atlas, value: string | null): ContextFilter {
  if (value === null || value === "all") {
    return { kind: "all_contexts" };
  }
  if (value.startsWith("domain:")) {
    const domain = findDomain(atlas, value.slice("domain:".length));

    if (domain.kind === "found_named_value") {
      return { kind: "domain_context", domain: domain.value };
    }
  }
  if (value.startsWith("mode:")) {
    const mode = findMode(atlas, value.slice("mode:".length));

    if (mode.kind === "found_named_value") {
      return { kind: "mode_context", mode: mode.value };
    }
  }

  return { kind: "all_contexts" };
}

function parseProvenanceFilter(value: string | null): AtlasFilters["provenance"] {
  if (value === null || value === "all") {
    return { kind: "all_provenance" };
  }

  const provenance = parseProvenance(value, "URL provenance");

  if (provenance.kind === "invalid") {
    return { kind: "all_provenance" };
  }

  return { kind: "provenance", provenance: provenance.value };
}

function parseConfidenceFilter(value: string | null): AtlasFilters["confidence"] {
  if (value === "0.90") {
    return { kind: "minimum_confidence", minimum: confidenceThreshold(0.9) };
  }
  if (value === "0.95") {
    return { kind: "minimum_confidence", minimum: confidenceThreshold(0.95) };
  }

  return { kind: "all_confidence" };
}

function parseScorableStatusFilter(value: string | null): AtlasFilters["scorableStatus"] {
  if (value === null || value === "all") {
    return { kind: "all_scorable_statuses" };
  }

  const status = parseAggregateStatus(value, "URL scorable status");

  if (status.kind === "invalid") {
    return { kind: "all_scorable_statuses" };
  }

  return { kind: "scorable_status", status: status.value };
}

export function parseAtlasRoute(atlas: Atlas, parameters: URLSearchParams): AtlasRoute {
  const defaults = defaultAtlasFilters();

  return {
    view: parseView(parameters.get("view")),
    filters: {
      ...defaults,
      date: parseDateFilter(parameters),
      subject: parseSubjectFilter(atlas, parameters.get("subject")),
      report: parseReportFilter(atlas, parameters.get("report")),
      context: parseContextFilter(atlas, parameters.get("context")),
      provenance: parseProvenanceFilter(parameters.get("provenance")),
      confidence: parseConfidenceFilter(parameters.get("confidence")),
      scorableStatus: parseScorableStatusFilter(parameters.get("status")),
    },
  };
}

function writeDateFilter(parameters: URLSearchParams, filter: DateFilter): void {
  switch (filter.kind) {
    case "all_dates":
      return;
    case "between_dates":
      parameters.set("from", filter.start.value);
      parameters.set("to", filter.end.value);
      return;
    case "from_date":
      parameters.set("from", filter.start.value);
      return;
    case "to_date":
      parameters.set("to", filter.end.value);
      return;
  }
}

function writeSubjectFilter(parameters: URLSearchParams, filter: SubjectFilter): void {
  switch (filter.kind) {
    case "all_subjects":
      return;
    case "thread_subject":
      parameters.set("subject", `thread:${filter.threadId.value}`);
      return;
    case "topic_subject":
      parameters.set("subject", `topic:${filter.topicId.value}`);
      return;
  }
}

function writeReportFilter(parameters: URLSearchParams, filter: ReportFilter): void {
  switch (filter.kind) {
    case "all_reports":
      return;
    case "report":
      parameters.set("report", filter.reportId.value);
      return;
  }
}

function writeContextFilter(parameters: URLSearchParams, filter: ContextFilter): void {
  switch (filter.kind) {
    case "all_contexts":
      return;
    case "domain_context":
      parameters.set("context", `domain:${filter.domain.value}`);
      return;
    case "mode_context":
      parameters.set("context", `mode:${filter.mode.value}`);
      return;
  }
}

export function serialiseAtlasRoute(route: AtlasRoute): URLSearchParams {
  const parameters = new URLSearchParams();
  parameters.set("view", route.view);
  writeDateFilter(parameters, route.filters.date);
  writeSubjectFilter(parameters, route.filters.subject);
  writeReportFilter(parameters, route.filters.report);
  writeContextFilter(parameters, route.filters.context);

  if (route.filters.provenance.kind === "provenance") {
    parameters.set("provenance", route.filters.provenance.provenance.value);
  }
  if (route.filters.confidence.kind === "minimum_confidence") {
    parameters.set("confidence", route.filters.confidence.minimum.value.toFixed(2));
  }
  if (route.filters.scorableStatus.kind === "scorable_status") {
    parameters.set("status", route.filters.scorableStatus.status);
  }

  return parameters;
}

export function routeWithView(route: AtlasRoute, view: AtlasView): AtlasRoute {
  return { view, filters: route.filters };
}

export function routeWithoutSubject(route: AtlasRoute): AtlasRoute {
  return { view: route.view, filters: { ...route.filters, subject: { kind: "all_subjects" } } };
}

export function routeWithSubject(route: AtlasRoute, subject: SubjectFilter): AtlasRoute {
  return { view: "topics", filters: { ...route.filters, subject } };
}
