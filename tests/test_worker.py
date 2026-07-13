from __future__ import annotations

import json
import sys
import tempfile
import unittest
from pathlib import Path

from chatgpt_analysis.util import read_jsonl, write_jsonl
from chatgpt_analysis.worker import run_queue


class WorkerTests(unittest.TestCase):
    def test_worker_protocol_and_resume(self) -> None:
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            queue = root / "queue.jsonl"
            output = root / "results.jsonl"
            script = root / "worker.py"
            task = {"task_id": "synthetic-task", "attempt": 1, "payload": {"value": "synthetic"}}
            write_jsonl(queue, [task])
            script.write_text(
                "import json,sys\n"
                "task=json.load(sys.stdin)\n"
                "print(json.dumps({'task_id':task['task_id'],'attempt':task['attempt'],'echo':task['payload']['value']}))\n"
            )
            first = run_queue(queue, output, f"{sys.executable} {script}", 10)
            self.assertEqual(first, {"processed": 1, "failed": 0, "skipped": 0})
            self.assertEqual(next(read_jsonl(output))["echo"], "synthetic")
            second = run_queue(queue, output, f"{sys.executable} {script}", 10)
            self.assertEqual(second, {"processed": 0, "failed": 0, "skipped": 1})


if __name__ == "__main__":
    unittest.main()
