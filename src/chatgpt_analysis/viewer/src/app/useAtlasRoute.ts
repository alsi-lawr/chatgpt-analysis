import { useEffect, useState } from "react";
import type { Atlas } from "../domain/atlas.ts";
import { parseAtlasRoute, serialiseAtlasRoute, type AtlasRoute } from "../domain/url-state.ts";

export type AtlasRouteController = {
  readonly route: AtlasRoute;
  readonly navigate: (route: AtlasRoute) => void;
};

function currentRoute(atlas: Atlas): AtlasRoute {
  return parseAtlasRoute(atlas, new URLSearchParams(window.location.search));
}

function urlFor(route: AtlasRoute): string {
  const parameters = serialiseAtlasRoute(route);
  const query = parameters.toString();
  return `${window.location.pathname}?${query}${window.location.hash}`;
}

export function useAtlasRoute(atlas: Atlas): AtlasRouteController {
  const [route, setRoute] = useState<AtlasRoute>(() => currentRoute(atlas));

  useEffect(() => {
    const synchroniseFromBrowser = (): void => {
      setRoute(currentRoute(atlas));
    };

    window.addEventListener("popstate", synchroniseFromBrowser);
    synchroniseFromBrowser();

    return () => {
      window.removeEventListener("popstate", synchroniseFromBrowser);
    };
  }, [atlas]);

  return {
    route,
    navigate: (nextRoute) => {
      window.history.pushState({}, "", urlFor(nextRoute));
      setRoute(nextRoute);
    },
  };
}
