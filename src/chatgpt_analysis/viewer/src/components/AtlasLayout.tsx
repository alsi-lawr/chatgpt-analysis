import type { ReactNode, RefObject } from "react";
import type { AtlasView } from "../domain/url-state.ts";

type NavigationItem = {
  readonly view: AtlasView;
  readonly label: string;
};

const navigationItems: ReadonlyArray<NavigationItem> = [
  { view: "overview", label: "Overview" },
  { view: "reports", label: "Reports" },
  { view: "topics", label: "Topic hierarchy" },
  { view: "threads", label: "Recurring threads" },
  { view: "chronology", label: "Chronology" },
  { view: "metrics", label: "Profiles & metrics" },
  { view: "evidence", label: "Evidence" },
  { view: "methodology", label: "Methodology" },
];

export type AtlasLayoutProps = {
  readonly activeView: AtlasView;
  readonly onNavigate: (view: AtlasView) => void;
  readonly mainReference: RefObject<HTMLElement | null>;
  readonly title: string;
  readonly description: string;
  readonly privacyNotice: string;
  readonly showMetrics: boolean;
  readonly showThreads: boolean;
  readonly children: ReactNode;
};

function navigationClass(isActive: boolean): string {
  if (isActive) {
    return "rounded-full bg-slate-900 px-3.5 py-2 text-sm font-semibold text-white shadow-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-950";
  }

  return "rounded-full border border-transparent px-3.5 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-white hover:text-slate-950 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-950";
}

export function AtlasLayout({ activeView, onNavigate, mainReference, title, description, privacyNotice, showMetrics, showThreads, children }: AtlasLayoutProps): ReactNode {
  const visibleNavigationItems = navigationItems.filter((item) => (item.view === "metrics" ? showMetrics : item.view !== "threads" || showThreads));

  return (
    <div className="min-h-screen bg-slate-50 text-slate-950">
      <a
        className="sr-only rounded-md bg-white px-4 py-2 font-semibold text-slate-950 shadow focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:outline-2 focus:outline-offset-2 focus:outline-slate-950"
        href="#atlas-main"
      >
        Skip to main content
      </a>
      <header className="border-b border-slate-200 bg-gradient-to-b from-white to-slate-50">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-sm font-semibold tracking-wide text-sky-800">Private local viewer</p>
              <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-950">{title}</h1>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
                {description}
              </p>
            </div>
            <p className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">{privacyNotice}</p>
          </div>
          <nav aria-label="Atlas sections" className="mt-6 flex flex-wrap gap-1.5">
            {visibleNavigationItems.map((item) => {
              const isActive = item.view === activeView;

              return (
                <button
                  aria-current={isActive ? "page" : undefined}
                  className={navigationClass(isActive)}
                  key={item.view}
                  onClick={() => {
                    onNavigate(item.view);
                  }}
                  type="button"
                >
                  {item.label}
                </button>
              );
            })}
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 focus:outline-none" id="atlas-main" ref={mainReference} tabIndex={-1}>
        {children}
      </main>
    </div>
  );
}
