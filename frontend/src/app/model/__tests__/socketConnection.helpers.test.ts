import { afterEach, describe, expect, it, vi } from "vitest";

import {
  buildSocketUrl,
  parseSocketMessage,
  toControlMessage,
  toSocketClose,
} from "../socketConnection.helpers";

const TAB_ID_PATTERN = /^[A-Za-z0-9-]{1,64}$/;
const REVOKED = new Set([1008, 4001]);
const closeWith = (code: number) => ({ ws: {} as WebSocket, code, token: "t-1" });

describe("app/model/socketConnection.helpers buildSocketUrl", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.resetModules();
  });

  it("should send the token, a stable tab id and resume only when asked", () => {
    const first = new URL(buildSocketUrl("/ws", "a b", true));
    const second = new URL(buildSocketUrl("/ws", "a b", false));

    expect(first.pathname).toBe("/ws");
    expect(first.searchParams.get("token")).toBe("a b");
    expect(first.searchParams.get("resume")).toBe("1");
    expect(second.searchParams.get("resume")).toBeNull();
    expect(first.searchParams.get("tab")).toMatch(TAB_ID_PATTERN);
    expect(second.searchParams.get("tab")).toBe(first.searchParams.get("tab"));
  });

  it("should build a valid tab id without crypto.randomUUID (plain http on a LAN)", async () => {
    vi.stubGlobal("crypto", {});
    const helpers = await import("../socketConnection.helpers");

    const url = new URL(helpers.buildSocketUrl("/ws", "t", false));

    expect(url.searchParams.get("tab")).toMatch(TAB_ID_PATTERN);
  });
});

describe("app/model/socketConnection.helpers parseSocketMessage", () => {
  it("should parse JSON and log and drop anything else", () => {
    const logged = vi.spyOn(console, "error").mockImplementation(() => undefined);

    expect(parseSocketMessage('{"type":"x"}', "WS")).toEqual({ type: "x" });
    expect(parseSocketMessage("not json", "WS")).toBeUndefined();
    expect(parseSocketMessage(new ArrayBuffer(1), "WS")).toBeUndefined();
    expect(logged).toHaveBeenCalledTimes(1);
    logged.mockRestore();
  });
});

describe("app/model/socketConnection.helpers toControlMessage", () => {
  it("should recognize the connection control messages only", () => {
    expect(toControlMessage({ type: "connection_ready" })).toBe("ready");
    expect(toControlMessage({ type: "connection_waiting", reason: "call" })).toBe("waiting");
    expect(toControlMessage({ type: "lesson_deleted" })).toBeNull();
    expect(toControlMessage(null)).toBeNull();
    expect(toControlMessage(1)).toBeNull();
    expect(toControlMessage("connection_ready")).toBeNull();
  });
});

describe("app/model/socketConnection.helpers toSocketClose", () => {
  it("should map close codes to what the tab does next", () => {
    expect(toSocketClose(closeWith(4000), REVOKED)).toEqual({
      revokedToken: null,
      elsewhere: "tab",
      callEnded: false,
    });
    expect(toSocketClose(closeWith(4003), REVOKED)).toEqual({
      revokedToken: null,
      elsewhere: null,
      callEnded: true,
    });
    expect(toSocketClose(closeWith(4001), REVOKED).revokedToken).toBe("t-1");
    expect(toSocketClose(closeWith(4001), new Set()).revokedToken).toBeNull();
    expect(toSocketClose(closeWith(1006), REVOKED)).toEqual({
      revokedToken: null,
      elsewhere: null,
      callEnded: false,
    });
  });
});
