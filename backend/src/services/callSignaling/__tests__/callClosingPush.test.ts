import { callWebSocket, createCallPair, deleteCallPair, waitFor } from "../../../__tests__/helpers";
import type { CallPair } from "../../../__tests__/helpers";
import type { CallSignalingInbound } from "../../../types";
import { notifyCallClosed, notifyIncomingCall } from "../../callNotification";
import { processCallSignal } from "../callFlow";

jest.mock(
  "../../../lib/wsManager",
  () => jest.requireActual("../../../__tests__/helpers").callWebSocketManagerModule
);
jest.mock("../../callNotification", () => ({
  hasCallNotificationDevices: jest.fn(async () => true),
  notifyIncomingCall: jest.fn(),
  notifyCallClosed: jest.fn(async () => undefined),
}));

const { messagesOfType } = callWebSocket;

describe("the closing call notification", () => {
  let pair: CallPair;
  let deliverIncoming: (devices: number) => void;

  const signal = (data: CallSignalingInbound, kind: "tutor" | "student" = "tutor") =>
    processCallSignal({ kind, id: kind === "tutor" ? pair.tutorId : pair.studentUserId }, data);

  // The student has no open app: the call rings on the student's devices, and the push service
  // has not answered the incoming call push yet.
  const ringWhilePushInFlight = async (): Promise<{ callId: string; ringing: Promise<void> }> => {
    const ringing = signal({
      type: "call_invite",
      inviteId: "invite-1",
      targetStudentId: pair.studentId,
    });
    await waitFor(() => jest.mocked(notifyIncomingCall).mock.calls.length === 1);
    const message = messagesOfType("call_ringing")[0]?.message;
    if (message?.type !== "call_ringing") throw new Error("no ringing");
    return { callId: message.callId, ringing };
  };

  const closingKinds = () => jest.mocked(notifyCallClosed).mock.calls.map(([, { kind }]) => kind);

  beforeAll(async () => {
    pair = await createCallPair();
  });

  beforeEach(() => {
    jest.mocked(notifyIncomingCall).mockReset();
    jest.mocked(notifyCallClosed).mockClear();
    jest.mocked(notifyIncomingCall).mockImplementation(
      () =>
        new Promise<number>((resolve) => {
          deliverIncoming = resolve;
        })
    );
    callWebSocket.reset();
    callWebSocket.connect("tutor", pair.tutorId);
  });

  afterAll(() => deleteCallPair(pair));

  it("should not overtake the incoming call push when the tutor cancels at once (regression: the device kept ringing for a cancelled call)", async () => {
    const { callId, ringing } = await ringWhilePushInFlight();

    await signal({ type: "call_cancel", callId });

    expect(notifyCallClosed).not.toHaveBeenCalled();
    deliverIncoming(1);
    await ringing;
    await waitFor(() => closingKinds().length === 1);
    expect(closingKinds()).toEqual(["missed_call"]);
  });

  it("should not overtake the incoming call push when the student answers at once", async () => {
    const { callId, ringing } = await ringWhilePushInFlight();

    await signal({ type: "call_accept", callId }, "student");

    expect(notifyCallClosed).not.toHaveBeenCalled();
    deliverIncoming(1);
    await ringing;
    await waitFor(() => closingKinds().length === 1);
    expect(closingKinds()).toEqual(["call_closed"]);
  });

  it.each(["call_accept", "call_reject"] as const)(
    "should leave out the device that sent %s when closing the notification",
    async (type) => {
      const { callId, ringing } = await ringWhilePushInFlight();

      await signal({ type, callId, pushEndpoint: "https://push.example.com/answering" }, "student");

      deliverIncoming(1);
      await ringing;
      await waitFor(() => closingKinds().length === 1);
      expect(jest.mocked(notifyCallClosed).mock.calls[0][2]).toEqual({
        exceptEndpoint: "https://push.example.com/answering",
      });
    }
  );
});
