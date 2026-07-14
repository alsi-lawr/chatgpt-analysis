import { useEffect, useState } from "react";
import { loadAtlas, type AtlasLoadOutcome } from "../data/loadAtlas.ts";
import type { Atlas } from "../domain/atlas.ts";

export type AtlasViewState = AtlasLoading | AtlasReady | AtlasEmpty | AtlasFailure;

export type AtlasLoading = {
  readonly kind: "loading";
};

export type AtlasReady = {
  readonly kind: "ready";
  readonly atlas: Atlas;
};

export type AtlasEmpty = {
  readonly kind: "empty";
  readonly atlas: Atlas;
};

export type AtlasFailure = {
  readonly kind: "failure";
  readonly message: string;
};

export type AtlasDataController = {
  readonly state: AtlasViewState;
  readonly retry: () => void;
};

type ViewStateTransition = ViewStateUpdate | NoViewStateUpdate;

type ViewStateUpdate = {
  readonly kind: "update_view_state";
  readonly state: AtlasViewState;
};

type NoViewStateUpdate = {
  readonly kind: "keep_view_state";
};

function toViewStateTransition(outcome: AtlasLoadOutcome): ViewStateTransition {
  switch (outcome.kind) {
    case "cancelled":
      return { kind: "keep_view_state" };
    case "empty":
      return { kind: "update_view_state", state: { kind: "empty", atlas: outcome.atlas } };
    case "failed":
      return { kind: "update_view_state", state: { kind: "failure", message: outcome.message } };
    case "loaded":
      return { kind: "update_view_state", state: { kind: "ready", atlas: outcome.atlas } };
  }
}

export function useAtlasData(): AtlasDataController {
  const [reloadVersion, setReloadVersion] = useState(0);
  const [state, setState] = useState<AtlasViewState>({ kind: "loading" });

  useEffect(() => {
    const controller = new AbortController();
    let active = true;

    setState({ kind: "loading" });

    void loadAtlas(controller.signal)
      .then((outcome) => {
        const transition = toViewStateTransition(outcome);

        if (active && transition.kind === "update_view_state") {
          setState(transition.state);
        }
      })
      .catch((error: unknown) => {
        if (active) {
          const message = error instanceof Error && error.message.trim().length > 0 ? error.message : "The atlas data could not be loaded.";
          setState({ kind: "failure", message });
        }
      });

    return () => {
      active = false;
      controller.abort();
    };
  }, [reloadVersion]);

  return {
    state,
    retry: () => {
      setReloadVersion((currentVersion) => currentVersion + 1);
    },
  };
}
