import {
  CALL_BACKGROUND_MOCK_DEFAULT,
  CALL_BACKGROUND_MOCKS,
} from "./callBackgroundMock.constants";
import type { CallBackgroundMock } from "./callBackgroundMock.types";

// TODO(auto-feature): mockup-only reader of the preview route's `?state=`; delete with the mocks.
export const getCallBackgroundMock = (): CallBackgroundMock =>
  CALL_BACKGROUND_MOCKS[new URLSearchParams(window.location.search).get("state") ?? ""] ??
  CALL_BACKGROUND_MOCK_DEFAULT;
