import { createHmac } from "crypto";

import { buildIceServers } from "../iceConfig";

describe("buildIceServers", () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it("should return STUN-only when TURN is not configured", () => {
    delete process.env.TURN_URL;
    delete process.env.TURN_SECRET;
    process.env.STUN_URL = "stun:custom:3478";

    const servers = buildIceServers();

    expect(servers).toHaveLength(1);
    expect(servers[0]).toEqual({ urls: "stun:custom:3478" });
  });

  it("should fall back to the public STUN default when STUN_URL is unset", () => {
    delete process.env.STUN_URL;
    delete process.env.TURN_URL;
    delete process.env.TURN_SECRET;

    const servers = buildIceServers();

    expect(servers[0].urls).toBe("stun:stun.l.google.com:19302");
  });

  it("should add a TURN entry with time-limited HMAC credentials when configured", () => {
    process.env.TURN_URL = "turn:turn.example.com:3478";
    process.env.TURN_SECRET = "secret123";
    process.env.TURN_CREDENTIAL_TTL = "3600";

    const before = Math.floor(Date.now() / 1000);
    const servers = buildIceServers();
    const after = Math.floor(Date.now() / 1000);

    expect(servers).toHaveLength(2);
    const turn = servers[1];
    expect(turn.urls).toBe("turn:turn.example.com:3478");

    const expiry = Number(turn.username);
    expect(expiry).toBeGreaterThanOrEqual(before + 3600);
    expect(expiry).toBeLessThanOrEqual(after + 3600);

    const expectedCredential = createHmac("sha1", "secret123")
      .update(String(expiry))
      .digest("base64");
    expect(turn.credential).toBe(expectedCredential);
  });
});
