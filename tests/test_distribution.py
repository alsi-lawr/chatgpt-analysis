from __future__ import annotations

import tomllib
import unittest
from importlib import resources
from pathlib import Path

import chatgpt_analysis


ROOT = Path(__file__).parents[1]


class DistributionTests(unittest.TestCase):
    def test_package_version_matches_project_metadata(self) -> None:
        metadata = tomllib.loads((ROOT / "pyproject.toml").read_text(encoding="utf-8"))
        self.assertEqual(chatgpt_analysis.__version__, metadata["project"]["version"])

    def test_public_metadata_uses_pseudonymous_owner(self) -> None:
        project = tomllib.loads((ROOT / "pyproject.toml").read_text(encoding="utf-8"))["project"]
        self.assertEqual(project["authors"], [{"name": "alsi-lawr"}])
        self.assertEqual(project["license"], "MIT")
        self.assertEqual(project["dependencies"], [])
        self.assertEqual(project["urls"]["Repository"], "https://github.com/alsi-lawr/chatgpt-analysis.git")

    def test_reference_files_match_packaged_templates(self) -> None:
        pairs = [
            ("config/analysis.example.json", "templates/analysis.json"),
            ("config/taxonomy.example.json", "templates/taxonomy.json"),
            *((f"prompts/{name}", f"templates/prompts/{name}") for name in ("adjudication.md", "reducer.md", "review.md", "signals.md", "triage.md")),
            *((f"schemas/{name}", f"templates/schemas/{name}") for name in ("model-output.schema.json", "task.schema.json")),
        ]
        package_root = resources.files("chatgpt_analysis")
        for reference, packaged in pairs:
            with self.subTest(reference=reference):
                self.assertEqual((ROOT / reference).read_bytes(), package_root.joinpath(packaged).read_bytes())


if __name__ == "__main__":
    unittest.main()
