import type { AnalysisClaim, ArchitectureEpisode, Atlas, Chat, MetricAggregate, Report, RollingMetric, TopicOccurrence } from "./atlas.ts";
import { Measurement, identifiersMatch, type AggregateStatus, type AtlasDomain, type CalendarDay, type Confidence, type InteractionMode, type Provenance, type ReportId, type ThreadId, type TopicId } from "./values.ts";

export type AtlasFilters = {
  readonly date: DateFilter;
  readonly subject: SubjectFilter;
  readonly report: ReportFilter;
  readonly context: ContextFilter;
  readonly provenance: ProvenanceFilter;
  readonly confidence: ConfidenceFilter;
  readonly scorableStatus: ScorableStatusFilter;
};

export type DateFilter = AllDates | DatesFrom | DatesTo | DatesBetween;

export type AllDates = {
  readonly kind: "all_dates";
};

export type DatesFrom = {
  readonly kind: "from_date";
  readonly start: CalendarDay;
};

export type DatesTo = {
  readonly kind: "to_date";
  readonly end: CalendarDay;
};

export type DatesBetween = {
  readonly kind: "between_dates";
  readonly start: CalendarDay;
  readonly end: CalendarDay;
};

export type SubjectFilter = AllSubjects | TopicSubject | ThreadSubject;

export type AllSubjects = {
  readonly kind: "all_subjects";
};

export type TopicSubject = {
  readonly kind: "topic_subject";
  readonly topicId: TopicId;
};

export type ThreadSubject = {
  readonly kind: "thread_subject";
  readonly threadId: ThreadId;
};

export type ReportFilter = AllReports | OneReport;

export type AllReports = {
  readonly kind: "all_reports";
};

export type OneReport = {
  readonly kind: "report";
  readonly reportId: ReportId;
};

export type ContextFilter = AllContexts | DomainContext | ModeContext;

export type AllContexts = {
  readonly kind: "all_contexts";
};

export type DomainContext = {
  readonly kind: "domain_context";
  readonly domain: AtlasDomain;
};

export type ModeContext = {
  readonly kind: "mode_context";
  readonly mode: InteractionMode;
};

export type ProvenanceFilter = AllProvenance | OneProvenance;

export type AllProvenance = {
  readonly kind: "all_provenance";
};

export type OneProvenance = {
  readonly kind: "provenance";
  readonly provenance: Provenance;
};

export type ConfidenceFilter = AllConfidence | MinimumConfidence;

export type AllConfidence = {
  readonly kind: "all_confidence";
};

export type MinimumConfidence = {
  readonly kind: "minimum_confidence";
  readonly minimum: Confidence;
};

export type ScorableStatusFilter = AllScorableStatuses | OneScorableStatus;

export type AllScorableStatuses = {
  readonly kind: "all_scorable_statuses";
};

export type OneScorableStatus = {
  readonly kind: "scorable_status";
  readonly status: AggregateStatus;
};

export type Lookup<T> = LookupFound<T> | LookupMissing;

export type LookupFound<T> = {
  readonly kind: "found";
  readonly value: T;
};

export type LookupMissing = {
  readonly kind: "missing";
};

export function defaultAtlasFilters(): AtlasFilters {
  return {
    date: { kind: "all_dates" },
    subject: { kind: "all_subjects" },
    report: { kind: "all_reports" },
    context: { kind: "all_contexts" },
    provenance: { kind: "all_provenance" },
    confidence: { kind: "all_confidence" },
    scorableStatus: { kind: "all_scorable_statuses" },
  };
}

export function confidenceThreshold(value: number): Confidence {
  return Measurement.create("confidence", value);
}

export function findTopic(atlas: Atlas, topicId: TopicId): Lookup<Atlas["topics"][number]> {
  for (const topic of atlas.topics) {
    if (identifiersMatch(topic.topicId, topicId)) {
      return { kind: "found", value: topic };
    }
  }

  return { kind: "missing" };
}

export function findThread(atlas: Atlas, threadId: ThreadId): Lookup<Atlas["threads"][number]> {
  for (const thread of atlas.threads) {
    if (identifiersMatch(thread.threadId, threadId)) {
      return { kind: "found", value: thread };
    }
  }

  return { kind: "missing" };
}

export function findReport(atlas: Atlas, reportId: ReportId): Lookup<Report> {
  for (const report of atlas.reports) {
    if (identifiersMatch(report.reportId, reportId)) {
      return { kind: "found", value: report };
    }
  }

  return { kind: "missing" };
}

export function findChat(atlas: Atlas, chatId: Chat["chatId"]): Lookup<Chat> {
  for (const chat of atlas.chats) {
    if (identifiersMatch(chat.chatId, chatId)) {
      return { kind: "found", value: chat };
    }
  }

  return { kind: "missing" };
}

function includesIdentifier(
  values: ReadonlyArray<{ readonly value: string }>,
  selected: { readonly value: string },
): boolean {
  for (const value of values) {
    if (value.value === selected.value) {
      return true;
    }
  }

  return false;
}

function matchesDate(date: CalendarDay, filter: DateFilter): boolean {
  switch (filter.kind) {
    case "all_dates":
      return true;
    case "between_dates":
      return date.timestamp >= filter.start.timestamp && date.timestamp <= filter.end.timestamp;
    case "from_date":
      return date.timestamp >= filter.start.timestamp;
    case "to_date":
      return date.timestamp <= filter.end.timestamp;
  }
}

function matchesChatSubject(chat: Chat, filter: SubjectFilter): boolean {
  switch (filter.kind) {
    case "all_subjects":
      return true;
    case "thread_subject":
      return includesIdentifier(chat.threadIds, filter.threadId);
    case "topic_subject":
      return includesIdentifier(chat.topicIds, filter.topicId);
  }
}

function matchesOccurrenceSubject(occurrence: TopicOccurrence, filter: SubjectFilter): boolean {
  switch (filter.kind) {
    case "all_subjects":
      return true;
    case "thread_subject":
      return includesIdentifier(occurrence.threadIds, filter.threadId);
    case "topic_subject":
      return identifiersMatch(occurrence.topicId, filter.topicId);
  }
}

function matchesContext(chat: Chat, filter: ContextFilter): boolean {
  switch (filter.kind) {
    case "all_contexts":
      return true;
    case "domain_context":
      return includesIdentifier(chat.domains, filter.domain);
    case "mode_context":
      return includesIdentifier(chat.modes, filter.mode);
  }
}

function matchesProvenance(occurrence: TopicOccurrence, filter: ProvenanceFilter): boolean {
  switch (filter.kind) {
    case "all_provenance":
      return true;
    case "provenance":
      return occurrence.provenance.value === filter.provenance.value;
  }
}

function matchesConfidence(occurrence: TopicOccurrence, filter: ConfidenceFilter): boolean {
  switch (filter.kind) {
    case "all_confidence":
      return true;
    case "minimum_confidence":
      return occurrence.confidence.value >= filter.minimum.value;
  }
}

function matchesChatBase(chat: Chat, filters: AtlasFilters): boolean {
  return matchesDate(chat.date, filters.date) && matchesChatSubject(chat, filters.subject) && matchesContext(chat, filters.context);
}

function hasEvidenceSpecificFilter(filters: AtlasFilters): boolean {
  return filters.provenance.kind !== "all_provenance" || filters.confidence.kind !== "all_confidence";
}

export function filterOccurrences(atlas: Atlas, filters: AtlasFilters): ReadonlyArray<TopicOccurrence> {
  const matchingChatIds = new Set<string>();

  for (const chat of atlas.chats) {
    if (matchesChatBase(chat, filters)) {
      matchingChatIds.add(chat.chatId.value);
    }
  }

  return atlas.occurrences.filter(
    (occurrence) =>
      matchingChatIds.has(occurrence.chatId.value) &&
      matchesOccurrenceSubject(occurrence, filters.subject) &&
      matchesProvenance(occurrence, filters.provenance) &&
      matchesConfidence(occurrence, filters.confidence),
  );
}

export function filterChats(atlas: Atlas, filters: AtlasFilters): ReadonlyArray<Chat> {
  const baseChats = atlas.chats.filter((chat) => matchesChatBase(chat, filters));

  if (!hasEvidenceSpecificFilter(filters)) {
    return baseChats;
  }

  const matchingOccurrenceChats = new Set<string>();

  for (const occurrence of filterOccurrences(atlas, filters)) {
    matchingOccurrenceChats.add(occurrence.chatId.value);
  }

  return baseChats.filter((chat) => matchingOccurrenceChats.has(chat.chatId.value));
}

function matchesReport(claim: AnalysisClaim, filter: ReportFilter): boolean {
  switch (filter.kind) {
    case "all_reports":
      return true;
    case "report":
      return includesIdentifier(claim.reportIds, filter.reportId);
  }
}

function selectedReportContainsProfile(atlas: Atlas, reportId: ReportId, profile: MetricAggregate["profile"]): boolean {
  const report = findReport(atlas, reportId);

  if (report.kind === "missing") {
    return false;
  }

  return report.value.profiles.includes(profile);
}

function matchesMetricReport(atlas: Atlas, metric: { readonly profile: MetricAggregate["profile"] }, filter: ReportFilter): boolean {
  switch (filter.kind) {
    case "all_reports":
      return true;
    case "report":
      return selectedReportContainsProfile(atlas, filter.reportId, metric.profile);
  }
}

function matchesStatus(status: AggregateStatus | AnalysisClaim["status"], filter: ScorableStatusFilter): boolean {
  switch (filter.kind) {
    case "all_scorable_statuses":
      return true;
    case "scorable_status":
      return status === filter.status;
  }
}

export function filterClaims(atlas: Atlas, filters: AtlasFilters): ReadonlyArray<AnalysisClaim> {
  return atlas.claims.filter((claim) => matchesReport(claim, filters.report) && matchesStatus(claim.status, filters.scorableStatus));
}

export function filterScoredAggregates(atlas: Atlas, filters: AtlasFilters): ReadonlyArray<Extract<MetricAggregate, { readonly kind: "scored" }>> {
  return atlas.aggregates.filter(
    (aggregate): aggregate is Extract<MetricAggregate, { readonly kind: "scored" }> =>
      aggregate.kind === "scored" && matchesMetricReport(atlas, aggregate, filters.report) && matchesStatus(aggregate.status, filters.scorableStatus),
  );
}

export function filterAggregateOnlyMetrics(atlas: Atlas, filters: AtlasFilters): ReadonlyArray<Extract<MetricAggregate, { readonly kind: "aggregate_only" }>> {
  if (filters.scorableStatus.kind !== "all_scorable_statuses") {
    return [];
  }

  return atlas.aggregates.filter(
    (aggregate): aggregate is Extract<MetricAggregate, { readonly kind: "aggregate_only" }> =>
      aggregate.kind === "aggregate_only" && matchesMetricReport(atlas, aggregate, filters.report),
  );
}

export function filterRollingMetrics(atlas: Atlas, filters: AtlasFilters): ReadonlyArray<RollingMetric> {
  if (filters.scorableStatus.kind !== "all_scorable_statuses") {
    return [];
  }

  return atlas.rolling.filter((metric) => matchesMetricReport(atlas, metric, filters.report));
}

function matchesArchitectureProvenance(episode: ArchitectureEpisode, filter: ProvenanceFilter): boolean {
  switch (filter.kind) {
    case "all_provenance":
      return true;
    case "provenance":
      return episode.provenance.value === filter.provenance.value;
  }
}

export function filterArchitectureEpisodes(atlas: Atlas, filters: AtlasFilters): ReadonlyArray<ArchitectureEpisode> {
  const matchingChatIds = new Set<string>();

  for (const chat of filterChats(atlas, filters)) {
    matchingChatIds.add(chat.chatId.value);
  }

  return atlas.architectureEpisodes.filter(
    (episode) => matchingChatIds.has(episode.chatId.value) && matchesArchitectureProvenance(episode, filters.provenance),
  );
}
