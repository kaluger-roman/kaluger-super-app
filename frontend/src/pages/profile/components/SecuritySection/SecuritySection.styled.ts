import { Box, Paper, Typography } from "@mui/material";

import { styled } from "@shared";

export const SectionPaper = styled(Paper)(({ theme }) => ({
  padding: "32px",
  borderRadius: "16px",
  border: `1px solid ${theme.palette.divider}`,
}));

export const Row = styled(Box)(({ theme }) => ({
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "16px",
  paddingTop: "16px",
  paddingBottom: "16px",
  borderTop: `1px solid ${theme.palette.divider}`,
  "&:first-of-type": {
    borderTop: "none",
    paddingTop: 0,
  },
  "&:last-of-type": {
    paddingBottom: 0,
  },
}));

export const RowContent = styled(Box)({
  display: "flex",
  flexDirection: "column",
  minWidth: 0,
  flex: 1,
});

export const RowLabel = styled(Typography)(({ theme }) => ({
  color: theme.palette.text.secondary,
  fontWeight: 500,
  marginBottom: "4px",
}));

export const RowValue = styled(Typography)(({ theme }) => ({
  color: theme.palette.text.primary,
  fontSize: "1rem",
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
}));
