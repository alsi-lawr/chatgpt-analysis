import { useEffect, useState, type ComponentPropsWithoutRef, type MouseEvent, type ReactNode } from "react";
import Markdown, { type MarkdownToJSX } from "markdown-to-jsx/react";
import type { Atlas, Report } from "../domain/atlas.ts";
import { serialiseAtlasRoute, type AtlasRoute } from "../domain/url-state.ts";
import type { ReportId } from "../domain/values.ts";

type ReportDocumentState = ReportDocumentLoading | ReportDocumentLoaded | ReportDocumentFailure;

type ReportDocumentLoading = {
  readonly kind: "loading";
};

type ReportDocumentLoaded = {
  readonly kind: "loaded";
  readonly markdown: string;
};

type ReportDocumentFailure = {
  readonly kind: "failure";
  readonly message: string;
};

type ResolvedResource = ResolvedResourceAvailable | ResolvedResourceUnavailable;

type ResolvedResourceAvailable = {
  readonly kind: "available";
  readonly href: string;
};

type ResolvedResourceUnavailable = {
  readonly kind: "unavailable";
};

type ResolvedReportLink = LinkedAtlasReport | OrdinaryReportLink | UnavailableReportLink;

type LinkedAtlasReport = {
  readonly kind: "atlas_report";
  readonly report: Report;
};

type OrdinaryReportLink = {
  readonly kind: "ordinary_link";
  readonly href: string;
};

type UnavailableReportLink = {
  readonly kind: "unavailable_link";
};

function resolveResource(value: string, markdownPath: string): ResolvedResource {
  try {
    const reportUrl = new URL(markdownPath, document.baseURI);
    return { kind: "available", href: new URL(value, reportUrl).href };
  } catch {
    return { kind: "unavailable" };
  }
}

function resolveReportLink(atlas: Atlas, currentReport: Report, href: string | undefined): ResolvedReportLink {
  if (href === undefined) {
    return { kind: "unavailable_link" };
  }
  if (href.startsWith("#")) {
    return { kind: "ordinary_link", href };
  }

  const resolved = resolveResource(href, currentReport.markdownPath);

  if (resolved.kind === "unavailable") {
    return { kind: "unavailable_link" };
  }

  const resolvedUrl = new URL(resolved.href);

  for (const report of atlas.reports) {
    const candidate = resolveResource(report.markdownPath, document.baseURI);

    if (candidate.kind === "available") {
      const candidateUrl = new URL(candidate.href);

      if (candidateUrl.origin === resolvedUrl.origin && candidateUrl.pathname === resolvedUrl.pathname) {
        return { kind: "atlas_report", report };
      }
    }
  }

  return { kind: "ordinary_link", href: resolved.href };
}

function reportRouteHref(route: AtlasRoute, reportId: ReportId): string {
  const parameters = serialiseAtlasRoute({
    view: "report",
    filters: { ...route.filters, report: { kind: "report", reportId } },
  });

  return `?${parameters.toString()}`;
}

type ReportAnchorProps = ComponentPropsWithoutRef<"a"> & {
  readonly atlas: Atlas;
  readonly currentReport: Report;
  readonly onOpenReport: (reportId: ReportId) => void;
  readonly route: AtlasRoute;
};

function ReportAnchor({ atlas, children, currentReport, href, onOpenReport, route, ...anchorProps }: ReportAnchorProps): ReactNode {
  const link = resolveReportLink(atlas, currentReport, href);
  const className = "font-semibold text-sky-800 underline decoration-sky-300 underline-offset-2 hover:text-sky-950 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-950";

  if (link.kind === "unavailable_link") {
    return <span className="text-slate-700">{children}</span>;
  }
  if (link.kind === "ordinary_link") {
    return <a {...anchorProps} className={className} href={link.href}>{children}</a>;
  }

  const openReport = (event: MouseEvent<HTMLAnchorElement>): void => {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
      return;
    }

    event.preventDefault();
    onOpenReport(link.report.reportId);
  };

  return (
    <a {...anchorProps} className={className} href={reportRouteHref(route, link.report.reportId)} onClick={openReport}>
      {children}
    </a>
  );
}

type ReportImageProps = ComponentPropsWithoutRef<"img"> & {
  readonly currentReport: Report;
};

function ReportImage({ alt, currentReport, src, ...imageProps }: ReportImageProps): ReactNode {
  const image = src === undefined ? { kind: "unavailable" } satisfies ResolvedResourceUnavailable : resolveResource(src, currentReport.markdownPath);

  if (image.kind === "unavailable") {
    return <span className="block rounded-lg border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-600">{alt ?? "Report image unavailable"}</span>;
  }

  return <img {...imageProps} alt={alt ?? ""} className="h-auto max-w-full rounded-xl border border-slate-200 bg-white" loading="lazy" src={image.href} />;
}

function ReportTable(props: ComponentPropsWithoutRef<"table">): ReactNode {
  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200">
      <table {...props} className="min-w-full border-collapse text-left text-sm" />
    </div>
  );
}

function reportMarkdownOptions(atlas: Atlas, currentReport: Report, onOpenReport: (reportId: ReportId) => void, route: AtlasRoute): MarkdownToJSX.Options {
  return {
    disableParsingRawHTML: true,
    forceBlock: true,
    overrides: {
      a: { component: ReportAnchor, props: { atlas, currentReport, onOpenReport, route } },
      blockquote: { props: { className: "rounded-r-lg border-l-4 border-sky-300 bg-sky-50 px-4 py-3 text-slate-700" } },
      code: { props: { className: "rounded bg-slate-100 px-1.5 py-0.5 font-mono text-sm text-slate-900" } },
      h1: { props: { className: "text-3xl font-bold tracking-tight text-slate-950" } },
      h2: { props: { className: "border-b border-slate-200 pb-2 pt-4 text-2xl font-bold tracking-tight text-slate-950" } },
      h3: { props: { className: "pt-3 text-xl font-bold text-slate-950" } },
      h4: { props: { className: "pt-2 text-lg font-semibold text-slate-950" } },
      hr: { props: { className: "border-slate-200" } },
      img: { component: ReportImage, props: { currentReport } },
      li: { props: { className: "pl-1 leading-7 text-slate-700" } },
      ol: { props: { className: "list-decimal space-y-1 pl-6" } },
      p: { props: { className: "leading-7 text-slate-700" } },
      pre: { props: { className: "overflow-x-auto rounded-xl bg-slate-950 p-4 font-mono text-sm text-slate-100" } },
      strong: { props: { className: "font-bold text-slate-950" } },
      table: { component: ReportTable },
      td: { props: { className: "border-t border-slate-200 px-3 py-2 align-top text-slate-700" } },
      th: { props: { className: "bg-slate-50 px-3 py-2 font-semibold text-slate-900" } },
      ul: { props: { className: "list-disc space-y-1 pl-6" } },
    },
  };
}

async function loadReportDocument(report: Report, signal: AbortSignal): Promise<string> {
  const response = await fetch(new URL(report.markdownPath, document.baseURI), { signal });

  if (!response.ok) {
    throw new Error(`The report request returned ${response.status}.`);
  }

  return response.text();
}

function failureMessage(error: unknown): string {
  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message;
  }

  return "The report could not be loaded.";
}

function useReportDocument(report: Report): ReportDocumentState {
  const [state, setState] = useState<ReportDocumentState>({ kind: "loading" });

  useEffect(() => {
    const controller = new AbortController();
    setState({ kind: "loading" });

    void loadReportDocument(report, controller.signal)
      .then((markdown) => {
        setState({ kind: "loaded", markdown });
      })
      .catch((error: unknown) => {
        if (!controller.signal.aborted) {
          setState({ kind: "failure", message: failureMessage(error) });
        }
      });

    return () => {
      controller.abort();
    };
  }, [report]);

  return state;
}

export type ReportDocumentPageProps = {
  readonly atlas: Atlas;
  readonly onBackToReports: () => void;
  readonly onOpenReport: (reportId: ReportId) => void;
  readonly report: Report;
  readonly route: AtlasRoute;
};

export function ReportDocumentPage({ atlas, onBackToReports, onOpenReport, report, route }: ReportDocumentPageProps): ReactNode {
  const state = useReportDocument(report);

  return (
    <div className="grid gap-4">
      <button
        className="w-fit rounded-md border border-sky-700 bg-white px-3 py-2 text-sm font-semibold text-sky-900 hover:bg-sky-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-950"
        onClick={onBackToReports}
        type="button"
      >
        Back to reports
      </button>
      <article aria-busy={state.kind === "loading"} aria-label={report.title} className="min-w-0 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-8">
        {state.kind === "loading" ? <p className="text-sm font-medium text-slate-600">Loading {report.title}…</p> : null}
        {state.kind === "failure" ? <p className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-900" role="alert">{state.message}</p> : null}
        {state.kind === "loaded" ? (
          <Markdown className="grid gap-4" options={reportMarkdownOptions(atlas, report, onOpenReport, route)}>
            {state.markdown}
          </Markdown>
        ) : null}
      </article>
    </div>
  );
}
