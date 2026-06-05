#!/usr/bin/env node
// QA token-budget probe for /qa-roam.
//
// Reads Claude Code session transcripts (~/.claude/projects/**/*.jsonl), sums
// token usage, and reports whether a run has crossed its token budget for the
// current rolling 5-hour subscription window. Zero external dependencies.
//
// The 5-hour window has no public token limit, so the denominator for "%"
// budgets is auto-detected as the largest token total of any past 5h block
// (override with --limit <N> or QA_SESSION_TOKEN_LIMIT). The limit scan is
// cached (6h TTL) because it reads the whole history; the "spent since run
// start" figure scans only recently-written files, so per-scenario checks are
// cheap.
//
// Usage:
//   node scripts/qa-token-usage.mjs --since <ISO> --budget <spec>
//   node scripts/qa-token-usage.mjs --budget 20%
//   node scripts/qa-token-usage.mjs --since 2026-06-06T00:00:00Z --budget 150k
//
// Flags:
//   --since <ISO>        Count tokens spent at/after this instant (the run's own spend).
//   --budget <spec>      Budget: absolute (200000 | 150k | 2.5m) or percent (20%).
//   --limit <N|max>      Override the % denominator. Default: auto-detect (max past block).
//   --metric <billed|total|io>  billed (default) = input+output+cache_creation (excludes
//                        discounted cache reads); total = + cache_read; io = input+output only.
//   --block-hours <n>    Window size in hours (default 5).
//   --projects-dir <p>   Override transcripts root (default ~/.claude/projects). For tests.
//   --no-cache           Do not read/write the limit cache (recompute every time).
//
// Output: JSON verdict on stdout, human one-liner on stderr. Exit code is always 0
// (the caller reads `verdict`); parse failures of individual lines are skipped.

import { readFileSync, writeFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { homedir } from "node:os";

const HOUR_MS = 60 * 60 * 1000;
const LIMIT_CACHE_TTL_MS = 6 * HOUR_MS;

const parseArgs = (argv) => {
  const args = {};
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (!a.startsWith("--")) continue;
    const key = a.slice(2);
    if (key === "no-cache") {
      args.noCache = true;
      continue;
    }
    args[key] = argv[i + 1];
    i += 1;
  }
  return args;
};

const parseTokenSpec = (spec) => {
  const s = String(spec).trim().toLowerCase();
  const m = s.match(/^([0-9]*\.?[0-9]+)\s*([km])?$/);
  if (!m) return NaN;
  const n = parseFloat(m[1]);
  if (m[2] === "k") return Math.round(n * 1e3);
  if (m[2] === "m") return Math.round(n * 1e6);
  return Math.round(n);
};

const tokenOf = (usage, metric) => {
  const input = usage.input_tokens || 0;
  const output = usage.output_tokens || 0;
  const cacheCreate = usage.cache_creation_input_tokens || 0;
  const cacheRead = usage.cache_read_input_tokens || 0;
  if (metric === "io") return input + output;
  if (metric === "total") return input + output + cacheCreate + cacheRead;
  // "billed" (default): full-price tokens. Excludes cache reads, which are heavily
  // discounted and otherwise dwarf the figure (100x+) on tool-heavy sessions.
  return input + output + cacheCreate;
};

const listJsonlFiles = (dir) => {
  const out = [];
  let entries;
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const entry of entries) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...listJsonlFiles(full));
    } else if (entry.isFile() && entry.name.endsWith(".jsonl")) {
      try {
        out.push({ path: full, mtimeMs: statSync(full).mtimeMs });
      } catch {
        /* file vanished mid-scan — ignore */
      }
    }
  }
  return out;
};

// Extracts { ts, tokens } usage events from the given files. Cheap pre-filter on
// the raw line avoids JSON.parse on the ~95% of lines that carry no usage.
const extractEvents = (files, metric) => {
  const events = [];
  for (const file of files) {
    let content;
    try {
      content = readFileSync(file.path, "utf8");
    } catch {
      continue;
    }
    for (const line of content.split("\n")) {
      if (!line.includes('"usage"')) continue;
      let obj;
      try {
        obj = JSON.parse(line);
      } catch {
        continue;
      }
      const usage = obj?.message?.usage;
      const ts = obj?.timestamp ? Date.parse(obj.timestamp) : NaN;
      if (!usage || Number.isNaN(ts)) continue;
      events.push({ ts, tokens: tokenOf(usage, metric) });
    }
  }
  events.sort((a, b) => a.ts - b.ts);
  return events;
};

// Groups time-sorted events into rolling windows: a block holds events within
// `blockMs` of its (hour-floored) start AND within `blockMs` of the previous
// event; a larger gap opens a new block.
const buildBlocks = (events, blockMs) => {
  const blocks = [];
  let cur = null;
  let lastTs = null;
  for (const ev of events) {
    const floored = Math.floor(ev.ts / HOUR_MS) * HOUR_MS;
    const fitsWindow = cur && ev.ts - cur.startMs < blockMs;
    const fitsGap = lastTs !== null && ev.ts - lastTs < blockMs;
    if (cur && fitsWindow && fitsGap) {
      cur.tokens += ev.tokens;
      cur.endMs = ev.ts;
    } else {
      cur = { startMs: floored, endMs: ev.ts, tokens: ev.tokens };
      blocks.push(cur);
    }
    lastTs = ev.ts;
  }
  return blocks;
};

const limitCachePath = (projectsDir) =>
  join(dirname(projectsDir), ".qa-token-usage-limit.json");

const computeLimit = (projectsDir, metric, blockMs, useCache) => {
  const cachePath = limitCachePath(projectsDir);
  if (useCache && existsSync(cachePath)) {
    try {
      const cached = JSON.parse(readFileSync(cachePath, "utf8"));
      const fresh = Date.now() - Date.parse(cached.computedAt) < LIMIT_CACHE_TTL_MS;
      if (fresh && cached.metric === metric && cached.blockMs === blockMs) {
        return { limit: cached.limit, source: "auto-cached" };
      }
    } catch {
      /* corrupt cache — recompute */
    }
  }
  const events = extractEvents(listJsonlFiles(projectsDir), metric);
  const blocks = buildBlocks(events, blockMs);
  const limit = blocks.reduce((max, b) => Math.max(max, b.tokens), 0);
  if (useCache) {
    try {
      writeFileSync(
        cachePath,
        JSON.stringify({ computedAt: new Date().toISOString(), metric, blockMs, limit })
      );
    } catch {
      /* cache is best-effort */
    }
  }
  return { limit, source: "auto" };
};

const main = () => {
  const args = parseArgs(process.argv.slice(2));
  const projectsDir = args["projects-dir"] || join(homedir(), ".claude", "projects");
  const metric = args.metric === "io" || args.metric === "total" ? args.metric : "billed";
  const blockHours = args["block-hours"] ? parseFloat(args["block-hours"]) : 5;
  const blockMs = blockHours * HOUR_MS;
  const useCache = !args.noCache && !args["projects-dir"];
  const now = Date.now();
  const sinceMs = args.since ? Date.parse(args.since) : NaN;

  // Recent files cover the active window and any "since" point within it.
  const lowerBound = Math.min(
    Number.isNaN(sinceMs) ? now : sinceMs,
    now - blockMs
  ) - HOUR_MS;
  const recentFiles = listJsonlFiles(projectsDir).filter((f) => f.mtimeMs >= lowerBound);
  const recentEvents = extractEvents(recentFiles, metric);

  const recentBlocks = buildBlocks(recentEvents, blockMs);
  const lastBlock = recentBlocks[recentBlocks.length - 1] || null;
  const activeBlock =
    lastBlock && now - lastBlock.startMs < blockMs
      ? { start: new Date(lastBlock.startMs).toISOString(), tokens: lastBlock.tokens }
      : null;

  const spentSinceStart = Number.isNaN(sinceMs)
    ? null
    : recentEvents.filter((e) => e.ts >= sinceMs).reduce((s, e) => s + e.tokens, 0);

  // Budget denominator (only needed for "%").
  const envLimit = process.env.QA_SESSION_TOKEN_LIMIT
    ? parseTokenSpec(process.env.QA_SESSION_TOKEN_LIMIT)
    : NaN;
  let limit = null;
  let limitSource = null;
  const budgetSpec = args.budget != null ? String(args.budget).trim() : null;
  const isPercent = budgetSpec ? budgetSpec.endsWith("%") : false;

  if (args.limit && args.limit !== "max" && args.limit !== "auto") {
    limit = parseTokenSpec(args.limit);
    limitSource = "override";
  } else if (!Number.isNaN(envLimit)) {
    limit = envLimit;
    limitSource = "env";
  } else if (isPercent) {
    const detected = computeLimit(projectsDir, metric, blockMs, useCache);
    limit = detected.limit;
    limitSource = detected.source;
  }

  let budgetTokens = null;
  if (budgetSpec) {
    if (isPercent) {
      const pct = parseFloat(budgetSpec.slice(0, -1));
      budgetTokens = limit ? Math.round((pct / 100) * limit) : null;
    } else {
      const abs = parseTokenSpec(budgetSpec);
      budgetTokens = Number.isNaN(abs) ? null : abs;
    }
  }

  const spent = spentSinceStart != null ? spentSinceStart : activeBlock ? activeBlock.tokens : 0;

  let verdict = "continue";
  let reason = budgetSpec ? "within budget" : "no budget set";
  if (budgetTokens == null && budgetSpec) {
    reason =
      "cannot derive limit for percent budget (no history) — pass an absolute --budget or set QA_SESSION_TOKEN_LIMIT";
  } else if (budgetTokens != null && spent >= budgetTokens) {
    verdict = "stop";
    reason = "token budget reached";
  }

  const result = {
    now: new Date(now).toISOString(),
    since: args.since || null,
    metric,
    blockHours,
    spentSinceStart,
    activeBlock,
    limit,
    limitSource,
    budgetSpec,
    budgetTokens,
    spent,
    percentOfBudgetUsed: budgetTokens ? Math.round((spent / budgetTokens) * 1000) / 10 : null,
    remainingTokens: budgetTokens != null ? Math.max(0, budgetTokens - spent) : null,
    verdict,
    reason,
  };

  const fmt = (n) => (n == null ? "?" : n.toLocaleString("en-US"));
  process.stderr.write(
    `qa-token-usage: spent ${fmt(result.spent)} / budget ${fmt(result.budgetTokens)}` +
      ` (${result.percentOfBudgetUsed == null ? "?" : result.percentOfBudgetUsed}%)` +
      ` — ${result.verdict} [limit ${fmt(result.limit)} ${result.limitSource || "n/a"}]\n`
  );
  process.stdout.write(JSON.stringify(result, null, 2) + "\n");
};

main();
