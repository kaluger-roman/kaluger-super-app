import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readlinkSync, realpathSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

const script = fileURLToPath(new URL("../production/deploy-release.sh", import.meta.url));
const sha = "a".repeat(40);
const previousSha = "b".repeat(40);

for (const migrationApplied of [false, true]) {
  const name = migrationApplied
    ? "keeps the cutover and withdraws the published revision after a schema change"
    : "restores the previous containers and published revision when the schema is unchanged";

  test(name, { skip: process.platform !== "linux" }, (t) => {
    const root = realpathSync(mkdtempSync(join(tmpdir(), "home-release-")));
    t.after(() => rmSync(root, { recursive: true, force: true }));
    const path = (...parts) => join(root, ...parts);
    const runtime = path(".production");
    const deploy = join(runtime, "deploy");
    const release = join(deploy, "releases", sha);
    const migrations = join(release, "backend", "prisma", "migrations");
    const landing = join(runtime, "edge", "landing");
    const state = join(runtime, "edge", "state");
    const bin = path("bin");
    for (const dir of [migrations, landing, state, bin, join(runtime, "backups")]) {
      mkdirSync(dir, { recursive: true });
    }

    writeFileSync(join(runtime, "compose.env"), "PROD_LAN_IP=192.0.2.2\n");
    writeFileSync(join(deploy, "github-deploy.sh"), "deploy_job_ready() { return 0; }\n");
    for (const migration of ["001_existing", "002_new"]) {
      mkdirSync(join(migrations, migration));
      writeFileSync(join(migrations, migration, "migration.sql"), "SELECT 1;\n");
    }
    symlinkSync(root, join(deploy, "active"));
    symlinkSync("previous", join(landing, "current"));
    writeFileSync(join(state, "revision"), previousSha + "\n");

    const executable = (name, lines) => writeFileSync(
      join(bin, name), ["#!/bin/bash", ...lines].join("\n"), { mode: 0o700 },
    );
    executable("git", ['printf "%s\\trefs/heads/main\\n" "$REVISION"']);
    executable("curl", ["exit 1"]);
    executable("docker", [
      'case "$*" in',
      '  "buildx build --output type=local,dest="*)',
      '    export_dir=$4; export_dir=$(printf %s "$export_dir" | cut -d= -f3-);',
      '    printf "<html>fixture</html>\\n" >"$export_dir/index.html" ;;',
      '  *" db psql "*)',
      '    printf "001_existing\\tapplied\\n";',
      '    if [[ -f $TEST_DIR/migrated ]]; then printf "002_new\\tapplied\\n"; fi ;;',
      '  *" db pg_dump "*) echo "SELECT 1;" ;;',
      '  *" migrate deploy") if [[ $APPLY_MIGRATION == true ]]; then touch "$TEST_DIR/migrated"; fi ;;',
      '  *" up -d "*) printf "%s\\n" "$*" >>"$TEST_DIR/up.log" ;;',
      '  *" stop web backend"|*" config -q"|*" build backend web"|*" checkEnv.js"|*" dist/scripts/checkEnv.js") ;;',
      '  *) exit 9 ;;',
      'esac',
    ]);

    const outcome = spawnSync("bash", [script, runtime, path("repo.git"), sha, "9", "1"], {
      timeout: 10_000,
      encoding: "utf8",
      env: {
        ...process.env,
        PATH: bin + ":" + process.env.PATH,
        REVISION: sha,
        TEST_DIR: root,
        APPLY_MIGRATION: String(migrationApplied),
      },
    });
    assert.equal(outcome.status, 1, outcome.stderr || String(outcome.error ?? ""));
    assert.equal(readlinkSync(join(landing, "current")), "previous");
    const containerStarts = readFileSync(path("up.log"), "utf8").trim().split("\n");
    assert.equal(containerStarts.length, migrationApplied ? 2 : 4);
    assert.match(containerStarts[0], / backend$/);
    assert.match(containerStarts[1], / web$/);
    if (!migrationApplied) {
      assert.ok(containerStarts[2].includes(path("docker-compose.production.yml")));
      assert.ok(containerStarts[3].includes(path("docker-compose.production.yml")));
    }
    assert.equal(existsSync(join(deploy, "cutover")), migrationApplied);
    assert.equal(readlinkSync(join(deploy, "active")), migrationApplied ? release : root);
    if (migrationApplied) {
      assert.equal(existsSync(join(state, "revision")), false);
      assert.match(outcome.stderr, /needs roll-forward/);
    } else {
      assert.equal(readFileSync(join(state, "revision"), "utf8"), previousSha + "\n");
    }
  });
}
