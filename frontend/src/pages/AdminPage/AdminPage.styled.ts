import { Alert, Box, Container, Paper, Tab, Tabs, Typography } from "@mui/material";

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
  [theme.breakpoints.down("sm")]: {
    padding: "16px",
  },
}));

export const StyledTab = styled(Tab)(({ theme }) => ({
  textTransform: "none",
  fontWeight: 600,
  [theme.breakpoints.down("sm")]: {
    minWidth: 0,
    paddingLeft: "12px",
    paddingRight: "12px",
  },
}));

export const StyledTabs = styled(Tabs)(({ theme }) => ({
  marginBottom: "24px",
  borderBottom: `1px solid ${theme.palette.divider}`,
}));

export const AccessDeniedAlert = styled(Alert)({
  marginBottom: "16px",
});
