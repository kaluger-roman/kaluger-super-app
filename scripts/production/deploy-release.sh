#!/usr/bin/env bash
set -euo pipefail
umask 077

# Invoked under the poller's lock. The caller verifies the Actions request and main SHA.
runtime=${1:?pass the absolute .production directory}
repo=${2:?pass the absolute bare Git repository}
revision=${3:?pass the Git revision}
run_id=${4:?pass the GitHub run id}
run_attempt=${5:?pass the GitHub run attempt}
[[ $revision =~ ^[0-9a-f]{40}$ ]]

deploy="$runtime/deploy"
source "$deploy/github-deploy.sh"
edge="$runtime/edge"
lan_ip=$(sed -n 's/^PROD_LAN_IP=//p' "$runtime/compose.env")
[[ $lan_ip =~ ^([0-9]{1,3}\.){3}[0-9]{1,3}$ ]]
previous="$deploy/active"
if [[ ! -d $previous ]]; then previous=$(dirname "$runtime"); fi
previous=$(realpath "$previous")
previous_landing=$(readlink "$edge/landing/current")
previous_revision=$(cat "$edge/state/revision" 2>/dev/null || true)
release="$deploy/releases/$revision"
stage=$(mktemp -d "$deploy/.release.XXXXXX")
landing=$(mktemp -d "$edge/landing/.release.XXXXXX")
backup_tmp=
switch_started=false
interrupted=false
if [[ -e $deploy/cutover ]]; then interrupted=true; fi

compose() {
  local dir=$1
  shift
  local -a release_env=(--env-file "$runtime/compose.env")
  if [[ -f $dir/.release.env ]]; then release_env+=(--env-file "$dir/.release.env"); fi
  docker compose "${release_env[@]}" \
    -f "$dir/docker-compose.production.yml" "$@"
}

migration_state() {
  compose "$previous" exec -T db psql -XqAt -v ON_ERROR_STOP=1 -U postgres -d tutor_app -c \
    'SELECT migration_name || chr(9) || CASE WHEN finished_at IS NULL THEN '\''incomplete'\'' ELSE '\''applied'\'' END FROM "_prisma_migrations" WHERE rolled_back_at IS NULL ORDER BY migration_name;'
}

point_at() {
  ln -s "$1" "$2.new.$$" && mv -Tf "$2.new.$$" "$2"
}

publish_revision() {
  printf '%s\n' "$1" >"$edge/state/.revision.new" &&
    chmod 644 "$edge/state/.revision.new" &&
    mv -Tf "$edge/state/.revision.new" "$edge/state/revision"
}

begin_cutover() {
  printf '%s\n' "$revision" >"$deploy/cutover.new"
  mv -f "$deploy/cutover.new" "$deploy/cutover"
  switch_started=true
  rm -f "$edge/state/revision"
}

finish() {
  local result=$?
  trap - EXIT
  if (( result != 0 )) && $switch_started; then
    point_at "$previous_landing" "$edge/landing/current" || true
    local after
    if ! $interrupted && after=$(migration_state) && [[ $after == "$before" ]]; then
      if point_at "$previous" "$deploy/active" &&
         compose "$previous" up -d --no-build --no-deps --wait --wait-timeout 120 backend &&
         compose "$previous" up -d --no-build --no-deps --wait --wait-timeout 90 --force-recreate web; then
        if [[ $previous_revision =~ ^[0-9a-f]{40}$ ]]; then publish_revision "$previous_revision"; fi
        rm -f "$deploy/cutover"
      else
        echo 'Automatic service rollback failed' >&2
      fi
    else
      echo 'Cutover needs roll-forward; the database backup is preserved.' >&2
      point_at "$release" "$deploy/active" || true
      rm -f "$edge/state/revision"
    fi
  fi
  rm -rf -- "$stage" "$landing"
  if [[ -n $backup_tmp ]]; then rm -f -- "$backup_tmp"; fi
  exit "$result"
}
trap finish EXIT

mkdir -p "$deploy/releases"
if [[ ! -d $release ]]; then
  git -C "$repo" archive --format=tar "$revision" | tar -x -C "$stage"
  ln -s "$runtime" "$stage/.production"
  printf 'PROD_BACKEND_IMAGE=super-app-production-backend:%s\nPROD_WEB_IMAGE=super-app-production-web:%s\n' \
    "$revision" "$revision" >"$stage/.release.env"
  mv -T "$stage" "$release"
fi

compose "$release" config -q
compose "$release" build backend web
docker buildx build --output "type=local,dest=$landing" \
  -f "$release/infra/production/landing.Dockerfile" "$release/landing"
test -s "$landing/index.html"
mkdir -p "$landing/.well-known"
printf '%s\n' "$revision" >"$landing/.well-known/kaluger-production-revision"
find "$landing" -type d -exec chmod 755 {} +
find "$landing" -type f -exec chmod 644 {} +
if [[ ! -d $edge/landing/$revision ]]; then mv -T "$landing" "$edge/landing/$revision"; fi
compose "$release" run --rm --no-deps backend node dist/scripts/checkEnv.js

before=$(migration_state)
[[ -n $before && $before != *$'\tincomplete'* ]]
mapfile -t applied < <(printf '%s\n' "$before" | cut -f1)
for migration in "${applied[@]}"; do
  test -f "$release/backend/prisma/migrations/$migration/migration.sql"
done
expected=$(find "$release/backend/prisma/migrations" -mindepth 2 -maxdepth 2 -name migration.sql | wc -l)

deploy_job_ready "$run_id" "$run_attempt" "$revision"
if (( expected > ${#applied[@]} )); then
  begin_cutover
  compose "$previous" stop web backend
fi
backup="$runtime/backups/backup-$(date -u +%Y-%m-%dT%H-%M-%S-%3NZ).sql.gz"
backup_tmp=$(mktemp "$backup.tmp.XXXXXX")
compose "$previous" exec -T db pg_dump -U postgres -d tutor_app | gzip >"$backup_tmp"
gzip -t "$backup_tmp"
mv -T "$backup_tmp" "$backup"

main=$(timeout 25 git -C "$repo" ls-remote --exit-code origin refs/heads/main | cut -f1)
if [[ $main != "$revision" ]]; then
  echo 'Main moved before migration; skipping cutover' >&2
  exit 1
fi
deploy_job_ready "$run_id" "$run_attempt" "$revision"

if ! $switch_started; then begin_cutover; fi
compose "$release" run --rm --no-deps backend node node_modules/prisma/build/index.js migrate deploy
compose "$release" up -d --no-build --no-deps --wait --wait-timeout 120 backend
compose "$release" up -d --no-build --no-deps --wait --wait-timeout 90 --force-recreate web
point_at "$revision" "$edge/landing/current"
curl -fsS --max-time 10 --resolve "tutor.kaluger.ru:443:$lan_ip" https://tutor.kaluger.ru/health >/dev/null
curl -fsS --max-time 10 --resolve "teacher.kaluger.ru:443:$lan_ip" https://teacher.kaluger.ru/ >/dev/null
compose "$release" exec -T backend node dist/scripts/syncNews.js
point_at "$release" "$deploy/active"
publish_revision "$revision"
rm -f "$deploy/cutover"
printf 'Active production revision %s\n' "$revision"
