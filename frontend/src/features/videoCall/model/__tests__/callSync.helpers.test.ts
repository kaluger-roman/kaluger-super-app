import { describe, expect, it } from "vitest";

import { toNotificationOutcome, withoutRole, withRoles } from "../callSync.helpers";
import type { CallSnapshot } from "../signaling.types";

const RINGING: CallSnapshot = {
  callId: "c-7",
  status: "ringing",
  direction: "incoming",
  peerName: "Анна Петрова",
  lesson: null,
  iceServers: [],
  peerPresence: { presence: "on_screen", audioSuspended: false, videoSuspended: false },
  connectedAt: null,
};

describe("features/videoCall/model/callSync.helpers pending roles", () => {
  it("should add the roles asked about once each", () => {
    expect(withRoles(["tutor"], ["tutor", "student"])).toEqual(["tutor", "student"]);
    expect(withRoles([], [])).toEqual([]);
  });

  it("should drop the role that answered and keep the rest", () => {
    expect(withoutRole(["tutor", "student"], "tutor")).toEqual(["student"]);
    expect(withoutRole(["student"], "tutor")).toEqual(["student"]);
  });
});

describe("features/videoCall/model/callSync.helpers tapped notification", () => {
  it("should settle the notification by a snapshot of its call, whoever else still owes one", () => {
    expect(
      toNotificationOutcome(
        { pending: "c-7", asked: ["tutor", "student"] },
        { role: "student", call: RINGING }
      )
    ).toBe("matched");
  });

  it("should wait for the other role asked before saying the call is over", () => {
    const answer = { role: "tutor" as const, call: null };

    expect(toNotificationOutcome({ pending: "c-7", asked: ["tutor", "student"] }, answer)).toBe(
      null
    );
    expect(toNotificationOutcome({ pending: "c-7", asked: ["student"] }, answer)).toBe(null);
    expect(toNotificationOutcome({ pending: "c-7", asked: ["tutor"] }, answer)).toBe("stale");
    expect(toNotificationOutcome({ pending: "c-7", asked: [] }, answer)).toBe("stale");
  });

  it("should take a snapshot of another call for no call", () => {
    expect(
      toNotificationOutcome(
        { pending: "c-7", asked: ["student"] },
        { role: "student", call: { ...RINGING, callId: "c-8" } }
      )
    ).toBe("stale");
  });

  it("should settle nothing while no notification waits", () => {
    expect(
      toNotificationOutcome({ pending: null, asked: [] }, { role: "student", call: RINGING })
    ).toBe(null);
  });
});
