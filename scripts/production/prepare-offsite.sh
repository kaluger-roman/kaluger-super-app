#!/usr/bin/env bash
set -euo pipefail
umask 077
export LC_ALL=C

runtime=${1:?pass the absolute .production directory}
offsite="$runtime/offsite"
edge="$runtime/edge"
mkdir -p "$offsite/manifests"
exec 9>"$offsite/prepare.lock"
flock -n 9 || exit 0

receipt=$(docker compose --project-directory "$edge" exec -T caddy \
  sh -c 'tail -n 20 /config/caddy/offsite-receipts.log 2>/dev/null || true' | python3 -c '
import datetime, json, re, sys
from pathlib import Path

receipts = []
for line in sys.stdin:
    try:
        event = json.loads(line)
    except ValueError:
        continue
    digest = event.get("backup_digest", "")
    if (event.get("status") == 204 and event.get("user_id") == "backup_receipt"
        and re.fullmatch("[0-9a-f]{64}", digest)
        and (Path(sys.argv[1]) / digest).is_file()):
        receipts.append((event["ts"], digest))
if receipts:
    timestamp, digest = max(receipts)
    stamp = datetime.datetime.fromtimestamp(timestamp, datetime.timezone.utc)
    print(stamp.strftime("%Y-%m-%dT%H:%M:%SZ"), digest)
' "$offsite/manifests")
if [[ -n $receipt ]]; then
  read -r receipt_at receipt_digest <<<"$receipt"
  marker="$runtime/backups/.offsite-last-pull"
  previous=$(cat "$marker" 2>/dev/null || true)
  if [[ $receipt_at > $previous || ! -f $offsite/confirmed ]]; then
    cat "$offsite/manifests/$receipt_digest" >"$offsite/confirmed.tmp"
    mv -f "$offsite/confirmed.tmp" "$offsite/confirmed"
    pending=$(mktemp "$marker.XXXXXX")
    printf '%s\n' "$receipt_at" >"$pending"
    mv -f "$pending" "$marker"
  fi
fi

backup=
for path in "$runtime/backups/"backup-*.sql.gz; do
  [[ -f $path && ! -L $path ]] || continue
  name=${path##*/}
  [[ $name =~ ^backup-[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}-[0-9]{2}-[0-9]{2}(-[0-9]{3})?Z\.sql\.gz$ ]] || continue
  backup="$path"
done
if [[ -z $backup ]] || (( $(date +%s) - $(stat -c %Y "$backup") > 86400 )); then
  echo 'No production dump from the last 24 hours' >&2
  exit 1
fi
gzip -t "$backup"

pending=$(mktemp "$edge/state/.offsite.XXXXXX")
trap 'rm -f "$pending"' EXIT
backup_digest=$(sha256sum "$backup" | cut -d ' ' -f1)
tar -C "$runtime" -cf - "backups/${backup##*/}" backend.env db.env compose.env \
  | "$offsite/bin/age" -R "$offsite/recipient.txt" -o "$pending"
touch -r "$backup" "$pending"
chmod 644 "$pending"
archive_digest=$(sha256sum "$pending" | cut -d ' ' -f1)
printf '%s %s\n' "${backup##*/}" "$backup_digest" >"$offsite/manifests/$archive_digest"
mv -f "$pending" "$edge/state/offsite.age"
find "$offsite/manifests" -maxdepth 1 -type f -mmin +4320 -delete
