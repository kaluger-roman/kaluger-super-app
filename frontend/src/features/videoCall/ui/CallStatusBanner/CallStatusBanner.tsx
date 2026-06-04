import type { FC } from "react";

import {
  ErrorOutline as ErrorOutlineIcon,
  WifiTetheringError as ReconnectIcon,
} from "@mui/icons-material";

import * as Styled from "./CallStatusBanner.styled";

type CallStatusBannerProps = {
  variant: "info" | "error";
  text: string;
};

export const CallStatusBanner: FC<CallStatusBannerProps> = ({ variant, text }) => (
  <Styled.BannerBox $variant={variant} role="status">
    {variant === "error" ? (
      <ErrorOutlineIcon fontSize="small" />
    ) : (
      <ReconnectIcon fontSize="small" />
    )}
    <Styled.BannerText variant="body2">{text}</Styled.BannerText>
  </Styled.BannerBox>
);
