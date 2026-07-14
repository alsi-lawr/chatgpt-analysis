import type { ArchitectureEpisode, Atlas, Chat, RollingMetric, ScoredAggregate, Thread, Topic, TopicOccurrence } from "./atlas.ts";
import { findTopic } from "./filters.ts";
import { Measurement, NaturalNumber, type AggregateStatus, type ArchitectureDesignStyle, type ArchitectureEpisodeCount, type ChatCount, type MetricCount, type OccurrenceCount, type Profile, type Provenance, type ScoreDelta, type Stance } from "./values.ts";

export type TopicSummary = {
  readonly topic: Topic;
  readonly occurrenceCount: OccurrenceCount;
  readonly chatCount: ChatCount;
};

export type ThreadSummary = {
  readonly thread: Thread;
  readonly occurrenceCount: OccurrenceCount;
  readonly chatCount: ChatCount;
};

export type ChronologyPoint = {
  readonly date: Chat["date"];
  readonly chatCount: ChatCount;
  readonly occurrenceCount: OccurrenceCount;
};

export type ProvenanceSummary = {
  readonly provenance: Provenance;
  readonly occurrenceCount: OccurrenceCount;
};

export type StanceSummary = {
  readonly stance: Stance;
  readonly occurrenceCount: OccurrenceCount;
};

export type ProfileSummary = {
  readonly profile: Profile;
  readonly metricCount: MetricCount;
  readonly averageDelta: ScoreDelta;
};

export type StatusSummary = {
  readonly status: AggregateStatus;
  readonly metricCount: MetricCount;
};

export type RollingSeries = {
  readonly profile: Profile;
  readonly dimension: RollingMetric["dimension"];
  readonly points: ReadonlyArray<RollingPoint>;
};

export type RollingPoint = {
  readonly windowEnd: RollingMetric["windowEnd"];
  readonly mean: RollingMetric["mean"];
  readonly chatCount: ChatCount;
};

export type RollingSeriesSelection = RollingSeriesAvailable | RollingSeriesUnavailable;

export type RollingSeriesAvailable = {
  readonly kind: "rolling_series_available";
  readonly series: RollingSeries;
};

export type RollingSeriesUnavailable = {
  readonly kind: "rolling_series_unavailable";
};

export type ArchitectureDesignSummary = {
  readonly designStyle: ArchitectureDesignStyle;
  readonly episodeCount: ArchitectureEpisodeCount;
};

type CountAccumulator = {
  count: number;
  chatIds: Set<string>;
};

type ChronologyAccumulator = {
  date: Chat["date"];
  chatCount: number;
  occurrenceCount: number;
};

function incrementCount(accumulators: Map<string, CountAccumulator>, key: string, chatId: string): void {
  const existing = accumulators.get(key);

  if (existing === undefined) {
    accumulators.set(key, { count: 1, chatIds: new Set([chatId]) });
    return;
  }

  existing.count += 1;
  existing.chatIds.add(chatId);
}

function countFor(accumulators: ReadonlyMap<string, CountAccumulator>, key: string): CountAccumulator {
  const existing = accumulators.get(key);

  if (existing !== undefined) {
    return existing;
  }

  return { count: 0, chatIds: new Set<string>() };
}

function orderedByFrequency<T extends { readonly occurrenceCount: OccurrenceCount; readonly chatCount: ChatCount }>(values: ReadonlyArray<T>): ReadonlyArray<T> {
  return [...values].sort(
    (first, second) => second.occurrenceCount.value - first.occurrenceCount.value || second.chatCount.value - first.chatCount.value,
  );
}

export function summariseTopics(atlas: Atlas, occurrences: ReadonlyArray<TopicOccurrence>): ReadonlyArray<TopicSummary> {
  const accumulators = new Map<string, CountAccumulator>();

  for (const occurrence of occurrences) {
    incrementCount(accumulators, occurrence.topicId.value, occurrence.chatId.value);
  }

  const summaries = atlas.topics.map((topic) => {
    const accumulator = countFor(accumulators, topic.topicId.value);

    return {
      topic,
      occurrenceCount: NaturalNumber.create("occurrence_count", accumulator.count),
      chatCount: NaturalNumber.create("chat_count", accumulator.chatIds.size),
    };
  });

  return orderedByFrequency(summaries);
}

export function summariseThreads(atlas: Atlas, occurrences: ReadonlyArray<TopicOccurrence>): ReadonlyArray<ThreadSummary> {
  const accumulators = new Map<string, CountAccumulator>();

  for (const occurrence of occurrences) {
    for (const threadId of occurrence.threadIds) {
      incrementCount(accumulators, threadId.value, occurrence.chatId.value);
    }
  }

  const summaries = atlas.threads.map((thread) => {
    const accumulator = countFor(accumulators, thread.threadId.value);

    return {
      thread,
      occurrenceCount: NaturalNumber.create("occurrence_count", accumulator.count),
      chatCount: NaturalNumber.create("chat_count", accumulator.chatIds.size),
    };
  });

  return orderedByFrequency(summaries);
}

export function chronology(chats: ReadonlyArray<Chat>, occurrences: ReadonlyArray<TopicOccurrence>): ReadonlyArray<ChronologyPoint> {
  const accumulators = new Map<string, ChronologyAccumulator>();

  for (const chat of chats) {
    const existing = accumulators.get(chat.date.value);

    if (existing === undefined) {
      accumulators.set(chat.date.value, { date: chat.date, chatCount: 1, occurrenceCount: 0 });
      continue;
    }

    existing.chatCount += 1;
  }

  const chatsById = new Map<string, Chat>();

  for (const chat of chats) {
    chatsById.set(chat.chatId.value, chat);
  }

  for (const occurrence of occurrences) {
    const chat = chatsById.get(occurrence.chatId.value);

    if (chat === undefined) {
      continue;
    }

    const accumulator = accumulators.get(chat.date.value);

    if (accumulator !== undefined) {
      accumulator.occurrenceCount += 1;
    }
  }

  const points: ChronologyPoint[] = [];

  for (const accumulator of accumulators.values()) {
    points.push({
      date: accumulator.date,
      chatCount: NaturalNumber.create("chat_count", accumulator.chatCount),
      occurrenceCount: NaturalNumber.create("occurrence_count", accumulator.occurrenceCount),
    });
  }

  return points.sort((first, second) => first.date.timestamp - second.date.timestamp);
}

function occurrenceCountBy<T extends { readonly value: string }>(
  occurrences: ReadonlyArray<TopicOccurrence>,
  values: ReadonlyArray<T>,
  select: (occurrence: TopicOccurrence) => T,
): ReadonlyArray<{ readonly value: T; readonly occurrenceCount: OccurrenceCount }> {
  const counts = new Map<string, number>();

  for (const occurrence of occurrences) {
    const value = select(occurrence);
    const current = counts.get(value.value);
    counts.set(value.value, current === undefined ? 1 : current + 1);
  }

  return values.map((value) => ({
    value,
    occurrenceCount: NaturalNumber.create("occurrence_count", counts.get(value.value) ?? 0),
  }));
}

export function summariseProvenance(occurrences: ReadonlyArray<TopicOccurrence>): ReadonlyArray<ProvenanceSummary> {
  const values = new Map<string, Provenance>();

  for (const occurrence of occurrences) {
    values.set(occurrence.provenance.value, occurrence.provenance);
  }

  const summaries = occurrenceCountBy(occurrences, [...values.values()], (occurrence) => occurrence.provenance);

  return summaries
    .map((summary) => ({ provenance: summary.value, occurrenceCount: summary.occurrenceCount }))
    .sort((first, second) => second.occurrenceCount.value - first.occurrenceCount.value || first.provenance.value.localeCompare(second.provenance.value));
}

export function summariseStances(occurrences: ReadonlyArray<TopicOccurrence>): ReadonlyArray<StanceSummary> {
  const values = new Map<string, Stance>();

  for (const occurrence of occurrences) {
    values.set(occurrence.stance.value, occurrence.stance);
  }

  const summaries = occurrenceCountBy(occurrences, [...values.values()], (occurrence) => occurrence.stance);

  return summaries
    .map((summary) => ({ stance: summary.value, occurrenceCount: summary.occurrenceCount }))
    .sort((first, second) => second.occurrenceCount.value - first.occurrenceCount.value || first.stance.value.localeCompare(second.stance.value));
}

export function summariseProfiles(aggregates: ReadonlyArray<ScoredAggregate>): ReadonlyArray<ProfileSummary> {
  const totals = new Map<Profile, { count: number; delta: number }>();

  for (const aggregate of aggregates) {
    if (aggregate.rawDelta.kind === "score_delta_unavailable") {
      continue;
    }

    const existing = totals.get(aggregate.profile);

    if (existing === undefined) {
      totals.set(aggregate.profile, { count: 1, delta: aggregate.rawDelta.value.value });
      continue;
    }

    existing.count += 1;
    existing.delta += aggregate.rawDelta.value.value;
  }

  const summaries: ProfileSummary[] = [];

  for (const [profile, total] of totals) {
    summaries.push({
      profile,
      metricCount: NaturalNumber.create("metric_count", total.count),
      averageDelta: Measurement.create("score_delta", total.delta / total.count),
    });
  }

  return summaries.sort((first, second) => second.averageDelta.value - first.averageDelta.value);
}

export function summariseStatuses(aggregates: ReadonlyArray<ScoredAggregate>): ReadonlyArray<StatusSummary> {
  const values: ReadonlyArray<AggregateStatus> = ["strong progression", "suggestive progression", "mixed", "insufficient"];
  const counts = new Map<AggregateStatus, number>();

  for (const aggregate of aggregates) {
    const count = counts.get(aggregate.status);
    counts.set(aggregate.status, count === undefined ? 1 : count + 1);
  }

  return values.map((status) => ({
    status,
    metricCount: NaturalNumber.create("metric_count", counts.get(status) ?? 0),
  }));
}

export function longestRollingSeries(metrics: ReadonlyArray<RollingMetric>): RollingSeriesSelection {
  const grouped = new Map<string, { profile: Profile; dimension: RollingMetric["dimension"]; points: RollingPoint[] }>();

  for (const metric of metrics) {
    const key = `${metric.profile}:${metric.dimension.value}`;
    const existing = grouped.get(key);
    const point: RollingPoint = { windowEnd: metric.windowEnd, mean: metric.mean, chatCount: metric.chatCount };

    if (existing === undefined) {
      grouped.set(key, { profile: metric.profile, dimension: metric.dimension, points: [point] });
      continue;
    }

    existing.points.push(point);
  }

  let selection: RollingSeriesSelection = { kind: "rolling_series_unavailable" };

  for (const group of grouped.values()) {
    const series: RollingSeries = {
      profile: group.profile,
      dimension: group.dimension,
      points: [...group.points].sort((first, second) => first.windowEnd.timestamp - second.windowEnd.timestamp),
    };

    if (selection.kind === "rolling_series_unavailable" || series.points.length > selection.series.points.length) {
      selection = { kind: "rolling_series_available", series };
    }
  }

  return selection;
}

export function summariseArchitectureDesign(episodes: ReadonlyArray<ArchitectureEpisode>): ReadonlyArray<ArchitectureDesignSummary> {
  const values: ReadonlyArray<ArchitectureDesignStyle> = ["explicit/domain-modelled", "mixed", "simple/linear", "unclear"];
  const counts = new Map<ArchitectureDesignStyle, number>();

  for (const episode of episodes) {
    const count = counts.get(episode.designStyle);
    counts.set(episode.designStyle, count === undefined ? 1 : count + 1);
  }

  return values.map((designStyle) => ({
    designStyle,
    episodeCount: NaturalNumber.create("architecture_episode_count", counts.get(designStyle) ?? 0),
  }));
}

export function occurrencesForTopic(
  atlas: Atlas,
  occurrences: ReadonlyArray<TopicOccurrence>,
  topicId: TopicOccurrence["topicId"],
): ReadonlyArray<TopicOccurrence> {
  const topic = findTopic(atlas, topicId);

  if (topic.kind === "missing") {
    return [];
  }

  return occurrences.filter((occurrence) => occurrence.topicId.value === topic.value.topicId.value);
}
