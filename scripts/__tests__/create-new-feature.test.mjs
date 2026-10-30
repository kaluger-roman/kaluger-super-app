// Fixture-based test for .specify/scripts/bash/create-new-feature.sh. Run: node --test scripts/__tests__/
// A temp clone of a temp bare "origin" plays the repo; the script runs in the clone, so it picks the next
// feature number from the clone's specs/ and from the branches it sees after `git fetch --all`.
import { test, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const SCRIPT = join(
  dirname(dirname(dirname(fileURLToPath(import.meta.url)))),
  ".specify",
  "scripts",
  "bash",
  "create-new-feature.sh",
);

let root;
let origin;
let clone;
let env;

const git = (cwd, ...args) => execFileSync("git", args, { cwd, env, stdio: "ignore" });

const run = (args) => spawnSync("bash", [SCRIPT, ...args], { cwd: clone, env, encoding: "utf8" });

const currentBranch = () =>
  execFileSync("git", ["branch", "--show-current"], { cwd: clone, env, encoding: "utf8" }).trim();

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), "create-new-feature-"));
  origin = join(root, "origin.git");
  clone = join(root, "clone");
  const seed = join(root, "seed");
  env = {
    ...process.env,
    GIT_AUTHOR_NAME: "t",
    GIT_AUTHOR_EMAIL: "t@t",
    GIT_COMMITTER_NAME: "t",
    GIT_COMMITTER_EMAIL: "t@t",
  };
  git(root, "init", "-q", "--bare", "-b", "main", origin);
  mkdirSync(join(seed, "specs", "039-old-feature"), { recursive: true });
  writeFileSync(join(seed, "specs", "039-old-feature", "spec.md"), "spec\n");
  git(seed, "init", "-q", "-b", "main");
  git(seed, "add", ".");
  git(seed, "commit", "-q", "-m", "first commit");
  git(seed, "remote", "add", "origin", origin);
  git(seed, "push", "-q", "origin", "main");
  git(root, "clone", "-q", origin, clone);
  // Pushed after the clone, so the clone learns about it only through the script's fetch.
  git(seed, "push", "-q", "origin", "main:041-parallel-feature");
});

afterEach(() => {
  rmSync(root, { recursive: true, force: true });
});

test("without --number takes the next number after the fetched branches and specs", () => {
  const result = run(["--json", "--short-name", "new-thing", "Новая штука"]);

  assert.equal(result.status, 0, result.stderr);
  const out = JSON.parse(result.stdout);
  assert.equal(out.BRANCH_NAME, "042-new-thing");
  assert.equal(out.FEATURE_NUM, "042");
  assert.equal(currentBranch(), "042-new-thing");
  assert.ok(existsSync(join(clone, "specs", "042-new-thing", "spec.md")));
});

test("--number skips the lookup", () => {
  const result = run(["--json", "--short-name", "new-thing", "--number", "7", "Новая штука"]);

  assert.equal(result.status, 0, result.stderr);
  assert.equal(JSON.parse(result.stdout).BRANCH_NAME, "007-new-thing");
});
