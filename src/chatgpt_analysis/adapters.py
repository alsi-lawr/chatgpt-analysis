from __future__ import annotations

import json
import zipfile
from collections.abc import Iterable
from pathlib import Path
from typing import Any

from .errors import AnalysisError
from .models import Conversation, Turn
from .util import digest_json, hash_file, iso_timestamp

VISIBLE_ROLES = {"user", "assistant"}
CONVERSATION_NAMES = ("conversations.json",)


def _message_text(message: dict[str, Any]) -> str:
    content = message.get("content")
    if isinstance(content, str):
        return content
    if not isinstance(content, dict):
        content = {}
    direct = content.get("text")
    if isinstance(direct, str):
        return direct
    parts = content.get("parts")
    if not isinstance(parts, list):
        parts = message.get("parts") if isinstance(message.get("parts"), list) else []
    values: list[str] = []
    for part in parts:
        if isinstance(part, str):
            values.append(part)
        elif isinstance(part, dict):
            for key in ("text", "caption", "transcript"):
                value = part.get(key)
                if isinstance(value, str):
                    values.append(value)
                    break
    return "\n".join(values)


def _message_role(message: dict[str, Any]) -> str | None:
    author = message.get("author")
    if isinstance(author, dict) and isinstance(author.get("role"), str):
        return author["role"]
    role = message.get("role")
    return role if isinstance(role, str) else None


def _message_model(message: dict[str, Any]) -> str | None:
    metadata = message.get("metadata")
    if isinstance(metadata, dict):
        for key in ("model_slug", "default_model_slug", "model"):
            if isinstance(metadata.get(key), str):
                return metadata[key]
    return message.get("model") if isinstance(message.get("model"), str) else None


def _branch_node_ids(record: dict[str, Any]) -> list[str]:
    mapping = record.get("mapping")
    if not isinstance(mapping, dict):
        raise AnalysisError("mapping adapter requires a mapping object")
    current = record.get("current_node")
    if not isinstance(current, str) or current not in mapping:
        parents = {node.get("parent") for node in mapping.values() if isinstance(node, dict)}
        leaves = [key for key in mapping if key not in parents]
        if not leaves:
            return []

        def leaf_key(node_id: str) -> tuple[float, str]:
            node = mapping.get(node_id) or {}
            message = node.get("message") if isinstance(node, dict) else None
            stamp = message.get("create_time") if isinstance(message, dict) else None
            try:
                numeric = float(stamp or 0)
            except (TypeError, ValueError):
                numeric = 0
            return numeric, node_id

        current = max(leaves, key=leaf_key)
    reverse: list[str] = []
    seen: set[str] = set()
    while current:
        if current in seen:
            raise AnalysisError(f"cycle in conversation mapping at {current}")
        seen.add(current)
        node = mapping.get(current)
        if not isinstance(node, dict):
            raise AnalysisError(f"missing mapping node {current}")
        reverse.append(current)
        parent = node.get("parent")
        if parent is not None and not isinstance(parent, str):
            raise AnalysisError(f"mapping node {current} has a non-string parent")
        current = parent
    return list(reversed(reverse))


def _turns_from_mapping(record: dict[str, Any], chat_id: str, roles: set[str]) -> tuple[Turn, ...]:
    mapping = record["mapping"]
    turns: list[Turn] = []
    for node_id in _branch_node_ids(record):
        node = mapping[node_id]
        message = node.get("message")
        if not isinstance(message, dict):
            continue
        role = _message_role(message)
        if role not in roles:
            continue
        text = _message_text(message)
        ordinal = len(turns) + 1
        turns.append(
            Turn(
                turn_id=f"{chat_id}:{ordinal:06d}",
                ordinal=ordinal,
                role=role,
                text=text,
                timestamp=iso_timestamp(message.get("create_time")),
                model=_message_model(message),
                source_node_id=node_id,
            )
        )
    return tuple(turns)


def _turns_from_list(record: dict[str, Any], chat_id: str, roles: set[str]) -> tuple[Turn, ...]:
    messages = record.get("messages") or record.get("turns")
    if not isinstance(messages, list):
        raise AnalysisError("message-list adapter requires messages or turns")
    turns: list[Turn] = []
    for index, item in enumerate(messages):
        if not isinstance(item, dict):
            continue
        role = _message_role(item)
        if role not in roles:
            continue
        text = item.get("text") if isinstance(item.get("text"), str) else _message_text(item)
        ordinal = len(turns) + 1
        source_id = item.get("id") if isinstance(item.get("id"), str) else f"message-{index + 1}"
        turns.append(
            Turn(
                turn_id=f"{chat_id}:{ordinal:06d}",
                ordinal=ordinal,
                role=role,
                text=text,
                timestamp=iso_timestamp(item.get("create_time") or item.get("timestamp")),
                model=_message_model(item),
                source_node_id=source_id,
            )
        )
    return tuple(turns)


def adapt_record(record: dict[str, Any], member: str, roles: set[str]) -> Conversation:
    raw_id = record.get("id") or record.get("conversation_id") or record.get("chat_id")
    if not isinstance(raw_id, str) or not raw_id.strip():
        raw_id = "generated-" + digest_json(record)[:20]
    chat_id = raw_id.strip()
    if isinstance(record.get("mapping"), dict):
        adapter = "openai_mapping_v1"
        turns = _turns_from_mapping(record, chat_id, roles)
    elif isinstance(record.get("messages"), list) or isinstance(record.get("turns"), list):
        adapter = "message_list_v1"
        turns = _turns_from_list(record, chat_id, roles)
    else:
        raise AnalysisError(f"{member}: unsupported conversation shape")
    title = record.get("title") if isinstance(record.get("title"), str) else "Untitled conversation"
    metadata: dict[str, Any] = {}
    if isinstance(record.get("is_archived"), bool):
        metadata["is_archived"] = record["is_archived"]
    if isinstance(record.get("default_model_slug"), str):
        metadata["default_model"] = record["default_model_slug"]
    return Conversation(
        chat_id=chat_id,
        title=title,
        created_at=iso_timestamp(record.get("create_time") or record.get("created_at")),
        updated_at=iso_timestamp(record.get("update_time") or record.get("updated_at")),
        turns=turns,
        adapter=adapter,
        source_member=member,
        metadata=metadata,
    )


def _records_from_value(value: Any, member: str) -> list[dict[str, Any]]:
    if isinstance(value, list):
        records = value
    elif isinstance(value, dict) and isinstance(value.get("conversations"), list):
        records = value["conversations"]
    elif isinstance(value, dict) and any(key in value for key in ("mapping", "messages", "turns")):
        records = [value]
    else:
        raise AnalysisError(f"{member}: expected a conversation array or object")
    if not all(isinstance(record, dict) for record in records):
        raise AnalysisError(f"{member}: every conversation must be an object")
    return list(records)


def _load_json_bytes(data: bytes, member: str) -> list[dict[str, Any]]:
    try:
        return _records_from_value(json.loads(data.decode("utf-8-sig")), member)
    except (UnicodeDecodeError, json.JSONDecodeError) as error:
        raise AnalysisError(f"{member}: invalid UTF-8 JSON: {error}") from error


def discover_source_files(source: Path) -> list[Path]:
    if source.is_file():
        return [source]
    if not source.is_dir():
        raise AnalysisError(f"source does not exist: {source}")
    preferred = source / "conversations.json"
    if preferred.is_file():
        return [preferred]
    split = sorted(source.glob("conversations-*.json"))
    if split:
        return split
    jsonl = sorted(source.glob("conversations*.jsonl"))
    if jsonl:
        return jsonl
    raise AnalysisError(f"no conversations.json, conversations-*.json, or conversations*.jsonl under {source}")


def source_snapshot(source: Path) -> list[dict[str, Any]]:
    return [
        {"path": str(path.resolve()), "size": path.stat().st_size, "sha256": hash_file(path)}
        for path in discover_source_files(source)
    ]


def _iter_records(source: Path) -> Iterable[tuple[str, dict[str, Any]]]:
    for path in discover_source_files(source):
        if zipfile.is_zipfile(path):
            with zipfile.ZipFile(path) as archive:
                names = sorted(
                    name for name in archive.namelist()
                    if Path(name).name == "conversations.json" or Path(name).name.startswith("conversations-") and name.endswith(".json")
                )
                if not names:
                    raise AnalysisError(f"{path}: archive has no supported conversations JSON")
                for name in names:
                    for record in _load_json_bytes(archive.read(name), f"{path}!{name}"):
                        yield f"{path.name}!{name}", record
        elif path.suffix.lower() == ".jsonl":
            with path.open(encoding="utf-8-sig") as handle:
                for line_number, line in enumerate(handle, 1):
                    if line.strip():
                        try:
                            value = json.loads(line)
                        except json.JSONDecodeError as error:
                            raise AnalysisError(f"{path}:{line_number}: invalid JSON: {error}") from error
                        if not isinstance(value, dict):
                            raise AnalysisError(f"{path}:{line_number}: expected an object")
                        yield f"{path.name}:{line_number}", value
        else:
            for record in _load_json_bytes(path.read_bytes(), str(path)):
                yield path.name, record


def load_conversations(source: Path, roles: set[str] | None = None) -> list[Conversation]:
    roles = roles or VISIBLE_ROLES
    conversations: dict[str, Conversation] = {}
    digests: dict[str, str] = {}
    for member, record in _iter_records(source):
        conversation = adapt_record(record, member, roles)
        digest = digest_json(conversation.as_dict())
        if conversation.chat_id in conversations:
            if digests[conversation.chat_id] == digest:
                continue
            raise AnalysisError(f"conflicting duplicate conversation id {conversation.chat_id!r}")
        conversations[conversation.chat_id] = conversation
        digests[conversation.chat_id] = digest
    return [conversations[key] for key in sorted(conversations)]
