# Агенты Super App (VS Code extension)

A VS Code side panel for watching the Claude Code sessions that work on this project: what each one is doing right now, which ones wait for you, a live feed of their actions, and a one-click jump into the session's terminal. UI text is Russian.

- «Сейчас»: live sessions from `claude agents --json` started under `superAgents.roots` (default `/root/super-app`). States: работает / ждёт ввода (finished its turn) / нужен ты (permission prompt, `AskUserQuestion`, blocked background session); the ones that need you are on top and expanded. Inside: the current action (tool and its description), the last prompt, the last answer, running subagents, worktree, the last mentioned PR.
- Clicking a live session focuses its VS Code terminal (the terminal whose shell is the parent of the `claude` process). A background session opens via `claude attach <id>`. A terminal in another VS Code window: the panel offers the feed or copies `claude -r`.
- Feed (list icon): the last ~150 transcript events — prompts, answers, tool calls with ✓/✗ and the error text, turn ends; updates live.
- «Недавние»: finished sessions of the last `superAgents.recentDays` days; ▶ runs `claude -r <id>` in a new terminal.
- «Приоритетные issue»: the `superAgents.issuesLimit` (8) open issues with the highest criticality score (`docs/issue-priority.md`), as `72 · #105 title` with the band icon; click opens the issue, ▶ starts a new Claude session on it. A trailing row counts issues without a score (`/score-issues` scores them). Refreshed every `superAgents.issuesRefreshMinutes` (10) minutes by `superAgents.issuesCommand` (by default `gh issue list` over `ssh home`); a failed refresh keeps the last list and shows the error.
- Status bar: `$(hubot)` working, `$(warning)` need you, `$(bell)` waiting for input; click to pick a session to jump to («Агенты Super App: Перейти к сессии…»).
- Notifications (`superAgents.notifications`): `all` — finished a turn and needs you, `attention` — needs you only, `off`. Skipped when you are already looking at that session's terminal.

Data: `claude agents --json` every `superAgents.pollSeconds` seconds plus the local transcripts in `~/.claude/projects/` (read incrementally), and the issue list command. No model tokens are spent.

The PR shown for a session is a heuristic: the last PR link, or the first `PR #N` of the latest answer.

## Files

- `lib.js` — transcript parsing, session state, polling; no `vscode` import, tested by `scripts/__tests__/vscode-agents-lib.test.mjs`.
- `extension.js` — tree views, feed webview, status bar, notifications, terminal jump.

## Build and install

Run on the machine where VS Code Server runs the sessions (the server, not `home`):

```bash
cd scripts/vscode-agents
npx -y @vscode/vsce package --allow-missing-repository
code --install-extension super-agents-<version>.vsix   # from a VS Code terminal
```

Outside a VS Code terminal use the server binary: `~/.vscode-server/cli/servers/Stable-<commit>/server/bin/code-server --install-extension …`. Then run «Developer: Reload Window».
