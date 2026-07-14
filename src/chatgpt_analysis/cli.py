from __future__ import annotations

import argparse
import json
import shutil
from importlib import resources
import sys
from pathlib import Path
from typing import Any, Callable

from . import __version__
from .config import load_settings
from .errors import AnalysisError
from .pipeline import (
    acceptance_check,
    build_index,
    build_segments,
    deterministic_metrics,
    generate_report,
    ingest_results,
    inventory,
    local_analysis,
    prepare_worker_stage,
    reduce_results,
    run_all,
)
from .viewer import generate_viewer_bundle


def _emit(value: Any) -> None:
    print(json.dumps(value, ensure_ascii=False, sort_keys=True, indent=2))


def _settings_command(function: Callable[..., Any], args: argparse.Namespace) -> int:
    result = function(load_settings(args.config))
    _emit(result)
    return 1 if function is acceptance_check and not result["passed"] else 0


def _init(args: argparse.Namespace) -> int:
    destination = args.directory.resolve()
    destination.mkdir(parents=True, exist_ok=True)
    template_root = resources.files("chatgpt_analysis").joinpath("templates")
    names = [
        "analysis.json",
        "taxonomy.json",
        "prompts/triage.md",
        "prompts/signals.md",
        "prompts/review.md",
        "prompts/adjudication.md",
        "prompts/reducer.md",
        "schemas/task.schema.json",
        "schemas/model-output.schema.json",
    ]
    candidates = {name: destination / name for name in names}
    for name, target in candidates.items():
        if target.exists() and not args.force:
            raise AnalysisError(f"refusing to replace {target}; pass --force")
        target.parent.mkdir(parents=True, exist_ok=True)
        with resources.as_file(template_root.joinpath(name)) as source:
            shutil.copyfile(source, target)
    _emit({"created": [str(path) for path in candidates.values()]})
    return 0


def parser() -> argparse.ArgumentParser:
    value = argparse.ArgumentParser(prog="chatgpt-analysis", description="Reproducible analysis of a user-supplied ChatGPT export")
    value.add_argument("--version", action="version", version=__version__)
    subparsers = value.add_subparsers(dest="command", required=True)
    init = subparsers.add_parser("init", help="copy starter configuration into a directory")
    init.add_argument("directory", type=Path)
    init.add_argument("--force", action="store_true")
    init.set_defaults(handler=_init)
    for name, function, help_text in (
        ("inventory", inventory, "normalize the export and write a hash-based inventory"),
        ("metrics", deterministic_metrics, "compute deterministic local metrics"),
        ("segments", build_segments, "build bounded overlapping turn segments"),
        ("analyze-local", local_analysis, "run configured deterministic triage/signals and route model tasks"),
        ("reduce", reduce_results, "reduce deterministic and validated model cards"),
        ("build-index", build_index, "rebuild SQLite and FTS from derived artifacts"),
        ("report", generate_report, "generate JSON and Markdown reports"),
        ("viewer", generate_viewer_bundle, "generate a build-ready static viewer bundle from completed artifacts"),
        ("accept", acceptance_check, "run provenance and consistency acceptance checks"),
        ("run", run_all, "run the complete deterministic local pipeline"),
    ):
        command = subparsers.add_parser(name, help=help_text)
        command.add_argument("--config", type=Path, required=True)
        command.set_defaults(handler=lambda args, f=function: _settings_command(f, args))
    prepare = subparsers.add_parser("prepare", help="prepare independent review queues")
    prepare.add_argument("--config", type=Path, required=True)
    prepare.add_argument("--kind", choices=("triage", "signals"), required=True)
    prepare.add_argument("--stage", choices=("review",), required=True)
    prepare.set_defaults(handler=lambda args: (_emit(prepare_worker_stage(load_settings(args.config), args.kind, args.stage)) or 0))
    ingest = subparsers.add_parser("ingest", help="validate worker output, accepting, retrying, or quarantining each result")
    ingest.add_argument("--config", type=Path, required=True)
    ingest.add_argument("--input", type=Path, required=True)
    ingest.set_defaults(handler=lambda args: (_emit(ingest_results(load_settings(args.config), args.input)) or 0))
    return value


def main(argv: list[str] | None = None) -> int:
    try:
        args = parser().parse_args(argv)
        return int(args.handler(args))
    except (AnalysisError, OSError, ValueError, KeyError) as error:
        print(f"error: {error}", file=sys.stderr)
        return 2


if __name__ == "__main__":
    raise SystemExit(main())
