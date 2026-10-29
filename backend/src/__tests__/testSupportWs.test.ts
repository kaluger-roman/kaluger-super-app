import request from "supertest";
import { app } from "../index";
import type { WebSocketManager } from "../lib/websocket";
import { getWebSocketManager } from "../lib/wsManager";

jest.mock("../lib/wsManager", () => ({
  getWebSocketManager: jest.fn(),
  setWebSocketManager: jest.fn(),
}));

describe("test support: dropping a participant's socket", () => {
  const useConnection = (socket: { terminate: jest.Mock; close: jest.Mock } | undefined) => {
    const getConnection = jest.fn(() => socket);
    jest
      .mocked(getWebSocketManager)
      .mockReturnValue({ getConnection } as unknown as WebSocketManager);
    return getConnection;
  };

  it.each([
    ["students", "student"],
    ["tutors", "tutor"],
  ] as const)(
    "should drop the registered socket of %s without a close handshake",
    async (path, kind) => {
      const socket = { terminate: jest.fn(), close: jest.fn() };
      const getConnection = useConnection(socket);

      const res = await request(app).post(`/api/__test__/ws/${path}/user-1/drop`).expect(200);

      expect(res.body).toEqual({ dropped: true });
      expect(getConnection).toHaveBeenCalledWith(kind, "user-1");
      expect(socket.terminate).toHaveBeenCalledTimes(1);
      expect(socket.close).not.toHaveBeenCalled();
    }
  );

  it("should report nothing dropped when the participant has no socket", async () => {
    useConnection(undefined);

    const res = await request(app).post("/api/__test__/ws/tutors/user-1/drop").expect(200);

    expect(res.body).toEqual({ dropped: false });
  });
});
