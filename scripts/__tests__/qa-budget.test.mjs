import { test, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, writeFileSync, readFileSync, rmSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { normalizeReading, checkBudget, refreshUsage, STALE_SOURCE_MS } from "../qa-budget.mjs";

const SCRIPT = join(dirname(dirname(fileURLToPath(import.meta.url))), "qa-budget.mjs");
let root, source, state, capturedAt, reset;
const envelope = (usedPct = 37, duration = 300, captured = capturedAt, resetsAt = reset) => ({ capturedAt: new Date(captured).toISOString(), usage: { accountId: "fixture-account", rateLimitsByLimitId: { codex: { limitId: "codex", primary: { usedPercent: usedPct, windowDurationMins: duration, resetsAt }, secondary: null } } } });
const dump = (usedPct, options = {}) => { capturedAt += 2; writeFileSync(source, JSON.stringify(envelope(usedPct, options.duration ?? 300, options.capturedAt ?? capturedAt, options.resetsAt ?? reset))); };
const run = (...args) => {
  const result = spawnSync(process.execPath, [SCRIPT, ...args, "--source", source, "--state", state], { encoding: "utf8" });
  assert.equal(result.status, 0, result.stderr); return JSON.parse(result.stdout);
};
const initialState = (overrides = {}) => ({ version: 1, budgetPct: 25, baselinePct: 80, lastPct: 90, accumulatedPct: 0, resetsAt: reset, windowDurationMins: 300, window: "primary", limitId: "codex", accountId: "fixture-account", lastCapturedAt: capturedAt - 1000, ...overrides });
beforeEach(() => { root = mkdtempSync(join(tmpdir(), "qa-budget-")); source = join(root, "usage.json"); state = join(root, "state.json"); capturedAt = Date.now() - 5000; reset = Math.floor(Date.now() / 1000) + 3600; });
afterEach(() => rmSync(root, { recursive: true, force: true }));

test("start saves real baseline, metadata and private state", () => {
  dump(37); const result = run("start", "--budget", "20%");
  assert.equal(result.verdict, "continue"); assert.equal(result.spentPct, 0); assert.equal(result.fiveHourUsedPct, 37); assert.equal(result.accountShared, true);
  const stored = JSON.parse(readFileSync(state, "utf8")); assert.equal(stored.baselinePct, 37); assert.equal(stored.resetsAt, reset); assert.equal(statSync(state).mode & 0o777, 0o600);
});

test("fresh checks compute delta and permanently stop the run at budget", () => {
  dump(37); run("start", "--budget", "20%"); dump(45);
  const within = run("check"); assert.equal(within.verdict, "continue"); assert.equal(within.spentPct, 8); assert.equal(within.remainingPct, 12);
  dump(57); const reached = run("check"); assert.equal(reached.verdict, "stop"); assert.equal(reached.reason, "budget reached"); assert.equal(reached.spentPct, 20);
  dump(58); assert.equal(run("check").verdict, "stop");
});

test("weekly primary is measured honestly without fabricating a five-hour value", () => {
  dump(26, { duration: 10080 }); const result = run("start", "--budget", "3.5%");
  assert.equal(result.windowDurationMins, 10080); assert.equal(result.windowUsedPct, 26); assert.equal(result.fiveHourUsedPct, null);
  dump(27, { duration: 10080 }); assert.equal(run("check").spentPct, 1);
});

test("MCP result wrapper and authoritative multi-bucket selection work", () => {
  const value = envelope(12); value.usage.rateLimits = { limitId: "codex", primary: { usedPercent: 99, windowDurationMins: 300, resetsAt: reset } };
  const actual = value.usage; value.usage = { content: [{ type: "text", text: JSON.stringify(actual) }] };
  assert.equal(normalizeReading(value).usedPct, 12);
  assert.throws(() => normalizeReading(value, { limitId: "missing" }), /unavailable/);
});

test("secondary selection persists between CLI checks", () => {
  const value = envelope(); value.usage.rateLimitsByLimitId.codex.secondary = { usedPercent: 20, windowDurationMins: 10080, resetsAt: reset };
  writeFileSync(source, JSON.stringify(value)); assert.equal(run("start", "--budget", "5%", "--window", "secondary").window, "secondary");
  value.capturedAt = new Date(capturedAt + 10).toISOString(); value.usage.rateLimitsByLimitId.codex.secondary.usedPercent = 22; writeFileSync(source, JSON.stringify(value));
  assert.equal(run("check").spentPct, 2);
});

test("check reuses the source selected by start without repeating --source", () => {
  dump(10); run("start", "--budget", "20%"); dump(11);
  const result = spawnSync(process.execPath, [SCRIPT, "check", "--state", state], { encoding: "utf8", env: { ...process.env, QA_CODEX_USAGE_SOURCE: "", QA_STATUSLINE_DUMP: "" } });
  assert.equal(result.status, 0, result.stderr); assert.equal(JSON.parse(result.stdout).spentPct, 1);
});

test("legacy QA_STATUSLINE_DUMP env remains a deprecated path alias for Codex data", () => {
  dump(10);
  const result = spawnSync(process.execPath, [SCRIPT, "start", "--budget", "20%", "--state", state], { encoding: "utf8", env: { ...process.env, QA_CODEX_USAGE_SOURCE: "", QA_STATUSLINE_DUMP: source } });
  assert.equal(result.status, 0); assert.equal(JSON.parse(result.stdout).verdict, "continue"); assert.match(result.stderr, /deprecated/);
  writeFileSync(source, JSON.stringify({ rate_limits: { five_hour: { used_percentage: 0, resets_at: reset } } }));
  const invalid = spawnSync(process.execPath, [SCRIPT, "start", "--budget", "20%", "--state", state], { encoding: "utf8", env: { ...process.env, QA_CODEX_USAGE_SOURCE: "", QA_STATUSLINE_DUMP: source } });
  assert.equal(JSON.parse(invalid.stdout).verdict, "stop");
});

test("missing, null and out-of-range usage fail closed", () => {
  for (const pct of [null, -1, 101, "20"]) { writeFileSync(source, JSON.stringify(envelope(pct))); const result = run("start", "--budget", "20%"); assert.equal(result.verdict, "stop"); assert.equal(result.spentPct, null); }
  writeFileSync(source, JSON.stringify({ capturedAt: new Date(capturedAt).toISOString(), usage: {} })); assert.match(run("start", "--budget", "20%").reason, /unavailable|ambiguous/);
});

test("missing, malformed and stale source stop even when its file is newly written", () => {
  assert.equal(run("start", "--budget", "20%").verdict, "stop");
  writeFileSync(source, "not JSON"); assert.equal(run("start", "--budget", "20%").verdict, "stop");
  dump(10, { capturedAt: Date.now() - STALE_SOURCE_MS - 1000 }); assert.match(run("start", "--budget", "20%").reason, /stale/);
  dump(10, { capturedAt: Date.now() + 60000 }); assert.match(run("start", "--budget", "20%").reason, /future/);
});

test("unchanged snapshots, usage regression and expired reset fail closed", () => {
  dump(10); run("start", "--budget", "20%"); assert.match(run("check").reason, /not refreshed/);
  dump(9); assert.match(run("check").reason, /regressed/);
  dump(11, { resetsAt: Math.floor(Date.now() / 1000) - 1 }); assert.match(run("check").reason, /already reset/);
});

test("changing account, bucket or duration cannot reset the baseline", () => {
  const reading = normalizeReading(envelope(91));
  for (const replacement of [{ accountId: "another" }, { limitId: "another" }, { windowDurationMins: 10080 }, { window: "secondary" }]) {
    assert.throws(() => checkBudget(initialState(), { ...reading, ...replacement }), /changed/);
  }
  assert.throws(() => checkBudget(initialState(), { ...reading, resetsAt: reset - 1 }), /regressed/);
});

test("rollover preserves observed lower bound but stops when pre-reset spend is unknown", () => {
  const stored = initialState(); const reading = normalizeReading(envelope(5, 300, capturedAt, reset + 18000));
  const result = checkBudget(stored, reading); assert.equal(result.verdict, "stop"); assert.equal(result.spentPct, null); assert.equal(result.observedSpentPct, 15); assert.match(result.reason, /unknown/);
  assert.equal(checkBudget(stored, { ...reading, usedPct: 6, capturedAt: capturedAt + 1 }).verdict, "stop");
});

test("fully observed exhausted window carries exact spend into a single next window", () => {
  const previousReset = Math.floor(Date.now() / 1000) - 2;
  const stored = initialState({ lastPct: 100, resetsAt: previousReset, lastCapturedAt: (previousReset - 1) * 1000 });
  const reading = normalizeReading(envelope(5, 300, Date.now() - 500, previousReset + 18000));
  const result = checkBudget(stored, reading); assert.equal(result.spentPct, 25); assert.equal(result.reason, "budget reached"); assert.equal(stored.accumulatedPct, 20);
});

test("multiple missed windows fail closed even after an observed exhausted window", () => {
  const result = checkBudget(initialState({ lastPct: 100 }), normalizeReading(envelope(5, 300, capturedAt, reset + 36000)));
  assert.equal(result.spentPct, null); assert.equal(result.verdict, "stop");
});

test("invalid state and invalid budget arguments stop rather than overwrite state", () => {
  dump(10);
  for (const budget of ["300k", "0%", "101%", "-1%", "NaN%", "20"]) assert.equal(run("start", "--budget", budget).verdict, "stop");
  writeFileSync(state, JSON.stringify({ budgetPct: 20 })); assert.match(run("check").reason, /state is invalid/);
  assert.match(run("check", "--budget", "20%").reason, /only accepted/);
});

test("native refresh requests only read-only usage and writes actual data atomically", async () => {
  const events = [];
  class Client {
    constructor(options) { events.push(options.args); }
    async connect() { events.push("connect"); }
    async request(method, params) { events.push([method, params]); return envelope(26, 10080).usage; }
    close() { events.push("close"); }
  }
  const result = await refreshUsage(source, Client);
  assert.equal(normalizeReading(result).usedPct, 26); assert.equal(statSync(source).mode & 0o777, 0o600);
  assert.deepEqual(events, [["app-server", "proxy"], "connect", ["account/rateLimits/read", {}], "close"]);
});

test("native refresh falls back to standalone read-only server and errors never overwrite the old source", async () => {
  const attempts = []; let count = 0;
  class Client {
    constructor(options) { attempts.push(options.args); }
    async connect() { if (++count === 1) throw new Error("no daemon"); }
    async request() { return envelope(26).usage; }
    close() {}
  }
  await refreshUsage(source, Client); assert.deepEqual(attempts[1], ["app-server", "--listen", "stdio://"]);
  const before = readFileSync(source, "utf8");
  class Broken { async connect() { throw new Error("unavailable"); } close() {} }
  await assert.rejects(refreshUsage(source, Broken), /cannot refresh Codex usage/); assert.equal(readFileSync(source, "utf8"), before);
});
