import { describe, expect, it } from "vitest";

import { CONNECTING_TEXT, RECONNECTING_TEXT } from "../../videoCall.constants";
import { getCallBannerText } from "../callBanner.helpers";

describe("features/videoCall/model/callBanner helpers", () => {
  it("should put the own lost connection before connecting", () => {
    expect(getCallBannerText(true, true)).toBe(RECONNECTING_TEXT);
    expect(getCallBannerText(false, true)).toBe(RECONNECTING_TEXT);
    expect(getCallBannerText(true, false)).toBe(CONNECTING_TEXT);
    expect(getCallBannerText(false, false)).toBeNull();
  });
});
