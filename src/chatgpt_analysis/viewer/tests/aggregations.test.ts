import assert from "node:assert/strict";
import test from "node:test";
import { chronology, longestRollingSeries, summariseTopics } from "../src/domain/aggregations.ts";
import { defaultAtlasFilters, filterOccurrences } from "../src/domain/filters.ts";
import { loadAtlasFixture } from "./atlasFixture.ts";

test("topic summaries account for every filtered occurrence", async () => {
  const atlas = await loadAtlasFixture();
  const occurrences = filterOccurrences(atlas, defaultAtlasFilters());
  const summaries = summariseTopics(atlas, occurrences);
  let total = 0;

  for (const summary of summaries) {
    total += summary.occurrenceCount.value;
  }

  assert.equal(total, occurrences.length);
});

test("chronology and rolling aggregation preserve aggregate coverage", async () => {
  const atlas = await loadAtlasFixture();
  const points = chronology(atlas.chats, atlas.occurrences);
  const rolling = longestRollingSeries(atlas.rolling);
  let chatTotal = 0;
  let occurrenceTotal = 0;

  for (const point of points) {
    chatTotal += point.chatCount.value;
    occurrenceTotal += point.occurrenceCount.value;
  }

  assert.equal(chatTotal, atlas.chats.length);
  assert.equal(occurrenceTotal, atlas.occurrences.length);
  assert.equal(rolling.kind, "rolling_series_available");
  if (rolling.kind === "rolling_series_available") {
    assert.ok(rolling.series.points.length > 0);
  }
});
