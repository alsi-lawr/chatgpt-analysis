from __future__ import annotations

import datetime as dt
import hashlib
import json
import os
import re
import tempfile
from pathlib import Path
from typing import Any, Iterable, Iterator

from .errors import AnalysisError

WORD_RE = re.compile(r"[^\W_]+(?:[’'-][^\W_]+)*", re.UNICODE)


def canonical_json(value: Any) -> str:
    return json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(",", ":"))


def digest_json(value: Any) -> str:
    return hashlib.sha256(canonical_json(value).encode()).hexdigest()


def hash_bytes(value: bytes) -> str:
    return hashlib.sha256(value).hexdigest()


def hash_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def atomic_write_text(path: Path, text: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    descriptor, temporary = tempfile.mkstemp(prefix=f".{path.name}.", dir=path.parent)
    try:
        with os.fdopen(descriptor, "w", encoding="utf-8", newline="\n") as handle:
            handle.write(text)
            handle.flush()
            os.fsync(handle.fileno())
        os.replace(temporary, path)
    except BaseException:
        try:
            os.unlink(temporary)
        except FileNotFoundError:
            pass
        raise


def write_json(path: Path, value: Any) -> None:
    atomic_write_text(path, json.dumps(value, ensure_ascii=False, sort_keys=True, indent=2) + "\n")


def write_jsonl(path: Path, records: Iterable[dict[str, Any]]) -> None:
    atomic_write_text(path, "".join(canonical_json(record) + "\n" for record in records))


def read_json(path: Path) -> Any:
    try:
        with path.open(encoding="utf-8") as handle:
            return json.load(handle)
    except (OSError, json.JSONDecodeError) as error:
        raise AnalysisError(f"cannot read JSON {path}: {error}") from error


def read_jsonl(path: Path) -> Iterator[dict[str, Any]]:
    try:
        with path.open(encoding="utf-8") as handle:
            for line_number, line in enumerate(handle, 1):
                if not line.strip():
                    continue
                value = json.loads(line)
                if not isinstance(value, dict):
                    raise AnalysisError(f"{path}:{line_number}: expected an object")
                yield value
    except (OSError, json.JSONDecodeError) as error:
        raise AnalysisError(f"cannot read JSONL {path}: {error}") from error


def parse_timestamp(value: Any) -> dt.datetime | None:
    if value is None or value == "":
        return None
    try:
        if isinstance(value, (int, float)):
            return dt.datetime.fromtimestamp(float(value), tz=dt.UTC)
        text = str(value).strip().replace("Z", "+00:00")
        result = dt.datetime.fromisoformat(text)
        if result.tzinfo is None:
            result = result.replace(tzinfo=dt.UTC)
        return result.astimezone(dt.UTC)
    except (ValueError, OverflowError, OSError):
        return None


def iso_timestamp(value: Any) -> str | None:
    parsed = parse_timestamp(value)
    return parsed.isoformat().replace("+00:00", "Z") if parsed else None


def count_words(text: str) -> int:
    return len(WORD_RE.findall(text))


def safe_identifier(value: str, fallback: str = "item") -> str:
    cleaned = re.sub(r"[^a-zA-Z0-9._-]+", "-", value).strip("-.")
    return cleaned[:120] or fallback


def percentile(values: list[int], proportion: float) -> int | None:
    if not values:
        return None
    ordered = sorted(values)
    index = max(0, min(len(ordered) - 1, int((len(ordered) * proportion + 0.999999) - 1)))
    return ordered[index]


def distribution(values: list[int]) -> dict[str, int | float | None]:
    if not values:
        return {"count": 0, "min": None, "max": None, "mean": None, "p50": None, "p90": None}
    return {
        "count": len(values),
        "min": min(values),
        "max": max(values),
        "mean": round(sum(values) / len(values), 3),
        "p50": percentile(values, 0.5),
        "p90": percentile(values, 0.9),
    }
