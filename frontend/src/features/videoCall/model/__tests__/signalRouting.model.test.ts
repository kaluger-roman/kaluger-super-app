import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { callHistoryModel } from "@entities";
import { notificationsModel } from "@shared";

import {
  callModel,
  clearCallTransport,
  dispatchCallSignal,
  setCallTransport,
  setWebRtcAdapter,
  stopAllSessions,
} from "../index";
import { settleMicrotasks, startCallerSession } from "./callFlow";
import { createFakeAdapter, createFakePeerConnection, createFakeStream } from "./fakeWebrtc";
import { collectEvents, readStore } from "./storeProbe";

describe("features/videoCall/model inbound signal routing", () => {
  let sent: Array<{ type: string; [key: string]: unknown }>;
  let adapter: ReturnType<typeof createFakeAdapter>;

  beforeEach(() => {
    sent = [];
    setCallTransport((message) => sent.push(message));
    adapter = createFakeAdapter();
    setWebRtcAdapter(adapter);
  });

  afterEach(() => {
    callModel.hangUp();
    stopAllSessions();
    setCallTransport(null);
    vi.restoreAllMocks();
  });

  it("should cancel a call whose call_ringing arrives after the user already cancelled", async () => {
    callModel.callStarted({ studentId: "stu-1", peerName: "Иван" });
    callModel.cancelCall();
    sent = [];

    dispatchCallSignal({ type: "call_ringing", callId: "late-1", iceServers: [] });
    await settleMicrotasks();

    expect(sent).toEqual([{ type: "call_cancel", callId: "late-1" }]);
    expect(readStore(callModel.$callPhase)).toBe("idle");
    expect(readStore(callModel.$callId)).toBeNull();
  });

  it("should hang up a stale call_accepted instead of starting media", async () => {
    dispatchCallSignal({ type: "call_accepted", callId: "stale-1", iceServers: [] });
    await settleMicrotasks();

    expect(sent).toEqual([{ type: "call_hangup", callId: "stale-1" }]);
    expect(adapter.getUserMedia).not.toHaveBeenCalled();
  });

  it("should not answer an offer while the incoming call is still ringing", async () => {
    dispatchCallSignal({
      type: "call_incoming",
      callId: "in-1",
      callerName: "Анна",
      iceServers: [],
    });
    dispatchCallSignal({ type: "webrtc_offer", callId: "in-1", sdp: { type: "offer", sdp: "x" } });
    await settleMicrotasks();

    expect(adapter.getUserMedia).not.toHaveBeenCalled();
    expect(sent.find((m) => m.type === "webrtc_answer")).toBeUndefined();
    expect(readStore(callModel.$callPhase)).toBe("incoming");
  });

  it("should reject a second incoming call while another call is in progress", async () => {
    await startCallerSession("own-1");
    sent = [];

    dispatchCallSignal({
      type: "call_incoming",
      callId: "in-2",
      callerName: "Анна",
      iceServers: [],
    });

    expect(sent).toEqual([{ type: "call_reject", callId: "in-2" }]);
    expect(readStore(callModel.$callId)).toBe("own-1");
  });

  it("should take the peer's call when both sides dial at once", () => {
    callModel.callStarted({ studentId: "stu-1", peerName: "Иван" });
    sent = [];

    dispatchCallSignal({
      type: "call_incoming",
      callId: "glare-1",
      callerName: "Иван",
      iceServers: [],
    });
    dispatchCallSignal({ type: "call_busy" });

    expect(sent).toEqual([]);
    expect(readStore(callModel.$callPhase)).toBe("incoming");
    expect(readStore(callModel.$callId)).toBe("glare-1");
  });

  it("should ignore call_busy unless an outgoing call is waiting for an answer", () => {
    dispatchCallSignal({
      type: "call_incoming",
      callId: "in-3",
      callerName: "Анна",
      iceServers: [],
    });

    dispatchCallSignal({ type: "call_busy" });

    expect(readStore(callModel.$callPhase)).toBe("incoming");
  });

  it("should ignore call_error addressed to another call", async () => {
    await startCallerSession("own-2");

    dispatchCallSignal({ type: "call_error", message: "Звонок не найден", callId: "other" });

    expect(readStore(callModel.$callId)).toBe("own-2");
  });

  it("should end an outgoing call on call_error without callId", () => {
    callModel.callStarted({ studentId: "stu-1", peerName: "Иван" });

    dispatchCallSignal({ type: "call_error", message: "Сначала завершите текущий звонок" });

    expect(readStore(callModel.$callPhase)).toBe("idle");
  });

  it("should send call_hangup when local media cannot be acquired", async () => {
    setWebRtcAdapter(
      createFakeAdapter({
        getUserMedia: vi.fn(async () => {
          throw new Error("NotAllowedError");
        }),
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
    dispatchCallSignal({
      type: "call_incoming",
      callId: "miss-1",
      callerName: "Анна",
      iceServers: [],
    });
    const infos = collectEvents(notificationsModel.showInfoEvent);

    dispatchCallSignal({ type: "call_canceled", callId: "miss-1", reason: "timeout" });
    infos.unwatch();

    expect(infos.calls).toContain("Пропущенный вызов от Анна");
    expect(readStore(callModel.$callPhase)).toBe("idle");
  });

  it("should say the student is offline when calling a student who is not online", () => {
    callModel.callStarted({ studentId: "stu-1", peerName: "Иван" });
    const errors = collectEvents(notificationsModel.showErrorEvent);

    dispatchCallSignal({ type: "call_unavailable", reason: "offline" });
    errors.unwatch();

    expect(errors.calls).toContain("Ученик сейчас не в сети");
  });

  it("should tell the user the peer dropped off when the server ends the call for that reason", async () => {
    await startCallerSession("drop-1");
    const errors = collectEvents(notificationsModel.showErrorEvent);

    dispatchCallSignal({ type: "call_ended", callId: "drop-1", reason: "peer_disconnected" });
    errors.unwatch();

    expect(errors.calls).toContain("Собеседник отключился");
    expect(readStore(callModel.$callPhase)).toBe("idle");
  });

  it("should fail the call and hang up when the answer cannot be applied", async () => {
    await startCallerSession("sdp-1");
    const pc = adapter.createPeerConnection as ReturnType<typeof vi.fn>;
    const created = pc.mock.results[0].value as RTCPeerConnection;
    (created.setRemoteDescription as unknown as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
      new Error("InvalidSessionDescription")
    );
    sent = [];

    dispatchCallSignal({
      type: "webrtc_answer",
      callId: "sdp-1",
      sdp: { type: "answer", sdp: "x" },
    });
    await settleMicrotasks();

    expect(sent).toContainEqual({ type: "call_hangup", callId: "sdp-1" });
    expect(readStore(callModel.$callPhase)).toBe("idle");
  });
});

describe("features/videoCall/model call transport", () => {
  afterEach(() => {
    callModel.hangUp();
    stopAllSessions();
    setCallTransport(null);
  });

  it("should fail the call with a toast when there is no transport for the invite", () => {
    setCallTransport(null);
    const errors = collectEvents(notificationsModel.showErrorEvent);

    callModel.callStarted({ studentId: "stu-1", peerName: "Иван" });
    errors.unwatch();

    expect(readStore(callModel.$callPhase)).toBe("idle");
    expect(errors.calls).toContain("Нет связи с сервером. Проверьте интернет и попробуйте снова");
  });

  it("should send a student invite through the student socket when both sockets are open", () => {
    const tutorSocket = {};
    const studentSocket = {};
    const send = vi.fn();
    const tutorSend = vi.fn();
    setCallTransport(tutorSend, tutorSocket, "tutor");
    setCallTransport(send, studentSocket, "student");

    expect(clearCallTransport({})).toBeNull();
    callModel.callStarted({ peerName: "Анна" });

    expect(send).toHaveBeenCalledWith({ type: "call_invite" });
    expect(tutorSend).not.toHaveBeenCalled();
  });

  it("should end the active call when its socket disconnects", async () => {
    const socket = {};
    const sent: unknown[] = [];
    setCallTransport((message) => sent.push(message), socket);
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
    const tutorSocket = {};
    const studentSocket = {};
    setCallTransport(vi.fn(), tutorSocket, "tutor");
    setCallTransport(vi.fn(), studentSocket, "student");
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
    setCallTransport(tutorSend, {}, "tutor");
    setCallTransport(studentSend, {}, "student");

    dispatchCallSignal(
      { type: "call_incoming", callId: "in-s", callerName: "Анна", iceServers: [] },
      "student"
    );
    callModel.acceptCall();

    expect(studentSend).toHaveBeenCalledWith({ type: "call_accept", callId: "in-s" });
    expect(tutorSend).not.toHaveBeenCalled();
  });

  it("should fail an invite instead of using the other role's socket", () => {
    const studentSend = vi.fn();
    setCallTransport(null);
    setCallTransport(studentSend, {}, "student");
    const errors = collectEvents(notificationsModel.showErrorEvent);

    callModel.callStarted({ studentId: "stu-1", peerName: "Иван" });
    errors.unwatch();

    expect(studentSend).not.toHaveBeenCalled();
    expect(errors.calls).toContain("Нет связи с сервером. Проверьте интернет и попробуйте снова");
  });

  it("should not let a late negotiation failure of an ended call end the next call", async () => {
    const sentNow: unknown[] = [];
    setCallTransport((message) => sentNow.push(message));
    const pcs: RTCPeerConnection[] = [];
    setWebRtcAdapter(
      createFakeAdapter({
        createPeerConnection: vi.fn(() => {
          const pc = createFakePeerConnection();
          pcs.push(pc);
          return pc;
        }),
      })
    );
    await startCallerSession("old-call");
    let rejectAnswer: (error: Error) => void = () => undefined;
    (pcs[0].setRemoteDescription as unknown as ReturnType<typeof vi.fn>).mockImplementationOnce(
      () =>
        new Promise<void>((_, reject) => {
          rejectAnswer = reject;
        })
    );
    dispatchCallSignal({
      type: "webrtc_answer",
      callId: "old-call",
      sdp: { type: "answer", sdp: "x" },
    });
    callModel.hangUp();
    await startCallerSession("new-call");

    rejectAnswer(new Error("InvalidStateError"));
    await settleMicrotasks();

    expect(readStore(callModel.$callId)).toBe("new-call");
    expect(sentNow).not.toContainEqual({ type: "call_hangup", callId: "new-call" });
  });

  it("should not end the next call when media of an ended call is denied late", async () => {
    const sentNow: unknown[] = [];
    setCallTransport((message) => sentNow.push(message));
    let denyOldMedia: (error: Error) => void = () => undefined;
    const getUserMedia = vi
      .fn()
      .mockImplementationOnce(
        () =>
          new Promise<MediaStream>((_, reject) => {
            denyOldMedia = reject;
          })
      )
      .mockImplementation(async () => createFakeStream());
    setWebRtcAdapter(createFakeAdapter({ getUserMedia }));
    callModel.callStarted({ studentId: "stu-1", peerName: "Иван" });
    dispatchCallSignal({ type: "call_ringing", callId: "old-media", iceServers: [] });
    dispatchCallSignal({ type: "call_accepted", callId: "old-media", iceServers: [] });
    callModel.hangUp();
    await startCallerSession("new-media");

    denyOldMedia(new Error("NotAllowedError"));
    await settleMicrotasks();

    expect(readStore(callModel.$callId)).toBe("new-media");
    expect(sentNow).not.toContainEqual({ type: "call_hangup", callId: "new-media" });
  });

  it("should ask an open call history to refresh when the server says it changed", () => {
    const refreshes = collectEvents(callHistoryModel.refreshRequested);

    dispatchCallSignal({ type: "call_history_updated" });
    refreshes.unwatch();

    expect(refreshes.calls).toHaveLength(1);
  });
});
