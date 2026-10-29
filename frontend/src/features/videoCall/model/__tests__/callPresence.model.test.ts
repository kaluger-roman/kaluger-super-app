import { allSettled, fork } from "effector";
import type { Scope } from "effector";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import * as callModel from "../call.model";
import type { CallPhase } from "../call.types";
import * as callPresenceModel from "../callPresence.model";
import "../index";
import type { CallSignalingInbound } from "../signaling.types";
import { resetCallTransportsForTests, setCallTransport } from "../transport.helpers";
import { getSession, setWebRtcAdapter } from "../webrtc.helpers";
import {
  connectCallerSession,
  installTransport,
  resetCallFlow,
  settleMicrotasks,
} from "./callFlow";
import {
  createFakeAdapter,
  createFakeStream,
  endTrackBySystem,
  setTrackMutedBySystem,
} from "./fakeWebrtc";
import type { FakeAdapter, FakeTrack } from "./fakeWebrtc";

const BACKGROUND = { presence: "background", audioSuspended: true, videoSuspended: true } as const;

const installTutorTransport = (): CallSignalingInbound[] => {
  const sent: CallSignalingInbound[] = [];
  setCallTransport("tutor", (message) => sent.push(message), "tutor-socket");
  return sent;
};

const presenceMessage = (presence: "on_screen" | "background"): CallSignalingInbound => ({
  type: "presence_update",
  presence,
  audioSuspended: false,
  videoSuspended: false,
});

// A page back on screen also asks for the call (call_sync): only the presence is checked here.
const presenceOnly = (sent: CallSignalingInbound[]) =>
  sent.filter((message) => message.type === "presence_update");

const inCall = (phase: CallPhase = "active"): Scope =>
  fork({
    values: [
      [callModel.$callPhase, phase],
      [callModel.$callId, "c-1"],
      [callModel.$callRole, "tutor"],
    ],
  });

// A lost media connection starts the recovery timeout (patronum `delay`), which keeps allSettled
// pending: units are launched fire-and-forget and the clock is driven by hand.
const launch = async (run: () => unknown) => {
  void run();
  await vi.advanceTimersByTimeAsync(0);
};

afterEach(() => {
  resetCallTransportsForTests();
  vi.restoreAllMocks();
});

describe("features/videoCall/model/callPresence.model — own presence", () => {
  it("should report presence on the socket that became ready", async () => {
    const sent = installTutorTransport();
    const scope = fork();

    await allSettled(callPresenceModel.transportReady, { scope, params: "tutor" });

    expect(presenceOnly(sent)).toEqual([presenceMessage("on_screen")]);
  });

  it("should report the background when the socket comes back while the page is hidden", async () => {
    const sent = installTutorTransport();
    const scope = fork({ values: [[callPresenceModel.$isVisible, false]] });

    await allSettled(callPresenceModel.transportReady, { scope, params: "tutor" });

    expect(presenceOnly(sent)).toEqual([presenceMessage("background")]);
  });

  it("should report every change of visibility once, on every socket the tab has", async () => {
    const tutorSent = installTutorTransport();
    const studentSent: CallSignalingInbound[] = [];
    setCallTransport("student", (message) => studentSent.push(message), "student-socket");
    const scope = fork();

    await allSettled(callPresenceModel.visibilityChanged, { scope, params: false });
    await allSettled(callPresenceModel.visibilityChanged, { scope, params: false });
    await allSettled(callPresenceModel.visibilityChanged, { scope, params: true });

    expect(presenceOnly(tutorSent)).toEqual([
      presenceMessage("background"),
      presenceMessage("on_screen"),
    ]);
    expect(presenceOnly(studentSent)).toEqual([
      presenceMessage("background"),
      presenceMessage("on_screen"),
    ]);
  });

  it("should send nothing and fail nothing without a socket", async () => {
    const scope = fork();

    await allSettled(callPresenceModel.visibilityChanged, { scope, params: false });
    await allSettled(callPresenceModel.transportReady, { scope, params: "student" });

    expect(scope.getState(callPresenceModel.$isVisible)).toBe(false);
  });

  it("should not let a socket that throws stop the report on the other one", async () => {
    setCallTransport(
      "tutor",
      () => {
        throw new Error("closed");
      },
      "tutor-socket"
    );
    const studentSent: CallSignalingInbound[] = [];
    setCallTransport("student", (message) => studentSent.push(message), "student-socket");
    const scope = fork();

    await allSettled(callPresenceModel.visibilityChanged, { scope, params: false });

    expect(presenceOnly(studentSent)).toEqual([presenceMessage("background")]);
  });
});

describe("features/videoCall/model/callPresence.model — peer presence", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(async () => {
    await vi.runOnlyPendingTimersAsync();
    vi.useRealTimers();
  });

  const peerPresenceOf = (callId: string) =>
    ({
      role: "tutor",
      message: { type: "call_peer_presence", callId, ...BACKGROUND },
    }) as const;

  it("should take the peer's presence of the current call only", async () => {
    const scope = inCall();

    await launch(() =>
      allSettled(callModel.signalReceived, { scope, params: peerPresenceOf("c-2") })
    );
    expect(scope.getState(callPresenceModel.$peerPresence).presence).toBe("on_screen");

    await launch(() =>
      allSettled(callModel.signalReceived, { scope, params: peerPresenceOf("c-1") })
    );
    expect(scope.getState(callPresenceModel.$peerPresence)).toEqual(BACKGROUND);
  });

  it("should forget the peer's presence when the call ends or a new one rings", async () => {
    const scope = inCall();
    const receive = () =>
      launch(() =>
        allSettled(callPresenceModel.peerPresenceReceived, { scope, params: BACKGROUND })
      );

    await receive();
    await launch(() => allSettled(callModel.callEndedLocally, { scope }));
    expect(scope.getState(callPresenceModel.$peerPresence).presence).toBe("on_screen");

    await receive();
    await launch(() =>
      allSettled(callModel.incomingCallReceived, {
        scope,
        params: { callId: "c-9", callerName: "Анна", role: "student", lesson: null },
      })
    );
    expect(scope.getState(callPresenceModel.$peerPresence).presence).toBe("on_screen");
  });

  it("should show the peer as out of reach while the media of an active call is lost", async () => {
    const scope = inCall("active");
    const mediaLost = (lost: boolean) =>
      launch(() => allSettled(callPresenceModel.mediaConnectionChanged, { scope, params: lost }));

    await mediaLost(true);
    expect(scope.getState(callPresenceModel.$shownPeerPresence).presence).toBe("disconnected");

    await mediaLost(false);
    expect(scope.getState(callPresenceModel.$shownPeerPresence).presence).toBe("on_screen");
  });

  it("should show what the server says before the media ever connected", async () => {
    const scope = inCall("connecting");

    await launch(() =>
      allSettled(callPresenceModel.peerPresenceReceived, { scope, params: BACKGROUND })
    );
    await launch(() =>
      allSettled(callPresenceModel.mediaConnectionChanged, { scope, params: true })
    );

    expect(scope.getState(callPresenceModel.$shownPeerPresence)).toEqual(BACKGROUND);
  });

  it("should clear the lost media flag when the call ends", async () => {
    const scope = inCall("active");
    await launch(() =>
      allSettled(callPresenceModel.mediaConnectionChanged, { scope, params: true })
    );

    await launch(() => allSettled(callModel.callEndedLocally, { scope }));

    expect(scope.getState(callPresenceModel.$mediaConnectionLost)).toBe(false);
  });
});

describe("features/videoCall/model/callPresence.model — own media flags", () => {
  const presenceOf = (
    presence: "on_screen" | "background",
    audioSuspended: boolean,
    videoSuspended: boolean
  ): CallSignalingInbound => ({
    type: "presence_update",
    presence,
    audioSuspended,
    videoSuspended,
  });

  it.each([
    ["iPhone", { audio: false, video: false }, presenceOf("background", true, true)],
    ["Android", { audio: true, video: false }, presenceOf("background", false, true)],
    ["desktop", { audio: true, video: true }, presenceOf("background", false, false)],
  ])(
    "should report what %s stops when the page goes to the background",
    async (_, capability, expected) => {
      const sent = installTutorTransport();
      const scope = fork({ values: [[callPresenceModel.$backgroundCapability, capability]] });

      await allSettled(callPresenceModel.visibilityChanged, { scope, params: false });
      await allSettled(callPresenceModel.visibilityChanged, { scope, params: true });

      expect(presenceOnly(sent)).toEqual([expected, presenceOf("on_screen", false, false)]);
    }
  );

  it("should report the platform's suspension on a socket that comes back in the background", async () => {
    const sent = installTutorTransport();
    const scope = fork({
      values: [
        [callPresenceModel.$isVisible, false],
        [callPresenceModel.$backgroundCapability, { audio: false, video: false }],
      ],
    });

    await allSettled(callPresenceModel.transportReady, { scope, params: "tutor" });

    expect(sent).toEqual([presenceOf("background", true, true)]);
  });

  describe("in a call (track events fire outside any scope)", () => {
    let sent: CallSignalingInbound[];
    let adapter: FakeAdapter;

    const ownTrack = (callId: string, kind: "audio" | "video") => {
      const stream = getSession(callId)?.localStream;
      const tracks = kind === "audio" ? stream?.getAudioTracks() : stream?.getVideoTracks();
      return tracks?.[0] as unknown as FakeTrack;
    };

    beforeEach(() => {
      sent = installTransport();
      adapter = createFakeAdapter();
      setWebRtcAdapter(adapter);
    });

    afterEach(() => {
      resetCallFlow();
    });

    const presenceSent = () => sent.filter((message) => message.type === "presence_update");

    it("should report a microphone the system muted on screen, and its return", async () => {
      await connectCallerSession("mute");
      sent.length = 0;
      const mic = ownTrack("mute", "audio");

      setTrackMutedBySystem(mic, true);
      setTrackMutedBySystem(mic, true);
      expect(presenceSent()).toEqual([
        presenceOf("on_screen", true, false),
        presenceOf("on_screen", true, false),
      ]);

      sent.length = 0;
      setTrackMutedBySystem(mic, false);
      expect(presenceSent()).toEqual([
        presenceOf("on_screen", false, false),
        presenceOf("on_screen", false, false),
      ]);
    });

    it("should report a camera the system muted", async () => {
      await connectCallerSession("camera");
      sent.length = 0;

      setTrackMutedBySystem(ownTrack("camera", "video"), true);

      expect(presenceSent()[0]).toEqual(presenceOf("on_screen", false, true));
    });

    it("should watch the microphone brought back after the system stopped it", async () => {
      const fresh = createFakeStream(["audio"]);
      await connectCallerSession("recovered");
      vi.mocked(adapter.getUserMedia).mockResolvedValue(fresh as unknown as MediaStream);

      endTrackBySystem(ownTrack("recovered", "audio"));
      await settleMicrotasks();
      sent.length = 0;
      setTrackMutedBySystem(fresh.getAudioTracks()[0], true);

      expect(presenceSent()[0]).toEqual(presenceOf("on_screen", true, false));
    });

    it("should forget the muted tracks when the call ends", async () => {
      await connectCallerSession("ended");
      setTrackMutedBySystem(ownTrack("ended", "audio"), true);

      resetCallFlow();
      sent = installTransport();
      callPresenceModel.transportReady("tutor");

      expect(presenceSent()).toEqual([presenceOf("on_screen", false, false)]);
    });
  });
});
