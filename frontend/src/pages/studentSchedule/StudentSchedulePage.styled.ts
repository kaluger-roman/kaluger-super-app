import { Box, styled } from "@mui/material";

export const RootBox = styled(Box)({
  display: "flex",
  flexDirection: "column",
  gap: "16px",
});

export const Toolbar = styled(Box)(({ theme }) => ({
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: theme.spacing(2),
  flexWrap: "wrap",
}));

export const PaginationGroup = styled(Box)(({ theme }) => ({
  display: "flex",
  alignItems: "center",
  gap: theme.spacing(1),
}));
