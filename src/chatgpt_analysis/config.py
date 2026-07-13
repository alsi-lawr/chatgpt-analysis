from __future__ import annotations

import json
from dataclasses import dataclass
from pathlib import Path
from typing import Any
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from .errors import AnalysisError
from .util import digest_json


@dataclass(frozen=True)
class Settings:
    path: Path
    raw: dict[str, Any]
    source: Path
    output: Path
    taxonomy_path: Path
    taxonomy: dict[str, Any]
    digest: str


def _resolve(base: Path, value: str) -> Path:
    path = Path(value).expanduser()
    return path if path.is_absolute() else (base / path).resolve()


def load_settings(path: Path) -> Settings:
    path = path.resolve()
    try:
        raw = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as error:
        raise AnalysisError(f"cannot load config {path}: {error}") from error
    if not isinstance(raw, dict):
        raise AnalysisError("config must be a JSON object")
    for key in ("schema_version", "source", "output", "taxonomy", "segmentation", "routing"):
        if key not in raw:
            raise AnalysisError(f"config is missing {key!r}")
    base = path.parent
    source_block = raw["source"]
    if not isinstance(source_block, dict) or not isinstance(source_block.get("path"), str):
        raise AnalysisError("source.path must be a string")
    source = _resolve(base, source_block["path"])
    output = _resolve(base, str(raw["output"]))
    taxonomy_path = _resolve(base, str(raw["taxonomy"]))
    try:
        taxonomy = json.loads(taxonomy_path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as error:
        raise AnalysisError(f"cannot load taxonomy {taxonomy_path}: {error}") from error
    if not isinstance(taxonomy, dict):
        raise AnalysisError("taxonomy must be a JSON object")
    workers = raw.get("workers", {})
    if not isinstance(workers, dict):
        raise AnalysisError("workers must be an object")
    try:
        ZoneInfo(str(raw.get("timezone", "UTC")))
    except ZoneInfoNotFoundError as error:
        raise AnalysisError(f"unknown timezone {raw.get('timezone')!r}") from error
    if source.resolve() == output.resolve() or output.resolve().is_relative_to(source.resolve()):
        raise AnalysisError("output must not be the source path or a child of it")
    digest = digest_json({"config": raw, "taxonomy": taxonomy})
    return Settings(path, raw, source, output, taxonomy_path, taxonomy, digest)
