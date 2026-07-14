import type { ReactNode } from "react";
import { summariseTopics, type TopicSummary } from "../domain/aggregations.ts";
import type { Atlas, Chat, Topic, TopicOccurrence } from "../domain/atlas.ts";
import { filterOccurrences, findTopic, type AtlasFilters } from "../domain/filters.ts";
import { NaturalNumber, type OccurrenceCount, type TopicId } from "../domain/values.ts";
import { OccurrenceEvidence } from "../components/OccurrenceEvidence.tsx";

export type TopicHierarchyPageProps = {
  readonly atlas: Atlas;
  readonly filters: AtlasFilters;
  readonly onBackToAllTopics: () => void;
  readonly onSelectTopic: (topicId: TopicId) => void;
};

type TopicTreeProps = {
  readonly atlas: Atlas;
  readonly topic: Topic;
  readonly summaries: ReadonlyMap<string, TopicSummary>;
  readonly onSelectTopic: (topicId: TopicId) => void;
};

type ChronologicalTopicChat = {
  readonly chat: Chat;
  readonly occurrences: ReadonlyArray<TopicOccurrence>;
};

function directChildren(atlas: Atlas, parent: Topic): ReadonlyArray<Topic> {
  return atlas.topics.filter((topic) => topic.parent.kind === "child" && topic.parent.parentTopicId.value === parent.topicId.value);
}

function topicCount(summaries: ReadonlyMap<string, TopicSummary>, topic: Topic): OccurrenceCount {
  const summary = summaries.get(topic.topicId.value);

  if (summary !== undefined) {
    return summary.occurrenceCount;
  }

  return NaturalNumber.create("occurrence_count", 0);
}

function TopicTree({ atlas, topic, summaries, onSelectTopic }: TopicTreeProps): ReactNode {
  const children = directChildren(atlas, topic);
  const occurrenceCount = topicCount(summaries, topic);
  const node = (
    <div className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-white p-3 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <h3 className="font-semibold text-slate-950">{topic.label}</h3>
        <p className="mt-1 text-sm leading-6 text-slate-700">{topic.description}</p>
        <p className="mt-2 text-xs font-semibold tracking-wide text-slate-500">{occurrenceCount.value} filtered occurrences</p>
      </div>
      <button
        className="shrink-0 rounded-md border border-sky-700 px-3 py-2 text-sm font-semibold text-sky-900 hover:bg-sky-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-950"
        onClick={() => {
          onSelectTopic(topic.topicId);
        }}
        type="button"
      >
        Open topic
      </button>
    </div>
  );

  return (
    <li>
      {node}
      {children.length > 0 ? (
        <ul className="mt-3 grid gap-3 border-l-2 border-slate-200 pl-4">
          {children.map((child) => (
            <TopicTree atlas={atlas} key={child.topicId.value} onSelectTopic={onSelectTopic} summaries={summaries} topic={child} />
          ))}
        </ul>
      ) : null}
    </li>
  );
}

function chronologicalTopicChats(atlas: Atlas, occurrences: ReadonlyArray<TopicOccurrence>): ReadonlyArray<ChronologicalTopicChat> {
  const chatsById = new Map<string, Chat>();

  for (const chat of atlas.chats) {
    chatsById.set(chat.chatId.value, chat);
  }

  const occurrencesByChat = new Map<string, TopicOccurrence[]>();

  for (const occurrence of occurrences) {
    const existing = occurrencesByChat.get(occurrence.chatId.value);

    if (existing === undefined) {
      occurrencesByChat.set(occurrence.chatId.value, [occurrence]);
      continue;
    }

    existing.push(occurrence);
  }

  const chronological: ChronologicalTopicChat[] = [];

  for (const [chatId, chatOccurrences] of occurrencesByChat) {
    const chat = chatsById.get(chatId);

    if (chat !== undefined) {
      chronological.push({ chat, occurrences: [...chatOccurrences].sort((first, second) => first.startTurn.value - second.startTurn.value) });
    }
  }

  return chronological.sort((first, second) => first.chat.date.timestamp - second.chat.date.timestamp || first.chat.title.localeCompare(second.chat.title));
}

type TopicDetailProps = {
  readonly atlas: Atlas;
  readonly onBackToAllTopics: () => void;
  readonly occurrences: ReadonlyArray<TopicOccurrence>;
  readonly topic: Topic;
};

function TopicDetail({ atlas, onBackToAllTopics, occurrences, topic }: TopicDetailProps): ReactNode {
  const timeline = chronologicalTopicChats(atlas, occurrences);

  return (
    <div className="grid gap-4">
      <button
        className="w-fit rounded-md border border-sky-700 bg-white px-3 py-2 text-sm font-semibold text-sky-900 hover:bg-sky-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-950"
        onClick={onBackToAllTopics}
        type="button"
      >
        Back to all topics
      </button>
      <section aria-labelledby="topic-detail-heading" className="grid gap-4 rounded-xl border border-sky-200 bg-sky-50 p-5">
        <div>
          <p className="text-sm font-semibold text-sky-800">Topic page</p>
          <h2 className="mt-1 text-2xl font-bold tracking-tight text-slate-950" id="topic-detail-heading">
            {topic.label}
          </h2>
          <p className="mt-2 max-w-4xl text-sm leading-6 text-slate-700">{topic.description}</p>
        </div>
        <p className="text-sm font-medium text-slate-700">{timeline.length} chronological chats and {occurrences.length} visible topic occurrences</p>
        <ol className="grid gap-4">
          {timeline.map((item) => (
            <li key={item.chat.chatId.value}>
              <article className="rounded-lg border border-slate-200 bg-white p-4">
                <header className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between">
                  <h3 className="font-bold text-slate-950">{item.chat.title}</h3>
                  <p className="text-sm font-medium text-slate-600">{item.chat.date.value} · {item.chat.turnCount.value} turns</p>
                </header>
                <ol className="mt-4 grid gap-3">
                  {item.occurrences.map((occurrence) => (
                    <li className="rounded-md bg-slate-50 p-3" key={occurrence.occurrenceId.value}>
                      <OccurrenceEvidence occurrence={occurrence} />
                    </li>
                  ))}
                </ol>
              </article>
            </li>
          ))}
        </ol>
        {timeline.length === 0 ? <p className="rounded-lg border border-dashed border-slate-300 bg-white p-4 text-sm text-slate-600">No topic occurrences match the current date, context, provenance, and confidence filters.</p> : null}
      </section>
    </div>
  );
}

export function TopicHierarchyPage({ atlas, filters, onBackToAllTopics, onSelectTopic }: TopicHierarchyPageProps): ReactNode {
  const occurrences = filterOccurrences(atlas, filters);

  if (filters.subject.kind === "topic_subject") {
    const topic = findTopic(atlas, filters.subject.topicId);

    if (topic.kind === "found") {
      return <TopicDetail atlas={atlas} onBackToAllTopics={onBackToAllTopics} occurrences={occurrences} topic={topic.value} />;
    }
  }

  const summaryMap = new Map<string, TopicSummary>();

  for (const summary of summariseTopics(atlas, occurrences)) {
    summaryMap.set(summary.topic.topicId.value, summary);
  }

  const roots = atlas.topics.filter((topic) => topic.parent.kind === "root");

  return (
    <div className="grid gap-8">
      <section aria-labelledby="topic-hierarchy-heading">
        <p className="text-sm font-semibold tracking-wide text-sky-800">Topic hierarchy</p>
        <h2 className="mt-1 text-3xl font-bold tracking-tight text-slate-950" id="topic-hierarchy-heading">
          Subjects, subtopics, and their visible evidence
        </h2>
        <p className="mt-3 max-w-4xl text-base leading-7 text-slate-700">Open a topic to apply it as the current subject filter and view its chronological evidence page.</p>
      </section>

      <section aria-label="Topic hierarchy">
        <ul className="grid gap-4">
          {roots.map((topic) => (
            <TopicTree atlas={atlas} key={topic.topicId.value} onSelectTopic={onSelectTopic} summaries={summaryMap} topic={topic} />
          ))}
        </ul>
      </section>
    </div>
  );
}
