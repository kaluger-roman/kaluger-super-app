# Implementation Plan: Видеозвонки между репетитором и учеником (WebRTC, peer-to-peer)

**Branch**: `030-webrtc-video-calls` | **Date**: 2026-06-04 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `specs/030-webrtc-video-calls/spec.md`

## Summary

Add in-app 1:1 video calls between a tutor and their linked student. Media flows peer-to-peer over WebRTC (`RTCPeerConnection` + `getUserMedia`/`getDisplayMedia`); the server only relays **signaling** (offer/answer/ICE candidates + call lifecycle control) over the **existing WebSocket manager**, which already serves both the tutor pool (`/ws`) and the student pool (`/ws/student`) from feature 029. ICE uses a public STUN server first (direct P2P) and falls back to the project's own coturn TURN relay only when P2P is unreachable (strict/symmetric NAT, firewall) — keeping median server load near zero. Basic controls: mic toggle, camera toggle, screen share, plus audio-only fallback when no camera. Every finished/attempted call is persisted to a new `call_records` table, exposed via REST for a chronological call-history UI scoped to the tutor↔student pair.

The **frontend presentation layer already exists** (Phase 2, approved): `frontend/src/features/videoCall/**`, `frontend/src/pages/call/**`, `frontend/src/pages/callHistory/**`, with 18 `// TODO(auto-feature)` markers and hardcoded mocks. This plan therefore focuses on: (1) backend signaling + `call_records` + REST + authorization; (2) the frontend WebRTC client logic; (3) Effector `calls` domain models; (4) **wiring** the existing mockups to those stores by replacing the TODO-marked mocks; (5) full test coverage (jest backend, vitest frontend).

## Technical Context

**Language/Version**: TypeScript 5.x (strict), Node.js 20
**Primary Dependencies**: Frontend — React, Effector, Material UI, styled-components, browser WebRTC APIs (`RTCPeerConnection`, `navigator.mediaDevices.getUserMedia`/`getDisplayMedia`), patronum (timers). Backend — Express, Prisma, `ws` (existing WebSocketManager). **No new runtime npm dependencies** (WebRTC is a browser primitive; STUN/TURN are infra, configured via env). coturn is an **operational/infra** dependency, not an npm package.
**Storage**: PostgreSQL via Prisma ORM. One new table `call_records` (+ migration). Signaling messages are ephemeral (never persisted).
**Testing**: Backend — Jest + Supertest + real test DB (no Prisma mocks). Frontend — Vitest + React Testing Library + MSW; Effector stores tested with `fork`. WebRTC browser APIs (`RTCPeerConnection`, `getUserMedia`) stubbed/injected in unit tests.
**Target Platform**: Modern desktop + mobile browsers (same as the rest of the SPA). No native apps.
**Project Type**: Web (frontend FSD + backend layered MVC monorepo).
**Performance Goals**: Signaling delivery ≤2s (SC-003); media established ≤5s in 95% of calls (SC-001); toggle/teardown reflected ≤2s (SC-004/SC-005). Per-call media traffic through server ≈0 for P2P calls (SC-002).
**Constraints**: Server must NOT relay media for P2P-successful calls (signaling only). TURN relay used only for the minority of calls where P2P fails. ICE strategy: STUN-first, TURN-fallback. All UI text/errors in Russian. No `any`, named exports only, FSD import direction, Effector-only state, components <150 / models <200 / controllers <150 lines.
**Scale/Scope**: 1:1 calls only (no group). Two auth pools (tutor + student). Low concurrency (single-tutor SaaS-style usage). One new table, ~2 REST endpoints, ~8 signaling message types, one new Effector calls domain, wiring of ~18 TODO markers across existing components.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Compliance |
|-----------|------------|
| I. Feature-Sliced Design (frontend) | PASS — new code lives in `features/videoCall` (use-case logic), `entities/callRecord` (domain model + history API), `app/model` (WS dispatcher extension). Imports stay downward (`pages → features → entities → shared`). Public API via `index.ts`; no deep imports. `madge` must stay clean. |
| II. Layered MVC (backend) | PASS — `routes/callRecords.ts → controllers/callRecords/* → services/callRecord/* → Prisma`. Signaling is a `lib/websocket` concern (transport), call lifecycle/authorization is a `services/callSignaling` concern. Controllers only do HTTP+validation. |
| III. Effector state | PASS — new `callModel` / `callHistory` use `$store`, `eventName`, `effectNameFx`, `Gate`; only `sample` + `useUnit`. Pure `fn`. Timers via patronum. RTCPeerConnection/MediaStream live **outside** stores (in effects/a side-effect registry), stores hold serializable call state only. |
| IV. Type safety | PASS — `type` only, `import type`, no `any` (use `unknown`); backend types in `src/types/index.ts`, frontend `*.types.ts`; reuse the existing `frontend/src/features/videoCall/videoCall.types.ts` and Prisma-generated `CallRecord`. |
| V. Code consistency | PASS — named exports, function expressions, `index.ts` per folder, size limits, no inline styles (styled-components / existing `.styled.ts`), Russian UI text. |
| VI. Testing discipline | PASS — backend Jest+Supertest+real test DB; frontend Vitest+RTL+MSW; Effector with `fork`; WebRTC APIs injected for determinism; descriptive names; zero lint/TS errors. |
| VII. Simplicity | PASS — reuse existing WS manager, existing tutor↔student link, existing mockups; no new deps; no signaling persistence; no premature abstractions. TURN config is plain env vars. |

**Initial gate: PASS.** No violations → Complexity Tracking left empty.

**Stack-change note (Principle "Technology Stack"):** No new runtime npm dependencies are introduced. WebRTC APIs are browser built-ins. STUN/TURN are infrastructure configured via environment variables; coturn is deployed operationally (documented in quickstart/deploy notes), not added to `package.json`. This satisfies "No new runtime dependencies without clear necessity."

## Project Structure

### Documentation (this feature)

```text
specs/030-webrtc-video-calls/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output (REST + WS signaling contracts)
│   ├── call-history-api.md
│   └── signaling-ws.md
├── checklists/
│   └── requirements.md  # Pre-existing (spec quality gate)
└── tasks.md             # Phase 2 output (/speckit.tasks — NOT created here)
```

### Source Code (repository root)

```text
backend/
├── prisma/
│   ├── schema.prisma                       # + model CallRecord, enums CallStatus/CallDirection, relations on User & Student
│   └── migrations/<ts>_030_call_records/   # NEW migration
└── src/
    ├── types/index.ts                      # + call-history response types, signaling message types (server-side)
    ├── lib/websocket/
    │   ├── types.ts                        # (unchanged shape) AuthenticatedWebSocket / AuthenticatedStudentWebSocket
    │   ├── signaling.ts                    # NEW — parse/route inbound signaling for BOTH pools; relay to peer
    │   ├── signaling.types.ts              # NEW — discriminated union of signaling messages
    │   ├── WebSocketManager.ts             # MODIFY — wire student `ws.on("message")` to signaling; add sendCallSignal helpers
    │   ├── messageHandler.ts               # MODIFY — route tutor inbound signaling messages
    │   └── __tests__/                       # signaling routing/auth tests
    ├── services/
    │   └── callSignaling/                  # NEW — pair authorization, online/busy checks, call lifecycle → call_records
    │       ├── callSignaling.ts
    │       ├── callSignaling.helpers.ts
    │       ├── callRecord.ts               # create/finalize call_records rows
    │       ├── index.ts
    │       └── __tests__/
    ├── controllers/
    │   └── callRecords/                    # NEW — GET history (tutor + student variants)
    │       ├── getCallHistory.ts
    │       ├── index.ts
    │       └── __tests__/                   # Supertest integration
    └── routes/
        └── callRecords.ts                  # NEW — /api/calls/history (tutor, JWT) + student-scoped route

frontend/src/
├── entities/
│   └── callRecord/                         # NEW — domain model + history API client + history model
│       ├── api/callHistoryApi.ts           # axios GET; tutor vs student endpoint
│       ├── model/callHistory.model.ts      # $callHistory, CallHistoryGate, loadCallHistoryFx
│       ├── callRecord.types.ts             # re-use/align with features/videoCall types
│       └── index.ts
├── features/videoCall/                     # EXISTS (mockups) — REPLACE mocks, ADD client+model
│   ├── model/                              # NEW Effector calls domain
│   │   ├── call.model.ts                   # $callPhase,$callState,$incomingCall,$outgoingCallPeer,$selfMediaState,$peerMediaState,$callDurationSeconds; callStarted/accept/reject/cancel/hangup/toggle* events
│   │   ├── call.types.ts
│   │   ├── signaling.ts                    # send/receive signaling over the app WS (tutor & student)
│   │   ├── webrtc.ts                        # RTCPeerConnection lifecycle, getUserMedia/getDisplayMedia, ICE config (side-effects, NOT in stores)
│   │   ├── iceConfig.ts                     # build RTCConfiguration from env (STUN + TURN)
│   │   └── index.ts
│   ├── ui/**                                # EXISTS — replace TODO-marked mock props with useUnit(store)
│   ├── videoCall.types.ts                   # EXISTS — extend if needed (keep camelCase contract)
│   ├── videoCall.constants.ts               # EXISTS — remove MOCK_* (TODO markers)
│   ├── videoCall.helpers.ts                 # EXISTS — keep pure formatters; remove mock-state parsing
│   └── index.ts
├── pages/call/**                            # EXISTS — drive phase from $callPhase, not URL
├── pages/callHistory/**                     # EXISTS — replace MOCK_CALL_HISTORY with $callHistory + Gate
└── app/
    ├── model/web-socket.model.ts            # MODIFY — dispatch incoming call signaling (tutor pool)
    ├── model/student-web-socket.model.ts    # MODIFY — dispatch incoming call signaling (student pool; comment already anticipates `video_call_incoming`)
    └── components/AppRoutes/AppRoutes.tsx   # MODIFY — guard /call & /call/history for both pools; mount global incoming-call listener
```

**Structure Decision**: Web monorepo (Option 2). Backend follows layered MVC; signaling transport stays in `lib/websocket`, while pair-authorization/lifecycle/persistence live in `services/callSignaling` and the history read-path in `controllers/callRecords` + `routes/callRecords.ts`. Frontend follows FSD: ephemeral call orchestration + WebRTC client + controls live in `features/videoCall/model` (wiring the already-built `ui/**`), while the persisted call-history domain lives in `entities/callRecord`. The session-bound WS dispatchers in `app/model` gain call-signaling routing for **both** auth pools.

## Complexity Tracking

> No constitution violations — section intentionally empty.
