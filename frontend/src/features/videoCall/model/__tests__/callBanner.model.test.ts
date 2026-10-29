import { fork } from "effector";
import { describe, expect, it } from "vitest";

import { CONNECTING_TEXT, RECONNECTING_TEXT } from "../../videoCall.constants";
import * as callModel from "../call.model";
import type { CallPhase } from "../call.types";
import * as callBannerModel from "../callBanner.model";
import * as callResumeModel from "../callResume.model";

const bannerOf = (phase: CallPhase, ownTransportLost: boolean) =>
  fork({
    values: [
      [callModel.$callPhase, phase],
      [callResumeModel.$isOwnTransportLost, ownTransportLost],
    ],
  }).getState(callBannerModel.$callBannerText);

describe("features/videoCall/model/callBanner.model", () => {
  it("should tell that the call connects", () => {
    expect(bannerOf("connecting", false)).toBe(CONNECTING_TEXT);
  });

  it("should tell that the own connection is being restored, connecting or not", () => {
    expect(bannerOf("active", true)).toBe(RECONNECTING_TEXT);
    expect(bannerOf("connecting", true)).toBe(RECONNECTING_TEXT);
  });

  it("should show no banner in a connected call", () => {
    expect(bannerOf("active", false)).toBeNull();
  });
});
