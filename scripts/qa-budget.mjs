#!/usr/bin/env node
// Percent-of-subscription budget probe for /qa-roam --budget N%.
//
// Reads the real 5-hour rate-limit usage that Claude Code passes to the status
// line (rate_limits.five_hour.used_percentage / resets_at). The statusline
// script must dump its stdin JSON to a file (default /tmp/statusline-debug.json);
// the dump is rewritten on every statusline render, so it is fresh while a
// session is active.
//
// Usage:
//   node scripts/qa-budget.mjs start --budget 20%   # at run start: baseline + state file
//   node scripts/qa-budget.mjs check                # after each scenario: verdict
//
// Flags:
//   --budget <N%>    (start only) percent of the 5h window this run may consume.
//   --source <path>  statusline dump (default: $QA_STATUSLINE_DUMP or /tmp/statusline-debug.json).
//   --state <path>   run state file (default: <repo>/.qa/qa-budget.json).
//
// A window reset mid-run is handled: spend accumulated in the previous window
// (up to the last check) is carried over, and the baseline restarts at 0.
//
// Output: JSON on stdout, one-liner on stderr. Exit code is always 0 — the
// caller reads `verdict` ("continue" | "stop"); any error state is a "stop".

import { readFileSync, writeFileSync, mkdirSync, statSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const REPO_ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const STALE_DUMP_MS = 15 * 60 * 1000;

const parseArgs = (argv) => {
  const args = { _: [] };
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a.startsWith("--")) {
      args[a.slice(2)] = argv[i + 1];
      i += 1;
    } else {
      args._.push(a);
    }
  }
  return args;
};

const emit = (result) => {
  const fmt = (n) => (n == null ? "?" : `${Math.round(n * 10) / 10}%`);
  process.stderr.write(
    `qa-budget: spent ${fmt(result.spentPct)} / budget ${fmt(result.budgetPct)}` +
      ` (5h window at ${fmt(result.fiveHourUsedPct)}) — ${result.verdict} [${result.reason}]\n`
  );
  process.stdout.write(JSON.stringify(result, null, 2) + "\n");
};

const stop = (reason, extra = {}) =>
  emit({ verdict: "stop", reason, spentPct: null, budgetPct: null, fiveHourUsedPct: null, ...extra });

const readDump = (sourcePath) => {
  let raw;
  let mtimeMs;
  try {
    raw = readFileSync(sourcePath, "utf8");
    mtimeMs = statSync(sourcePath).mtimeMs;
  } catch {
    return { error: `statusline dump not found at ${sourcePath} — the statusline script must write its stdin JSON there` };
  }
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { error: `statusline dump at ${sourcePath} is not valid JSON` };
  }
  const fiveHour = parsed?.rate_limits?.five_hour;
  if (
    !fiveHour ||
    typeof fiveHour.used_percentage !== "number" ||
    typeof fiveHour.resets_at !== "number"
  ) {
    return { error: "rate_limits.five_hour is missing from the statusline dump (appears only for Pro/Max after the first API response)" };
  }
  const ageMs = Date.now() - mtimeMs;
  return { usedPct: fiveHour.used_percentage, resetsAt: fiveHour.resets_at, ageMs };
};

const main = () => {
  const args = parseArgs(process.argv.slice(2));
  const command = args._[0];
  const sourcePath = args.source || process.env.QA_STATUSLINE_DUMP || "/tmp/statusline-debug.json";
  const statePath = args.state || join(REPO_ROOT, ".qa", "qa-budget.json");

  if (command !== "start" && command !== "check") {
    stop(`unknown command "${command || ""}" — use: start --budget <N%> | check`);
    return;
  }

  const dump = readDump(sourcePath);
  if (dump.error) {
    stop(dump.error);
    return;
  }
  const dumpAgeSeconds = Math.round(dump.ageMs / 1000);
  if (dump.ageMs > STALE_DUMP_MS) {
    stop(`statusline dump is stale (${dumpAgeSeconds}s old) — cannot trust the reading`, {
      dumpAgeSeconds,
    });
    return;
  }

  if (command === "start") {
    const m = String(args.budget ?? "").trim().match(/^([0-9]+(?:\.[0-9]+)?)%$/);
    if (!m) {
      stop(`--budget must be a percent like "20%" (got "${args.budget ?? ""}")`);
      return;
    }
    const budgetPct = parseFloat(m[1]);
    const state = {
      budgetPct,
      baselinePct: dump.usedPct,
      resetsAt: dump.resetsAt,
      lastPct: dump.usedPct,
      accumulatedPct: 0,
      startedAt: new Date().toISOString(),
    };
    mkdirSync(dirname(statePath), { recursive: true });
    writeFileSync(statePath, JSON.stringify(state, null, 2));
    emit({
      verdict: "continue",
      reason: "budget run started",
      budgetPct,
      spentPct: 0,
      remainingPct: budgetPct,
      fiveHourUsedPct: dump.usedPct,
      resetsAt: new Date(dump.resetsAt * 1000).toISOString(),
      dumpAgeSeconds,
      statePath,
    });
    return;
  }

  let state;
  try {
    state = JSON.parse(readFileSync(statePath, "utf8"));
  } catch {
    stop(`state file not found at ${statePath} — run "start --budget <N%>" first`);
    return;
  }

  if (dump.resetsAt !== state.resetsAt) {
    state.accumulatedPct += Math.max(0, state.lastPct - state.baselinePct);
    state.baselinePct = 0;
    state.resetsAt = dump.resetsAt;
  }
  const windowSpentPct = Math.max(0, dump.usedPct - state.baselinePct);
  const spentPct = state.accumulatedPct + windowSpentPct;
  state.lastPct = dump.usedPct;
  writeFileSync(statePath, JSON.stringify(state, null, 2));

  const over = spentPct >= state.budgetPct;
  emit({
    verdict: over ? "stop" : "continue",
    reason: over ? "budget reached" : "within budget",
    budgetPct: state.budgetPct,
    spentPct,
    remainingPct: Math.max(0, state.budgetPct - spentPct),
    fiveHourUsedPct: dump.usedPct,
    resetsAt: new Date(dump.resetsAt * 1000).toISOString(),
    dumpAgeSeconds,
    statePath,
  });
};

main();
