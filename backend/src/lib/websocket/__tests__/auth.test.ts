import { prisma } from "../../prisma";
import { generateToken } from "../../../utils/auth";
import { uniqueEmail } from "../../../__tests__/helpers";
import { authenticateWebSocket } from "../auth";

describe("authenticateWebSocket", () => {
  let userId: string;
  let email: string;
  let tokenVersion: number;

  const connect = async (token?: string) => {
    const ws: any = { close: jest.fn() };
    const request: any = { url: token ? `/?token=${encodeURIComponent(token)}` : "/" };
    const result = await authenticateWebSocket(ws, request);
    return { ws, result };
  };

  beforeAll(async () => {
    const user = await prisma.user.create({
      data: { email: uniqueEmail().toLowerCase(), password: "hash", name: "WS Tutor" },
    });
    userId = user.id;
    email = user.email;
    tokenVersion = user.tokenVersion;
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  afterAll(async () => {
    await prisma.user.delete({ where: { id: userId } }).catch(() => undefined);
  });

  it("should return the user when the token is valid and current", async () => {
    const { ws, result } = await connect(generateToken({ userId, email, tokenVersion }));

    expect(result).toEqual({ userId, email, tokenVersion });
    expect(ws.close).not.toHaveBeenCalled();
  });

  it("should close ws and return null when token is missing", async () => {
    const { ws, result } = await connect();

    expect(result).toBeNull();
    expect(ws.close).toHaveBeenCalledWith(1008, "No token provided");
  });

  it("should close ws and return null when token is invalid", async () => {
    const { ws, result } = await connect("not.a.jwt");

    expect(result).toBeNull();
    expect(ws.close).toHaveBeenCalledWith(1008, "Authentication failed");
  });

  it("should reject a token whose tokenVersion was revoked", async () => {
    const token = generateToken({ userId, email, tokenVersion });
    await prisma.user.update({ where: { id: userId }, data: { tokenVersion: { increment: 1 } } });
    try {
      const { ws, result } = await connect(token);

      expect(result).toBeNull();
      expect(ws.close).toHaveBeenCalledWith(1008, "Token revoked");
    } finally {
      await prisma.user.update({ where: { id: userId }, data: { tokenVersion } });
    }
  });

  it("should reject a token of a deleted user", async () => {
    const { ws, result } = await connect(
      generateToken({ userId: "missing-user", email, tokenVersion: 0 })
    );

    expect(result).toBeNull();
    expect(ws.close).toHaveBeenCalledWith(1008, "Token revoked");
  });

  it("should close with a server error, not a token verdict, when the tokenVersion lookup fails", async () => {
    jest.spyOn(prisma.user, "findUnique").mockRejectedValueOnce(new Error("db down"));
    jest.spyOn(console, "error").mockImplementation(() => undefined);

    const { ws, result } = await connect(generateToken({ userId, email, tokenVersion }));

    expect(result).toBeNull();
    expect(ws.close).toHaveBeenCalledWith(1011, "Authentication unavailable");
  });
});
