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

// A shared screen gets the full stage height: a portrait window in a 16:9 box is tiny on a phone.
export const RemoteWrap = styled(Box)<{ $screen: boolean }>(({ $screen }) => ({
  width: "100%",
  maxWidth: 1040,
  aspectRatio: $screen ? "auto" : "16 / 9",
  alignSelf: $screen ? "stretch" : "auto",
  maxHeight: "100%",
}));

// While the peer shares a screen the PiP shrinks so it covers less of the shared content.
export const LocalPip = styled(Box)<{ $compact: boolean }>(({ $compact }) => ({
  position: "absolute",
  right: 36,
  bottom: 24,
  width: $compact ? 132 : 220,
  height: $compact ? 80 : 132,
  zIndex: 4,
  boxShadow: "0 10px 30px rgba(0, 0, 0, 0.5)",
  borderRadius: 16,
  "@media (max-width: 600px)": {
    right: 16,
    bottom: 16,
    width: $compact ? 72 : 118,
    height: $compact ? 96 : 158,
  },
}));

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
