import type { ReactNode } from "react";
import { summariseThreads } from "../domain/aggregations.ts";
import type { Atlas, Chat, Thread, TopicOccurrence } from "../domain/atlas.ts";
import { filterOccurrences, findThread, type AtlasFilters } from "../domain/filters.ts";
import type { ThreadId } from "../domain/values.ts";
import { OccurrenceEvidence } from "../components/OccurrenceEvidence.tsx";

export type ThreadsPageProps = {
  readonly atlas: Atlas;
  readonly filters: AtlasFilters;
  readonly onBackToAllThreads: () => void;
  readonly onSelectThread: (threadId: ThreadId) => void;
};

type ThreadOccurrenceRow = {
  readonly chat: Chat;
  readonly occurrence: TopicOccurrence;
};

function chronologicalRows(atlas: Atlas, occurrences: ReadonlyArray<TopicOccurrence>): ReadonlyArray<ThreadOccurrenceRow> {
  const chats = new Map<string, Chat>();

  for (const chat of atlas.chats) {
    chats.set(chat.chatId.value, chat);
  }

  const rows: ThreadOccurrenceRow[] = [];

  for (const occurrence of occurrences) {
    const chat = chats.get(occurrence.chatId.value);

    if (chat !== undefined) {
      rows.push({ chat, occurrence });
    }
  }

  return rows.sort(
    (first, second) =>
      first.chat.date.timestamp - second.chat.date.timestamp || first.occurrence.startTurn.value - second.occurrence.startTurn.value,
  );
}

type ThreadDetailProps = {
  readonly atlas: Atlas;
  readonly onBackToAllThreads: () => void;
  readonly occurrences: ReadonlyArray<TopicOccurrence>;
  readonly thread: Thread;
};

function ThreadDetail({ atlas, onBackToAllThreads, occurrences, thread }: ThreadDetailProps): ReactNode {
  const rows = chronologicalRows(atlas, occurrences);

  return (
    <div className="grid gap-4">
      <button
        className="w-fit rounded-md border border-violet-700 bg-white px-3 py-2 text-sm font-semibold text-violet-900 hover:bg-violet-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-950"
        onClick={onBackToAllThreads}
        type="button"
      >
        Back to all threads
      </button>
      <section aria-labelledby="thread-detail-heading" className="rounded-xl border border-violet-200 bg-violet-50 p-5">
        <p className="text-sm font-semibold text-violet-800">Recurring thread detail</p>
        <h2 className="mt-1 text-2xl font-bold tracking-tight text-slate-950" id="thread-detail-heading">
          {thread.label}
        </h2>
        <p className="mt-2 text-sm leading-6 text-slate-700">{thread.description}</p>
        <p className="mt-3 text-sm font-medium text-slate-700">{rows.length} chronological evidence occurrences match the active filters.</p>
        <ol className="mt-4 grid gap-4">
          {rows.map((row) => (
            <li className="rounded-lg border border-slate-200 bg-white p-4" key={row.occurrence.occurrenceId.value}>
              <header className="mb-3 flex flex-col gap-1 border-b border-slate-100 pb-3 sm:flex-row sm:items-baseline sm:justify-between">
                <h3 className="font-semibold text-slate-950">{row.chat.title}</h3>
                <p className="text-sm text-slate-600">{row.chat.date.value}</p>
              </header>
              <OccurrenceEvidence occurrence={row.occurrence} />
            </li>
          ))}
        </ol>
        {rows.length === 0 ? <p className="mt-4 rounded-lg border border-dashed border-slate-300 bg-white p-4 text-sm text-slate-600">No recurring-thread occurrences match the current filters.</p> : null}
      </section>
    </div>
  );
}

export function ThreadsPage({ atlas, filters, onBackToAllThreads, onSelectThread }: ThreadsPageProps): ReactNode {
  const occurrences = filterOccurrences(atlas, filters);

  if (filters.subject.kind === "thread_subject") {
    const thread = findThread(atlas, filters.subject.threadId);

    if (thread.kind === "found") {
      return <ThreadDetail atlas={atlas} onBackToAllThreads={onBackToAllThreads} occurrences={occurrences} thread={thread.value} />;
    }
  }

  const summaries = summariseThreads(atlas, occurrences);

  return (
    <div className="grid gap-8">
      <section aria-labelledby="threads-heading">
        <p className="text-sm font-semibold tracking-wide text-sky-800">Recurring threads</p>
        <h2 className="mt-1 text-3xl font-bold tracking-tight text-slate-950" id="threads-heading">
          Threads spanning multiple conversations
        </h2>
        <p className="mt-3 max-w-4xl text-base leading-7 text-slate-700">These are curated recurring threads, distinct from the hierarchical topic taxonomy. Their counts respond to the active evidence filters.</p>
      </section>

      <section aria-label="Recurring thread index" className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {summaries.map((summary) => (
          <article className="row-span-5 grid grid-rows-subgrid rounded-xl border border-slate-200 bg-white p-5 shadow-sm" key={summary.thread.threadId.value}>
            <h3 className="text-lg font-bold text-slate-950">{summary.thread.label}</h3>
            <p className="text-sm leading-6 text-slate-700">{summary.thread.description}</p>
            <p className="text-sm font-medium text-slate-700">Aliases: {summary.thread.aliases.join(", ")}</p>
            <dl className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <dt className="text-slate-600">Chats</dt>
                <dd className="font-bold text-slate-950">{summary.chatCount.value}</dd>
              </div>
              <div>
                <dt className="text-slate-600">Occurrences</dt>
                <dd className="font-bold text-slate-950">{summary.occurrenceCount.value}</dd>
              </div>
            </dl>
            <button
              className="self-end rounded-md border border-violet-700 px-3 py-2 text-sm font-semibold text-violet-900 hover:bg-violet-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-950"
              onClick={() => {
                onSelectThread(summary.thread.threadId);
              }}
              type="button"
            >
              Open thread
            </button>
          </article>
        ))}
      </section>
    </div>
  );
}
