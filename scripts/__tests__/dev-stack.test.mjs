// Fixture-based test for the backend wrappers of scripts/dev-stack.sh. Run: node --test scripts/__tests__/
// A temp git repo holds a copy of the script; `npm` is a stub that dumps its environment and exits,
// so no server starts. The dotenv-cli and bcryptjs checks use the backend's installed packages.
import { test, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import {
  chmodSync,
  copyFileSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const REPO_ROOT = dirname(dirname(dirname(fileURLToPath(import.meta.url))));
const BACKEND_MODULES = join(REPO_ROOT, "backend", "node_modules");
const FAKE_NPM = '#!/bin/sh\necho "$*" > "$NPM_ARGS"\nenv > "$NPM_ENV"\n';
const E2E_ADMIN_PASSWORD = "E2eAdmin!2026";

let root;
let repo;
let env;

const git = (...args) => execFileSync("git", args, { cwd: repo, env, stdio: "ignore" });

const run = (command) =>
  spawnSync("bash", [join(repo, "scripts", "dev-stack.sh"), command], {
    cwd: repo,
    env,
    encoding: "utf8",
  });

const npmEnv = () =>
  Object.fromEntries(
    readFileSync(env.NPM_ENV, "utf8")
      .trim()
      .split("\n")
      .map((line) => [line.slice(0, line.indexOf("=")), line.slice(line.indexOf("=") + 1)])
  );

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), "dev-stack-"));
  repo = join(root, "repo");
  const bin = join(root, "bin");
  mkdirSync(join(repo, "scripts"), { recursive: true });
  mkdirSync(join(repo, "backend"));
  mkdirSync(bin);
  copyFileSync(join(REPO_ROOT, "scripts", "dev-stack.sh"), join(repo, "scripts", "dev-stack.sh"));
  copyFileSync(join(REPO_ROOT, "docker-compose.dev.yml"), join(repo, "docker-compose.dev.yml"));
  writeFileSync(join(bin, "npm"), FAKE_NPM);
  chmodSync(join(bin, "npm"), 0o755);
  env = {
    PATH: `${bin}:${process.env.PATH}`,
    HOME: root,
    DEV_STACK_PG_LIB_DIR: join(root, "postgresql"),
    GIT_CONFIG_GLOBAL: "/dev/null",
    GIT_CONFIG_NOSYSTEM: "1",
    GIT_AUTHOR_NAME: "Test",
    GIT_AUTHOR_EMAIL: "test@example.com",
    GIT_COMMITTER_NAME: "Test",
    GIT_COMMITTER_EMAIL: "test@example.com",
    NPM_ARGS: join(root, "npm-args"),
    NPM_ENV: join(root, "npm-env"),
  };
  git("init", "-q", "-b", "feature-x");
  git("commit", "-q", "--allow-empty", "-m", "init");
});

afterEach(() => rmSync(root, { recursive: true, force: true }));

test("run-backend-e2e starts the backend in e2e mode on the branch's test database", () => {
  const res = run("run-backend-e2e");

  assert.equal(res.status, 0, res.stderr);
  assert.equal(readFileSync(env.NPM_ARGS, "utf8").trim(), "run dev");
  const vars = npmEnv();
  assert.equal(vars.NODE_ENV, "test");
  assert.equal(vars.E2E, "1");
  assert.equal(vars.PORT, "3011");
  assert.equal(
    vars.DATABASE_URL,
    "postgresql://dev:dev@localhost:15433/tutor_app_test?schema=public"
  );
  assert.equal(vars.FRONTEND_URL, "http://localhost:3010");
});

test("run-backend-e2e sets every secret and the admin login the e2e specs need, ignoring backend/.env", () => {
  writeFileSync(
    join(repo, "backend", ".env"),
    "ADMIN_EMAIL=personal@example.com\nJWT_SECRET=personal\n"
  );

  const res = run("run-backend-e2e");

  assert.equal(res.status, 0, res.stderr);
  const vars = npmEnv();
  for (const name of ["JWT_SECRET", "ADMIN_JWT_SECRET", "STUDENT_JWT_SECRET"]) {
    assert.match(vars[name] ?? "", /^e2e-/, name);
  }
  assert.equal(vars.ADMIN_EMAIL, "admin@e2e.local");
  assert.match(vars.ADMIN_PASSWORD_HASH ?? "", /^\$2b\$10\$/);
});

test(
  "the e2e admin password hash matches the documented password",
  { skip: !existsSync(join(BACKEND_MODULES, "bcryptjs")) && "run npm ci in backend/" },
  () => {
    run("run-backend-e2e");
    const bcrypt = createRequire(join(REPO_ROOT, "backend", "package.json"))("bcryptjs");

    assert.equal(bcrypt.compareSync(E2E_ADMIN_PASSWORD, npmEnv().ADMIN_PASSWORD_HASH), true);
  }
);

test("run-backend starts without a backend/.env", () => {
  const res = run("run-backend");

  assert.equal(res.status, 0, res.stderr);
  assert.equal(readFileSync(env.NPM_ARGS, "utf8").trim(), "run dev");
  assert.equal(npmEnv().PORT, "3011");
});

test(
  "run-backend loads personal secrets from backend/.env but keeps the branch's port and database",
  { skip: !existsSync(join(BACKEND_MODULES, ".bin", "dotenv")) && "run npm ci in backend/" },
  () => {
    symlinkSync(BACKEND_MODULES, join(repo, "backend", "node_modules"));
    writeFileSync(
      join(repo, "backend", ".env"),
      "RESEND_API_KEY=re_personal\nPORT=3001\nDATABASE_URL=postgresql://me@localhost:5432/tutor_app\n"
    );

    const res = run("run-backend");

    assert.equal(res.status, 0, res.stderr);
    const vars = npmEnv();
    assert.equal(vars.RESEND_API_KEY, "re_personal");
    assert.equal(vars.PORT, "3011");
    assert.equal(vars.DATABASE_URL, "postgresql://dev:dev@localhost:15433/tutor_app?schema=public");
  }
);

test("test-backend hands jest the branch's test database in a variable .env.test cannot override", () => {
  writeFileSync(
    join(repo, "backend", ".env.test"),
    "DATABASE_URL=postgresql://me@localhost:5432/tutor_test\n"
  );

  const res = run("test-backend");

  assert.equal(res.status, 0, res.stderr);
  assert.equal(readFileSync(env.NPM_ARGS, "utf8").trim(), "test --");
  const vars = npmEnv();
  const branchTestDb = "postgresql://dev:dev@localhost:15433/tutor_app_test?schema=public";
  assert.equal(vars.TEST_DATABASE_URL, branchTestDb);
  assert.equal(vars.DATABASE_URL, branchTestDb);
});

const installPgClient = (major) => {
  const binDir = join(env.DEV_STACK_PG_LIB_DIR, major, "bin");
  mkdirSync(binDir, { recursive: true });
  writeFileSync(join(binDir, "pg_dump"), "#!/bin/sh\n");
  chmodSync(join(binDir, "pg_dump"), 0o755);
  return binDir;
};

for (const command of ["run-backend", "run-backend-e2e", "test-backend"]) {
  test(`${command} puts the pg_dump matching the stand's Postgres image first on PATH`, () => {
    const major = readFileSync(join(REPO_ROOT, "docker-compose.dev.yml"), "utf8").match(
      /image: postgres:(\d+)/
    )[1];
    installPgClient("14");
    const binDir = installPgClient(major);

    const res = run(command);

    assert.equal(res.status, 0, res.stderr);
    assert.equal(npmEnv().PATH.split(":")[0], binDir);
  });
}

test("run-backend-e2e leaves PATH alone when the stand's pg_dump is not installed", () => {
  installPgClient("14");

  const res = run("run-backend-e2e");

  assert.equal(res.status, 0, res.stderr);
  assert.equal(npmEnv().PATH, env.PATH);
});
