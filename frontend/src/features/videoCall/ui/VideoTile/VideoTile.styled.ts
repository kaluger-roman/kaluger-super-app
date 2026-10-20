import { Box, Typography } from "@mui/material";

import { styled } from "@shared";

import { SHORT_STAGE_MEDIA } from "./VideoTile.constants";
import type { VideoFit } from "./VideoTile.types";

type TileBoxProps = {
  $hasVideo: boolean;
  $isScreen: boolean;
  $isSelf: boolean;
};

export const TileBox = styled(Box)<TileBoxProps>(({ $hasVideo, $isScreen, $isSelf }) => ({
  position: "relative",
  width: "100%",
  height: "100%",
  // The own tile fills the PiP, which is shorter than the minimum of the main tile.
  minHeight: $isSelf ? 0 : 180,
  borderRadius: 16,
  overflow: "hidden",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "16px 12px 52px",
  boxSizing: "border-box",
  border: "1px solid rgba(255, 255, 255, 0.08)",
  background: $isScreen
    ? "linear-gradient(160deg, #102a17 0%, #0a1f10 100%)"
    : $hasVideo
      ? "linear-gradient(140deg, #1f5132 0%, #0c2a17 55%, #06160c 100%)"
      : "#10231a",
}));

type VideoElementProps = {
  $hidden: boolean;
  $fit: VideoFit;
  $padded: boolean;
};

export const VideoElement = styled("video")<VideoElementProps>(({ $hidden, $fit, $padded }) => ({
  position: "absolute",
  // A padded screen stays clear of the label pill on top and the name pill below.
  top: $padded ? 44 : 0,
  bottom: $padded ? 44 : 0,
  left: 0,
  right: 0,
  width: "100%",
  height: $padded ? "calc(100% - 88px)" : "100%",
  objectFit: $fit,
  visibility: $hidden ? "hidden" : "visible",
  [SHORT_STAGE_MEDIA]: { top: 0, bottom: 0, height: "100%" },
}));

export const PlaceholderColumn = styled(Box)({
  position: "relative",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  gap: 8,
  zIndex: 1,
});

export const PlaceholderLabel = styled(Typography)({
  color: "rgba(255, 255, 255, 0.7)",
  display: "flex",
  alignItems: "center",
  gap: 6,
});

export const NameChipRow = styled(Box)({
  position: "absolute",
  left: 12,
  right: 12,
  bottom: 12,
  zIndex: 2,
  display: "flex",
  alignItems: "center",
  gap: 8,
});

export const NamePill = styled(Box)({
  maxWidth: "100%",
  padding: "4px 10px",
  borderRadius: 999,
  background: "rgba(0, 0, 0, 0.55)",
  color: "#ffffff",
  fontSize: 13,
  fontWeight: 500,
  lineHeight: 1.4,
  backdropFilter: "blur(4px)",
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
});

type StatusBadgeProps = {
  $variant: "muted" | "screen";
  $compact: boolean;
};

export const StatusBadge = styled(Box)<StatusBadgeProps>(({ $variant, $compact }) => ({
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  width: $compact ? 20 : 28,
  height: $compact ? 20 : 28,
  borderRadius: "50%",
  color: "#ffffff",
  background: $variant === "screen" ? "rgba(46, 125, 71, 0.9)" : "rgba(211, 47, 47, 0.9)",
  "& .MuiSvgIcon-root": {
    fontSize: $compact ? 14 : 20,
  },
}));

export const TopRightBadges = styled(Box)<{ $compact: boolean }>(({ $compact }) => ({
  position: "absolute",
  top: $compact ? 6 : 12,
  right: $compact ? 6 : 12,
  zIndex: 2,
  display: "flex",
  gap: 8,
}));

export const ScreenLabelPill = styled(Box)({
  position: "absolute",
  top: 12,
  left: 12,
  right: 12,
  zIndex: 3,
  width: "fit-content",
  maxWidth: "calc(100% - 24px)",
  display: "flex",
  alignItems: "center",
  gap: 6,
  padding: "4px 10px",
  borderRadius: 999,
  background: "rgba(46, 125, 71, 0.92)",
  color: "#ffffff",
  fontSize: 13,
  fontWeight: 500,
  whiteSpace: "nowrap",
  overflow: "hidden",
  "& .MuiSvgIcon-root": {
    flexShrink: 0,
  },
  [SHORT_STAGE_MEDIA]: {
    background: "rgba(46, 125, 71, 0.6)",
  },
});

export const ScreenLabelText = styled(Box)({
  minWidth: 0,
  overflow: "hidden",
  textOverflow: "ellipsis",
});
