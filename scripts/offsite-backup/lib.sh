# shellcheck shell=bash
# Shared helpers for pull-backups.sh and restore-check.sh (home side of the
# offsite backups, see docs/ops/offsite-backups.md). Sourced, not executed;
# callers set `set -euo pipefail` and LOG_FILE.

OFFSITE_DEST="${OFFSITE_DEST:-$HOME/prod-backups}"
OFFSITE_HOST="${OFFSITE_HOST:-root@100.71.145.114}"
OFFSITE_SSH_KEY="${OFFSITE_SSH_KEY:-$HOME/.ssh/offsite_backup_ed25519}"
OFFSITE_RETENTION_DAYS="${OFFSITE_RETENTION_DAYS:-90}"
OFFSITE_MAX_BYTES="${OFFSITE_MAX_BYTES:-21474836480}"
OFFSITE_LOG_MAX_BYTES="${OFFSITE_LOG_MAX_BYTES:-1048576}"
# A dump is ~0.5 MB today; anything this big from prod is refused.
OFFSITE_MAX_FILE_SIZE="${OFFSITE_MAX_FILE_SIZE:-1G}"
OFFSITE_RESTORE_INTERVAL_HOURS="${OFFSITE_RESTORE_INTERVAL_HOURS:-24}"
OFFSITE_PG_IMAGE="${OFFSITE_PG_IMAGE:-postgres:16-alpine}"
OFFSITE_PG_READY_TIMEOUT="${OFFSITE_PG_READY_TIMEOUT:-60}"
# Upper bound for restoring one dump; the run holds the shared lock meanwhile.
OFFSITE_RESTORE_TIMEOUT="${OFFSITE_RESTORE_TIMEOUT:-1800}"
# Every other docker call (start, readiness probe, queries) gets this bound:
# SQL from the dump must not be able to hold the lock forever.
OFFSITE_QUERY_TIMEOUT="${OFFSITE_QUERY_TIMEOUT:-300}"
# The restored data lives in tmpfs (never on the home disk); memory covers it.
OFFSITE_PG_DATA_SIZE="${OFFSITE_PG_DATA_SIZE:-4g}"
OFFSITE_PG_MEMORY="${OFFSITE_PG_MEMORY:-6g}"
# A newest copy older than this means pulls stopped (e.g. dumps over the size
# limit), which the restore check reports as stale_copy. Keep it above prod's
# intervalHours; with prod backups switched off this fires by design.
OFFSITE_STALE_COPY_HOURS="${OFFSITE_STALE_COPY_HOURS:-48}"
OFFSITE_MAX_OWNER_ROLES="${OFFSITE_MAX_OWNER_ROLES:-20}"
# Names stamped further in the future than this are not trusted: a tampered
# prod could otherwise fake the "newest" copy and steer the home retention.
OFFSITE_FUTURE_SKEW_SECONDS=86400

OFFSITE_BACKUP_NAME_RE='^backup-([0-9]{4}-[0-9]{2}-[0-9]{2})T([0-9]{2})-([0-9]{2})-([0-9]{2})(-[0-9]{3})?Z\.sql\.gz$'

# shellcheck disable=SC2034 # used by the scripts that source this file
SSH_OPTS=(
  -i "$OFFSITE_SSH_KEY"
  -o IdentitiesOnly=yes
  -o BatchMode=yes
  -o ConnectTimeout=20
  -o ServerAliveInterval=15
  -o ServerAliveCountMax=4
)

now_epoch() {
  if [[ -n "${OFFSITE_NOW:-}" ]]; then
    echo "$OFFSITE_NOW"
  else
    date -u +%s
  fi
}

rotate_log() {
  [[ -f "$LOG_FILE" ]] || return 0
  if (($(stat -c %s "$LOG_FILE") > OFFSITE_LOG_MAX_BYTES)); then
    mv -f "$LOG_FILE" "$LOG_FILE.1"
  fi
}

log() {
  local level=$1
  shift
  local line message
  # Messages carry stderr from prod and psql: no control characters (terminal
  # escapes) in the log, and a bounded length. `|| true`: head exits after 2000
  # bytes, so tr can die of SIGPIPE, which pipefail would turn into an exit.
  message=$(printf '%s' "$*" | tr -d '\000-\037\177' | head -c 2000 || true)
  line="$(date -u +%Y-%m-%dT%H:%M:%SZ) $level $message"
  mkdir -p "$(dirname "$LOG_FILE")"
  rotate_log
  printf '%s\n' "$line" >>"$LOG_FILE"
  if [[ -t 2 ]]; then
    printf '%s\n' "$line" >&2
  fi
}

open_lock() {
  mkdir -p "$OFFSITE_DEST"
  exec 9>>"$OFFSITE_DEST/.lock"
}

acquire_lock_nowait() {
  open_lock
  flock -n 9
}

acquire_lock_wait() {
  open_lock
  flock -w "$1" 9
}

# Prints the UTC epoch encoded in a backup file name; fails for any other name
# (foreign files, `.tmp`, impossible dates such as Feb 30).
backup_epoch() {
  local name=$1
  [[ $name =~ $OFFSITE_BACKUP_NAME_RE ]] || return 1
  local iso="${BASH_REMATCH[1]}T${BASH_REMATCH[2]}:${BASH_REMATCH[3]}:${BASH_REMATCH[4]}Z"
  local parsed
  parsed=$(date -u -d "$iso" '+%s %Y-%m-%dT%H:%M:%SZ' 2>/dev/null) || return 1
  [[ ${parsed#* } == "$iso" ]] || return 1
  echo "${parsed%% *}"
}

# Prints "epoch size name" for every recognised backup in DIR, oldest first.
# Future-stamped names are skipped like foreign files.
list_backups() {
  local dir=$1 path name epoch
  local latest=$(($(now_epoch) + OFFSITE_FUTURE_SKEW_SECONDS))
  for path in "$dir"/backup-*.sql.gz; do
    [[ -f $path ]] || continue
    name=${path##*/}
    epoch=$(backup_epoch "$name") || continue
    ((epoch <= latest)) || continue
    printf '%s %s %s\n' "$epoch" "$(stat -c %s "$path")" "$name"
  done | LC_ALL=C sort -k1,1n -k3,3
}

newest_backup() {
  local newest
  newest=$(list_backups "$1" | tail -n 1)
  if [[ -n $newest ]]; then
    echo "${newest##* }"
  fi
  return 0
}
