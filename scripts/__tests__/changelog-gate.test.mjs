import { test, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { chmodSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { checkChangelog, checkGhPublication, hookDecision, publicationCommands, parseGhPublicationArgs, repositoryIdentity } from "../changelog-gate.mjs";

const ROOT = dirname(dirname(dirname(fileURLToPath(import.meta.url))));
const SCRIPT = join(ROOT, "scripts", "changelog-gate.mjs");
const WRAPPER = join(ROOT, "scripts", "gh-pr.mjs");
let root, repo, env, remote, oldEnvironment;
const git = (cwd, ...args) => execFileSync("git", args, { cwd, env, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
const writeCommit = (file, value, cwd = repo) => { writeFileSync(join(cwd, file), value); git(cwd, "add", file); git(cwd, "commit", "-qm", file); };
const hook = (command, cwd = repo, fields = {}) => hookDecision({ tool_name: "Bash", tool_input: { command, ...fields }, cwd });
const blocked = (result) => result?.hookSpecificOutput?.permissionDecision === "deny";
const syncRemote = () => writeFileSync(join(root, "remote.json"), JSON.stringify(remote));
const publish = (branch = git(repo, "branch", "--show-current")) => {
  const sha = git(repo, "rev-parse", `refs/heads/${branch}`);
  remote.branches[branch] = sha; git(repo, "update-ref", `refs/remotes/origin/${branch}`, sha); syncRemote();
};
const FAKE_GH = `#!/usr/bin/env node
const fs = require('node:fs');
const args = process.argv.slice(2);
const data = JSON.parse(fs.readFileSync(process.env.GH_GATE_FIXTURE, 'utf8'));
if (args[0] === 'repo' && args[1] === 'view') process.stdout.write(JSON.stringify({url:data.url,defaultBranchRef:{name:data.defaultBranch}}));
else if (args[0] === 'api') {
  const branch = decodeURIComponent(args.at(-1).split('/heads/')[1] || '');
  if (!data.branches[branch]) { process.stderr.write('Not Found'); process.exit(1); }
  process.stdout.write(JSON.stringify({ref:'refs/heads/'+branch,object:{type:'commit',sha:data.branches[branch]}}));
} else if (args[0] === 'pr' && args[1] === 'view') process.stdout.write(JSON.stringify(data.pr));
else if (args[0] === 'pr' && ['create','ready'].includes(args[1])) fs.writeFileSync(process.env.GH_GATE_PUBLICATION, JSON.stringify(args));
else { process.stderr.write('Unexpected gh call: '+args.join(' ')); process.exit(1); }
`;

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), "changelog-gate-")); repo = join(root, "repo with spaces"); mkdirSync(repo);
  env = { ...process.env, GIT_CONFIG_GLOBAL: "/dev/null", GIT_CONFIG_NOSYSTEM: "1", GIT_AUTHOR_NAME: "Test", GIT_AUTHOR_EMAIL: "test@example.com", GIT_COMMITTER_NAME: "Test", GIT_COMMITTER_EMAIL: "test@example.com" };
  git(repo, "init", "-q", "-b", "main"); writeCommit("CHANGELOG.md", "# Changelog\n\n- Initial release.\n");
  git(repo, "remote", "add", "origin", "https://github.com/example/project.git"); git(repo, "update-ref", "refs/remotes/origin/main", "HEAD"); git(repo, "checkout", "-q", "-b", "codex/task");
  remote = { url: "https://github.com/example/project", defaultBranch: "main", branches: { main: git(repo, "rev-parse", "HEAD") } };
  oldEnvironment = { PATH: process.env.PATH, GH_REPO: process.env.GH_REPO, GH_HOST: process.env.GH_HOST, GH_GATE_FIXTURE: process.env.GH_GATE_FIXTURE, GH_GATE_PUBLICATION: process.env.GH_GATE_PUBLICATION };
  const bin = join(root, "bin"); mkdirSync(bin); writeFileSync(join(bin, "gh"), FAKE_GH); chmodSync(join(bin, "gh"), 0o755);
  Object.assign(process.env, { PATH: `${bin}:${process.env.PATH}`, GH_REPO: "", GH_HOST: "", GH_GATE_FIXTURE: join(root, "remote.json"), GH_GATE_PUBLICATION: join(root, "publication.json") });
  env = { ...env, PATH: process.env.PATH, GH_REPO: "", GH_HOST: "", GH_GATE_FIXTURE: process.env.GH_GATE_FIXTURE, GH_GATE_PUBLICATION: process.env.GH_GATE_PUBLICATION };
  publish();
});
afterEach(() => { for (const [key, value] of Object.entries(oldEnvironment)) { if (value === undefined) delete process.env[key]; else process.env[key] = value; } rmSync(root, { recursive: true, force: true }); });

test("only an empty draft bypasses changelog; ready and substantive drafts do not", () => {
  assert.equal(checkChangelog({ cwd: repo, allowEmptyDraft: true }).allowed, true);
  assert.equal(checkChangelog({ cwd: repo }).allowed, false);
  writeCommit("feature.txt", "feature\n"); assert.equal(checkChangelog({ cwd: repo, allowEmptyDraft: true }).allowed, false);
});

test("requires meaningful committed CHANGELOG diff and rejects whitespace-only edits", () => {
  writeCommit("feature.txt", "feature\n");
  writeFileSync(join(repo, "CHANGELOG.md"), "# Changelog\n\n- Feature.\n");
  assert.equal(checkChangelog({ cwd: repo }).allowed, false);
  git(repo, "add", "CHANGELOG.md"); assert.equal(checkChangelog({ cwd: repo }).allowed, false);
  git(repo, "commit", "-qm", "release note"); assert.equal(checkChangelog({ cwd: repo }).allowed, true);
  git(repo, "checkout", "-q", "-b", "codex/whitespace", "main"); writeCommit("CHANGELOG.md", "#  Changelog\n\n- Initial release.\n\n\n");
  assert.equal(checkChangelog({ cwd: repo }).allowed, false);
});

test("deleting CHANGELOG does not satisfy the gate", () => {
  git(repo, "rm", "-q", "CHANGELOG.md"); git(repo, "commit", "-qm", "remove");
  assert.equal(checkChangelog({ cwd: repo }).allowed, false);
});

test("removing old notes without adding a note does not satisfy the gate", () => {
  writeCommit("CHANGELOG.md", "# Changelog\n");
  assert.equal(checkChangelog({ cwd: repo }).allowed, false);
});

test("missing explicit base or head fails closed instead of falling back to HEAD", () => {
  assert.throws(() => checkChangelog({ cwd: repo, base: "missing" }));
  assert.throws(() => checkChangelog({ cwd: repo, head: "missing" }));
  assert.throws(() => checkChangelog({ cwd: repo, head: "--help" }));
});

test("base changes alone do not count as task release notes", () => {
  const old = git(repo, "rev-parse", "HEAD");
  git(repo, "checkout", "-q", "main"); writeCommit("CHANGELOG.md", "# Changelog\n\n- Upstream change.\n");
  git(repo, "update-ref", "refs/remotes/origin/main", "HEAD"); git(repo, "checkout", "-q", "codex/task"); writeCommit("feature.txt", "feature\n");
  assert.equal(checkChangelog({ cwd: repo }).allowed, false); assert.equal(git(repo, "merge-base", "HEAD", "origin/main"), old);
});

test("direct create handles explicit base/head/repo and rejects foreign repository refs", () => {
  writeCommit("CHANGELOG.md", "# Changelog\n\n- Task.\n");
  publish();
  assert.equal(checkGhPublication(["pr", "create", "--base=main", "--head=example:codex/task", "--repo", "example/project"], repo).allowed, true);
  assert.throws(() => checkGhPublication(["pr", "create", "--repo", "other/repo"], repo), /origin/);
  assert.throws(() => checkGhPublication(["pr", "create", "--head", "other:codex/task"], repo), /владельца/);
  assert.throws(() => checkGhPublication(["pr", "create", "--head", "missing"], repo));
});

test("ready checks the actual published head from gh, not the clean local branch", () => {
  const published = git(repo, "rev-parse", "HEAD"); writeCommit("CHANGELOG.md", "# Changelog\n\n- Only local.\n");
  const calls = [];
  remote.pr = { baseRefName: "main", headRefOid: published, headRefName: "codex/task", isCrossRepository: false }; syncRemote();
  const gh = (args) => { calls.push(args); return execFileSync("gh", args, { cwd: repo, env, encoding: "utf8" }); };
  assert.equal(checkGhPublication(["pr", "ready", "27"], repo, gh).allowed, false);
  assert.deepEqual(calls[1], ["pr", "view", "27", "--repo", "github.com/example/project", "--json", "baseRefName,headRefOid,headRefName,isCrossRepository"]);
  assert.equal(checkGhPublication(["pr", "ready", "27", "--undo"], repo, () => { throw new Error("must not query"); }).allowed, true);
});

test("quoted PR bodies and echo messages are not interpreted as publication commands", () => {
  assert.equal(hook("echo 'gh pr create --title fake'"), null);
  assert.equal(hook('git commit -m "gh pr ready"'), null);
  const parsed = publicationCommands("gh pr create --draft --body 'gh pr create --head other'", repo);
  assert.equal(parsed.length, 1); assert.deepEqual(parsed[0].args, ["pr", "create", "--draft", "--body", "gh pr create --head other"]);
  writeCommit("CHANGELOG.md", "# Changelog\n\n- Task done.\n");
  publish();
  assert.equal(hook("gh pr create --title T --body 'Fixes `$value` processing.\n\nValidation: `$HOME` stays literal; gh pr ready is documentation.'"), null);
  assert.equal(hook('gh pr create --title T --body "Literal \\$value"'), null);
});

test("hook guards every publication in a chain and preserves shell quoting", () => {
  writeCommit("feature.txt", "feature\n");
  assert.ok(blocked(hook("echo safe && gh pr create --title 'hello'")));
  assert.ok(blocked(hook("env GH_PROMPT_DISABLED=1 command gh pr create --title T")));
  assert.ok(blocked(hook("gh pr create --draft --title T; gh pr ready 2")));
});

test("hook resolves cd and explicit workdir to the selected worktree", () => {
  const worktree = join(root, "other worktree"); git(repo, "worktree", "add", "-q", "-b", "codex/other", worktree);
  writeCommit("CHANGELOG.md", "# Changelog\n\n- Another task.\n", worktree);
  publish("codex/other");
  writeCommit("feature.txt", "feature\n");
  assert.equal(hook(`cd '${worktree}' && gh pr create --title T`), null);
  assert.equal(hook("gh pr create --title T", repo, { workdir: worktree }), null);
  assert.ok(blocked(hook("cd missing && gh pr create --title T")));
  assert.ok(blocked(hook("cd $TASK_DIR && gh pr create --title T")));
});

test("hook resolves nested shell commands and excludes quoted data", () => {
  writeCommit("feature.txt", "feature\n");
  assert.ok(blocked(hook("bash -lc 'gh pr create --title T'")));
  assert.equal(hook("printf '%s' 'gh pr create --title T'"), null);
  assert.ok(blocked(hook("gh pr create --head $BRANCH")));
  assert.ok(blocked(hook('echo "$(gh pr create --title T)"')));
  assert.equal(hook("echo '$(gh pr create --title T)'"), null);
});

test("hook emits the supported Codex deny JSON and unknown refs are denied", () => {
  writeCommit("feature.txt", "feature\n");
  const result = spawnSync(process.execPath, [SCRIPT, "--hook"], { cwd: repo, env, encoding: "utf8", input: JSON.stringify({ cwd: repo, tool_input: { command: "gh pr create --head missing" } }) });
  assert.equal(result.status, 0, result.stderr); const json = JSON.parse(result.stdout);
  assert.equal(json.hookSpecificOutput.hookEventName, "PreToolUse"); assert.equal(json.hookSpecificOutput.permissionDecision, "deny");
  assert.ok(!("continue" in json));
});

test("guarded gh wrapper blocks before gh execution and passes literal flags after success", () => {
  const log = env.GH_GATE_PUBLICATION;
  const options = { cwd: repo, env, encoding: "utf8" };
  writeCommit("feature.txt", "feature\n"); assert.equal(spawnSync(process.execPath, [WRAPPER, "create", "--title", "T"], options).status, 1); assert.equal(existsSync(log), false);
  writeCommit("CHANGELOG.md", "# Changelog\n\n- Task done.\n");
  publish();
  const title = 'Literal $(echo x) `echo y`'; const result = spawnSync(process.execPath, [WRAPPER, "create", "--title", title], options);
  assert.equal(result.status, 0, result.stderr); assert.deepEqual(JSON.parse(readFileSync(log, "utf8")), ["pr", "create", "--title", title, "--repo", "github.com/example/project", "--base", "main", "--head", "codex/task"]);
});

test("arity-aware parsing consumes flag-looking strings and keeps the last repeated value", () => {
  const parsed = parseGhPublicationArgs(["pr", "create", "--title", "--head=codex/good", "--body", "--base=good", "--head", "codex/first", "-Hcodex/bad", "-Bmain", "--base=release", "-Rexample/project", "--repo", "github.com/example/project", "--draft", "--draft=false"]);
  assert.equal(parsed.values.title, "--head=codex/good"); assert.equal(parsed.values.body, "--base=good");
  assert.equal(parsed.values.head, "codex/bad"); assert.equal(parsed.values.base, "release"); assert.equal(parsed.values.draft, false);
  assert.equal(parsed.values.repo, "github.com/example/project");
  assert.equal(parseGhPublicationArgs(["pr", "create", "-df", "-H=codex/task"]).values.head, "codex/task");
  assert.throws(() => parseGhPublicationArgs(["pr", "create", "--unknown", "value"]), /Неподдерживаемый/);
});

test("flag-shaped title and repeated head cannot substitute a good branch for the published bad one", () => {
  writeCommit("feature.txt", "bad branch\n"); publish();
  git(repo, "branch", "codex/bad"); publish("codex/bad");
  git(repo, "checkout", "-q", "-b", "codex/good"); writeCommit("CHANGELOG.md", "# Changelog\n\n- Good branch.\n"); publish();
  for (const args of [
    ["pr", "create", "--title", "--head=codex/good", "--head", "codex/bad"],
    ["pr", "create", "--head", "codex/good", "--head", "codex/bad"],
    ["pr", "create", "-Hcodex/good", "-Hcodex/bad"],
    ["pr", "create", "--body", "--draft", "--head", "codex/bad"],
  ]) assert.equal(checkGhPublication(args, repo).allowed, false);
});

test("effective GH_REPO is checked and explicit repo overrides it with real gh precedence", () => {
  writeCommit("CHANGELOG.md", "# Changelog\n\n- Task.\n"); publish();
  process.env.GH_REPO = "other/project";
  assert.throws(() => checkGhPublication(["pr", "create"], repo), /GH_REPO.*origin/);
  assert.equal(checkGhPublication(["pr", "create", "--repo=https://github.com/example/project.git"], repo).allowed, true);
  const result = spawnSync(process.execPath, [WRAPPER, "create", "--title", "T"], { cwd: repo, env: { ...env, GH_REPO: "other/project" }, encoding: "utf8" });
  assert.equal(result.status, 1); assert.equal(existsSync(env.GH_GATE_PUBLICATION), false);
  process.env.GH_REPO = "";
  for (const command of ["GH_REPO=other/project gh pr create", "env GH_REPO=other/project gh pr create", "export GH_REPO=other/project; gh pr create", "GH_REPO=other/project; gh pr create"]) assert.ok(blocked(hook(command)));
  assert.ok(blocked(hook("env command env GH_REPO=other/project gh pr create")));
  assert.equal(hook("GH_REPO=other/project gh pr create --repo example/project"), null);
  assert.ok(blocked(hook("gh pr --repo other/project create --head codex/task")));
  assert.equal(hook("gh pr --repo example/project create --head codex/task"), null);
  assert.ok(blocked(hook("export GH_REPO=other/project; (unset GH_REPO); gh pr create --head codex/task")));
  assert.equal(hook("(export GH_REPO=other/project); gh pr create --head codex/task"), null);
  assert.ok(blocked(hook("export GH_REPO=other/project; unset GH_REPO | cat; gh pr create --head codex/task")));
});

test("remote URL and gh-selected default repository identities must match origin", () => {
  assert.equal(repositoryIdentity("git@github.com:Example/Project.git").fullName, "github.com/example/project");
  assert.equal(repositoryIdentity("ssh://git@github.com/Example/Project.git").fullName, "github.com/example/project");
  assert.equal(repositoryIdentity("https://github.com/Example/Project/").fullName, "github.com/example/project");
  assert.throws(() => repositoryIdentity("https://github.com/Example/Project/pull/1"));
  remote.url = "https://github.com/other/project"; syncRemote();
  assert.throws(() => checkGhPublication(["pr", "create", "--draft"], repo), /выбранный gh/);
});

test("explicit head checks actual published SHA and never accepts unpushed local changelog", () => {
  writeCommit("feature.txt", "published without note\n"); publish();
  writeCommit("CHANGELOG.md", "# Changelog\n\n- Local only.\n");
  assert.throws(() => checkGhPublication(["pr", "create", "--head", "codex/task"], repo), /Опубликованный HEAD не совпадает/);
  assert.ok(blocked(hook("gh pr create --head codex/task")));
  const result = spawnSync(process.execPath, [WRAPPER, "create", "--head", "codex/task"], { cwd: repo, env, encoding: "utf8" });
  assert.equal(result.status, 1); assert.equal(existsSync(env.GH_GATE_PUBLICATION), false);
  publish(); assert.equal(checkGhPublication(["pr", "create", "--head", "codex/task"], repo).allowed, true);
  delete remote.branches["codex/task"]; syncRemote(); assert.throws(() => checkGhPublication(["pr", "create", "--head", "codex/task"], repo));
});

test("default base follows branch gh-merge-base then live repository default, never local main", () => {
  writeCommit("CHANGELOG.md", "# Changelog\n\n- Already in release.\n"); publish();
  git(repo, "branch", "release"); publish("release");
  writeCommit("feature.txt", "new change without note\n"); publish();
  assert.equal(checkGhPublication(["pr", "create", "--base", "main"], repo).allowed, true);
  git(repo, "config", "branch.codex/task.gh-merge-base", "release");
  assert.equal(checkGhPublication(["pr", "create"], repo).allowed, false);
  assert.equal(checkGhPublication(["pr", "create", "--head", "codex/task"], repo).baseName, "release");
  git(repo, "config", "--unset", "branch.codex/task.gh-merge-base"); remote.defaultBranch = "release"; syncRemote();
  assert.equal(checkGhPublication(["pr", "create"], repo).allowed, false);
  assert.ok(blocked(hook("gh pr create")));
});

test("live base SHA is used even when local origin base ref is stale", () => {
  writeCommit("CHANGELOG.md", "# Changelog\n\n- Already published base note.\n"); publish();
  remote.branches.main = git(repo, "rev-parse", "HEAD"); syncRemote();
  writeCommit("feature.txt", "new change without note\n"); publish();
  assert.equal(checkGhPublication(["pr", "create", "--head", "codex/task", "--base", "main"], repo).allowed, false);
});

test("ambiguous implicit tracking or push remote requires explicit published head", () => {
  writeCommit("CHANGELOG.md", "# Changelog\n\n- Task.\n"); publish();
  git(repo, "config", "branch.codex/task.merge", "refs/heads/renamed");
  assert.throws(() => checkGhPublication(["pr", "create"], repo), /переименована/);
  assert.equal(checkGhPublication(["pr", "create", "--head", "codex/task"], repo).allowed, true);
  git(repo, "config", "--unset", "branch.codex/task.merge"); git(repo, "remote", "add", "fork", "https://github.com/other/project.git");
  assert.throws(() => checkGhPublication(["pr", "create"], repo), /Неоднозначный remote/);
});

test("boolean flags use their final values and ready PR URL cannot escape origin", () => {
  assert.equal(checkGhPublication(["pr", "create", "--draft=true"], repo).allowed, true);
  assert.equal(checkGhPublication(["pr", "create", "--draft", "--draft=false"], repo).allowed, false);
  remote.pr = { baseRefName: "main", headRefName: "codex/task", headRefOid: git(repo, "rev-parse", "HEAD"), isCrossRepository: false }; syncRemote();
  assert.equal(checkGhPublication(["pr", "ready", "27", "--undo", "--undo=false"], repo).allowed, false);
  assert.throws(() => checkGhPublication(["pr", "ready", "https://github.com/other/project/pull/27"], repo), /PR URL/);
});

test("CI uses explicit commits, reacts to readiness and runs outside path filters", () => {
  const ci = readFileSync(join(ROOT, ".github", "workflows", "ci.yml"), "utf8");
  assert.match(ci, /ready_for_review/); assert.match(ci, /name: Changelog gate/); assert.match(ci, /PR_BASE_SHA:.*pull_request.base.sha/); assert.match(ci, /PR_HEAD_SHA:.*pull_request.head.sha/);
  const job = ci.slice(ci.indexOf("  changelog:"), ci.indexOf("  changes:")); assert.doesNotMatch(job, /needs:|if:.*changes/); assert.match(job, /changelog-gate.mjs/);
});
