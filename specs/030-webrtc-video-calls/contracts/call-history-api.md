# Contract: Call History REST API

Read-only endpoints that back the call-history UI (US4, FR-022/FR-023, SC-010). Write happens server-side during call lifecycle — there is **no** client-facing endpoint to create call records.

All responses in JSON. All user-facing error messages in Russian.

---

## GET `/api/calls/history` — tutor's call history

- **Auth**: tutor JWT Bearer (existing `auth` middleware).
- **Scope**: returns only records where `tutorId === req.userId`. Direction/peerName computed from the tutor's perspective.
- **Query params** (optional): `limit` (default 50, max 100). Returns the most recent ≤`limit` records.
- **200 Response**:

```json
{
  "items": [
    {
      "id": "clx...",
      "peerName": "Иван Смирнов",
      "direction": "outgoing",
      "startedAt": "2026-06-03T14:32:00.000Z",
      "durationSeconds": 1845,
      "status": "completed"
    }
  ]
}
```

- **401**: missing/invalid token.
- **Sort**: `startedAt` descending (US4-4).

---

## GET `/api/student/calls/history` — student's call history

- **Auth**: student JWT Bearer (existing `studentAuth` middleware, `/api/student/*` family).
- **Scope**: resolve `studentId` from `req.studentUserId` (`StudentUser.studentId`); return only records where `studentId` matches. Direction/peerName computed from the student's perspective (`peerName = tutor.name`).
- **Query params / Response / Sort**: identical shape to the tutor endpoint.
- **401**: missing/invalid student token.
- **Edge**: a `StudentUser` not yet linked to a `Student` (`studentId === null`) → `200` with `{ "items": [] }` (no records possible).

---

## Response item type (shared)

Matches `frontend/src/entities/callRecord/callRecord.types.ts → CallHistoryRecord`:

```ts
type CallHistoryItem = {
  id: string;
  peerName: string;
  direction: "outgoing" | "incoming";
  startedAt: string; // ISO 8601
  durationSeconds: number | null;
  status: "completed" | "missed" | "rejected" | "canceled" | "failed";
};

type CallHistoryResponse = {
  items: CallHistoryItem[];
};
```

## Authorization invariants (tested)

- A tutor MUST NOT see records of another tutor's calls (SC-010).
- A student MUST NOT see records of another student's calls (SC-010).
- Cross-pair access is impossible because each endpoint filters strictly by the authenticated principal's id; there is no `tutorId`/`studentId` request parameter to tamper with.
