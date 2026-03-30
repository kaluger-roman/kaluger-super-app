import { Box, Container, Paper, Tab, Typography } from "@mui/material";

import { styled } from "@shared";

export const StyledContainer = styled(Container)({
  paddingTop: "32px",
  paddingBottom: "32px",
});

export const StyledHeader = styled(Box)({
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: "24px",
});

export const StyledTitle = styled(Typography)({
  fontWeight: 700,
});

export const StyledPaper = styled(Paper)(({ theme }) => ({
  padding: "24px",
  borderRadius: "16px",
  border: `1px solid ${theme.palette.divider}`,
}));

export const StyledTab = styled(Tab)({
  textTransform: "none",
  fontWeight: 600,
});
