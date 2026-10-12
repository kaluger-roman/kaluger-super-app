import { Box, List, Typography } from "@mui/material";

import { styled } from "@shared";

export const Container = styled("section")({
  display: "flex",
  flexDirection: "column",
});

export const Header = styled(Box)(({ theme }) => ({
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: theme.spacing(2),
  padding: theme.spacing(1, 2),
  borderRadius: 8,
  backgroundColor: "#f5f7f6",
  [theme.breakpoints.down("sm")]: {
    padding: theme.spacing(1, 1.25),
    gap: theme.spacing(1),
  },
}));

export const HeaderMain = styled(Box)(({ theme }) => ({
  display: "flex",
  alignItems: "baseline",
  flexWrap: "wrap",
  columnGap: theme.spacing(1.5),
  minWidth: 0,
  [theme.breakpoints.down("sm")]: {
    flexDirection: "column",
  },
}));

export const HeaderTotals = styled(Box)(({ theme }) => ({
  display: "flex",
  alignItems: "baseline",
  flexWrap: "wrap",
  justifyContent: "flex-end",
  columnGap: theme.spacing(1.5),
  textAlign: "right",
  flexShrink: 0,
  [theme.breakpoints.down("sm")]: {
    flexDirection: "column",
    alignItems: "flex-end",
  },
}));

export const DayLabel = styled(Typography)(({ theme }) => ({
  fontWeight: 600,
  [theme.breakpoints.down("sm")]: {
    fontSize: "0.9375rem",
    lineHeight: 1.4,
  },
}));

export const DayTotal = styled(Typography)({
  fontWeight: 700,
  color: "#00695c",
  whiteSpace: "nowrap",
});

export const Muted = styled(Typography)({
  color: "rgba(0, 0, 0, 0.6)",
  whiteSpace: "nowrap",
});

export const Rows = styled(List)({
  "& > li:not(:last-of-type)": {
    borderBottom: "1px solid rgba(0, 0, 0, 0.08)",
  },
});
