# Worker integration example

A worker executable receives one task object on stdin and returns one result object on stdout. The executable may call a hosted model, a local model, or pause for human coding. It owns provider authentication and must not print logs to stdout; use stderr for diagnostics.

Run it over a queue:

```bash
chatgpt-analysis-worker \
  --queue workspace/tasks/queues/triage-primary.jsonl \
  --output .agent-workspace/triage-primary-results.jsonl \
  --command './my-model-worker --model MODEL_NAME'

chatgpt-analysis ingest \
  --config analysis.json \
  --input .agent-workspace/triage-primary-results.jsonl
```

Then prepare review, run it with a genuinely independent reviewer/model context, and ingest it:

```bash
chatgpt-analysis prepare --config analysis.json --kind triage --stage review
chatgpt-analysis-worker --queue workspace/tasks/queues/triage-review.jsonl \
  --output .agent-workspace/triage-review-results.jsonl \
  --command './my-model-worker --reviewer independent-b'
chatgpt-analysis ingest --config analysis.json --input .agent-workspace/triage-review-results.jsonl
```

Every result includes `relevance`: triage workers return `empty`, `frequency_only`, or `retain`; signal workers return `null`. Primary/review label and evidence differences are unioned, and hypothesis ratings are retained as a range. Primary-reviewer relevance remains canonical; secondary disagreement is audit/sensitivity metadata. The pipeline does not generate third-review tasks, and every existing accepted third-review output remains audit-only regardless of coverage.

The complete output shape is in [`schemas/model-output.schema.json`](../schemas/model-output.schema.json). Ingestion performs semantic checks beyond that schema, especially task binding, taxonomy membership, evidence scope, and reviewer independence.
