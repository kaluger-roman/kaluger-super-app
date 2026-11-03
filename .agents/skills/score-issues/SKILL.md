---
name: score-issues
description: "Score or rescore Kaluger Super App GitHub issues using the existing 0–100 criticality rubric and P0–P4 labels."
---

# Score issues

Read `docs/issue-priority.md` completely; it is the scoring source of truth.
Resolve the target repository from the checkout's origin and verify it with `gh repo view`.
Before any GitHub read/write, clear or override a conflicting `GH_REPO` so all calls
target that repository. Explicit invocation or
an authorized issue-filing workflow includes writing scores. If the user asks for
an assessment/draft only, return proposed scores without updating GitHub.

- Given numbers: read each issue's body, labels, state and relevant comments; skip closed issues.
- No numbers: `node scripts/issue-priority.mjs unscored`. Its default open-issue limit
  is 300; for a larger inventory supply `--limit` covering the verified total or use
  paginated GitHub reads and filter the missing priority blocks. Do not silently truncate.
- `--all`: list all open issues with pagination; don't silently cap the inventory.
- If none need scoring, report that and finish.

Assign integer values for impact (0–40), reach (0–25), urgency (0–20), workaround
(0–15), with a short Russian explanation based on evidence. Do not confuse review
confidence with issue criticality, or assume the unavailable production is serving
traffic. Preserve unknowns instead of inventing affected-user counts. Use independent batch scorers as specified below, without a model-name dependency.

The maintained writer is the only way to update the priority block:

```bash
node scripts/issue-priority.mjs set 123 --impact 30 --reach 15 --urgency 10 --workaround 8 --why 'Краткое объяснение'
```

Run from the correct repo; clear/override a conflicting `GH_REPO` rather than
writing into another project. The script maintains `<!-- priority -->` and the band
label while preserving the rest of the issue. Read back body/labels after writing.
If one update fails, preserve its proposed score, continue independent issues, and
report partial completion. Do not fix or close issues. Return links sorted by score,
with the four components, band and explanation; list any unscored remainder.

## Independent batch scorers

Follow `docs/subagents.md`. Materialize issue data in temporary JSON batches of up
to eight issues, excluding old generated priority blocks but preserving meaningful
evidence and comments. Dispatch independent scoring subagents concurrently within
available slots, queueing the rest. Each reads the rubric and its batch, returns
JSON with number/impact/reach/urgency/workaround/why, and makes no GitHub writes.
The parent checks exact issue coverage, integer ranges and nonempty explanations
before invoking the maintained writer. Retry a malformed batch once; if still invalid,
report its issues unscored. Model defaults are inherited; scoring need not use max
reasoning. Do not replace batch scoring with serial parent-only assessment silently.
