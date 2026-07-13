from __future__ import annotations

import argparse
import json
import shlex
import subprocess
import sys
from pathlib import Path
from typing import Any

from .errors import AnalysisError
from .util import canonical_json, read_jsonl


def run_queue(queue: Path, output: Path, command: str, timeout: float, limit: int | None = None) -> dict[str, int]:
    tasks = list(read_jsonl(queue))
    completed: set[tuple[str, int]] = set()
    if output.exists():
        completed = {(item.get("task_id"), item.get("attempt")) for item in read_jsonl(output)}
    arguments = shlex.split(command)
    if not arguments:
        raise AnalysisError("worker command cannot be empty")
    processed = failed = skipped = 0
    output.parent.mkdir(parents=True, exist_ok=True)
    with output.open("a", encoding="utf-8", newline="\n") as handle:
        for task in tasks:
            key = (task["task_id"], task["attempt"])
            if key in completed:
                skipped += 1
                continue
            if limit is not None and processed >= limit:
                break
            try:
                process = subprocess.run(
                    arguments,
                    input=canonical_json(task),
                    text=True,
                    capture_output=True,
                    timeout=timeout,
                    check=False,
                )
                if process.returncode != 0:
                    raise AnalysisError(f"worker exited {process.returncode}: {process.stderr[-1000:]}")
                result: Any = json.loads(process.stdout)
                if not isinstance(result, dict):
                    raise AnalysisError("worker stdout was not a JSON object")
            except (OSError, subprocess.SubprocessError, json.JSONDecodeError, AnalysisError) as error:
                result = {
                    "task_id": task["task_id"],
                    "attempt": task["attempt"],
                    "kind": task["kind"],
                    "stage": task["stage"],
                    "chat_id": task["chat_id"],
                    "source_hash": task["source_hash"],
                    "parent_task_ids": task["parent_task_ids"],
                    "_worker_error": str(error),
                }
                failed += 1
            handle.write(canonical_json(result) + "\n")
            handle.flush()
            processed += 1
    return {"processed": processed, "failed": failed, "skipped": skipped}


def parser() -> argparse.ArgumentParser:
    value = argparse.ArgumentParser(description="Run a provider-neutral JSON worker command over a task queue")
    value.add_argument("--queue", type=Path, required=True)
    value.add_argument("--output", type=Path, required=True)
    value.add_argument("--command", required=True, help="Executable command; receives one task as JSON on stdin and must return one result as JSON on stdout")
    value.add_argument("--timeout", type=float, default=300)
    value.add_argument("--limit", type=int)
    return value


def main(argv: list[str] | None = None) -> int:
    try:
        args = parser().parse_args(argv)
        print(json.dumps(run_queue(args.queue, args.output, args.command, args.timeout, args.limit), sort_keys=True))
        return 0
    except (AnalysisError, OSError, ValueError) as error:
        print(f"error: {error}", file=sys.stderr)
        return 2


if __name__ == "__main__":
    raise SystemExit(main())
