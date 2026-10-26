import type { FC } from "react";
import { useMemo } from "react";

import { Provider } from "effector-react";

import { CallOverlay } from "@features";

import { createCallPreviewScope } from "../../CallBackgroundMockupPage.helpers";
import type { CallPreviewConfig } from "../../CallBackgroundMockupPage.types";

type CallScreenPreviewProps = {
  config: CallPreviewConfig;
};

// The real call overlay over a scope that pretends a call is active; the presence part of each
// state comes from the call feature's callBackgroundMock (`?state=`).
export const CallScreenPreview: FC<CallScreenPreviewProps> = ({ config }) => {
  const scope = useMemo(() => createCallPreviewScope(config), [config]);

  return (
    <Provider value={scope}>
      <CallOverlay />
    </Provider>
  );
};
