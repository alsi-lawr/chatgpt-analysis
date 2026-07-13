from __future__ import annotations

import re
from pathlib import Path
from urllib.parse import unquote


ROOT = Path(__file__).parents[1]
README = ROOT / "README.md"
MARKDOWN_LINK = re.compile(r"(?<!!)\[[^\]]+\]\(([^)]+)\)")
HTML_LINK = re.compile(r'<a\s+href="([^"]+)"')
HEADING = re.compile(r"^#{1,6}\s+(.+?)\s*$", re.MULTILINE)


def github_slug(value: str) -> str:
    normalized = value.strip().lower()
    normalized = re.sub(r"[^\w\- ]", "", normalized)
    return re.sub(r"[ -]+", "-", normalized).strip("-")


def markdown_headings(path: Path) -> set[str]:
    return {github_slug(match.group(1)) for match in HEADING.finditer(path.read_text(encoding="utf-8"))}


def validate_links(text: str) -> list[str]:
    issues: list[str] = []
    links = MARKDOWN_LINK.findall(text) + HTML_LINK.findall(text)
    for raw_link in links:
        if raw_link.startswith(("http://", "https://", "mailto:")):
            continue
        path_text, _, anchor = unquote(raw_link).partition("#")
        target = README if not path_text else README.parent / path_text
        if not target.exists():
            issues.append(f"missing link target: {raw_link}")
            continue
        if anchor and target.suffix.lower() in {".md", ".markdown"} and anchor not in markdown_headings(target):
            issues.append(f"missing Markdown anchor: {raw_link}")
    return issues


def main() -> int:
    text = README.read_text(encoding="utf-8")
    issues = validate_links(text)
    if text.count("```") % 2:
        issues.append("unbalanced fenced code blocks")
    if text.count("<details>") != text.count("</details>"):
        issues.append("unbalanced <details> blocks")
    if issues:
        raise SystemExit("\n".join(issues))
    print("README structure and local links: OK")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
