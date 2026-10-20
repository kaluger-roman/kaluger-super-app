// Tests for scripts/offsite-backup/restore-check.sh with a stubbed `docker` and
// `ssh` routed into the real prod wrapper (see offsite-backup-fixtures.mjs).
// Run: node --test scripts/__tests__/
import { beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, statSync, utimesSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import {
  DAY_MS,
  DUMP_SQL,
  NOW,
  SCRIPTS_DIR,
  backupName,
  createFixture,
  gzip,
  test,
} from "./offsite-backup-fixtures.mjs";

const RESTORE_CHECK = join(SCRIPTS_DIR, "restore-check.sh");
const HOUR_S = 60 * 60;

let fx;

const runCheck = (args = ["--force"], env = {}) =>
  spawnSync("bash", [RESTORE_CHECK, ...args], {
    env: { ...fx.env, OFFSITE_PG_READY_TIMEOUT: "2", ...env },
    encoding: "utf8",
  });

const writeCopy = (daysAgo, content = gzip(DUMP_SQL)) => {
  const name = backupName(NOW - daysAgo * DAY_MS);
  writeFileSync(join(fx.home, name), content);
  return name;
};

const dockerCalls = () =>
  existsSync(fx.env.DOCKER_LOG) ? readFileSync(fx.env.DOCKER_LOG, "utf8").trim().split("\n") : [];

const prodResult = () => {
  const { checkedAt, ...rest } = JSON.parse(
    readFileSync(join(fx.prod, ".offsite-restore-check.json"), "utf8")
  );
  assert.match(checkedAt, /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/);
  return rest;
};

const checkLog = () => readFileSync(join(fx.home, "logs", "restore-check.log"), "utf8");
const stampPath = () => join(fx.home, ".last-restore-check");

const setStampAge = (hours) => {
  writeFileSync(stampPath(), "");
  const time = NOW / 1000 - hours * HOUR_S;
  utimesSync(stampPath(), time, time);
};

beforeEach(() => {
  fx = createFixture();
});

afterEach(() => fx.cleanup());

test("restores the newest copy, reports success with counts and touches the stamp", () => {
  writeCopy(3);
  const newest = writeCopy(1);

  const res = runCheck(["--force"], {
    DOCKER_COUNT_users: "14",
    DOCKER_COUNT_students: "93",
    DOCKER_COUNT_lessons: "2431",
  });

  assert.equal(res.status, 0, `${res.stderr}\n${checkLog()}`);
  assert.deepEqual(prodResult(), {
    fileName: newest,
    status: "success",
    counts: { users: 14, students: 93, lessons: 2431 },
  });
  assert.equal(existsSync(stampPath()), true);
  assert.equal(readFileSync(fx.env.DOCKER_RESTORE_INPUT, "utf8"), DUMP_SQL);
  assert.match(
    checkLog(),
    new RegExp(`check passed for ${newest}: users 14, students 93, lessons 2431`)
  );
});

test("runs an isolated, labelled postgres 16 container and always removes it", () => {
  writeCopy(1);

  runCheck();

  const calls = dockerCalls();
  assert.ok(
    calls.includes(
      "run -d --rm --label offsite-restore-check --network none --memory 6g --memory-swap 6g --cpus 2 --pids-limit 512 --security-opt no-new-privileges --tmpfs /var/lib/postgresql/data:rw,size=4g -e POSTGRES_HOST_AUTH_METHOD=trust postgres:16-alpine"
    ),
    calls.join("\n")
  );
  assert.equal(calls.at(-1), "rm -fv cid-test");
});

test("creates the dump's owner roles before restoring", () => {
  writeCopy(1);

  runCheck();

  const calls = dockerCalls();
  const roleIndex = calls.findIndex((c) => c.includes('CREATE ROLE "roman-kaluger"'));
  const restoreIndex = calls.findIndex(
    (c) => c === "exec -i cid-test psql -v ON_ERROR_STOP=1 -q -U postgres -d restore_check"
  );
  assert.ok(roleIndex >= 0, calls.join("\n"));
  assert.ok(restoreIndex > roleIndex, calls.join("\n"));
  assert.equal(
    calls.some((c) => c.includes('CREATE ROLE "postgres"')),
    false
  );
});

test("ignores OWNER TO inside COPY data when creating roles", () => {
  writeCopy(
    1,
    gzip(`${DUMP_SQL}COPY public.notes (text) FROM stdin;\nALTER x OWNER TO a b;\n\\.\n`)
  );

  const res = runCheck();

  assert.equal(res.status, 0, checkLog());
  const calls = dockerCalls();
  assert.equal(
    calls.some((c) => c.includes('CREATE ROLE "a b"') || c.includes('CREATE ROLE "a')),
    false,
    calls.join("\n")
  );
  assert.equal(prodResult().status, "success");
});

test("reports restore_failed when the restore runs over the timeout", () => {
  const name = writeCopy(1);

  const res = runCheck(["--force"], { DOCKER_RESTORE_SLEEP: "5", OFFSITE_RESTORE_TIMEOUT: "1" });

  assert.equal(res.status, 1);
  assert.deepEqual(prodResult(), { fileName: name, status: "error", reason: "restore_failed" });
  assert.equal(dockerCalls().at(-1), "rm -fv cid-test");
});

test("reports query_failed when a check query hangs past the timeout", () => {
  const name = writeCopy(1);

  const res = runCheck(["--force"], { DOCKER_COUNT_SLEEP: "5", OFFSITE_QUERY_TIMEOUT: "1" });

  assert.equal(res.status, 1);
  assert.deepEqual(prodResult(), { fileName: name, status: "error", reason: "query_failed" });
  assert.equal(dockerCalls().at(-1), "rm -fv cid-test");
});

test("reports stale_copy without starting docker when the newest copy is too old", () => {
  const name = writeCopy(3);

  const res = runCheck();

  assert.equal(res.status, 1);
  assert.deepEqual(prodResult(), { fileName: name, status: "error", reason: "stale_copy" });
  assert.deepEqual(dockerCalls(), []);
});

test("skips owner roles with unexpected names in DDL and logs a warning", () => {
  writeCopy(1, gzip(`${DUMP_SQL}ALTER TABLE public.t OWNER TO "a b";\n`));

  const res = runCheck();

  assert.equal(res.status, 0, checkLog());
  assert.equal(
    dockerCalls().some((c) => c.includes("CREATE ROLE") && c.includes("a b")),
    false
  );
  assert.match(checkLog(), /WARN skipping unexpected owner role in the dump: "a b"/);
});

test("does not start the 24 h pause after stale_copy", () => {
  writeCopy(3);

  assert.equal(runCheck([]).status, 1);

  assert.equal(existsSync(stampPath()), false);
  assert.equal(prodResult().reason, "stale_copy");
});

test("still runs 23.5 h after the last check started", () => {
  writeCopy(1);
  setStampAge(23.5);

  const res = runCheck([]);

  assert.equal(res.status, 0, checkLog());
  assert.equal(prodResult().status, "success");
});

test("creates all owner roles in one psql call", () => {
  const roles = ["a", "b", "c"].map((r) => `ALTER TABLE public.${r} OWNER TO ${r};`).join("\n");
  writeCopy(1, gzip(`${DUMP_SQL}${roles}\n`));

  runCheck();

  const roleCalls = dockerCalls().filter((c) => c.includes("CREATE ROLE"));
  assert.equal(roleCalls.length, 1, roleCalls.join("\n"));
  for (const role of ["a", "b", "c", "roman-kaluger"]) {
    assert.ok(roleCalls[0].includes(`CREATE ROLE "${role}"`), roleCalls[0]);
  }
});

test("reports restore_failed when the dump names too many owner roles", () => {
  const name = writeCopy(1);

  const res = runCheck(["--force"], { OFFSITE_MAX_OWNER_ROLES: "0" });

  assert.equal(res.status, 1);
  assert.deepEqual(prodResult(), { fileName: name, status: "error", reason: "restore_failed" });
  assert.match(checkLog(), /too many owner roles in the dump: 1/);
});

test("stamps the check with its start time", () => {
  writeCopy(1);

  runCheck();

  assert.equal(statSync(stampPath()).mtimeMs, NOW);
});

test("removes leftover containers from an earlier crashed run", () => {
  writeCopy(1);

  runCheck(["--force"], { DOCKER_LEFTOVER: "old-cid" });

  assert.ok(dockerCalls().includes("rm -fv old-cid"));
});

test("reports an empty table as an error and exits 1", () => {
  const name = writeCopy(1);

  const res = runCheck(["--force"], { DOCKER_COUNT_lessons: "0" });

  assert.equal(res.status, 1);
  assert.deepEqual(prodResult(), {
    fileName: name,
    status: "error",
    reason: "empty_table_lessons",
  });
  assert.equal(dockerCalls().at(-1), "rm -fv cid-test");
  assert.equal(existsSync(stampPath()), true);
});

test("reports a missing table", () => {
  const name = writeCopy(1);

  const res = runCheck(["--force"], { DOCKER_EXISTS_students: "f" });

  assert.equal(res.status, 1);
  assert.deepEqual(prodResult(), {
    fileName: name,
    status: "error",
    reason: "missing_table_students",
  });
});

test("reports a failed query", () => {
  const name = writeCopy(1);

  const res = runCheck(["--force"], { DOCKER_COUNT_users: "ERROR" });

  assert.equal(res.status, 1);
  assert.deepEqual(prodResult(), { fileName: name, status: "error", reason: "query_failed" });
});

test("reports a failed restore and logs the SQL error", () => {
  const name = writeCopy(1);

  const res = runCheck(["--force"], { DOCKER_RESTORE_FAIL: "1" });

  assert.equal(res.status, 1);
  assert.deepEqual(prodResult(), { fileName: name, status: "error", reason: "restore_failed" });
  assert.match(checkLog(), /restore_failed \(ERROR: +syntax error/);
  assert.equal(dockerCalls().at(-1), "rm -fv cid-test");
});

test("reports docker_failed when the container cannot start", () => {
  const name = writeCopy(1);

  const res = runCheck(["--force"], { DOCKER_RUN_FAIL: "1" });

  assert.equal(res.status, 1);
  assert.deepEqual(prodResult(), { fileName: name, status: "error", reason: "docker_failed" });
  assert.equal(dockerCalls().includes("rm -fv cid-test"), false);
  assert.match(checkLog(), /Cannot connect to the Docker daemon/);
});

test("reports docker_failed and removes the container when postgres never becomes ready", () => {
  const name = writeCopy(1);

  const res = runCheck(["--force"], { DOCKER_READY_EXIT: "2", OFFSITE_PG_READY_TIMEOUT: "1" });

  assert.equal(res.status, 1);
  assert.deepEqual(prodResult(), { fileName: name, status: "error", reason: "docker_failed" });
  assert.equal(dockerCalls().at(-1), "rm -fv cid-test");
  assert.ok(dockerCalls().some((c) => c.startsWith("exec cid-test pg_isready -q -h 127.0.0.1")));
});

test("reports gzip_corrupt for a broken newest copy without starting docker", () => {
  writeCopy(2);
  const broken = writeCopy(1, "not a gzip archive");

  const res = runCheck();

  assert.equal(res.status, 1);
  assert.deepEqual(prodResult(), { fileName: broken, status: "error", reason: "gzip_corrupt" });
  assert.equal(
    dockerCalls().some((c) => c.startsWith("run")),
    false
  );
});

test("reports no_copy with fileName null when there are no copies", () => {
  writeFileSync(join(fx.home, "notes.txt"), "not a backup");

  const res = runCheck();

  assert.equal(res.status, 1);
  assert.deepEqual(prodResult(), { fileName: null, status: "error", reason: "no_copy" });
});

test("skips silently when the last check is younger than the interval", () => {
  writeCopy(1);
  setStampAge(23);

  const res = runCheck([]);

  assert.equal(res.status, 0);
  assert.deepEqual(dockerCalls(), []);
  assert.equal(existsSync(join(fx.prod, ".offsite-restore-check.json")), false);
  assert.equal(existsSync(join(fx.home, "logs", "restore-check.log")), false);
});

test("runs when the last check is older than the interval", () => {
  writeCopy(1);
  setStampAge(25);

  const res = runCheck([]);

  assert.equal(res.status, 0, checkLog());
  assert.equal(prodResult().status, "success");
});

test("--force ignores a fresh stamp", () => {
  writeCopy(1);
  setStampAge(1);

  const res = runCheck(["--force"]);

  assert.equal(res.status, 0, checkLog());
  assert.equal(prodResult().status, "success");
});

test("keeps the stamp untouched and exits 1 when the report does not reach prod", () => {
  writeCopy(1);

  const res = runCheck(["--force"], { SSH_STUB_EXIT: "255" });

  assert.equal(res.status, 1);
  assert.equal(existsSync(stampPath()), false);
  assert.match(checkLog(), /ERROR could not report the result to prod \(exit 255\)/);
  assert.equal(dockerCalls().at(-1), "rm -fv cid-test");
});

test("sends the report with the dedicated key", () => {
  const name = writeCopy(1);

  runCheck();

  assert.match(
    readFileSync(fx.env.SSH_STUB_LOG, "utf8"),
    new RegExp(
      `-i ${fx.env.OFFSITE_SSH_KEY} -o IdentitiesOnly=yes -o BatchMode=yes .* root@prod\\.test report-restore-check success ${name} 7 7 7`
    )
  );
});

for (const args of [["--now"], ["--force", "extra"], ["force"]]) {
  test(`exits 2 on bad arguments ${JSON.stringify(args)}`, () => {
    const res = runCheck(args);

    assert.equal(res.status, 2);
    assert.match(res.stderr, /usage: restore-check\.sh \[--force\]/);
    assert.deepEqual(dockerCalls(), []);
  });
}
