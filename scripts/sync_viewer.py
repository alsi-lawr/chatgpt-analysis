from __future__ import annotations

import argparse
import shutil
from pathlib import Path


ROOT = Path(__file__).parents[1]
SOURCE = ROOT / "src" / "chatgpt_analysis" / "viewer"
SOURCE_SCHEMA = ROOT / "schemas" / "viewer-atlas.schema.json"
PRESERVED_DIRECTORIES = {"node_modules", "public"}


def source_files() -> dict[Path, Path]:
    return {
        path.relative_to(SOURCE): path
        for path in SOURCE.rglob("*")
        if path.is_file() and not any(part in PRESERVED_DIRECTORIES for part in path.relative_to(SOURCE).parts)
    }


def target_files(destination: Path) -> dict[Path, Path]:
    if not destination.exists():
        return {}
    return {
        path.relative_to(destination): path
        for path in destination.rglob("*")
        if path.is_file() and not any(part in PRESERVED_DIRECTORIES for part in path.relative_to(destination).parts)
    }


def schema_destination(destination: Path) -> Path:
    return destination.parent / "schemas" / SOURCE_SCHEMA.name


def differences(destination: Path) -> list[str]:
    source = source_files()
    target = target_files(destination)
    missing_or_changed = [f"missing or stale: {relative}" for relative, path in source.items() if relative not in target or path.read_bytes() != target[relative].read_bytes()]
    stale = [f"stale: {relative}" for relative in target if relative not in source]
    schema = schema_destination(destination)
    schema_difference = [] if schema.is_file() and schema.read_bytes() == SOURCE_SCHEMA.read_bytes() else [f"missing or stale schema: {schema}"]
    return sorted([*missing_or_changed, *stale, *schema_difference])


def synchronise(destination: Path) -> list[str]:
    source = source_files()
    target = target_files(destination)
    for relative, path in target.items():
        if relative not in source:
            path.unlink()
    for relative, path in source.items():
        output = destination / relative
        output.parent.mkdir(parents=True, exist_ok=True)
        shutil.copyfile(path, output)
    schema = schema_destination(destination)
    schema.parent.mkdir(parents=True, exist_ok=True)
    shutil.copyfile(SOURCE_SCHEMA, schema)
    return differences(destination)


def main() -> int:
    parser = argparse.ArgumentParser(description="Synchronise the canonical viewer source into a generated-project mirror.")
    parser.add_argument("--destination", type=Path, required=True)
    parser.add_argument("--check", action="store_true")
    arguments = parser.parse_args()
    destination = arguments.destination.resolve()
    if destination == SOURCE.resolve():
        parser.error("destination must not be the canonical viewer source")
    if arguments.check:
        changed = differences(destination)
    else:
        changed = synchronise(destination)
    if changed:
        print("\n".join(changed))
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
