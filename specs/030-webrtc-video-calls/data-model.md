# Phase 1 Data Model: WebRTC Video Calls

## Persistent entity: `CallRecord` (table `call_records`)

The only new persisted entity. One row per call attempt, keyed to the tutor↔student pair. Created on every terminal call transition. Signaling messages and live call state are **not** persisted.

### Prisma model (to add to `backend/prisma/schema.prisma`)

```prisma
enum CallStatus {
  COMPLETED   // звонок состоялся и завершён
  MISSED      // не ответили (таймаут) / адресат был не в сети
  REJECTED    // адресат отклонил
  CANCELED    // звонящий отменил до ответа
  FAILED      // не удалось установить соединение (даже через TURN)
}

enum CallerKind {
  TUTOR
  STUDENT
}

model CallRecord {
  id              String     @id @default(cuid())
  callerKind      CallerKind                       // кто инициировал (для расчёта направления у каждой стороны)
  status          CallStatus
  startedAt       DateTime   @default(now())        // момент инициации звонка
  endedAt         DateTime?                         // null, если соединение не состоялось
  durationSeconds Int?                              // null, если не было активной фазы

  tutorId   String
  tutor     User    @relation(fields: [tutorId], references: [id], onDelete: Cascade)

  studentId String
  student   Student @relation(fields: [studentId], references: [id], onDelete: Cascade)

  createdAt DateTime @default(now())

  @@index([tutorId, startedAt])
  @@index([studentId, startedAt])
  @@map("call_records")
}
```

### Required back-relations (add to existing models)

```prisma
model User {
  // ...existing fields...
  callRecords CallRecord[]
}

model Student {
  // ...existing fields...
  callRecords CallRecord[]
}
```

### Field semantics

| Field | Type | Notes |
|-------|------|-------|
| `id` | cuid | PK |
| `callerKind` | `TUTOR \| STUDENT` | Identifies the initiator. Direction is derived **per viewer**: caller sees `outgoing`, callee sees `incoming`. |
| `status` | enum | Maps 1:1 to spec vocabulary (completed/missed/rejected/canceled/failed). |
| `startedAt` | DateTime | When the call was initiated (ringing start). Used for reverse-chronological sort (US4-4). |
| `endedAt` | DateTime? | When the call ended. `null` for calls that never connected (missed/rejected/canceled/failed before media). |
| `durationSeconds` | Int? | Talk duration in seconds; `null` when there was no active phase (FR-021, US4-2 "без длительности"). |
| `tutorId` / `studentId` | FK | The authorized pair. Drives history visibility (FR-023, SC-010). `onDelete: Cascade` keeps records consistent if a tutor/student is removed. |

### Validation & invariants

- A record is written **only** for an authorized tutor↔student pair (enforced upstream in `services/callSignaling`).
- `status = COMPLETED` ⇒ `endedAt` and `durationSeconds` are set.
- `status ∈ {MISSED, REJECTED, CANCELED, FAILED}` ⇒ `durationSeconds = null` (and usually `endedAt = null`).
- `durationSeconds`, when present, = `floor((endedAt - connectedAt)/1000)` (connectedAt is transient, not stored).

### State → status mapping (write rules)

| Terminal transition | `status` | `endedAt` | `durationSeconds` |
|---------------------|----------|-----------|-------------------|
| Both hang up after media established | `COMPLETED` | set | set |
| Callee didn't answer in 40s / was offline | `MISSED` | null | null |
| Callee pressed «Отклонить» | `REJECTED` | null | null |
| Caller pressed «Отменить» before answer | `CANCELED` | null | null |
| ICE failed (no P2P, no TURN) | `FAILED` | null | null |
| Mid-call disconnect after media | `COMPLETED` | set | set |

---

## Read projection: call-history item (API response shape)

Computed per requesting viewer — **not** stored. Matches the existing frontend type `frontend/src/features/videoCall/videoCall.types.ts` → `CallHistoryRecord` (camelCase) so the approved mockups bind without changes.

```ts
type CallHistoryItem = {
  id: string;
  peerName: string;        // the OTHER party's name (tutor sees student.name, student sees tutor name)
  direction: "outgoing" | "incoming"; // derived from callerKind vs. viewer
  startedAt: string;       // ISO 8601
  durationSeconds: number | null;
  status: "completed" | "missed" | "rejected" | "canceled" | "failed"; // lowercased enum
};
```

Derivation rules per viewer:
- **Tutor viewer**: `direction = callerKind === TUTOR ? "outgoing" : "incoming"`; `peerName = student.name`.
- **Student viewer**: `direction = callerKind === STUDENT ? "outgoing" : "incoming"`; `peerName = tutor.name`.
- `status` is the lowercased enum value.

---

## Transient (non-persisted) domain concepts

These exist only at runtime; documented for clarity, no DB tables.

### Call Session (server-side, in-memory)

Tracks the live call between two pool members.

```ts
type LiveCall = {
  callId: string;             // server-generated
  callerKind: "tutor" | "student";
  tutorUserId: string;        // resolved authorized pair
  studentUserId: string;
  studentId: string;          // for the call_records FK
  status: "ringing" | "connected";
  startedAt: Date;
  connectedAt?: Date;         // set when media established → used to compute duration
  ringTimeout?: NodeJS.Timeout;
};
```
- Lives in a `Map<callId, LiveCall>` inside `services/callSignaling`. Also indexable by participant id to enforce "busy" and "one active call" (FR-018, Edge "Занятость").
- Removed on any terminal transition (after the `call_records` row is finalized).

### Signaling Message (ephemeral, over WS)

Discriminated union exchanged for setup/teardown — see `contracts/signaling-ws.md`. Never persisted (Assumption "эфемерность сигнальных данных").

### Frontend live call state (Effector stores, serializable only)

```ts
type CallPhase = "idle" | "outgoing" | "incoming" | "active";
type CallMediaState = { micOn: boolean; cameraOn: boolean; screenSharing: boolean };
type IncomingCall = { callId: string; callerName: string };
type CallPeer = { id: string; name: string; role: "tutor" | "student" };
```
- `$callPhase`, `$callState`, `$incomingCall`, `$outgoingCallPeer: CallPeer | null`, `$selfMediaState: CallMediaState`, `$peerMediaState: CallMediaState`, `$callDurationSeconds: number`.
- **Non-serializable objects (`RTCPeerConnection`, `MediaStream`) are NOT stored in Effector** — held in a side-effect registry keyed by `callId` (see research R7).
