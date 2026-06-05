// Fixture-based test for scripts/qa-token-usage.mjs. Run: node --test scripts/__tests__/
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const SCRIPT = join(dirname(dirname(fileURLToPath(import.meta.url))), "qa-token-usage.mjs");

let root;
let projectsDir;

const usageLine = (timestamp, usage) =>
  JSON.stringify({ type: "assistant", timestamp, message: { role: "assistant", usage } });

before(() => {
  root = mkdtempSync(join(tmpdir(), "qa-tok-"));
  projectsDir = join(root, "projects");
  mkdirSync(join(projectsDir, "proj1"), { recursive: true });

  const lines = [
    usageLine("2026-06-06T10:00:00.000Z", { input_tokens: 100, output_tokens: 50 }),
    usageLine("2026-06-06T10:05:00.000Z", {
      input_tokens: 200,
      output_tokens: 100,
      cache_creation_input_tokens: 1000,
      cache_read_input_tokens: 500,
    }),
    usageLine("2026-06-06T12:00:00.000Z", { input_tokens: 1000, output_tokens: 1000 }),
    JSON.stringify({ type: "user", timestamp: "2026-06-06T10:01:00.000Z", message: { role: "user" } }),
    "{ this is not valid json",
  ];
  writeFileSync(join(projectsDir, "proj1", "session.jsonl"), lines.join("\n") + "\n");
});

after(() => rmSync(root, { recursive: true, force: true }));

const run = (...args) => {
  const out = execFileSync("node", [SCRIPT, "--projects-dir", projectsDir, ...args], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "ignore"],
  });
  return JSON.parse(out);
};

// Fixture, single 5h block. billed (default, excludes cache_read): E1=150, E2=1300,
// E3=2000 → 3450. io: 150/300/2000 → 2450. total (incl cache_read): 150/1800/2000 → 3950.

test("absolute budget not reached → continue", () => {
  const r = run("--since", "2026-06-06T10:04:00.000Z", "--budget", "6000");
  assert.equal(r.spentSinceStart, 3300); // E2 + E3 billed
  assert.equal(r.verdict, "continue");
  assert.equal(r.remainingTokens, 2700);
});

test("absolute budget reached → stop", () => {
  const r = run("--since", "2026-06-06T10:04:00.000Z", "--budget", "1000");
  assert.equal(r.verdict, "stop");
  assert.equal(r.reason, "token budget reached");
});

test("percent budget with overridden limit", () => {
  const r = run("--since", "2026-06-06T00:00:00.000Z", "--limit", "10000", "--budget", "20%");
  assert.equal(r.budgetTokens, 2000);
  assert.equal(r.spent, 3450); // billed
  assert.equal(r.verdict, "stop");
  assert.equal(r.limitSource, "override");
});

test("auto-detects limit from the largest historical block", () => {
  const r = run("--since", "2026-06-06T00:00:00.000Z", "--budget", "20%");
  assert.equal(r.limit, 3450); // billed block
  assert.equal(r.limitSource, "auto");
  assert.equal(r.budgetTokens, 690);
  assert.equal(r.verdict, "stop");
});

test("metric=io excludes cache tokens, metric=total includes them", () => {
  const io = run("--since", "2026-06-06T00:00:00.000Z", "--metric", "io", "--limit", "10000", "--budget", "30%");
  assert.equal(io.spent, 2450);
  assert.equal(io.verdict, "continue");

  const total = run("--since", "2026-06-06T00:00:00.000Z", "--metric", "total", "--limit", "10000", "--budget", "30%");
  assert.equal(total.spent, 3950);
  assert.equal(total.verdict, "stop");
});

test("parses k/m suffixes and reports zero spend for a future start", () => {
  const r = run("--since", "2030-01-01T00:00:00.000Z", "--budget", "150k");
  assert.equal(r.budgetTokens, 150000);
  assert.equal(r.spentSinceStart, 0);
  assert.equal(r.verdict, "continue");
});
