import { Box, Typography } from "@mui/material";

import { styled } from "@shared";

import { SHORT_STAGE_MEDIA } from "./VideoTile.constants";
import type { VideoFit, VideoLayout } from "./VideoTile.types";

type TileBoxProps = {
  $hasVideo: boolean;
  $isScreen: boolean;
  $minHeight: number;
  $inset: number;
  $gap: number;
};

// Three rows: the screen label and badges, the content, the name. Pills take their own rows,
// so nothing is offset by hand; `isolation` keeps the z-indexes below local to the tile.
export const TileBox = styled(Box)<TileBoxProps>(
  ({ $hasVideo, $isScreen, $minHeight, $inset, $gap }) => ({
    position: "relative",
    isolation: "isolate",
    width: "100%",
    height: "100%",
    minHeight: $minHeight,
    display: "grid",
    gridTemplateRows: "auto minmax(0, 1fr) auto",
    gridTemplateColumns: "minmax(0, 1fr)",
    gap: $gap,
    padding: $inset,
    boxSizing: "border-box",
    borderRadius: 16,
    overflow: "hidden",
    border: "1px solid rgba(255, 255, 255, 0.08)",
    background: $isScreen
      ? "linear-gradient(160deg, #102a17 0%, #0a1f10 100%)"
      : $hasVideo
        ? "linear-gradient(140deg, #1f5132 0%, #0c2a17 55%, #06160c 100%)"
        : "#10231a",
  })
);

const OVERLAY_VIDEO = {
  position: "absolute",
  top: 0,
  right: 0,
  bottom: 0,
  left: 0,
  width: "100%",
  height: "100%",
} as const;

type VideoElementProps = {
  $hidden: boolean;
  $fit: VideoFit;
  $layout: VideoLayout;
};

export const VideoElement = styled("video")<VideoElementProps>(({ $hidden, $fit, $layout }) => ({
  ...($layout === "framed"
    ? {
        position: "relative",
        gridRow: "2",
        gridColumn: "1",
        width: "100%",
        height: "100%",
        minHeight: 0,
      }
    : OVERLAY_VIDEO),
  zIndex: 0,
  objectFit: $fit,
  visibility: $hidden ? "hidden" : "visible",
}));

export const PlaceholderColumn = styled(Box)({
  gridRow: "2",
  gridColumn: "1",
  alignSelf: "center",
  justifySelf: "center",
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

export const TopRow = styled(Box)({
  gridRow: "1",
  gridColumn: "1",
  zIndex: 1,
  display: "flex",
  alignItems: "flex-start",
  gap: 8,
  minWidth: 0,
});

export const NameRow = styled(Box)({
  gridRow: "3",
  gridColumn: "1",
  zIndex: 1,
  display: "flex",
  alignItems: "center",
  gap: 6,
  minWidth: 0,
});

export const NamePill = styled(Box)<{ $paddingX: number }>(({ $paddingX }) => ({
  maxWidth: "100%",
  padding: `4px ${$paddingX}px`,
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
}));

export const StatusBadge = styled(Box)<{ $size: number }>(({ theme, $size }) => ({
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  flexShrink: 0,
  marginLeft: "auto",
  width: $size,
  height: $size,
  borderRadius: "50%",
  color: theme.palette.common.white,
  background: theme.palette.error.main,
  "& .MuiSvgIcon-root": {
    fontSize: Math.round($size * 0.7),
  },
}));

export const ScreenLabelPill = styled(Box)({
  minWidth: 0,
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
