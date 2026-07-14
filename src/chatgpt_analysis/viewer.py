from __future__ import annotations

import os
import re
import shutil
import tempfile
from pathlib import Path
from typing import Any

from .config import Settings
from .errors import AnalysisError
from .util import digest_json, iso_timestamp, read_json, read_jsonl, safe_identifier, write_json


REPORT_RESOURCE = re.compile(r"!?\[[^\]]*\]\(([^)]+)\)")


def viewer_schema_version() -> str:
    schema_path = Path(__file__).parent / "templates" / "schemas" / "viewer-atlas.schema.json"
    schema = read_json(schema_path)
    version = schema.get("properties", {}).get("schema_version", {}).get("const")
    if not isinstance(version, str) or not version:
        raise AnalysisError(f"viewer schema has no schema_version constant: {schema_path}")
    return version


def _viewer_metadata(settings: Settings) -> dict[str, str]:
    raw = settings.raw.get("viewer", {})
    if not isinstance(raw, dict):
        raise AnalysisError("viewer configuration must be an object")

    defaults = {
        "title": "ChatGPT export analysis",
        "description": "Evidence-linked static summary of a user-supplied ChatGPT export.",
        "privacy_notice": "Conversation titles and transcript excerpts are intentionally omitted from this generated viewer bundle.",
    }
    metadata: dict[str, str] = {}
    for key, default in defaults.items():
        value = raw.get(key, default)
        if not isinstance(value, str) or not value.strip():
            raise AnalysisError(f"viewer.{key} must be non-empty text")
        metadata[key] = value
    return metadata


def _copy_file(source: Path, destination: Path) -> None:
    destination.parent.mkdir(parents=True, exist_ok=True)
    descriptor, temporary_name = tempfile.mkstemp(prefix=f".{destination.name}.", dir=destination.parent)
    temporary = Path(temporary_name)
    try:
        with os.fdopen(descriptor, "wb") as handle, source.open("rb") as input_handle:
            shutil.copyfileobj(input_handle, handle)
            handle.flush()
            os.fsync(handle.fileno())
        os.replace(temporary, destination)
    except BaseException:
        temporary.unlink(missing_ok=True)
        raise


def _copy_viewer_source(destination: Path) -> None:
    source = Path(__file__).parent / "viewer"
    if not source.is_dir():
        raise AnalysisError(f"packaged viewer source is absent: {source}")
    if destination.resolve() == source.resolve():
        raise AnalysisError("viewer output cannot replace the packaged viewer source")

    shutil.rmtree(destination, ignore_errors=True)
    shutil.copytree(source, destination, ignore=shutil.ignore_patterns("node_modules", "public", "site", "__pycache__"))
    (destination / "public").mkdir(parents=True, exist_ok=True)


def _report_resources(markdown: str, source: Path) -> list[tuple[Path, Path]]:
    source_root = source.parent.resolve()
    resources: list[tuple[Path, Path]] = []
    seen: set[Path] = set()
    for match in REPORT_RESOURCE.finditer(markdown):
        target = match.group(1).strip().strip("<>").split(maxsplit=1)[0]
        if not target or target.startswith(("#", "//", "data:", "http:", "https:", "mailto:")):
            continue
        local_target = target.split("#", maxsplit=1)[0].split("?", maxsplit=1)[0]
        resolved = (source_root / local_target).resolve()
        if not resolved.is_relative_to(source_root):
            raise AnalysisError(f"report resource escapes the report directory: {target}")
        if not resolved.is_file():
            raise AnalysisError(f"referenced report resource is absent: {resolved}")
        if resolved not in seen:
            resources.append((resolved, resolved.relative_to(source_root)))
            seen.add(resolved)
    return resources


def _label_topic_id(dimension: str, label: str) -> str:
    return f"topic-{safe_identifier(dimension)}-{digest_json([dimension, label])[:12]}"


def _period_value(conversation: dict[str, Any]) -> str:
    periods = conversation.get("periods")
    if not isinstance(periods, list) or not all(isinstance(value, str) and value.strip() for value in periods):
        return "not_defined"
    return " / ".join(periods) if periods else "not_defined"


def _evidence_turns(label: dict[str, Any], ordinals: dict[str, int]) -> list[tuple[int, str]]:
    evidence = label.get("evidence")
    if not isinstance(evidence, list):
        return []
    values: list[tuple[int, str]] = []
    for item in evidence:
        if not isinstance(item, dict):
            continue
        turn_id = item.get("turn_id")
        basis = item.get("basis")
        if isinstance(turn_id, str) and isinstance(basis, str) and basis and turn_id in ordinals:
            values.append((ordinals[turn_id], basis))
    return sorted(set(values))


def generate_viewer_bundle(settings: Settings) -> dict[str, Any]:
    """Create a fresh, build-ready static viewer bundle from completed pipeline artifacts."""

    root = settings.output / "viewer"
    report_source = settings.output / "reports" / "summary.md"
    report_summary = settings.output / "reports" / "summary.json"
    reduced_source = settings.output / "reduced" / "conversations.jsonl"
    conversations_source = settings.output / "normalized" / "conversations.jsonl"
    turns_source = settings.output / "normalized" / "turns.jsonl"
    required = (report_source, report_summary, reduced_source, conversations_source, turns_source)
    missing = [str(path) for path in required if not path.is_file()]
    if missing:
        raise AnalysisError(f"viewer generation requires completed report and normalized artifacts: {', '.join(missing)}")

    metadata = _viewer_metadata(settings)
    summary = read_json(report_summary)
    if not isinstance(summary, dict):
        raise AnalysisError(f"report summary must be an object: {report_summary}")
    limitations = summary.get("limitations")
    if not isinstance(limitations, list) or not all(isinstance(value, str) and value.strip() for value in limitations):
        raise AnalysisError(f"report summary has invalid limitations: {report_summary}")

    reduced_by_chat = {item["chat_id"]: item for item in read_jsonl(reduced_source) if isinstance(item.get("chat_id"), str)}
    ordinals_by_chat: dict[str, dict[str, int]] = {}
    for turn in read_jsonl(turns_source):
        chat_id = turn.get("chat_id")
        turn_id = turn.get("turn_id")
        ordinal = turn.get("ordinal")
        if isinstance(chat_id, str) and isinstance(turn_id, str) and isinstance(ordinal, int) and ordinal > 0:
            ordinals_by_chat.setdefault(chat_id, {})[turn_id] = ordinal

    topics: dict[str, dict[str, Any]] = {}
    chats: list[dict[str, Any]] = []
    occurrences: list[dict[str, Any]] = []
    undated_count = 0
    for position, conversation in enumerate(read_jsonl(conversations_source), start=1):
        chat_id = conversation.get("chat_id")
        turn_count = conversation.get("turn_count")
        created_at = iso_timestamp(conversation.get("created_at"))
        reduced = reduced_by_chat.get(chat_id) if isinstance(chat_id, str) else None
        if not isinstance(chat_id, str) or not isinstance(turn_count, int) or turn_count < 1 or not isinstance(reduced, dict):
            continue
        if created_at is None:
            undated_count += 1
            continue
        relevance = reduced.get("relevance")
        if not isinstance(relevance, str) or not relevance:
            raise AnalysisError(f"reduced card has invalid relevance: {chat_id}")
        labels = reduced.get("labels")
        if not isinstance(labels, list):
            raise AnalysisError(f"reduced card has invalid labels: {chat_id}")

        chat_topic_ids: set[str] = set()
        domains: set[str] = set()
        modes: set[str] = set()
        ordinals = ordinals_by_chat.get(chat_id, {})
        for label in labels:
            if not isinstance(label, dict):
                continue
            dimension = label.get("dimension")
            label_value = label.get("label")
            confidence = label.get("confidence")
            if not isinstance(dimension, str) or not dimension or not isinstance(label_value, str) or not label_value:
                raise AnalysisError(f"reduced card has an invalid label: {chat_id}")
            if not isinstance(confidence, (int, float)) or isinstance(confidence, bool) or not 0 <= float(confidence) <= 1:
                raise AnalysisError(f"reduced card has an invalid label confidence: {chat_id}")
            evidence = _evidence_turns(label, ordinals)
            if not evidence:
                continue
            topic_id = _label_topic_id(dimension, label_value)
            topics.setdefault(
                topic_id,
                {
                    "topic_id": topic_id,
                    "label": label_value,
                    "description": f"Configured {dimension} taxonomy label.",
                    "parent_topic_id": None,
                },
            )
            chat_topic_ids.add(topic_id)
            if dimension == "domains":
                domains.add(label_value)
            if dimension == "modes":
                modes.add(label_value)
            start_turn = evidence[0][0]
            end_turn = evidence[-1][0]
            provenance = evidence[0][1]
            occurrence_id = f"occurrence-{safe_identifier(chat_id)}-{digest_json([chat_id, topic_id, start_turn, end_turn])[:12]}"
            occurrences.append(
                {
                    "occurrence_id": occurrence_id,
                    "chat_id": chat_id,
                    "topic_id": topic_id,
                    "thread_ids": [],
                    "start_turn": start_turn,
                    "end_turn": end_turn,
                    "centrality": "not_assessed",
                    "stance": "not_assessed",
                    "provenance": provenance,
                    "confidence": float(confidence),
                    "source_kind": "reduced_card",
                    "sensitivity_state": "permitted",
                    "summary": "No narrative summary was generated for this configured label.",
                    "excerpts": [],
                }
            )
        chats.append(
            {
                "chat_id": chat_id,
                "title": f"Conversation {position}",
                "date": created_at[:10],
                "period": _period_value(conversation),
                "tier": relevance,
                "turn_count": turn_count,
                "domains": sorted(domains),
                "modes": sorted(modes),
                "topic_ids": sorted(chat_topic_ids),
                "thread_ids": [],
            }
        )

    _copy_viewer_source(root)
    reports_root = root / "public" / "reports"
    markdown = report_source.read_text(encoding="utf-8")
    copied_report = reports_root / "summary.md"
    _copy_file(report_source, copied_report)
    for resource, relative_path in _report_resources(markdown, report_source):
        _copy_file(resource, reports_root / relative_path)

    atlas = {
        "schema_version": viewer_schema_version(),
        "metadata": {
            "title": metadata["title"],
            "description": metadata["description"],
            "generated_from": "normalized, reduced, and report artifacts from chatgpt-analysis",
            "privacy_notice": metadata["privacy_notice"],
        },
        "coverage": {
            "chat_count": len(chats),
            "claim_count": 0,
            "topic_occurrence_count": len(occurrences),
        },
        "reports": [
            {
                "report_id": "summary",
                "title": "Analysis summary",
                "description": "Computed coverage, configured labels, hypotheses, worker status, and interpretation limits.",
                "profiles": [],
                "markdown_path": "reports/summary.md",
            }
        ],
        "topics": [topics[key] for key in sorted(topics)],
        "threads": [],
        "chats": chats,
        "occurrences": occurrences,
        "aggregates": [],
        "rolling": [],
        "architecture_episodes": [],
        "claims": [],
        "limits": [
            *limitations,
            "The generic viewer intentionally omits conversation titles and transcript excerpts.",
            *([f"{undated_count} non-empty conversation(s) without a usable date are omitted from chronological viewer data."] if undated_count else []),
        ],
    }
    atlas_path = root / "public" / "data" / "atlas.json"
    write_json(atlas_path, atlas)
    return {
        "root": str(root),
        "atlas": str(atlas_path),
        "report": str(copied_report),
        "schema_version": atlas["schema_version"],
        "chat_count": len(chats),
        "occurrence_count": len(occurrences),
        "atlas_sha256": digest_json(atlas),
    }
