import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

const poll = fileURLToPath(new URL("../production/poll-deploy.sh", import.meta.url));
const sha = "a".repeat(40);
const repository = "kaluger-roman/kaluger-super-app";
const run = {
  id: 712,
  run_attempt: 3,
  head_branch: "main",
  head_repository: { full_name: repository },
  head_sha: sha,
  event: "push",
};
const readyJob = { name: "Deploy on home", status: "in_progress", head_sha: sha };

const fixture = (t, { runs = [run], jobs = [readyJob], main = sha, unhealthy = false } = {}) => {
  const root = mkdtempSync(join(tmpdir(), "home-poll-"));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const bin = join(root, "bin");
  const runtime = join(root, "runtime");
  const deploy = join(runtime, "deploy");
  mkdirSync(join(deploy, "repo.git", "objects"), { recursive: true });
  copyFileSync(new URL("../production/github-deploy.sh", import.meta.url), join(deploy, "github-deploy.sh"));
  mkdirSync(bin);
  writeFileSync(join(runtime, "compose.env"), "PROD_PORT=8081\n");
  writeFileSync(join(root, "runs"), JSON.stringify({ workflow_runs: runs }));
  writeFileSync(join(root, "jobs"), JSON.stringify({ jobs }));
  const script = (path, body) => writeFileSync(path, "#!/usr/bin/env bash\n" + body, { mode: 0o700 });
  script(join(bin, "flock"), "exit 0\n");
  script(join(bin, "timeout"), 'shift; exec "$@"\n');
  script(join(bin, "curl"), [
    'case "$*" in',
    '  *127.0.0.1:8081/health) [[ $UNHEALTHY == false ]] ;;',
    '  *"/actions/workflows/deploy.yml/runs?branch=main&status=in_progress&per_page=1") cat "$TEST_ROOT/runs" ;;',
    '  *"/actions/runs/712/attempts/3/jobs?per_page=50") cat "$TEST_ROOT/jobs" ;;',
    '  *) exit 6 ;;',
    'esac',
  ].join("\n"));
  script(join(bin, "git"), [
    'case "$*" in',
    '  *"rev-parse refs/kaluger/main") printf "%s\\n" "$MAIN_SHA" ;;',
    '  *"config remote.origin.url https://github.com/kaluger-roman/kaluger-super-app.git") ;;',
    '  *"fetch -q --depth=1 --no-tags origin +refs/heads/main:refs/kaluger/main") ;;',
    '  *) exit 6 ;;',
    'esac',
  ].join("\n"));
  script(join(bin, "docker"), [
    'if [[ $1 == inspect ]]; then echo healthy; exit; fi',
    'echo compose >>"$TEST_ROOT/docker-calls"',
    'exit 1',
  ].join("\n"));
  script(join(deploy, "deploy-release.sh"), 'printf "%s\\n" "$3" >>"$TEST_ROOT/releases"\n');
  const pollOnce = () => {
    const result = spawnSync("bash", [poll, runtime], {
      encoding: "utf8",
      timeout: 10_000,
      env: {
        ...process.env,
        PATH: bin + ":" + process.env.PATH,
        TEST_ROOT: root,
        MAIN_SHA: main,
        UNHEALTHY: String(unhealthy),
      },
    });
    assert.equal(result.status, 0, result.stderr || String(result.error ?? ""));
  };
  return { root, deploy, pollOnce };
};

test("a ready job deploys the exact current main revision once per attempt", (t) => {
  const { root, deploy, pollOnce } = fixture(t);
  pollOnce();
  pollOnce();
  assert.equal(readFileSync(join(root, "releases"), "utf8"), sha + "\n");
  assert.equal(readFileSync(join(deploy, "last-attempt"), "utf8"), "712/3\n");
});

for (const [reason, options] of [
  ["the build has not started the deploy job", { jobs: [{ ...readyJob, status: "queued" }] }],
  ["the job belongs to another revision", { jobs: [{ ...readyJob, head_sha: "c".repeat(40) }] }],
  ["the workflow is from a different repository", { runs: [{ ...run, head_repository: { full_name: "fork/example" } }] }],
  ["the workflow is a pull request", { runs: [{ ...run, event: "pull_request" }] }],
  ["main advanced after the workflow started", { main: "b".repeat(40) }],
]) {
  test("no release when " + reason, (t) => {
    const { root, deploy, pollOnce } = fixture(t, options);
    pollOnce();
    assert.equal(existsSync(join(root, "releases")), false);
    assert.equal(existsSync(join(deploy, "last-attempt")), false);
  });
}

test("a failed web repair still permits a newer deploy job", (t) => {
  const { root, pollOnce } = fixture(t, { unhealthy: true });
  pollOnce();
  assert.equal(readFileSync(join(root, "docker-calls"), "utf8"), "compose\n");
  assert.equal(readFileSync(join(root, "releases"), "utf8"), sha + "\n");
});

test("an interrupted cutover does not start web from the previous release", (t) => {
  const { root, deploy, pollOnce } = fixture(t, { unhealthy: true });
  writeFileSync(join(deploy, "cutover"), sha + "\n");
  pollOnce();
  assert.equal(existsSync(join(root, "docker-calls")), false);
  assert.equal(readFileSync(join(root, "releases"), "utf8"), sha + "\n");
});
