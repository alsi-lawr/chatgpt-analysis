import type { ReactNode } from "react";
import { chronology } from "../domain/aggregations.ts";
import type { Atlas, Chat } from "../domain/atlas.ts";
import { filterChats, filterOccurrences, type AtlasFilters } from "../domain/filters.ts";
import { LineChart, type ChartDatum } from "../components/AccessibleCharts.tsx";
import { humanise } from "../components/Presentation.tsx";

export type ChronologyPageProps = {
  readonly atlas: Atlas;
  readonly filters: AtlasFilters;
};

type MonthlyActivity = {
  month: string;
  chatCount: number;
  occurrenceCount: number;
};

function monthlyActivity(chats: ReadonlyArray<Chat>, atlas: Atlas, filters: AtlasFilters): ReadonlyArray<MonthlyActivity> {
  const days = chronology(chats, filterOccurrences(atlas, filters));
  const months = new Map<string, MonthlyActivity>();

  for (const day of days) {
    const month = day.date.value.slice(0, 7);
    const existing = months.get(month);

    if (existing === undefined) {
      months.set(month, { month, chatCount: day.chatCount.value, occurrenceCount: day.occurrenceCount.value });
      continue;
    }

    existing.chatCount += day.chatCount.value;
    existing.occurrenceCount += day.occurrenceCount.value;
  }

  return [...months.values()].sort((first, second) => first.month.localeCompare(second.month));
}

function occurrenceCounts(atlas: Atlas, filters: AtlasFilters): ReadonlyMap<string, number> {
  const counts = new Map<string, number>();

  for (const occurrence of filterOccurrences(atlas, filters)) {
    const count = counts.get(occurrence.chatId.value);
    counts.set(occurrence.chatId.value, count === undefined ? 1 : count + 1);
  }

  return counts;
}

export function ChronologyPage({ atlas, filters }: ChronologyPageProps): ReactNode {
  const chats = [...filterChats(atlas, filters)].sort((first, second) => first.date.timestamp - second.date.timestamp || first.title.localeCompare(second.title));
  const monthly = monthlyActivity(chats, atlas, filters);
  const monthChart: ReadonlyArray<ChartDatum> = monthly.map((month) => ({
    id: month.month,
    label: month.month,
    value: month.chatCount,
    detail: `${month.occurrenceCount} filtered occurrences`,
  }));
  const counts = occurrenceCounts(atlas, filters);

  return (
    <div className="grid gap-8">
      <section aria-labelledby="chronology-heading">
        <p className="text-sm font-semibold tracking-wide text-sky-800">Chronology</p>
        <h2 className="mt-1 text-3xl font-bold tracking-tight text-slate-950" id="chronology-heading">
          Chat activity over time
        </h2>
        <p className="mt-3 max-w-4xl text-base leading-7 text-slate-700">The timeline uses each chat’s first local-message day and retains only the chats and occurrences matched by the active filters.</p>
      </section>

      <LineChart description="Monthly count of filtered chats. The table alternative includes the corresponding filtered occurrence count." title="Filtered chat activity by month" valueLabel="Chats" values={monthChart} />

      <section aria-labelledby="chronology-table-heading" className="min-w-0 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="text-lg font-bold text-slate-950" id="chronology-table-heading">
          Chronological chat register
        </h3>
        <p className="mt-1 text-sm leading-6 text-slate-600">{chats.length} chats are shown in chronological order.</p>
        <div className="mt-4 overflow-x-auto rounded-xl border border-slate-200">
          <table className="min-w-full border-collapse text-left text-sm">
            <thead className="border-b border-slate-300 bg-slate-50 text-slate-700">
              <tr>
                <th className="px-2 py-2 font-semibold" scope="col">Date</th>
                <th className="px-2 py-2 font-semibold" scope="col">Chat</th>
                <th className="px-2 py-2 font-semibold" scope="col">Period</th>
                <th className="px-2 py-2 font-semibold" scope="col">Topics</th>
                <th className="px-2 py-2 font-semibold" scope="col">Occurrences</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {chats.map((chat) => (
                <tr className="odd:bg-white even:bg-slate-50/50" key={chat.chatId.value}>
                  <td className="whitespace-nowrap px-2 py-2 text-slate-700">{chat.date.value}</td>
                  <th className="min-w-64 max-w-lg px-2 py-2 font-medium text-slate-950" scope="row">{chat.title}</th>
                  <td className="px-2 py-2 text-slate-700">{humanise(chat.period.value)}</td>
                  <td className="min-w-80 max-w-xl px-2 py-2 text-slate-700">{chat.topicIds.map((topicId) => humanise(topicId.value)).join(", ")}</td>
                  <td className="px-2 py-2 text-slate-700">{counts.get(chat.chatId.value) ?? 0}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {chats.length === 0 ? <p className="mt-4 rounded-lg border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-600">No chats match the active filters.</p> : null}
      </section>
    </div>
  );
}
