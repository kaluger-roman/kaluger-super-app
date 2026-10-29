import { combine } from "effector";

import * as callModel from "./call.model";
import { getCallBannerText } from "./callBanner.helpers";
import * as callResumeModel from "./callResume.model";

// One source for the regular screen and the fullscreen layer, so neither loses a status.
export const $callBannerText = combine(
  callModel.$isConnecting,
  callResumeModel.$isOwnTransportLost,
  getCallBannerText
);
