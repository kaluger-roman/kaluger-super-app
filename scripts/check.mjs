#!/usr/bin/env node
// Runs the pre-commit checks of the branch in parallel: TypeScript, ESLint, Prettier and tests of
// the frontend and the backend, each into its own log, and prints a summary.
//
// Usage:
//   node scripts/check.mjs                # the parts the branch touches; tests related to the changes
//   node scripts/check.mjs --full         # all tests of the touched parts (run once before a commit)
//   node scripts/check.mjs --all          # both parts, even one the branch does not touch
//   node scripts/check.mjs --base <ref>   # what "changed" is compared to (default origin/main)
//   node scripts/check.mjs --backend-tests npm|dev-stack
//
// "Changed" = commits on top of <base> + staged + unstaged + untracked files. Related tests are
// `vitest related` / `jest --findRelatedTests` on the changed source files; a change to a test
// config, a setup file or package.json runs the full suite of that part.
// Backend tests: on a feature branch they run through `scripts/dev-stack.sh test-backend` (the
// branch's own test DB, start it once with `scripts/dev-stack.sh up`); on main through `npm test`.
// ESLint and Prettier keep a cache in node_modules/.cache, so a rerun takes seconds.
//
// Exit code: 0 when every check passed, 1 otherwise. Logs: $TMPDIR/check-<branch>/<check>.log.

import { spawn, execFileSync } from "node:child_process";
import { createWriteStream, existsSync, mkdirSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const REPO_ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const TAIL_LINES = 40;

// A change here can affect any test of the part, so related tests are not enough.
const FULL_SUITE_TRIGGERS = {
  frontend: [/^frontend\/vitest\./, /^frontend\/src\/__tests__\//, /^frontend\/package(-lock)?\.json$/, /^frontend\/tsconfig/],
  backend: [/^backend\/jest\./, /^backend\/src\/__tests__\/(setup|loadTestEnv|helpers)/, /^backend\/package(-lock)?\.json$/, /^backend\/prisma\/schema\.prisma$/, /^backend\/tsconfig/],
};

const SOURCE_FILE = /\.(ts|tsx)$/;
const PRETTIER_FILE = {
  frontend: /^frontend\/(src\/.*\.(ts|tsx|js|jsx|json|css|md)|e2e\/.*\.(ts|md)|playwright\.config\.ts)$/,
  backend: /^backend\/src\/.*\.ts$/,
};

export const parseArgs = (argv) => {
  const args = { full: false, all: false, base: "origin/main", backendTests: null };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--full") args.full = true;
    else if (arg === "--all") args.all = true;
    else if (arg === "--base") args.base = argv[(i += 1)];
    else if (arg === "--backend-tests") args.backendTests = argv[(i += 1)];
    else throw new Error(`Unknown argument: ${arg}`);
  }
  if (!args.base) throw new Error("--base needs a ref");
  if (args.backendTests && !["npm", "dev-stack"].includes(args.backendTests)) {
    throw new Error("--backend-tests is npm or dev-stack");
  }
  return args;
};

const PARTS = ["frontend", "backend"];

// Which parts the changed files touch.
export const detectParts = (changed) => PARTS.filter((part) => changed.some((file) => file.startsWith(`${part}/`)));

const inPart = (part, files, pattern) =>
  files.filter((file) => file.startsWith(`${part}/`) && pattern.test(file)).map((file) => file.slice(part.length + 1));

// The test run of a part: null when nothing in it can affect a test.
export const planTests = (part, changed, full) => {
  const partFiles = changed.filter((file) => file.startsWith(`${part}/`));
  const runAll = full || partFiles.some((file) => FULL_SUITE_TRIGGERS[part].some((re) => re.test(file)));
  if (runAll) return { scope: "full", files: [] };
  const sources = inPart(part, changed, SOURCE_FILE).filter((file) => file.startsWith("src/"));
  return sources.length > 0 ? { scope: "related", files: sources } : null;
};

const testCommand = (part, tests, backendTests) => {
  if (part === "frontend") {
    return tests.scope === "full"
      ? { cmd: "npx", args: ["vitest", "run"] }
      : { cmd: "npx", args: ["vitest", "related", "--run", ...tests.files] };
  }
  const jestArgs = tests.scope === "full" ? [] : ["--findRelatedTests", ...tests.files];
  return backendTests === "dev-stack"
    ? { cmd: "bash", args: ["scripts/dev-stack.sh", "test-backend", ...jestArgs], cwd: "." }
    : { cmd: "npm", args: ["test", "--", ...jestArgs] };
};

// Every check to run, as { name, cwd, cmd, args } with cwd relative to the repo root.
export const planChecks = ({ parts, changed, full, backendTests }) =>
  parts.flatMap((part) => {
    const checks = [];
    const add = (name, command) =>
      checks.push({ name: `${part}:${name}`, cwd: command.cwd ?? part, cmd: command.cmd, args: command.args });

    add("tsc", { cmd: "npx", args: part === "frontend" ? ["tsc", "--noEmit", "-p", "."] : ["tsc", "--noEmit"] });
    // The whole part is linted: import/no-unused-modules needs every file; the cache keeps it fast.
    add("eslint", {
      cmd: "npx",
      args: [
        "eslint",
        "--cache",
        "--cache-location",
        "node_modules/.cache/eslint/",
        ...(part === "frontend" ? ["src", "e2e", "playwright.config.ts"] : ["src"]),
      ],
    });
    const formatted = full ? null : inPart(part, changed, PRETTIER_FILE[part]);
    if (formatted === null || formatted.length > 0) {
      add("prettier", {
        cmd: "npx",
        args: ["prettier", "--check", "--cache", ...(formatted ?? (part === "frontend" ? ["src", "e2e", "playwright.config.ts"] : ["src"]))],
      });
    }
    const tests = planTests(part, changed, full);
    if (tests) add(`tests (${tests.scope})`, testCommand(part, tests, backendTests));
    return checks;
  });

export const formatDuration = (ms) => `${(ms / 1000).toFixed(1)}s`;

export const tailLines = (text, count = TAIL_LINES) => text.trimEnd().split("\n").slice(-count).join("\n");

const git = (...args) => execFileSync("git", args, { cwd: REPO_ROOT, encoding: "utf8" }).trim();
const lines = (text) => text.split("\n").filter(Boolean);

const changedFiles = (base) => {
  const files = new Set([
    ...lines(git("diff", "--name-only", `${base}...HEAD`)),
    ...lines(git("diff", "--name-only", "HEAD")),
    ...lines(git("ls-files", "--others", "--exclude-standard")),
  ]);
  // Deleted files have nothing to format or test.
  return [...files].filter((file) => existsSync(join(REPO_ROOT, file))).sort();
};

// Runs every check at once; resolves to [{ name, ok, ms, log }] in the order they finished.
export const runChecks = (checks, { root = REPO_ROOT, logDir, onDone = () => undefined } = {}) =>
  Promise.all(
    checks.map(
      (check) =>
        new Promise((resolve) => {
          const started = Date.now();
          const logPath = join(logDir, `${check.name.replace(/[^a-z0-9-]+/gi, "_")}.log`);
          const log = createWriteStream(logPath);
          const child = spawn(check.cmd, check.args, {
            cwd: join(root, check.cwd),
            env: { ...process.env, FORCE_COLOR: "0", CI: process.env.CI ?? "1" },
          });
          child.stdout.pipe(log, { end: false });
          child.stderr.pipe(log, { end: false });
          const finish = (code) => {
            log.end(() => {
              const result = { name: check.name, ok: code === 0, ms: Date.now() - started, log: logPath };
              onDone(result);
              resolve(result);
            });
          };
          child.on("error", (error) => {
            log.write(`${error.message}\n`);
            finish(1);
          });
          child.on("close", finish);
        })
    )
  );

const main = async () => {
  const args = parseArgs(process.argv.slice(2));
  const branch = git("branch", "--show-current") || "detached";
  const changed = changedFiles(args.base);
  const parts = args.all ? PARTS : detectParts(changed);
  if (parts.length === 0) {
    console.log(`Nothing changed against ${args.base}; use --all to check everything.`);
    return 0;
  }
  const backendTests = args.backendTests ?? (branch === "main" ? "npm" : "dev-stack");
  const checks = planChecks({ parts, changed, full: args.full, backendTests });
  const logDir = join(tmpdir(), `check-${branch.replace(/[^a-z0-9-]+/gi, "_")}`);
  mkdirSync(logDir, { recursive: true });

  console.log(`Running ${checks.length} checks in parallel (${parts.join(", ")}; logs in ${logDir})`);
  const started = Date.now();
  const results = await runChecks(checks, {
    logDir,
    onDone: ({ name, ok, ms }) => console.log(`${ok ? "✓" : "✗"} ${name} ${formatDuration(ms)}`),
  });
  const failed = results.filter((result) => !result.ok);
  for (const result of failed) {
    console.log(`\n── ${result.name} (${result.log}) ──\n${tailLines(readFileSync(result.log, "utf8"))}`);
  }
  console.log(
    `\n${failed.length === 0 ? "All checks passed" : `${failed.length} of ${results.length} checks failed`} in ${formatDuration(Date.now() - started)}`
  );
  return failed.length === 0 ? 0 : 1;
};

if (import.meta.url === `file://${process.argv[1]}`) {
  main().then(
    (code) => process.exit(code),
    (error) => {
      console.error(error.message);
      process.exit(1);
    }
  );
}
