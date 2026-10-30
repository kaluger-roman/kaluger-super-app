// Fixture-based test for the backend wrappers of scripts/dev-stack.sh. Run: node --test scripts/__tests__/
// A temp git repo holds a copy of the script; `npm` is a stub that dumps its environment and exits,
// so no server starts; `docker` and `npx` stubs log their calls. The dotenv-cli and bcryptjs checks use the backend's installed packages.
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
import { createServer } from "node:net";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const REPO_ROOT = dirname(dirname(dirname(fileURLToPath(import.meta.url))));
const BACKEND_MODULES = join(REPO_ROOT, "backend", "node_modules");
const FAKE_NPM = '#!/bin/sh\necho "$*" > "$NPM_ARGS"\nenv > "$NPM_ENV"\n';
const FAKE_DOCKER = '#!/bin/sh\necho "$* DEV_DB_PORT=$DEV_DB_PORT" >> "$DOCKER_CALLS"\nexit "${DOCKER_STATUS:-0}"\n';
const FAKE_NPX = '#!/bin/sh\necho "$* DATABASE_URL=$DATABASE_URL" >> "$NPX_CALLS"\nexit "${NPX_STATUS:-0}"\n';
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
  copyFileSync(join(REPO_ROOT, "scripts", "prisma-client.mjs"), join(repo, "scripts", "prisma-client.mjs"));
  copyFileSync(join(REPO_ROOT, "docker-compose.dev.yml"), join(repo, "docker-compose.dev.yml"));
  for (const [name, script] of [
    ["npm", FAKE_NPM],
    ["docker", FAKE_DOCKER],
    ["npx", FAKE_NPX],
  ]) {
    writeFileSync(join(bin, name), script);
    chmodSync(join(bin, name), 0o755);
  }
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
    DOCKER_CALLS: join(root, "docker-calls"),
    NPX_CALLS: join(root, "npx-calls"),
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

const calls = (path) => (existsSync(path) ? readFileSync(path, "utf8").trim().split("\n") : []);
const branchDb = (port, name) => `DATABASE_URL=postgresql://dev:dev@localhost:${port}/${name}?schema=public`;

const listen = () =>
  new Promise((resolve) => {
    const server = createServer();
    server.listen(0, "127.0.0.1", () => resolve(server));
  });

const freePort = async () => {
  const server = await listen();
  const { port } = server.address();
  await new Promise((resolve) => server.close(resolve));
  return port;
};

// The branch is in slot 1, so its db port is the base + 1.
const useDbPort = (port) => {
  env.DEV_STACK_DB_PORT_BASE = String(port - 1);
};

test("test-backend starts the branch's stopped database and migrates it before jest", async () => {
  const port = await freePort();
  useDbPort(port);

  const res = run("test-backend");

  assert.equal(res.status, 0, res.stderr);
  assert.match(res.stderr, new RegExp(`localhost:${port}\\) is not running; starting it`));
  const docker = calls(env.DOCKER_CALLS);
  assert.equal(docker.length, 1);
  assert.match(docker[0], new RegExp(`^compose -p dev-feature-x -f \\S+/docker-compose\\.dev\\.yml up -d --wait DEV_DB_PORT=${port}$`));
  assert.deepEqual(calls(env.NPX_CALLS), [
    `prisma migrate deploy ${branchDb(port, "tutor_app")}`,
    `prisma migrate deploy ${branchDb(port, "tutor_app_test")}`,
  ]);
  assert.equal(readFileSync(env.NPM_ARGS, "utf8").trim(), "test --");
});

test("test-backend on a running branch database only applies pending migrations to the test DB", async () => {
  const server = await listen();
  const { port } = server.address();
  useDbPort(port);

  const res = run("test-backend");
  server.close();

  assert.equal(res.status, 0, res.stderr);
  assert.deepEqual(calls(env.DOCKER_CALLS), []);
  assert.deepEqual(calls(env.NPX_CALLS), [`prisma migrate deploy ${branchDb(port, "tutor_app_test")}`]);
  assert.equal(readFileSync(env.NPM_ARGS, "utf8").trim(), "test --");
});

test("test-backend stops with a hint when the branch's database cannot be started", async () => {
  useDbPort(await freePort());
  env.DOCKER_STATUS = "1";

  const res = run("test-backend");

  assert.notEqual(res.status, 0);
  assert.match(res.stderr, /Could not start the branch's database/);
  assert.match(res.stderr, /bash scripts\/dev-stack\.sh up/);
  assert.match(res.stderr, /npm run check -- --backend-tests npm/);
  assert.deepEqual(calls(env.NPX_CALLS), []);
  assert.equal(existsSync(env.NPM_ARGS), false);
});

test("test-backend stops before jest when migrating the running test database fails", async () => {
  const server = await listen();
  useDbPort(server.address().port);
  env.NPX_STATUS = "1";

  const res = run("test-backend");
  server.close();

  assert.notEqual(res.status, 0);
  assert.match(res.stderr, /prisma migrate deploy to the branch's test database .* failed/);
  assert.equal(existsSync(env.NPM_ARGS), false);
});

// The worktree layout: backend/node_modules is a symlink to the main checkout's, whose client
// is generated from mainSchema.
const shareMainClient = (mainSchema) => {
  const mainBackend = join(root, "main", "backend");
  mkdirSync(join(mainBackend, "prisma"), { recursive: true });
  mkdirSync(join(mainBackend, "node_modules", ".prisma", "client"), { recursive: true });
  writeFileSync(join(mainBackend, "prisma", "schema.prisma"), mainSchema);
  writeFileSync(join(mainBackend, "node_modules", ".prisma", "client", "schema.prisma"), mainSchema);
  symlinkSync(join(mainBackend, "node_modules"), join(repo, "backend", "node_modules"));
};

for (const command of ["run-backend", "run-backend-e2e", "test-backend"]) {
  test(`${command} stops before the backend when the shared Prisma client has another schema`, () => {
    shareMainClient("model User {\n  id String @id\n}\n");
    mkdirSync(join(repo, "backend", "prisma"));
    writeFileSync(join(repo, "backend", "prisma", "schema.prisma"), "model User {\n  id String @id\n  name String?\n}\n");

    const res = run(command);

    assert.notEqual(res.status, 0);
    assert.match(res.stderr, /npm ci && npx prisma generate/);
    assert.equal(existsSync(env.NPM_ARGS), false);
  });
}

test("test-backend runs jest when the shared Prisma client matches the branch's schema", () => {
  const schema = "model User {\n  id String @id\n}\n";
  shareMainClient(schema);
  mkdirSync(join(repo, "backend", "prisma"));
  writeFileSync(join(repo, "backend", "prisma", "schema.prisma"), schema);

  const res = run("test-backend");

  assert.equal(res.status, 0, res.stderr);
  assert.equal(readFileSync(env.NPM_ARGS, "utf8").trim(), "test --");
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
