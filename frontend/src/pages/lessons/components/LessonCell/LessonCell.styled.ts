import type { Theme } from "@mui/material";
import { Box, Typography, Chip } from "@mui/material";

import { styled, type Lesson } from "@shared";

type LessonCardProps = {
  $status: Lesson["status"];
  $compact?: boolean;
};

const getStatusColor = (status: Lesson["status"], theme: Theme) => {
  switch (status) {
    case "SCHEDULED":
      return {
        background: theme.palette.primary.light,
        border: `1px solid ${theme.palette.primary.main}`,
        color: theme.palette.primary.contrastText,
      };
    case "COMPLETED":
      return {
        background: theme.palette.success.light,
        border: `1px solid ${theme.palette.success.main}`,
        color: theme.palette.success.contrastText,
      };
    case "CANCELLED":
      return {
        background: theme.palette.error.light,
        border: `1px solid ${theme.palette.error.main}`,
        color: theme.palette.error.contrastText,
      };
    case "RESCHEDULED":
      return {
        background: theme.palette.warning.light,
        border: `1px solid ${theme.palette.warning.main}`,
        color: theme.palette.warning.contrastText,
      };
    case "IN_PROGRESS":
      return {
        background: theme.palette.info.light,
        border: `1px solid ${theme.palette.info.main}`,
        color: theme.palette.info.contrastText,
      };
    default:
      return {
        background: theme.palette.grey[100],
        border: `1px solid ${theme.palette.grey[300]}`,
        color: theme.palette.text.primary,
      };
  }
};

export const LessonCard = styled(Box)<LessonCardProps>(({ theme, $status, $compact }) => {
  const statusColor = getStatusColor($status, theme);

  const base = {
    ...statusColor,
    borderRadius: theme.shape.borderRadius,
    cursor: "pointer",
    height: "100%",
    margin: "2px",
    transition: "all 0.2s ease-in-out",
    "&:hover": {
      transform: "translateY(-1px)",
      boxShadow: theme.shadows[2],
    },
  };

  if ($compact) {
    return {
      ...base,
      margin: "1px",
      height: "calc(100% - 3px)",
      padding: "0px 4px",
      borderRadius: "4px",
      minHeight: "24px",
      display: "flex",
      flexDirection: "row",
      gap: theme.spacing(0.5),
      alignItems: "center",
    };
  }

  return {
    ...base,
    padding: theme.spacing(1),
    minHeight: "110px",
    height: "calc(100% - 6px)",
    display: "flex",
    flexDirection: "column",
    gap: theme.spacing(0.5),
  };
});

export const StyledCaption = styled(Typography)({
  fontWeight: 600,
});

export const StatusChip = styled(Chip)({
  fontSize: "10px",
  height: "16px",
  "& .MuiChip-label": {
    padding: "0 4px",
  },
});

export const UnpaidChip = styled(Chip)({
  fontSize: "9px",
  height: "14px",
  "& .MuiChip-label": {
    padding: "0 3px",
  },
});
