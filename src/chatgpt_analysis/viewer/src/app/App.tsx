import { lazy, Suspense, useEffect, useRef, type ReactNode } from "react";
import type { Atlas } from "../domain/atlas.ts";
import { defaultAtlasFilters, findReport } from "../domain/filters.ts";
import { parseAtlasRoute, routeWithoutSubject, routeWithView, type AtlasRoute, type AtlasView } from "../domain/url-state.ts";
import type { ReportId, ThreadId, TopicId } from "../domain/values.ts";
import { AtlasLayout } from "../components/AtlasLayout.tsx";
import { FilterPanel } from "../components/FilterPanel.tsx";
import { EmptyState, FailureState, LoadingState } from "../components/LoadStates.tsx";
import { ChronologyPage } from "../pages/ChronologyPage.tsx";
import { EvidencePage } from "../pages/EvidencePage.tsx";
import { MethodologyPage } from "../pages/MethodologyPage.tsx";
import { MetricsPage } from "../pages/MetricsPage.tsx";
import { OverviewPage } from "../pages/OverviewPage.tsx";
import { ReportsPage } from "../pages/ReportsPage.tsx";
import { ThreadsPage } from "../pages/ThreadsPage.tsx";
import { TopicHierarchyPage } from "../pages/TopicHierarchyPage.tsx";
import { useAtlasData } from "./useAtlasData.ts";
import { useAtlasRoute } from "./useAtlasRoute.ts";

const ReportDocumentPage = lazy(async () => {
  const module = await import("../pages/ReportDocumentPage.tsx");
  return { default: module.ReportDocumentPage };
});

type AtlasContentProps = {
  readonly atlas: Atlas;
  readonly route: AtlasRoute;
  readonly onSelectTopic: (topicId: TopicId) => void;
  readonly onSelectThread: (threadId: ThreadId) => void;
  readonly onSelectReport: (reportId: ReportId) => void;
  readonly onOpenReport: (reportId: ReportId) => void;
  readonly onBackToReports: () => void;
  readonly onClearSubject: () => void;
};

function AtlasContent({ atlas, route, onSelectTopic, onSelectThread, onSelectReport, onOpenReport, onBackToReports, onClearSubject }: AtlasContentProps): ReactNode {
  switch (route.view) {
    case "chronology":
      return <ChronologyPage atlas={atlas} filters={route.filters} />;
    case "evidence":
      return <EvidencePage atlas={atlas} filters={route.filters} />;
    case "methodology":
      return <MethodologyPage atlas={atlas} />;
    case "metrics":
      return <MetricsPage atlas={atlas} filters={route.filters} />;
    case "overview":
      return <OverviewPage atlas={atlas} filters={route.filters} onSelectTopic={onSelectTopic} />;
    case "report": {
      if (route.filters.report.kind === "all_reports") {
        return <p className="rounded-xl border border-dashed border-slate-300 bg-white p-5 text-sm text-slate-700">Choose a report from the report index.</p>;
      }

      const report = findReport(atlas, route.filters.report.reportId);

      if (report.kind === "missing") {
        return <p className="rounded-xl border border-rose-200 bg-rose-50 p-5 text-sm text-rose-900">The selected report is unavailable.</p>;
      }

      return (
        <Suspense fallback={<p className="rounded-xl border border-slate-200 bg-white p-5 text-sm text-slate-600">Loading the report renderer…</p>}>
          <ReportDocumentPage atlas={atlas} key={report.value.reportId.value} onBackToReports={onBackToReports} onOpenReport={onOpenReport} report={report.value} route={route} />
        </Suspense>
      );
    }
    case "reports":
      return <ReportsPage atlas={atlas} filters={route.filters} onOpenReport={onOpenReport} onSelectReport={onSelectReport} />;
    case "threads":
      return <ThreadsPage atlas={atlas} filters={route.filters} onBackToAllThreads={onClearSubject} onSelectThread={onSelectThread} />;
    case "topics":
      return <TopicHierarchyPage atlas={atlas} filters={route.filters} onBackToAllTopics={onClearSubject} onSelectTopic={onSelectTopic} />;
  }
}

export type AtlasApplicationProps = {
  readonly atlas: Atlas;
};

function AtlasApplication({ atlas }: AtlasApplicationProps): ReactNode {
  const { route, navigate } = useAtlasRoute(atlas);
  const mainReference = useRef<HTMLElement | null>(null);
  const hasRendered = useRef(false);

  useEffect(() => {
    if (hasRendered.current) {
      mainReference.current?.focus();
      return;
    }

    hasRendered.current = true;
  }, [route]);

  useEffect(() => {
    document.title = atlas.metadata.title;
  }, [atlas.metadata.title]);

  const selectTopic = (topicId: TopicId): void => {
    navigate({ view: "topics", filters: { ...route.filters, subject: { kind: "topic_subject", topicId } } });
  };

  const selectThread = (threadId: ThreadId): void => {
    navigate({ view: "threads", filters: { ...route.filters, subject: { kind: "thread_subject", threadId } } });
  };

  const selectReport = (reportId: ReportId): void => {
    navigate({ view: "reports", filters: { ...route.filters, report: { kind: "report", reportId } } });
  };

  const openReport = (reportId: ReportId): void => {
    navigate({ view: "report", filters: { ...route.filters, report: { kind: "report", reportId } } });
  };

  const backToReports = (): void => {
    navigate(routeWithView(route, "reports"));
  };

  const clearSubject = (): void => {
    navigate(routeWithoutSubject(route));
  };

  const navigateToView = (view: AtlasView): void => {
    navigate(routeWithView(route, view));
  };

  const applyFilters = (parameters: URLSearchParams): void => {
    navigate(parseAtlasRoute(atlas, parameters));
  };

  const clearFilters = (): void => {
    navigate({ view: route.view === "report" ? "reports" : route.view, filters: defaultAtlasFilters() });
  };

  const activeView = route.view === "report" ? "reports" : route.view;

  return (
    <AtlasLayout
      activeView={activeView}
      description={atlas.metadata.description}
      mainReference={mainReference}
      onNavigate={navigateToView}
      privacyNotice={atlas.metadata.privacyNotice}
      showMetrics={atlas.aggregates.length > 0 || atlas.rolling.length > 0 || atlas.architectureEpisodes.length > 0}
      showThreads={atlas.threads.length > 0}
      title={atlas.metadata.title}
    >
      <div className="grid gap-8">
        <FilterPanel atlas={atlas} onApply={applyFilters} onClear={clearFilters} route={route} />
        <AtlasContent
          atlas={atlas}
          onBackToReports={backToReports}
          onClearSubject={clearSubject}
          onOpenReport={openReport}
          onSelectReport={selectReport}
          onSelectThread={selectThread}
          onSelectTopic={selectTopic}
          route={route}
        />
      </div>
    </AtlasLayout>
  );
}

export function App(): ReactNode {
  const { state, retry } = useAtlasData();

  switch (state.kind) {
    case "empty":
      return <EmptyState chatCount={state.atlas.coverage.chatCount.value} />;
    case "failure":
      return <FailureState message={state.message} onRetry={retry} />;
    case "loading":
      return <LoadingState label="Loading analysis data" />;
    case "ready":
      return <AtlasApplication atlas={state.atlas} />;
  }
}
