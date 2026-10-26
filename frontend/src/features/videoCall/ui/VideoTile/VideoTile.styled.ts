import { Box, ButtonBase, CircularProgress, Typography } from "@mui/material";
import { alpha } from "@mui/material/styles";

import { styled } from "@shared";

import { ZOOM_SCALE_VAR, ZOOM_X_VAR, ZOOM_Y_VAR } from "./VideoTile.constants";
import { getTileBackground } from "./VideoTile.helpers";
import type { VideoFit, VideoLayout } from "./VideoTile.types";

type TileBoxProps = {
  $hasVideo: boolean;
  $isScreen: boolean;
  $bare: boolean;
  $minHeight: number;
  $inset: number;
  $gap: number;
};

// Three rows: the screen label and badges, the content, the name. Pills take their own rows,
// so nothing is offset by hand; `isolation` keeps the z-indexes below local to the tile.
export const TileBox = styled(Box)<TileBoxProps>(
  ({ $hasVideo, $isScreen, $bare, $minHeight, $inset, $gap }) => ({
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
    borderRadius: $bare ? 0 : 16,
    overflow: "hidden",
    border: $bare ? "none" : "1px solid rgba(255, 255, 255, 0.08)",
    background: getTileBackground({ hasVideo: $hasVideo, isScreen: $isScreen, bare: $bare }),
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

// The zoom changes every frame of a gesture, so it comes in as CSS variables set on the element,
// not as a styled prop that would generate a class per frame.
const ZOOMABLE_VIDEO = {
  transform: `translate(var(${ZOOM_X_VAR}, 0px), var(${ZOOM_Y_VAR}, 0px)) scale(var(${ZOOM_SCALE_VAR}, 1))`,
  transformOrigin: "center",
  willChange: "transform",
  // The page must not scroll or zoom under the fingers that zoom the screen.
  touchAction: "none",
  userSelect: "none",
} as const;

const GRABBABLE_VIDEO = {
  cursor: "grab",
  "&:active": {
    cursor: "grabbing",
  },
} as const;

type VideoElementProps = {
  $hidden: boolean;
  $fit: VideoFit;
  $layout: VideoLayout;
  $zoomable: boolean;
  $grabbable: boolean;
};

export const VideoElement = styled("video")<VideoElementProps>(
  ({ $hidden, $fit, $layout, $zoomable, $grabbable }) => ({
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
    ...($zoomable && ZOOMABLE_VIDEO),
    ...($grabbable && GRABBABLE_VIDEO),
    // iOS Safari draws its own play/pause button over a paused video without controls; the call
    // resumes the video itself and shows ResumeOverlay when that needs a tap. WebKit's controls
    // pseudo-elements only give way to !important.
    "&::-webkit-media-controls, &::-webkit-media-controls-panel, &::-webkit-media-controls-start-playback-button":
      {
        display: "none !important",
        WebkitAppearance: "none",
      },
  })
);

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

export const ResumeOverlay = styled(ButtonBase)(({ theme }) => ({
  position: "absolute",
  inset: 0,
  zIndex: 2,
  display: "flex",
  flexDirection: "column",
  gap: 8,
  padding: 16,
  color: theme.palette.common.white,
  background: "rgba(0, 0, 0, 0.55)",
  ...theme.typography.body2,
  textAlign: "center",
}));

export const InterruptionLabel = styled(Typography)(({ theme }) => ({
  display: "flex",
  alignItems: "center",
  gap: 8,
  maxWidth: "100%",
  padding: "6px 14px",
  borderRadius: 999,
  color: theme.palette.common.white,
  background: "rgba(0, 0, 0, 0.45)",
  fontWeight: 500,
  textAlign: "center",
  "& .MuiSvgIcon-root": {
    flexShrink: 0,
  },
}));

export const InterruptionSpinner = styled(CircularProgress)({
  flexShrink: 0,
});

// Amber and worded, unlike the red round "mic off" badge: nobody turned this mic off on purpose.
export const AudioNoticePill = styled(Box)(({ theme }) => ({
  minWidth: 0,
  display: "flex",
  alignItems: "center",
  gap: 6,
  padding: "5px 12px 5px 8px",
  borderRadius: 12,
  background: alpha(theme.palette.warning.main, 0.92),
  color: theme.palette.common.white,
  fontSize: 13,
  fontWeight: 500,
  lineHeight: 1.35,
  "& .MuiSvgIcon-root": {
    flexShrink: 0,
  },
}));

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

export const TopEnd = styled(Box)({
  marginLeft: "auto",
  flexShrink: 0,
  display: "flex",
  alignItems: "center",
  gap: 8,
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
