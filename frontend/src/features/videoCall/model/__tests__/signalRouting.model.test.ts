import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { callHistoryModel, lessonCallsModel } from "@entities";
import { notificationsModel } from "@shared";

import { callModel } from "../index";
import type { CallSignalingInbound } from "../signaling.types";
import {
  clearCallTransport,
  resetCallTransportsForTests,
  setCallTransport,
} from "../transport.helpers";
import { setWebRtcAdapter } from "../webrtc.helpers";
import {
  installTransport,
  receive,
  resetCallFlow,
  ringCurrentInvite,
  settleMicrotasks,
  startCallerSession,
} from "./callFlow";
import { createFakeAdapter, createFakeStream } from "./fakeWebrtc";
import type { FakeAdapter } from "./fakeWebrtc";
import { collectEvents, readStore } from "./storeProbe";

describe("features/videoCall/model inbound signal routing", () => {
  let sent: CallSignalingInbound[];
  let adapter: FakeAdapter;

  beforeEach(() => {
    sent = installTransport();
    adapter = createFakeAdapter();
    setWebRtcAdapter(adapter);
  });

  afterEach(() => {
    resetCallFlow();
    vi.restoreAllMocks();
  });

  it("should cancel a call whose call_ringing arrives after the user already cancelled", async () => {
    callModel.callStarted({ studentId: "stu-1", peerName: "Иван", lesson: null });
    const inviteId = readStore(callModel.$inviteId) ?? "";
    callModel.cancelCall();
    sent.length = 0;

    receive({ type: "call_ringing", callId: "late-1", inviteId });
    await settleMicrotasks();

    expect(sent).toEqual([{ type: "call_cancel", callId: "late-1" }]);
    expect(readStore(callModel.$callPhase)).toBe("idle");
    expect(readStore(callModel.$callId)).toBeNull();
  });

  it("should cancel a late ringing of a cancelled invite while the next invite waits", () => {
    callModel.callStarted({ studentId: "stu-1", peerName: "Иван", lesson: null });
    const oldInviteId = readStore(callModel.$inviteId) ?? "";
    callModel.cancelCall();
    callModel.callStarted({ studentId: "stu-1", peerName: "Иван", lesson: null });
    sent.length = 0;

    receive({ type: "call_ringing", callId: "old-call", inviteId: oldInviteId });

    expect(sent).toEqual([{ type: "call_cancel", callId: "old-call" }]);
    expect(readStore(callModel.$callId)).toBeNull();
    expect(readStore(callModel.$callPhase)).toBe("outgoing");
  });

  it("should hang up a stale call_accepted instead of starting media", async () => {
    receive({ type: "call_accepted", callId: "stale-1", iceServers: [] });
    await settleMicrotasks();

    expect(sent).toEqual([{ type: "call_hangup", callId: "stale-1" }]);
    expect(adapter.getUserMedia).not.toHaveBeenCalled();
  });

  it("should not answer an offer while the incoming call is still ringing", async () => {
    receive({
      type: "call_incoming",
      callId: "in-1",
      callerName: "Анна",
      lesson: null,
      iceServers: [],
    });
    receive({ type: "webrtc_offer", callId: "in-1", sdp: { type: "offer", sdp: "x" } });
    await settleMicrotasks();

    expect(adapter.getUserMedia).not.toHaveBeenCalled();
    expect(sent.find((m) => m.type === "webrtc_answer")).toBeUndefined();
    expect(readStore(callModel.$callPhase)).toBe("incoming");
  });

  it("should reject a second incoming call while another call is in progress", async () => {
    await startCallerSession("own-1");
    sent.length = 0;

    receive({
      type: "call_incoming",
      callId: "in-2",
      callerName: "Анна",
      lesson: null,
      iceServers: [],
    });

    expect(sent).toEqual([{ type: "call_reject", callId: "in-2" }]);
    expect(readStore(callModel.$callId)).toBe("own-1");
  });

  it("should take the peer's call when both sides dial at once", () => {
    callModel.callStarted({ studentId: "stu-1", peerName: "Иван", lesson: null });
    const inviteId = readStore(callModel.$inviteId) ?? "";
    sent.length = 0;

    receive({
      type: "call_incoming",
      callId: "glare-1",
      callerName: "Иван",
      lesson: null,
      iceServers: [],
    });
    receive({ type: "call_busy", inviteId });

    expect(sent).toEqual([]);
    expect(readStore(callModel.$callPhase)).toBe("incoming");
    expect(readStore(callModel.$callId)).toBe("glare-1");
  });

  it("should end the outgoing call on call_busy for its own invite", () => {
    callModel.callStarted({ studentId: "stu-1", peerName: "Иван", lesson: null });

    receive({ type: "call_busy", inviteId: readStore(callModel.$inviteId) ?? "" });

    expect(readStore(callModel.$callPhase)).toBe("idle");
  });

  it("should ignore call_busy for an invite the caller no longer waits for", () => {
    callModel.callStarted({ studentId: "stu-1", peerName: "Иван", lesson: null });

    receive({ type: "call_busy", inviteId: "another-invite" });

    expect(readStore(callModel.$callPhase)).toBe("outgoing");
  });

  it("should ignore call_error addressed to another call", async () => {
    await startCallerSession("own-2");

    receive({ type: "call_error", message: "Звонок не найден", callId: "other" });

    expect(readStore(callModel.$callId)).toBe("own-2");
  });

  it("should end an outgoing call on call_error for its invite", () => {
    callModel.callStarted({ studentId: "stu-1", peerName: "Иван", lesson: null });

    receive({
      type: "call_error",
      message: "Сначала завершите текущий звонок",
      inviteId: readStore(callModel.$inviteId) ?? "",
    });

    expect(readStore(callModel.$callPhase)).toBe("idle");
  });

  it("should send call_hangup when local media cannot be acquired", async () => {
    setWebRtcAdapter(
      createFakeAdapter({
        getUserMedia: async () => {
          throw new DOMException("denied", "NotAllowedError");
        },
      })
    );

    await startCallerSession("media-1");

    expect(sent).toContainEqual({
      type: "call_hangup",
      callId: "media-1",
      reason: "media_unavailable",
    });
    expect(readStore(callModel.$callPhase)).toBe("idle");
  });

  it("should name the caller in the missed-call toast when ringing times out", () => {
    receive({
      type: "call_incoming",
      callId: "miss-1",
      callerName: "Анна",
      lesson: null,
      iceServers: [],
    });
    const infos = collectEvents(notificationsModel.showInfoEvent);

    receive({ type: "call_canceled", callId: "miss-1", reason: "timeout" });
    infos.unwatch();

    expect(infos.calls).toContain("Пропущенный вызов от Анна");
    expect(readStore(callModel.$callPhase)).toBe("idle");
  });

  it("should say the student is offline when calling a student who is not online", () => {
    callModel.callStarted({ studentId: "stu-1", peerName: "Иван", lesson: null });
    const errors = collectEvents(notificationsModel.showErrorEvent);

    receive({
      type: "call_unavailable",
      reason: "offline",
      inviteId: readStore(callModel.$inviteId) ?? "",
    });
    errors.unwatch();

    expect(errors.calls).toContain("Ученик сейчас не в сети");
  });

  it("should end a ringing call when the callee drops off", () => {
    callModel.callStarted({ studentId: "stu-1", peerName: "Иван", lesson: null });
    ringCurrentInvite("ring-drop");

    receive({ type: "call_unavailable", reason: "offline", callId: "ring-drop" });

    expect(readStore(callModel.$callPhase)).toBe("idle");
  });

  it("should tell the user the peer dropped off when the server ends the call for that reason", async () => {
    await startCallerSession("drop-1");
    const errors = collectEvents(notificationsModel.showErrorEvent);

    receive({ type: "call_ended", callId: "drop-1", reason: "peer_disconnected" });
    errors.unwatch();

    expect(errors.calls).toContain("Собеседник отключился");
    expect(readStore(callModel.$callPhase)).toBe("idle");
  });

  it("should fail the call and hang up when the answer cannot be applied", async () => {
    await startCallerSession("sdp-1");
    adapter.peerConnections[0].setRemoteDescription.mockRejectedValueOnce(
      new Error("InvalidSessionDescription")
    );
    sent.length = 0;

    receive({ type: "webrtc_answer", callId: "sdp-1", sdp: { type: "answer", sdp: "x" } });
    await settleMicrotasks();

    expect(sent).toContainEqual({ type: "call_hangup", callId: "sdp-1" });
    expect(readStore(callModel.$callPhase)).toBe("idle");
  });

  it("should keep a connected call and roll back when a mid-call answer cannot be applied", async () => {
    await startCallerSession("mid-1");
    receive({ type: "webrtc_answer", callId: "mid-1", sdp: { type: "answer", sdp: "a" } });
    callModel.callConnected();
    await settleMicrotasks();
    const pc = adapter.peerConnections[0];
    pc.signalingState = "have-local-offer";
    pc.setRemoteDescription.mockRejectedValueOnce(new Error("InvalidSessionDescription"));
    const errors = collectEvents(notificationsModel.showErrorEvent);

    receive({ type: "webrtc_answer", callId: "mid-1", sdp: { type: "answer", sdp: "b" } });
    await settleMicrotasks();
    errors.unwatch();

    expect(readStore(callModel.$callPhase)).toBe("active");
    expect(pc.setLocalDescription).toHaveBeenCalledWith({ type: "rollback" });
    expect(errors.calls).toContain(
      "Не удалось обновить видео собеседника. Если оно пропало, перезвоните"
    );
  });

  it("should drop a call signal of another call instead of routing it to the current one", async () => {
    await startCallerSession("own-3");

    receive({ type: "call_ended", callId: "someone-else", reason: "hangup" });

    expect(readStore(callModel.$callId)).toBe("own-3");
  });
});

describe("features/videoCall/model call transport", () => {
  afterEach(() => {
    resetCallFlow();
  });

  it("should fail the call with a toast when there is no transport for the invite", () => {
    resetCallTransportsForTests();
    const errors = collectEvents(notificationsModel.showErrorEvent);

    callModel.callStarted({ studentId: "stu-1", peerName: "Иван", lesson: null });
    errors.unwatch();

    expect(readStore(callModel.$callPhase)).toBe("idle");
    expect(errors.calls).toContain("Нет связи с сервером. Проверьте интернет и попробуйте снова");
  });

  it("should send a student invite through the student socket when both sockets are open", () => {
    const tutorSend = vi.fn();
    const studentSend = vi.fn();
    setCallTransport("tutor", tutorSend, "tutor-socket");
    setCallTransport("student", studentSend, "student-socket");

    expect(clearCallTransport({})).toBeNull();
    callModel.callStarted({
      peerName: "Анна",
      lesson: {
        id: "lesson-1",
        subject: "MATHEMATICS",
        startTime: "2026-10-23T15:00:00.000Z",
        endTime: "2026-10-23T16:00:00.000Z",
      },
    });

    expect(studentSend).toHaveBeenCalledWith({
      type: "call_invite",
      inviteId: expect.any(String),
      lessonId: "lesson-1",
    });
    expect(tutorSend).not.toHaveBeenCalled();
  });

  it("should end the active call when its socket disconnects", async () => {
    const socket = {};
    setCallTransport("tutor", vi.fn(), socket);
    setWebRtcAdapter(createFakeAdapter());
    await startCallerSession("ws-1");
    const errors = collectEvents(notificationsModel.showErrorEvent);

    const lostRole = clearCallTransport(socket);
    if (lostRole) callModel.transportDisconnected(lostRole);
    errors.unwatch();

    expect(readStore(callModel.$callPhase)).toBe("idle");
    expect(errors.calls).toContain("Связь с сервером потеряна, звонок завершён");
  });

  it("should keep the call when the other role's socket disconnects", async () => {
    const studentSocket = {};
    setCallTransport("tutor", vi.fn(), {});
    setCallTransport("student", vi.fn(), studentSocket);
    setWebRtcAdapter(createFakeAdapter());
    await startCallerSession("ws-2");

    const lostRole = clearCallTransport(studentSocket);
    if (lostRole) callModel.transportDisconnected(lostRole);
    await settleMicrotasks();

    expect(readStore(callModel.$callId)).toBe("ws-2");
  });

  it("should answer through the socket the incoming call arrived on", () => {
    const tutorSend = vi.fn();
    const studentSend = vi.fn();
    setCallTransport("tutor", tutorSend, {});
    setCallTransport("student", studentSend, {});

    receive(
      { type: "call_incoming", callId: "in-s", callerName: "Анна", lesson: null, iceServers: [] },
      "student"
    );
    callModel.acceptCall();

    expect(studentSend).toHaveBeenCalledWith({ type: "call_accept", callId: "in-s" });
    expect(tutorSend).not.toHaveBeenCalled();
  });

  it("should send the hangup through the call's socket while the call is being torn down", () => {
    const tutorSend = vi.fn();
    const studentSend = vi.fn();
    setCallTransport("tutor", tutorSend, {});
    setCallTransport("student", studentSend, {});
    receive(
      { type: "call_incoming", callId: "in-h", callerName: "Анна", lesson: null, iceServers: [] },
      "student"
    );
    callModel.acceptCall();

    callModel.hangUp();

    expect(studentSend).toHaveBeenCalledWith({ type: "call_hangup", callId: "in-h" });
    expect(tutorSend).not.toHaveBeenCalled();
  });

  it("should fail an invite instead of using the other role's socket", () => {
    const studentSend = vi.fn();
    resetCallTransportsForTests();
    setCallTransport("student", studentSend, {});
    const errors = collectEvents(notificationsModel.showErrorEvent);

    callModel.callStarted({ studentId: "stu-1", peerName: "Иван", lesson: null });
    errors.unwatch();

    expect(studentSend).not.toHaveBeenCalled();
    expect(errors.calls).toContain("Нет связи с сервером. Проверьте интернет и попробуйте снова");
  });

  it("should not let a late negotiation failure of an ended call end the next call", async () => {
    const sentNow = installTransport();
    const adapter = createFakeAdapter();
    setWebRtcAdapter(adapter);
    await startCallerSession("old-call");
    let rejectAnswer: (error: Error) => void = () => undefined;
    adapter.peerConnections[0].setRemoteDescription.mockImplementationOnce(
      () =>
        new Promise<void>((_, reject) => {
          rejectAnswer = reject;
        })
    );
    receive({ type: "webrtc_answer", callId: "old-call", sdp: { type: "answer", sdp: "x" } });
    callModel.hangUp();
    await startCallerSession("new-call");

    rejectAnswer(new Error("InvalidStateError"));
    await settleMicrotasks();

    expect(readStore(callModel.$callId)).toBe("new-call");
    expect(sentNow).not.toContainEqual(
      expect.objectContaining({ type: "call_hangup", callId: "new-call" })
    );
  });

  it("should not end the next call when media of an ended call is denied late", async () => {
    const sentNow = installTransport();
    let denyOldMedia: (error: Error) => void = () => undefined;
    let mediaDenied = false;
    let firstRequest = true;
    // The audio-only fallback of the old call must fail too, or its media effect never fails.
    setWebRtcAdapter(
      createFakeAdapter({
        getUserMedia: () => {
          if (firstRequest) {
            firstRequest = false;
            return new Promise((_, reject) => {
              denyOldMedia = reject;
            });
          }
          if (mediaDenied) return Promise.reject(new DOMException("denied", "NotAllowedError"));
          return Promise.resolve(createFakeStream());
        },
      })
    );
    callModel.callStarted({ studentId: "stu-1", peerName: "Иван", lesson: null });
    ringCurrentInvite("old-media");
    receive({ type: "call_accepted", callId: "old-media", iceServers: [] });
    callModel.hangUp();
    await startCallerSession("new-media");

    mediaDenied = true;
    denyOldMedia(new DOMException("denied", "NotAllowedError"));
    await settleMicrotasks();

    expect(readStore(callModel.$callId)).toBe("new-media");
    expect(sentNow).not.toContainEqual(
      expect.objectContaining({ type: "call_hangup", callId: "new-media" })
    );
  });

  it("should ask an open call history to refresh when the server says it changed", () => {
    const refreshes = collectEvents(callHistoryModel.refreshRequested);

    receive({ type: "call_history_updated" });
    refreshes.unwatch();

    expect(refreshes.calls).toHaveLength(1);
  });

  it("should ask the calls of an open lesson to refresh when the history changed", () => {
    const refreshes = collectEvents(lessonCallsModel.refreshRequested);

    receive({ type: "call_history_updated" });
    refreshes.unwatch();

    expect(refreshes.calls).toHaveLength(1);
  });

  it("should keep the lesson of an incoming call for the incoming screen", () => {
    const lesson = {
      id: "l-1",
      subject: "PHYSICS" as const,
      startTime: "2026-10-23T15:00:00.000Z",
      endTime: "2026-10-23T16:00:00.000Z",
    };

    receive({ type: "call_incoming", callId: "in-l", callerName: "Анна", lesson, iceServers: [] });

    expect(readStore(callModel.$incomingCall)).toEqual({
      callId: "in-l",
      callerName: "Анна",
      role: "tutor",
      lesson,
    });
  });
});
