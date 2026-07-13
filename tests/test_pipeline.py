from __future__ import annotations

import contextlib
import json
import shutil
import sqlite3
import tempfile
import unittest
from pathlib import Path

from chatgpt_analysis.config import load_settings
from chatgpt_analysis.errors import AnalysisError
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

    def test_review_consolidation_and_legacy_third_is_audit_only(self) -> None:
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            config = make_project(root, routing=True)
            taxonomy_path = root / "taxonomy.json"
            taxonomy = json.loads(taxonomy_path.read_text())
            taxonomy["dimensions"]["sensitivities"] = [
                {"id": "reviewer_only", "keywords": [], "regex": []},
                {"id": "third_only", "keywords": [], "regex": []},
            ]
            taxonomy["hypotheses"] = [{"id": "synthetic_hypothesis", "keywords": [], "regex": [], "counter_keywords": [], "counter_regex": []}]
            taxonomy_path.write_text(json.dumps(taxonomy))
            settings = load_settings(config)
            run_all(settings)
            tasks = [
                task for task in read_jsonl(layout(settings)["root"] / "tasks" / "queues" / "triage-primary.jsonl")
                if task["chat_id"] == "synthetic-chat-1"
            ]
            primary_task = max(tasks, key=lambda task: len(task["scope"]["turn_ids"]))
            first_turn, last_turn = primary_task["scope"]["turn_ids"][0], primary_task["scope"]["turn_ids"][-1]

            def result_for(task: dict, reviewer: str, relevance: str, rating: int, labels: list[tuple[str, str, str]]) -> dict:
                return {
                    "schema_version": "1.0", "task_id": task["task_id"], "kind": task["kind"], "stage": task["stage"], "attempt": task["attempt"],
                    "chat_id": task["chat_id"], "source_hash": task["source_hash"], "parent_task_ids": task["parent_task_ids"],
                    "worker": {"provider": "synthetic", "model": "synthetic", "reviewer_id": reviewer},
                    "relevance": relevance,
                    "labels": [
                        {"dimension": dimension, "label": label, "confidence": 0.8, "evidence": [{"turn_id": turn_id, "basis": "observed"}]}
                        for dimension, label, turn_id in labels
                    ],
                    "hypotheses": [{
                        "id": "synthetic_hypothesis", "rating": rating, "summary": "synthetic",
                        "evidence": [{"turn_id": first_turn, "basis": "observed"}], "counterevidence": [],
                    }],
                    "observations": [],
                }

            primary = result_for(
                primary_task, "reviewer-a", "frequency_only", 1,
                [("domains", "writing", first_turn), ("sensitivities", "reviewer_only", first_turn)],
            )
            primary_path = root / "primary.json"
            primary_path.write_text(json.dumps(primary))
            self.assertEqual(ingest_results(settings, primary_path)["accepted"], 1)

            prepare_worker_stage(settings, "triage", "review")
            review_task = next(
                task for task in read_jsonl(layout(settings)["root"] / "tasks" / "queues" / "triage-review.jsonl")
                if task["parent_task_ids"] == [primary_task["task_id"]]
            )
            review = result_for(
                review_task, "reviewer-b", "retain", 3,
                [("modes", "question_answer", last_turn), ("signals", "revision_request", last_turn), ("sensitivities", "reviewer_only", last_turn)],
            )
            review_path = root / "review.json"
            review_path.write_text(json.dumps(review))
            self.assertEqual(ingest_results(settings, review_path)["accepted"], 1)
            with self.assertRaisesRegex(AnalysisError, "stage review"):
                prepare_worker_stage(settings, "triage", "adjudication")

            reduce_results(settings)
            before = next(item for item in read_jsonl(layout(settings)["reduced"]) if item["chat_id"] == primary_task["chat_id"])
            self.assertEqual(before["macro_weight"], 1)
            self.assertEqual(before["relevance"], "frequency_only")
            self.assertEqual(
                before["review_audit"]["relevance_pairs"],
                [{
                    "primary_task_id": primary_task["task_id"], "primary_value": "frequency_only",
                    "secondary_task_id": review_task["task_id"], "secondary_value": "retain", "disagreement": True,
                }],
            )
            self.assertEqual(before["hypotheses"][0]["rating_range"], {"minimum": 1, "maximum": 3})
            label_keys = {(item["dimension"], item["label"]) for item in before["labels"]}
            self.assertTrue({("domains", "writing"), ("modes", "question_answer"), ("sensitivities", "reviewer_only"), ("signals", "revision_request")} <= label_keys)
            self.assertIn("revision_request", {item["label"] for item in before["events"]})
            sensitivity = next(item for item in before["labels"] if (item["dimension"], item["label"]) == ("sensitivities", "reviewer_only"))
            self.assertEqual({item["turn_id"] for item in sensitivity["evidence"]}, {first_turn, last_turn})

            third = result_for(review_task, "reviewer-c", "retain", 0, [("sensitivities", "third_only", last_turn)])
            third.update(task_id="legacy-third", stage="adjudication", parent_task_ids=[primary_task["task_id"], review_task["task_id"]])
            legacy_dir = layout(settings)["root"] / "results" / "accepted" / "triage" / "adjudication"
            legacy_dir.mkdir(parents=True)
            (legacy_dir / "legacy-third.json").write_text(json.dumps(third))

            reduced = reduce_results(settings)
            after = next(item for item in read_jsonl(layout(settings)["reduced"]) if item["chat_id"] == primary_task["chat_id"])
            for key in ("macro_weight", "relevance", "labels", "hypotheses", "events", "observations"):
                self.assertEqual(after[key], before[key])
            self.assertEqual(after["review_audit"]["third_reviews_audit_only"], ["legacy-third"])
            self.assertEqual(reduced["review_audit"], {"third_reviews_audit_only": 1})

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
