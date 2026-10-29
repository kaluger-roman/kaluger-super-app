# Contract delta: call records REST API (038)

Base contract: `specs/030-webrtc-video-calls/contracts/call-history-api.md`.

## Shared item type

```ts
type CallLessonSummary = {
  id: string;
  subject: "MATHEMATICS" | "PHYSICS";
  startTime: string; // ISO 8601
  endTime: string;   // ISO 8601
};

type CallHistoryItem = {
  id: string;
  peerName: string;
  direction: "outgoing" | "incoming";
  startedAt: string;
  durationSeconds: number | null;
  status: "COMPLETED" | "MISSED" | "REJECTED" | "CANCELED" | "FAILED";
  lesson: CallLessonSummary | null; // NEW: null for calls without a lesson or with a deleted lesson
};
```

## GET `/api/calls/history`, GET `/api/student/calls/history`

Unchanged except that every item has `lesson` (FR-013).

## GET `/api/calls/lessons/:lessonId` (NEW) — calls of one lesson

- **Auth**: tutor JWT (`authenticateToken`). A student token gets `401`
  (separate auth subsystems, cross-role test).
- **Scope**: records with `tutorId === req.user.userId` and
  `lessonId === :lessonId`, from both callers (tutor and student).
- **Sort**: `startedAt` desc, then `id` desc; at most `MAX_HISTORY_LIMIT` (100).
- **200**:

```json
{
  "items": [
    {
      "id": "clx…",
      "peerName": "Иван Петров",
      "direction": "outgoing",
      "startedAt": "2026-10-22T15:01:00.000Z",
      "durationSeconds": 3524,
      "status": "COMPLETED",
      "lesson": { "id": "clx…", "subject": "MATHEMATICS", "startTime": "…", "endTime": "…" }
    }
  ]
}
```

- Unknown lesson, a lesson of another tutor, a lesson without calls →
  `200 { "items": [] }` (no existence leak; the dialog hides the block).
- **401**: missing/invalid tutor token.
- **500**: `{ "error": "Внутренняя ошибка сервера" }`.

## Lessons API (tutor)

`GET /api/lessons`, `GET /api/lessons/:id`, `POST /api/lessons`,
`PUT /api/lessons/:id`: `lesson.student` (when not null) additionally carries

```json
"studentUser": { "id": "clx…" }   // or null when the student has no cabinet
```

— the same field `GET /api/students` already returns. The tutor lesson
dialog shows «Позвонить» when `lesson.student?.studentUser` is set.

## Test support (`/api/__test__`, e2e only)

`POST /api/__test__/call-records` accepts an optional `lessonId`.
