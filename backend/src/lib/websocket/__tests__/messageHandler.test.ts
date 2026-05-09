import { WebSocket } from "ws";
import type { AuthenticatedWebSocket } from "../types";
import { handleMessage, sendWelcomeMessage } from "../messageHandler";

const makeWs = (
  overrides: Partial<AuthenticatedWebSocket> = {}
): AuthenticatedWebSocket =>
  ({
    userId: "user-1",
    readyState: WebSocket.OPEN,
    send: jest.fn(),
    ...overrides,
  }) as unknown as AuthenticatedWebSocket;

describe("messageHandler", () => {
  beforeEach(() => {
    jest.restoreAllMocks();
  });

  it("handleMessage should log and echo message back", () => {
    const logMock = jest.spyOn(console, "log").mockImplementation(() => {});
    const ws = makeWs();
    const data = { text: "hello" };

    handleMessage(ws, data);

    expect(logMock).toHaveBeenCalledWith(
      `Received message from ${ws.userId}:`,
      data
    );

    expect(ws.send).toHaveBeenCalledTimes(1);
    const sent = JSON.parse((ws.send as jest.Mock).mock.calls[0][0] as string);
    expect(sent.type).toBe("message_received");
    expect(sent.originalMessage).toEqual(data);
  });

  it("handleMessage should not call send when readyState is not OPEN (regression: throw on closing socket)", () => {
    const ws = makeWs({ readyState: WebSocket.CLOSING });

    expect(() => handleMessage(ws, { text: "hi" })).not.toThrow();
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
