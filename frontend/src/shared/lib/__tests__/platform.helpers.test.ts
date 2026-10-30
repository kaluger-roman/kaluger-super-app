import { afterEach, describe, expect, it, vi } from "vitest";

import { isAndroid, isIos } from "../platform.helpers";

const IPHONE_UA =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1";
const ANDROID_UA =
  "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Mobile Safari/537.36";
const DESKTOP_UA =
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36";

const useUserAgent = (userAgent: string) => {
  vi.spyOn(navigator, "userAgent", "get").mockReturnValue(userAgent);
};

afterEach(() => {
  vi.restoreAllMocks();
});

describe("shared/lib/platform.helpers", () => {
  it("should recognise an Android browser only on Android", () => {
    useUserAgent(ANDROID_UA);
    expect(isAndroid()).toBe(true);

    useUserAgent(IPHONE_UA);
    expect(isAndroid()).toBe(false);

    useUserAgent(DESKTOP_UA);
    expect(isAndroid()).toBe(false);
  });

  it("should recognise an iPhone, but not an Android phone", () => {
    useUserAgent(IPHONE_UA);
    expect(isIos()).toBe(true);

    useUserAgent(ANDROID_UA);
    expect(isIos()).toBe(false);
  });
});
