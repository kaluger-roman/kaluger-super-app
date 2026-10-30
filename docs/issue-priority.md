# Issue priority (criticality 0–100)

Every open GitHub issue carries a criticality score, so work can be taken in priority order (the VS Code agents panel lists the top ones). The score is the sum of four criteria; it measures how bad the problem is, not how hard the fix is.

Scoring is done by a Haiku subagent through `/score-issues` (right after an issue is filed, and in bulk for issues without a score); the result is written by `scripts/issue-priority.mjs`.

## Context for scoring

Tutor management app in production at `tutor.kaluger.ru`: a small number of real users (tutors and their students), real money and tax figures in reports, video calls between tutor and student. Everything else — CI, tests, dev stack on `home`, Claude Code hooks, skills and scripts — is development infrastructure used by AI agents and one developer.

## Criteria

### Impact — 0…40: what breaks when it happens

| Points | When                                                                                                                                                                     |
| ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 40     | Data loss or corruption on prod, a security hole (data leak, auth bypass), wrong money / tax figures shown to the user                                                   |
| 30     | A core prod flow does not work: login, lessons and schedule, payments, students, video call                                                                              |
| 20     | A prod flow works but with a visible failure or a wrong secondary result; or development is blocked: CI red for everyone, deploy broken, a mandatory script / hook fails |
| 10     | Noticeable inconvenience or cosmetics in normal use; dev noise or slowdown (flaky or noisy tests, a tool that needs a workaround)                                        |
| 0–5    | Rare-screen cosmetics, code tidiness, hypothetical improvements, ideas                                                                                                   |

### Reach — 0…25: how often and for whom

| Points | When                                                                                           |
| ------ | ---------------------------------------------------------------------------------------------- |
| 25     | Every time, for every user / in every run                                                      |
| 15     | In a common scenario or for a large group (all phones, all iOS, every feature branch)          |
| 8      | A rare scenario: edge cases, races, specific devices or widths, a specific sequence of actions |
| 0–3    | Theoretical, not observed                                                                      |

### Urgency — 0…20: what waiting costs

| Points | When                                                                                            |
| ------ | ----------------------------------------------------------------------------------------------- |
| 20     | Happens on prod now and hurts users, blocks current tasks, or is a regression of a recent PR    |
| 10     | Will hit soon (data growth, an upcoming feature, the next release) or gets in the way regularly |
| 0–5    | Can wait indefinitely                                                                           |

### Workaround — 0…15: can the user / developer live with it

| Points | When                                                  |
| ------ | ----------------------------------------------------- |
| 15     | No workaround                                         |
| 8      | A workaround exists but is not obvious or is awkward  |
| 0–3    | Easy workaround, or it does not get in the way at all |

Intermediate values are allowed when a case sits between two rows.

## Bands

| Score  | Label         | Meaning                             |
| ------ | ------------- | ----------------------------------- |
| 80–100 | `P0-critical` | Take now, ahead of the current plan |
| 60–79  | `P1-high`     | Next in line                        |
| 40–59  | `P2-medium`   | Planned work                        |
| 20–39  | `P3-low`      | When there is time                  |
| 0–19   | `P4-trivial`  | Backlog, ideas                      |

## In the issue

The score is a block at the top of the issue body plus the band label. The block is machine-readable (the panel and the script parse `Критичность: NN/100`) and replaced in place on rescoring:

```text
<!-- priority -->
**Критичность: 72/100** (P1-high) · ущерб 30 · охват 15 · срочность 12 · обход 15
Почему: падает вход ученика на всех телефонах, обхода нет.
<!-- /priority -->
```

Never edit the block by hand — rescore with `/score-issues <N>` (for example when new details change the picture).

## Script

```bash
node scripts/issue-priority.mjs set <N> --impact 30 --reach 15 --urgency 12 --workaround 15 --why "<one sentence>"
node scripts/issue-priority.mjs unscored            # open issues without a score, JSON
node scripts/issue-priority.mjs top [--limit 10]    # open issues by score, JSON
```
