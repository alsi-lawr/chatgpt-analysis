import assert from "node:assert/strict";
import test from "node:test";
import { parseAtlasRoute, routeWithoutSubject, serialiseAtlasRoute, type AtlasView } from "../src/domain/url-state.ts";
import { loadAtlasFixture } from "./atlasFixture.ts";

type SelectedSubjectKind = "thread_subject" | "topic_subject";

async function verifySubjectClearing(view: AtlasView, subject: string, expectedSubjectKind: SelectedSubjectKind): Promise<void> {
  const atlas = await loadAtlasFixture();
  const route = parseAtlasRoute(atlas, new URLSearchParams({
    view,
    subject,
    report: "development-atlas",
    context: "domain:software",
    provenance: "observed",
    confidence: "0.95",
    status: "suggestive progression",
    from: "2024-09-01",
    to: "2026-07-10",
  }));
  const clearedRoute = routeWithoutSubject(route);
  const clearedParameters = serialiseAtlasRoute(clearedRoute);

  assert.equal(route.filters.subject.kind, expectedSubjectKind);
  assert.deepEqual(clearedRoute, {
    view: route.view,
    filters: { ...route.filters, subject: { kind: "all_subjects" } },
  });
  assert.equal(clearedParameters.get("subject"), null);
  assert.deepEqual(parseAtlasRoute(atlas, clearedParameters), clearedRoute);
}

test("URLSearchParams resolve to typed topic filters and round trip", async () => {
  const atlas = await loadAtlasFixture();
  const parameters = new URLSearchParams({
    view: "topics",
    subject: "topic:software-engineering",
    confidence: "0.95",
    provenance: "observed",
    status: "suggestive progression",
    from: "2024-09-01",
    to: "2026-07-10",
  });
  const route = parseAtlasRoute(atlas, parameters);
  const roundTripped = parseAtlasRoute(atlas, serialiseAtlasRoute(route));

  assert.equal(route.view, "topics");
  assert.equal(route.filters.subject.kind, "topic_subject");
  if (route.filters.subject.kind === "topic_subject") {
    assert.equal(route.filters.subject.topicId.value, "software-engineering");
  }
  assert.equal(route.filters.confidence.kind, "minimum_confidence");
  assert.equal(route.filters.provenance.kind, "provenance");
  assert.equal(roundTripped.view, "topics");
  assert.equal(roundTripped.filters.subject.kind, "topic_subject");
});

test("invalid URL values fall back to safe typed defaults", async () => {
  const atlas = await loadAtlasFixture();
  const route = parseAtlasRoute(atlas, new URLSearchParams("view=unknown&subject=topic:not-real&confidence=0.33"));

  assert.equal(route.view, "overview");
  assert.equal(route.filters.subject.kind, "all_subjects");
  assert.equal(route.filters.confidence.kind, "all_confidence");
});

test("clearing a selected topic retains every other URL filter", async () => {
  await verifySubjectClearing("topics", "topic:software-engineering", "topic_subject");
});

test("clearing a selected thread retains every other URL filter", async () => {
  await verifySubjectClearing("threads", "thread:core-metaphysics", "thread_subject");
});
