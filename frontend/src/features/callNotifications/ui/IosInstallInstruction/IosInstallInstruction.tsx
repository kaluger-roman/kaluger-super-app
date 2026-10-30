import type { FC } from "react";

import * as Styled from "./IosInstallInstruction.styled";
import {
  IOS_INSTALL_REASON,
  IOS_INSTALL_STEPS,
  IOS_SHARE_LABEL,
} from "../../callNotifications.constants";

export const IosInstallInstruction: FC = () => (
  <Styled.Root>
    <Styled.Reason variant="body2">{IOS_INSTALL_REASON}</Styled.Reason>
    <Styled.Steps variant="body2">
      <Styled.ShareLabel>
        {IOS_SHARE_LABEL}
        <Styled.ShareIcon aria-hidden />
      </Styled.ShareLabel>{" "}
      {IOS_INSTALL_STEPS}
    </Styled.Steps>
  </Styled.Root>
);
