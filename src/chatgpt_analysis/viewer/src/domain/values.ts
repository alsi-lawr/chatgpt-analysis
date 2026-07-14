export type Validation<T> = Valid<T> | Invalid;

export type Valid<T> = {
  readonly kind: "valid";
  readonly value: T;
};

export type Invalid = {
  readonly kind: "invalid";
  readonly issue: ValidationIssue;
};

export type ValidationIssue = {
  readonly path: string;
  readonly message: string;
};

export type JsonObject = {
  readonly [property: string]: unknown;
};

export type IdentifierCategory =
  | "chat"
  | "claim"
  | "occurrence"
  | "report"
  | "thread"
  | "topic";

export type NamedValueCategory =
  | "architecture_provenance"
  | "centrality"
  | "chat_tier"
  | "claim_type"
  | "coverage_domain"
  | "dimension"
  | "domain"
  | "mode"
  | "period"
  | "provenance"
  | "source_kind"
  | "stance";

export type NumberUnit =
  | "chat_count"
  | "claim_count"
  | "architecture_episode_count"
  | "matched_stratum_count"
  | "metric_count"
  | "occurrence_count"
  | "rolling_window_days"
  | "turn"
  | "turn_count";

export type MeasurementKind = "confidence" | "effect_size" | "score" | "score_delta";

export type Profile =
  | "emotional_maturity"
  | "engineering"
  | "expression"
  | "judgement"
  | "learning"
  | "reasoning";

export type AggregateStatus = "insufficient" | "mixed" | "strong progression" | "suggestive progression";

export type ClaimStatus = AggregateStatus | "supported";

export type ClaimConfidence = "high" | "low" | "medium";

export type Period = NamedValue<"period">;

export type ChatTier = NamedValue<"chat_tier">;

export type Provenance = NamedValue<"provenance">;

export type Centrality = NamedValue<"centrality">;

export type Stance = NamedValue<"stance">;

export type SourceKind = NamedValue<"source_kind">;

export type OccurrenceSensitivity = "permitted";

export type ClaimPrivacy = "aggregate_only" | "permitted";

export type AggregatePrivacy = "aggregate_only_no_chat_identifiers";

export type RollingPrivacy = AggregatePrivacy | "permitted";

export type MetricWindow = "end" | "middle" | "start";

export type CoveragePeriod = MetricWindow | Period;

export type ArchitectureAgentInvolvement = "advice" | "implementation" | "none" | "orchestration" | "unclear";

export type ArchitectureDesignStyle = "explicit/domain-modelled" | "mixed" | "simple/linear" | "unclear";

export type ArchitectureDisposition = "accepted" | "explored" | "rejected" | "revised" | "unclear";

export type ArchitectureOutcomeStatus = "artifact_observed" | "not_observed" | "self_reported";

export type ArchitecturePhase = "V1" | "durable" | "maintenance" | "spike" | "unclear";

export type ArchitectureProvenance = NamedValue<"architecture_provenance">;

export class Identifier<Category extends IdentifierCategory> {
  public readonly category: Category;
  public readonly value: string;

  private constructor(category: Category, value: string) {
    this.category = category;
    this.value = value;
  }

  public static create<Category extends IdentifierCategory>(category: Category, value: string): Identifier<Category> {
    return new Identifier(category, value);
  }
}

export class NamedValue<Category extends NamedValueCategory> {
  public readonly category: Category;
  public readonly value: string;

  private constructor(category: Category, value: string) {
    this.category = category;
    this.value = value;
  }

  public static create<Category extends NamedValueCategory>(category: Category, value: string): NamedValue<Category> {
    return new NamedValue(category, value);
  }
}

export class NaturalNumber<Unit extends NumberUnit> {
  public readonly unit: Unit;
  public readonly value: number;

  private constructor(unit: Unit, value: number) {
    this.unit = unit;
    this.value = value;
  }

  public static create<Unit extends NumberUnit>(unit: Unit, value: number): NaturalNumber<Unit> {
    return new NaturalNumber(unit, value);
  }
}

export class Measurement<Kind extends MeasurementKind> {
  public readonly kind: Kind;
  public readonly value: number;

  private constructor(kind: Kind, value: number) {
    this.kind = kind;
    this.value = value;
  }

  public static create<Kind extends MeasurementKind>(kind: Kind, value: number): Measurement<Kind> {
    return new Measurement(kind, value);
  }
}

export class CalendarDay {
  public readonly value: string;
  public readonly timestamp: number;

  private constructor(value: string, timestamp: number) {
    this.value = value;
    this.timestamp = timestamp;
  }

  public static create(value: string, timestamp: number): CalendarDay {
    return new CalendarDay(value, timestamp);
  }
}

export type ChatId = Identifier<"chat">;
export type ClaimId = Identifier<"claim">;
export type OccurrenceId = Identifier<"occurrence">;
export type ReportId = Identifier<"report">;
export type ThreadId = Identifier<"thread">;
export type TopicId = Identifier<"topic">;

export type MetricDimension = NamedValue<"dimension">;
export type AtlasDomain = NamedValue<"domain">;
export type InteractionMode = NamedValue<"mode">;

export type ChatCount = NaturalNumber<"chat_count">;
export type ClaimCount = NaturalNumber<"claim_count">;
export type MatchedStratumCount = NaturalNumber<"matched_stratum_count">;
export type MetricCount = NaturalNumber<"metric_count">;
export type OccurrenceCount = NaturalNumber<"occurrence_count">;
export type ArchitectureEpisodeCount = NaturalNumber<"architecture_episode_count">;
export type RollingWindowDays = NaturalNumber<"rolling_window_days">;
export type TurnCoordinate = NaturalNumber<"turn">;
export type TurnCount = NaturalNumber<"turn_count">;

export type Confidence = Measurement<"confidence">;
export type EffectSize = Measurement<"effect_size">;
export type Score = Measurement<"score">;
export type ScoreDelta = Measurement<"score_delta">;

export function valid<T>(value: T): Valid<T> {
  return { kind: "valid", value };
}

export function invalid(path: string, message: string): Invalid {
  return { kind: "invalid", issue: { path, message } };
}

export function isJsonObject(value: unknown): value is JsonObject {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function parseObject(value: unknown, path: string): Validation<JsonObject> {
  if (!isJsonObject(value)) {
    return invalid(path, "must be an object");
  }

  return valid(value);
}

export function parseArray(value: unknown, path: string): Validation<ReadonlyArray<unknown>> {
  if (!Array.isArray(value)) {
    return invalid(path, "must be an array");
  }

  return valid(value);
}

export function requiredProperty(object: JsonObject, property: string, path: string): Validation<unknown> {
  const value = object[property];

  if (value === undefined) {
    return invalid(`${path}.${property}`, "is required");
  }

  return valid(value);
}

export function parseText(value: unknown, path: string): Validation<string> {
  if (typeof value !== "string") {
    return invalid(path, "must be text");
  }

  return valid(value);
}

export function parseNonEmptyText(value: unknown, path: string): Validation<string> {
  const text = parseText(value, path);

  if (text.kind === "invalid") {
    return text;
  }

  if (text.value.trim().length === 0) {
    return invalid(path, "must not be empty");
  }

  return text;
}

export function parseFiniteNumber(value: unknown, path: string): Validation<number> {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return invalid(path, "must be a finite number");
  }

  return valid(value);
}

export function parseIdentifier<Category extends IdentifierCategory>(
  category: Category,
  value: unknown,
  path: string,
): Validation<Identifier<Category>> {
  const text = parseNonEmptyText(value, path);

  if (text.kind === "invalid") {
    return text;
  }

  return valid(Identifier.create(category, text.value));
}

export function parseNamedValue<Category extends NamedValueCategory>(
  category: Category,
  value: unknown,
  path: string,
): Validation<NamedValue<Category>> {
  const text = parseNonEmptyText(value, path);

  if (text.kind === "invalid") {
    return text;
  }

  return valid(NamedValue.create(category, text.value));
}

export function parseNaturalNumber<Unit extends NumberUnit>(
  unit: Unit,
  minimum: number,
  value: unknown,
  path: string,
): Validation<NaturalNumber<Unit>> {
  const number = parseFiniteNumber(value, path);

  if (number.kind === "invalid") {
    return number;
  }

  if (!Number.isInteger(number.value) || number.value < minimum) {
    return invalid(path, `must be an integer greater than or equal to ${minimum}`);
  }

  return valid(NaturalNumber.create(unit, number.value));
}

export function parseMeasurement<Kind extends MeasurementKind>(
  kind: Kind,
  minimum: number,
  maximum: number,
  value: unknown,
  path: string,
): Validation<Measurement<Kind>> {
  const number = parseFiniteNumber(value, path);

  if (number.kind === "invalid") {
    return number;
  }

  if (number.value < minimum || number.value > maximum) {
    return invalid(path, `must be between ${minimum} and ${maximum}`);
  }

  return valid(Measurement.create(kind, number.value));
}

export function parseCalendarDay(value: unknown, path: string): Validation<CalendarDay> {
  const text = parseText(value, path);

  if (text.kind === "invalid") {
    return text;
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(text.value)) {
    return invalid(path, "must use YYYY-MM-DD");
  }

  const parsed = new Date(`${text.value}T00:00:00.000Z`);
  const canonical = parsed.toISOString().slice(0, 10);

  if (Number.isNaN(parsed.getTime()) || canonical !== text.value) {
    return invalid(path, "must be a real calendar day");
  }

  return valid(CalendarDay.create(text.value, parsed.getTime()));
}

export function parseProfile(value: unknown, path: string): Validation<Profile> {
  if (value === "emotional_maturity") {
    return valid(value);
  }
  if (value === "engineering") {
    return valid(value);
  }
  if (value === "expression") {
    return valid(value);
  }
  if (value === "judgement") {
    return valid(value);
  }
  if (value === "learning") {
    return valid(value);
  }
  if (value === "reasoning") {
    return valid(value);
  }
  return invalid(path, "must be a known profile");
}

export function parseAggregateStatus(value: unknown, path: string): Validation<AggregateStatus> {
  if (value === "insufficient") {
    return valid(value);
  }
  if (value === "mixed") {
    return valid(value);
  }
  if (value === "strong progression") {
    return valid(value);
  }
  if (value === "suggestive progression") {
    return valid(value);
  }
  return invalid(path, "must be a known aggregate status");
}

export function parseClaimStatus(value: unknown, path: string): Validation<ClaimStatus> {
  const aggregateStatus = parseAggregateStatus(value, path);

  if (aggregateStatus.kind === "valid") {
    return aggregateStatus;
  }
  if (value === "supported") {
    return valid(value);
  }
  return invalid(path, "must be a known claim status");
}

export function parseClaimConfidence(value: unknown, path: string): Validation<ClaimConfidence> {
  if (value === "high") {
    return valid(value);
  }
  if (value === "medium") {
    return valid(value);
  }
  if (value === "low") {
    return valid(value);
  }
  return invalid(path, "must be a known claim confidence");
}

export function parsePeriod(value: unknown, path: string): Validation<Period> {
  return parseNamedValue("period", value, path);
}

export function parseChatTier(value: unknown, path: string): Validation<ChatTier> {
  return parseNamedValue("chat_tier", value, path);
}

export function parseProvenance(value: unknown, path: string): Validation<Provenance> {
  return parseNamedValue("provenance", value, path);
}

export function parseCentrality(value: unknown, path: string): Validation<Centrality> {
  return parseNamedValue("centrality", value, path);
}

export function parseStance(value: unknown, path: string): Validation<Stance> {
  return parseNamedValue("stance", value, path);
}

export function parseSourceKind(value: unknown, path: string): Validation<SourceKind> {
  return parseNamedValue("source_kind", value, path);
}

export function parseOccurrenceSensitivity(value: unknown, path: string): Validation<OccurrenceSensitivity> {
  if (value === "permitted") {
    return valid(value);
  }
  return invalid(path, "must be permitted");
}

export function parseClaimPrivacy(value: unknown, path: string): Validation<ClaimPrivacy> {
  if (value === "aggregate_only") {
    return valid(value);
  }
  if (value === "permitted") {
    return valid(value);
  }
  return invalid(path, "must be a known claim privacy state");
}

export function parseAggregatePrivacy(value: unknown, path: string): Validation<AggregatePrivacy> {
  if (value === "aggregate_only_no_chat_identifiers") {
    return valid(value);
  }
  return invalid(path, "must be aggregate_only_no_chat_identifiers");
}

export function parseRollingPrivacy(value: unknown, path: string): Validation<RollingPrivacy> {
  const aggregatePrivacy = parseAggregatePrivacy(value, path);

  if (aggregatePrivacy.kind === "valid") {
    return aggregatePrivacy;
  }
  if (value === "permitted") {
    return valid(value);
  }
  return invalid(path, "must be a known rolling privacy state");
}

export function parseMetricWindow(value: unknown, path: string): Validation<MetricWindow> {
  if (value === "end") {
    return valid(value);
  }
  if (value === "middle") {
    return valid(value);
  }
  if (value === "start") {
    return valid(value);
  }
  return invalid(path, "must be a known metric window");
}

export function parseCoveragePeriod(value: unknown, path: string): Validation<CoveragePeriod> {
  const metricWindow = parseMetricWindow(value, path);

  if (metricWindow.kind === "valid") {
    return metricWindow;
  }

  return parsePeriod(value, path);
}

export function parseArchitectureAgentInvolvement(value: unknown, path: string): Validation<ArchitectureAgentInvolvement> {
  if (value === "advice") {
    return valid(value);
  }
  if (value === "implementation") {
    return valid(value);
  }
  if (value === "none") {
    return valid(value);
  }
  if (value === "orchestration") {
    return valid(value);
  }
  if (value === "unclear") {
    return valid(value);
  }
  return invalid(path, "must be a known architecture agent-involvement state");
}

export function parseArchitectureDesignStyle(value: unknown, path: string): Validation<ArchitectureDesignStyle> {
  if (value === "explicit/domain-modelled") {
    return valid(value);
  }
  if (value === "mixed") {
    return valid(value);
  }
  if (value === "simple/linear") {
    return valid(value);
  }
  if (value === "unclear") {
    return valid(value);
  }
  return invalid(path, "must be a known architecture design style");
}

export function parseArchitectureDisposition(value: unknown, path: string): Validation<ArchitectureDisposition> {
  if (value === "accepted") {
    return valid(value);
  }
  if (value === "explored") {
    return valid(value);
  }
  if (value === "rejected") {
    return valid(value);
  }
  if (value === "revised") {
    return valid(value);
  }
  if (value === "unclear") {
    return valid(value);
  }
  return invalid(path, "must be a known architecture disposition");
}

export function parseArchitectureOutcomeStatus(value: unknown, path: string): Validation<ArchitectureOutcomeStatus> {
  if (value === "artifact_observed") {
    return valid(value);
  }
  if (value === "not_observed") {
    return valid(value);
  }
  if (value === "self_reported") {
    return valid(value);
  }
  return invalid(path, "must be a known architecture outcome status");
}

export function parseArchitecturePhase(value: unknown, path: string): Validation<ArchitecturePhase> {
  if (value === "V1") {
    return valid(value);
  }
  if (value === "durable") {
    return valid(value);
  }
  if (value === "maintenance") {
    return valid(value);
  }
  if (value === "spike") {
    return valid(value);
  }
  if (value === "unclear") {
    return valid(value);
  }
  return invalid(path, "must be a known architecture phase");
}

export function parseArchitectureProvenance(value: unknown, path: string): Validation<ArchitectureProvenance> {
  return parseNamedValue("architecture_provenance", value, path);
}

export function identifiersMatch<Category extends IdentifierCategory>(
  first: Identifier<Category>,
  second: Identifier<Category>,
): boolean {
  return first.value === second.value;
}
