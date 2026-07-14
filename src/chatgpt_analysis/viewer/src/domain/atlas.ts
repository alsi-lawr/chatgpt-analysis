import {
  invalid,
  parseArchitectureAgentInvolvement,
  parseArchitectureDesignStyle,
  parseArchitectureDisposition,
  parseArchitectureOutcomeStatus,
  parseArchitecturePhase,
  parseArchitectureProvenance,
  parseAggregatePrivacy,
  parseAggregateStatus,
  parseArray,
  parseCalendarDay,
  parseCentrality,
  parseChatTier,
  parseClaimConfidence,
  parseClaimPrivacy,
  parseClaimStatus,
  parseCoveragePeriod,
  parseIdentifier,
  parseMeasurement,
  parseMetricWindow,
  parseNamedValue,
  parseNaturalNumber,
  parseObject,
  parseOccurrenceSensitivity,
  parsePeriod,
  parseProfile,
  parseProvenance,
  parseRollingPrivacy,
  parseSourceKind,
  parseStance,
  parseText,
  requiredProperty,
  valid,
  type AggregatePrivacy,
  type AggregateStatus,
  type ArchitectureAgentInvolvement,
  type ArchitectureDesignStyle,
  type ArchitectureDisposition,
  type ArchitectureOutcomeStatus,
  type ArchitecturePhase,
  type ArchitectureProvenance,
  type AtlasDomain,
  type CalendarDay,
  type Centrality,
  type ChatCount,
  type ChatId,
  type ChatTier,
  type ClaimConfidence,
  type ClaimCount,
  type ClaimId,
  type ClaimPrivacy,
  type ClaimStatus,
  type Confidence,
  type CoveragePeriod,
  type EffectSize,
  type Identifier,
  type IdentifierCategory,
  type InteractionMode,
  type JsonObject,
  type MatchedStratumCount,
  type MetricDimension,
  type MetricWindow,
  type NamedValue,
  type OccurrenceCount,
  type OccurrenceId,
  type OccurrenceSensitivity,
  type Period,
  type Profile,
  type Provenance,
  type ReportId,
  type RollingPrivacy,
  type RollingWindowDays,
  type Score,
  type ScoreDelta,
  type SourceKind,
  type Stance,
  type ThreadId,
  type TopicId,
  type TurnCoordinate,
  type TurnCount,
  type Validation,
} from "./values.ts";

export type Atlas = {
  readonly schemaVersion: "2.0.0";
  readonly metadata: AtlasMetadata;
  readonly coverage: AtlasCoverage;
  readonly reports: ReadonlyArray<Report>;
  readonly topics: ReadonlyArray<Topic>;
  readonly threads: ReadonlyArray<Thread>;
  readonly chats: ReadonlyArray<Chat>;
  readonly occurrences: ReadonlyArray<TopicOccurrence>;
  readonly aggregates: ReadonlyArray<MetricAggregate>;
  readonly rolling: ReadonlyArray<RollingMetric>;
  readonly architectureEpisodes: ReadonlyArray<ArchitectureEpisode>;
  readonly claims: ReadonlyArray<AnalysisClaim>;
  readonly limits: ReadonlyArray<string>;
};

export type AtlasMetadata = {
  readonly title: string;
  readonly description: string;
  readonly generatedFrom: string;
  readonly privacyNotice: string;
};

export type AtlasCoverage = {
  readonly chatCount: ChatCount;
  readonly claimCount: ClaimCount;
  readonly topicOccurrenceCount: OccurrenceCount;
};

export type Report = {
  readonly reportId: ReportId;
  readonly title: string;
  readonly description: string;
  readonly profiles: ReadonlyArray<Profile>;
  readonly markdownPath: string;
};

export type Topic = {
  readonly topicId: TopicId;
  readonly label: string;
  readonly description: string;
  readonly parent: TopicParent;
};

export type TopicParent = RootTopic | ChildTopic;

export type RootTopic = {
  readonly kind: "root";
};

export type ChildTopic = {
  readonly kind: "child";
  readonly parentTopicId: TopicId;
};

export type Thread = {
  readonly threadId: ThreadId;
  readonly label: string;
  readonly description: string;
  readonly aliases: ReadonlyArray<string>;
};

export type Chat = {
  readonly chatId: ChatId;
  readonly title: string;
  readonly date: CalendarDay;
  readonly period: Period;
  readonly tier: ChatTier;
  readonly turnCount: TurnCount;
  readonly domains: ReadonlyArray<AtlasDomain>;
  readonly modes: ReadonlyArray<InteractionMode>;
  readonly topicIds: ReadonlyArray<TopicId>;
  readonly threadIds: ReadonlyArray<ThreadId>;
};

export type TopicOccurrence = {
  readonly occurrenceId: OccurrenceId;
  readonly chatId: ChatId;
  readonly topicId: TopicId;
  readonly threadIds: ReadonlyArray<ThreadId>;
  readonly startTurn: TurnCoordinate;
  readonly endTurn: TurnCoordinate;
  readonly centrality: Centrality;
  readonly stance: Stance;
  readonly provenance: Provenance;
  readonly confidence: Confidence;
  readonly sourceKind: SourceKind;
  readonly sensitivity: OccurrenceSensitivity;
  readonly summary: string;
  readonly excerpts: ReadonlyArray<BoundedExcerpt>;
};

export type BoundedExcerpt = {
  readonly turnNumber: TurnCoordinate;
  readonly text: string;
  readonly contentHash: string;
};

export type AnalysisClaim = {
  readonly claimId: ClaimId;
  readonly reportIds: ReadonlyArray<ReportId>;
  readonly claimType: ClaimType;
  readonly statement: string;
  readonly status: ClaimStatus;
  readonly confidence: ClaimConfidence;
  readonly support: ReadonlyArray<ClaimEvidence>;
  readonly counterevidence: ReadonlyArray<ClaimEvidence>;
  readonly alternatives: ReadonlyArray<string>;
  readonly coverage: ClaimCoverage;
  readonly privacy: ClaimPrivacy;
};

export type ClaimType = NamedValue<"claim_type">;

export type ClaimEvidence = {
  readonly chatId: ChatId;
  readonly startTurn: TurnCoordinate;
  readonly endTurn: TurnCoordinate;
  readonly provenance: Provenance;
};

export type ClaimCoverage = EndpointClaimCoverage | ScopedClaimCoverage;

export type EndpointClaimCoverage = {
  readonly kind: "endpoint_coverage";
  readonly startCount: ChatCount;
  readonly endCount: ChatCount;
  readonly periods: ReadonlyArray<CoveragePeriod>;
};

export type ScopedClaimCoverage = {
  readonly kind: "scoped_coverage";
  readonly chatCount: ChatCount;
  readonly domains: ReadonlyArray<NamedValue<"coverage_domain">>;
  readonly periods: ReadonlyArray<CoveragePeriod>;
};

export type MetricAggregate = ScoredAggregate | AggregateOnlyMetric;

export type ScoredAggregate = {
  readonly kind: "scored";
  readonly profile: Profile;
  readonly dimension: MetricDimension;
  readonly startCount: ChatCount;
  readonly endCount: ChatCount;
  readonly startMean: ScoreAvailability;
  readonly endMean: ScoreAvailability;
  readonly rawDelta: ScoreDeltaAvailability;
  readonly matchedDelta: MatchedDelta;
  readonly matchedStratumCount: MatchedStratumCount;
  readonly bootstrapLower: ScoreDeltaAvailability;
  readonly bootstrapUpper: ScoreDeltaAvailability;
  readonly cliffsDelta: EffectSizeAvailability;
  readonly chronologicalMeans: ReadonlyArray<ScoreAvailability>;
  readonly status: AggregateStatus;
  readonly referenceClass: string;
};

export type ScoreAvailability = ScoreAvailable | ScoreUnavailable;

export type ScoreAvailable = {
  readonly kind: "score_available";
  readonly value: Score;
};

export type ScoreUnavailable = {
  readonly kind: "score_unavailable";
};

export type ScoreDeltaAvailability = ScoreDeltaAvailable | ScoreDeltaUnavailable;

export type ScoreDeltaAvailable = {
  readonly kind: "score_delta_available";
  readonly value: ScoreDelta;
};

export type ScoreDeltaUnavailable = {
  readonly kind: "score_delta_unavailable";
};

export type EffectSizeAvailability = EffectSizeAvailable | EffectSizeUnavailable;

export type EffectSizeAvailable = {
  readonly kind: "effect_size_available";
  readonly value: EffectSize;
};

export type EffectSizeUnavailable = {
  readonly kind: "effect_size_unavailable";
};

export type MatchedDelta = MatchedDeltaAvailable | MatchedDeltaUnavailable;

export type MatchedDeltaAvailable = {
  readonly kind: "available";
  readonly value: ScoreDelta;
};

export type MatchedDeltaUnavailable = {
  readonly kind: "unavailable";
};

export type AggregateOnlyMetric = {
  readonly kind: "aggregate_only";
  readonly profile: Profile;
  readonly dimension: MetricDimension;
  readonly window: MetricWindow;
  readonly chatCount: ChatCount;
  readonly mean: Score;
  readonly privacy: AggregatePrivacy;
};

export type RollingMetric = {
  readonly profile: Profile;
  readonly dimension: MetricDimension;
  readonly windowEnd: CalendarDay;
  readonly windowDays: RollingWindowDays;
  readonly chatCount: ChatCount;
  readonly mean: Score;
  readonly privacy: RollingPrivacy;
};

export type ArchitectureEpisode = {
  readonly chatId: ChatId;
  readonly date: CalendarDay;
  readonly period: Period;
  readonly phase: ArchitecturePhase;
  readonly agentInvolvement: ArchitectureAgentInvolvement;
  readonly designStyle: ArchitectureDesignStyle;
  readonly disposition: ArchitectureDisposition;
  readonly outcomeStatus: ArchitectureOutcomeStatus;
  readonly provenance: ArchitectureProvenance;
};

type ValueParser<T> = (value: unknown, path: string) => Validation<T>;

function parseRequired<T>(
  object: JsonObject,
  property: string,
  path: string,
  parser: ValueParser<T>,
): Validation<T> {
  const value = requiredProperty(object, property, path);

  if (value.kind === "invalid") {
    return value;
  }

  return parser(value.value, `${path}.${property}`);
}

function parseList<T>(value: unknown, path: string, parser: ValueParser<T>): Validation<ReadonlyArray<T>> {
  const values = parseArray(value, path);

  if (values.kind === "invalid") {
    return values;
  }

  const parsed: T[] = [];

  for (const [index, entry] of values.value.entries()) {
    const item = parser(entry, `${path}[${index}]`);

    if (item.kind === "invalid") {
      return item;
    }

    parsed.push(item.value);
  }

  return valid(parsed);
}

function parseTextList(value: unknown, path: string): Validation<ReadonlyArray<string>> {
  return parseList(value, path, parseNonEmptyTextValue);
}

function parseNonEmptyTextValue(value: unknown, path: string): Validation<string> {
  const text = parseText(value, path);

  if (text.kind === "invalid") {
    return text;
  }

  if (text.value.trim().length === 0) {
    return invalid(path, "must not be empty");
  }

  return text;
}

function parseSchemaVersion(value: unknown, path: string): Validation<"2.0.0"> {
  if (value === "2.0.0") {
    return valid(value);
  }

  return invalid(path, "must be schema version 2.0.0");
}

function parseMetadata(value: unknown, path: string): Validation<AtlasMetadata> {
  const object = parseObject(value, path);

  if (object.kind === "invalid") {
    return object;
  }

  const title = parseRequired(object.value, "title", path, parseNonEmptyTextValue);
  if (title.kind === "invalid") {
    return title;
  }
  const description = parseRequired(object.value, "description", path, parseNonEmptyTextValue);
  if (description.kind === "invalid") {
    return description;
  }
  const generatedFrom = parseRequired(object.value, "generated_from", path, parseNonEmptyTextValue);
  if (generatedFrom.kind === "invalid") {
    return generatedFrom;
  }
  const privacyNotice = parseRequired(object.value, "privacy_notice", path, parseNonEmptyTextValue);
  if (privacyNotice.kind === "invalid") {
    return privacyNotice;
  }

  return valid({
    title: title.value,
    description: description.value,
    generatedFrom: generatedFrom.value,
    privacyNotice: privacyNotice.value,
  });
}

function parseTopicParent(value: unknown, path: string): Validation<TopicParent> {
  if (value === null) {
    return valid({ kind: "root" });
  }

  const parentId = parseIdentifier("topic", value, path);

  if (parentId.kind === "invalid") {
    return parentId;
  }

  return valid({ kind: "child", parentTopicId: parentId.value });
}

function parseTopic(value: unknown, path: string): Validation<Topic> {
  const object = parseObject(value, path);

  if (object.kind === "invalid") {
    return object;
  }

  const topicId = parseRequired(object.value, "topic_id", path, (field, fieldPath) => parseIdentifier("topic", field, fieldPath));
  if (topicId.kind === "invalid") {
    return topicId;
  }
  const label = parseRequired(object.value, "label", path, parseNonEmptyTextValue);
  if (label.kind === "invalid") {
    return label;
  }
  const description = parseRequired(object.value, "description", path, parseNonEmptyTextValue);
  if (description.kind === "invalid") {
    return description;
  }
  const parent = parseRequired(object.value, "parent_topic_id", path, parseTopicParent);
  if (parent.kind === "invalid") {
    return parent;
  }

  return valid({ topicId: topicId.value, label: label.value, description: description.value, parent: parent.value });
}

function parseThread(value: unknown, path: string): Validation<Thread> {
  const object = parseObject(value, path);

  if (object.kind === "invalid") {
    return object;
  }

  const threadId = parseRequired(object.value, "thread_id", path, (field, fieldPath) => parseIdentifier("thread", field, fieldPath));
  if (threadId.kind === "invalid") {
    return threadId;
  }
  const label = parseRequired(object.value, "label", path, parseNonEmptyTextValue);
  if (label.kind === "invalid") {
    return label;
  }
  const description = parseRequired(object.value, "description", path, parseNonEmptyTextValue);
  if (description.kind === "invalid") {
    return description;
  }
  const aliases = parseRequired(object.value, "aliases", path, parseTextList);
  if (aliases.kind === "invalid") {
    return aliases;
  }

  return valid({ threadId: threadId.value, label: label.value, description: description.value, aliases: aliases.value });
}

function parseReport(value: unknown, path: string): Validation<Report> {
  const object = parseObject(value, path);

  if (object.kind === "invalid") {
    return object;
  }

  const reportId = parseRequired(object.value, "report_id", path, (field, fieldPath) => parseIdentifier("report", field, fieldPath));
  if (reportId.kind === "invalid") {
    return reportId;
  }
  const title = parseRequired(object.value, "title", path, parseNonEmptyTextValue);
  if (title.kind === "invalid") {
    return title;
  }
  const description = parseRequired(object.value, "description", path, parseNonEmptyTextValue);
  if (description.kind === "invalid") {
    return description;
  }
  const profiles = parseRequired(object.value, "profiles", path, (field, fieldPath) => parseList(field, fieldPath, parseProfile));
  if (profiles.kind === "invalid") {
    return profiles;
  }
  const markdownPath = parseRequired(object.value, "markdown_path", path, parseNonEmptyTextValue);
  if (markdownPath.kind === "invalid") {
    return markdownPath;
  }

  return valid({
    reportId: reportId.value,
    title: title.value,
    description: description.value,
    profiles: profiles.value,
    markdownPath: markdownPath.value,
  });
}

function parseChat(value: unknown, path: string): Validation<Chat> {
  const object = parseObject(value, path);

  if (object.kind === "invalid") {
    return object;
  }

  const chatId = parseRequired(object.value, "chat_id", path, (field, fieldPath) => parseIdentifier("chat", field, fieldPath));
  if (chatId.kind === "invalid") {
    return chatId;
  }
  const title = parseRequired(object.value, "title", path, parseNonEmptyTextValue);
  if (title.kind === "invalid") {
    return title;
  }
  const date = parseRequired(object.value, "date", path, parseCalendarDay);
  if (date.kind === "invalid") {
    return date;
  }
  const period = parseRequired(object.value, "period", path, parsePeriod);
  if (period.kind === "invalid") {
    return period;
  }
  const tier = parseRequired(object.value, "tier", path, parseChatTier);
  if (tier.kind === "invalid") {
    return tier;
  }
  const turnCount = parseRequired(object.value, "turn_count", path, (field, fieldPath) => parseNaturalNumber("turn_count", 1, field, fieldPath));
  if (turnCount.kind === "invalid") {
    return turnCount;
  }
  const domains = parseRequired(object.value, "domains", path, (field, fieldPath) => parseList(field, fieldPath, (entry, entryPath) => parseNamedValue("domain", entry, entryPath)));
  if (domains.kind === "invalid") {
    return domains;
  }
  const modes = parseRequired(object.value, "modes", path, (field, fieldPath) => parseList(field, fieldPath, (entry, entryPath) => parseNamedValue("mode", entry, entryPath)));
  if (modes.kind === "invalid") {
    return modes;
  }
  const topicIds = parseRequired(object.value, "topic_ids", path, (field, fieldPath) => parseList(field, fieldPath, (entry, entryPath) => parseIdentifier("topic", entry, entryPath)));
  if (topicIds.kind === "invalid") {
    return topicIds;
  }
  const threadIds = parseRequired(object.value, "thread_ids", path, (field, fieldPath) => parseList(field, fieldPath, (entry, entryPath) => parseIdentifier("thread", entry, entryPath)));
  if (threadIds.kind === "invalid") {
    return threadIds;
  }

  return valid({
    chatId: chatId.value,
    title: title.value,
    date: date.value,
    period: period.value,
    tier: tier.value,
    turnCount: turnCount.value,
    domains: domains.value,
    modes: modes.value,
    topicIds: topicIds.value,
    threadIds: threadIds.value,
  });
}

function parseExcerpt(value: unknown, path: string): Validation<BoundedExcerpt> {
  const object = parseObject(value, path);

  if (object.kind === "invalid") {
    return object;
  }

  const turnNumber = parseRequired(object.value, "turn_number", path, (field, fieldPath) => parseNaturalNumber("turn", 1, field, fieldPath));
  if (turnNumber.kind === "invalid") {
    return turnNumber;
  }
  const text = parseRequired(object.value, "text", path, parseNonEmptyTextValue);
  if (text.kind === "invalid") {
    return text;
  }
  const contentHash = parseRequired(object.value, "content_sha256", path, parseNonEmptyTextValue);
  if (contentHash.kind === "invalid") {
    return contentHash;
  }

  return valid({ turnNumber: turnNumber.value, text: text.value, contentHash: contentHash.value });
}

function parseOccurrence(value: unknown, path: string): Validation<TopicOccurrence> {
  const object = parseObject(value, path);

  if (object.kind === "invalid") {
    return object;
  }

  const occurrenceId = parseRequired(object.value, "occurrence_id", path, (field, fieldPath) => parseIdentifier("occurrence", field, fieldPath));
  if (occurrenceId.kind === "invalid") {
    return occurrenceId;
  }
  const chatId = parseRequired(object.value, "chat_id", path, (field, fieldPath) => parseIdentifier("chat", field, fieldPath));
  if (chatId.kind === "invalid") {
    return chatId;
  }
  const topicId = parseRequired(object.value, "topic_id", path, (field, fieldPath) => parseIdentifier("topic", field, fieldPath));
  if (topicId.kind === "invalid") {
    return topicId;
  }
  const threadIds = parseRequired(object.value, "thread_ids", path, (field, fieldPath) => parseList(field, fieldPath, (entry, entryPath) => parseIdentifier("thread", entry, entryPath)));
  if (threadIds.kind === "invalid") {
    return threadIds;
  }
  const startTurn = parseRequired(object.value, "start_turn", path, (field, fieldPath) => parseNaturalNumber("turn", 1, field, fieldPath));
  if (startTurn.kind === "invalid") {
    return startTurn;
  }
  const endTurn = parseRequired(object.value, "end_turn", path, (field, fieldPath) => parseNaturalNumber("turn", 1, field, fieldPath));
  if (endTurn.kind === "invalid") {
    return endTurn;
  }
  const centrality = parseRequired(object.value, "centrality", path, parseCentrality);
  if (centrality.kind === "invalid") {
    return centrality;
  }
  const stance = parseRequired(object.value, "stance", path, parseStance);
  if (stance.kind === "invalid") {
    return stance;
  }
  const provenance = parseRequired(object.value, "provenance", path, parseProvenance);
  if (provenance.kind === "invalid") {
    return provenance;
  }
  const confidence = parseRequired(object.value, "confidence", path, (field, fieldPath) => parseMeasurement("confidence", 0, 1, field, fieldPath));
  if (confidence.kind === "invalid") {
    return confidence;
  }
  const sourceKind = parseRequired(object.value, "source_kind", path, parseSourceKind);
  if (sourceKind.kind === "invalid") {
    return sourceKind;
  }
  const sensitivity = parseRequired(object.value, "sensitivity_state", path, parseOccurrenceSensitivity);
  if (sensitivity.kind === "invalid") {
    return sensitivity;
  }
  const summary = parseRequired(object.value, "summary", path, parseText);
  if (summary.kind === "invalid") {
    return summary;
  }
  const excerpts = parseRequired(object.value, "excerpts", path, (field, fieldPath) => parseList(field, fieldPath, parseExcerpt));
  if (excerpts.kind === "invalid") {
    return excerpts;
  }

  return valid({
    occurrenceId: occurrenceId.value,
    chatId: chatId.value,
    topicId: topicId.value,
    threadIds: threadIds.value,
    startTurn: startTurn.value,
    endTurn: endTurn.value,
    centrality: centrality.value,
    stance: stance.value,
    provenance: provenance.value,
    confidence: confidence.value,
    sourceKind: sourceKind.value,
    sensitivity: sensitivity.value,
    summary: summary.value,
    excerpts: excerpts.value,
  });
}

function parseClaimEvidence(value: unknown, path: string): Validation<ClaimEvidence> {
  const object = parseObject(value, path);

  if (object.kind === "invalid") {
    return object;
  }

  const chatId = parseRequired(object.value, "chat_id", path, (field, fieldPath) => parseIdentifier("chat", field, fieldPath));
  if (chatId.kind === "invalid") {
    return chatId;
  }
  const startTurn = parseRequired(object.value, "start_turn", path, (field, fieldPath) => parseNaturalNumber("turn", 1, field, fieldPath));
  if (startTurn.kind === "invalid") {
    return startTurn;
  }
  const endTurn = parseRequired(object.value, "end_turn", path, (field, fieldPath) => parseNaturalNumber("turn", 1, field, fieldPath));
  if (endTurn.kind === "invalid") {
    return endTurn;
  }
  const provenance = parseRequired(object.value, "provenance", path, parseProvenance);
  if (provenance.kind === "invalid") {
    return provenance;
  }

  return valid({
    chatId: chatId.value,
    startTurn: startTurn.value,
    endTurn: endTurn.value,
    provenance: provenance.value,
  });
}

function parseClaimCoverage(value: unknown, path: string): Validation<ClaimCoverage> {
  const object = parseObject(value, path);

  if (object.kind === "invalid") {
    return object;
  }

  const startCountValue = object.value["start_count"];

  if (startCountValue !== undefined) {
    const startCount = parseNaturalNumber("chat_count", 0, startCountValue, `${path}.start_count`);
    if (startCount.kind === "invalid") {
      return startCount;
    }
    const endCount = parseRequired(object.value, "end_count", path, (field, fieldPath) => parseNaturalNumber("chat_count", 0, field, fieldPath));
    if (endCount.kind === "invalid") {
      return endCount;
    }
    const periods = parseRequired(object.value, "periods", path, (field, fieldPath) => parseList(field, fieldPath, parseCoveragePeriod));
    if (periods.kind === "invalid") {
      return periods;
    }

    return valid({ kind: "endpoint_coverage", startCount: startCount.value, endCount: endCount.value, periods: periods.value });
  }

  const chatCount = parseRequired(object.value, "chat_count", path, (field, fieldPath) => parseNaturalNumber("chat_count", 0, field, fieldPath));
  if (chatCount.kind === "invalid") {
    return chatCount;
  }
  const domains = parseRequired(object.value, "domains", path, (field, fieldPath) => parseList(field, fieldPath, (entry, entryPath) => parseNamedValue("coverage_domain", entry, entryPath)));
  if (domains.kind === "invalid") {
    return domains;
  }
  const periods = parseRequired(object.value, "periods", path, (field, fieldPath) => parseList(field, fieldPath, parseCoveragePeriod));
  if (periods.kind === "invalid") {
    return periods;
  }

  return valid({ kind: "scoped_coverage", chatCount: chatCount.value, domains: domains.value, periods: periods.value });
}

function parseClaim(value: unknown, path: string): Validation<AnalysisClaim> {
  const object = parseObject(value, path);

  if (object.kind === "invalid") {
    return object;
  }

  const claimId = parseRequired(object.value, "claim_id", path, (field, fieldPath) => parseIdentifier("claim", field, fieldPath));
  if (claimId.kind === "invalid") {
    return claimId;
  }
  const reportIds = parseRequired(object.value, "report_ids", path, (field, fieldPath) => parseList(field, fieldPath, (entry, entryPath) => parseIdentifier("report", entry, entryPath)));
  if (reportIds.kind === "invalid") {
    return reportIds;
  }
  const claimType = parseRequired(object.value, "claim_type", path, (field, fieldPath) => parseNamedValue("claim_type", field, fieldPath));
  if (claimType.kind === "invalid") {
    return claimType;
  }
  const statement = parseRequired(object.value, "statement", path, parseNonEmptyTextValue);
  if (statement.kind === "invalid") {
    return statement;
  }
  const status = parseRequired(object.value, "status", path, parseClaimStatus);
  if (status.kind === "invalid") {
    return status;
  }
  const confidence = parseRequired(object.value, "confidence", path, parseClaimConfidence);
  if (confidence.kind === "invalid") {
    return confidence;
  }
  const support = parseRequired(object.value, "support", path, (field, fieldPath) => parseList(field, fieldPath, parseClaimEvidence));
  if (support.kind === "invalid") {
    return support;
  }
  const counterevidence = parseRequired(object.value, "counterevidence", path, (field, fieldPath) => parseList(field, fieldPath, parseClaimEvidence));
  if (counterevidence.kind === "invalid") {
    return counterevidence;
  }
  const alternatives = parseRequired(object.value, "alternatives", path, parseTextList);
  if (alternatives.kind === "invalid") {
    return alternatives;
  }
  const coverage = parseRequired(object.value, "coverage", path, parseClaimCoverage);
  if (coverage.kind === "invalid") {
    return coverage;
  }
  const privacy = parseRequired(object.value, "privacy", path, parseClaimPrivacy);
  if (privacy.kind === "invalid") {
    return privacy;
  }

  return valid({
    claimId: claimId.value,
    reportIds: reportIds.value,
    claimType: claimType.value,
    statement: statement.value,
    status: status.value,
    confidence: confidence.value,
    support: support.value,
    counterevidence: counterevidence.value,
    alternatives: alternatives.value,
    coverage: coverage.value,
    privacy: privacy.value,
  });
}

function parseMatchedDelta(value: unknown, path: string): Validation<MatchedDelta> {
  if (value === null) {
    return valid({ kind: "unavailable" });
  }

  const delta = parseMeasurement("score_delta", -4, 4, value, path);

  if (delta.kind === "invalid") {
    return delta;
  }

  return valid({ kind: "available", value: delta.value });
}

function parseScoreAvailability(value: unknown, path: string): Validation<ScoreAvailability> {
  if (value === null) {
    return valid({ kind: "score_unavailable" });
  }

  const score = parseMeasurement("score", 0, 4, value, path);

  if (score.kind === "invalid") {
    return score;
  }

  return valid({ kind: "score_available", value: score.value });
}

function parseScoreDeltaAvailability(value: unknown, path: string): Validation<ScoreDeltaAvailability> {
  if (value === null) {
    return valid({ kind: "score_delta_unavailable" });
  }

  const delta = parseMeasurement("score_delta", -4, 4, value, path);

  if (delta.kind === "invalid") {
    return delta;
  }

  return valid({ kind: "score_delta_available", value: delta.value });
}

function parseEffectSizeAvailability(value: unknown, path: string): Validation<EffectSizeAvailability> {
  if (value === null) {
    return valid({ kind: "effect_size_unavailable" });
  }

  const effectSize = parseMeasurement("effect_size", -1, 1, value, path);

  if (effectSize.kind === "invalid") {
    return effectSize;
  }

  return valid({ kind: "effect_size_available", value: effectSize.value });
}

function parseScoredAggregate(object: JsonObject, path: string): Validation<ScoredAggregate> {
  const profile = parseRequired(object, "profile", path, parseProfile);
  if (profile.kind === "invalid") {
    return profile;
  }
  const dimension = parseRequired(object, "dimension", path, (field, fieldPath) => parseNamedValue("dimension", field, fieldPath));
  if (dimension.kind === "invalid") {
    return dimension;
  }
  const startCount = parseRequired(object, "start_count", path, (field, fieldPath) => parseNaturalNumber("chat_count", 0, field, fieldPath));
  if (startCount.kind === "invalid") {
    return startCount;
  }
  const endCount = parseRequired(object, "end_count", path, (field, fieldPath) => parseNaturalNumber("chat_count", 0, field, fieldPath));
  if (endCount.kind === "invalid") {
    return endCount;
  }
  const startMean = parseRequired(object, "start_mean_0_4", path, parseScoreAvailability);
  if (startMean.kind === "invalid") {
    return startMean;
  }
  const endMean = parseRequired(object, "end_mean_0_4", path, parseScoreAvailability);
  if (endMean.kind === "invalid") {
    return endMean;
  }
  const rawDelta = parseRequired(object, "raw_delta_0_4", path, parseScoreDeltaAvailability);
  if (rawDelta.kind === "invalid") {
    return rawDelta;
  }
  const matchedDelta = parseRequired(object, "matched_delta_0_4", path, parseMatchedDelta);
  if (matchedDelta.kind === "invalid") {
    return matchedDelta;
  }
  const matchedStratumCount = parseRequired(object, "matched_stratum_count", path, (field, fieldPath) => parseNaturalNumber("matched_stratum_count", 0, field, fieldPath));
  if (matchedStratumCount.kind === "invalid") {
    return matchedStratumCount;
  }
  const bootstrapLower = parseRequired(object, "bootstrap_lower_95", path, parseScoreDeltaAvailability);
  if (bootstrapLower.kind === "invalid") {
    return bootstrapLower;
  }
  const bootstrapUpper = parseRequired(object, "bootstrap_upper_95", path, parseScoreDeltaAvailability);
  if (bootstrapUpper.kind === "invalid") {
    return bootstrapUpper;
  }
  const cliffsDelta = parseRequired(object, "cliffs_delta", path, parseEffectSizeAvailability);
  if (cliffsDelta.kind === "invalid") {
    return cliffsDelta;
  }
  const chronologicalMeans = parseRequired(object, "chronological_bin_means", path, (field, fieldPath) => parseList(field, fieldPath, parseScoreAvailability));
  if (chronologicalMeans.kind === "invalid") {
    return chronologicalMeans;
  }
  const status = parseRequired(object, "status", path, parseAggregateStatus);
  if (status.kind === "invalid") {
    return status;
  }
  const referenceClass = parseRequired(object, "reference_class", path, parseNonEmptyTextValue);
  if (referenceClass.kind === "invalid") {
    return referenceClass;
  }

  return valid({
    kind: "scored",
    profile: profile.value,
    dimension: dimension.value,
    startCount: startCount.value,
    endCount: endCount.value,
    startMean: startMean.value,
    endMean: endMean.value,
    rawDelta: rawDelta.value,
    matchedDelta: matchedDelta.value,
    matchedStratumCount: matchedStratumCount.value,
    bootstrapLower: bootstrapLower.value,
    bootstrapUpper: bootstrapUpper.value,
    cliffsDelta: cliffsDelta.value,
    chronologicalMeans: chronologicalMeans.value,
    status: status.value,
    referenceClass: referenceClass.value,
  });
}

function parseAggregateOnlyMetric(object: JsonObject, path: string): Validation<AggregateOnlyMetric> {
  const profile = parseRequired(object, "profile", path, parseProfile);
  if (profile.kind === "invalid") {
    return profile;
  }
  const dimension = parseRequired(object, "dimension", path, (field, fieldPath) => parseNamedValue("dimension", field, fieldPath));
  if (dimension.kind === "invalid") {
    return dimension;
  }
  const window = parseRequired(object, "window", path, parseMetricWindow);
  if (window.kind === "invalid") {
    return window;
  }
  const chatCount = parseRequired(object, "chat_count", path, (field, fieldPath) => parseNaturalNumber("chat_count", 0, field, fieldPath));
  if (chatCount.kind === "invalid") {
    return chatCount;
  }
  const mean = parseRequired(object, "mean_0_4", path, (field, fieldPath) => parseMeasurement("score", 0, 4, field, fieldPath));
  if (mean.kind === "invalid") {
    return mean;
  }
  const privacy = parseRequired(object, "privacy", path, parseAggregatePrivacy);
  if (privacy.kind === "invalid") {
    return privacy;
  }

  return valid({
    kind: "aggregate_only",
    profile: profile.value,
    dimension: dimension.value,
    window: window.value,
    chatCount: chatCount.value,
    mean: mean.value,
    privacy: privacy.value,
  });
}

function parseMetricAggregate(value: unknown, path: string): Validation<MetricAggregate> {
  const object = parseObject(value, path);

  if (object.kind === "invalid") {
    return object;
  }

  const status = object.value["status"];

  if (status === undefined) {
    return parseAggregateOnlyMetric(object.value, path);
  }

  return parseScoredAggregate(object.value, path);
}

function parseRollingMetric(value: unknown, path: string): Validation<RollingMetric> {
  const object = parseObject(value, path);

  if (object.kind === "invalid") {
    return object;
  }
  if (object.value["chat_id"] !== undefined || object.value["title"] !== undefined) {
    return invalid(path, "rolling metrics must not disclose chat identifiers or titles");
  }

  const profile = parseRequired(object.value, "profile", path, parseProfile);
  if (profile.kind === "invalid") {
    return profile;
  }
  const dimension = parseRequired(object.value, "dimension", path, (field, fieldPath) => parseNamedValue("dimension", field, fieldPath));
  if (dimension.kind === "invalid") {
    return dimension;
  }
  const windowEnd = parseRequired(object.value, "window_end", path, parseCalendarDay);
  if (windowEnd.kind === "invalid") {
    return windowEnd;
  }
  const windowDays = parseRequired(object.value, "window_days", path, (field, fieldPath) => parseNaturalNumber("rolling_window_days", 1, field, fieldPath));
  if (windowDays.kind === "invalid") {
    return windowDays;
  }
  if (windowDays.value.value !== 90) {
    return invalid(`${path}.window_days`, "must be a 90-day rolling window");
  }
  const chatCount = parseRequired(object.value, "chat_count", path, (field, fieldPath) => parseNaturalNumber("chat_count", 0, field, fieldPath));
  if (chatCount.kind === "invalid") {
    return chatCount;
  }
  const mean = parseRequired(object.value, "mean_0_4", path, (field, fieldPath) => parseMeasurement("score", 0, 4, field, fieldPath));
  if (mean.kind === "invalid") {
    return mean;
  }
  const privacy = parseRequired(object.value, "privacy", path, parseRollingPrivacy);
  if (privacy.kind === "invalid") {
    return privacy;
  }

  return valid({
    profile: profile.value,
    dimension: dimension.value,
    windowEnd: windowEnd.value,
    windowDays: windowDays.value,
    chatCount: chatCount.value,
    mean: mean.value,
    privacy: privacy.value,
  });
}

function parseArchitectureEpisode(value: unknown, path: string): Validation<ArchitectureEpisode> {
  const object = parseObject(value, path);

  if (object.kind === "invalid") {
    return object;
  }

  const chatId = parseRequired(object.value, "chat_id", path, (field, fieldPath) => parseIdentifier("chat", field, fieldPath));
  if (chatId.kind === "invalid") {
    return chatId;
  }
  const date = parseRequired(object.value, "date", path, parseCalendarDay);
  if (date.kind === "invalid") {
    return date;
  }
  const period = parseRequired(object.value, "period", path, parsePeriod);
  if (period.kind === "invalid") {
    return period;
  }
  const phase = parseRequired(object.value, "phase", path, parseArchitecturePhase);
  if (phase.kind === "invalid") {
    return phase;
  }
  const agentInvolvement = parseRequired(object.value, "agent_involvement", path, parseArchitectureAgentInvolvement);
  if (agentInvolvement.kind === "invalid") {
    return agentInvolvement;
  }
  const designStyle = parseRequired(object.value, "design_style", path, parseArchitectureDesignStyle);
  if (designStyle.kind === "invalid") {
    return designStyle;
  }
  const disposition = parseRequired(object.value, "disposition", path, parseArchitectureDisposition);
  if (disposition.kind === "invalid") {
    return disposition;
  }
  const outcomeStatus = parseRequired(object.value, "outcome_status", path, parseArchitectureOutcomeStatus);
  if (outcomeStatus.kind === "invalid") {
    return outcomeStatus;
  }
  const provenance = parseRequired(object.value, "provenance", path, parseArchitectureProvenance);
  if (provenance.kind === "invalid") {
    return provenance;
  }

  return valid({
    chatId: chatId.value,
    date: date.value,
    period: period.value,
    phase: phase.value,
    agentInvolvement: agentInvolvement.value,
    designStyle: designStyle.value,
    disposition: disposition.value,
    outcomeStatus: outcomeStatus.value,
    provenance: provenance.value,
  });
}

function parseCoverage(value: unknown, path: string): Validation<AtlasCoverage> {
  const object = parseObject(value, path);

  if (object.kind === "invalid") {
    return object;
  }

  const chatCount = parseRequired(object.value, "chat_count", path, (field, fieldPath) => parseNaturalNumber("chat_count", 0, field, fieldPath));
  if (chatCount.kind === "invalid") {
    return chatCount;
  }
  const claimCount = parseRequired(object.value, "claim_count", path, (field, fieldPath) => parseNaturalNumber("claim_count", 0, field, fieldPath));
  if (claimCount.kind === "invalid") {
    return claimCount;
  }
  const topicOccurrenceCount = parseRequired(object.value, "topic_occurrence_count", path, (field, fieldPath) => parseNaturalNumber("occurrence_count", 0, field, fieldPath));
  if (topicOccurrenceCount.kind === "invalid") {
    return topicOccurrenceCount;
  }

  return valid({ chatCount: chatCount.value, claimCount: claimCount.value, topicOccurrenceCount: topicOccurrenceCount.value });
}

function ensureUnique<T, Category extends IdentifierCategory>(
  values: ReadonlyArray<T>,
  identify: (value: T) => Identifier<Category>,
  path: string,
): Validation<ReadonlyArray<T>> {
  const seen = new Set<string>();

  for (const item of values) {
    const identifier = identify(item).value;

    if (seen.has(identifier)) {
      return invalid(path, `contains duplicate identifier ${identifier}`);
    }

    seen.add(identifier);
  }

  return valid(values);
}

function knownIdentifiers<Category extends IdentifierCategory>(values: ReadonlyArray<Identifier<Category>>): ReadonlySet<string> {
  const identifiers = new Set<string>();

  for (const value of values) {
    identifiers.add(value.value);
  }

  return identifiers;
}

function validateAtlasReferences(atlas: Atlas): Validation<Atlas> {
  const uniqueTopics = ensureUnique(atlas.topics, (topic) => topic.topicId, "atlas.topics");
  if (uniqueTopics.kind === "invalid") {
    return uniqueTopics;
  }
  const uniqueThreads = ensureUnique(atlas.threads, (thread) => thread.threadId, "atlas.threads");
  if (uniqueThreads.kind === "invalid") {
    return uniqueThreads;
  }
  const uniqueReports = ensureUnique(atlas.reports, (report) => report.reportId, "atlas.reports");
  if (uniqueReports.kind === "invalid") {
    return uniqueReports;
  }
  const uniqueChats = ensureUnique(atlas.chats, (chat) => chat.chatId, "atlas.chats");
  if (uniqueChats.kind === "invalid") {
    return uniqueChats;
  }
  const uniqueOccurrences = ensureUnique(atlas.occurrences, (occurrence) => occurrence.occurrenceId, "atlas.occurrences");
  if (uniqueOccurrences.kind === "invalid") {
    return uniqueOccurrences;
  }
  const uniqueClaims = ensureUnique(atlas.claims, (claim) => claim.claimId, "atlas.claims");
  if (uniqueClaims.kind === "invalid") {
    return uniqueClaims;
  }

  if (atlas.coverage.chatCount.value !== atlas.chats.length) {
    return invalid("atlas.coverage.chat_count", "does not match the number of chats");
  }
  if (atlas.coverage.claimCount.value !== atlas.claims.length) {
    return invalid("atlas.coverage.claim_count", "does not match the number of claims");
  }
  if (atlas.coverage.topicOccurrenceCount.value !== atlas.occurrences.length) {
    return invalid("atlas.coverage.topic_occurrence_count", "does not match the number of occurrences");
  }

  const topicIds = knownIdentifiers(atlas.topics.map((topic) => topic.topicId));
  const threadIds = knownIdentifiers(atlas.threads.map((thread) => thread.threadId));
  const reportIds = knownIdentifiers(atlas.reports.map((report) => report.reportId));
  const chatsById = new Map<string, Chat>();

  for (const chat of atlas.chats) {
    chatsById.set(chat.chatId.value, chat);
  }

  for (const topic of atlas.topics) {
    if (topic.parent.kind === "child" && !topicIds.has(topic.parent.parentTopicId.value)) {
      return invalid(`atlas.topics.${topic.topicId.value}.parent_topic_id`, "references an unknown topic");
    }
    if (topic.parent.kind === "child" && topic.parent.parentTopicId.value === topic.topicId.value) {
      return invalid(`atlas.topics.${topic.topicId.value}.parent_topic_id`, "cannot be its own parent");
    }
  }

  for (const chat of atlas.chats) {
    for (const topicId of chat.topicIds) {
      if (!topicIds.has(topicId.value)) {
        return invalid(`atlas.chats.${chat.chatId.value}.topic_ids`, "references an unknown topic");
      }
    }
    for (const threadId of chat.threadIds) {
      if (!threadIds.has(threadId.value)) {
        return invalid(`atlas.chats.${chat.chatId.value}.thread_ids`, "references an unknown thread");
      }
    }
  }

  for (const occurrence of atlas.occurrences) {
    const chat = chatsById.get(occurrence.chatId.value);

    if (chat === undefined) {
      return invalid(`atlas.occurrences.${occurrence.occurrenceId.value}.chat_id`, "references an unknown chat");
    }
    if (!topicIds.has(occurrence.topicId.value)) {
      return invalid(`atlas.occurrences.${occurrence.occurrenceId.value}.topic_id`, "references an unknown topic");
    }
    if (occurrence.endTurn.value < occurrence.startTurn.value || occurrence.endTurn.value > chat.turnCount.value) {
      return invalid(`atlas.occurrences.${occurrence.occurrenceId.value}`, "has an invalid turn range");
    }
    for (const threadId of occurrence.threadIds) {
      if (!threadIds.has(threadId.value)) {
        return invalid(`atlas.occurrences.${occurrence.occurrenceId.value}.thread_ids`, "references an unknown thread");
      }
    }
    for (const excerpt of occurrence.excerpts) {
      if (excerpt.turnNumber.value < occurrence.startTurn.value || excerpt.turnNumber.value > occurrence.endTurn.value) {
        return invalid(`atlas.occurrences.${occurrence.occurrenceId.value}.excerpts`, "contains an excerpt outside its turn range");
      }
    }
  }

  for (const claim of atlas.claims) {
    for (const reportId of claim.reportIds) {
      if (!reportIds.has(reportId.value)) {
        return invalid(`atlas.claims.${claim.claimId.value}.report_ids`, "references an unknown report");
      }
    }
    if (claim.privacy === "aggregate_only" && (claim.support.length > 0 || claim.counterevidence.length > 0)) {
      return invalid(`atlas.claims.${claim.claimId.value}`, "aggregate-only claims cannot disclose chat evidence");
    }
    for (const evidence of [...claim.support, ...claim.counterevidence]) {
      const chat = chatsById.get(evidence.chatId.value);

      if (chat === undefined) {
        return invalid(`atlas.claims.${claim.claimId.value}`, "evidence references an unknown chat");
      }
      if (evidence.endTurn.value < evidence.startTurn.value || evidence.endTurn.value > chat.turnCount.value) {
        return invalid(`atlas.claims.${claim.claimId.value}`, "evidence has an invalid turn range");
      }
    }
  }

  for (const episode of atlas.architectureEpisodes) {
    const chat = chatsById.get(episode.chatId.value);

    if (chat === undefined) {
      return invalid(`atlas.architecture_episodes.${episode.chatId.value}.chat_id`, "references an unknown chat");
    }
    if (episode.date.value !== chat.date.value) {
      return invalid(`atlas.architecture_episodes.${episode.chatId.value}.date`, "does not match the associated chat date");
    }
    if (episode.period.value !== chat.period.value) {
      return invalid(`atlas.architecture_episodes.${episode.chatId.value}.period`, "does not match the associated chat period");
    }
  }

  return valid(atlas);
}

export function parseAtlas(value: unknown): Validation<Atlas> {
  const object = parseObject(value, "atlas");

  if (object.kind === "invalid") {
    return object;
  }

  const schemaVersion = parseRequired(object.value, "schema_version", "atlas", parseSchemaVersion);
  if (schemaVersion.kind === "invalid") {
    return schemaVersion;
  }
  const metadata = parseRequired(object.value, "metadata", "atlas", parseMetadata);
  if (metadata.kind === "invalid") {
    return metadata;
  }
  const coverage = parseRequired(object.value, "coverage", "atlas", parseCoverage);
  if (coverage.kind === "invalid") {
    return coverage;
  }
  const reports = parseRequired(object.value, "reports", "atlas", (field, fieldPath) => parseList(field, fieldPath, parseReport));
  if (reports.kind === "invalid") {
    return reports;
  }
  const topics = parseRequired(object.value, "topics", "atlas", (field, fieldPath) => parseList(field, fieldPath, parseTopic));
  if (topics.kind === "invalid") {
    return topics;
  }
  const threads = parseRequired(object.value, "threads", "atlas", (field, fieldPath) => parseList(field, fieldPath, parseThread));
  if (threads.kind === "invalid") {
    return threads;
  }
  const chats = parseRequired(object.value, "chats", "atlas", (field, fieldPath) => parseList(field, fieldPath, parseChat));
  if (chats.kind === "invalid") {
    return chats;
  }
  const occurrences = parseRequired(object.value, "occurrences", "atlas", (field, fieldPath) => parseList(field, fieldPath, parseOccurrence));
  if (occurrences.kind === "invalid") {
    return occurrences;
  }
  const aggregates = parseRequired(object.value, "aggregates", "atlas", (field, fieldPath) => parseList(field, fieldPath, parseMetricAggregate));
  if (aggregates.kind === "invalid") {
    return aggregates;
  }
  const rolling = parseRequired(object.value, "rolling", "atlas", (field, fieldPath) => parseList(field, fieldPath, parseRollingMetric));
  if (rolling.kind === "invalid") {
    return rolling;
  }
  const architectureEpisodes = parseRequired(object.value, "architecture_episodes", "atlas", (field, fieldPath) => parseList(field, fieldPath, parseArchitectureEpisode));
  if (architectureEpisodes.kind === "invalid") {
    return architectureEpisodes;
  }
  const claims = parseRequired(object.value, "claims", "atlas", (field, fieldPath) => parseList(field, fieldPath, parseClaim));
  if (claims.kind === "invalid") {
    return claims;
  }
  const limits = parseRequired(object.value, "limits", "atlas", parseTextList);
  if (limits.kind === "invalid") {
    return limits;
  }

  const atlas: Atlas = {
    schemaVersion: schemaVersion.value,
    metadata: metadata.value,
    coverage: coverage.value,
    reports: reports.value,
    topics: topics.value,
    threads: threads.value,
    chats: chats.value,
    occurrences: occurrences.value,
    aggregates: aggregates.value,
    rolling: rolling.value,
    architectureEpisodes: architectureEpisodes.value,
    claims: claims.value,
    limits: limits.value,
  };

  return validateAtlasReferences(atlas);
}
