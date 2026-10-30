// Tests for scripts/offsite-backup/prod-ssh-wrapper.sh (the forced command of the
// offsite key on prod). Run: node --test scripts/__tests__/
import { beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { WRAPPER, createFixture, test } from "./offsite-backup-fixtures.mjs";

const ISO_UTC = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/;
const FILE = "backup-2026-10-16T00-00-01-123Z.sql.gz";

let fx;

const runWrapper = (command, { args, env = {} } = {}) =>
  spawnSync("bash", [WRAPPER, ...(args ?? [fx.prod])], {
    env: { ...fx.env, SSH_ORIGINAL_COMMAND: command, ...env },
    encoding: "utf8",
  });

const rrsyncCalls = () =>
  existsSync(fx.env.RRSYNC_STUB_LOG)
    ? readFileSync(fx.env.RRSYNC_STUB_LOG, "utf8").trim().split("\n")
    : [];

const stampPath = () => join(fx.prod, ".offsite-last-pull");
const resultPath = () => join(fx.prod, ".offsite-restore-check.json");
const readResult = () => JSON.parse(readFileSync(resultPath(), "utf8"));

beforeEach(() => {
  fx = createFixture();
});

afterEach(() => fx.cleanup());

test("rsync --sender is served by rrsync read-only and stamps the pull", () => {
  const res = runWrapper("rsync --server --sender -tre.iLsfxCIvu . ./", {
    env: { RRSYNC_STUB_EXIT: "0" },
  });

  assert.equal(res.status, 0, res.stderr);
  assert.deepEqual(rrsyncCalls(), [`-ro ${fx.prod}`]);
  const stamp = readFileSync(stampPath(), "utf8").trim();
  assert.match(stamp, ISO_UTC);
  assert.ok(Math.abs(Date.parse(stamp) - Date.now()) < 60_000);
  assert.equal(existsSync(`${stampPath()}.tmp`), false);
});

for (const code of ["1", "23", "24"]) {
  test(`rrsync exit ${code} is propagated and leaves the stamp untouched`, () => {
    writeFileSync(stampPath(), "2026-10-01T00:00:00Z\n");

    const res = runWrapper("rsync --server --sender -tre.iLsfxCIvu . ./", {
      env: { RRSYNC_STUB_EXIT: code },
    });

    assert.equal(res.status, Number(code));
    assert.equal(readFileSync(stampPath(), "utf8"), "2026-10-01T00:00:00Z\n");
  });
}

for (const command of [
  "",
  "rsync --server -tre.iLsfxCIvu . ./",
  "rsync --server --senderx . ./",
  "scp -f backup.sql.gz",
  "bash",
  "cat /etc/passwd",
  "sftp",
  "report-restore-check",
]) {
  test(`refuses ${JSON.stringify(command)} without calling rrsync or writing files`, () => {
    const res = runWrapper(command);

    assert.equal(res.status, 1);
    assert.match(res.stderr, /offsite-backup-ssh: command not allowed/);
    assert.deepEqual(rrsyncCalls(), []);
    assert.equal(existsSync(stampPath()), false);
    assert.equal(existsSync(resultPath()), false);
  });
}

test("exits 2 when the backup dir argument is missing or not a directory", () => {
  assert.equal(runWrapper("bash", { args: [] }).status, 2);
  assert.equal(runWrapper("bash", { args: [join(fx.prod, "nope")] }).status, 2);
});

test("records a successful restore check with counts stripped of leading zeros", () => {
  const res = runWrapper(`report-restore-check success ${FILE} 014 93 0002431`);

  assert.equal(res.status, 0, res.stderr);
  const result = readResult();
  assert.match(result.checkedAt, ISO_UTC);
  assert.deepEqual(
    { ...result, checkedAt: "x" },
    {
      checkedAt: "x",
      fileName: FILE,
      status: "success",
      counts: { users: 14, students: 93, lessons: 2431 },
    }
  );
  assert.equal(existsSync(`${resultPath()}.tmp`), false);
});

test("records an error result with a file name", () => {
  const res = runWrapper(`report-restore-check error ${FILE} empty_table_lessons`);

  assert.equal(res.status, 0, res.stderr);
  const { checkedAt, ...rest } = readResult();
  assert.match(checkedAt, ISO_UTC);
  assert.deepEqual(rest, { fileName: FILE, status: "error", reason: "empty_table_lessons" });
});

test("accepts the stale_copy reason", () => {
  const res = runWrapper(`report-restore-check error ${FILE} stale_copy`);

  assert.equal(res.status, 0, res.stderr);
  assert.equal(readResult().reason, "stale_copy");
});

test("records an error result without a file as fileName null", () => {
  const res = runWrapper("report-restore-check error - no_copy");

  assert.equal(res.status, 0, res.stderr);
  const { checkedAt, ...rest } = readResult();
  assert.match(checkedAt, ISO_UTC);
  assert.deepEqual(rest, { fileName: null, status: "error", reason: "no_copy" });
});

for (const [label, command] of [
  ["an extra token", `report-restore-check success ${FILE} 1 2 3 4`],
  ["a missing token", `report-restore-check success ${FILE} 1 2`],
  ["a missing reason", `report-restore-check error ${FILE}`],
  ["a non-numeric count", `report-restore-check success ${FILE} 1 two 3`],
  ["a negative count", `report-restore-check success ${FILE} 1 -2 3`],
  ["a 10-digit count", `report-restore-check success ${FILE} 1234567890 2 3`],
  ["an unknown reason", `report-restore-check error ${FILE} disk_on_fire`],
  ["a path traversal file name", "report-restore-check error ../../etc/passwd no_copy"],
  ["a foreign file name", "report-restore-check error notes.txt no_copy"],
  ["a dash instead of the file on success", "report-restore-check success - 1 2 3"],
  ["command substitution", `report-restore-check error $(id) no_copy`],
  ["a glob", "report-restore-check error * no_copy"],
  ["quotes", `report-restore-check error "${FILE}" no_copy`],
  ["a newline", `report-restore-check error - no_copy\nreport-restore-check error - gzip_corrupt`],
  ["a tab", "report-restore-check error -\tno_copy"],
  ["double spaces", "report-restore-check error -  no_copy"],
  ["a trailing space", "report-restore-check error - no_copy "],
  ["an unknown status", "report-restore-check maybe - no_copy"],
  ["more than 256 chars", `report-restore-check error - no_copy${" x".repeat(120)}`],
]) {
  test(`rejects a report with ${label} and keeps the previous result`, () => {
    writeFileSync(resultPath(), '{"previous":true}\n');

    const res = runWrapper(command);

    assert.equal(res.status, 1);
    assert.match(res.stderr, /offsite-backup-ssh: /);
    assert.equal(readFileSync(resultPath(), "utf8"), '{"previous":true}\n');
    assert.equal(existsSync(stampPath()), false);
  });
}

const storagePath = () => join(fx.prod, ".offsite-storage.json");
const readStorage = () => JSON.parse(readFileSync(storagePath(), "utf8"));

test("records a storage report with numbers stripped of leading zeros", () => {
  const res = runWrapper("report-storage 0001610612736 250059350016 0 021474836480 1");

  assert.equal(res.status, 0, res.stderr);
  const raw = readFileSync(storagePath(), "utf8");
  assert.match(
    raw,
    /^\{"reportedAt":"[^"]+","freeBytes":1610612736,"totalBytes":250059350016,"backupsBytes":0,"capBytes":21474836480,"capPruned":true\}\n$/
  );
  const { reportedAt, ...rest } = readStorage();
  assert.match(reportedAt, ISO_UTC);
  assert.ok(Math.abs(Date.parse(reportedAt) - Date.now()) < 60_000);
  assert.deepEqual(rest, {
    freeBytes: 1610612736,
    totalBytes: 250059350016,
    backupsBytes: 0,
    capBytes: 21474836480,
    capPruned: true,
  });
  assert.equal(existsSync(`${storagePath()}.tmp`), false);
  assert.equal(existsSync(resultPath()), false);
  assert.equal(existsSync(stampPath()), false);
});

test("records capPruned false, accepts 15-digit numbers and replaces the previous report", () => {
  writeFileSync(storagePath(), '{"previous":true}\n');

  const res = runWrapper("report-storage 999999999999999 999999999999999 209715200 1 0");

  assert.equal(res.status, 0, res.stderr);
  const { reportedAt, ...rest } = readStorage();
  assert.match(reportedAt, ISO_UTC);
  assert.deepEqual(rest, {
    freeBytes: 999999999999999,
    totalBytes: 999999999999999,
    backupsBytes: 209715200,
    capBytes: 1,
    capPruned: false,
  });
});

for (const [label, command, message] of [
  ["too few fields", "report-storage 1 2 3", "wrong number of fields"],
  ["no fields", "report-storage 1", "wrong number of fields"],
  ["too many fields", "report-storage 1 2 3 4 0 5", "wrong number of fields"],
  ["a non-numeric number", "report-storage 1 2 three 4 0", "bad number"],
  ["a negative number", "report-storage -1 2 3 4 0", "bad number"],
  ["a fractional number", "report-storage 1.5 2 3 4 0", "bad number"],
  ["a 16-digit number", "report-storage 1 1234567890123456 3 4 0", "bad number"],
  ["a zero totalBytes", "report-storage 1 0 3 4 0", "bad number"],
  ["a zero-padded zero totalBytes", "report-storage 1 000 3 4 0", "bad number"],
  ["the flag 2", "report-storage 1 2 3 4 2", "bad flag"],
  ["the flag true", "report-storage 1 2 3 4 true", "bad flag"],
  ["the flag 01", "report-storage 1 2 3 4 01", "bad flag"],
  ["double spaces", "report-storage 1  2 3 4 0", "bad spacing"],
  ["a trailing space", "report-storage 1 2 3 4 0 ", "bad spacing"],
  ["a tab", "report-storage 1\t2 3 4 0", "unexpected characters"],
  ["a newline", "report-storage 1 2 3 4 0\nreport-storage 1 2 3 4 1", "unexpected characters"],
  ["a semicolon", "report-storage 1 2 3 4 0;id", "unexpected characters"],
  ["a dollar sign", "report-storage 1 2 3 4 $(id)", "unexpected characters"],
  ["a slash", "report-storage 1 2 3 4 0/..", "unexpected characters"],
  ["more than 256 chars", `report-storage 1 2 3 4 0${" 1".repeat(120)}`, "too long"],
]) {
  test(`rejects a storage report with ${label} and keeps the previous report`, () => {
    writeFileSync(storagePath(), '{"previous":true}\n');

    const res = runWrapper(command);

    assert.equal(res.status, 1);
    assert.match(res.stderr, new RegExp(`offsite-backup-ssh: invalid report: ${message}`));
    assert.equal(readFileSync(storagePath(), "utf8"), '{"previous":true}\n');
    assert.equal(existsSync(`${storagePath()}.tmp`), false);
    assert.equal(existsSync(resultPath()), false);
  });
}

test("refuses report-storage without a payload", () => {
  const res = runWrapper("report-storage");

  assert.equal(res.status, 1);
  assert.match(res.stderr, /offsite-backup-ssh: command not allowed/);
  assert.equal(existsSync(storagePath()), false);
});
