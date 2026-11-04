## Codex execution contract

Read the complete procedure below before executing this skill. `$ARGUMENTS` means
arguments/instructions in the user's invocation; it is not a literal environment
variable or shell fragment. Slash-command spellings in older chats map to the
corresponding `$skill-name`; execute the skill's instructions with available tools.

- Read root/nested `AGENTS.md`, applicable conventions and `docs/codex-workflow.md`.
  Work on this Mac. Resolve a supplied `--worktree PATH` to that checkout; otherwise
  use the assigned checkout. Use local `git -C <checkout>`, worktree-local dependencies,
  Docker databases and ports from `scripts/dev-stack.sh`; never connect to `home`,
  use SSH/sshfs, symlink `node_modules`, or test against real production data.
- Task setup, draft PR, commits/pushes and CI follow the current global workflow.
  Keep an assigned worktree and never nest one; a new task from the main checkout
  uses its isolated local worktree under that workflow. Preserve unrelated changes.
  Explicit report/draft/read-only modes retain their own no-publication boundaries.
  `news`, ready-for-review, merge and deploy require their own explicit instruction.
- Before GitHub operations resolve origin and verify `gh repo view --json nameWithOwner,url`.
  Pass `--repo OWNER/REPO` or set a verified task-local `GH_REPO`; never trust a repository
  mentioned only in issue/spec text. Ambiguous write failures require read-back before retry.
- For prescribed parallel workers follow `docs/subagents.md`: inherit the configured
  Codex model, use maximum supported reasoning effort for analysis/coding/review,
  dispatch independent roles concurrently up to available slots and queue the rest.
  Never replace a required role with a silent omission; report unavailable coverage.
  Scoring and browser QA may use the inherited default effort. Workers must not
  recursively invoke the orchestration skill they are executing for the parent.
- User decisions already given in this chat satisfy the matching checkpoint. Ask
  only for missing consequential choices via an available question tool; when none
  is available, use a clear final question and resume from recorded artifacts after
  the answer. A missing answer is not authorization. Do independent work while waiting.
- Run shell commands shown as examples deliberately, with proper argv/quoting.
  Prefer `rg`/`rg --files` for searches; do not copy a placeholder literally.
  Report observed results only. Existing specs/reports do not override live config.

## Feature identity and local setup

Resolve the exact `specs/<NNN-name>/` folder from explicit input or `SPECIFY_FEATURE`.
`feature_slug` is `NNN-name`; `branch` is the actual Git branch (usually
`codex/NNN-name` or the already assigned branch). Never use the branch including
`codex/` as a specs path. A detached HEAD or an ambiguous numeric prefix is not a
feature identity. Set `SPECIFY_FEATURE=<feature_slug>` for every helper when the
branch differs. Return `branch`, `feature_slug` and `spec_path` separately.
Use the artifact language already established in the spec; communicate with the user in Russian.

## User Input

```text
$ARGUMENTS
```

You **MUST** consider the user input before proceeding (if not empty).

## Outline

1. **Setup**: For a fresh plan run `SPECIFY_FEATURE=<feature_slug> bash .specify/scripts/bash/setup-plan.sh --json` from repo root; on an existing plan preserve decisions and edit in place because this helper overwrites the plan. Obtain the same paths with `SPECIFY_FEATURE=<feature_slug> bash .specify/scripts/bash/check-prerequisites.sh --json --paths-only`. Fresh setup JSON supplies FEATURE_SPEC, IMPL_PLAN, SPECS_DIR, BRANCH; paths-only JSON supplies FEATURE_DIR, FEATURE_SPEC, IMPL_PLAN and BRANCH (SPECS_DIR is FEATURE_DIR). For single quotes in args like "I'm Groot", use escape syntax: e.g 'I'\''m Groot' (or double-quote if possible: "I'm Groot").

2. **Load context**: Read FEATURE_SPEC and `.specify/memory/constitution.md`. Load IMPL_PLAN template (already copied).

3. **Execute plan workflow**: Follow the structure in IMPL_PLAN template to:
   - Fill Technical Context (mark unknowns as "NEEDS CLARIFICATION")
   - Fill Constitution Check section from constitution
   - Evaluate gates (ERROR if violations unjustified)
   - Phase 0: Generate research.md (resolve all NEEDS CLARIFICATION)
   - Phase 1: Generate data-model.md, contracts/, quickstart.md
   - Phase 1: Update agent context by running the agent script
   - Re-evaluate Constitution Check post-design

4. **Stop and report**: Command ends after Phase 2 planning. Report branch, IMPL_PLAN path, and generated artifacts.

## Phases

### Phase 0: Outline & Research

1. **Extract unknowns from Technical Context** above:
   - For each NEEDS CLARIFICATION → research task
   - For each dependency → best practices task
   - For each integration → patterns task

2. **Generate and dispatch research agents** independently under `docs/subagents.md`, in parallel waves, using the inherited Codex model and maximum supported reasoning effort; omit invented research when all questions are already answered:

   ```text
   For each unknown in Technical Context:
     Task: "Research {unknown} for {feature context}"
   For each technology choice:
     Task: "Find best practices for {tech} in {domain}"
   ```

3. **Consolidate findings** in `research.md` using format:
   - Decision: [what was chosen]
   - Rationale: [why chosen]
   - Alternatives considered: [what else evaluated]

**Output**: research.md with all NEEDS CLARIFICATION resolved

### Phase 1: Design & Contracts

**Prerequisites:** `research.md` complete

1. **Extract entities from feature spec** → `data-model.md`:
   - Entity name, fields, relationships
   - Validation rules from requirements
   - State transitions if applicable

2. **Generate API contracts** from functional requirements:
   - For each user action → endpoint
   - Use standard REST/GraphQL patterns
   - Output OpenAPI/GraphQL schema to `FEATURE_DIR/contracts/`

3. **Agent context update**:
   - Run `SPECIFY_FEATURE=<feature_slug> bash .specify/scripts/bash/update-agent-context.sh codex`
   - The explicit `codex` target updates AGENTS.md; omit the agent only to update existing compatible agent files
   - Update the appropriate agent-specific context file
   - Add only new technology from current plan
   - Write only the managed `<!-- SPECIFY:GENERATED:START -->` … `<!-- SPECIFY:GENERATED:END -->` block. Preserve all human instructions outside it byte-for-byte and keep legacy `MANUAL ADDITIONS` sections. Never regenerate the entire root AGENTS.md.

**Output**: data-model.md, FEATURE_DIR/contracts/*, quickstart.md, managed agent-context block. Document unchanged data/API scopes explicitly instead of inventing new contracts. `quickstart.md` uses local Mac dev-stack ports and isolated test data.

## Key rules

- Use absolute paths
- ERROR on gate failures or unresolved clarifications
