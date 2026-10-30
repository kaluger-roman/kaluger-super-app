# Contract delta: call signaling (038)

Base contract: `specs/030-webrtc-video-calls/contracts/signaling-ws.md`.
Only the changes are listed; everything else is unchanged.

## Client → Server

### `call_invite`

| Sender | Payload | Rule |
|---|---|---|
| tutor, from the student card | `{ inviteId, targetStudentId }` | unchanged (no lesson) |
| tutor, from the lesson dialog | `{ inviteId, targetStudentId, lessonId }` | lesson must exist, `lesson.tutorId === tutor` and `lesson.studentId === targetStudentId` |
| student, from the lesson dialog | `{ inviteId, lessonId }` | `lessonId` **required**; lesson must exist, `lesson.studentId === studentUser.studentId` and `lesson.tutorId === student.tutorId` |

Parsing (`lib/websocket/signaling.helpers.ts`): `lessonId` absent → no lesson;
present → must be a non-empty string of at most `LESSON_ID_MAX_LENGTH` (64)
characters, otherwise the whole message is dropped (same as a malformed
`targetStudentId`).

Validation order in `handleInvite`: rate limit → pair (`resolvePair`) →
student without `lessonId` → lesson (`resolveCallLesson`) → offline / busy →
ring. Lesson status and time are not checked. Archived students are no longer
rejected (FR-010): `"Звонки недоступны: ученик в архиве"` is removed.

Rejections (sent to the caller as `call_error { message, inviteId }`, no call
record is written):

| Case | `message` |
|---|---|
| student invite without `lessonId` | `Звонок возможен только по уроку` |
| lesson not found / of another pair / deleted | `Урок не найден` |

## Server → Client

### `call_incoming`

```json
{
  "type": "call_incoming",
  "callId": "…",
  "callerName": "Анна Кузнецова",
  "lesson": {
    "id": "clx…",
    "subject": "MATHEMATICS",
    "startTime": "2026-10-23T15:00:00.000Z",
    "endTime": "2026-10-23T16:00:00.000Z"
  },
  "iceServers": []
}
```

`lesson` is always present: the lesson summary for a lesson call, `null`
otherwise. Client parsing: a missing or malformed `lesson` is treated as
`null`; the call itself is still accepted.

## Call records

Every record written for a lesson call (`COMPLETED`, `MISSED` on timeout or
offline callee, `REJECTED`, `CANCELED`, `FAILED`, drop outcomes) carries the
lesson's `lessonId`. If the lesson was deleted during the call, the record is
written with `lessonId = null`. `call_history_updated` is sent to both parties
as before.
