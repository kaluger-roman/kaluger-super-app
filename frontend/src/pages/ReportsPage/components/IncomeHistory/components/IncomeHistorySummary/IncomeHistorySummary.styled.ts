import { Box, Typography } from "@mui/material";

import { styled } from "@shared";

import { SUMMARY_TONES } from "./IncomeHistorySummary.constants";
import type { SummaryTone } from "./IncomeHistorySummary.types";

export const Tiles = styled(Box)(({ theme }) => ({
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))",
  gap: theme.spacing(1.5),
  [theme.breakpoints.down("sm")]: {
    gridTemplateColumns: "1fr 1fr",
    gap: theme.spacing(1),
  },
}));

export const Tile = styled(Box)<{ $tone: SummaryTone }>(({ theme, $tone }) => ({
  display: "flex",
  flexDirection: "column",
  minWidth: 0,
  padding: theme.spacing(1.5, 2),
  borderRadius: 12,
  backgroundColor: SUMMARY_TONES[$tone].background,
  color: SUMMARY_TONES[$tone].color,
  [theme.breakpoints.down("sm")]: {
    padding: theme.spacing(1, 1.25),
  },
}));

export const Label = styled(Typography)({
  color: "rgba(0, 0, 0, 0.6)",
  fontWeight: 500,
});

export const Value = styled(Typography)({
  fontWeight: 700,
  lineHeight: 1.3,
  whiteSpace: "nowrap",
});

export const Hint = styled(Typography)({
  color: "rgba(0, 0, 0, 0.6)",
});
