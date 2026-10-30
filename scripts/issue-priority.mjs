#!/usr/bin/env node
// Criticality score (0–100) of GitHub issues, see docs/issue-priority.md.
//
// Usage:
//   node scripts/issue-priority.mjs set <N> --impact <0-40> --reach <0-25> --urgency <0-20> --workaround <0-15> --why "<one sentence>"
//   node scripts/issue-priority.mjs unscored [--limit 300]   # open issues without a score
//   node scripts/issue-priority.mjs top [--limit 10]         # open issues by score, highest first
//
// `set` writes the score block at the top of the issue body (replacing an earlier one) and the
// band label (P0-critical … P4-trivial), removing other band labels. Scores are chosen by a Haiku
// subagent through /score-issues; this script only validates and writes them.
//
// Output: JSON on stdout; errors on stderr, exit code 1. Needs an authenticated `gh`.

import { execFileSync } from "node:child_process";
import { homedir } from "node:os";
import { delimiter, join } from "node:path";

export const CRITERIA = { impact: 40, reach: 25, urgency: 20, workaround: 15 };
const CRITERIA_RU = { impact: "ущерб", reach: "охват", urgency: "срочность", workaround: "обход" };

export const BANDS = [
  { min: 80, label: "P0-critical", color: "B60205" },
  { min: 60, label: "P1-high", color: "D93F0B" },
  { min: 40, label: "P2-medium", color: "FBCA04" },
  { min: 20, label: "P3-low", color: "0E8A16" },
  { min: 0, label: "P4-trivial", color: "C5DEF5" },
];
const BAND_LABELS = new Set(BANDS.map((b) => b.label));

const BLOCK_RE = /<!-- priority -->[\s\S]*?<!-- \/priority -->\n*/;
// Also read by scripts/vscode-agents/lib.js (parseIssueScore) — keep the two in sync
const SCORE_RE = /Критичность:\s*\**\s*(\d{1,3})\s*\/\s*100/;

export const bandOf = (score) => BANDS.find((b) => score >= b.min);

export const validateParts = (parts) => {
  for (const [key, max] of Object.entries(CRITERIA)) {
    const v = parts[key];
    if (!Number.isInteger(v) || v < 0 || v > max)
      throw new Error(`--${key} must be an integer 0..${max}, got ${parts[key]}`);
  }
  return Object.keys(CRITERIA).reduce((sum, key) => sum + parts[key], 0);
};

export const renderBlock = (parts, why) => {
  const score = validateParts(parts);
  const detail = Object.keys(CRITERIA)
    .map((key) => `${CRITERIA_RU[key]} ${parts[key]}`)
    .join(" · ");
  return [
    "<!-- priority -->",
    `**Критичность: ${score}/100** (${bandOf(score).label}) · ${detail}`,
    `Почему: ${why.replace(/\s+/g, " ").trim()}`,
    "<!-- /priority -->",
  ].join("\n");
};

export const applyBlock = (body, block) => {
  const rest = (body || "").replace(BLOCK_RE, "").replace(/^\n+/, "");
  return rest ? `${block}\n\n${rest}` : `${block}\n`;
};

export const parseScore = (body) => {
  const m = (body || "").match(SCORE_RE);
  return m ? Math.min(Number(m[1]), 100) : null;
};

export const rankIssues = (issues) =>
  issues
    .map((i) => ({
      number: i.number,
      title: i.title,
      url: i.url,
      score: parseScore(i.body),
      labels: (i.labels || []).map((l) => l.name),
    }))
    .filter((i) => i.score !== null)
    .sort((a, b) => b.score - a.score || b.number - a.number);

const parseArgs = (argv) => {
  const args = { _: [] };
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i].startsWith("--")) {
      args[argv[i].slice(2)] = argv[i + 1];
      i += 1;
    } else args._.push(argv[i]);
  }
  return args;
};

// gh is installed in ~/.local/bin on the dev machine, which non-interactive ssh shells leave off PATH.
const GH_ENV = { ...process.env, PATH: [process.env.PATH, join(homedir(), ".local", "bin")].join(delimiter) };

const gh = (args, input) =>
  execFileSync("gh", args, {
    env: GH_ENV,
    encoding: "utf8",
    stdio: ["pipe", "pipe", "pipe"],
    maxBuffer: 64 << 20,
    ...(input == null ? {} : { input }),
  }).trim();

const listOpen = (limit) =>
  JSON.parse(
    gh([
      "issue",
      "list",
      "--state",
      "open",
      "--limit",
      String(limit),
      "--json",
      "number,title,body,labels,url",
    ]) || "[]"
  );

const setScore = (args) => {
  const number = Number(args._[1]);
  if (!Number.isInteger(number) || number <= 0) throw new Error("set: issue number required");
  if (!args.why?.trim()) throw new Error("set: --why is required");
  const parts = Object.fromEntries(Object.keys(CRITERIA).map((k) => [k, Number(args[k])]));
  const block = renderBlock(parts, args.why);
  const score = validateParts(parts);
  const band = bandOf(score);
  const issue = JSON.parse(gh(["issue", "view", String(number), "--json", "body,labels"]));
  const stale = issue.labels
    .map((l) => l.name)
    .filter((n) => BAND_LABELS.has(n) && n !== band.label);
  gh([
    "label",
    "create",
    band.label,
    "--color",
    band.color,
    "--description",
    `Criticality ${band.min}+ (docs/issue-priority.md)`,
    "--force",
  ]);
  gh(
    [
      "issue",
      "edit",
      String(number),
      "--body-file",
      "-",
      "--add-label",
      band.label,
      ...stale.flatMap((l) => ["--remove-label", l]),
    ],
    applyBlock(issue.body, block)
  );
  return { number, score, band: band.label };
};

const main = () => {
  const args = parseArgs(process.argv.slice(2));
  const cmd = args._[0];
  if (cmd === "set") return setScore(args);
  if (cmd === "unscored")
    return listOpen(Number(args.limit) || 300)
      .filter((i) => parseScore(i.body) === null)
      .map((i) => ({ ...i, labels: i.labels.map((l) => l.name) }));
  if (cmd === "top") return rankIssues(listOpen(300)).slice(0, Number(args.limit) || 10);
  throw new Error("usage: issue-priority.mjs set <N> --impact … | unscored | top");
};

if (import.meta.url === `file://${process.argv[1]}`) {
  try {
    process.stdout.write(`${JSON.stringify(main(), null, 2)}\n`);
  } catch (err) {
    process.stderr.write(`issue-priority: ${err.message}${err.stderr ? `\n${err.stderr}` : ""}\n`);
    process.exit(1);
  }
}
