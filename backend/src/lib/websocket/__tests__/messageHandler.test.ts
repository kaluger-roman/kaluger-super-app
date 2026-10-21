import { WebSocket } from "ws";
import type { AuthenticatedWebSocket } from "../types";
import { handleMessage, sendWelcomeMessage } from "../messageHandler";
import { processCallSignal } from "../../../services/callSignaling";

jest.mock("../../../services/callSignaling", () => ({
  processCallSignal: jest.fn(async () => undefined),
}));

const makeWs = (overrides: Partial<AuthenticatedWebSocket> = {}): AuthenticatedWebSocket =>
  ({
    userId: "user-1",
    readyState: WebSocket.OPEN,
    send: jest.fn(),
    ...overrides,
  }) as unknown as AuthenticatedWebSocket;

describe("messageHandler", () => {
  beforeEach(() => {
    jest.restoreAllMocks();
    jest.clearAllMocks();
  });

  it("handleMessage should log and echo message back", () => {
    const logMock = jest.spyOn(console, "log").mockImplementation(() => {});
    const ws = makeWs();
    const data = { text: "hello" };

    handleMessage(ws, "user-1", data);

    expect(logMock).toHaveBeenCalledWith("Received message from user-1:", data);

    expect(ws.send).toHaveBeenCalledTimes(1);
    const sent = JSON.parse((ws.send as jest.Mock).mock.calls[0][0] as string);
    expect(sent.type).toBe("message_received");
    expect(sent.originalMessage).toEqual(data);
  });

  it("handleMessage should not call send when readyState is not OPEN (regression: throw on closing socket)", () => {
    const ws = makeWs({ readyState: WebSocket.CLOSING });

    expect(() => handleMessage(ws, "user-1", { text: "hi" })).not.toThrow();
    expect(ws.send).not.toHaveBeenCalled();
  });

  it("should route call signals to the call flow without echoing them", () => {
    const ws = makeWs();
    const signal = { type: "call_hangup", callId: "c-1" };

    handleMessage(ws, "user-1", signal);

    expect(processCallSignal).toHaveBeenCalledWith({ kind: "tutor", id: "user-1" }, signal);
    expect(ws.send).not.toHaveBeenCalled();
  });

  it("should drop a malformed call signal without echoing it", () => {
    const ws = makeWs();

    handleMessage(ws, "user-1", { type: "call_hangup" });

    expect(processCallSignal).not.toHaveBeenCalled();
    expect(ws.send).not.toHaveBeenCalled();
  });

  it("sendWelcomeMessage should send connection_established message", () => {
    const ws = makeWs();

    sendWelcomeMessage(ws, "user-1");

    expect(ws.send).toHaveBeenCalledTimes(1);
    const sent = JSON.parse((ws.send as jest.Mock).mock.calls[0][0] as string);
    expect(sent.type).toBe("connection_established");
    expect(sent.userId).toBe("user-1");
    expect(sent.message).toBe("WebSocket connection established");
  });
});
