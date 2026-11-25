#!/usr/bin/env bash
set -euo pipefail
umask 077
export LC_ALL=C

runtime=${1:?pass the absolute .production directory}
offsite="$runtime/offsite"
edge="$runtime/edge"
exec 9>"$offsite/prepare.lock"
flock -n 9 || exit 0

receipt=$(docker compose --project-directory "$edge" exec -T caddy \
  sh -c 'tail -n 20 /config/caddy/offsite-receipts.log 2>/dev/null || true' | python3 -c '
import datetime, json, sys

timestamps = []
for line in sys.stdin:
    try:
        event = json.loads(line)
    except ValueError:
        continue
    if event.get("status") == 204 and event.get("user_id") == "backup":
        timestamps.append(event["ts"])
if timestamps:
    stamp = datetime.datetime.fromtimestamp(max(timestamps), datetime.timezone.utc)
    print(stamp.strftime("%Y-%m-%dT%H:%M:%SZ"))
')
if [[ -n $receipt ]]; then
  marker="$runtime/backups/.offsite-last-pull"
  previous=$(cat "$marker" 2>/dev/null || true)
  if [[ $receipt > $previous ]]; then
    pending=$(mktemp "$marker.XXXXXX")
    printf '%s\n' "$receipt" >"$pending"
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
tar -C "$runtime" -cf - "backups/${backup##*/}" backend.env db.env compose.env \
  | "$offsite/bin/age" -R "$offsite/recipient.txt" -o "$pending"
touch -r "$backup" "$pending"
chmod 644 "$pending"
mv -f "$pending" "$edge/state/offsite.age"
