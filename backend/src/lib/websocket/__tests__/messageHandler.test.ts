import { handleMessage, sendWelcomeMessage } from "../messageHandler";

describe("messageHandler", () => {
  beforeEach(() => {
    jest.restoreAllMocks();
  });

  it("handleMessage should log and echo message back", () => {
    const sendMock = jest.fn();
    const logMock = jest.spyOn(console, "log").mockImplementation(() => {});

    const ws: any = {
      userId: "user-1",
      send: sendMock,
    };

    const data = { text: "hello" };

    handleMessage(ws, data);

    expect(logMock).toHaveBeenCalledWith(
      `Received message from ${ws.userId}:`,
      data
    );

    expect(sendMock).toHaveBeenCalledTimes(1);
    const sent = JSON.parse((sendMock.mock.calls[0] as any)[0]);
    expect(sent.type).toBe("message_received");
    expect(sent.originalMessage).toEqual(data);
  });

  it("sendWelcomeMessage should send connection_established message", () => {
    const sendMock = jest.fn();
    const ws: any = { send: sendMock };

    sendWelcomeMessage(ws, "user-1");

    expect(sendMock).toHaveBeenCalledTimes(1);
    const sent = JSON.parse((sendMock.mock.calls[0] as any)[0]);
    expect(sent.type).toBe("connection_established");
    expect(sent.userId).toBe("user-1");
    expect(sent.message).toBe("WebSocket connection established");
  });
});
