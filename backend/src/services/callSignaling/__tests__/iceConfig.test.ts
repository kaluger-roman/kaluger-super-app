import { createHmac } from "crypto";

import { buildIceServers } from "../iceConfig";

const PARTICIPANT = { kind: "student" as const, id: "su-1" };

describe("buildIceServers", () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it("should return STUN-only when TURN is not configured", () => {
    delete process.env.TURN_URL;
    delete process.env.TURN_SECRET;
    process.env.STUN_URL = "stun:custom:3478";

    const servers = buildIceServers(PARTICIPANT);

    expect(servers).toHaveLength(1);
    expect(servers[0]).toEqual({ urls: "stun:custom:3478" });
  });

  it("should fall back to the public STUN default when STUN_URL is unset", () => {
    delete process.env.STUN_URL;
    delete process.env.TURN_URL;
    delete process.env.TURN_SECRET;

    const servers = buildIceServers(PARTICIPANT);

    expect(servers[0].urls).toBe("stun:stun.l.google.com:19302");
  });

  it("should add a TURN entry with time-limited HMAC credentials when configured", () => {
    process.env.TURN_URL = "turn:turn.example.com:3478";
    process.env.TURN_SECRET = "secret123";
    process.env.TURN_CREDENTIAL_TTL = "3600";

    const before = Math.floor(Date.now() / 1000);
    const servers = buildIceServers(PARTICIPANT);
    const after = Math.floor(Date.now() / 1000);

    expect(servers).toHaveLength(2);
    const turn = servers[1];
    expect(turn.urls).toBe("turn:turn.example.com:3478");

    const [expiryPart, owner] = String(turn.username).split(":");
    const expiry = Number(expiryPart);
    expect(owner).toBe("student-su-1");
    expect(expiry).toBeGreaterThanOrEqual(before + 3600);
    expect(expiry).toBeLessThanOrEqual(after + 3600);

    const expectedCredential = createHmac("sha1", "secret123")
      .update(String(turn.username))
      .digest("base64");
    expect(turn.credential).toBe(expectedCredential);
  });

  it("should default the TURN credential lifetime to four hours when no TTL is configured", () => {
    process.env.TURN_URL = "turn:turn.example.com:3478";
    process.env.TURN_SECRET = "secret123";
    delete process.env.TURN_CREDENTIAL_TTL;

    const now = Math.floor(Date.now() / 1000);
    const expiry = Number(String(buildIceServers(PARTICIPANT)[1].username).split(":")[0]);

    expect(expiry - now).toBeGreaterThanOrEqual(4 * 60 * 60 - 1);
    expect(expiry - now).toBeLessThanOrEqual(4 * 60 * 60 + 1);
  });
});
