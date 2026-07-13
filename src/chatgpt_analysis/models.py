from __future__ import annotations

from dataclasses import asdict, dataclass, field
from typing import Any


@dataclass(frozen=True)
class Turn:
    turn_id: str
    ordinal: int
    role: str
    text: str
    timestamp: str | None = None
    model: str | None = None
    source_node_id: str | None = None

    def as_dict(self) -> dict[str, Any]:
        return asdict(self)


@dataclass(frozen=True)
class Conversation:
    chat_id: str
    title: str
    created_at: str | None
    updated_at: str | None
    turns: tuple[Turn, ...]
    adapter: str
    source_member: str
    metadata: dict[str, Any] = field(default_factory=dict)

    def as_dict(self) -> dict[str, Any]:
        value = asdict(self)
        value["turns"] = [turn.as_dict() for turn in self.turns]
        return value
