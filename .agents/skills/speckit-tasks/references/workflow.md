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

1. **Setup**: Run `.specify/scripts/bash/check-prerequisites.sh --json` from repo root and parse FEATURE_DIR and AVAILABLE_DOCS list. All paths must be absolute. For single quotes in args like "I'm Groot", use escape syntax: e.g 'I'\''m Groot' (or double-quote if possible: "I'm Groot").

2. **Load design documents**: Read from FEATURE_DIR:
   - **Required**: plan.md (tech stack, libraries, structure), spec.md (user stories with priorities)
   - **Optional**: data-model.md (entities), contracts/ (API endpoints), research.md (decisions), quickstart.md (test scenarios)
   - Note: Not all projects have all documents. Generate tasks based on what's available.

3. **Execute task generation workflow**:
   - Load plan.md and extract tech stack, libraries, project structure
   - Load spec.md and extract user stories with their priorities (P1, P2, P3, etc.)
   - If data-model.md exists: Extract entities and map to user stories
   - If contracts/ exists: Map endpoints to user stories
   - If research.md exists: Extract decisions for setup tasks
   - Generate tasks organized by user story (see Task Generation Rules below)
   - Generate dependency graph showing user story completion order
   - Create parallel execution examples per user story
   - Validate task completeness (each user story has all needed tasks, independently testable)

4. **Generate tasks.md**: Use `.specify/templates/tasks-template.md` as structure, fill with:
   - Correct feature name from plan.md
   - Phase 1: Setup tasks (project initialization)
   - Phase 2: Foundational tasks (blocking prerequisites for all user stories)
   - Phase 3+: One phase per user story (in priority order from spec.md)
   - Each phase includes: story goal, independent test criteria, tests (where required/requested), implementation tasks
   - Final Phase: Polish & cross-cutting concerns
   - All tasks must follow the strict checklist format (see Task Generation Rules below)
   - Clear file paths for each task
   - Dependencies section showing story completion order
   - Parallel execution examples per story
   - Implementation strategy section (MVP first, incremental delivery)

5. **Report**: Output path to generated tasks.md and summary:
   - Total task count
   - Task count per user story
   - Parallel opportunities identified
   - Independent test criteria for each story
   - Suggested MVP scope (typically just User Story 1)
   - Format validation: Confirm ALL tasks follow the checklist format (checkbox, ID, labels, file paths)

Context for task generation: $ARGUMENTS

The tasks.md should be immediately executable - each task must be specific enough that an LLM can complete it without additional context.

## Task Generation Rules

**CRITICAL**: Tasks MUST be organized by user story to enable independent implementation and testing.

**Tests follow project requirements**: Additional test-first/TDD tasks are optional unless requested, but regression tests for bug fixes and meaningful behavior tests for new logic are required by AGENTS.md. Include the applicable verification tasks; documentation-only changes need no artificial tests.

Preserve completed task checkboxes and stable task IDs on updates. Never mark work complete while only planning it.

### Checklist Format (REQUIRED)

Every task MUST strictly follow this format:

```text
- [ ] [TaskID] [P?] [Story?] Description with file path
```

**Format Components**:

1. **Checkbox**: ALWAYS start with `- [ ]` (markdown checkbox)
2. **Task ID**: Sequential number (T001, T002, T003...) in execution order
3. **[P] marker**: Include ONLY if task is parallelizable (different files, no dependencies on incomplete tasks)
4. **[Story] label**: REQUIRED for user story phase tasks only
   - Format: [US1], [US2], [US3], etc. (maps to user stories from spec.md)
   - Setup phase: NO story label
   - Foundational phase: NO story label
   - User Story phases: MUST have story label
   - Polish phase: NO story label
5. **Description**: Clear action with exact file path

**Examples**:

- ✅ CORRECT: `- [ ] T001 Create project structure per implementation plan`
- ✅ CORRECT: `- [ ] T005 [P] Implement authentication middleware in src/middleware/auth.py`
- ✅ CORRECT: `- [ ] T012 [P] [US1] Create User model in src/models/user.py`
- ✅ CORRECT: `- [ ] T014 [US1] Implement UserService in src/services/user_service.py`
- ❌ WRONG: `- [ ] Create User model` (missing ID and Story label)
- ❌ WRONG: `T001 [US1] Create model` (missing checkbox)
- ❌ WRONG: `- [ ] [US1] Create User model` (missing Task ID)
- ❌ WRONG: `- [ ] T001 [US1] Create model` (missing file path)

### Task Organization

1. **From User Stories (spec.md)** - PRIMARY ORGANIZATION:
   - Each user story (P1, P2, P3...) gets its own phase
   - Map all related components to their story:
     - Models needed for that story
     - Services needed for that story
     - Endpoints/UI needed for that story
     - If tests required/requested: Tests specific to that story
   - Mark story dependencies (most stories should be independent)

2. **From Contracts**:
   - Map each contract/endpoint → to the user story it serves
   - If tests required/requested: Each contract → contract test task [P] before implementation in that story's phase

3. **From Data Model**:
   - Map each entity to the user story(ies) that need it
   - If entity serves multiple stories: Put in earliest story or Setup phase
   - Relationships → service layer tasks in appropriate story phase

4. **From Setup/Infrastructure**:
   - Shared infrastructure → Setup phase (Phase 1)
   - Foundational/blocking tasks → Foundational phase (Phase 2)
   - Story-specific setup → within that story's phase

### Phase Structure

- **Phase 1**: Setup (project initialization)
- **Phase 2**: Foundational (blocking prerequisites - MUST complete before user stories)
- **Phase 3+**: User Stories in priority order (P1, P2, P3...)
  - Within each story: Tests (where required/requested) → Models → Services → Endpoints → Integration
  - Each phase should be a complete, independently testable increment
- **Final Phase**: Polish & Cross-Cutting Concerns
