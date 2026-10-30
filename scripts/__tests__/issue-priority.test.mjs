// Tests for scripts/issue-priority.mjs. Run: node --test scripts/__tests__/
// Pure helpers directly; the CLI with a fake `gh` on PATH that logs its calls.
import { test, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { chmodSync, existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import {
  applyBlock,
  bandOf,
  parseScore,
  rankIssues,
  renderBlock,
  validateParts,
} from "../issue-priority.mjs";

const SCRIPT = join(dirname(dirname(fileURLToPath(import.meta.url))), "issue-priority.mjs");
const PARTS = { impact: 30, reach: 15, urgency: 12, workaround: 15 };

const FAKE_GH = `#!/usr/bin/env node
const fs = require("fs");
const args = process.argv.slice(2);
const stdin = args.includes("-") ? fs.readFileSync(0, "utf8") : null;
fs.appendFileSync(process.env.FAKE_GH_LOG, JSON.stringify({ args, stdin }) + "\\n");
const [a, b] = args;
if (a === "issue" && b === "view") process.stdout.write(process.env.FAKE_GH_VIEW);
if (a === "issue" && b === "list") process.stdout.write(process.env.FAKE_GH_LIST);
`;

let root;
let env;

const ghCalls = () =>
  existsSync(env.FAKE_GH_LOG)
    ? readFileSync(env.FAKE_GH_LOG, "utf8")
        .trim()
        .split("\n")
        .map((l) => JSON.parse(l))
    : [];
const run = (...args) => spawnSync("node", [SCRIPT, ...args], { env, encoding: "utf8" });
const issue = (number, body, labels = []) => ({
  number,
  title: `t${number}`,
  url: `https://github.com/o/r/issues/${number}`,
  body,
  labels: labels.map((name) => ({ name })),
});
const scored = (n) =>
  `<!-- priority -->\n**Критичность: ${n}/100** (x)\n<!-- /priority -->\n\nbody`;

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), "issue-priority-"));
  writeFileSync(join(root, "gh"), FAKE_GH);
  chmodSync(join(root, "gh"), 0o755);
  env = {
    ...process.env,
    PATH: `${root}:${process.env.PATH}`,
    FAKE_GH_LOG: join(root, "gh.log"),
    FAKE_GH_VIEW: JSON.stringify({ body: "Описание", labels: [] }),
    FAKE_GH_LIST: "[]",
  };
});

afterEach(() => rmSync(root, { recursive: true, force: true }));

test("validateParts sums the criteria and rejects out-of-range or non-integer values", () => {
  assert.equal(validateParts(PARTS), 72);
  assert.equal(validateParts({ impact: 40, reach: 25, urgency: 20, workaround: 15 }), 100);
  assert.throws(() => validateParts({ ...PARTS, impact: 41 }), /--impact must be an integer 0..40/);
  assert.throws(() => validateParts({ ...PARTS, reach: -1 }), /--reach/);
  assert.throws(() => validateParts({ ...PARTS, urgency: 2.5 }), /--urgency/);
  assert.throws(() => validateParts({ ...PARTS, workaround: NaN }), /--workaround/);
});

test("bandOf maps scores to labels at the band edges", () => {
  assert.equal(bandOf(100).label, "P0-critical");
  assert.equal(bandOf(80).label, "P0-critical");
  assert.equal(bandOf(79).label, "P1-high");
  assert.equal(bandOf(60).label, "P1-high");
  assert.equal(bandOf(40).label, "P2-medium");
  assert.equal(bandOf(39).label, "P3-low");
  assert.equal(bandOf(19).label, "P4-trivial");
  assert.equal(bandOf(0).label, "P4-trivial");
});

test("renderBlock writes the score, band, criteria and a one-line reason", () => {
  assert.equal(
    renderBlock(PARTS, "падает вход\n  на телефонах"),
    [
      "<!-- priority -->",
      "**Критичность: 72/100** (P1-high) · ущерб 30 · охват 15 · срочность 12 · обход 15",
      "Почему: падает вход на телефонах",
      "<!-- /priority -->",
    ].join("\n")
  );
});

test("applyBlock prepends the block once and replaces it on rescoring", () => {
  const first = applyBlock("## Описание\ntext", renderBlock(PARTS, "a"));
  assert.match(first, /^<!-- priority -->[\s\S]*<!-- \/priority -->\n\n## Описание\ntext$/);
  const again = applyBlock(first, renderBlock({ ...PARTS, impact: 10 }, "b"));
  assert.equal(again.match(/<!-- priority -->/g).length, 1);
  assert.match(again, /Критичность: 52\/100/);
  assert.match(again, /Почему: b\n<!-- \/priority -->\n\n## Описание\ntext$/);
  assert.equal(applyBlock("", "B"), "B\n");
  assert.equal(applyBlock(null, "B"), "B\n");
});

test("parseScore reads the score with or without bold, and null without one", () => {
  assert.equal(parseScore(renderBlock(PARTS, "x")), 72);
  assert.equal(parseScore("Критичность: 5/100"), 5);
  assert.equal(parseScore("Критичность: 999/100"), 100);
  assert.equal(parseScore("**Severity:** High"), null);
  assert.equal(parseScore(null), null);
});

test("rankIssues keeps scored issues, highest first, newer first on ties", () => {
  const ranked = rankIssues([
    issue(1, scored(40)),
    issue(2, "no score"),
    issue(3, scored(90), ["bug"]),
    issue(4, scored(40)),
  ]);
  assert.deepEqual(
    ranked.map((i) => [i.number, i.score]),
    [
      [3, 90],
      [4, 40],
      [1, 40],
    ]
  );
  assert.deepEqual(ranked[0].labels, ["bug"]);
});

test("set writes the block, creates the band label and swaps stale band labels", () => {
  env.FAKE_GH_VIEW = JSON.stringify({
    body: "Описание",
    labels: [{ name: "bug" }, { name: "P3-low" }, { name: "P1-high" }],
  });
  const r = run(
    "set",
    "42",
    "--impact",
    "30",
    "--reach",
    "15",
    "--urgency",
    "12",
    "--workaround",
    "15",
    "--why",
    "Причина"
  );
  assert.equal(r.status, 0, r.stderr);
  assert.deepEqual(JSON.parse(r.stdout), { number: 42, score: 72, band: "P1-high" });
  const calls = ghCalls();
  assert.deepEqual(calls[0].args, ["issue", "view", "42", "--json", "body,labels"]);
  assert.equal(calls[1].args.slice(0, 3).join(" "), "label create P1-high");
  assert.ok(calls[1].args.includes("--force"));
  assert.deepEqual(calls[2].args, [
    "issue",
    "edit",
    "42",
    "--body-file",
    "-",
    "--add-label",
    "P1-high",
    "--remove-label",
    "P3-low",
  ]);
  assert.match(
    calls[2].stdin,
    /^<!-- priority -->\n\*\*Критичность: 72\/100\*\*[\s\S]*\n\nОписание$/
  );
});

test("set refuses invalid input before touching GitHub", () => {
  const bad = run(
    "set",
    "42",
    "--impact",
    "50",
    "--reach",
    "1",
    "--urgency",
    "1",
    "--workaround",
    "1",
    "--why",
    "x"
  );
  assert.equal(bad.status, 1);
  assert.match(bad.stderr, /--impact must be an integer 0..40/);
  const noWhy = run(
    "set",
    "42",
    "--impact",
    "1",
    "--reach",
    "1",
    "--urgency",
    "1",
    "--workaround",
    "1"
  );
  assert.match(noWhy.stderr, /--why is required/);
  const noNumber = run("set", "--impact", "1");
  assert.match(noNumber.stderr, /issue number required/);
  assert.deepEqual(ghCalls(), []);
});

test("unscored and top read open issues", () => {
  env.FAKE_GH_LIST = JSON.stringify([
    issue(1, scored(30)),
    issue(2, "plain", ["enhancement"]),
    issue(3, scored(85)),
  ]);
  const unscored = JSON.parse(run("unscored").stdout);
  assert.deepEqual(
    unscored.map((i) => [i.number, i.labels]),
    [[2, ["enhancement"]]]
  );
  assert.deepEqual(ghCalls()[0].args.slice(0, 6), [
    "issue",
    "list",
    "--state",
    "open",
    "--limit",
    "300",
  ]);
  const top = JSON.parse(run("top", "--limit", "1").stdout);
  assert.deepEqual(
    top.map((i) => [i.number, i.score]),
    [[3, 85]]
  );
});

test("unknown command prints usage", () => {
  const r = run("nope");
  assert.equal(r.status, 1);
  assert.match(r.stderr, /usage/);
});
