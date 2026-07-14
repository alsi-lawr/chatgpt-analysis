import { readFile } from "node:fs/promises";
import { parseAtlas, type Atlas } from "../src/domain/atlas.ts";

export async function loadAtlasFixture(): Promise<Atlas> {
  const source = await readFile(new URL("../public/data/atlas.json", import.meta.url), "utf8");
  const raw: unknown = JSON.parse(source);
  const parsed = parseAtlas(raw);

  if (parsed.kind === "invalid") {
    throw new Error(`Fixture atlas is invalid at ${parsed.issue.path}: ${parsed.issue.message}`);
  }

  return parsed.value;
}
