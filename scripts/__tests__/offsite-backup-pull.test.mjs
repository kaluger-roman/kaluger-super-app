// End-to-end tests for scripts/offsite-backup/pull-backups.sh: real rsync and gzip,
// `ssh` stubbed into the real prod wrapper (see offsite-backup-fixtures.mjs).
// Run: node --test scripts/__tests__/
import { beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import {
  chmodSync,
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";

import {
  DAY_MS,
  NOW,
  SCRIPTS_DIR,
  backupName,
  createFixture,
  gzip,
  test,
} from "./offsite-backup-fixtures.mjs";

const PULL = join(SCRIPTS_DIR, "pull-backups.sh");
const HAS_RRSYNC = existsSync("/usr/bin/rrsync");

let fx;

const runPull = (env = {}) =>
  spawnSync("bash", [PULL], { env: { ...fx.env, ...env }, encoding: "utf8" });

const pullLog = () => readFileSync(join(fx.home, "logs", "pull.log"), "utf8");

const writeProd = (name, content = gzip(`dump ${name}`)) => {
  writeFileSync(join(fx.prod, name), content);
  return name;
};

const writeHome = (name, content = gzip(`copy ${name}`)) => {
  writeFileSync(join(fx.home, name), content);
  return name;
};

const homeBackups = () =>
  readdirSync(fx.home)
    .filter((name) => name.endsWith(".sql.gz"))
    .sort();

const daysAgo = (days) => backupName(NOW - days * DAY_MS);

beforeEach(() => {
  fx = createFixture();
});

afterEach(() => fx.cleanup());

test("copies new backups byte-identical and stamps the pull on prod", () => {
  const a = writeProd(daysAgo(2));
  const b = writeProd(daysAgo(1));

  const res = runPull();

  assert.equal(res.status, 0, res.stderr);
  assert.deepEqual(homeBackups(), [a, b].sort());
  for (const name of [a, b]) {
    assert.deepEqual(readFileSync(join(fx.home, name)), readFileSync(join(fx.prod, name)));
  }
  assert.match(readFileSync(join(fx.prod, ".offsite-last-pull"), "utf8"), /^\d{4}-.+Z\n$/);
  assert.match(pullLog(), /INFO done: pulled 2, corrupt 0, deleted 0, total 0\.0 MB/);
});

test("passes the dedicated key and batch options to ssh", () => {
  writeProd(daysAgo(1));

  runPull();

  const sshCall = readFileSync(fx.env.SSH_STUB_LOG, "utf8");
  assert.match(
    sshCall,
    new RegExp(
      `-i ${fx.env.OFFSITE_SSH_KEY} -o IdentitiesOnly=yes -o BatchMode=yes .*-l root prod\\.test rsync --server --sender`
    )
  );
});

test("does not copy temp files, dot-files or foreign files", () => {
  const backup = writeProd(daysAgo(1));
  writeProd(`${daysAgo(0)}.tmp`);
  writeProd(".offsite-restore-check.json", "{}");
  writeProd("notes.txt", "hello");

  const res = runPull();

  assert.equal(res.status, 0, res.stderr);
  assert.deepEqual(readdirSync(fx.home).sort(), [".lock", ".verified", backup, "logs"].sort());
});

test("keeps home copies of files deleted on prod and pulls only new files on the next run", () => {
  const first = writeProd(daysAgo(2));
  assert.equal(runPull().status, 0);

  unlinkSync(join(fx.prod, first));
  const second = writeProd(daysAgo(1));
  const res = runPull();

  assert.equal(res.status, 0, res.stderr);
  assert.deepEqual(homeBackups(), [first, second].sort());
  assert.match(pullLog(), /done: pulled 1, corrupt 0/);
  assert.equal(pullLog().match(new RegExp(`pulled ${first}`, "g")).length, 1);
});

test("removes a pulled file that is not a valid gzip archive and fails", () => {
  const good = writeProd(daysAgo(2));
  const bad = writeProd(daysAgo(1), "not gzip at all");

  const res = runPull();

  assert.equal(res.status, 1);
  assert.deepEqual(homeBackups(), [good]);
  assert.match(pullLog(), new RegExp(`ERROR corrupt archive removed: ${bad}`));
});

test("fails without touching home copies when prod is unreachable", () => {
  const old = writeHome(daysAgo(120));
  const recent = writeHome(daysAgo(1));

  const res = runPull({ SSH_STUB_EXIT: "255" });

  assert.equal(res.status, 1);
  assert.deepEqual(homeBackups(), [old, recent].sort());
  assert.match(pullLog(), /ERROR rsync failed with exit code \d+/);
  assert.equal(existsSync(join(fx.prod, ".offsite-last-pull")), false);
});

test("does not pull prod files older than the home retention window", () => {
  const expired = writeProd(daysAgo(120));
  const recent = writeProd(daysAgo(1));

  assert.equal(runPull().status, 0);
  const res = runPull();

  assert.equal(res.status, 0, res.stderr);
  assert.deepEqual(homeBackups(), [recent]);
  assert.doesNotMatch(pullLog(), new RegExp(expired));
});

test("never overwrites a copy that is already at home", () => {
  const name = writeHome(daysAgo(1), gzip("original copy"));
  writeProd(name, gzip("tampered on prod"));

  const res = runPull();

  assert.equal(res.status, 0, res.stderr);
  assert.deepEqual(readFileSync(join(fx.home, name)), gzip("original copy"));
});

test("ignores future-stamped names on prod and at home", () => {
  const future = daysAgo(-30);
  writeProd(future);
  writeHome(future);
  const expired = writeHome(daysAgo(150));
  const newest = writeHome(daysAgo(100));

  const res = runPull();

  assert.equal(res.status, 0, res.stderr);
  assert.deepEqual(homeBackups(), [future, newest].sort());
  assert.match(pullLog(), new RegExp(`deleted ${expired}`));
  assert.deepEqual(readFileSync(join(fx.home, future)), gzip(`copy ${future}`));
});

test("verifies the files rsync transferred before failing and skips retention", () => {
  const bin = join(fx.root, "failing-rsync");
  mkdirSync(bin);
  writeFileSync(join(bin, "rsync"), '#!/usr/bin/env bash\n/usr/bin/rsync "$@"\nexit 23\n');
  chmodSync(join(bin, "rsync"), 0o755);
  const old = writeHome(daysAgo(120));
  const good = writeProd(daysAgo(2));
  const bad = writeProd(daysAgo(1), "not gzip at all");

  const res = runPull({ PATH: `${bin}:${fx.env.PATH}` });

  assert.equal(res.status, 1);
  assert.deepEqual(homeBackups(), [old, good].sort());
  assert.match(pullLog(), new RegExp(`INFO pulled ${good}`));
  assert.match(pullLog(), new RegExp(`ERROR corrupt archive removed: ${bad}`));
  assert.match(pullLog(), /ERROR rsync failed with exit code 23/);
});

test("does not pull names that match the day but not the backup format", () => {
  const day = new Date(NOW - DAY_MS).toISOString().slice(0, 10);
  const odd = writeProd(`backup-${day}Tgarbage.sql.gz`);
  const good = writeProd(daysAgo(1));

  const res = runPull();

  assert.equal(res.status, 0, res.stderr);
  assert.deepEqual(homeBackups(), [good]);
  assert.doesNotMatch(pullLog(), new RegExp(odd));
});

test("does not descend into directories named like backups", () => {
  const dir = join(fx.prod, daysAgo(1));
  mkdirSync(dir);
  writeFileSync(join(dir, daysAgo(2)), gzip("nested"));
  const good = writeProd(daysAgo(3));

  const res = runPull();

  assert.equal(res.status, 0, res.stderr);
  assert.deepEqual(readdirSync(fx.home).sort(), [".lock", ".verified", good, "logs"].sort());
});

test("removes a pulled name stamped more than a day ahead", () => {
  const ahead = writeProd(daysAgo(-1.25));
  const good = writeProd(daysAgo(1));

  const res = runPull();

  assert.equal(res.status, 0, res.stderr);
  assert.deepEqual(homeBackups(), [good]);
  assert.match(pullLog(), new RegExp(`ERROR unexpected name removed: ${ahead}`));
});

test("works with a key path that contains spaces", () => {
  const keyDir = join(fx.root, "key dir");
  mkdirSync(keyDir);
  const name = writeProd(daysAgo(1));

  const res = runPull({ OFFSITE_SSH_KEY: join(keyDir, "offsite key") });

  assert.equal(res.status, 0, `${res.stderr}\n${pullLog()}`);
  assert.deepEqual(homeBackups(), [name]);
});

test("refuses files over the per-file size limit", () => {
  const huge = writeProd(daysAgo(1), Buffer.alloc(4096, 7));
  const normal = writeProd(daysAgo(2));

  const res = runPull({ OFFSITE_MAX_FILE_SIZE: "1k" });

  assert.equal(res.status, 1);
  assert.deepEqual(homeBackups(), [normal]);
  assert.match(pullLog(), new RegExp(`ERROR refused, over 1k: ${huge}`));
});

test("re-checks a copy a crashed run left unverified and pulls it again when broken", () => {
  const name = writeHome(daysAgo(1), "half written");
  writeProd(name);

  const res = runPull();

  assert.equal(res.status, 1);
  assert.match(pullLog(), new RegExp(`ERROR corrupt archive removed: ${name}`));
  assert.deepEqual(readFileSync(join(fx.home, name)), readFileSync(join(fx.prod, name)));
  assert.deepEqual(readFileSync(join(fx.home, ".verified"), "utf8"), `${name}\n`);
});

test("does not re-check copies already in the verified ledger", () => {
  const name = writeHome(daysAgo(1));
  assert.equal(runPull().status, 0);
  writeFileSync(join(fx.home, name), "changed after verification");

  const res = runPull();

  assert.equal(res.status, 0, res.stderr);
  assert.deepEqual(homeBackups(), [name]);
});

test("exits 2 on unexpected arguments", () => {
  const res = spawnSync("bash", [PULL, "extra"], { env: fx.env, encoding: "utf8" });

  assert.equal(res.status, 2);
  assert.match(res.stderr, /usage: pull-backups\.sh/);
});

test("skips when another run holds the lock", () => {
  writeProd(daysAgo(1));

  const res = spawnSync("flock", [join(fx.home, ".lock"), "bash", PULL], {
    env: fx.env,
    encoding: "utf8",
  });

  assert.equal(res.status, 0, res.stderr);
  assert.deepEqual(homeBackups(), []);
  assert.match(pullLog(), /INFO skip: another offsite backup run is in progress/);
});

test("deletes copies older than 90 days and keeps younger ones", () => {
  const expired = writeHome(daysAgo(91));
  const kept = writeHome(daysAgo(89));
  const newest = writeHome(daysAgo(1));

  const res = runPull();

  assert.equal(res.status, 0, res.stderr);
  assert.deepEqual(homeBackups(), [kept, newest].sort());
  assert.match(pullLog(), new RegExp(`INFO deleted ${expired} \\(older than 90 days\\)`));
  assert.match(pullLog(), /done: pulled 0, corrupt 0, deleted 1/);
});

test("never touches files without a recognised timestamp", () => {
  writeHome(daysAgo(200));
  writeHome("backup-weird.sql.gz");
  writeHome("backup-2026-02-30T00-00-00Z.sql.gz");
  writeFileSync(join(fx.home, "notes.txt"), "keep me");
  const newest = writeHome(daysAgo(1));

  const res = runPull({ OFFSITE_MAX_BYTES: "1" });

  assert.equal(res.status, 0, res.stderr);
  assert.deepEqual(
    homeBackups(),
    ["backup-2026-02-30T00-00-00Z.sql.gz", "backup-weird.sql.gz", newest].sort()
  );
  assert.equal(existsSync(join(fx.home, "notes.txt")), true);
});

test("keeps the newest copy even when every copy is older than 90 days", () => {
  writeHome(daysAgo(150));
  const newest = writeHome(daysAgo(100));

  const res = runPull();

  assert.equal(res.status, 0, res.stderr);
  assert.deepEqual(homeBackups(), [newest]);
});

test("deletes the oldest copies over the size cap and keeps the newest even if it alone exceeds it", () => {
  const big = Buffer.alloc(4096, 1);
  const oldest = writeHome(daysAgo(3), gzip(big.toString("hex")));
  const middle = writeHome(daysAgo(2), gzip(big.toString("hex")));
  const newest = writeHome(daysAgo(1), gzip(big.toString("hex")));
  const size = readFileSync(join(fx.home, newest)).length;

  const capped = runPull({ OFFSITE_MAX_BYTES: String(size * 2) });
  assert.equal(capped.status, 0, capped.stderr);
  assert.deepEqual(homeBackups(), [middle, newest].sort());
  assert.match(pullLog(), new RegExp(`deleted ${oldest} \\(over the`));

  const tiny = runPull({ OFFSITE_MAX_BYTES: "1" });
  assert.equal(tiny.status, 0, tiny.stderr);
  assert.deepEqual(homeBackups(), [newest]);
});

test("rotates the log once it grows over the limit", () => {
  runPull();
  const before = pullLog();

  runPull({ OFFSITE_LOG_MAX_BYTES: "10" });

  assert.equal(readFileSync(join(fx.home, "logs", "pull.log.1"), "utf8").startsWith(before), true);
  assert.ok(pullLog().length < before.length + 200);
});

test("runs from an installed copy outside the repo", () => {
  const installDir = join(fx.root, "install");
  mkdirSync(installDir);
  for (const file of ["lib.sh", "pull-backups.sh"]) {
    copyFileSync(join(SCRIPTS_DIR, file), join(installDir, file));
    chmodSync(join(installDir, file), 0o755);
  }
  const name = writeProd(daysAgo(1));

  const res = spawnSync(join(installDir, "pull-backups.sh"), [], { env: fx.env, encoding: "utf8" });

  assert.equal(res.status, 0, res.stderr);
  assert.deepEqual(homeBackups(), [name]);
});

test(
  "works through the real rrsync -ro on prod",
  { skip: !HAS_RRSYNC && "no /usr/bin/rrsync" },
  () => {
    const name = writeProd(daysAgo(1));

    const res = runPull({ OFFSITE_RRSYNC: "/usr/bin/rrsync" });

    assert.equal(res.status, 0, `${res.stderr}\n${pullLog()}`);
    assert.deepEqual(homeBackups(), [name]);
    assert.equal(existsSync(join(fx.prod, ".offsite-last-pull")), true);
  }
);
