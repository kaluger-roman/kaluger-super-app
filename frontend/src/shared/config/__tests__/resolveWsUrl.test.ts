import { afterEach, describe, expect, it, vi } from "vitest";

import { resolveWsUrl } from "../index";

describe("resolveWsUrl", () => {
  const originalLocation = window.location;

  const setLocation = (protocol: string, host: string) => {
    delete (window as { location?: Location }).location;
    (window as { location: Location }).location = {
      ...originalLocation,
      protocol,
      host,
    } as Location;
  };

  afterEach(() => {
    vi.unstubAllEnvs();
    (window as { location: Location }).location = originalLocation;
  });

  it("should use localhost:3001 in development regardless of page origin", () => {
    vi.stubEnv("NODE_ENV", "development");
    setLocation("https:", "tutor.kaluger.ru");

    expect(resolveWsUrl("/ws")).toBe("ws://localhost:3001/ws");
    expect(resolveWsUrl("/ws/student")).toBe("ws://localhost:3001/ws/student");
  });

  it("should use same-origin wss over https in production", () => {
    vi.stubEnv("NODE_ENV", "production");
    setLocation("https:", "tutor.kaluger.ru");

    expect(resolveWsUrl("/ws")).toBe("wss://tutor.kaluger.ru/ws");
    expect(resolveWsUrl("/ws/student")).toBe("wss://tutor.kaluger.ru/ws/student");
  });

  it("should use same-origin ws over http in production (QA Docker stack)", () => {
    vi.stubEnv("NODE_ENV", "production");
    setLocation("http:", "localhost:54213");

    expect(resolveWsUrl("/ws")).toBe("ws://localhost:54213/ws");
    expect(resolveWsUrl("/ws/student")).toBe("ws://localhost:54213/ws/student");
  });
});
