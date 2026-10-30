// Fixture-based test for scripts/repo-git.sh. Run: node --test scripts/__tests__/
// A temp repo with a worktree plays the dev machine. `findmnt` is a stub that reports an sshfs mount of
// that repo at a separate "mount" directory, and `ssh` is a stub that logs its arguments and runs the
// remote command locally, so the remote path is taken without a network.
import { test, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { chmodSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const SCRIPT = join(dirname(dirname(fileURLToPath(import.meta.url))), "repo-git.sh");

const FAKE_FINDMNT = `#!/usr/bin/env bash
if [ "$1" = "-s" ]; then
  echo "_netdev,IdentityFile=$FAKE_KEY,reconnect"
  exit 0
fi
case "$6" in
  "$FAKE_MOUNT" | "$FAKE_MOUNT"/*)
    echo "autofs systemd-1 $FAKE_MOUNT"
    echo "fuse.sshfs dev@devbox:$FAKE_REMOTE $FAKE_MOUNT"
    ;;
  *) echo "ext4 /dev/sda1 /" ;;
esac
`;

const FAKE_SSH = `#!/usr/bin/env bash
printf '%s\\n' "$@" > "$SSH_LOG"
exec bash -c "\${@: -1}"
`;

let root;
let repo;
let mount;
let env;

const git = (cwd, ...args) => execFileSync("git", args, { cwd, env, stdio: "ignore" });

const run = (args, cwd = root) => spawnSync("bash", [SCRIPT, ...args], { cwd, env, encoding: "utf8" });

const sshArgs = () => readFileSync(env.SSH_LOG, "utf8").trim().split("\n");

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), "repo-git-"));
  repo = join(root, "remote", "repo");
  mount = join(root, "mount");
  const bin = join(root, "bin");
  mkdirSync(repo, { recursive: true });
  mkdirSync(join(mount, ".claude", "worktrees", "wt"), { recursive: true });
  mkdirSync(bin);
  writeFileSync(join(bin, "findmnt"), FAKE_FINDMNT);
  writeFileSync(join(bin, "ssh"), FAKE_SSH);
  chmodSync(join(bin, "findmnt"), 0o755);
  chmodSync(join(bin, "ssh"), 0o755);
  env = {
    ...process.env,
    PATH: `${bin}:${process.env.PATH}`,
    FAKE_MOUNT: mount,
    FAKE_REMOTE: repo,
    FAKE_KEY: "/keys/id_agent",
    SSH_LOG: join(root, "ssh.log"),
    GIT_AUTHOR_NAME: "t",
    GIT_AUTHOR_EMAIL: "t@t",
    GIT_COMMITTER_NAME: "t",
    GIT_COMMITTER_EMAIL: "t@t",
  };
  git(repo, "init", "-q", "-b", "main");
  writeFileSync(join(repo, "a.txt"), "a\n");
  git(repo, "add", "a.txt");
  git(repo, "commit", "-q", "-m", "first commit");
  git(repo, "worktree", "add", "-q", join(".claude", "worktrees", "wt"), "-b", "feat");
});

afterEach(() => {
  rmSync(root, { recursive: true, force: true });
});

test("outside an sshfs mount runs git locally in -C dir", () => {
  const result = run(["-C", join(repo, ".claude", "worktrees", "wt"), "branch", "--show-current"]);
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stdout.trim(), "feat");
  assert.equal(existsSync(env.SSH_LOG), false);
});

test("a worktree under the mount runs git over ssh in the mapped remote dir", () => {
  const result = run(["-C", join(mount, ".claude", "worktrees", "wt"), "branch", "--show-current"]);
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stdout.trim(), "feat");
  const args = sshArgs();
  assert.deepEqual(args.slice(0, 6), ["-o", "BatchMode=yes", "-i", "/keys/id_agent", "-o", "IdentitiesOnly=yes"]);
  assert.equal(args[6], "dev@devbox");
});

test("without -C uses the cwd, relative -C resolves against it", () => {
  const fromCwd = run(["branch", "--show-current"], mount);
  assert.equal(fromCwd.stdout.trim(), "main", fromCwd.stderr);
  const relative = run(["-C", join(".claude", "worktrees", "wt"), "branch", "--show-current"], mount);
  assert.equal(relative.stdout.trim(), "feat", relative.stderr);
});

test("arguments with spaces and quotes reach remote git intact", () => {
  const result = run(["-C", mount, "log", "-1", `--format=%s | "x" 'y' $HOME`]);
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stdout.trim(), `first commit | "x" 'y' $HOME`);
});

test("the remote git exit code is passed through", () => {
  writeFileSync(join(repo, "a.txt"), "changed\n");
  assert.equal(run(["-C", mount, "diff", "--quiet"]).status, 1);
  assert.equal(run(["-C", join(mount, ".claude", "worktrees", "wt"), "diff", "--quiet"]).status, 0);
});

test("-C without a directory fails", () => {
  const result = run(["-C"]);
  assert.equal(result.status, 2);
  assert.match(result.stderr, /-C needs a directory/);
});
