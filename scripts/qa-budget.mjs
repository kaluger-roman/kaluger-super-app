#!/usr/bin/env node
// Account-wide Codex percentage budget, measured from real rate-limit readings.
// start --budget N% | check; both accept --source, --state, --refresh,
// --limit-id and --window primary|secondary. A source is a private JSON envelope:
// { capturedAt: ISO timestamp, usage: <get_usage_limits/account/rateLimits/read result> }.
// Refresh before every scenario check. Null/unavailable is never zero. Exit 0
// preserves the old JSON protocol; callers MUST inspect verdict and stop on stop.
import { readFileSync, writeFileSync, mkdirSync, renameSync, chmodSync, realpathSync, existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { RpcClient } from "./codex-rpc.cjs";

const REPO_ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
export const STALE_SOURCE_MS = 15 * 60 * 1000;
const FUTURE_TOLERANCE_MS = 30 * 1000;
const percentage = (value) => Number.isFinite(value) && value >= 0 && value <= 100;
const integer = (value) => Number.isSafeInteger(value) && value > 0;

export const parseArgs = (argv) => {
  const args = { _: [] };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--refresh") args.refresh = true;
    else if (arg.startsWith("--")) {
      if (!["--budget", "--source", "--state", "--limit-id", "--window"].includes(arg)) throw new Error(`unknown flag ${arg}`);
      const value = argv[++i];
      if (!value || value.startsWith("--")) throw new Error(`${arg} needs a value`);
      args[arg.slice(2)] = value;
    } else args._.push(arg);
  }
  return args;
};

// Accept the MCP text/content wrapper as well as the app-server JSON result.
export const unwrapUsage = (value) => {
  if (value?.isError) throw new Error("Codex usage tool returned an error");
  if (value?.structuredContent) return unwrapUsage(value.structuredContent);
  if (Array.isArray(value?.content)) {
    const text = value.content.find((item) => item.type === "text")?.text;
    if (!text) throw new Error("Codex usage tool returned no JSON");
    return unwrapUsage(JSON.parse(text));
  }
  return value;
};

export const normalizeReading = (envelope, options = {}, now = Date.now()) => {
  const capturedAt = Date.parse(envelope?.capturedAt);
  if (!Number.isFinite(capturedAt)) throw new Error("source capturedAt is missing or invalid; refresh real Codex usage");
  const ageMs = now - capturedAt;
  if (ageMs > STALE_SOURCE_MS) throw new Error("Codex usage source is stale; refresh before checking the budget");
  if (ageMs < -FUTURE_TOLERANCE_MS) throw new Error("Codex usage source is dated in the future");
  const usage = unwrapUsage(envelope.usage);
  const buckets = usage?.rateLimitsByLimitId;
  const limitId = options.limitId || (buckets?.codex ? "codex" : null) || usage?.rateLimits?.limitId;
  if (!limitId) throw new Error("Codex limit ID is unavailable or ambiguous; select --limit-id");
  // A present multi-bucket map is authoritative; never fall back to a different bucket.
  const bucket = buckets != null ? buckets[limitId] : usage?.rateLimits;
  if (!bucket || (bucket.limitId != null && bucket.limitId !== limitId)) throw new Error(`Codex usage limit ${limitId} is unavailable`);
  const window = options.window || "primary";
  if (!["primary", "secondary"].includes(window)) throw new Error("--window must be primary or secondary");
  const reading = bucket[window];
  if (!percentage(reading?.usedPercent) || !integer(reading?.windowDurationMins) || !integer(reading?.resetsAt)) {
    throw new Error(`Codex ${limitId}.${window} usage, duration or reset time is unavailable or invalid`);
  }
  if (reading.resetsAt * 1000 <= capturedAt || reading.resetsAt * 1000 <= now) throw new Error("Codex window has already reset; refresh real usage");
  if (usage.ordinaryUsageAllowed === false || bucket.spendControlReached === true || bucket.rateLimitReachedType != null) {
    throw new Error("Codex account usage is unavailable because its limit or spend control is reached");
  }
  return {
    usedPct: reading.usedPercent, resetsAt: reading.resetsAt,
    windowDurationMins: reading.windowDurationMins, window, limitId,
    accountId: usage.accountId ?? null, capturedAt, ageMs,
  };
};

const writePrivate = (path, value) => {
  mkdirSync(dirname(path), { recursive: true });
  const temporary = `${path}.${process.pid}.tmp`;
  writeFileSync(temporary, `${JSON.stringify(value, null, 2)}\n`, { mode: 0o600 });
  renameSync(temporary, path);
  chmodSync(path, 0o600);
};

export const refreshUsage = async (sourcePath, Client = RpcClient) => {
  let lastError;
  // The standalone server only reads account usage; it starts no agent turn.
  for (const args of [["app-server", "proxy"], ["app-server", "--listen", "stdio://"]]) {
    const client = new Client({ args });
    try {
      await client.connect();
      const usage = await client.request("account/rateLimits/read", {});
      const envelope = { capturedAt: new Date().toISOString(), usage };
      writePrivate(sourcePath, envelope);
      return envelope;
    } catch (error) { lastError = error; }
    finally { client.close(); }
  }
  throw new Error(`cannot refresh Codex usage: ${lastError.message}; save a fresh get_usage_limits result in --source`);
};

const publicReading = (reading) => ({
  accountShared: true,
  windowUsedPct: reading.usedPct,
  fiveHourUsedPct: reading.windowDurationMins === 300 ? reading.usedPct : null,
  windowDurationMins: reading.windowDurationMins,
  window: reading.window,
  limitId: reading.limitId,
  resetsAt: new Date(reading.resetsAt * 1000).toISOString(),
  dumpAgeSeconds: Math.round(Math.max(0, reading.ageMs) / 1000),
});

export const validateState = (state) => {
  if (state?.version !== 1 || !percentage(state.budgetPct) || state.budgetPct === 0 ||
    !percentage(state.baselinePct) || !percentage(state.lastPct) || state.lastPct < state.baselinePct ||
    !Number.isFinite(state.accumulatedPct) || state.accumulatedPct < 0 ||
    !integer(state.resetsAt) || !integer(state.windowDurationMins) ||
    !Number.isFinite(state.lastCapturedAt) || typeof state.limitId !== "string" ||
    !["primary", "secondary"].includes(state.window)) throw new Error("budget state is invalid; start a new explicitly budgeted run");
};

export const checkBudget = (state, reading) => {
  validateState(state);
  if (state.stopped) return { verdict: "stop", reason: state.stopReason, spentPct: state.spentPct ?? null, observedSpentPct: state.observedSpentPct };
  if (reading.limitId !== state.limitId || reading.window !== state.window || reading.windowDurationMins !== state.windowDurationMins || reading.accountId !== state.accountId) {
    throw new Error("Codex account or usage window changed during the run");
  }
  if (reading.capturedAt <= state.lastCapturedAt) throw new Error("source was not refreshed after the previous budget check");
  if (reading.resetsAt < state.resetsAt) throw new Error("Codex reset timestamp regressed");
  if (reading.resetsAt === state.resetsAt && reading.usedPct < state.lastPct) throw new Error("Codex usage regressed without a window reset");
  if (reading.resetsAt !== state.resetsAt) {
    const observedSpentPct = state.accumulatedPct + state.lastPct - state.baselinePct + reading.usedPct;
    // Unobserved usage just before a reset cannot be reconstructed. Preserve the
    // lower bound, but never present it as the full spend or continue on a guess.
    const singleWindow = reading.resetsAt - state.resetsAt === state.windowDurationMins * 60 && reading.capturedAt >= state.resetsAt * 1000;
    if (state.lastPct !== 100 || !singleWindow) {
      state.stopped = true;
      state.stopReason = "window rolled over with unobserved usage; total spend is unknown";
      state.observedSpentPct = observedSpentPct;
      state.spentPct = null;
      return { verdict: "stop", reason: state.stopReason, spentPct: null, observedSpentPct };
    }
    state.accumulatedPct += state.lastPct - state.baselinePct;
    state.baselinePct = 0;
    state.resetsAt = reading.resetsAt;
  }
  const spentPct = state.accumulatedPct + reading.usedPct - state.baselinePct;
  state.lastPct = reading.usedPct;
  state.lastCapturedAt = reading.capturedAt;
  state.spentPct = spentPct;
  const over = spentPct >= state.budgetPct;
  if (over) { state.stopped = true; state.stopReason = "budget reached"; }
  return { verdict: over ? "stop" : "continue", reason: over ? "budget reached" : "within budget", spentPct, remainingPct: Math.max(0, state.budgetPct - spentPct) };
};

export const main = async (argv = process.argv.slice(2)) => {
  const args = parseArgs(argv);
  const [command] = args._;
  if (!["start", "check"].includes(command) || args._.length !== 1) throw new Error("use: start --budget <N%> | check");
  if (command === "check" && args.budget != null) throw new Error("--budget is only accepted by start");
  const statePath = resolve(args.state || join(REPO_ROOT, ".qa", "qa-budget.json"));
  let state;
  if (command === "check") {
    try { state = JSON.parse(readFileSync(statePath, "utf8")); }
    catch { throw new Error("state file is missing or invalid; run start --budget <N%> first"); }
    validateState(state);
  }
  if (process.env.QA_STATUSLINE_DUMP && !args.source && !process.env.QA_CODEX_USAGE_SOURCE && !state?.sourcePath) {
    process.stderr.write("qa-budget: QA_STATUSLINE_DUMP is deprecated; it must now contain a fresh Codex { capturedAt, usage } envelope, not Claude statusline data\n");
  }
  const sourcePath = resolve(args.source || process.env.QA_CODEX_USAGE_SOURCE || state?.sourcePath || process.env.QA_STATUSLINE_DUMP || join(REPO_ROOT, ".qa", "codex-usage.json"));
  if (sourcePath === statePath) throw new Error("--source and --state must be different files");
  const envelope = args.refresh ? await refreshUsage(sourcePath) : JSON.parse(readFileSync(sourcePath, "utf8"));
  const reading = normalizeReading(envelope, { limitId: args["limit-id"] || state?.limitId, window: args.window || state?.window });
  if (command === "start") {
    const match = String(args.budget ?? "").match(/^(\d+(?:\.\d+)?)%$/);
    const budgetPct = match ? Number(match[1]) : NaN;
    if (!percentage(budgetPct) || budgetPct === 0) throw new Error("--budget must be a percent greater than 0 and at most 100, such as 20%");
    state = { version: 1, budgetPct, baselinePct: reading.usedPct, lastPct: reading.usedPct, accumulatedPct: 0,
      resetsAt: reading.resetsAt, windowDurationMins: reading.windowDurationMins, window: reading.window,
      limitId: reading.limitId, accountId: reading.accountId, lastCapturedAt: reading.capturedAt,
      startedAt: new Date().toISOString(), sourcePath };
    writePrivate(statePath, state);
    return { verdict: "continue", reason: "budget run started", budgetPct, spentPct: 0, remainingPct: budgetPct, ...publicReading(reading), statePath };
  }
  const result = checkBudget(state, reading);
  writePrivate(statePath, state);
  return { ...result, budgetPct: state.budgetPct, ...publicReading(reading), statePath };
};

if (process.argv[1] && existsSync(process.argv[1]) && realpathSync(process.argv[1]) === fileURLToPath(import.meta.url)) {
  let result;
  try { result = await main(); }
  catch (error) { result = { verdict: "stop", reason: error.message, spentPct: null, budgetPct: null, fiveHourUsedPct: null }; }
  process.stderr.write(`qa-budget: ${result.verdict} [${result.reason}] (${result.spentPct ?? "?"}% / ${result.budgetPct ?? "?"}%)\n`);
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
}
