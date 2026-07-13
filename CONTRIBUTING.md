# Contributing

Thank you for helping improve ChatGPT Export Analysis. Contributions should preserve the project's central contract: local deterministic operation, explicit external-worker boundaries, and evidence-linked results that remain reviewable against the supplied corpus.

## Before opening a change

- Use only synthetic conversation fixtures. Never commit a real ChatGPT export, normalized transcript, worker queue, worker result, report, or SQLite workspace.
- Open an issue before changing a CLI command, configuration field, normalized artifact, task/result contract, database schema, or interpretation rule. Those are compatibility and research-method choices rather than incidental implementation details.
- Keep hosted provider SDKs and network behavior outside the runtime package. Optional worker executables own those concerns.
- Keep unrelated formatting, dependency, naming, and design changes out of focused contributions.

## Development setup

ChatGPT Export Analysis requires Python 3.11 or newer and has no third-party runtime dependencies.

```bash
python -m venv .venv
. .venv/bin/activate
python -m pip install -e .
python -m unittest discover -s tests -v
python -m chatgpt_analysis --help
python -m chatgpt_analysis.worker --help
python scripts/check_readme.py
```

These commands run the unit and integration tests, check both CLI entry points, and validate README structure and local links without requiring a platform-specific task runner.

## Distribution verification

Build both distribution formats and exercise the installed wheel independently of the source package:

```bash
python -m pip install build
python -m build

python -m venv /tmp/chatgpt-analysis-package-check
/tmp/chatgpt-analysis-package-check/bin/python -m pip install dist/*.whl
PATH="/tmp/chatgpt-analysis-package-check/bin:$PATH" \
  /tmp/chatgpt-analysis-package-check/bin/python tests/smoke_installed.py
```

The smoke test scaffolds a project, runs the complete pipeline over a synthetic ZIP fixture, and requires acceptance to pass.

## Mirrored reference files

Files copied by `chatgpt-analysis init` have a repository reference and a packaged copy. Update both sides together:

| Reference | Packaged copy |
|---|---|
| `config/analysis.example.json` | `src/chatgpt_analysis/templates/analysis.json` |
| `config/taxonomy.example.json` | `src/chatgpt_analysis/templates/taxonomy.json` |
| `prompts/*` | `src/chatgpt_analysis/templates/prompts/*` |
| `schemas/*` | `src/chatgpt_analysis/templates/schemas/*` |

The distribution tests enforce byte-for-byte parity.

## Pull requests

Explain the user or research-method problem, the chosen boundary, and any compatibility effect. Include the narrowest test that proves the change and report the commands actually run. Update `README.md`, `docs/`, schemas, examples, and `CHANGELOG.md` when their public claims change.

By contributing, you agree that your work is distributed under the repository's [MIT licence](LICENSE).
