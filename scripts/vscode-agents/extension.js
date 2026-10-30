// "Агенты Super App": live and recent Claude Code sessions of the project in a VS Code side panel —
// what each one is doing, who is waiting for you, a live feed, and a jump to the session's terminal.
// Data logic lives in lib.js; this file is the VS Code UI only.
const vscode = require("vscode");
const fs = require("fs");
const path = require("path");
const {
  STATE,
  NEEDS_YOU,
  one,
  ago,
  stateOf,
  stateLabel,
  displayName,
  nowLine,
  Store,
  IssueBoard,
  issueBand,
} = require("./lib");

const cfg = () => vscode.workspace.getConfiguration("superAgents");
const PROJECTS = path.join(process.env.HOME || "/root", ".claude", "projects");
const hm = (ms) => new Date(ms).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
const idOf = (a) => (typeof a === "string" ? a : a?.data?.id);

// ---- tree ----

class Node extends vscode.TreeItem {
  constructor(label, opts = {}) {
    const { description, tooltip, icon, color, context, command, children, expanded, data, id } =
      opts;
    super(
      label,
      children
        ? expanded
          ? vscode.TreeItemCollapsibleState.Expanded
          : vscode.TreeItemCollapsibleState.Collapsed
        : vscode.TreeItemCollapsibleState.None
    );
    if (id) this.id = id;
    if (description) this.description = description;
    if (tooltip) this.tooltip = tooltip;
    if (icon)
      this.iconPath = new vscode.ThemeIcon(icon, color ? new vscode.ThemeColor(color) : undefined);
    if (context) this.contextValue = context;
    if (command) this.command = command;
    this.kids = children || [];
    this.data = data || {};
  }
}
const urlCmd = (url) => ({ command: "superAgents.openUrl", title: "Открыть", arguments: [url] });
const feedCmd = (id) => ({ command: "superAgents.feed", title: "Лента", arguments: [id] });

const sessionKids = (s, live) => {
  const tr = s.tr;
  const kids = [];
  const nl = nowLine(s);
  if (nl)
    kids.push(
      new Node(nl[0], { icon: nl[1], description: nl[2], tooltip: nl[0], command: feedCmd(s.id) })
    );
  if (tr?.lastPrompt)
    kids.push(
      new Node(one(tr.lastPrompt, 120), {
        icon: "account",
        description: "последний запрос",
        tooltip: tr.lastPrompt,
        command: feedCmd(s.id),
      })
    );
  const lt = tr?.lastText;
  if (lt && nl?.[1] !== "comment-discussion")
    kids.push(
      new Node(one(lt.text, 160), {
        icon: "comment-discussion",
        description: `ответ, ${ago(lt.ts)} назад`,
        tooltip: lt.text.slice(0, 1500),
        command: feedCmd(s.id),
      })
    );
  const subs = live && tr ? tr.subagents() : [];
  if (subs.length)
    kids.push(
      new Node(`Субагенты: ${subs.length}`, {
        icon: "organization",
        children: subs.map(
          (a) =>
            new Node(a.description, {
              icon: "loading~spin",
              description: `${a.type || ""} · ${ago(a.mtime)}`,
            })
        ),
      })
    );
  if (tr?.worktree)
    kids.push(
      new Node(`worktree ${tr.worktree}`, {
        icon: "git-branch",
        tooltip: `~/kaluger-super-app/.claude/worktrees/${tr.worktree}`,
      })
    );
  if (tr?.pr)
    kids.push(
      new Node(`PR #${tr.pr.num}`, {
        icon: "git-pull-request",
        context: "pr;url",
        data: { url: tr.pr.url },
        tooltip: tr.pr.url,
        command: urlCmd(tr.pr.url),
      })
    );
  return kids;
};

const sessionNode = (s, live) => {
  const tr = s.tr;
  const st = stateOf(s);
  const [, icon, color] = STATE[st];
  const title = displayName(s);
  const description = [
    live ? stateLabel(s) : ago(tr?.mtime),
    tr?.worktree,
    tr?.pr ? `PR #${tr.pr.num}` : null,
    live && st !== "busy" ? ago(tr?.lastActivity) : null,
  ]
    .filter(Boolean)
    .join(" · ");
  const tooltip = [
    title,
    live ? stateLabel(s) : "не запущена",
    tr?.title !== title ? tr?.title : null,
    tr?.worktree ? `worktree: ${tr.worktree}` : null,
    tr?.mode ? `режим: ${tr.mode}` : null,
    live
      ? `${s.live.kind === "background" ? "фоновая" : "в терминале"}, запущена ${s.live.startedAt ? hm(s.live.startedAt) : "?"}`
      : null,
    `claude -r ${s.id}`,
  ]
    .filter(Boolean)
    .join("\n");
  return new Node(title, {
    id: `${live ? "l" : "r"}:${s.id}`,
    description,
    tooltip,
    icon,
    color,
    context: `session;${live ? "live" : "off"}${tr?.pr ? ";url" : ""}`,
    data: { id: s.id, url: tr?.pr?.url },
    command: live
      ? { command: "superAgents.goto", title: "Перейти", arguments: [s.id] }
      : feedCmd(s.id),
    children: sessionKids(s, live),
    expanded: live && NEEDS_YOU.has(st),
  });
};

const issueNodes = (board) => {
  if (!board.at && !board.error) return [new Node("загружаю…", { icon: "loading~spin" })];
  const rows = board.top.map((i) => {
    const b = issueBand(i.score);
    return new Node(`${i.score} · #${i.number} ${i.title}`, {
      description: b.label,
      tooltip: [
        `#${i.number} ${i.title}`,
        `Критичность ${i.score}/100 (${b.label})`,
        i.why ? `Почему: ${i.why}` : null,
        i.labels.join(", "),
      ]
        .filter(Boolean)
        .join("\n"),
      icon: b.icon,
      color: b.color,
      context: "issue;url",
      data: { url: i.url, issue: i },
      command: urlCmd(i.url),
    });
  });
  if (board.error)
    rows.unshift(
      new Node(`не обновилось: ${board.error}`, {
        icon: "warning",
        color: "charts.orange",
        tooltip: `${board.error}\n\nКоманда: superAgents.issuesCommand`,
      })
    );
  if (board.at && !board.top.length)
    rows.push(new Node("оценённых открытых issue нет", { icon: "circle-slash" }));
  if (board.unscored)
    rows.push(
      new Node(`без оценки: ${board.unscored}`, {
        icon: "question",
        description: "/score-issues",
        tooltip: "Оценить их: /score-issues в сессии Claude (Haiku по docs/issue-priority.md)",
      })
    );
  return rows;
};

class Provider {
  constructor(build) {
    this.build = build;
    this.emitter = new vscode.EventEmitter();
    this.onDidChangeTreeData = this.emitter.event;
  }
  refresh() {
    this.emitter.fire();
  }
  getTreeItem(e) {
    return e;
  }
  getChildren(e) {
    return e ? e.kids : this.build();
  }
}

// ---- session feed ----

const esc = (x) =>
  String(x ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
const md = (x) =>
  esc(x)
    .replace(/\*\*([^*\n]+)\*\*/g, "<b>$1</b>")
    .replace(/`([^`\n]+)`/g, "<code>$1</code>");

const FEED_CSS = `
  body { font-family: var(--vscode-font-family); font-size: var(--vscode-font-size); color: var(--vscode-foreground); padding: 0 20px 24px; max-width: 1000px; }
  .top { position: sticky; top: 0; background: var(--vscode-editor-background); padding: 10px 0 8px; border-bottom: 1px solid var(--vscode-panel-border); z-index: 1; }
  .top h2 { margin: 0 0 4px; font-size: 1.15em; } .meta { color: var(--vscode-descriptionForeground); }
  .st-need { color: var(--vscode-charts-orange); font-weight: 600; } .st-busy { color: var(--vscode-charts-green); }
  .btns { display: flex; gap: 8px; margin-top: 8px; flex-wrap: wrap; }
  button { background: var(--vscode-button-secondaryBackground); color: var(--vscode-button-secondaryForeground); border: none; padding: 4px 12px; border-radius: 3px; cursor: pointer; }
  button.ok { background: var(--vscode-button-background); color: var(--vscode-button-foreground); }
  .subs { margin-top: 6px; color: var(--vscode-descriptionForeground); }
  .ev { margin: 8px 0; line-height: 1.45; } .t { color: var(--vscode-descriptionForeground); font-size: 0.85em; margin-right: 8px; font-variant-numeric: tabular-nums; }
  .user .bubble { display: inline-block; white-space: pre-wrap; background: color-mix(in srgb, var(--vscode-charts-blue) 14%, transparent); border-left: 3px solid var(--vscode-charts-blue); padding: 6px 10px; border-radius: 3px; max-width: 90%; vertical-align: top; }
  .text .body { white-space: pre-wrap; margin-top: 2px; }
  .tool { font-family: var(--vscode-editor-font-family); font-size: 0.92em; color: var(--vscode-descriptionForeground); }
  .tool b { color: var(--vscode-foreground); } .tool.pending { color: var(--vscode-foreground); }
  .ok { color: var(--vscode-charts-green); } .bad, .err, .errtxt { color: var(--vscode-errorForeground); } .run { color: var(--vscode-charts-yellow); }
  .errtxt { white-space: pre-wrap; margin: 2px 0 0 52px; }
  .turn { text-align: center; color: var(--vscode-descriptionForeground); font-size: 0.85em; }
  pre { white-space: pre-wrap; background: var(--vscode-textCodeBlock-background); padding: 6px 8px; border-radius: 3px; margin: 4px 0; }
  code { background: var(--vscode-textCodeBlock-background); padding: 0 3px; border-radius: 3px; }
  details summary { cursor: pointer; color: var(--vscode-textLink-foreground); display: inline; margin-left: 6px; }
`;

const feedEvent = (e) => {
  const t = `<span class="t">${hm(e.ts || Date.now())}</span>`;
  if (e.kind === "user")
    return `<div class="ev user">${t}<div class="bubble">${esc(e.text)}</div></div>`;
  if (e.kind === "text")
    return `<div class="ev text">${t}<div class="body">${md(e.text)}</div></div>`;
  if (e.kind === "turn")
    return `<div class="ev turn">— ход завершён за ${Math.round((e.ms || 0) / 1000)} с —</div>`;
  if (e.kind === "error") return `<div class="ev err">${t}${esc(e.text)}</div>`;
  const mark = e.error
    ? '<span class="bad">✗</span>'
    : e.done
      ? '<span class="ok">✓</span>'
      : '<span class="run">…</span>';
  const detail =
    e.detail && e.detail !== e.text
      ? `<details><summary>команда</summary><pre>${esc(e.detail)}</pre></details>`
      : "";
  const error = e.error ? `<div class="errtxt">${esc(e.error)}</div>` : "";
  return `<div class="ev tool ${e.done ? "" : "pending"}">${t}${mark} <b>${esc(e.name)}</b> ${esc(e.text)}${detail}${error}</div>`;
};

class FeedView {
  constructor(store, actions) {
    this.store = store;
    this.actions = actions;
    this.panels = new Map();
  }

  show(id) {
    let p = this.panels.get(id);
    if (!p) {
      const panel = vscode.window.createWebviewPanel(
        "superAgents.feed",
        "Лента",
        vscode.ViewColumn.Active,
        { enableScripts: true, retainContextWhenHidden: true }
      );
      panel.iconPath = new vscode.ThemeIcon("list-flat");
      panel.onDidDispose(() => this.panels.delete(id));
      panel.webview.onDidReceiveMessage((m) => this.actions({ ...m, id }));
      p = { panel, sig: "" };
      this.panels.set(id, p);
    }
    this.render(id, true);
    p.panel.reveal(vscode.ViewColumn.Active);
  }

  renderAll() {
    for (const id of this.panels.keys()) this.render(id, false);
  }

  render(id, force) {
    const p = this.panels.get(id);
    if (!p) return;
    const s = this.store.session(id);
    const tr = s.tr;
    const st = stateOf(s);
    const subs = s.live && tr ? tr.subagents() : [];
    // Unchanged session is not re-rendered, so the scroll position survives
    const sig = `${tr?.version}|${st}|${subs.length}|${Math.floor(Date.now() / 60e3)}`;
    if (!force && sig === p.sig) return;
    p.sig = sig;
    const title = displayName(s);
    p.panel.title = `${NEEDS_YOU.has(st) ? "● " : ""}${title.slice(0, 40)}`;
    const nonce = Math.random().toString(36).slice(2);
    const stCls = NEEDS_YOU.has(st) ? "st-need" : st === "busy" ? "st-busy" : "";
    const meta = [
      tr?.worktree ? `worktree ${esc(tr.worktree)}` : "",
      tr?.mode ? `режим ${esc(tr.mode)}` : "",
      s.live ? (s.live.kind === "background" ? "фоновая" : "в терминале") : "",
      tr?.pr ? `<a href="#" data-cmd="open" data-url="${esc(tr.pr.url)}">PR #${tr.pr.num}</a>` : "",
    ]
      .filter(Boolean)
      .map((x) => ` · ${x}`)
      .join("");
    const subsHtml = subs.length
      ? `<div class="subs">субагенты (${subs.length}): ${subs.map((a) => esc(a.description)).join(" · ")}</div>`
      : "";
    const main = s.live
      ? '<button class="ok" data-cmd="goto">Перейти в диалог</button>'
      : '<button class="ok" data-cmd="resume">Продолжить (claude -r)</button>';
    const body = tr ? tr.feed.map(feedEvent).join("") : '<p class="meta">Транскрипт не найден.</p>';
    p.panel.webview.html = `<!doctype html><html lang="ru"><head><meta charset="utf-8">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; script-src 'nonce-${nonce}';">
<style>${FEED_CSS}</style></head><body>
<div class="top"><h2>${esc(title)}</h2>
  <div class="meta"><span class="${stCls}">${esc(stateLabel(s))}</span>${meta}</div>
  ${subsHtml}
  <div class="btns">${main}<button data-cmd="copyResume">Копировать claude -r</button></div>
</div>
${body}
<div id="end"></div>
<script nonce="${nonce}">
  const vs = acquireVsCodeApi();
  document.addEventListener('click', (e) => { const b = e.target.closest('[data-cmd]'); if (!b) return; e.preventDefault(); vs.postMessage({ ...b.dataset }); });
  document.getElementById('end').scrollIntoView();
</script></body></html>`;
  }
}

// ---- activation ----

const activate = (ctx) => {
  const store = new Store({
    projectsDir: PROJECTS,
    settings: () => ({
      roots: cfg().get("roots"),
      claudePath: cfg().get("claudePath"),
      recentDays: cfg().get("recentDays"),
    }),
  });
  const liveView = new Provider(() => {
    const ls = store.liveSessions;
    const warn =
      store.agentsOk === false
        ? [
            new Node("`claude agents --json` не ответил", {
              icon: "warning",
              tooltip: `Проверь superAgents.claudePath: ${cfg().get("claudePath")}`,
            }),
          ]
        : [];
    const rows = ls.length
      ? ls.map((s) => sessionNode(s, true))
      : [new Node("живых сессий нет", { icon: "circle-slash" })];
    return [...warn, ...rows];
  });
  const recentView = new Provider(() => store.recentSessions.map((s) => sessionNode(s, false)));
  const bar = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 48);
  bar.command = "superAgents.pick";

  const terminal = (name, cwd, text) => {
    const t = vscode.window.createTerminal({ name, cwd });
    t.show();
    t.sendText(text);
    return t;
  };
  const launchCwd = (s) => s.live?.cwd || s.tr?.firstCwd || cfg().get("roots")[0];
  const ppid = (pid) => {
    try {
      return +fs.readFileSync(`/proc/${pid}/stat`, "utf8").split(") ")[1].split(" ")[1];
    } catch {
      return 0;
    }
  };
  // An interactive session runs in the terminal whose shell is the parent of `claude`
  const findTerminal = async (pid) => {
    const parent = ppid(pid);
    for (const t of vscode.window.terminals) {
      const tp = await t.processId;
      if (tp && (tp === parent || tp === pid)) return t;
    }
    return null;
  };

  const copyResume = (id) => {
    const s = store.session(id);
    vscode.env.clipboard
      .writeText(`cd ${launchCwd(s)} && claude -r ${id}`)
      .then(() => vscode.window.showInformationMessage("Скопировано"));
  };
  const resume = async (id) => {
    const s = store.session(id);
    if (s.live) {
      const go = await vscode.window.showWarningMessage(
        "Сессия ещё запущена: второй экземпляр перемешает историю.",
        "Всё равно открыть"
      );
      if (go !== "Всё равно открыть") return;
    }
    terminal(one(displayName(s), 40), launchCwd(s), `claude -r ${id}`);
  };
  let feed;
  const goto = async (id) => {
    const s = store.session(id);
    if (!s.live) return resume(id);
    if (s.live.kind === "background" || !s.live.pid) {
      const name = `attach ${one(displayName(s), 30)}`;
      const t = vscode.window.terminals.find((x) => x.name === name);
      if (t) return t.show();
      return terminal(name, launchCwd(s), `claude attach ${id}`);
    }
    const t = await findTerminal(s.live.pid);
    if (t) return t.show();
    const b = await vscode.window.showInformationMessage(
      `Терминал сессии «${one(displayName(s), 40)}» не в этом окне VS Code (pid ${s.live.pid}).`,
      "Лента",
      "Копировать claude -r"
    );
    if (b === "Лента") feed.show(id);
    if (b === "Копировать claude -r") copyResume(id);
  };
  feed = new FeedView(store, (m) => {
    if (m.cmd === "goto") goto(m.id);
    if (m.cmd === "resume") resume(m.id);
    if (m.cmd === "copyResume") copyResume(m.id);
    if (m.cmd === "open" && m.url) vscode.env.openExternal(vscode.Uri.parse(m.url));
  });

  // Transitions worth a notification: finished a turn (busy -> idle), needs you (-> waiting/question/blocked)
  const prevState = new Map();
  let firstPoll = true;
  const notify = async () => {
    const mode = cfg().get("notifications");
    const seen = new Set();
    for (const s of store.liveSessions) {
      seen.add(s.id);
      const st = stateOf(s);
      const was = prevState.get(s.id);
      prevState.set(s.id, st);
      if (firstPoll || mode === "off" || was === undefined || was === st) continue;
      const need = NEEDS_YOU.has(st);
      const finished = was === "busy" && st === "idle";
      if (!need && !(finished && mode === "all")) continue;
      if (vscode.window.state.focused && s.live.pid) {
        const t = await findTerminal(s.live.pid);
        if (t && vscode.window.activeTerminal === t) continue;
      }
      const name = one(displayName(s), 50);
      const question = st === "question" ? ": " + one(s.tr?.feed.at(-1)?.text, 100) : "";
      const msg = need
        ? `«${name}» — ${stateLabel(s)}${question}`
        : `«${name}» закончил: ${one(s.tr?.lastText?.text, 140)}`;
      const show = need ? vscode.window.showWarningMessage : vscode.window.showInformationMessage;
      show(msg, "Перейти", "Лента").then((b) => {
        if (b === "Перейти") goto(s.id);
        if (b === "Лента") feed.show(s.id);
      });
    }
    for (const id of prevState.keys()) if (!seen.has(id)) prevState.delete(id);
    firstPoll = false;
  };

  const render = () => {
    liveView.refresh();
    recentView.refresh();
    feed.renderAll();
    const ls = store.liveSessions;
    const count = (pred) => ls.filter((s) => pred(stateOf(s))).length;
    const busy = count((st) => st === "busy");
    const need = count((st) => NEEDS_YOU.has(st));
    const idle = count((st) => st === "idle");
    bar.text = `$(hubot) ${busy}${need ? ` $(warning) ${need}` : ""}${idle ? ` $(bell) ${idle}` : ""}`;
    bar.tooltip = ls.length
      ? `Агенты Super App\n${ls.map((s) => `${STATE[stateOf(s)][0]} — ${one(displayName(s), 50)}`).join("\n")}\n\nКлик: перейти к сессии`
      : "Агенты Super App: живых сессий нет";
    bar.backgroundColor = need
      ? new vscode.ThemeColor("statusBarItem.warningBackground")
      : undefined;
    bar.show();
  };

  const tick = async () => {
    if (!(await store.refresh())) return;
    render();
    await notify();
  };
  let timer = setInterval(tick, cfg().get("pollSeconds") * 1000);

  // Prioritized open issues: `gh` over ssh every few minutes, no model tokens
  const board = new IssueBoard({
    settings: () => ({ command: cfg().get("issuesCommand"), limit: cfg().get("issuesLimit") }),
  });
  const issuesView = new Provider(() => issueNodes(board));
  const issuesTree = vscode.window.createTreeView("superAgents.issues", {
    treeDataProvider: issuesView,
  });
  const refreshIssues = async () => {
    issuesTree.description = "обновляю…";
    await board.refresh();
    issuesTree.description = board.at
      ? `${board.error ? "ошибка, " : ""}на ${hm(board.at)}`
      : "не загрузилось";
    issuesView.refresh();
  };
  const issuesEvery = () => Math.max(1, cfg().get("issuesRefreshMinutes")) * 60e3;
  let issuesTimer = setInterval(refreshIssues, issuesEvery());
  const takeIssue = (n) => {
    const i = n?.data?.issue;
    if (!i) return;
    const prompt = `Возьми в работу issue #${i.number} (${i.url}): ${i.title}`.replace(
      /'/g,
      "'\\''"
    );
    terminal(`#${i.number}`, cfg().get("roots")[0], `claude '${prompt}'`);
  };

  const pick = async () => {
    const items = store.liveSessions.map((s) => {
      const nl = nowLine(s);
      return {
        label: `$(${STATE[stateOf(s)][1].replace("~spin", "")}) ${one(displayName(s), 60)}`,
        description: [stateLabel(s), s.tr?.worktree].filter(Boolean).join(" · "),
        detail: nl ? nl[0] : "",
        id: s.id,
      };
    });
    if (!items.length) return vscode.window.showInformationMessage("Живых сессий нет");
    const p = await vscode.window.showQuickPick(items, {
      placeHolder: "Перейти в диалог",
      matchOnDescription: true,
      matchOnDetail: true,
    });
    if (p) goto(p.id);
  };

  ctx.subscriptions.push(
    vscode.window.registerTreeDataProvider("superAgents.live", liveView),
    vscode.window.registerTreeDataProvider("superAgents.recent", recentView),
    issuesTree,
    bar,
    { dispose: () => clearInterval(timer) },
    { dispose: () => clearInterval(issuesTimer) },
    vscode.workspace.onDidChangeConfiguration((e) => {
      if (!e.affectsConfiguration("superAgents")) return;
      clearInterval(timer);
      timer = setInterval(tick, cfg().get("pollSeconds") * 1000);
      tick();
      clearInterval(issuesTimer);
      issuesTimer = setInterval(refreshIssues, issuesEvery());
      refreshIssues();
    }),
    vscode.commands.registerCommand("superAgents.refresh", tick),
    vscode.commands.registerCommand("superAgents.refreshIssues", refreshIssues),
    vscode.commands.registerCommand("superAgents.takeIssue", takeIssue),
    vscode.commands.registerCommand("superAgents.newSession", () =>
      terminal("claude", cfg().get("roots")[0], "claude")
    ),
    vscode.commands.registerCommand("superAgents.pick", pick),
    vscode.commands.registerCommand("superAgents.goto", (a) => goto(idOf(a))),
    vscode.commands.registerCommand("superAgents.feed", (a) => feed.show(idOf(a))),
    vscode.commands.registerCommand("superAgents.resume", (a) => resume(idOf(a))),
    vscode.commands.registerCommand("superAgents.copyResume", (a) => copyResume(idOf(a))),
    vscode.commands.registerCommand("superAgents.openUrl", (a) => {
      const u = typeof a === "string" ? a : a?.data?.url;
      if (u) vscode.env.openExternal(vscode.Uri.parse(u));
    }),
    vscode.commands.registerCommand("superAgents.copy", (n) =>
      vscode.env.clipboard.writeText(`${n.label}${n.description ? " — " + n.description : ""}`)
    )
  );
  tick();
  refreshIssues();
};

const deactivate = () => undefined;

module.exports = { activate, deactivate };
