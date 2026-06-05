import { Box, Typography } from "@mui/material";

import { styled } from "@shared";

export const Root = styled(Box)({
  position: "relative",
  width: "100%",
  height: "100%",
  minHeight: "100vh",
  display: "flex",
  flexDirection: "column",
  background: "radial-gradient(circle at 50% 20%, #0d2417 0%, #050d08 100%)",
});

export const Header = styled(Box)({
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 12,
  padding: "16px 20px",
  zIndex: 3,
});

export const HeaderInfo = styled(Box)({
  display: "flex",
  flexDirection: "column",
});

export const PeerName = styled(Typography)({
  color: "#ffffff",
  fontWeight: 600,
});

export const CallTimer = styled(Typography)({
  color: "rgba(255, 255, 255, 0.6)",
});

export const StageBox = styled(Box)({
  position: "relative",
  flex: 1,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "0 20px",
  minHeight: 0,
});

export const RemoteWrap = styled(Box)({
  width: "100%",
  maxWidth: 1040,
  aspectRatio: "16 / 9",
  maxHeight: "100%",
});

export const LocalPip = styled(Box)({
  position: "absolute",
  right: 36,
  bottom: 24,
  width: 220,
  height: 132,
  zIndex: 4,
  boxShadow: "0 10px 30px rgba(0, 0, 0, 0.5)",
  borderRadius: 16,
  "@media (max-width: 600px)": {
    right: 16,
    bottom: 16,
    width: 118,
    height: 158,
  },
});

export const BannerSlot = styled(Box)({
  position: "absolute",
  top: 12,
  left: "50%",
  transform: "translateX(-50%)",
  zIndex: 5,
  width: "max-content",
  maxWidth: "90%",
});

export const Controls = styled(Box)({
  zIndex: 3,
});
