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

Then prepare review, run it with a genuinely independent reviewer/model context, ingest, and prepare adjudication:

```bash
chatgpt-analysis prepare --config analysis.json --kind triage --stage review
chatgpt-analysis-worker --queue workspace/tasks/queues/triage-review.jsonl \
  --output .agent-workspace/triage-review-results.jsonl \
  --command './my-model-worker --reviewer independent-b'
chatgpt-analysis ingest --config analysis.json --input .agent-workspace/triage-review-results.jsonl
chatgpt-analysis prepare --config analysis.json --kind triage --stage adjudication
```

The complete output shape is in [`schemas/model-output.schema.json`](../schemas/model-output.schema.json). Ingestion performs semantic checks beyond that schema, especially task binding, taxonomy membership, evidence scope, and reviewer independence.
