import assert from "node:assert/strict";
import test from "node:test";
import { confidenceThreshold, defaultAtlasFilters, filterChats, filterOccurrences, filterScoredAggregates, type AtlasFilters } from "../src/domain/filters.ts";
import { parseProvenance } from "../src/domain/values.ts";
import { loadAtlasFixture } from "./atlasFixture.ts";

test("evidence filters constrain occurrences and their visible chats", async () => {
  const atlas = await loadAtlasFixture();
  const defaults = defaultAtlasFilters();
  const observed = parseProvenance("observed", "test provenance");

  if (observed.kind === "invalid") {
    throw new Error(`Expected a valid provenance: ${observed.issue.message}`);
  }

  const filters: AtlasFilters = {
    ...defaults,
    provenance: { kind: "provenance", provenance: observed.value },
    confidence: { kind: "minimum_confidence", minimum: confidenceThreshold(0.95) },
  };
  const occurrences = filterOccurrences(atlas, filters);
  const chats = filterChats(atlas, filters);

  assert.ok(occurrences.length > 0);
  assert.ok(occurrences.length <= atlas.occurrences.length);
  assert.ok(chats.length <= atlas.chats.length);
  assert.equal(occurrences.every((occurrence) => occurrence.provenance.value === "observed" && occurrence.confidence.value >= 0.95), true);
});

test("scorable status filters only return matching endpoint metrics", async () => {
  const atlas = await loadAtlasFixture();
  const defaults = defaultAtlasFilters();
  const filters: AtlasFilters = { ...defaults, scorableStatus: { kind: "scorable_status", status: "suggestive progression" } };
  const metrics = filterScoredAggregates(atlas, filters);

  assert.ok(metrics.length > 0);
  assert.equal(metrics.every((metric) => metric.status === "suggestive progression"), true);
});
