// Unit tests for scripts/check.mjs. Run: node --test scripts/__tests__/
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import {
  detectParts,
  formatDuration,
  parseArgs,
  planChecks,
  planTests,
  runChecks,
  tailLines,
} from "../check.mjs";

test("parseArgs reads the flags and rejects unknown ones", () => {
  assert.deepEqual(parseArgs([]), { full: false, all: false, base: "origin/main", backendTests: null });
  assert.deepEqual(parseArgs(["--full", "--all", "--base", "HEAD~1", "--backend-tests", "npm"]), {
    full: true,
    all: true,
    base: "HEAD~1",
    backendTests: "npm",
  });
  assert.throws(() => parseArgs(["--fast"]), /Unknown argument/);
  assert.throws(() => parseArgs(["--backend-tests", "docker"]), /npm or dev-stack/);
});

test("detectParts keeps only the parts the changes touch", () => {
  assert.deepEqual(detectParts(["frontend/src/a.ts", "docs/x.md"]), ["frontend"]);
  assert.deepEqual(detectParts(["backend/src/b.ts", "frontend/e2e/c.spec.ts"]), ["frontend", "backend"]);
  assert.deepEqual(detectParts(["CHANGELOG.md"]), []);
});

test("planTests runs related tests for source changes and the full suite for config changes", () => {
  assert.deepEqual(planTests("frontend", ["frontend/src/app/a.ts", "backend/src/b.ts"], false), {
    scope: "related",
    files: ["src/app/a.ts"],
  });
  assert.deepEqual(planTests("frontend", ["frontend/vitest.config.ts"], false), { scope: "full", files: [] });
  assert.deepEqual(planTests("backend", ["backend/prisma/schema.prisma"], false), { scope: "full", files: [] });
  assert.deepEqual(planTests("frontend", ["frontend/src/a.ts"], true), { scope: "full", files: [] });
  assert.equal(planTests("frontend", ["frontend/e2e/a.spec.ts"], false), null);
});

test("planChecks lists every check of a part and formats only changed files", () => {
  const checks = planChecks({
    parts: ["frontend", "backend"],
    changed: ["frontend/src/a.tsx", "backend/src/b.ts"],
    full: false,
    backendTests: "dev-stack",
  });
  assert.deepEqual(
    checks.map((check) => check.name),
    [
      "frontend:tsc",
      "frontend:eslint",
      "frontend:prettier",
      "frontend:tests (related)",
      "backend:tsc",
      "backend:eslint",
      "backend:prettier",
      "backend:tests (related)",
    ]
  );
  const byName = Object.fromEntries(checks.map((check) => [check.name, check]));
  assert.deepEqual(byName["frontend:prettier"].args.slice(-1), ["src/a.tsx"]);
  assert.deepEqual(byName["frontend:tests (related)"].args, ["vitest", "related", "--run", "src/a.tsx"]);
  assert.deepEqual(byName["backend:tests (related)"], {
    name: "backend:tests (related)",
    cwd: ".",
    cmd: "bash",
    args: ["scripts/dev-stack.sh", "test-backend", "--findRelatedTests", "src/b.ts"],
  });
});

test("planChecks skips prettier and tests when nothing in a part needs them", () => {
  const names = planChecks({
    parts: ["backend"],
    changed: ["backend/README.md"],
    full: false,
    backendTests: "npm",
  }).map((check) => check.name);
  assert.deepEqual(names, ["backend:tsc", "backend:eslint"]);
});

test("planChecks with --full checks everything with npm tests", () => {
  const checks = planChecks({ parts: ["backend"], changed: [], full: true, backendTests: "npm" });
  const tests = checks.find((check) => check.name === "backend:tests (full)");
  assert.deepEqual(tests, { name: "backend:tests (full)", cwd: "backend", cmd: "npm", args: ["test", "--"] });
  assert.deepEqual(checks.find((check) => check.name === "backend:prettier").args.slice(-1), ["src"]);
});

test("runChecks runs the checks at the same time and reports each result", async () => {
  const logDir = mkdtempSync(join(tmpdir(), "check-test-"));
  try {
    const sleep = (ms, code) => ({
      cmd: process.execPath,
      args: ["-e", `console.log("out"); setTimeout(() => process.exit(${code}), ${ms})`],
      cwd: ".",
    });
    const started = Date.now();
    const results = await runChecks(
      [
        { name: "a:ok", ...sleep(400, 0) },
        { name: "b:fails", ...sleep(400, 2) },
      ],
      { root: process.cwd(), logDir }
    );
    const elapsed = Date.now() - started;

    assert.ok(elapsed < 750, `took ${elapsed} ms, so the checks did not run in parallel`);
    const byName = Object.fromEntries(results.map((result) => [result.name, result]));
    assert.equal(byName["a:ok"].ok, true);
    assert.equal(byName["b:fails"].ok, false);
    assert.match(readFileSync(byName["b:fails"].log, "utf8"), /out/);
  } finally {
    rmSync(logDir, { recursive: true, force: true });
  }
});

test("runChecks reports a command that cannot start as failed", async () => {
  const logDir = mkdtempSync(join(tmpdir(), "check-test-"));
  try {
    const [result] = await runChecks([{ name: "x:missing", cmd: "no-such-command-xyz", args: [], cwd: "." }], {
      root: process.cwd(),
      logDir,
    });
    assert.equal(result.ok, false);
  } finally {
    rmSync(logDir, { recursive: true, force: true });
  }
});

test("formatDuration and tailLines format the summary", () => {
  assert.equal(formatDuration(1234), "1.2s");
  assert.equal(tailLines("a\nb\nc\n", 2), "b\nc");
});
