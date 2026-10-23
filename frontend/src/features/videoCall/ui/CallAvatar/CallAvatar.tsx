import type { FC } from "react";

import { Person as PersonIcon } from "@mui/icons-material";

import * as Styled from "./CallAvatar.styled";
import { getInitials } from "../../videoCall.helpers";

type CallAvatarProps = {
  name: string;
  size?: number;
  isSelf?: boolean;
};

export const CallAvatar: FC<CallAvatarProps> = ({ name, size = 96, isSelf = false }) => (
  <Styled.AvatarCircle $size={size} aria-hidden>
    {isSelf ? <PersonIcon fontSize="inherit" /> : getInitials(name)}
  </Styled.AvatarCircle>
);
