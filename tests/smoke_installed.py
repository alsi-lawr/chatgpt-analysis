from __future__ import annotations

import json
import subprocess
import tempfile
import zipfile
from pathlib import Path


ROOT = Path(__file__).parents[1]
FIXTURE = ROOT / "tests" / "fixtures" / "official_export" / "conversations.json"


def run(*arguments: str, cwd: Path | None = None) -> subprocess.CompletedProcess[str]:
    return subprocess.run(arguments, cwd=cwd, check=True, capture_output=True, text=True)


def main() -> int:
    self_check = run("chatgpt-analysis", "--version")
    if self_check.stdout.strip() != "0.1.0":
        raise RuntimeError(f"unexpected installed version: {self_check.stdout!r}")
    run("chatgpt-analysis-worker", "--help")
    with tempfile.TemporaryDirectory(prefix="chatgpt-analysis-installed-") as temporary:
        project = Path(temporary) / "analysis"
        run("chatgpt-analysis", "init", str(project))
        with zipfile.ZipFile(project / "export.zip", "w") as archive:
            archive.write(FIXTURE, "nested/conversations.json")
        completed = run("chatgpt-analysis", "run", "--config", "analysis.json", cwd=project)
        result = json.loads(completed.stdout)
        acceptance = json.loads((project / "workspace" / "audits" / "acceptance.json").read_text(encoding="utf-8"))
        if result["inventory"]["conversation_count"] != 2 or not acceptance["passed"]:
            raise RuntimeError("installed end-to-end smoke test did not produce an accepted synthetic workspace")
    print("Installed wheel smoke test: OK")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
