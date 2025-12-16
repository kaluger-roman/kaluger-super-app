import jwt from "jsonwebtoken";
import { authenticateWebSocket } from "../auth";

describe("websocket auth", () => {
  const originalEnv = process.env.JWT_SECRET;

  beforeEach(() => {
    jest.restoreAllMocks();
    process.env.JWT_SECRET = "test-secret";
  });

  afterEach(() => {
    process.env.JWT_SECRET = originalEnv;
  });

  it("should return decoded payload when token is valid", async () => {
    const fakePayload = { userId: "user-1", email: "test@example.com" };

    jest.spyOn(jwt, "verify").mockImplementation(() => fakePayload as any);

    const ws: any = {
      close: jest.fn(),
    };

    const request: any = {
      url: "/?token=valid-token",
    };

    const result = await authenticateWebSocket(ws, request);

    expect(result).toEqual(fakePayload);
    expect(ws.close).not.toHaveBeenCalled();
  });

  it("should close ws and return null when token is missing", async () => {
    const ws: any = { close: jest.fn() };
    const request: any = { url: "/" };

    const result = await authenticateWebSocket(ws, request);

    expect(result).toBeNull();
    expect(ws.close).toHaveBeenCalledWith(1008, "No token provided");
  });

  it("should close ws and return null when token is invalid", async () => {
    jest.spyOn(jwt, "verify").mockImplementation(() => {
      throw new Error("invalid token");
    });

    const ws: any = { close: jest.fn() };
    const request: any = { url: "/?token=bad" };

    const result = await authenticateWebSocket(ws, request);

    expect(result).toBeNull();
    expect(ws.close).toHaveBeenCalledWith(1008, "Authentication failed");
  });
});
