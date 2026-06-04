# Contract: WebRTC Signaling over the existing WebSocket

Signaling rides the existing `WebSocketManager` on both pools: tutor `/ws` (keyed by `userId`) and student `/ws/student` (keyed by `studentUserId`). Messages are JSON with a `type` field. **Ephemeral** — never persisted. The server is the authorization boundary: every inbound message is validated against the caller's authorized tutor↔student pair before it is relayed; the recipient is **derived server-side**, never trusted from the client.

Existing `lesson_*` message types are unaffected; call signaling adds a disjoint set of `type`s.

---

## Client → Server (inbound; sent by tutor or student client)

| `type` | Payload | Meaning | Server action |
|--------|---------|---------|---------------|
| `call_invite` | `{ targetStudentId }` (tutor) **or** `{}` (student → their tutor) | Initiate a call to the linked peer | Verify pair (R4); reject if self/cross-pair → `call_error`. If callee offline → `call_unavailable`. If callee busy → `call_busy`. Else create `LiveCall(ringing)`, generate `callId`, start 40s ring timeout, forward `call_incoming` to callee. Echo `call_ringing` (+ ICE config) to caller. Dedup repeat invites from same caller→same peer (FR-018). |
| `call_accept` | `{ callId }` | Callee accepts | Validate caller is the callee of `callId`. Forward `call_accepted` (+ minted ICE config) to caller. Clear ring timeout. Move to negotiation. |
| `call_reject` | `{ callId }` | Callee declines | Forward `call_rejected` to caller; finalize `call_records` as `REJECTED`; drop `LiveCall`. |
| `call_cancel` | `{ callId }` | Caller cancels before answer | Forward `call_canceled` to callee (dismiss incoming UI); finalize `CANCELED`; drop `LiveCall`. |
| `call_hangup` | `{ callId }` | Either party ends an active call | Forward `call_ended` to the other party; finalize `COMPLETED` (if connected) or `FAILED`; drop `LiveCall`. |
| `webrtc_offer` | `{ callId, sdp }` | SDP offer | Relay verbatim to the peer (`webrtc_offer`). |
| `webrtc_answer` | `{ callId, sdp }` | SDP answer | Relay verbatim to the peer (`webrtc_answer`). |
| `webrtc_ice` | `{ callId, candidate }` | ICE candidate (trickle) | Relay verbatim to the peer (`webrtc_ice`). |
| `call_media_state` | `{ callId, micOn, cameraOn, screenSharing }` | Local media-state change | Relay to peer so it updates indicators (FR-010/011/012, SC-005). |
| `call_connected` | `{ callId }` | Media established locally | Mark `LiveCall.connectedAt` (first receipt) → enables duration calc. |

Validation: any inbound message referencing a `callId` the sender is not a participant of, or a target outside the sender's authorized pair, is dropped and answered with `call_error` (Russian message). Malformed JSON is ignored (matches existing manager behavior).

---

## Server → Client (outbound; delivered via `sendToUser` / `sendToStudent`)

| `type` | Payload | Delivered to | Triggers UI |
|--------|---------|--------------|-------------|
| `call_incoming` | `{ callId, callerName }` | callee | `IncomingCallModal` (`$incomingCall.callerName`) |
| `call_ringing` | `{ callId, iceServers }` | caller | `OutgoingCallOverlay` («Вызываем…») |
| `call_accepted` | `{ callId, iceServers }` | caller | Begin WebRTC negotiation (create offer) |
| `call_rejected` | `{ callId }` | caller | «Вызов отклонён» → idle |
| `call_canceled` | `{ callId }` | callee | Dismiss incoming modal → idle |
| `call_ended` | `{ callId }` | other party | Tear down, release media → idle |
| `call_unavailable` | `{ reason: "offline" }` | caller | «Ученик сейчас не в сети» (FR-013, Edge offline) |
| `call_busy` | `{}` | caller | «Абонент занят» (Edge "Занятость") |
| `call_no_answer` | `{ callId }` | caller | «Нет ответа» on 40s timeout (FR-009) |
| `call_error` | `{ message }` | sender | Russian error (self-call, cross-pair, unknown callId) |
| `webrtc_offer` / `webrtc_answer` / `webrtc_ice` | relayed verbatim | peer | Drives `RTCPeerConnection` |
| `call_media_state` | `{ callId, micOn, cameraOn, screenSharing }` | peer | Update `$peerMediaState` indicators |

### `iceServers` payload (R3)

Computed **server-side per call** so TURN secrets never reach the SPA:

```json
{
  "iceServers": [
    { "urls": "stun:stun.l.google.com:19302" },
    {
      "urls": "turn:turn.tutor.kaluger.ru:3478",
      "username": "1717999999",
      "credential": "base64-hmac-sha1(secret, username)"
    }
  ]
}
```

- STUN entry always present (default overridable via `STUN_URL`).
- TURN entry present only when `TURN_URL` + `TURN_SECRET` are configured; `username` is a Unix expiry timestamp (`now + TURN_CREDENTIAL_TTL`), `credential` is the time-limited HMAC (coturn REST-auth scheme).
- Frontend feeds this straight into `new RTCPeerConnection({ iceServers })`. `iceTransportPolicy` stays `"all"` → direct candidates tried first, `relay` only as fallback (FR-014, never forces relay → preserves SC-002).

---

## Lifecycle sequence (happy path, tutor → student)

```
tutor                         server                          student
 | call_invite{targetStudentId} ->                              |
 |                              | (verify pair, online, free)   |
 |                              | -- call_incoming{callId,name} ->
 | <- call_ringing{callId,ice}  |                               |
 |                              | <- call_accept{callId}        |
 | <- call_accepted{callId,ice} |                               |
 | (create RTCPeerConnection, getUserMedia)                      |
 | webrtc_offer{sdp} ->         | -- webrtc_offer ->            |
 |                              | <- webrtc_answer{sdp}         |
 | <- webrtc_answer             |                               |
 | webrtc_ice ... <->           | relay <->                     | webrtc_ice ...
 | === direct P2P media flows (or TURN relay if P2P fails) ===   |
 | call_connected ->            | (mark connectedAt)            | <- call_connected
 | call_hangup{callId} ->       | -- call_ended ->              |
 |                              | (finalize call_records=COMPLETED)
```

## Server-side gaps to close (implementation notes)

- `WebSocketManager.handleStudentConnection` currently sets `ws.on("message", () => {})` — must route student inbound messages to the signaling handler (students send accept/reject/cancel/offer/answer/ice, and may initiate per the allowed extension).
- `messageHandler.ts` (tutor pool) currently only echoes — extend to route call signaling `type`s while leaving non-call messages alone.
- Add `sendToUser`/`sendToStudent`-based helpers on the manager (or call them directly from `services/callSignaling`) to forward outbound messages to the resolved peer pool.
