import { Box, IconButton, Typography } from "@mui/material";

import { styled } from "@shared";

export const HintBox = styled(Box)(({ theme }) => ({
  alignSelf: "center",
  display: "flex",
  alignItems: "flex-start",
  gap: 10,
  width: "calc(100% - 40px)",
  maxWidth: 640,
  margin: "0 20px 12px",
  padding: "10px 6px 10px 14px",
  boxSizing: "border-box",
  borderRadius: 12,
  color: theme.palette.common.white,
  background: "rgba(255, 255, 255, 0.1)",
  border: "1px solid rgba(255, 255, 255, 0.16)",
  backdropFilter: "blur(6px)",
  "& > .MuiSvgIcon-root": {
    flexShrink: 0,
    marginTop: 2,
  },
  [theme.breakpoints.down("sm")]: {
    width: "calc(100% - 32px)",
    margin: "0 16px 8px",
  },
}));

export const HintText = styled(Typography)({
  flex: 1,
  color: "rgba(255, 255, 255, 0.9)",
});

export const CloseButton = styled(IconButton)({
  flexShrink: 0,
  marginTop: -4,
  color: "rgba(255, 255, 255, 0.7)",
});
