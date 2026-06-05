import { Box, Typography } from "@mui/material";

import { styled } from "@shared";

type TileBoxProps = {
  $hasVideo: boolean;
  $isScreen: boolean;
};

export const TileBox = styled(Box)<TileBoxProps>(({ $hasVideo, $isScreen }) => ({
  position: "relative",
  width: "100%",
  height: "100%",
  minHeight: 180,
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

export const FakeVideoPattern = styled(Box)({
  position: "absolute",
  inset: 0,
  opacity: 0.5,
  backgroundImage:
    "radial-gradient(circle at 30% 25%, rgba(129, 199, 132, 0.45) 0, transparent 38%), radial-gradient(circle at 75% 70%, rgba(76, 175, 80, 0.35) 0, transparent 42%)",
});

export const VideoElement = styled("video")<{ $hidden: boolean }>(
  ({ $hidden }) => ({
    position: "absolute",
    inset: 0,
    width: "100%",
    height: "100%",
    objectFit: "cover",
    visibility: $hidden ? "hidden" : "visible",
  })
);

export const ScreenMock = styled(Box)({
  position: "absolute",
  top: 52,
  right: 16,
  bottom: 52,
  left: 16,
  borderRadius: 8,
  background: "#f4f7f5",
  boxShadow: "0 12px 40px rgba(0, 0, 0, 0.45)",
  display: "flex",
  flexDirection: "column",
  overflow: "hidden",
});

export const ScreenMockBar = styled(Box)({
  height: 26,
  background: "#dfe7e1",
  display: "flex",
  alignItems: "center",
  gap: 6,
  paddingLeft: 10,
});

export const ScreenMockDot = styled(Box)({
  width: 9,
  height: 9,
  borderRadius: "50%",
  background: "#b6c4bb",
});

export const ScreenMockBody = styled(Box)({
  flex: 1,
  padding: 12,
  display: "flex",
  flexDirection: "column",
  gap: 8,
});

type ScreenMockLineProps = {
  $width: string;
};

export const ScreenMockLine = styled(Box)<ScreenMockLineProps>(({ $width }) => ({
  height: 12,
  width: $width,
  borderRadius: 6,
  background: "#c8e6c8",
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
};

export const StatusBadge = styled(Box)<StatusBadgeProps>(({ $variant }) => ({
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  width: 28,
  height: 28,
  borderRadius: "50%",
  color: "#ffffff",
  background: $variant === "screen" ? "rgba(46, 125, 71, 0.9)" : "rgba(211, 47, 47, 0.9)",
}));

export const TopRightBadges = styled(Box)({
  position: "absolute",
  top: 12,
  right: 12,
  zIndex: 2,
  display: "flex",
  gap: 8,
});

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
});

export const ScreenLabelText = styled(Box)({
  minWidth: 0,
  overflow: "hidden",
  textOverflow: "ellipsis",
});
