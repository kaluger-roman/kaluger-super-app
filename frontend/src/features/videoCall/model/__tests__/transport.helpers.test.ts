import { afterEach, describe, expect, it, vi } from "vitest";

import { NO_TRANSPORT_TEXT } from "../call.constants";
import {
  clearCallTransport,
  hasCallTransport,
  resetCallTransportsForTests,
  sendOverTransport,
  sendToRoles,
  setCallTransport,
  toPresenceMessage,
  toResumeMessage,
  toSyncMessage,
} from "../transport.helpers";

afterEach(() => {
  resetCallTransportsForTests();
});

describe("features/videoCall/model transport helpers", () => {
  it("should build a presence_update without a callId", () => {
    expect(toPresenceMessage("background", true, false)).toEqual({
      type: "presence_update",
      presence: "background",
      audioSuspended: true,
      videoSuspended: false,
    });
  });

  it("should build a call_resume for the call", () => {
    expect(toResumeMessage("c-1", true)).toEqual({
      type: "call_resume",
      callId: "c-1",
      sessionRestart: true,
    });
  });

  it("should build a call_sync that carries nothing", () => {
    expect(toSyncMessage()).toEqual({ type: "call_sync" });
  });

  it("should send to the roles that have a working socket and name them", () => {
    const tutorSend = vi.fn();
    setCallTransport("tutor", tutorSend, "tutor-socket");
    setCallTransport(
      "student",
      () => {
        throw new Error("closed");
      },
      "student-socket"
    );

    expect(sendToRoles(["tutor", "student"], toSyncMessage())).toEqual(["tutor"]);
    expect(tutorSend).toHaveBeenCalledWith({ type: "call_sync" });
    resetCallTransportsForTests();
    expect(sendToRoles(["tutor"], toSyncMessage())).toEqual([]);
  });

  it("should send a message over the socket of its role only", () => {
    const tutorSend = vi.fn();
    const studentSend = vi.fn();
    setCallTransport("tutor", tutorSend, "tutor-socket");
    setCallTransport("student", studentSend, "student-socket");

    sendOverTransport("student", toPresenceMessage("on_screen", false, false));

    expect(studentSend).toHaveBeenCalledWith(toPresenceMessage("on_screen", false, false));
    expect(tutorSend).not.toHaveBeenCalled();
  });

  it("should know whether a role has a socket", () => {
    expect(hasCallTransport("tutor")).toBe(false);
    setCallTransport("tutor", vi.fn(), "tutor-socket");
    expect(hasCallTransport("tutor")).toBe(true);
    expect(hasCallTransport("student")).toBe(false);

    expect(clearCallTransport("tutor-socket")).toBe("tutor");
    expect(hasCallTransport("tutor")).toBe(false);
  });

  it("should throw when the role has no socket", () => {
    expect(() => sendOverTransport("tutor", toResumeMessage("c-1", false))).toThrow(
      NO_TRANSPORT_TEXT
    );
  });
});
