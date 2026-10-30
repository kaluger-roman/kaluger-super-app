#!/usr/bin/env bash
# Forced command for the offsite backup key on prod. Installed as
# /usr/local/sbin/offsite-backup-ssh and referenced from /root/.ssh/authorized_keys
# (see docs/ops/offsite-backups.md). Allows exactly three operations:
#   rsync --server --sender ...       read-only pull of the backup dir via rrsync
#   report-restore-check <payload>    strictly validated restore check result
#   report-storage <payload>          strictly validated home disk/storage report
set -euo pipefail
set -f

readonly MAX_COMMAND_LENGTH=256
readonly FILE_RE='^backup-[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}-[0-9]{2}-[0-9]{2}(-[0-9]{3})?Z\.sql\.gz$'
readonly COUNT_RE='^[0-9]{1,9}$'
readonly BYTES_RE='^[0-9]{1,15}$'
readonly FLAG_RE='^[01]$'
readonly REASON_RE='^(no_copy|stale_copy|gzip_corrupt|docker_failed|restore_failed|query_failed|(missing|empty)_table_(users|students|lessons))$'
readonly SAFE_CHARS_RE='^[A-Za-z0-9_. -]+$'

deny() {
  echo "offsite-backup-ssh: $1" >&2
  exit 1
}

backup_dir=${1:-}
if [[ -z $backup_dir || ! -d $backup_dir ]]; then
  echo "offsite-backup-ssh: backup dir is missing" >&2
  exit 2
fi

command=${SSH_ORIGINAL_COMMAND:-}

utc_now() {
  date -u +%Y-%m-%dT%H:%M:%SZ
}

write_atomically() {
  local target=$1 content=$2
  printf '%s\n' "$content" >"$target.tmp" && mv -f "$target.tmp" "$target"
}

serve_rsync() {
  local status=0
  "${OFFSITE_RRSYNC:-/usr/bin/rrsync}" -ro "$backup_dir" || status=$?
  # Only a clean run counts as a pull: 23/24 (partial / vanished files) are retried next hour.
  if ((status == 0)); then
    write_atomically "$backup_dir/.offsite-last-pull" "$(utc_now)" ||
      echo "offsite-backup-ssh: failed to write the pull stamp" >&2
  fi
  exit "$status"
}

tokens=()

# Checks shared by every report; fills the global `tokens`.
split_report() {
  ((${#command} <= MAX_COMMAND_LENGTH)) || deny "invalid report: too long"
  [[ $command =~ $SAFE_CHARS_RE ]] || deny "invalid report: unexpected characters"

  read -r -a tokens <<<"$command"
  # Rejects leading, trailing and repeated spaces.
  [[ "${tokens[*]}" == "$command" ]] || deny "invalid report: bad spacing"
}

report_restore_check() {
  split_report

  local json
  case ${tokens[1]:-} in
    success)
      ((${#tokens[@]} == 6)) || deny "invalid report: wrong number of fields"
      [[ ${tokens[2]} =~ $FILE_RE ]] || deny "invalid report: bad file name"
      local count
      for count in "${tokens[@]:3:3}"; do
        [[ $count =~ $COUNT_RE ]] || deny "invalid report: bad count"
      done
      json=$(printf '{"checkedAt":"%s","fileName":"%s","status":"success","counts":{"users":%d,"students":%d,"lessons":%d}}' \
        "$(utc_now)" "${tokens[2]}" "$((10#${tokens[3]}))" "$((10#${tokens[4]}))" "$((10#${tokens[5]}))")
      ;;
    error)
      ((${#tokens[@]} == 4)) || deny "invalid report: wrong number of fields"
      local file_json
      if [[ ${tokens[2]} == "-" ]]; then
        file_json=null
      elif [[ ${tokens[2]} =~ $FILE_RE ]]; then
        file_json="\"${tokens[2]}\""
      else
        deny "invalid report: bad file name"
      fi
      [[ ${tokens[3]} =~ $REASON_RE ]] || deny "invalid report: unknown reason"
      json=$(printf '{"checkedAt":"%s","fileName":%s,"status":"error","reason":"%s"}' \
        "$(utc_now)" "$file_json" "${tokens[3]}")
      ;;
    *)
      deny "invalid report: unknown status"
      ;;
  esac

  write_atomically "$backup_dir/.offsite-restore-check.json" "$json"
  exit 0
}

report_storage() {
  split_report

  ((${#tokens[@]} == 6)) || deny "invalid report: wrong number of fields"
  local bytes
  for bytes in "${tokens[@]:1:4}"; do
    [[ $bytes =~ $BYTES_RE ]] || deny "invalid report: bad number"
  done
  ((10#${tokens[2]} > 0)) || deny "invalid report: bad number"
  [[ ${tokens[5]} =~ $FLAG_RE ]] || deny "invalid report: bad flag"

  local cap_pruned=false
  if [[ ${tokens[5]} == 1 ]]; then
    cap_pruned=true
  fi
  local json
  json=$(printf '{"reportedAt":"%s","freeBytes":%d,"totalBytes":%d,"backupsBytes":%d,"capBytes":%d,"capPruned":%s}' \
    "$(utc_now)" "$((10#${tokens[1]}))" "$((10#${tokens[2]}))" "$((10#${tokens[3]}))" \
    "$((10#${tokens[4]}))" "$cap_pruned")

  write_atomically "$backup_dir/.offsite-storage.json" "$json"
  exit 0
}

case $command in
  "rsync --server --sender "*) serve_rsync ;;
  "report-restore-check "*) report_restore_check ;;
  "report-storage "*) report_storage ;;
  *) deny "command not allowed" ;;
esac
