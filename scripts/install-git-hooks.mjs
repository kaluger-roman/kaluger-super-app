#!/usr/bin/env node
// Enables the committed hooks in .githooks/ for the main checkout and every worktree.
// Runs as the root `prepare` script, i.e. on `npm install` at the repo root.
//
// Each hook gets a dispatcher in the shared hooks dir (`git rev-parse --git-path hooks`).
// Git starts pre-commit at the root of the worktree being committed, so the dispatcher runs
// that tree's own .githooks/<hook>: every branch uses its own hook version, and branches
// without .githooks/ are left alone.
//
// core.hooksPath is deliberately not pointed at .githooks/: when Claude Code creates a
// worktree it rewrites a relative hooksPath to the main checkout's absolute path, which would
// make every worktree run the main checkout's copy.

import { execFileSync } from "node:child_process";
import {
  chmodSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  realpathSync,
  writeFileSync,
} from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const MARKER = "# Installed by scripts/install-git-hooks.mjs";

export const dispatcherScript = (hook) =>
  ["#!/bin/sh", MARKER, `[ -x .githooks/${hook} ] || exit 0`, `exec .githooks/${hook} "$@"`, ""].join("\n");

export const isDispatcher = (content) => content.includes(MARKER);

const repoRoot = dirname(dirname(fileURLToPath(import.meta.url)));

const resolveHooksDir = () => {
  try {
    const out = execFileSync("git", ["rev-parse", "--git-path", "hooks"], {
      cwd: repoRoot,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    });
    return resolve(repoRoot, out.trim());
  } catch {
    return null;
  }
};

const main = () => {
  const hooksDir = resolveHooksDir();
  if (!hooksDir) {
    console.log("install-git-hooks: not a git checkout, skipped");
    return;
  }
  const sourceDir = join(repoRoot, ".githooks");
  if (hooksDir === sourceDir) {
    console.log("install-git-hooks: core.hooksPath already points at .githooks/, nothing to do");
    return;
  }
  mkdirSync(hooksDir, { recursive: true });
  for (const hook of readdirSync(sourceDir).filter((name) => !name.includes("."))) {
    const target = join(hooksDir, hook);
    if (existsSync(target) && !isDispatcher(readFileSync(target, "utf8"))) {
      console.warn(`install-git-hooks: ${target} already exists and was left as is — .githooks/${hook} will not run`);
      continue;
    }
    writeFileSync(target, dispatcherScript(hook));
    chmodSync(target, 0o755);
    console.log(`install-git-hooks: ${target} -> .githooks/${hook}`);
  }
};

// realpath: argv[1] keeps symlinks (macOS /var -> /private/var), import.meta.url does not.
if (process.argv[1] && realpathSync(process.argv[1]) === fileURLToPath(import.meta.url)) main();
