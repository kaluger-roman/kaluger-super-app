import { Box, Card, Chip, Typography } from "@mui/material";

import { styled } from "@shared";

const statusBorder: Record<string, string> = {
  SCHEDULED: "#1976d2",
  COMPLETED: "#2e7d32",
  CANCELLED: "#d32f2f",
  RESCHEDULED: "#ed6c02",
  IN_PROGRESS: "#0288d1",
};

export const StyledCard = styled(Card)<{ $status: string }>(
  ({ theme, $status }) => ({
    padding: theme.spacing(2),
    borderLeftWidth: "4px",
    borderLeftStyle: "solid",
    borderLeftColor: statusBorder[$status] ?? theme.palette.divider,
    display: "flex",
    flexDirection: "column",
    gap: theme.spacing(0.5),
  })
);

export const HeaderRow = styled(Box)(({ theme }) => ({
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: theme.spacing(1),
}));

export const TimeRow = styled(Box)(({ theme }) => ({
  display: "flex",
  gap: theme.spacing(1),
  alignItems: "center",
}));

export const SubjectText = styled(Typography)({
  fontWeight: 600,
});

export const StatusChip = styled(Chip)({
  fontWeight: 500,
});
