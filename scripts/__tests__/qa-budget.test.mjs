// Fixture-based test for scripts/qa-budget.mjs. Run: node --test scripts/__tests__/
import { test, before, after, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, writeFileSync, rmSync, utimesSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const SCRIPT = join(dirname(dirname(fileURLToPath(import.meta.url))), "qa-budget.mjs");

let root;
let dumpPath;
let statePath;

const writeDump = (usedPercentage, resetsAt) =>
  writeFileSync(
    dumpPath,
    JSON.stringify({ rate_limits: { five_hour: { used_percentage: usedPercentage, resets_at: resetsAt } } })
  );

const run = (...args) => {
  const out = execFileSync(
    "node",
    [SCRIPT, ...args, "--source", dumpPath, "--state", statePath],
    { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }
  );
  return JSON.parse(out);
};

before(() => {
  root = mkdtempSync(join(tmpdir(), "qa-budget-"));
  dumpPath = join(root, "statusline-dump.json");
});

beforeEach(() => {
  statePath = join(root, `state-${Math.random().toString(36).slice(2)}.json`);
});

after(() => rmSync(root, { recursive: true, force: true }));

test("start records the baseline and returns continue", () => {
  writeDump(37, 1788740400);
  const r = run("start", "--budget", "20%");
  assert.equal(r.verdict, "continue");
  assert.equal(r.budgetPct, 20);
  assert.equal(r.spentPct, 0);
  assert.equal(r.fiveHourUsedPct, 37);
});

test("check under budget → continue with spent delta", () => {
  writeDump(37, 1788740400);
  run("start", "--budget", "20%");
  writeDump(45, 1788740400);
  const r = run("check");
  assert.equal(r.verdict, "continue");
  assert.equal(r.spentPct, 8);
  assert.equal(r.remainingPct, 12);
});

test("check at/over budget → stop", () => {
  writeDump(10, 1788740400);
  run("start", "--budget", "15%");
  writeDump(25, 1788740400);
  const r = run("check");
  assert.equal(r.verdict, "stop");
  assert.equal(r.reason, "budget reached");
});

test("window reset mid-run carries accumulated spend", () => {
  writeDump(80, 1788740400);
  run("start", "--budget", "25%");
  writeDump(90, 1788740400);
  assert.equal(run("check").spentPct, 10);
  writeDump(5, 1788758400);
  const r = run("check");
  assert.equal(r.spentPct, 15); // 10 carried from the old window + 5 in the new one
  assert.equal(r.verdict, "continue");
});

test("missing rate_limits → stop with reason", () => {
  writeFileSync(dumpPath, JSON.stringify({ context_window: {} }));
  const r = run("start", "--budget", "20%");
  assert.equal(r.verdict, "stop");
  assert.match(r.reason, /five_hour is missing/);
});

test("stale dump → stop", () => {
  writeDump(10, 1788740400);
  const old = (Date.now() - 20 * 60 * 1000) / 1000;
  utimesSync(dumpPath, old, old);
  const r = run("check");
  assert.equal(r.verdict, "stop");
  assert.match(r.reason, /stale/);
});

test("non-percent budget spec → stop", () => {
  writeDump(10, 1788740400);
  const r = run("start", "--budget", "300k");
  assert.equal(r.verdict, "stop");
  assert.match(r.reason, /must be a percent/);
});
