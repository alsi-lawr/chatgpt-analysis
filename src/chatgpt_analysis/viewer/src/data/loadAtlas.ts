import { parseAtlas, type Atlas } from "../domain/atlas.ts";

export type AtlasLoadOutcome = AtlasLoaded | AtlasEmpty | AtlasLoadFailure | AtlasLoadCancelled;

export type AtlasLoaded = {
  readonly kind: "loaded";
  readonly atlas: Atlas;
};

export type AtlasEmpty = {
  readonly kind: "empty";
  readonly atlas: Atlas;
};

export type AtlasLoadFailure = {
  readonly kind: "failed";
  readonly message: string;
};

export type AtlasLoadCancelled = {
  readonly kind: "cancelled";
};

function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === "AbortError";
}

function messageFor(error: unknown): string {
  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message;
  }

  return "The atlas data could not be loaded.";
}

export async function loadAtlas(signal: AbortSignal): Promise<AtlasLoadOutcome> {
  try {
    const response = await fetch(new URL("data/atlas.json", document.baseURI), { signal });

    if (!response.ok) {
      return { kind: "failed", message: `The atlas data request returned ${response.status}.` };
    }

    const payload: unknown = await response.json();
    const parsed = parseAtlas(payload);

    if (parsed.kind === "invalid") {
      return { kind: "failed", message: `The atlas data is invalid at ${parsed.issue.path}: ${parsed.issue.message}` };
    }

    if (parsed.value.chats.length === 0) {
      return { kind: "empty", atlas: parsed.value };
    }

    return { kind: "loaded", atlas: parsed.value };
  } catch (error: unknown) {
    if (isAbortError(error)) {
      return { kind: "cancelled" };
    }

    return { kind: "failed", message: messageFor(error) };
  }
}
