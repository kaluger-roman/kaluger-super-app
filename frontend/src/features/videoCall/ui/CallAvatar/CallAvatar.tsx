import type { FC } from "react";

import * as Styled from "./CallAvatar.styled";
import { getInitials } from "../../videoCall.helpers";

type CallAvatarProps = {
  name: string;
  size?: number;
};

export const CallAvatar: FC<CallAvatarProps> = ({ name, size = 96 }) => (
  <Styled.AvatarCircle $size={size} aria-hidden>
    {getInitials(name)}
  </Styled.AvatarCircle>
);
