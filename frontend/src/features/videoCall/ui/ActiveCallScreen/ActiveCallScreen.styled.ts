import { Box, Typography } from "@mui/material";

import { styled } from "@shared";

import { CALL_SCREEN_BACKGROUND } from "../../videoCall.constants";

type RootProps = {
  $fullscreen: boolean;
  $hideCursor: boolean;
};

// Stacking order of the screen: stage < own PiP / fullscreen controls < connection banner. The
// hidden cursor is inherited: hidden bars take no pointers and a zoomed video drops its grab.
export const Root = styled(Box)<RootProps>(({ $fullscreen, $hideCursor }) => ({
  position: "relative",
  isolation: "isolate",
  width: "100%",
  height: "100%",
  display: "flex",
  flexDirection: "column",
  background: $fullscreen ? "#000000" : CALL_SCREEN_BACKGROUND,
  cursor: $hideCursor ? "none" : "auto",
}));

export const Header = styled(Box)({
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 12,
  padding: "16px 20px",
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

export const StageBox = styled(Box)<{ $fullscreen: boolean }>(({ $fullscreen }) => ({
  position: "relative",
  flex: 1,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: $fullscreen ? 0 : "0 20px",
  minHeight: 0,
}));

type RemoteWrapProps = {
  $screen: boolean;
  $fullscreen: boolean;
  $interrupted: boolean;
};

// A shared screen gets the full stage height: a portrait window in a 16:9 box is tiny on a phone.
// An interrupted peer gets a taller tile on a phone: a 16:9 strip has no room for the status and
// notice.
export const RemoteWrap = styled(Box)<RemoteWrapProps>(
  ({ $screen, $fullscreen, $interrupted }) => ({
    width: "100%",
    maxWidth: $fullscreen ? "none" : 1040,
    aspectRatio: $screen || $fullscreen ? "auto" : "16 / 9",
    alignSelf: $screen || $fullscreen ? "stretch" : "auto",
    maxHeight: "100%",
    // A double tap toggles the mode instead of zooming the page, and taps are not delayed. In the
    // mode a pinch must not zoom the page either: only a shared screen zooms, inside the video.
    touchAction: $fullscreen ? "none" : "manipulation",
    "@media (max-width: 600px) and (orientation: portrait)":
      $interrupted && !$fullscreen ? { aspectRatio: "5 / 4" } : {},
  })
);

// While the peer shares a screen the PiP shrinks so it covers less of the shared content.
export const LocalPip = styled(Box)<{ $compact: boolean }>(({ $compact }) => ({
  position: "absolute",
  right: 36,
  bottom: 24,
  width: $compact ? 132 : 220,
  height: $compact ? 80 : 132,
  zIndex: 1,
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
  zIndex: 2,
  width: "max-content",
  maxWidth: "90%",
});

// The second tap of a double tap that left the mode lands where these buttons appear.
export const ControlsGuard = styled(Box)<{ $interactive: boolean }>(({ $interactive }) => ({
  pointerEvents: $interactive ? "auto" : "none",
}));
