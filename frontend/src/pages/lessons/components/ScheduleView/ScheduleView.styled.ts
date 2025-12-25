import { Box } from "@mui/material";

import { styled } from "@shared";

export const ScheduleContainer = styled(Box)(({ theme }) => ({
  display: "flex",
  flexDirection: "column",
  border: `1px solid ${theme.palette.divider}`,
  borderRadius: theme.shape.borderRadius,
}));

export const Header = styled(Box)(({ theme }) => ({
  display: "flex",
  backgroundColor: theme.palette.background.paper,
  borderBottom: `1px solid ${theme.palette.divider}`,
  position: "sticky",
  top: 64,
  zIndex: 35,
  borderTopLeftRadius: theme.shape.borderRadius,
  borderTopRightRadius: theme.shape.borderRadius,
  overflow: "hidden",
}));

export const TimeColumn = styled(Box)(({ theme }) => ({
  width: "80px",
  backgroundColor: theme.palette.background.default,
  borderRight: `1px solid ${theme.palette.divider}`,
  flexShrink: 0,
}));

export const ScrollContainer = styled(Box)({
  display: "flex",
  overflow: "visible",
  position: "relative",
});

export const LoaderOverlay = styled(Box)(() => ({
  position: "absolute",
  inset: 0,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  backgroundColor: "rgba(255,255,255,0.6)",
  zIndex: 20,
  pointerEvents: "auto",
}));

export const MainScrollArea = styled(Box)<{ $isLoading: boolean }>(({ $isLoading }) => ({
  display: "flex",
  overflowX: "auto",
  overflowY: "visible",
  pointerEvents: $isLoading ? "none" : "auto",
}));

export const TimeGrid = styled(Box)(({ theme }) => ({
  display: "flex",
  flexDirection: "column",
  width: "80px",
  flexShrink: 0,
  position: "sticky",
  left: 0,
  zIndex: 30,
  height: "fit-content",
  backgroundColor: theme.palette.background.default,
  borderRight: `1px solid ${theme.palette.divider}`,
}));

export const DaysGrid = styled(Box)({
  display: "flex",
  flex: 1,
  overflowX: "auto",
  overflowY: "hidden",
});

export const ContentGrid = styled(Box)({
  display: "flex",
  minWidth: "fit-content",
  height: "fit-content",
});

export const DayColumn = styled(Box)<{ $isToday?: boolean }>(({ theme, $isToday }) => ({
  width: `180px`,
  minWidth: `180px`,
  borderRight: `1px solid ${theme.palette.divider}`,
  display: "flex",
  flexDirection: "column",
  position: "relative",
  overflow: "hidden",
  backgroundColor: $isToday ? theme.palette.action.hover : undefined,
}));

export const TimeSlot = styled(Box)<{ $height: number }>(({ theme, $height }) => ({
  height: `${$height}px`,
  minHeight: `${$height}px`,
  borderBottom: `1px solid ${theme.palette.divider}`,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  zIndex: 30,
}));

export const LessonSlot = styled(Box)<{ $height: number }>(({ theme, $height }) => ({
  height: `${$height}px`,
  minHeight: `${$height}px`,
  borderBottom: `1px solid ${theme.palette.divider}`,
  position: "relative",
  display: "flex",
  alignItems: "center",
  padding: "2px",
}));

export const DayHeader = styled(Box)(({ theme }) => ({
  height: "80px",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  backgroundColor: theme.palette.background.paper,
  borderBottom: `1px solid ${theme.palette.divider}`,
  position: "sticky",
  top: 0,
  zIndex: 1,
  padding: "4px 2px",
}));
