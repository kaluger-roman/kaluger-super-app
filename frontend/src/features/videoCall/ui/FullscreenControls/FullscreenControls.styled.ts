import { Box, Typography } from "@mui/material";

import { styled } from "@shared";

import { SHORT_STAGE_MEDIA, STACKED_BAR_MEDIA } from "../../videoCall.constants";

export const Layer = styled(Box)({
  position: "absolute",
  inset: 0,
  zIndex: 1,
  display: "flex",
  flexDirection: "column",
  pointerEvents: "none",
});

type BarProps = {
  $visible: boolean;
  $interactive: boolean;
};

// Hidden bars stay focusable: a Tab onto them is activity and brings them back. A pinch on a bar
// must not zoom the page.
const Bar = styled(Box)<BarProps>(({ $visible, $interactive }) => ({
  opacity: $visible ? 1 : 0,
  transition: "opacity 200ms ease",
  pointerEvents: $visible && $interactive ? "auto" : "none",
  touchAction: "none",
}));

export const TopBar = styled(Bar)({
  display: "flex",
  alignItems: "flex-start",
  gap: 12,
  padding: "max(12px, env(safe-area-inset-top)) 16px 40px",
  background:
    "linear-gradient(180deg, rgba(0, 0, 0, 0.85) 0%, rgba(0, 0, 0, 0.6) 55%, rgba(0, 0, 0, 0) 100%)",
  [SHORT_STAGE_MEDIA]: {
    paddingBottom: 20,
  },
});

export const NoticeSlot = styled(Box)({
  alignSelf: "flex-start",
  maxWidth: "calc(100% - 32px)",
  margin: "0 16px",
});

export const BannerSlot = styled(Box)({
  alignSelf: "center",
  maxWidth: "90%",
});

export const PeerInfo = styled(Box)({
  minWidth: 0,
  display: "flex",
  flexDirection: "column",
  gap: 4,
});

export const NameLine = styled(Box)({
  minWidth: 0,
  display: "flex",
  alignItems: "center",
  gap: 8,
});

export const PeerName = styled(Typography)(({ theme }) => ({
  color: theme.palette.common.white,
  fontWeight: 600,
  textShadow: "0 1px 3px rgba(0, 0, 0, 0.5)",
}));

export const MicBadge = styled(Box)(({ theme }) => ({
  flexShrink: 0,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  width: 24,
  height: 24,
  borderRadius: "50%",
  color: theme.palette.common.white,
  background: theme.palette.error.main,
  "& .MuiSvgIcon-root": {
    fontSize: 16,
  },
}));

export const MetaLine = styled(Box)({
  minWidth: 0,
  display: "flex",
  alignItems: "center",
  gap: 10,
});

export const CallTimer = styled(Typography)({
  flexShrink: 0,
  color: "rgba(255, 255, 255, 0.75)",
  fontVariantNumeric: "tabular-nums",
});

export const TopEnd = styled(Box)({
  marginLeft: "auto",
  flexShrink: 0,
});

export const BottomBar = styled(Bar)({
  marginTop: "auto",
  display: "grid",
  gridTemplateColumns: "minmax(0, 1fr) auto minmax(0, 1fr)",
  alignItems: "center",
  columnGap: 12,
  padding: "40px 16px env(safe-area-inset-bottom)",
  background:
    "linear-gradient(0deg, rgba(0, 0, 0, 0.85) 0%, rgba(0, 0, 0, 0.6) 60%, rgba(0, 0, 0, 0) 100%)",
  [SHORT_STAGE_MEDIA]: {
    paddingTop: 16,
  },
  [STACKED_BAR_MEDIA]: {
    gridTemplateColumns: "minmax(0, 1fr)",
  },
});

export const ControlsSlot = styled(Box)({
  gridColumn: "2",
  gridRow: "1",
  [STACKED_BAR_MEDIA]: {
    gridColumn: "1",
    gridRow: "2",
  },
});

export const ZoomSlot = styled(Box)({
  gridColumn: "3",
  gridRow: "1",
  justifySelf: "end",
  [STACKED_BAR_MEDIA]: {
    gridColumn: "1",
    gridRow: "1",
    justifySelf: "center",
  },
});
