// Guards the Postgres healthchecks of the dev and QA stacks (issue #168). Run: node --test scripts/__tests__/
// On first boot postgres' docker-entrypoint runs initdb on a socket-only server, so a socket check goes
// green before TCP is up and `compose up --wait` lets migrations hit P1001.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const REPO_ROOT = dirname(dirname(dirname(fileURLToPath(import.meta.url))));

const dbHealthcheck = (file) => {
  const compose = readFileSync(join(REPO_ROOT, file), "utf8");
  const db = compose.match(/^ {2}db:\n((?: {4}.*\n|\n)*)/m)?.[1] ?? "";
  return db.match(/pg_isready[^"\n]*/)?.[0] ?? "";
};

for (const file of ["docker-compose.dev.yml", "docker-compose.qa.yml"]) {
  test(`${file}: the db healthcheck checks Postgres over TCP, not the unix socket`, () => {
    assert.match(dbHealthcheck(file), /^pg_isready .*-h 127\.0\.0\.1 /);
  });
}
