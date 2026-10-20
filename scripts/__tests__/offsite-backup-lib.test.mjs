// Tests for the sourced helpers in scripts/offsite-backup/lib.sh.
// Run: node --test scripts/__tests__/
import { beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { SCRIPTS_DIR, createFixture, test } from "./offsite-backup-fixtures.mjs";

const LIB = join(SCRIPTS_DIR, "lib.sh");

let fx;

const runLib = (script, env = {}) =>
  spawnSync("bash", ["-c", `set -euo pipefail; source "$1"; ${script}`, "lib-test", LIB], {
    env: { ...fx.env, ...env },
    encoding: "utf8",
  });

beforeEach(() => {
  fx = createFixture();
});

afterEach(() => fx.cleanup());

test("backup_epoch parses names with and without milliseconds", () => {
  const res = runLib(
    "backup_epoch backup-2026-10-16T14-00-00-058Z.sql.gz; backup_epoch backup-2026-10-16T14-00-00Z.sql.gz"
  );

  const expected = String(Date.parse("2026-10-16T14:00:00Z") / 1000);
  assert.equal(res.status, 0, res.stderr);
  assert.deepEqual(res.stdout.trim().split("\n"), [expected, expected]);
});

for (const name of [
  "backup-2026-10-16T14-00-00-058Z.sql.gz.tmp",
  "backup-2024-01-01.sql.gz",
  "backup-2026-02-30T00-00-00Z.sql.gz",
  "backup-2026-13-01T00-00-00Z.sql.gz",
  "notes.txt",
  "../backup-2026-10-16T14-00-00Z.sql.gz",
]) {
  test(`backup_epoch rejects ${name}`, () => {
    const res = runLib(`backup_epoch '${name}'`);

    assert.notEqual(res.status, 0);
    assert.equal(res.stdout, "");
  });
}

test("newest_backup picks the newest recognised name and ignores foreign and temp files", () => {
  for (const name of [
    "backup-2026-10-15T00-00-00Z.sql.gz",
    "backup-2026-10-16T06-00-00-001Z.sql.gz",
    "backup-2026-10-17T00-00-00Z.sql.gz.tmp",
    "backup-zzz.sql.gz",
    "notes.txt",
  ]) {
    writeFileSync(join(fx.home, name), "x");
  }

  const res = runLib(`newest_backup "${fx.home}"`);

  assert.equal(res.status, 0, res.stderr);
  assert.equal(res.stdout, "backup-2026-10-16T06-00-00-001Z.sql.gz\n");
});

test("newest_backup breaks same-second ties by name, not by size", () => {
  writeFileSync(join(fx.home, "backup-2026-10-16T06-00-00-001Z.sql.gz"), "x".repeat(9));
  writeFileSync(join(fx.home, "backup-2026-10-16T06-00-00-002Z.sql.gz"), "x".repeat(10));

  const res = runLib(`newest_backup "${fx.home}"`);

  assert.equal(res.status, 0, res.stderr);
  assert.equal(res.stdout, "backup-2026-10-16T06-00-00-002Z.sql.gz\n");
});

test("newest_backup prints nothing and succeeds for a dir without copies", () => {
  const res = runLib(`newest=$(newest_backup "${fx.home}"); echo "[$newest]"`);

  assert.equal(res.status, 0, res.stderr);
  assert.equal(res.stdout, "[]\n");
});

test("log strips control characters and bounds the message length", () => {
  const logFile = join(fx.home, "logs", "test.log");

  const res = runLib(
    `LOG_FILE="${logFile}"; log ERROR "$(printf 'red \\033[31m bell \\a')"; log INFO "$(printf 'x%.0s' {1..3000})"`
  );

  assert.equal(res.status, 0, res.stderr);
  const [first, second] = readFileSync(logFile, "utf8").trim().split("\n");
  assert.match(first, / ERROR red \[31m bell $/);
  assert.equal(second.split(" INFO ")[1].length, 2000);
});

// Regression: `head -c` closing the pipe early made `tr` die of SIGPIPE, and
// under `set -euo pipefail` the whole script exited with 141 on long messages.
test("log keeps the caller running for messages far over the pipe buffer", () => {
  const logFile = join(fx.home, "logs", "test.log");

  const res = runLib(
    `LOG_FILE="${logFile}"; log ERROR "$(head -c 200000 /dev/zero | tr '\\0' x)"; echo survived`
  );

  assert.equal(res.status, 0, res.stderr);
  assert.equal(res.stdout, "survived\n");
  const line = readFileSync(logFile, "utf8").trim();
  assert.equal(line.split(" ERROR ")[1].length, 2000);
});

test("log writes UTC lines and rotates a log over the limit to .1", () => {
  const logFile = join(fx.home, "logs", "test.log");

  const first = runLib(`LOG_FILE="${logFile}"; log INFO "first line"`);
  assert.equal(first.status, 0, first.stderr);
  assert.match(
    readFileSync(logFile, "utf8"),
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z INFO first line\n$/
  );

  const second = runLib(`LOG_FILE="${logFile}"; log ERROR "second line"`, {
    OFFSITE_LOG_MAX_BYTES: "5",
  });
  assert.equal(second.status, 0, second.stderr);
  assert.match(readFileSync(`${logFile}.1`, "utf8"), /INFO first line/);
  assert.match(readFileSync(logFile, "utf8"), /^\S+ ERROR second line\n$/);
});

test("acquire_lock_nowait fails while another process holds the lock", () => {
  const res = spawnSync(
    "flock",
    [
      join(fx.home, ".lock"),
      "bash",
      "-c",
      `source "$1"; acquire_lock_nowait && echo got || echo busy`,
      "x",
      LIB,
    ],
    { env: fx.env, encoding: "utf8" }
  );

  assert.equal(res.stdout.trim(), "busy");
});

test("acquire_lock_nowait succeeds when the lock is free", () => {
  const res = runLib("acquire_lock_nowait && echo got");

  assert.equal(res.stdout.trim(), "got");
  assert.equal(existsSync(join(fx.home, ".lock")), true);
});

test("now_epoch honours OFFSITE_NOW and falls back to the clock", () => {
  assert.equal(runLib("now_epoch", { OFFSITE_NOW: "12345" }).stdout, "12345\n");

  const live = Number(runLib("now_epoch", { OFFSITE_NOW: "" }).stdout);
  assert.ok(Math.abs(live - Date.now() / 1000) < 60);
});

test("defaults point at the home copy dir and the prod Tailscale host", () => {
  const res = spawnSync(
    "bash",
    [
      "-c",
      'source "$1"; echo "$OFFSITE_DEST|$OFFSITE_HOST|$OFFSITE_RETENTION_DAYS|$OFFSITE_MAX_BYTES|$OFFSITE_PG_IMAGE"',
      "x",
      LIB,
    ],
    { env: { PATH: process.env.PATH, HOME: "/home/someone" }, encoding: "utf8" }
  );

  assert.equal(
    res.stdout.trim(),
    "/home/someone/prod-backups|root@100.71.145.114|90|21474836480|postgres:16-alpine"
  );
});
