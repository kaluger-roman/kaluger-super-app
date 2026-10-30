import { Box, Typography } from "@mui/material";

import { styled } from "@shared";

export const SectionTitle = styled(Typography)(({ theme }) => ({
  fontWeight: 600,
  marginBottom: theme.spacing(1),
}));

export const List = styled(Box)(({ theme }) => ({
  display: "flex",
  flexDirection: "column",
  border: `1px solid ${theme.palette.divider}`,
  borderRadius: 8,
}));

export const Row = styled(Box)(({ theme }) => ({
  display: "flex",
  alignItems: "center",
  flexWrap: "wrap",
  gap: theme.spacing(1, 1.5),
  padding: theme.spacing(1, 1.5),
  "& + &": {
    borderTop: `1px solid ${theme.palette.divider}`,
  },
}));

export const RowMain = styled(Box)(({ theme }) => ({
  display: "flex",
  alignItems: "center",
  gap: theme.spacing(1),
  flex: "1 1 auto",
  color: theme.palette.text.secondary,
  "& .MuiTypography-root": {
    whiteSpace: "nowrap",
  },
}));

export const RowSide = styled(Box)(({ theme }) => ({
  display: "flex",
  alignItems: "center",
  gap: theme.spacing(1.5),
  marginLeft: "auto",
}));

export const Duration = styled(Typography)({
  display: "flex",
  alignItems: "center",
  gap: 4,
  minWidth: 56,
  justifyContent: "flex-end",
  fontVariantNumeric: "tabular-nums",
});
