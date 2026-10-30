import { describe, expect, it } from "vitest";

import type { CallPhase } from "../call.types";
import {
  secondsSince,
  toRestoredIncoming,
  toRestoredMedia,
  toRestoredOutgoingPeer,
  toRestoredPhase,
} from "../callRestore.helpers";
import { LOCAL_GRACE_TIMEOUT_MS, RINGING_GRACE_TIMEOUT_MS } from "../callResume.constants";
import {
  decideOnSnapshot,
  isEndedCallRefusal,
  isEndedWithoutPage,
  isMediaPhase,
  isMediaResume,
  toEndedSignal,
  toInviteCancel,
  toMatchedSnapshot,
  toMissedAcceptance,
  toReplacement,
  toRestoreRequest,
  toResumeAddress,
  toGraceStart,
  toResumeParams,
  toUnsentAccept,
} from "../callResume.helpers";
import type { DecidedSnapshot, SnapshotContext } from "../callResume.types";
import { toReadySync, toReplyCheck, toStaleAcceptSync } from "../callSync.helpers";
import type { CallSnapshot } from "../signaling.types";

const SNAPSHOT: CallSnapshot = {
  callId: "c-1",
  status: "connected",
  direction: "outgoing",
  peerName: "Иван",
  lesson: null,
  iceServers: [{ urls: "stun:example" }],
  peerPresence: { presence: "on_screen", audioSuspended: false, videoSuspended: false },
  connectedAt: "2026-10-27T10:00:00.000Z",
};

const local = (patch: Partial<SnapshotContext> = {}): SnapshotContext => ({
  callId: "c-1",
  phase: "active",
  role: "tutor",
  inviteInDoubt: false,
  canceledInvite: null,
  endedCall: null,
  ...patch,
});

const IDLE = local({ callId: null, phase: "idle", role: null });
const HUNG_UP = {
  role: "tutor" as const,
  message: { type: "call_hangup" as const, callId: "c-1" },
};

describe("features/videoCall/model callResume helpers — decideOnSnapshot", () => {
  it("should restore a call the page does not have", () => {
    expect(decideOnSnapshot(IDLE, { role: "tutor", call: SNAPSHOT })).toBe("restore");
  });

  it("should ignore an empty snapshot while the page has no call", () => {
    expect(decideOnSnapshot(IDLE, { role: "tutor", call: null })).toBe("ignore");
  });

  it("should resume the same call", () => {
    expect(decideOnSnapshot(local(), { role: "tutor", call: SNAPSHOT })).toBe("resume");
    expect(
      decideOnSnapshot(local({ phase: "incoming" }), {
        role: "tutor",
        call: { ...SNAPSHOT, status: "ringing" },
      })
    ).toBe("resume");
  });

  it.each<CallPhase>(["incoming", "connecting", "active"])(
    "should end the page's %s call when the server no longer has it",
    (phase) => {
      expect(decideOnSnapshot(local({ phase }), { role: "tutor", call: null })).toBe("endLocally");
    }
  );

  it.each<CallPhase>(["outgoing", "incoming", "connecting", "active"])(
    "should replace the page's %s call with the participant's newer one the server has",
    (phase) => {
      const newer = { ...SNAPSHOT, callId: "c-2", status: "ringing" as const };
      expect(decideOnSnapshot(local({ phase }), { role: "tutor", call: newer })).toBe("replace");
    }
  );

  it("should not touch a new call whose ringing the server has not confirmed yet", () => {
    const awaiting = local({ phase: "outgoing", callId: null });
    expect(decideOnSnapshot(awaiting, { role: "tutor", call: null })).toBe("ignore");
    expect(decideOnSnapshot(awaiting, { role: "tutor", call: SNAPSHOT })).toBe("ignore");
  });

  it("should settle an invite whose socket closed before call_ringing by the snapshot", () => {
    const inDoubt = local({ phase: "outgoing", callId: null, inviteInDoubt: true });
    expect(decideOnSnapshot(inDoubt, { role: "tutor", call: null })).toBe("endLocally");
    expect(decideOnSnapshot(inDoubt, { role: "tutor", call: SNAPSHOT })).toBe("restore");
    expect(decideOnSnapshot(inDoubt, { role: "student", call: null })).toBe("ignore");
  });

  it("should end an outgoing call that already rang when the server no longer has it", () => {
    expect(decideOnSnapshot(local({ phase: "outgoing" }), { role: "tutor", call: null })).toBe(
      "endLocally"
    );
  });

  it("should ignore a snapshot of the other role's socket", () => {
    expect(decideOnSnapshot(local(), { role: "student", call: null })).toBe("ignore");
    expect(decideOnSnapshot(local(), { role: "student", call: SNAPSHOT })).toBe("ignore");
  });

  it("should cancel, not restore, the outgoing call of an invite canceled while in doubt", () => {
    const canceled = local({ ...IDLE, canceledInvite: "tutor" });
    const ringing = { ...SNAPSHOT, status: "ringing" as const, connectedAt: null };
    expect(decideOnSnapshot(canceled, { role: "tutor", call: ringing })).toBe("inviteCanceled");
    expect(decideOnSnapshot(canceled, { role: "tutor", call: SNAPSHOT })).toBe("inviteCanceled");
    expect(decideOnSnapshot(canceled, { role: "tutor", call: null })).toBe("ignore");
    expect(
      decideOnSnapshot(canceled, { role: "tutor", call: { ...ringing, direction: "incoming" } })
    ).toBe("restore");
    expect(decideOnSnapshot(canceled, { role: "student", call: ringing })).toBe("restore");
    const ringingElsewhere = local({ phase: "incoming", role: "student", canceledInvite: "tutor" });
    expect(decideOnSnapshot(ringingElsewhere, { role: "tutor", call: ringing })).toBe(
      "inviteCanceled"
    );
  });

  it("should not bring back or end anything for a call this page ended itself", () => {
    expect(
      decideOnSnapshot(local({ ...IDLE, endedCall: HUNG_UP }), { role: "tutor", call: SNAPSHOT })
    ).toBe("endedHere");
    const nextCall = local({ callId: "c-2", phase: "incoming", endedCall: HUNG_UP });
    expect(decideOnSnapshot(nextCall, { role: "tutor", call: SNAPSHOT })).toBe("endedHere");
    expect(decideOnSnapshot(nextCall, { role: "tutor", call: null })).toBe("endLocally");
  });
});

describe("features/videoCall/model callResume helpers — derived payloads", () => {
  const decided = (
    patch: Partial<SnapshotContext>,
    call: CallSnapshot | null,
    decision: DecidedSnapshot["decision"] = "resume"
  ): DecidedSnapshot => ({ local: local(patch), received: { role: "tutor", call }, decision });

  it("should build the restore request only for a restore", () => {
    const received = { role: "student" as const, call: SNAPSHOT };
    expect(toRestoreRequest({ local: IDLE, received, decision: "restore" })).toEqual({
      role: "student",
      snapshot: SNAPSHOT,
    });
    expect(toRestoreRequest({ local: local(), received, decision: "replace" })).toBeNull();
    expect(toRestoreRequest({ local: local(), received, decision: "endLocally" })).toBeNull();
    expect(toRestoreRequest({ local: IDLE, received, decision: "ignore" })).toBeNull();
    expect(
      toRestoreRequest({
        local: IDLE,
        received: { role: "tutor", call: null },
        decision: "restore",
      })
    ).toBeNull();
  });

  it("should build the replacing call only for a replace", () => {
    const received = { role: "student" as const, call: SNAPSHOT };
    expect(toReplacement({ local: local(), received, decision: "replace" })).toEqual({
      role: "student",
      snapshot: SNAPSHOT,
    });
    expect(toReplacement({ local: IDLE, received, decision: "restore" })).toBeNull();
    expect(toReplacement({ local: local(), received, decision: "resume" })).toBeNull();
  });

  it("should build the resume address and the matched snapshot only for a resume", () => {
    const resume = decided({}, SNAPSHOT);
    expect(toResumeAddress(resume)).toEqual({ callId: "c-1", role: "tutor" });
    expect(toMatchedSnapshot(resume)).toBe(SNAPSHOT);
    expect(toResumeAddress({ ...resume, decision: "endLocally" })).toBeNull();
    expect(toMatchedSnapshot({ ...resume, decision: "endLocally" })).toBeNull();
  });

  it("should ask the peer to rebuild only for a connection it has not heard of", () => {
    const address = { callId: "c-1", role: "tutor" as const };
    const unannounced = (unannouncedRestart: string | null) => ({
      unannouncedRestart,
      restartInFlight: null,
    });
    expect(toResumeParams(unannounced("c-1"), address)).toEqual({
      ...address,
      sessionRestart: true,
    });
    expect(toResumeParams(unannounced(null), address)).toEqual({
      ...address,
      sessionRestart: false,
    });
    expect(toResumeParams(unannounced("c-0"), address).sessionRestart).toBe(false);
  });

  it("should not ask the peer to rebuild again while the server may still handle the request", () => {
    const address = { callId: "c-1", role: "tutor" as const };
    expect(
      toResumeParams({ unannouncedRestart: "c-1", restartInFlight: "tutor" }, address)
        .sessionRestart
    ).toBe(false);
  });

  it("should catch up on an acceptance the caller missed while away", () => {
    const accepted = { ...SNAPSHOT, status: "accepted" as const, connectedAt: null };
    expect(toMissedAcceptance(decided({ phase: "outgoing" }, accepted))).toEqual({
      callId: "c-1",
      iceServers: SNAPSHOT.iceServers,
    });
    expect(
      toMissedAcceptance(decided({ phase: "outgoing" }, { ...SNAPSHOT, status: "ringing" }))
    ).toBeNull();
    expect(toMissedAcceptance(decided({ phase: "connecting" }, accepted))).toBeNull();
  });

  it("should send again an answer the server never got", () => {
    const ringing = { ...SNAPSHOT, status: "ringing" as const, direction: "incoming" as const };
    expect(toUnsentAccept(decided({ phase: "connecting" }, ringing))).toEqual({
      role: "tutor",
      callId: "c-1",
    });
    expect(toUnsentAccept(decided({ phase: "incoming" }, ringing))).toBeNull();
    expect(toUnsentAccept(decided({ phase: "connecting" }, SNAPSHOT))).toBeNull();
  });

  it("should repeat the ending signal of a call this page ended", () => {
    expect(toEndedSignal(decided({ endedCall: HUNG_UP }, SNAPSHOT, "endedHere"))).toBe(HUNG_UP);
    expect(toEndedSignal(decided({ endedCall: HUNG_UP }, SNAPSHOT, "ignore"))).toBeNull();
  });

  it("should cancel the call of a canceled invite on the socket of its role", () => {
    const cancel = {
      role: "tutor" as const,
      message: { type: "call_cancel" as const, callId: "c-1" },
    };
    expect(toInviteCancel(decided({}, SNAPSHOT, "inviteCanceled"))).toEqual(cancel);
    expect(toInviteCancel(decided({}, SNAPSHOT, "restore"))).toBeNull();
  });

  it("should catch up on media changes only when resuming a call with media", () => {
    expect(isMediaResume(decided({ phase: "active" }, SNAPSHOT))).toBe(true);
    expect(isMediaResume(decided({ phase: "outgoing" }, SNAPSHOT))).toBe(false);
    expect(isMediaResume(decided({ phase: "active" }, null, "endLocally"))).toBe(false);
  });

  it("should end the page's call at once only for a call the server lost", () => {
    expect(isEndedWithoutPage(decided({}, null, "endLocally"))).toBe(true);
    expect(isEndedWithoutPage(decided({}, SNAPSHOT, "replace"))).toBe(false);
    expect(isEndedWithoutPage(decided({}, SNAPSHOT, "resume"))).toBe(false);
    expect(isEndedWithoutPage(decided(IDLE, SNAPSHOT, "restore"))).toBe(false);
  });

  it("should treat only connecting and active as phases with media", () => {
    expect(isMediaPhase("connecting")).toBe(true);
    expect(isMediaPhase("active")).toBe(true);
    expect(isMediaPhase("incoming")).toBe(false);
    expect(isMediaPhase("outgoing")).toBe(false);
    expect(isMediaPhase("idle")).toBe(false);
  });
});

describe("features/videoCall/model callResume helpers — a lost or taken socket", () => {
  it("should wait for a call that still rang no longer than the server rings it", () => {
    expect(toGraceStart({ generation: 2, phase: "incoming" })).toEqual({
      generation: 3,
      timeoutMs: RINGING_GRACE_TIMEOUT_MS,
    });
    expect(toGraceStart({ generation: 0, phase: "outgoing" }).timeoutMs).toBe(
      RINGING_GRACE_TIMEOUT_MS
    );
    expect(toGraceStart({ generation: 0, phase: "connecting" }).timeoutMs).toBe(
      LOCAL_GRACE_TIMEOUT_MS
    );
    expect(toGraceStart({ generation: 0, phase: "active" }).timeoutMs).toBe(LOCAL_GRACE_TIMEOUT_MS);
  });

  it("should take a refused reconnect for the end of every call but one ringing here", () => {
    const refused = { role: "tutor" as const, refused: true };
    expect(isEndedCallRefusal("active", refused)).toBe(true);
    expect(isEndedCallRefusal("connecting", refused)).toBe(true);
    expect(isEndedCallRefusal("outgoing", refused)).toBe(true);
    expect(isEndedCallRefusal("incoming", refused)).toBe(false);
    expect(isEndedCallRefusal("active", { ...refused, refused: false })).toBe(false);
  });
});

describe("features/videoCall/model callSync helpers", () => {
  it("should check the reply only on the socket of the page's call", () => {
    const source = { role: "tutor" as const, notification: null, generation: 4 };
    expect(toReplyCheck(source, ["tutor", "student"])).toEqual({
      roles: ["tutor"],
      generation: 5,
    });
    expect(toReplyCheck(source, ["student"])).toBeNull();
    expect(toReplyCheck({ ...source, role: null }, ["tutor"])).toBeNull();
  });

  it("should check every socket asked about a tapped notification's call", () => {
    const source = { role: null, notification: "c-9", generation: 0 };
    expect(toReplyCheck(source, ["tutor", "student"])).toEqual({
      roles: ["tutor", "student"],
      generation: 1,
    });
    expect(toReplyCheck(source, [])).toBeNull();
  });

  it("should sync a socket back while hidden only for the page's own call", () => {
    expect(toReadySync({ visible: true, role: null }, "tutor")).toEqual(["tutor"]);
    expect(toReadySync({ visible: false, role: "tutor" }, "tutor")).toEqual(["tutor"]);
    expect(toReadySync({ visible: false, role: "student" }, "tutor")).toBeNull();
    expect(toReadySync({ visible: false, role: null }, "tutor")).toBeNull();
  });

  it("should ask about an unknown accept unless an answer is on its way or a hidden page has no call of the role", () => {
    expect(toStaleAcceptSync({ visible: true, role: null, pending: [] }, "tutor")).toEqual([
      "tutor",
    ]);
    expect(toStaleAcceptSync({ visible: false, role: "tutor", pending: [] }, "tutor")).toEqual([
      "tutor",
    ]);
    expect(toStaleAcceptSync({ visible: false, role: null, pending: [] }, "tutor")).toBeNull();
    expect(
      toStaleAcceptSync({ visible: true, role: null, pending: ["tutor"] }, "tutor")
    ).toBeNull();
  });
});

describe("features/videoCall/model callRestore helpers", () => {
  it("should count the duration from the server's connectedAt", () => {
    const now = Date.parse("2026-10-27T10:01:05.900Z");
    expect(secondsSince("2026-10-27T10:00:00.000Z", now)).toBe(65);
    expect(secondsSince(null, now)).toBe(0);
    expect(secondsSince("not a date", now)).toBe(0);
    expect(secondsSince("2026-10-27T11:00:00.000Z", now)).toBe(0);
  });

  it("should restore the screens from the participant's point of view", () => {
    const incoming = {
      role: "student" as const,
      snapshot: { ...SNAPSHOT, direction: "incoming" as const },
    };
    expect(toRestoredIncoming(incoming)).toEqual({
      callId: "c-1",
      callerName: "Иван",
      role: "student",
      lesson: null,
    });
    expect(toRestoredOutgoingPeer({ role: "tutor", snapshot: SNAPSHOT })).toEqual({
      name: "Иван",
      role: "student",
    });
    expect(toRestoredOutgoingPeer({ role: "student", snapshot: SNAPSHOT })?.role).toBe("tutor");
    expect(toRestoredOutgoingPeer(incoming)).toBeNull();
    expect(toRestoredIncoming({ role: "tutor", snapshot: SNAPSHOT })).toBeNull();
  });

  it("should bring a connected call back as active and an accepted one as connecting", () => {
    expect(toRestoredPhase({ role: "tutor", snapshot: SNAPSHOT })).toBe("active");
    expect(toRestoredPhase({ role: "tutor", snapshot: { ...SNAPSHOT, status: "accepted" } })).toBe(
      "connecting"
    );
  });

  it("should bring a ringing call back to its incoming or dialing screen", () => {
    const ringing = { ...SNAPSHOT, status: "ringing" as const };
    expect(toRestoredPhase({ role: "tutor", snapshot: ringing })).toBe("outgoing");
    expect(
      toRestoredPhase({ role: "tutor", snapshot: { ...ringing, direction: "incoming" } })
    ).toBe("incoming");
  });

  it("should keep the caller impolite and the callee polite on the new connection", () => {
    expect(toRestoredMedia({ role: "tutor", snapshot: SNAPSHOT })).toEqual({
      callId: "c-1",
      role: "tutor",
      iceServers: SNAPSHOT.iceServers,
      polite: false,
    });
    expect(
      toRestoredMedia({ role: "student", snapshot: { ...SNAPSHOT, direction: "incoming" } }).polite
    ).toBe(true);
  });
});
