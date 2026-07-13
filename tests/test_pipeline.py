from __future__ import annotations

import contextlib
import json
import shutil
import sqlite3
import tempfile
import unittest
from pathlib import Path

from chatgpt_analysis.config import load_settings
from chatgpt_analysis.pipeline import (
    acceptance_check,
    ingest_results,
    layout,
    prepare_worker_stage,
    reduce_results,
    run_all,
    segment_turns,
)
from chatgpt_analysis.util import read_jsonl

ROOT = Path(__file__).parents[1]
FIXTURE = ROOT / "tests" / "fixtures" / "official_export" / "conversations.json"
TAXONOMY = ROOT / "config" / "taxonomy.example.json"


def make_project(root: Path, routing: bool = False) -> Path:
    source = root / "source"
    source.mkdir()
    shutil.copyfile(FIXTURE, source / "conversations.json")
    shutil.copyfile(TAXONOMY, root / "taxonomy.json")
    config = json.loads((ROOT / "config" / "analysis.example.json").read_text())
    config["source"]["path"] = "./source"
    config["taxonomy"] = "./taxonomy.json"
    config["output"] = "./workspace"
    config["segmentation"] = {"maximum_turns": 2, "maximum_characters": 1000, "overlap_turns": 1}
    config["routing"]["enabled"] = routing
    config["routing"]["always_model"] = routing
    path = root / "analysis.json"
    path.write_text(json.dumps(config))
    return path


class PipelineTests(unittest.TestCase):
    def test_segmentation_is_bounded_and_overlaps(self) -> None:
        turns = [{"turn_id": f"c:{i}", "text": "x" * 5} for i in range(1, 6)]
        segments = segment_turns(turns, 3, 15, 1)
        self.assertEqual([[item["turn_id"] for item in segment] for segment in segments], [["c:1", "c:2", "c:3"], ["c:3", "c:4", "c:5"]])

    def test_end_to_end_local_pipeline_and_rebuildable_index(self) -> None:
        with tempfile.TemporaryDirectory() as temporary:
            config = make_project(Path(temporary))
            settings = load_settings(config)
            result = run_all(settings)
            self.assertTrue(result["acceptance"]["passed"])
            self.assertEqual(result["inventory"]["conversation_count"], 2)
            database = layout(settings)["database"]
            with contextlib.closing(sqlite3.connect(database)) as connection:
                self.assertEqual(connection.execute("SELECT count(*) FROM turns").fetchone()[0], 3)
                self.assertEqual(connection.execute("PRAGMA integrity_check").fetchone()[0], "ok")
            first_hash = database.read_bytes()
            run_all(settings)
            self.assertEqual(first_hash, database.read_bytes())

    def test_invalid_outputs_retry_then_quarantine(self) -> None:
        with tempfile.TemporaryDirectory() as temporary:
            config = make_project(Path(temporary), routing=True)
            settings = load_settings(config)
            run_all(settings)
            queue = layout(settings)["root"] / "tasks" / "queues" / "triage-primary.jsonl"
            task = next(read_jsonl(queue))
            for attempt in (1, 2, 3):
                task["attempt"] = attempt
                invalid = {key: task[key] for key in ("task_id", "attempt", "kind", "stage", "chat_id", "source_hash", "parent_task_ids")}
                path = Path(temporary) / f"invalid-{attempt}.json"
                path.write_text(json.dumps(invalid))
                result = ingest_results(settings, path)
                if attempt < 3:
                    self.assertEqual(result["retried"], 1)
                else:
                    self.assertEqual(result["quarantined"], 1)

    def test_independent_agreement_is_reduced(self) -> None:
        with tempfile.TemporaryDirectory() as temporary:
            config = make_project(Path(temporary), routing=True)
            settings = load_settings(config)
            run_all(settings)
            task = next(read_jsonl(layout(settings)["root"] / "tasks" / "queues" / "triage-primary.jsonl"))

            def result_for(value: dict, reviewer: str) -> dict:
                turn_id = value["scope"]["turn_ids"][0]
                return {
                    "schema_version": "1.0", "task_id": value["task_id"], "kind": value["kind"], "stage": value["stage"], "attempt": value["attempt"],
                    "chat_id": value["chat_id"], "source_hash": value["source_hash"], "parent_task_ids": value["parent_task_ids"],
                    "worker": {"provider": "synthetic", "model": "synthetic", "reviewer_id": reviewer},
                    "labels": [{"dimension": "domains", "label": "writing", "confidence": 0.8, "evidence": [{"turn_id": turn_id, "basis": "observed"}]}],
                    "hypotheses": [], "observations": []
                }

            primary_path = Path(temporary) / "primary.json"
            primary_path.write_text(json.dumps(result_for(task, "reviewer-a")))
            self.assertEqual(ingest_results(settings, primary_path)["accepted"], 1)
            prepare_worker_stage(settings, "triage", "review")
            review_task = next(read_jsonl(layout(settings)["root"] / "tasks" / "queues" / "triage-review.jsonl"))
            review_path = Path(temporary) / "review.json"
            review_path.write_text(json.dumps(result_for(review_task, "reviewer-b")))
            self.assertEqual(ingest_results(settings, review_path)["accepted"], 1)
            reduced = reduce_results(settings)
            self.assertEqual(reduced["selected_model_cards"], 1)

    def test_acceptance_detects_source_mutation(self) -> None:
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            settings = load_settings(make_project(root))
            run_all(settings)
            source = root / "source" / "conversations.json"
            source.write_text(source.read_text() + "\n")
            result = acceptance_check(settings)
            self.assertFalse(result["passed"])
            self.assertTrue(any("immutable source changed" in error for error in result["errors"]))


if __name__ == "__main__":
    unittest.main()
