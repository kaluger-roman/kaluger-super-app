# Phase 0 Research: WebRTC Video Calls

All [NEEDS CLARIFICATION] from the spec were already resolved by the PO (TURN-relay fallback, audio-only fallback, persistent `call_records` + history). This document records the **technical** decisions needed to implement those resolved requirements within the existing architecture.

---

## R1. Media topology — direct P2P WebRTC, server signaling only

- **Decision**: One `RTCPeerConnection` per call, 1:1. Local media via `navigator.mediaDevices.getUserMedia({ video, audio })`. Media flows directly device↔device. The server never sits in the media path for successful P2P calls; it only forwards signaling.
- **Rationale**: Directly satisfies FR-005/FR-006 and the headline goal "minimal server load". SC-002 requires ≈0 media traffic through the server for P2P calls — only an SFU/MCU or always-relay would violate this, and both are over-engineering for 1:1 (Principle VII).
- **Alternatives considered**: (a) SFU (mediasoup/janus) — rejected: needless server media load + new heavy dependency for 1:1. (b) Always-TURN relay — rejected: violates SC-002 and the core goal. (c) Third-party SaaS (Twilio/Daily/LiveKit) — rejected: new external dependency, data leaves the system, contradicts "inside the existing app".

## R2. Signaling transport — reuse the existing dual-pool WebSocketManager

- **Decision**: Carry all signaling over the existing `WebSocketManager` (`backend/src/lib/websocket`). It already authenticates and tracks **two** pools: tutors on `/ws` (`clients: Map<userId>`) and students on `/ws/student` (`studentClients: Map<studentUserId>`), with `sendToUser` / `sendToStudent` already implemented. No second socket, no new server.
- **Rationale**: FR-003/FR-006 + Assumption "signaling through existing real-time infra". The student frontend dispatcher (`app/model/student-web-socket.model.ts`) already contains a comment anticipating `video_call_incoming`. Reuse = minimal server load + minimal new code.
- **Key gap to close**: the **student** socket currently ignores inbound messages (`ws.on("message", () => {})` in `WebSocketManager.handleStudentConnection`). Students are callees and (per Assumption "student-initiated is an allowed extension") potential callers, so they MUST be able to **send** signaling. This handler must be wired to the signaling router. The tutor socket already parses inbound messages via `handleMessage` (`messageHandler.ts`) — extend it to route signaling.
- **Cross-pool routing**: a signaling message names a logical peer. The server resolves the peer's pool from the call's authorized pair (tutor → `sendToStudent(studentUserId)`, student → `sendToUser(tutorId)`). The server is the trust boundary: it never lets the client choose an arbitrary recipient; it derives the recipient from the verified pair (R4).
- **Alternatives considered**: HTTP long-poll / SSE signaling — rejected: higher latency, fails SC-003, and ignores existing WS infra. A dedicated signaling server — rejected: new infra, contradicts "minimal server load".

## R3. ICE / STUN / TURN configuration (STUN-first, TURN-fallback)

- **Decision**: Build `RTCConfiguration.iceServers` on the **frontend** from runtime config:
  - Always include a public STUN server (default `stun:stun.l.google.com:19302`, overridable via env).
  - Include the project's coturn TURN server (URL + credentials) when configured.
  - Set `iceTransportPolicy: "all"` so ICE tries direct (host/srflx) candidates first and only uses `relay` candidates when direct fails — this is the native ICE behavior and yields "P2P first, relay only as fallback" (FR-014) **without** forcing relay.
- **TURN credentials**: use coturn's **time-limited REST credentials** (shared-secret HMAC: `username = <expiry-ts>`, `credential = base64(HMAC-SHA1(secret, username))`). The shared secret stays **server-side**; the frontend fetches short-lived credentials from a lightweight authenticated endpoint (or they are embedded in the WS "call accepted/ready" signaling payload). This avoids shipping long-lived TURN passwords to the browser.
- **Env vars (backend, `.env.example`)**: `STUN_URL` (optional, has default), `TURN_URL`, `TURN_SECRET` (shared secret for REST creds), `TURN_CREDENTIAL_TTL` (seconds, default 86400). When `TURN_URL`/`TURN_SECRET` are unset (e.g. local dev), the app runs **STUN-only** and logs that relay fallback is unavailable — calls still work on permissive networks.
- **Frontend exposure**: STUN URL and the *minted* TURN credentials reach the browser via signaling (server computes them per call) so no secret is bundled into the SPA.
- **Rationale**: FR-014 + Dependencies (coturn via env) + SC-009 (≥98% connect rate incl. relay). Time-limited REST creds are coturn's documented, recommended pattern and keep the secret off the client.
- **Alternatives considered**: Static long-lived TURN user/pass in the SPA bundle — rejected: secret leakage. `iceTransportPolicy: "relay"` — rejected: would force relay for ALL calls, violating SC-002. Hardcoding ICE servers in code — rejected: not configurable per environment (Principle VII env-config).

## R4. Authorization — calls only within the tutor↔student pair

- **Decision**: A single server-side guard resolves and verifies the pair for **every** call invite and every signaling relay:
  - Tutor (`userId`) → student: verify `Student.tutorId === userId` AND `Student.studentUser` exists; resolve callee `studentUserId`.
  - Student (`studentUserId`) → tutor: load `StudentUser.studentId`, then `Student.tutorId`; resolve callee tutor `userId`.
  - Reject self-call, non-existent peer, and cross-pair attempts with a Russian error (FR-002/FR-019, SC-008, Edge "позвонить вне разрешённой пары").
- **Rationale**: Reuses the existing `Student ↔ StudentUser ↔ User(tutor)` relations (schema lines 76–127). No new relationship entity (Principle VII). Authorization is enforced **server-side at signaling time**, so a tampered client cannot reach an unauthorized peer.
- **Alternatives considered**: Trusting a client-provided peer id — rejected: security hole. A separate "call permissions" table — rejected: the link already exists.

## R5. Call lifecycle & state machine

- **Decision**: A call is identified by a server-generated `callId` (uuid/cuid). Server-tracked transient state per active call: `{ callId, callerKind: 'tutor'|'student', tutorUserId, studentUserId, status, startedAt, connectedAt? }`. Statuses align with the spec vocabulary: `ringing → connected → completed`, plus terminal `rejected | missed (timeout/offline) | canceled | failed`.
  - **Offline** callee → immediate `failed`-style "не в сети" response, no invite delivered (FR-013).
  - **Busy** (callee already in an active call) → "Абонент занят", no invite (Edge "Занятость").
  - **No answer** within timeout → server marks `missed`, notifies caller "Нет ответа" (FR-009). **Timeout value: 40 seconds** (within the spec's 30–45s range; defined as a backend constant).
  - **Duplicate invite** from the same caller while one is pending/active to the same peer → ignored/deduped (FR-018, Edge "Параллельные/повторные вызовы").
  - **Disconnect** mid-call (WS close or `RTCPeerConnection` `connectionState=failed/disconnected`) → both sides tear down; record `completed` if media was established, else `failed` (FR-016, Edge "Обрыв соединения").
- **Persistence point**: on every terminal transition, write/finalize the `call_records` row (R6). Signaling messages themselves are never stored.
- **Rationale**: Covers FR-007/008/009/013/016/018 and all Edge Cases. Keeping live state in the server (and mirrored minimally in Effector stores on the client) gives both participants a consistent view (FR-020).

## R6. `call_records` persistence model

- **Decision**: New Prisma model `CallRecord` (table `call_records`) keyed to the pair via FKs to `User` (tutor) and `Student` (student), plus a denormalized `callerKind` to express direction per viewer. Fields: `id, tutorId, studentId, callerKind, status, startedAt, endedAt?, durationSeconds?`. Indexes on `tutorId` and `studentId` for history queries. See `data-model.md`.
- **Direction is viewer-relative**: a single stored row yields `outgoing` for the caller's side and `incoming` for the callee's side; the API computes `direction` per requesting viewer (FR-021/022). `peerName` is the *other* party's name, also computed per viewer.
- **Rationale**: FR-021–FR-023, SC-010, Key Entity `call_records`. One row per call (not per participant) keeps the model simple while still rendering correctly for both sides. `Student.name` and `User`/tutor name already exist for `peerName`.
- **Alternatives considered**: Two rows per call (one per participant) — rejected: duplication, harder integrity. Storing `direction` literally — rejected: it differs per viewer, so it must be derived.

## R7. Frontend Effector calls domain (state vs. side-effects boundary)

- **Decision**: Split into two domains:
  - `entities/callRecord` — **persisted** history: `$callHistory`, `CallHistoryGate`, `loadCallHistoryFx` (axios), reusing the existing camelCase `CallHistoryRecord` type. Drives `pages/callHistory` (replaces `MOCK_CALL_HISTORY`).
  - `features/videoCall/model` — **ephemeral** live call: stores hold only serializable state — `$callPhase ('idle'|'outgoing'|'incoming'|'active')`, `$callState`, `$incomingCall` (callerName, callId), `$outgoingCallPeer`, `$selfMediaState`/`$peerMediaState` (`{micOn,cameraOn,screenSharing}`), `$callDurationSeconds`. Events: `callStarted({studentId}|{tutorId})`, `incomingCallReceived`, `acceptCall`, `rejectCall`, `cancelCall`, `hangUp`, `toggleMic`, `toggleCamera`, `toggleScreenShare`, peer-state updates.
  - **`RTCPeerConnection`, `MediaStream`, and DOM `<video>` attachment live OUTSIDE stores** — in effects and a module-level side-effect registry (`webrtc.ts`). Storing non-serializable live objects in Effector stores breaks `fork`-based tests and Principle III. Stores hold ids/flags; the registry holds the live peer connection keyed by `callId`.
  - **Timers** (call-duration ticker, ring timeout) via **patronum** `interval`/`delay`, not raw `setInterval` (per project convention).
- **Wiring**: replace the 18 `// TODO(auto-feature)` mocks. The markers already name the exact stores/events expected (`$currentUser/$callPeer`, `$selfMediaState/$peerMediaState`, `$callState`, `$incomingCall.callerName`, `$outgoingCallPeer`, `$callDurationSeconds`, `callModel.callStarted({studentId|tutorId})`, `toggleMic/Camera/ScreenShare`, `$callHistory + CallHistoryGate -> loadCallHistoryFx`), so the model API is dictated by the approved mockups.
- **Rationale**: Principle III + the existing component contract. Keeping live media objects out of stores is the only way to satisfy both Effector purity and deterministic tests.

## R8. Media controls, screen share, audio-only fallback

- **Decision**:
  - **Mic/Camera toggle**: flip `track.enabled` on the local `MediaStreamTrack` and broadcast the new media-state via a lightweight signaling message so the peer updates its indicator (FR-010/011, SC-005). No renegotiation needed for enable/disable.
  - **Screen share**: `getDisplayMedia()` → `RTCRtpSender.replaceTrack()` to swap the outgoing video track; on stop, replace back with the camera track (or a disabled track if camera off). Listen to the display track's `ended` event to handle the browser's native "Stop sharing" (FR-012, US3-2). Enforce **one-at-a-time** via a shared signaling flag (US3-3 / Assumption): if the peer is already sharing, block locally with a Russian message.
  - **Audio-only fallback**: if `getUserMedia({video:true})` fails but audio succeeds, proceed with audio only; mark `cameraOn:false` and let the peer render the avatar placeholder (FR-015, US2-6/7, Edge "Нет доступа к камере"). Allow later camera enable via `addTrack`/`replaceTrack` (US2-7). If **both** devices fail → abort with a Russian message (Edge "Нет доступа ни к камере, ни к микрофону").
- **Rationale**: `replaceTrack` is the standard, renegotiation-free way to switch camera↔screen. `track.enabled` is the standard mute. Both keep the existing `CallControlBar`/`VideoTile`/`CallStatusBanner` mockups meaningful.

## R9. Multi-tab / single active socket

- **Decision**: Rely on the existing WS manager behavior — a newer connection for the same identity **replaces** the older one (`close(4000, "Replaced by newer connection")`). So incoming calls are delivered to the most-recent tab only; stale tabs won't receive a duplicate invite (Edge "Несколько вкладок"). Client also guards against initiating a second call while one is active (`$callPhase !== 'idle'`).
- **Rationale**: Reuses proven manager semantics; no new presence/coordination layer (Principle VII).

## R10. Testing strategy for WebRTC

- **Decision**:
  - **Backend (Jest+Supertest, real test DB)**: unit-test `callSignaling` pair-authorization, online/busy/timeout/dedup logic, and `call_records` create/finalize; integration-test the history REST endpoints (tutor & student scoping, cross-pair denial → SC-010/SC-008). Signaling routing tested by driving the manager's send maps with fakes (the existing `__tests__/messageHandler.test.ts` + student WS tests are the template).
  - **Frontend (Vitest+RTL+MSW, Effector `fork`)**: unit-test the `call` model transitions and the `callHistory` model (MSW for the REST call). **Inject** `RTCPeerConnection`/`getUserMedia`/`getDisplayMedia` via a thin wrapper so they can be faked deterministically — never hit real media. Component tests assert the wired mockups render from stores (incoming modal shows `callerName`, control bar reflects `$selfMediaState`, history list renders `$callHistory`, etc.).
  - Patronum timers are faked via Vitest fake timers / fork handler overrides (per the existing student-WS reconnect test pattern).
- **Rationale**: Principle VI (no Prisma mocks; test behavior). WebRTC primitives are non-deterministic and unavailable in jsdom, so dependency-injecting them is the only way to get reliable unit tests.
