# Architecture and data contracts

## Trust boundaries

The configured source is immutable input. Pipeline code opens it only for reading and rejects an output directory nested under a source directory. A source snapshot records absolute file names, sizes, and SHA-256 digests; `accept` rehashes those files. Derived work is disposable and rebuildable.

Transcript text is data, not worker instruction. Every generated task repeats that boundary and exposes stable turn IDs. Model output cannot cite turns outside its assigned scope.

## Adapters

`auto` discovery supports:

1. an OpenAI export ZIP containing `conversations.json` or split `conversations-*.json` members;
2. a JSON file containing the usual conversation array, `{ "conversations": [...] }`, or one conversation;
3. a directory containing `conversations.json`, split `conversations-*.json`, or `conversations*.jsonl`;
4. canonical/message-list records with `messages` or `turns` arrays.

For mapping records, the adapter follows `current_node` through parent links. If `current_node` is absent, it deterministically selects the leaf with the latest message timestamp, then node ID. Only configured visible roles are normalized. Text extraction handles string parts and common text/caption/transcript fields. Binary attachments, canvas state, shared links, reactions, deleted branches, and account metadata are not analyzed.

## Local stages

`inventory` normalizes conversations and turns, assigns stable turn IDs, and hashes visible transcripts. `metrics` computes corpus-independent counts and distributions. `segments` creates bounded overlapping windows. `analyze-local` applies configured patterns for triage, event signals, sensitivities, and hypotheses, then emits model queues only when routing rules require them.

`reduce` always begins with deterministic cards. Validated model cards are promoted only after adjudication or independent agreement when `require_independent_review` is true. Disagreements remain unresolved until adjudicated. `build-index` recreates SQLite from JSON/JSONL and enables FTS5 when the runtime SQLite supports it. Reports state computed coverage, configured coding counts, worker status, and limitations.

## Worker protocol

`chatgpt-analysis-worker` is provider-neutral. It launches an executable without a shell, writes one task JSON object to stdin, and expects one model-result JSON object on stdout. This keeps API credentials, network operation, model selection, and provider dependencies outside deterministic local analysis.

Each model result binds to `task_id` plus `attempt`, source hash, kind, stage, chat, parent IDs, and a reviewer identity. Ingestion validates taxonomy membership, confidence/rating ranges, evidence scope, source binding, and reviewer independence. Invalid work is retried up to `workers.max_attempts`; exhausted or unbound output is quarantined.

## Review and reduction order

1. primary triage/signal coding;
2. independent review by a distinct `reviewer_id`;
3. adjudication only when label or hypothesis-rating sets disagree;
4. deterministic reducers choose adjudicated, then independently agreed outputs;
5. unresolved or unreviewed cards are excluded when review is required.

## Assumptions

- Export shapes are not a stable public schema; unsupported records fail visibly rather than being guessed through.
- Timestamps may be missing or malformed. Such chats receive `unknown_date` and remain in coverage.
- The selected branch is the export's `current_node` branch where present.
- Pattern hits are routing/coding aids, not validated psychological or causal conclusions.
- Periods may overlap intentionally, so one conversation can count in multiple configured periods.
- FTS indexes transcript text locally; protect the output directory as sensitive data.
