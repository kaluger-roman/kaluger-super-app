// Shared fixtures for the offsite-backup script tests (not a test file itself).
// A temp root holds a fake prod backup dir, a fake home copy dir and stub
// binaries: `ssh` routes the remote command into the real prod wrapper, the
// `rrsync` stub execs the real `rsync --server` inside the prod dir, `docker`
// records its argv and answers from env switches, `df` prints the space from
// DF_STUB_AVAIL / DF_STUB_SIZE.
import { test as nodeTest } from "node:test";
import { chmodSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { gzipSync } from "node:zlib";

const REPO_ROOT = dirname(dirname(dirname(fileURLToPath(import.meta.url))));
export const SCRIPTS_DIR = join(REPO_ROOT, "scripts", "offsite-backup");
export const WRAPPER = join(SCRIPTS_DIR, "prod-ssh-wrapper.sh");

// The scripts target the Linux home machine (GNU date/stat, flock).
const NON_LINUX_SKIP =
  process.platform !== "linux" && "offsite-backup scripts need GNU coreutils and flock";

// node:test `test`, skipped as a whole off Linux.
export const test = (name, ...args) => {
  const fn = args.pop();
  const options = args[0] ?? {};
  return nodeTest(name, { ...options, skip: options.skip || NON_LINUX_SKIP }, fn);
};

export const NOW = Date.parse("2026-10-16T12:00:00Z");
export const DAY_MS = 24 * 60 * 60 * 1000;
export const DF_AVAIL = 107374182400;
export const DF_SIZE = 250059350016;

const SSH_STUB = `#!/usr/bin/env bash
printf '%s\\n' "$*" >> "$SSH_STUB_LOG"
if [[ -n \${SSH_STUB_EXIT:-} ]]; then
  echo "ssh: connect to host: Connection timed out" >&2
  exit "$SSH_STUB_EXIT"
fi
while (($#)); do
  case $1 in
    -i | -o | -p | -l) shift 2 ;;
    -*) shift ;;
    *) break ;;
  esac
done
shift
export SSH_ORIGINAL_COMMAND="$*"
if [[ -n \${SSH_STUB_FAIL_PATTERN:-} && $SSH_ORIGINAL_COMMAND == *"$SSH_STUB_FAIL_PATTERN"* ]]; then
  echo "ssh: connect to host: Connection timed out" >&2
  exit 255
fi
exec "$OFFSITE_TEST_WRAPPER" "$OFFSITE_TEST_PROD_DIR"
`;

const DF_STUB = `#!/usr/bin/env bash
printf '%s\\n' "$*" >> "$DF_STUB_LOG"
if [[ -n \${DF_STUB_EXIT:-} ]]; then
  echo "df: cannot read table of mounted file systems" >&2
  exit "$DF_STUB_EXIT"
fi
echo "       Avail    1B-blocks"
echo "  $DF_STUB_AVAIL $DF_STUB_SIZE"
`;

const RRSYNC_STUB = `#!/usr/bin/env bash
printf '%s\\n' "$*" >> "$RRSYNC_STUB_LOG"
if [[ -n \${RRSYNC_STUB_EXIT:-} ]]; then
  exit "$RRSYNC_STUB_EXIT"
fi
cd "$2"
set -f
exec $SSH_ORIGINAL_COMMAND
`;

const DOCKER_STUB = `#!/usr/bin/env bash
printf '%s\\n' "$*" >> "$DOCKER_LOG"
case $1 in
  ps)
    if [[ -n \${DOCKER_LEFTOVER:-} ]]; then echo "$DOCKER_LEFTOVER"; fi
    exit 0
    ;;
  run)
    if [[ -n \${DOCKER_RUN_FAIL:-} ]]; then
      echo "Cannot connect to the Docker daemon" >&2
      exit 125
    fi
    echo cid-test
    exit 0
    ;;
  rm) exit 0 ;;
  exec) ;;
  *) exit 1 ;;
esac
shift
if [[ $1 == -i ]]; then shift; fi
shift
args="$*"
case $args in
  pg_isready*) exit "\${DOCKER_READY_EXIT:-0}" ;;
  createdb*) exit 0 ;;
  *"CREATE ROLE"*) exit 0 ;;
  *"to_regclass('public."*)
    table=\${args#*public.}
    table=\${table%%\\')*}
    var="DOCKER_EXISTS_$table"
    echo "\${!var:-t}"
    exit 0
    ;;
  *"count(*) FROM public."*)
    if [[ -n \${DOCKER_COUNT_SLEEP:-} ]]; then
      sleep "$DOCKER_COUNT_SLEEP"
    fi
    table=\${args##*public.}
    var="DOCKER_COUNT_$table"
    echo "\${!var:-7}"
    exit 0
    ;;
  psql*)
    cat > "$DOCKER_RESTORE_INPUT"
    if [[ -n \${DOCKER_RESTORE_SLEEP:-} ]]; then
      sleep "$DOCKER_RESTORE_SLEEP"
    fi
    if [[ -n \${DOCKER_RESTORE_FAIL:-} ]]; then
      echo "ERROR:  syntax error at or near \\"x\\"" >&2
      exit 3
    fi
    exit 0
    ;;
esac
exit 1
`;

export const DUMP_SQL = [
  "-- Dumped by pg_dump version 16.15",
  'ALTER TABLE public.users OWNER TO "roman-kaluger";',
  'ALTER TABLE public.lessons OWNER TO "roman-kaluger";',
  "ALTER TABLE public.extra OWNER TO postgres;",
  "SELECT 1;",
  "",
].join("\n");

export const backupName = (epochMs) =>
  `backup-${new Date(epochMs).toISOString().replace(/[:.]/g, "-")}.sql.gz`;

export const gzip = (content) => gzipSync(Buffer.from(content));

const writeExecutable = (path, content) => {
  writeFileSync(path, content);
  chmodSync(path, 0o755);
};

export const createFixture = () => {
  const root = mkdtempSync(join(tmpdir(), "offsite-backup-"));
  const bin = join(root, "bin");
  const prod = join(root, "prod");
  const home = join(root, "home", "prod-backups");
  mkdirSync(bin);
  mkdirSync(prod);
  mkdirSync(home, { recursive: true });
  writeExecutable(join(bin, "ssh"), SSH_STUB);
  writeExecutable(join(bin, "rrsync"), RRSYNC_STUB);
  writeExecutable(join(bin, "docker"), DOCKER_STUB);
  writeExecutable(join(bin, "df"), DF_STUB);

  const env = {
    PATH: `${bin}:${process.env.PATH}`,
    HOME: join(root, "home"),
    LANG: "C",
    OFFSITE_DEST: home,
    OFFSITE_HOST: "root@prod.test",
    OFFSITE_SSH_KEY: join(root, "home", ".ssh", "offsite_backup_ed25519"),
    OFFSITE_NOW: String(Math.floor(NOW / 1000)),
    OFFSITE_RRSYNC: join(bin, "rrsync"),
    OFFSITE_TEST_WRAPPER: WRAPPER,
    OFFSITE_TEST_PROD_DIR: prod,
    SSH_STUB_LOG: join(root, "ssh.log"),
    RRSYNC_STUB_LOG: join(root, "rrsync.log"),
    DOCKER_LOG: join(root, "docker.log"),
    DOCKER_RESTORE_INPUT: join(root, "restore-input.sql"),
    DF_STUB_LOG: join(root, "df.log"),
    DF_STUB_AVAIL: String(DF_AVAIL),
    DF_STUB_SIZE: String(DF_SIZE),
  };

  return {
    root,
    bin,
    prod,
    home,
    env,
    cleanup: () => rmSync(root, { recursive: true, force: true }),
  };
};
