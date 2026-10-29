import { createServer } from "http";

import { uniqueEmail } from "../../../__tests__/helpers";
import { prisma } from "../../prisma";
import { revokeTutorSessions } from "../../tokenRevocation";
import { getCachedTokenVersion } from "../../tokenVersionCache";
import { generateToken } from "../../../utils/auth";
import { WebSocketManager } from "../webSocketManager";
import { connectSocket, makeSocket } from "./wsManagerHarness";

jest.mock("../messageHandler", () => ({
  handleMessage: jest.fn(),
  sendWelcomeMessage: jest.fn(),
}));

jest.mock("../../../services/callSignaling", () => ({
  participantDisconnected: jest.fn(async () => undefined),
  participantRevoked: jest.fn(async () => undefined),
  processCallSignal: jest.fn(async () => undefined),
}));

describe("WebSocketManager tutor token revocation race", () => {
  let server: ReturnType<typeof createServer>;
  let manager: WebSocketManager;
  let userId: string;
  let email: string;
  let tokenVersion: number;

  beforeAll(async () => {
    const user = await prisma.user.create({
      data: { email: uniqueEmail().toLowerCase(), password: "hash", name: "Race Tutor" },
    });
    userId = user.id;
    email = user.email;
    tokenVersion = user.tokenVersion;
  });

  beforeEach(() => {
    jest.spyOn(console, "log").mockImplementation(() => undefined);
    server = createServer();
    manager = new WebSocketManager(server);
  });

  afterEach(async () => {
    jest.restoreAllMocks();
    await new Promise<void>((resolve) => server.close(() => resolve()));
  });

  afterAll(async () => {
    await prisma.user.delete({ where: { id: userId } }).catch(() => undefined);
  });

  it("should not register a socket whose token was revoked while its version was being read", async () => {
    let releaseLookup: () => void = () => undefined;
    const lookupHeld = new Promise<void>((resolve) => {
      releaseLookup = resolve;
    });
    const realFindUnique = prisma.user.findUnique.bind(prisma.user);
    jest.spyOn(prisma.user, "findUnique").mockImplementationOnce((async (
      args: Parameters<typeof prisma.user.findUnique>[0]
    ) => {
      const user = await realFindUnique(args);
      await lookupHeld;
      return user;
    }) as unknown as typeof prisma.user.findUnique);
    const ws = makeSocket();
    const token = generateToken({ userId, email, tokenVersion });

    const connecting = connectSocket(
      manager,
      "tutor",
      ws,
      `/ws?token=${encodeURIComponent(token)}`
    );
    await new Promise((resolve) => setImmediate(resolve));
    revokeTutorSessions(userId, tokenVersion + 1);
    releaseLookup();
    await connecting;

    expect(ws.close).toHaveBeenCalledWith(4001, "Token revoked");
    expect(manager.getConnection("tutor", userId)).toBeUndefined();
    expect(getCachedTokenVersion(userId)).toBe(tokenVersion + 1);
  });
});
