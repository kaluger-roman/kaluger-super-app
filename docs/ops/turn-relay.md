# TURN relay for video calls (coturn on prod)

Video calls (`specs/030-webrtc-video-calls/`) connect peer to peer. When both
sides sit behind strict NAT, a corporate firewall or a mobile carrier that
blocks UDP, the direct path fails and the call needs a TURN relay: coturn on
prod (`45.133.234.3`, `tutor.kaluger.ru`) forwards the media. Without it calls
between such users never connect.

The backend sends ICE servers to both browsers in the call signaling
(`backend/src/services/callSignaling/iceConfig.ts`): the STUN server, then one
entry per URL in `TURN_URL` with a short-lived credential minted from
`TURN_SECRET` (coturn TURN REST API: username `<unix-expiry>:<kind>-<id>`,
credential `base64(HMAC-SHA1(secret, username))`, lifetime
`TURN_CREDENTIAL_TTL`, default 14400 s). The secret never reaches the browser.

When `TURN_URL` or `TURN_SECRET` is missing the app runs STUN-only. On prod
(`NODE_ENV=production` and a public https `FRONTEND_URL`, so the local QA stack
stays quiet) that shows up twice:

- `pm2 logs backend` at startup: `TURN_URL или TURN_SECRET не задан — видеозвонки работают только через STUN, релей недоступен (docs/ops/turn-relay.md)`;
- the `turn_not_configured` alert (warning) in «Админ-панель» → «Алерты», plus a
  letter. Alert checks run every 15 minutes, not at startup, so it closes on
  the first check after the backend restarts with TURN configured.

## Where things are

Prod (`root@45.133.234.3`):

| Path | What |
|---|---|
| `/etc/turnserver.conf` | coturn config, `root:turnserver 640` (holds the secret) |
| `/etc/letsencrypt/live/tutor-coturn/` | coturn's own Let's Encrypt cert for `tutor.kaluger.ru` (separate key, not the one nginx uses) |
| `/etc/coturn/certs/{fullchain,privkey}.pem` | Copy of that cert for `turns:` (dir `root:turnserver 750`, files `640`) |
| `/etc/letsencrypt/renewal-hooks/deploy/coturn-certs.sh` | Copies the renewed cert and restarts coturn |
| `/etc/systemd/system/coturn.service.d/self-relay-guard.conf` | iptables rule: relay ports may reach only other relay ports on this host |
| `/home/roman-kaluger/kaluger-super-app/backend/.env` | `TURN_URL`, `TURN_SECRET` (optional `TURN_CREDENTIAL_TTL`) |
| `journalctl -u coturn` | coturn log (`syslog` in the config) |

The backend reads `backend/.env` implicitly: pm2 starts `dist/index.js`
without `--env-file`, and `new PrismaClient()` in `lib/prisma.ts` loads
`backend/.env` (path fixed relative to the generated client, `schemaEnvPath`,
whatever the working dir) into `process.env`. It does not override variables
already set in pm2's environment. After editing `.env` run
`pm2 restart backend`.

Ports (all on `45.133.234.3` only, not on `tailscale0` / `eth1` / `lo`):

| Port | Protocol | Use |
|---|---|---|
| 3478 | UDP | `turn:tutor.kaluger.ru:3478?transport=udp` (and STUN) |
| 3478 | TCP | `turn:tutor.kaluger.ru:3478?transport=tcp` |
| 5349 | TCP (TLS) | `turns:tutor.kaluger.ru:5349?transport=tcp`, passes firewalls that allow only HTTPS-like traffic |
| 61000–62999 | UDP | Relay ports (outside the kernel ephemeral range 32768–60999) |

`TURN_URL` is a comma-separated list; each URL becomes its own ICE server. A
bare `turn:host:3478` means UDP only, so TCP and TLS have to be listed
explicitly. `turn.tutor.kaluger.ru` has no DNS record; use `tutor.kaluger.ru`,
which also matches the certificate.

## Order warning

A backend older than this change sends the whole `TURN_URL` as one ICE server
URL. A comma-separated value then is an invalid URL, the browser throws in
`new RTCPeerConnection` and every call fails, not only relayed ones. Deploy the
multi-URL backend first and check it on prod before editing `.env` (two
fake URLs must give STUN plus two TURN entries):

```bash
cd /home/roman-kaluger/kaluger-super-app/backend
TURN_URL="turn:a:3478,turn:b:3478" TURN_SECRET=probe node -e '
const { buildIceServers } = require("./dist/services/callSignaling/iceConfig");
console.log(buildIceServers({ kind: "tutor", id: "probe" }).length === 3
  ? "multi-URL backend: OK" : "STOP: deploy the backend first");
process.exit(0)'
```

## One-time setup

Run by hand on prod, in this order, with the owner's confirmation. Nothing here
is deployed by CI.

### 1. Install coturn without starting it

The package starts the service right away with the stock config, which has no
authentication. Mask the unit first so it never runs that way:

```bash
systemctl mask coturn
DEBIAN_FRONTEND=noninteractive apt-get install -y coturn
turnserver --version   # Ubuntu 24.04: 4.6.1; the config below needs 4.6+
cp -p /etc/turnserver.conf /etc/turnserver.conf.dist
```

### 2. Certificate for `turns:`

coturn gets its own certificate with its own key, so a compromised coturn does
not leak the key nginx serves the site with. coturn runs as `turnserver` and
cannot read `/etc/letsencrypt/live`, so it gets a copy, refreshed by a certbot
deploy hook (the hook ignores the other lineages on this host,
`tutor.kaluger.ru` of nginx and `teacher.kaluger.ru`):

```bash
certbot certonly --nginx --cert-name tutor-coturn -d tutor.kaluger.ru   # nginx only answers the challenge, its config is untouched
install -d -m 750 -o root -g turnserver /etc/coturn/certs
cat > /etc/letsencrypt/renewal-hooks/deploy/coturn-certs.sh <<'EOF'
#!/bin/sh
set -e
LINEAGE="${RENEWED_LINEAGE:-/etc/letsencrypt/live/tutor-coturn}"
[ "$LINEAGE" = /etc/letsencrypt/live/tutor-coturn ] || exit 0
install -m 640 -o root -g turnserver "$LINEAGE/fullchain.pem" /etc/coturn/certs/fullchain.pem
install -m 640 -o root -g turnserver "$LINEAGE/privkey.pem" /etc/coturn/certs/privkey.pem
# Before step 5 the unit is masked: skip. A failing restart fails the hook, and certbot reports it.
if systemctl is-enabled --quiet coturn; then systemctl restart coturn; fi
EOF
chmod 755 /etc/letsencrypt/renewal-hooks/deploy/coturn-certs.sh
/etc/letsencrypt/renewal-hooks/deploy/coturn-certs.sh
ls -l /etc/coturn/certs
```

### 3. Secret and config

Save the [config](#etcturnserverconf) as `/root/turnserver.conf.new` with the
`<TURN_SECRET>` placeholder as is, then fill in a fresh secret without printing
it. The secret goes to `perl` through the environment, not the command line,
so `ps` does not show it:

```bash
umask 077
S="$(openssl rand -hex 32)"
S="$S" perl -pi -e 's/<TURN_SECRET>/$ENV{S}/' /root/turnserver.conf.new
install -m 640 -o root -g turnserver /root/turnserver.conf.new /etc/turnserver.conf
rm /root/turnserver.conf.new
```

In the same shell, after the [order check](#order-warning), put the URLs and
the same secret into `backend/.env`:

```bash
ENV=/home/roman-kaluger/kaluger-super-app/backend/.env
cp -p "$ENV" "$ENV.bak-turn"   # holds every backend secret: delete after the checks
sed -i '/^TURN_URL=/d; /^TURN_SECRET=/d' "$ENV"
sed -i -e '$a\' "$ENV"   # make sure the last line ends with a newline
printf '%s\n' \
  'TURN_URL="turn:tutor.kaluger.ru:3478?transport=udp,turn:tutor.kaluger.ru:3478?transport=tcp,turns:tutor.kaluger.ru:5349?transport=tcp"' \
  "TURN_SECRET=\"$S\"" >> "$ENV"
unset S
```

### 4. Keep the relay off this host's own services

Relayed packets to `45.133.234.3` itself never leave the host, so no external
firewall sees them, and `45.133.234.3` cannot be in `denied-peer-ip`: calls
where both sides are relayed send to this host's relay ports. A drop-in adds an
iptables rule before coturn starts: from a relay port, UDP to this host may go
only to another relay port, not to tailscaled (41641), hysteria (443) or coturn
itself (3478):

```bash
install -d /etc/systemd/system/coturn.service.d
cat > /etc/systemd/system/coturn.service.d/self-relay-guard.conf <<'EOF'
[Service]
# "+": runs as root although coturn itself runs as turnserver; "$$" escapes "$" from systemd.
ExecStartPre=+/bin/sh -c 'R="OUTPUT -s 45.133.234.3 -d 45.133.234.3 -p udp --sport 61000:62999 ! --dport 61000:62999 -j REJECT"; iptables -C $$R 2>/dev/null || iptables -I $$R'
EOF
systemctl daemon-reload
```

### 5. Start

```bash
systemctl unmask coturn
systemctl enable --now coturn
systemctl status coturn --no-pager
journalctl -u coturn -n 50 --no-pager   # no CONFIG ERROR, cert and key loaded
iptables -S OUTPUT | grep 61000:62999   # the self-relay guard is in place
pm2 restart backend
for i in $(seq 60); do curl -fsS -o /dev/null http://localhost:3001/health && break; sleep 1; done
curl -fsS http://localhost:3001/health   # must answer; otherwise `pm2 logs backend` for the start error
```

Then the [backend check](#verification) must print `true` and the TURN URLs.

Then run [Verification](#verification) and delete `$ENV.bak-turn`.

### `/etc/turnserver.conf`

```
# /etc/turnserver.conf - coturn TURN relay for tutor.kaluger.ru video calls
# Docs: docs/ops/turn-relay.md. Secret must equal TURN_SECRET in backend/.env.

# Bind only to the public interface (not tailscale0 / eth1 / lo).
listening-ip=45.133.234.3
relay-ip=45.133.234.3
listening-port=3478
tls-listening-port=5349
# Relay ports outside the kernel ephemeral range 32768-60999.
min-port=61000
max-port=62999

realm=tutor.kaluger.ru
server-name=tutor.kaluger.ru

# TURN REST API credentials minted by the backend (iceConfig.ts):
# username = <unix-expiry>:<kind>-<id>, credential = base64(HMAC-SHA1(secret, username)).
use-auth-secret
static-auth-secret=<TURN_SECRET>
fingerprint
stale-nonce=600

# TLS (turns:tutor.kaluger.ru:5349), copied from Let's Encrypt by
# /etc/letsencrypt/renewal-hooks/deploy/coturn-certs.sh
cert=/etc/coturn/certs/fullchain.pem
pkey=/etc/coturn/certs/privkey.pem
no-tlsv1
no-tlsv1_1
no-dtls

# Browsers only need UDP relay; TCP relay would expose host TCP services.
no-tcp-relay
no-multicast-peers
no-cli
no-rfc5780
no-stun-backward-compatibility
response-origin-only-with-rfc5780

# Abuse limits. Every participant of every call allocates on each TURN URL while
# gathering candidates (iceTransportPolicy "all"), relayed or not, and again on ICE
# restarts. With use-auth-secret coturn drops the "<expiry>:" prefix, so user-quota
# counts one participant (<kind>-<id>) across all its calls and devices:
# 3 URLs x 2 interfaces x 4 for restarts and a second device.
# total-quota: 3 URLs x 2 participants x 2 interfaces x ~20 concurrent calls.
# max-bps: bytes/s per session (~3 Mbit/s video). No bps-capacity: coturn reserves
# max-bps of it for every allocation up front, so it would refuse allocations after
# bps-capacity / max-bps of them instead of limiting traffic.
user-quota=24
total-quota=240
max-bps=400000

# Never relay into private, loopback, tailnet (this host is a Tailscale exit node)
# or provider-internal networks.
denied-peer-ip=0.0.0.0-0.255.255.255
denied-peer-ip=10.0.0.0-10.255.255.255
denied-peer-ip=100.64.0.0-100.127.255.255
denied-peer-ip=127.0.0.0-127.255.255.255
denied-peer-ip=169.254.0.0-169.254.255.255
denied-peer-ip=172.16.0.0-172.31.255.255
denied-peer-ip=192.0.0.0-192.0.0.255
denied-peer-ip=192.0.2.0-192.0.2.255
denied-peer-ip=192.88.99.0-192.88.99.255
denied-peer-ip=192.168.0.0-192.168.255.255
denied-peer-ip=198.18.0.0-198.19.255.255
denied-peer-ip=198.51.100.0-198.51.100.255
denied-peer-ip=203.0.113.0-203.0.113.255
denied-peer-ip=224.0.0.0-255.255.255.255
denied-peer-ip=::1
denied-peer-ip=64:ff9b::-64:ff9b::ffff:ffff
denied-peer-ip=::ffff:0.0.0.0-::ffff:255.255.255.255
denied-peer-ip=fc00::-fdff:ffff:ffff:ffff:ffff:ffff:ffff:ffff
denied-peer-ip=fe80::-febf:ffff:ffff:ffff:ffff:ffff:ffff:ffff
# 45.133.234.3 itself is NOT denied: relay-to-relay calls (both sides behind strict NAT)
# send to this host's relay ports. Its other UDP services (tailscaled, hysteria, coturn
# itself) are closed to the relay by the iptables rule from coturn.service.d/self-relay-guard.conf.

syslog
simple-log
```

`max-bps` is in bytes per second (400000 B/s ≈ 3.2 Mbit/s), counted per
session and per direction. Allocations are made by every participant of every
call, one per TURN URL and network interface, not only by calls that end up
relayed. When a quota is hit, coturn logs `error 486: Allocation Quota Reached`
(`journalctl -u coturn | grep 'error 486'`) and that browser gets no relay
candidate; raise `user-quota` / `total-quota` then. `no-rfc5780`, `no-stun-backward-compatibility` and
`response-origin-only-with-rfc5780` exist since coturn 4.6; an older
`turnserver` refuses to start on them.

## Verification

Listeners, only on `45.133.234.3`:

```bash
ss -lntup | grep turnserver   # 3478 udp + tcp, 5349 tcp
openssl s_client -connect tutor.kaluger.ru:5349 -servername tutor.kaluger.ru </dev/null 2>/dev/null \
  | openssl x509 -noout -subject -enddate
```

Mint a 10-minute credential the way the backend does. The secret goes to
`python3` through the environment, so neither the terminal nor `ps` shows it;
only the short-lived credential appears on command lines below:

```bash
S="$(sed -n 's/^static-auth-secret=//p' /etc/turnserver.conf)"
U="$(( $(date +%s) + 600 )):probe"
C="$(S="$S" U="$U" python3 -c 'import base64, hashlib, hmac, os
print(base64.b64encode(hmac.new(os.environ["S"].encode(), os.environ["U"].encode(), hashlib.sha1).digest()).decode())')"
unset S
```

Allocations with it (`turnutils_uclient` ships with coturn; `-y` relays between
two allocations on this host, `-e` sets the peer):

```bash
turnutils_uclient -u "$U" -w "$C" -y -n 3 45.133.234.3                # UDP: no errors, 0 lost packets
turnutils_uclient -u "$U" -w "$C" -y -n 3 -t 45.133.234.3             # TCP
turnutils_uclient -u "$U" -w "$C" -y -n 3 -t -S -p 5349 45.133.234.3  # TLS (-S alone means DTLS over UDP, off here)
turnutils_uclient -u "$U" -w "$C" -n 1 -e 100.67.75.106 45.133.234.3  # must fail: 403 Forbidden IP (tailnet)
turnutils_uclient -u "$U" -w "$C" -n 1 -e 10.17.0.1 45.133.234.3      # must fail: 403 (provider network)
turnutils_uclient -u "$U" -w wrong -n 1 -y 45.133.234.3               # must fail: 401 Unauthorized
```

What the backend hands out (URLs only, no credentials):

```bash
cd /home/roman-kaluger/kaluger-super-app/backend
node --env-file=.env -e 'const { buildIceServers, isTurnConfigured } = require("./dist/services/callSignaling/iceConfig");
console.log(isTurnConfigured(), buildIceServers({ kind: "tutor", id: "probe" }).map((s) => s.urls)); process.exit(0)'
# true [ 'stun:…', 'turn:…?transport=udp', 'turn:…?transport=tcp', 'turns:…:5349?transport=tcp' ]
```

From a browser outside the server (ideally another network, e.g. a phone
hotspot), forcing relay, with the same credential (mint a new one after 10
minutes):

```bash
printf 'username: %s\ncredential: %s\n' "$U" "$C"
```

and run in the DevTools console of any https page:

```js
for (const urls of [
  "turn:tutor.kaluger.ru:3478?transport=udp",
  "turn:tutor.kaluger.ru:3478?transport=tcp",
  "turns:tutor.kaluger.ru:5349?transport=tcp",
]) {
  const pc = new RTCPeerConnection({
    iceServers: [{ urls, username: "<username>", credential: "<credential>" }],
    iceTransportPolicy: "relay",
  });
  pc.createDataChannel("probe");
  pc.onicecandidate = ({ candidate }) => candidate && console.log(urls, candidate.candidate);
  pc.onicecandidateerror = (e) => console.warn(urls, e.errorCode, e.errorText);
  await pc.setLocalDescription(await pc.createOffer());
}
```

Every URL must log a candidate with `typ relay` within a few seconds; an
`errorCode` of 401 means a secret mismatch, 701 or silence means the port is
blocked on the way. In a real call `chrome://webrtc-internals` shows the
selected candidate pair; `relay` on either side means the call went through
coturn.

Finally «Админ-панель» → «Алерты»: `turn_not_configured` is closed by the
first alert check after the restart, within 15 minutes.

## Rotating the secret

Both sides must change together; credentials minted with the old secret stop
working, so relayed calls in progress drop. Do it outside lesson hours:

```bash
ENV=/home/roman-kaluger/kaluger-super-app/backend/.env
S="$(openssl rand -hex 32)"
S="$S" perl -pi -e 's/^static-auth-secret=.*/static-auth-secret=$ENV{S}/' /etc/turnserver.conf
S="$S" perl -pi -e 's/^TURN_SECRET=.*/TURN_SECRET="$ENV{S}"/' "$ENV"
unset S
systemctl restart coturn
pm2 restart backend
```

Then the `turnutils_uclient` UDP check from [Verification](#verification).

## Certificate renewal

certbot's timer renews `tutor-coturn`; the deploy hook copies the new files
and restarts coturn (relayed calls in progress reconnect or drop). Check that
the copy follows the live cert:

```bash
openssl x509 -noout -enddate -in /etc/letsencrypt/live/tutor-coturn/fullchain.pem
openssl x509 -noout -enddate -in /etc/coturn/certs/fullchain.pem
```

If they differ, run `/etc/letsencrypt/renewal-hooks/deploy/coturn-certs.sh` by
hand. An expired copy breaks only `turns:`; UDP and TCP keep working.

## Troubleshooting

- coturn does not start: `journalctl -u coturn -n 100 --no-pager`. `CONFIG
  ERROR` or a usage dump means an unknown option (coturn older than 4.6) or a
  typo; key errors mean `/etc/coturn/certs` permissions (run the hook again).
- Allocations work on prod but not from outside: the host firewall is off
  (`ufw status`: inactive), so look at the provider's (Beget) panel firewall.
  Open UDP 3478, TCP 3478, TCP 5349 and UDP 61000–62999 to `45.133.234.3`.
- 401 everywhere: `static-auth-secret` and `TURN_SECRET` differ, the backend
  was not restarted after editing `.env`, or pm2 keeps an old `TURN_SECRET` in
  its own environment (`pm2 env 0 | grep -o '^TURN_[A-Z_]*'` lists the names
without values; `.env` does not override them).
  A wrong clock also breaks the expiry check: `timedatectl`.
- All calls fail right after editing `.env`, even direct ones: the backend on
  prod predates the multi-URL change, see [Order warning](#order-warning).
- The startup warning or the alert stays after the change: `TURN_URL` is empty
  or only commas, or `TURN_SECRET` is blank; the backend check above prints
  `false`.

## Rollback

Rolling the backend back to a version without the comma-separated `TURN_URL`
(before #165) with the list still in `.env` breaks every call, see
[Order warning](#order-warning). Remove `TURN_URL` (or leave a single URL)
and `pm2 restart backend` before such a deploy. To drop the relay itself:

```bash
ENV=/home/roman-kaluger/kaluger-super-app/backend/.env
sed -i '/^TURN_URL=/d; /^TURN_SECRET=/d' "$ENV"
pm2 restart backend            # STUN-only again: the warning and the alert come back
systemctl disable --now coturn
```

Full removal: `apt-get purge coturn`, `rm -r /etc/coturn
/etc/systemd/system/coturn.service.d`,
`rm /etc/letsencrypt/renewal-hooks/deploy/coturn-certs.sh`,
`certbot delete --cert-name tutor-coturn`, then drop the iptables rule:
`iptables -D OUTPUT -s 45.133.234.3 -d 45.133.234.3 -p udp --sport 61000:62999 ! --dport 61000:62999 -j REJECT`.

## Bandwidth

Only calls whose direct path fails go through the relay. Such a call carries
both participants' media in and out of the server: roughly 2–6 Mbit/s each way
per call for video, capped by `max-bps` per session. There is no server-wide
bandwidth cap (see the config comment on `bps-capacity`); `total-quota` bounds
the number of allocations. Watch the provider's traffic
tariff if relayed calls become common.
