#!/usr/bin/env bash
set -euo pipefail
umask 077

runtime=${1:?pass the absolute .production directory}
shift
offsite="$runtime/offsite"
input="$offsite/restore-input"
mkdir -p "$input"
exec 9>"$offsite/check.lock"
flock -n 9 || exit 0

# Keep the checked dump pinned independently of the app's retention job.
if [[ -s $offsite/confirmed ]] && read -r name expected <"$offsite/confirmed" &&
   [[ $name =~ ^backup-[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}-[0-9]{2}-[0-9]{2}(-[0-9]{3})?Z\.sql\.gz$ ]] &&
   [[ $expected =~ ^[0-9a-f]{64}$ ]]; then
  if [[ ! -f $input/$name ]]; then
    if ! ln -- "$runtime/backups/$name" "$input/$name"; then
      SSH_ORIGINAL_COMMAND="report-restore-check error $name no_copy" \
        bash "$offsite/prod-ssh-wrapper.sh" "$runtime/backups"
      exit 1
    fi
  fi
  if [[ $(sha256sum "$input/$name" | cut -d ' ' -f1) != "$expected" ]]; then
    echo "The locally retained dump no longer matches the verified offsite archive" >&2
    SSH_ORIGINAL_COMMAND="report-restore-check error $name restore_failed" \
      bash "$offsite/prod-ssh-wrapper.sh" "$runtime/backups"
    exit 1
  fi
  find "$input" -maxdepth 1 -type f -name 'backup-*.sql.gz' ! -name "$name" -delete
fi

export OFFSITE_DEST="$input"
export OFFSITE_RESTORE_REPORT_DIR="$runtime/backups"
export OFFSITE_PG_MEMORY=768m OFFSITE_PG_DATA_SIZE=512m
bash "$offsite/restore-check.sh" "$@"
