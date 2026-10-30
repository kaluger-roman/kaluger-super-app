import { describe, expect, it } from "vitest";

import {
  isCallAddress,
  isPickerDismissed,
  toCallerRole,
  toOutgoingPeer,
  toCanceledText,
  toInviteMessage,
  toPeerEndedText,
  toUnavailableText,
} from "../call.helpers";

const LESSON = {
  id: "lesson-1",
  subject: "PHYSICS" as const,
  startTime: "2026-10-23T15:00:00.000Z",
  endTime: "2026-10-23T16:00:00.000Z",
};

describe("features/videoCall/model/call.helpers toInviteMessage", () => {
  it("should address a tutor call from the student card to the student only", () => {
    expect(toInviteMessage({ studentId: "s-1", peerName: "Иван", lesson: null }, "i-1")).toEqual({
      type: "call_invite",
      inviteId: "i-1",
      targetStudentId: "s-1",
    });
  });

  it("should add the lesson to a tutor call from the lesson", () => {
    expect(toInviteMessage({ studentId: "s-1", peerName: "Иван", lesson: LESSON }, "i-1")).toEqual({
      type: "call_invite",
      inviteId: "i-1",
      targetStudentId: "s-1",
      lessonId: "lesson-1",
    });
  });

  it("should send only the lesson for a student call", () => {
    expect(toInviteMessage({ peerName: "Анна", lesson: LESSON }, "i-1")).toEqual({
      type: "call_invite",
      inviteId: "i-1",
      lessonId: "lesson-1",
    });
  });
});

describe("features/videoCall/model/call.helpers isPickerDismissed", () => {
  it("should treat a cancelled screen picker as dismissed", () => {
    expect(isPickerDismissed(new DOMException("denied", "NotAllowedError"))).toBe(true);
    expect(isPickerDismissed(new DOMException("aborted", "AbortError"))).toBe(true);
  });

  it("should not treat other failures as dismissed", () => {
    expect(isPickerDismissed(new Error("renegotiation failed"))).toBe(false);
    expect(isPickerDismissed(new DOMException("busy", "NotReadableError"))).toBe(false);
    expect(isPickerDismissed(null)).toBe(false);
    expect(isPickerDismissed("NotAllowedError")).toBe(false);
  });
});

describe("features/videoCall/model/call.helpers toast texts", () => {
  it("should name the offline peer by role", () => {
    expect(toUnavailableText("student")).toBe("Ученик сейчас не в сети");
    expect(toUnavailableText("tutor")).toBe("Преподаватель сейчас не в сети");
    expect(toUnavailableText(null)).toBe("Собеседник сейчас не в сети");
  });

  it("should tell a timeout apart from a cancel", () => {
    expect(toCanceledText({ reason: "canceled", callerName: "Анна" })).toBe("Вызов отменён");
    expect(toCanceledText({ reason: "timeout", callerName: "Анна" })).toBe(
      "Пропущенный вызов от Анна"
    );
    expect(toCanceledText({ reason: "timeout", callerName: "" })).toBe("Пропущенный вызов");
  });

  it("should explain why the peer ended the call", () => {
    expect(toPeerEndedText("hangup")).toBe("Собеседник завершил звонок");
    expect(toPeerEndedText("peer_disconnected")).toBe("Собеседник отключился");
    expect(toPeerEndedText("media_unavailable")).toBe(
      "У собеседника нет доступа к камере и микрофону"
    );
  });
});

describe("features/videoCall/model/call.helpers call roles", () => {
  it("should let a tutor call a student and a student call the tutor", () => {
    expect(toCallerRole({ studentId: "s-1", peerName: "Иван", lesson: null })).toBe("tutor");
    expect(toOutgoingPeer({ studentId: "s-1", peerName: "Иван", lesson: null })).toEqual({
      name: "Иван",
      role: "student",
    });
    expect(
      toCallerRole({
        peerName: "Анна",
        lesson: {
          id: "lesson-1",
          subject: "MATHEMATICS",
          startTime: "2026-10-23T15:00:00.000Z",
          endTime: "2026-10-23T16:00:00.000Z",
        },
      })
    ).toBe("student");
    expect(
      toOutgoingPeer({
        peerName: "Анна",
        lesson: {
          id: "lesson-1",
          subject: "MATHEMATICS",
          startTime: "2026-10-23T15:00:00.000Z",
          endTime: "2026-10-23T16:00:00.000Z",
        },
      })
    ).toEqual({ name: "Анна", role: "tutor" });
  });

  it("should recognise a complete call address", () => {
    expect(isCallAddress({ callId: "c-1", role: "tutor" })).toBe(true);
    expect(isCallAddress(null)).toBe(false);
  });
});
