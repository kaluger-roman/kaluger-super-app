#!/usr/bin/env node
// Publication wrapper: node scripts/gh-pr.mjs create|ready <ordinary gh flags>.
import { spawnSync } from "node:child_process";
import { checkGhPublication } from "./changelog-gate.mjs";

try {
  const args = process.argv.slice(2);
  if (!["create", "ready"].includes(args[0])) throw new Error("usage: gh-pr.mjs create|ready <gh flags>");
  const full = ["pr", ...args];
  const result = checkGhPublication(full);
  if (!result.allowed) throw new Error(result.reason);
  const child = spawnSync("gh", result.publicationArgs || full, { stdio: "inherit" });
  if (child.error) throw child.error;
  process.exitCode = child.status ?? 1;
} catch (error) {
  process.stderr.write(`gh-pr: ${error.message}\n`);
  process.exitCode = 1;
}
