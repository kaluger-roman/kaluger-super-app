import type { FC } from "react";

import { WifiTetheringError as ReconnectIcon } from "@mui/icons-material";

import * as Styled from "./CallStatusBanner.styled";

type CallStatusBannerProps = {
  text: string;
};

export const CallStatusBanner: FC<CallStatusBannerProps> = ({ text }) => (
  <Styled.BannerBox role="status">
    <ReconnectIcon fontSize="small" />
    <Styled.BannerText variant="body2">{text}</Styled.BannerText>
  </Styled.BannerBox>
);
