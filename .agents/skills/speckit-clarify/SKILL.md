---
name: speckit-clarify
description: "Identify and resolve consequential ambiguities in an existing Super App specification, recording answers directly in the spec."
---

Read `AGENTS.md`, `.specify/memory/constitution.md`, and the exact target
`specs/<id>-<name>/`. Prefer explicit feature id or `SPECIFY_FEATURE`; strip `codex/`
from a feature branch only when it identifies an existing spec. Numeric prefixes
can repeat, and detached HEAD is not a feature id. Use current local paths.

# Clarify requirements

Scan scope/roles, entities and state transitions, UX/error states, security/privacy,
nonfunctional targets, external integrations, concurrency/recovery, terminology and
acceptance criteria. Prioritize gaps that would change implementation or validation.

Ask one focused question at a time, with concise mutually exclusive options and a
recommended default when evidence supports it. Ask up to five high-value questions
per pass, not a questionnaire for every absent detail. Existing user decisions take
precedence; skip answered questions. Wait for required answers without inventing them.

After each answer, update the affected spec section and a dated Clarifications
record; replace contradictions instead of merely appending incompatible statements.
Keep terminology and acceptance scenarios aligned. Validate links and requirement IDs.
If nothing consequential is unclear, report that without changing the spec.
Return updated path and a brief resolved/deferred coverage summary. No coding/PR.
