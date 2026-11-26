#!/usr/bin/env bash
set -euo pipefail
umask 077

runtime=${1:?pass the absolute .production directory}
turn="$runtime/turn"
edge="$runtime/edge"
domain=turn.tutor.kaluger.ru
lan_ip=$(sed -n 's/^PROD_LAN_IP=//p' "$runtime/compose.env")
[[ $lan_ip =~ ^([0-9]{1,3}\.){3}[0-9]{1,3}$ ]]
exec 9>"$turn/certs.lock"
flock -n 9 || exit 0

edge_compose() { docker compose --project-directory "$edge" "$@"; }
turn_compose() { docker compose --project-directory "$turn" "$@"; }
verify_turn_tls() {
  local attempt peer_leaf
  for attempt in {1..10}; do
    if peer_leaf=$(timeout 3 openssl s_client -connect "$lan_ip:5349" -servername "$domain" \
         -verify_hostname "$domain" -verify_return_error </dev/null 2>/dev/null |
         openssl x509 -outform DER 2>/dev/null | sha256sum | cut -d ' ' -f1) &&
       [[ $peer_leaf == "$expected_leaf" ]]; then
      return 0
    fi
    sleep 1
  done
  return 1
}

activate_certificate() {
  ln -s "$1" "$turn/certs/.current.new" && mv -Tf "$turn/certs/.current.new" "$turn/certs/current"
}

cert=$(edge_compose exec -T caddy find /data/caddy/certificates -type f \
  -path "*/$domain/$domain.crt" | tail -n 1)
if [[ -z $cert ]]; then
  echo 'The dedicated TURN certificate has not been issued yet' >&2
  exit 1
fi

stage=$(mktemp -d "$turn/certs/.new.XXXXXX")
trap 'rm -rf "$stage" "$turn/certs/.current.new"' EXIT
edge_compose exec -T caddy cat "$cert" >"$stage/fullchain.pem"
edge_compose exec -T caddy cat "${cert%.crt}.key" >"$stage/privkey.pem"
openssl x509 -in "$stage/fullchain.pem" -noout -checkend 86400 >/dev/null
openssl x509 -in "$stage/fullchain.pem" -noout -checkhost "$domain" | grep -q 'does match certificate'
cmp -s <(openssl x509 -in "$stage/fullchain.pem" -noout -pubkey) \
  <(openssl pkey -in "$stage/privkey.pem" -pubout)

fingerprint=$(sha256sum "$stage/fullchain.pem" | cut -d ' ' -f1)
expected_leaf=$(openssl x509 -in "$stage/fullchain.pem" -outform DER | sha256sum | cut -d ' ' -f1)
if [[ ! -d $turn/certs/$fingerprint ]]; then mv -T "$stage" "$turn/certs/$fingerprint"; fi
previous=$(readlink "$turn/certs/current" || true)
if [[ $previous == "$fingerprint" ]]; then
  turn_compose up -d --no-build turn
  if verify_turn_tls; then exit 0; fi
  turn_compose up -d --no-build --force-recreate turn
  verify_turn_tls
  exit 0
fi
activate_certificate "$fingerprint"
if turn_compose up -d --no-build --force-recreate turn && verify_turn_tls; then
  exit 0
fi
echo 'TURN has not accepted the new TLS certificate' >&2
if [[ -n $previous ]]; then
  activate_certificate "$previous" && turn_compose up -d --no-build --force-recreate turn
else
  turn_compose stop turn || true
  rm -f "$turn/certs/current"
fi
exit 1
