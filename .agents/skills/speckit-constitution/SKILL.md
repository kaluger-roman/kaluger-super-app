---
name: speckit-constitution
description: "Amend the Super App project constitution and synchronize affected instructions/templates when a governance or principle change is explicitly requested."
---

# Amend project principles

Use only for a request to create/amend governance, not to bypass a failing feature
check. Read `AGENTS.md`, `.specify/memory/constitution.md`, relevant conventions and
`.specify/templates/constitution-template.md`. Preserve principles unrelated to the request.

Make the requested principle concrete and enforceable; explain a material tradeoff
rather than hiding it in wording. Check dependent AGENTS, conventions and spec/plan/
task/checklist templates for conflicts, and update only affected references.

Increment constitution version by its governance rules (major for incompatible
principle change/removal, minor for substantive additions, patch for clarification).
Keep ratification date, update amendment date in the user's timezone, and refresh the
sync impact report with changed principles, synchronized artifacts and actual TODOs.

Validate that placeholders are resolved and cross-document guidance agrees. Report
changed rules, version and remaining decisions. Do not rewrite application code,
change permissions globally or publish a PR unless separately requested.
