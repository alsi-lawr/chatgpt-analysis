# Security policy

ChatGPT exports and derived workspaces can contain highly sensitive transcript text. Security reports must not include real exports, transcript excerpts, worker queues, generated reports, databases, credentials, or other private corpus material.

## Supported versions

Until the project reaches a stable release, security fixes are applied to the latest state of `master`.

| Version | Supported |
|---|---|
| `master` | Yes |
| Older snapshots | No |

## Reporting a vulnerability

Use [GitHub private vulnerability reporting](https://github.com/alsi-lawr/chatgpt-analysis/security/advisories/new) for vulnerabilities that could expose data, cross a worker trust boundary, corrupt provenance, accept out-of-scope evidence, execute unintended commands, or bypass output validation.

Describe the affected version, preconditions, impact, and a minimal reproduction using synthetic data. Do not open a public issue until the report has been assessed. Non-sensitive correctness bugs can use the public issue tracker.

No response-time or disclosure-time guarantee is currently offered. The maintainer will coordinate validation, remediation, and disclosure through the private advisory when practical.

## Operational boundaries

- The local pipeline does not send data to a provider. External worker commands define their own network and credential risk.
- Worker task payloads contain transcript text and must be reviewed before leaving the local environment.
- SQLite and FTS5 store searchable plaintext; they do not encrypt the workspace.
- Taxonomy regular expressions are trusted configuration and can consume excessive processing time if written pathologically.
- Evidence links and review stages improve auditability but do not establish that a pattern or model conclusion is correct.
