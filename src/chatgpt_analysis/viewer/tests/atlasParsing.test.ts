import assert from "node:assert/strict";
import test from "node:test";
import { parseAtlas } from "../src/domain/atlas.ts";
import { loadAtlasFixture } from "./atlasFixture.ts";

test("the generated atlas validates its complete current contract", async () => {
  const atlas = await loadAtlasFixture();
  let hasEndpointCoverage = false;
  let hasScopedCoverage = false;

  for (const claim of atlas.claims) {
    if (claim.coverage.kind === "endpoint_coverage") {
      hasEndpointCoverage = true;
    }
    if (claim.coverage.kind === "scoped_coverage") {
      hasScopedCoverage = true;
    }
  }

  assert.equal(atlas.schemaVersion, "2.0.0");
  assert.ok(atlas.metadata.title.length > 0);
  assert.ok(atlas.chats.length > 0);
  assert.ok(atlas.claims.length > 0);
  assert.ok(atlas.rolling.length > 0);
  assert.ok(atlas.architectureEpisodes.length > 0);
  assert.equal(hasEndpointCoverage, true);
  assert.equal(hasScopedCoverage, true);
});

test("the parser rejects an incomplete unknown payload", () => {
  const parsed = parseAtlas({});

  assert.equal(parsed.kind, "invalid");
  if (parsed.kind === "invalid") {
    assert.equal(parsed.issue.path, "atlas.schema_version");
  }
});
