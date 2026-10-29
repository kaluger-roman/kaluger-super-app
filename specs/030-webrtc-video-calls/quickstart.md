# Quickstart: WebRTC Video Calls

How to develop, configure, and verify the video-call feature locally.

## Prerequisites

- Backend and frontend running (see root CLAUDE.md commands).
- Two authenticated principals for end-to-end testing: a tutor account and a **linked** student account (student cabinet, feature 029). They must form a valid `Student.tutorId` ↔ `StudentUser.studentId` pair.
- A modern browser with camera/mic permissions. For two-party local testing, use two browser profiles / windows (e.g. one normal + one incognito), or two devices.

## 1. Database

Add the `CallRecord` model + enums + back-relations to `backend/prisma/schema.prisma` (see `data-model.md`), then:

```bash
# from backend/
npm run db:migrate         # creates migration 030_call_records, applies to dev DB
npm run db:generate        # regenerate Prisma client (CallRecord types)
npm run db:migrate:test    # apply to the .env.test database (for jest)
```

## 2. Environment (ICE / STUN / TURN)

Add to `backend/.env` (and document in `backend/.env.example`):

```bash
# STUN (optional — has a public default)
STUN_URL="stun:stun.l.google.com:19302"

# TURN relay (optional locally; required in prod for strict-NAT users)
# When unset, the app runs STUN-only: P2P works on permissive networks,
# relay fallback is unavailable (logged at startup).
TURN_URL="turn:turn.tutor.kaluger.ru:3478"
TURN_SECRET="<coturn static-auth-secret>"
TURN_CREDENTIAL_TTL="86400"
```

- The backend mints **time-limited** TURN credentials per call (HMAC over the secret) and sends them to the client in `call_ringing`/`call_accepted` signaling — the secret never reaches the browser.
- **coturn deploy (prod, operational — not an npm dep)**: install coturn on the VPS, enable `use-auth-secret` with `static-auth-secret=<TURN_SECRET>`, set `realm=tutor.kaluger.ru`, open UDP/TCP 3478 (and TLS 5349 if used), and put it behind the existing firewall. Documented in deploy notes; no code dependency.

## 3. Run

```bash
# backend/
npm run dev
# frontend/
npm start
```

Local dev WS URLs already used by the app: tutor `ws://localhost:3001/ws`, student `ws://localhost:3001/ws/student` (prod uses `wss://<host>/...`). Call signaling reuses these sockets — no extra port.

## 4. Manual end-to-end verification (maps to acceptance scenarios)

1. **Tutor → student call (US1)**: log in as tutor in window A, open the student's card → press the call button. Window A shows «Вызываем…». Log in as the linked student in window B → an incoming-call modal shows the tutor's name with «Принять»/«Отклонить».
2. **Accept (US1-3)**: in B press «Принять», grant camera+mic. Both windows show each other's video and hear audio within ~5s.
3. **Mic/Camera toggle (US2)**: in A toggle mic — B stops hearing A and shows A's mic-muted indicator; toggle back. Toggle camera — B shows A's avatar placeholder; toggle back.
4. **Audio-only fallback (US2-6)**: deny camera (or use a device without one) but allow mic in A → call proceeds audio-only; B sees A's avatar with «камера выключена / недоступна».
5. **Screen share (US3)**: in A start screen share, pick a source → B sees the shared screen; stop → B sees A's camera again. While A shares, B's share button is blocked with a Russian message (one-at-a-time).
6. **Hang up (US1-4)**: either side presses «Завершить» → both return to idle, camera/mic released (browser indicator off) within ~2s.
7. **Reject / Cancel / No-answer / Offline / Busy**: exercise each — verify Russian messages («Вызов отклонён», incoming dismissed on cancel, «Нет ответа» after 40s, «Ученик сейчас не в сети» when student logged out, «Абонент занят» when already in a call).
8. **History (US4)**: open call history as tutor and as student → each sees only their own pair's calls, newest first, with correct peer, direction, time, duration, and status. Confirm another tutor/student cannot see these.

## 5. Tests

```bash
# backend/
npm test -- --testPathPattern=callSignaling
npm test -- --testPathPattern=callRecords
# frontend/
npm run test -- src/features/videoCall
npm run test -- src/entities/callRecord
```

## 6. Quality gates (before completion)

```bash
# frontend/
npm run lint && npm run find-cycle && npm run test
# backend/
npm run build && npm test
```

## Notes / gotchas

- `RTCPeerConnection`, `getUserMedia`, `getDisplayMedia` are **injected** behind a wrapper so unit tests can fake them — never call the real APIs in tests.
- Live media objects (`RTCPeerConnection`, `MediaStream`) live in a side-effect registry, **not** in Effector stores (stores hold serializable state only) — required for `fork`-based tests.
- Timers (duration ticker, 40s ring timeout) use patronum `interval`/`delay`, not raw `setInterval`.
- Multi-tab: the WS manager replaces an older connection for the same identity, so only the newest tab receives an incoming call.
