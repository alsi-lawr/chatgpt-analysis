from __future__ import annotations

import json
import tempfile
import unittest
import zipfile
from pathlib import Path

from chatgpt_analysis.adapters import load_conversations

FIXTURE = Path(__file__).parent / "fixtures" / "official_export" / "conversations.json"


class AdapterTests(unittest.TestCase):
    def test_mapping_adapter_uses_current_branch_and_multimodal_text(self) -> None:
        conversations = load_conversations(FIXTURE)
        chat = next(item for item in conversations if item.chat_id == "synthetic-chat-1")
        self.assertEqual([turn.role for turn in chat.turns], ["user", "assistant", "user"])
        self.assertIn("cite a source", chat.turns[-1].text)
        self.assertNotIn("alternate branch", "\n".join(turn.text for turn in chat.turns))

    def test_zip_and_wrapped_message_list_adapters(self) -> None:
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            archive = root / "export.zip"
            with zipfile.ZipFile(archive, "w") as handle:
                handle.write(FIXTURE, "nested/conversations.json")
            self.assertEqual(len(load_conversations(archive)), 2)
            wrapped = root / "wrapped.json"
            wrapped.write_text(json.dumps({"conversations": [{"id": "list-chat", "title": "List", "messages": [{"id": "m1", "role": "user", "text": "Synthetic message"}]}]}))
            result = load_conversations(wrapped)
            self.assertEqual(result[0].adapter, "message_list_v1")
            self.assertEqual(result[0].turns[0].text, "Synthetic message")


if __name__ == "__main__":
    unittest.main()
