---
description: "Task list for feature 030-webrtc-video-calls"
---

# Tasks: Видеозвонки между репетитором и учеником (WebRTC, peer-to-peer)

**Input**: Design documents from `/specs/030-webrtc-video-calls/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Tests**: REQUIRED. The project constitution (Principle VI) and CLAUDE.md mandate full test coverage for all new code. Test tasks are included for every backend service/controller and frontend model/component.

**Organization**: Tasks are grouped by user story (US1–US4) for independent implementation and testing.

**Context — mockups already exist (Phase 2, approved)**: `frontend/src/features/videoCall/**`, `frontend/src/pages/call/**`, `frontend/src/pages/callHistory/**` are real components with hardcoded mocks and 18 `// TODO(auto-feature)` markers. Work = wire them to real stores by replacing those mocks; do NOT rebuild the UI.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: US1–US4 (user-story phases only)
- Paths are absolute-from-repo-root; monorepo: `backend/src/`, `frontend/src/`

## Conventions reminder (read before coding)

- Backend code → `docs/conventions/backend.md`; backend tests → `docs/conventions/backend-testing.md`.
- Frontend code → `docs/conventions/frontend.md`; frontend tests → `docs/conventions/frontend-testing.md`.
- Named exports only; `type` not `interface`; `import type`; no `any` (use `unknown`); every folder has `index.ts`; components <150 / models <200 / controllers <150 lines; no inline styles; Russian UI text. Effector: `$store`/`eventName`/`effectNameFx`/`Gate`, only `sample` + `useUnit`, pure `fn`, patronum for timers. Backend: Routes→Controllers→Services→Prisma; no Prisma mocks in tests; custom errors centralized in `backend/src/utils/errors.ts`.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Schema, env, and shared type/config groundwork that everything else builds on.

- [X] T001 Add `CallRecord` model, `CallStatus` + `CallerKind` enums, and `callRecords` back-relations on `User` and `Student` to `backend/prisma/schema.prisma` per `specs/030-webrtc-video-calls/data-model.md` (indexes on `[tutorId, startedAt]` and `[studentId, startedAt]`, `@@map("call_records")`).
- [X] T002 Create migration and regenerate client: `npm run db:migrate` (name `030_call_records`) then `npm run db:generate`, and apply to test DB with `npm run db:migrate:test` (run from `backend/`). Verify `prisma/migrations/<ts>_030_call_records/` exists.
- [X] T003 [P] Document call ICE/TURN env vars in `backend/.env.example`: `STUN_URL` (with public default note), `TURN_URL`, `TURN_SECRET`, `TURN_CREDENTIAL_TTL` (default 86400), per `specs/030-webrtc-video-calls/quickstart.md` §2.
- [X] T004 [P] Add backend signaling + call-history types to `backend/src/types/index.ts`: the inbound/outbound signaling discriminated unions (`CallSignalingInbound`/`CallSignalingOutbound`) from `contracts/signaling-ws.md`, `IceServersConfig`, `CallHistoryItem`, `CallHistoryResponse`, and `CallStatusValue`/`CallDirection` string-literal aliases mapping to the Prisma enums.

**Checkpoint**: Schema migrated, env documented, shared types available.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core call-signaling transport + authorization + persistence that ALL user stories depend on. No US work begins until this phase is complete.

**⚠️ CRITICAL**: US1–US4 all build on the signaling channel, the pair-authorization guard, and the `call_records` writer created here.

### Backend — pair authorization + ICE config + persistence

- [X] T005 [P] Add custom call errors (`CallAuthorizationError`, `CallPeerOfflineError`, `CallPeerBusyError`, `CallNotFoundError`) with Russian messages to `backend/src/utils/errors.ts`.
- [X] T006 [P] Implement pair-resolution helpers in `backend/src/services/callSignaling/callSignaling.helpers.ts`: `resolvePairForTutor(tutorUserId, targetStudentId)` (verify `Student.tutorId === tutorUserId` AND `studentUser` exists → returns `{tutorUserId, studentUserId, studentId, studentName, tutorName}`) and `resolvePairForStudent(studentUserId)` (resolve `studentId`→`tutorId`); reject self/cross-pair via T005 errors (research R4, FR-002/FR-019).
- [X] T007 [P] Implement ICE config builder in `backend/src/services/callSignaling/iceConfig.ts`: `buildIceServers()` returns STUN entry (`STUN_URL` or public default) plus, when `TURN_URL`+`TURN_SECRET` set, a TURN entry with time-limited HMAC-SHA1 REST credentials (`username = now + TURN_CREDENTIAL_TTL`, `credential = base64(hmac)`); STUN-only when TURN unset (research R3, `contracts/signaling-ws.md`).
- [X] T008 Implement `call_records` writer in `backend/src/services/callSignaling/callRecord.ts`: `createFinalizedCallRecord({tutorId, studentId, callerKind, status, startedAt, endedAt?, connectedAt?})` computing `durationSeconds` from `connectedAt`→`endedAt` and applying the status→fields rules in `data-model.md`. Never throws outward (log-and-swallow, like `studentLessonBroadcast`).

### Backend — live-call registry + signaling service

- [X] T009 Implement the in-memory live-call registry + lifecycle in `backend/src/services/callSignaling/callSignaling.ts`: `Map<callId, LiveCall>` with helpers to start (`ringing`), find by participant (busy/duplicate checks — FR-018, Edge "Занятость"), mark connected, and terminate (finalize via T008 + clear). Encapsulate the 40s ring timeout constant (research R5; value 40000ms).
- [X] T010 Implement signaling routing in `backend/src/lib/websocket/signaling.ts` + `signaling.types.ts`: a `handleCallSignal(senderKind, senderId, data)` that validates each inbound message against the live call / authorized pair (T006/T009), relays SDP/ICE/media-state verbatim to the resolved peer pool, and emits lifecycle outbound messages (`call_incoming`/`call_ringing`/`call_accepted`/etc.) with ICE config from T007 — per `contracts/signaling-ws.md`. Uses `getWebSocketManager().sendToUser`/`sendToStudent`.
- [X] T011 Wire the **tutor** inbound path: extend `backend/src/lib/websocket/messageHandler.ts` `handleMessage` to detect call-signaling `type`s and delegate to `handleCallSignal("tutor", ws.userId, data)`, leaving the existing echo/non-call behavior intact.
- [X] T012 Wire the **student** inbound path: in `backend/src/lib/websocket/WebSocketManager.ts` `handleStudentConnection`, replace `ws.on("message", () => {})` with a JSON-parsing handler that delegates to `handleCallSignal("student", ws.studentUserId, data)` (mirrors the tutor `ws.on("message")` parse/try-catch). Also fire a "peer disconnected" termination on student `close` while a call is active (FR-016).
- [X] T013 Handle tutor disconnect mid-call: in `WebSocketManager.ts` `handleConnection` close-handler, notify `callSignaling` to terminate any active call for that `userId` (finalize record, send `call_ended` to peer) — Edge "Обрыв соединения", FR-016.

### Backend — call-history read path

- [X] T014 [P] Implement history query in `backend/src/services/callRecord/getCallHistory.ts`: `getCallHistoryForTutor(tutorUserId, {limit, cursor})` and `getCallHistoryForStudent(studentUserId, …)` (resolve `studentId`; empty array if unlinked), each returning viewer-relative `CallHistoryItem[]` (derive `direction` from `callerKind`, `peerName` from the other party) sorted `startedAt desc` — `data-model.md` read projection, `contracts/call-history-api.md`.
- [X] T015 [P] Add `backend/src/services/callSignaling/index.ts` and `backend/src/services/callRecord/index.ts` re-exporting public API; register both in `backend/src/services/index.ts`.

### Backend — foundational tests

- [X] T016 [P] Unit-test pair authorization + ICE builder + record writer in `backend/src/services/callSignaling/__tests__/callSignaling.helpers.test.ts`, `iceConfig.test.ts`, `callRecord.test.ts` (real test DB; assert self-call/cross-pair rejection, STUN-only vs STUN+TURN output, duration/status field rules).
- [X] T017 [P] Unit-test signaling routing in `backend/src/lib/websocket/__tests__/signaling.test.ts`: drive `handleCallSignal` with fake send maps and assert offline→`call_unavailable`, busy→`call_busy`, valid invite→`call_incoming`+`call_ringing`, dedup of repeat invites, verbatim relay of offer/answer/ice, and cross-pair→`call_error` (template: existing `messageHandler.test.ts` / student WS tests).

### Frontend — WebRTC client + signaling transport + base call model (shared by all stories)

- [X] T018 [P] Implement an injectable WebRTC wrapper in `frontend/src/features/videoCall/model/webrtc.ts`: thin factories `createPeerConnection(config)`, `getUserMediaSafe(constraints)`, `getDisplayMediaSafe()` plus a module-level `Map<callId, {pc, localStream, ...}>` side-effect registry (research R7/R10 — keeps non-serializable objects OUT of Effector stores; injectable for tests).
- [X] T019 [P] Implement ICE config assembly on the client in `frontend/src/features/videoCall/model/iceConfig.ts`: build `RTCConfiguration` from the `iceServers` payload received in `call_ringing`/`call_accepted` (default `iceTransportPolicy: "all"` so direct candidates win, relay only as fallback — research R3).
- [X] T020 Implement the base call Effector model in `frontend/src/features/videoCall/model/call.model.ts` + `call.types.ts`: stores `$callPhase`, `$callState`, `$incomingCall`, `$outgoingCallPeer`, `$selfMediaState`, `$peerMediaState`, `$callDurationSeconds`; events `callStarted`, `incomingCallReceived`, `acceptCall`, `rejectCall`, `cancelCall`, `hangUp`, `toggleMic`, `toggleCamera`, `toggleScreenShare`, `peerMediaStateChanged`, `callEnded`. Pure `sample` wiring only; live media handled via effects calling T018. (Model split to stay <200 lines — extract helpers to `call.helpers.ts` if needed.)
- [X] T021 Implement client signaling glue in `frontend/src/features/videoCall/model/signaling.ts`: `sendCallSignalFx` (send over the active app WS — tutor or student) and a parser mapping inbound signaling messages to `call.model` events; export a `dispatchCallSignal(raw)` used by the app WS dispatchers.
- [X] T022 Wire signaling into both app WS dispatchers: in `frontend/src/app/model/web-socket.model.ts` (tutor) and `frontend/src/app/model/student-web-socket.model.ts` (student — the file already anticipates `video_call_incoming`), route call-signaling message `type`s to `dispatchCallSignal` from T021 without disturbing existing `lesson_*` routing.
- [X] T023 [P] Add `frontend/src/features/videoCall/model/index.ts` re-exporting the public call model API (`callModel` namespace) and extend `frontend/src/features/videoCall/index.ts` to expose it.

### Frontend — foundational model tests

- [X] T024 [P] Unit-test the base call model transitions with Effector `fork` in `frontend/src/features/videoCall/model/__tests__/call.model.test.ts`: idle→outgoing on `callStarted`, →incoming on `incomingCallReceived`, →active on accept, →idle on hangUp/reject/cancel/callEnded; inject fake WebRTC wrapper (T018) and fake timers (patronum).
- [X] T025 [P] Unit-test client signaling parse/send in `frontend/src/features/videoCall/model/__tests__/signaling.test.ts`: each inbound `type` maps to the correct event; outbound payloads match `contracts/signaling-ws.md`.

**Checkpoint**: Signaling channel works end-to-end at the protocol level for both pools; pair authorization enforced; `call_records` writer + history query ready; base call model + WebRTC wrapper in place. User stories can now proceed.

---

## Phase 3: User Story 1 — Репетитор звонит своему ученику (Priority: P1) 🎯 MVP

**Goal**: Tutor initiates a call to their linked student; student sees incoming call, accepts, both get two-way audio/video; either can hang up; reject/cancel/no-answer/offline/busy all handled with Russian messages.

**Independent Test**: In two sessions (tutor + linked student), tutor calls student → student sees incoming with caller name → accepts (grants cam/mic) → both see/hear each other → either hangs up → both return to idle, devices released. Also verify reject, cancel, 40s no-answer, offline, busy paths.

### Implementation for User Story 1

- [X] T026 [US1] Implement the WebRTC negotiation flow in `frontend/src/features/videoCall/model/webrtc.ts` (or a `negotiation.ts` sibling) driven by `call.model`: on caller `call_accepted` → `getUserMedia` + create offer + send `webrtc_offer`; on callee accept → answer; trickle ICE via `webrtc_ice`; attach remote stream; emit `call_connected` + `callConnected` event when media flows (FR-005, SC-001).
- [X] T027 [US1] Implement call-duration ticker and 40s ring timeout in the model using **patronum** `interval`/`delay` (no raw `setInterval`): `$callDurationSeconds` increments while `active`; outgoing call auto-fails to «Нет ответа» handling on `call_no_answer` (FR-009).
- [X] T028 [US1] Wire the tutor entry point: in `frontend/src/features/students/ui/StudentViewDialog/StudentViewDialog.tsx` replace the TODO `navigate('/call')` with `callModel.callStarted({ studentId })`; surface the call button (and disable/hide when the student is offline per FR-013 — see T031 presence).
- [X] T029 [US1] Wire `OutgoingCallOverlay` and `IncomingCallModal`: replace `// TODO(auto-feature)` mocks in `frontend/src/features/videoCall/ui/OutgoingCallOverlay/OutgoingCallOverlay.tsx` (peer from `$outgoingCallPeer`) and `frontend/src/features/videoCall/ui/IncomingCallModal/IncomingCallModal.tsx` (caller from `$incomingCall.callerName`); wire Принять/Отклонить/Отмена buttons to `acceptCall`/`rejectCall`/`cancelCall`.
- [X] T030 [US1] Wire the active-call screen + page shell: in `frontend/src/features/videoCall/ui/ActiveCallScreen/ActiveCallScreen.tsx` drive from `$callState`/`$selfMediaState`/`$peerMediaState`/`$callDurationSeconds` (replace mock prop), and in `frontend/src/pages/call/CallPage.tsx` + `CallPage.helpers.ts` derive phase from `$callPhase` instead of the URL; attach local/remote `MediaStream`s to the `<video>` elements via refs (from the T018 registry).
- [X] T031 [US1] Mount a global incoming-call listener + presence-aware call button: in `frontend/src/app/components/AppRoutes/AppRoutes.tsx` (or an app-level component) render `IncomingCallModal`/`OutgoingCallOverlay` driven by `$callPhase` for both pools, and add guards for `/call` (both tutor & student). Expose a `$peerOnline`-style selector fed by `call_unavailable`/`call_busy` so the entry button reflects offline/busy (FR-013, Edge offline/busy).
- [X] T032 [US1] Map error/edge outbound signals to Russian UI in `frontend/src/features/videoCall/model` + status banner: `call_unavailable`→«Ученик сейчас не в сети», `call_busy`→«Абонент занят», `call_no_answer`→«Нет ответа», `call_rejected`→«Вызов отклонён», `call_error`→message; ensure every terminal returns UI to idle and releases media (FR-007, SC-007). Reuse `CallStatusBanner`.

### Tests for User Story 1

- [X] T033 [P] [US1] Backend integration test for the full happy-path + edge signaling in `backend/src/services/callSignaling/__tests__/callLifecycle.test.ts`: invite→incoming→accept→connected→hangup writes a `COMPLETED` record; reject→`REJECTED`; cancel→`CANCELED`; timeout→`MISSED`; offline→`call_unavailable` + `MISSED`; busy→`call_busy` (real test DB).
- [X] T034 [P] [US1] Frontend model test in `frontend/src/features/videoCall/model/__tests__/call-lifecycle.model.test.ts`: outgoing→active→idle with fake WebRTC + fake timers; assert offer/answer/ice are sent in order and remote stream attaches; assert duration ticks and stops; assert each error signal lands the right Russian state.
- [X] T035 [P] [US1] Component test in `frontend/src/features/videoCall/ui/IncomingCallModal/__tests__/IncomingCallModal.test.tsx` and `OutgoingCallOverlay/__tests__/`: modal renders `$incomingCall.callerName`, buttons dispatch accept/reject/cancel (RTL + fork).

**Checkpoint**: US1 fully functional — a tutor and student can complete a real call; all P1 acceptance scenarios + offline/busy/no-answer pass.

---

## Phase 4: User Story 2 — Управление микрофоном и камерой + audio-only (Priority: P2)

**Goal**: During an active call either party can toggle mic and camera; peer sees indicators / avatar placeholder; audio-only fallback when no/denied camera, with later camera enable.

**Independent Test**: In an active call, toggle mic off → peer stops hearing + sees mic-muted indicator; on again → audio returns. Toggle camera off → peer sees avatar placeholder; on → video returns. Start with denied camera but allowed mic → audio-only with avatar + «камера выключена / недоступна»; later enable camera → peer sees video.

### Implementation for User Story 2

- [X] T036 [US2] Implement mic/camera toggle side-effects in `frontend/src/features/videoCall/model/webrtc.ts` + `call.model.ts`: `toggleMic`/`toggleCamera` flip the local track `.enabled`, update `$selfMediaState`, and send `call_media_state` so the peer updates `$peerMediaState` (FR-010/011, SC-005); no renegotiation for enable/disable (research R8).
- [X] T037 [US2] Implement audio-only fallback in the getUserMedia path (`webrtc.ts`): if video acquisition fails but audio succeeds, proceed with `cameraOn:false` and broadcast media-state; if both fail, abort the call with a Russian message and return to idle (FR-015, Edge "нет доступа ни к камере, ни к микрофону").
- [X] T038 [US2] Support enabling camera later in an audio-only call: add a track via `replaceTrack`/`addTrack` and re-broadcast media-state so the peer swaps avatar→video (US2-7).
- [X] T039 [US2] Wire the control bar + tiles: in `frontend/src/features/videoCall/ui/CallControlBar/CallControlBar.tsx` bind the mic/camera buttons + active state to `$selfMediaState`/`toggleMic`/`toggleCamera` (replace the local-visual-state TODO in `ActiveCallScreen.tsx`); in `frontend/src/features/videoCall/ui/VideoTile/VideoTile.tsx` + `TileContent.tsx` render the `CallAvatar` placeholder + «камера выключена» label from `$peerMediaState`/`$selfMediaState`.

### Tests for User Story 2

- [X] T040 [P] [US2] Model test in `frontend/src/features/videoCall/model/__tests__/media-controls.model.test.ts`: `toggleMic`/`toggleCamera` flip track.enabled + `$selfMediaState` and emit `call_media_state`; inbound `call_media_state` updates `$peerMediaState`; audio-only fallback sets `cameraOn:false`; both-denied aborts (fake WebRTC).
- [X] T041 [P] [US2] Component test in `frontend/src/features/videoCall/ui/CallControlBar/__tests__/CallControlBar.test.tsx` and `VideoTile/__tests__/VideoTile.test.tsx`: buttons reflect/dispatch toggles; tile shows avatar + label when peer camera off (RTL + fork).

**Checkpoint**: US1 + US2 work — calls plus full mic/camera control and audio-only fallback.

---

## Phase 5: User Story 3 — Демонстрация экрана (Priority: P3)

**Goal**: Either party can start/stop screen share; peer sees the shared screen; one-at-a-time enforcement; clean teardown on hang-up.

**Independent Test**: In an active call, start screen share, pick a source → peer sees the screen + indicator; stop → peer sees camera again. While one shares, the other's share attempt is blocked with a Russian message. Hanging up during share releases the capture.

### Implementation for User Story 3

- [X] T042 [US3] Implement screen-share side-effects in `frontend/src/features/videoCall/model/webrtc.ts` + `call.model.ts`: `toggleScreenShare` → `getDisplayMedia()` + `RTCRtpSender.replaceTrack(screenTrack)`; on stop (or the display track's `ended` event from the browser's native Stop) → replace back with the camera track (or disabled track if camera off); update `$selfMediaState.screenSharing` and broadcast `call_media_state` (FR-012, US3-1/2, research R8).
- [X] T043 [US3] Enforce one-at-a-time sharing: block local `toggleScreenShare` when `$peerMediaState.screenSharing` is true and show a Russian message; ensure hang-up/`callEnded` stops any active share and releases capture (US3-3/4, Assumption "один за раз").
- [X] T044 [US3] Wire the screen-share control + display: bind the share button in `frontend/src/features/videoCall/ui/CallControlBar/CallControlBar.tsx` to `toggleScreenShare`/`$selfMediaState.screenSharing`; render the incoming shared stream in `frontend/src/features/videoCall/ui/VideoTile/VideoTile.tsx` (replace `ScreenShareMock.tsx` usage) and show the sharing indicator via `CallStatusBanner`.

### Tests for User Story 3

- [X] T045 [P] [US3] Model test in `frontend/src/features/videoCall/model/__tests__/screen-share.model.test.ts`: start sets `screenSharing:true` + replaceTrack called + media-state broadcast; native `ended` reverts to camera; one-at-a-time block when peer is sharing; hang-up stops share (fake WebRTC / fake `getDisplayMedia`).
- [X] T046 [P] [US3] Component test in `frontend/src/features/videoCall/ui/VideoTile/__tests__/ScreenShare.test.tsx`: shared stream renders, sharing indicator shows, share button disabled while peer shares (RTL + fork).

**Checkpoint**: US1–US3 work — full real-time call experience.

---

## Phase 6: User Story 4 — История звонков (Priority: P3)

**Goal**: Tutor and student each see a reverse-chronological list of their own pair's calls (peer, direction, time, duration, status); no cross-pair leakage.

**Independent Test**: After several calls (some completed, some missed/rejected), open history as tutor and as student → each sees only their calls, newest first, correct fields; a different tutor/student sees none.

### Implementation for User Story 4

- [X] T047 [P] [US4] Implement the tutor history controller + route: `backend/src/controllers/callRecords/getCallHistory.ts` (calls T014 `getCallHistoryForTutor`, validates `limit`/`cursor`) + `backend/src/controllers/callRecords/index.ts`, and `GET /api/calls/history` (auth middleware) in `backend/src/routes/callRecords.ts`; register the router in the app (`backend/src/index.ts` / route aggregator) — `contracts/call-history-api.md`.
- [X] T048 [P] [US4] Add the student history endpoint: extend `getCallHistory` controller with a student variant (calls `getCallHistoryForStudent`) and add `GET /api/student/calls/history` under the existing `studentAuth` `/api/student/*` family (route file + registration).
- [X] T049 [P] [US4] Implement the frontend history domain in `frontend/src/entities/callRecord/`: `api/callHistoryApi.ts` (axios GET, picks tutor vs student endpoint by session), `model/callHistory.model.ts` (`$callHistory`, `CallHistoryGate`, `loadCallHistoryFx`), `callRecord.types.ts` (reuse `CallHistoryRecord` shape), and `index.ts`; register in `frontend/src/entities/index.ts`.
- [X] T050 [US4] Wire the history page + nav: in `frontend/src/pages/callHistory/CallHistoryPage.tsx` replace `MOCK_CALL_HISTORY` with `$callHistory` + `CallHistoryGate`→`loadCallHistoryFx` (and the empty-state via existing `CallHistoryEmpty`); add the guarded `/call/history` route in `AppRoutes.tsx` and the nav entries in `frontend/src/widgets/sidebar/Sidebar.tsx` (tutor) and `frontend/src/widgets/studentSidebar/StudentSidebar.constants.tsx` (student) — replacing their TODO markers. Remove `MOCK_CALL_HISTORY` from `videoCall.constants.ts`.

### Tests for User Story 4

- [X] T051 [P] [US4] Backend integration test in `backend/src/controllers/callRecords/__tests__/getCallHistory.test.ts` (Supertest + real test DB): tutor sees only own pair's records newest-first with correct derived `direction`/`peerName`; student sees only theirs; cross-pair returns none; unlinked student → empty; 401 without token (SC-010, SC-008).
- [X] T052 [P] [US4] Frontend model test in `frontend/src/entities/callRecord/model/__tests__/callHistory.model.test.ts` (MSW + fork): Gate triggers `loadCallHistoryFx`, `$callHistory` populated, error path handled; plus a `CallHistoryPage` component test asserting rows + empty state render from the store.

**Checkpoint**: All four user stories independently functional.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Cleanup, full-suite verification, and quality gates across all stories.

- [X] T053 Remove all remaining `// TODO(auto-feature)` markers across `frontend/src/features/videoCall/**`, `frontend/src/pages/call/**`, `frontend/src/pages/callHistory/**`, `StudentViewDialog.tsx`, `StudentCabinetLayout.tsx`, `AppRoutes.tsx`, `Sidebar.tsx`, `StudentSidebar.constants.tsx`; delete dead mock files (`ScreenShareMock.tsx`, mock-state query parsing in `videoCall.helpers.ts`, `MOCK_*` in `videoCall.constants.ts`) and confirm none are still imported.
- [X] T054 [P] Verify multi-tab + disconnect behavior end-to-end against `quickstart.md` §4 (newest tab receives incoming; mid-call disconnect ends both sides) and confirm devices are released on every terminal path (FR-016, Edge multi-tab).
- [X] T055 [P] Run frontend quality gates from `frontend/`: `npm run lint` (zero errors), `npm run find-cycle` (no cycles — FSD), `npm run test` (all pass).
- [X] T056 [P] Run backend quality gates from `backend/`: `npm run build` (zero TS errors) and `npm test` (all pass, real test DB).
- [X] T057 Execute the full manual verification checklist in `specs/030-webrtc-video-calls/quickstart.md` §4 (all acceptance scenarios US1–US4 + edge cases) and confirm every error state shows a Russian message with no "stuck" UI (SC-007).

---

## Dependencies & Execution Order

### Phase dependencies

- **Setup (Phase 1)**: no dependencies — start immediately.
- **Foundational (Phase 2)**: depends on Setup — **BLOCKS all user stories**.
- **User Stories (Phases 3–6)**: all depend on Foundational. US1 (P1) is the MVP and should come first; US2/US3 build on the active-call surface from US1; US4 (history) is independent of US1–US3 internals but shares the `call_records` writer from Phase 2.
- **Polish (Phase 7)**: depends on all targeted stories.

### User story dependencies

- **US1 (P1)**: after Phase 2. No dependency on US2–US4.
- **US2 (P2)**: after Phase 2. Best after US1 (operates on an active call) but the toggle logic is independently testable with a faked active call.
- **US3 (P3)**: after Phase 2. Best after US2 (shares track-replacement plumbing) but independently testable.
- **US4 (P3)**: after Phase 2. Fully independent of US1–US3 (only consumes Phase-2 `call_records`); can be built in parallel with US1.

### Within each user story

- Backend before its dependent frontend wiring; model/side-effects before UI wiring; implementation before its tests can pass (tests assert the wired behavior).
- Effector models before the components that bind to them.

### Parallel opportunities

- Setup: T003, T004 in parallel (T001→T002 are sequential schema steps).
- Foundational backend: T005/T006/T007 parallel; T008 after T001/T002; T009→T010→T011/T012/T013 sequential (shared registry/manager files); T014/T015 parallel; tests T016/T017 parallel after their targets.
- Foundational frontend: T018/T019 parallel; T020→T021→T022 sequential; T023/T024/T025 parallel after.
- Across stories once Phase 2 is done: **US4 (T047–T052) can run fully in parallel with US1 (T026–T035)** since they touch disjoint files (backend controllers/routes + `entities/callRecord` vs. `features/videoCall/model` + call UI).
- Within a story, all tasks marked [P] touch different files and can run together.

---

## Parallel Example: User Story 1

```bash
# After Phase 2, US1 implementation tasks on disjoint files:
Task: "Wire tutor entry point in StudentViewDialog.tsx"            # T028
Task: "Wire OutgoingCallOverlay + IncomingCallModal mocks"         # T029
# Then US1 tests in parallel:
Task: "Backend lifecycle integration test (callLifecycle.test.ts)" # T033
Task: "Frontend call-lifecycle model test"                         # T034
Task: "IncomingCallModal/OutgoingCallOverlay component tests"      # T035

# US4 can run concurrently with US1 (disjoint files):
Task: "Tutor history controller + route (T047)"
Task: "Frontend callRecord entity + model (T049)"
```

---

## Implementation Strategy

### MVP first (User Story 1 only)

1. Phase 1 (Setup) → 2. Phase 2 (Foundational — critical, blocks all) → 3. Phase 3 (US1) → **STOP & VALIDATE**: a tutor and student complete a real call with all P1 edges. Demo-able MVP.

### Incremental delivery

1. Setup + Foundational → signaling + persistence ready.
2. US1 → real calls (MVP). 3. US2 → mic/camera + audio-only. 4. US3 → screen share. 5. US4 → history. Each increment is independently testable and non-breaking.

### Parallel team strategy

After Phase 2: Dev A → US1 then US2/US3 (the live-call surface); Dev B → US4 (history backend + `entities/callRecord`) in parallel. Converge at Phase 7 gates.

---

## Notes

- [P] = different files, no incomplete-task dependency.
- Live media objects (`RTCPeerConnection`, `MediaStream`) stay OUT of Effector stores — in the T018 side-effect registry — so `fork`-based tests stay deterministic (research R7/R10).
- All WebRTC browser APIs are injected behind the T018 wrapper; tests never touch real media/devices.
- Timers use patronum `interval`/`delay`, never raw `setInterval`/`setTimeout` (project convention).
- No new runtime npm dependencies; STUN/TURN via env; coturn is operational (quickstart §2).
- Commit after each task or logical group; stop at any checkpoint to validate a story independently.
