import { createHmac } from "crypto";

import { buildIceServers, isTurnConfigured, warnIfTurnNotConfigured } from "../iceConfig";

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

  it("should add one TURN entry per comma-separated URL with shared credentials", () => {
    process.env.STUN_URL = "stun:h:3478";
    process.env.TURN_URL =
      "turn:h:3478?transport=udp, turn:h:3478?transport=tcp,,turns:h:5349?transport=tcp";
    process.env.TURN_SECRET = "secret123";

    const servers = buildIceServers(PARTICIPANT);

    expect(servers.map(({ urls }) => urls)).toEqual([
      "stun:h:3478",
      "turn:h:3478?transport=udp",
      "turn:h:3478?transport=tcp",
      "turns:h:5349?transport=tcp",
    ]);
    const turnEntries = servers.slice(1);
    const [{ username, credential }] = turnEntries;
    turnEntries.forEach((entry) => {
      expect(typeof entry.urls).toBe("string");
      expect(entry.urls).not.toMatch(/[,\s]/);
      expect(entry.username).toBe(username);
      expect(entry.credential).toBe(credential);
    });
    expect(credential).toBe(
      createHmac("sha1", "secret123").update(String(username)).digest("base64")
    );
  });

  it.each([
    ["empty", ""],
    ["whitespace", "   "],
    ["only commas", " , ,, "],
  ])("should stay STUN-only when TURN_URL is %s", (_label, turnUrl) => {
    process.env.TURN_URL = turnUrl;
    process.env.TURN_SECRET = "secret123";

    expect(buildIceServers(PARTICIPANT)).toHaveLength(1);
    expect(isTurnConfigured()).toBe(false);
  });

  it.each([
    ["missing", undefined],
    ["empty", ""],
    ["whitespace", "  "],
  ])("should stay STUN-only when TURN_SECRET is %s", (_label, secret) => {
    process.env.TURN_URL = "turn:h:3478?transport=udp";
    if (secret === undefined) delete process.env.TURN_SECRET;
    else process.env.TURN_SECRET = secret;

    expect(buildIceServers(PARTICIPANT)).toHaveLength(1);
    expect(isTurnConfigured()).toBe(false);
  });

  it("should sign with the trimmed secret", () => {
    process.env.TURN_URL = "turn:h:3478?transport=udp";
    process.env.TURN_SECRET = "  secret123 ";

    const [, { username, credential }] = buildIceServers(PARTICIPANT);

    expect(credential).toBe(
      createHmac("sha1", "secret123").update(String(username)).digest("base64")
    );
  });

  it("should report TURN as configured when a URL and a secret are set", () => {
    process.env.TURN_URL = "turn:h:3478?transport=udp";
    process.env.TURN_SECRET = "secret123";

    expect(isTurnConfigured()).toBe(true);
  });
});

describe("warnIfTurnNotConfigured", () => {
  const originalEnv = { ...process.env };
  let warnSpy: jest.SpyInstance;

  beforeEach(() => {
    warnSpy = jest.spyOn(console, "warn").mockImplementation(() => undefined);
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    warnSpy.mockRestore();
  });

  it("should warn on a production server when TURN is not configured", () => {
    process.env.NODE_ENV = "production";
    process.env.FRONTEND_URL = "https://tutor.kaluger.ru";
    delete process.env.TURN_URL;
    delete process.env.TURN_SECRET;

    warnIfTurnNotConfigured();

    expect(warnSpy).toHaveBeenCalledTimes(1);
    expect(warnSpy.mock.calls[0][0]).toMatch(/TURN_URL или TURN_SECRET.*docs\/ops\/turn-relay\.md/);
  });

  it("should stay quiet on a production server when TURN is configured", () => {
    process.env.NODE_ENV = "production";
    process.env.FRONTEND_URL = "https://tutor.kaluger.ru";
    process.env.TURN_URL = "turn:h:3478?transport=udp";
    process.env.TURN_SECRET = "secret123";

    warnIfTurnNotConfigured();

    expect(warnSpy).not.toHaveBeenCalled();
  });

  it.each([
    ["development", "https://tutor.kaluger.ru"],
    ["test", "https://tutor.kaluger.ru"],
    ["production", "http://localhost:3000"],
  ])("should stay quiet in %s on %s without TURN", (nodeEnv, frontendUrl) => {
    process.env.NODE_ENV = nodeEnv;
    process.env.FRONTEND_URL = frontendUrl;
    delete process.env.TURN_URL;
    delete process.env.TURN_SECRET;

    warnIfTurnNotConfigured();

    expect(warnSpy).not.toHaveBeenCalled();
  });
});
