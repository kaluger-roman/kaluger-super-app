import { Box, Tabs } from "@mui/material";

import { styled } from "@shared";

export const Container = styled(Box)(({ theme }) => ({
  borderBottom: `1px solid ${theme.palette.divider}`,
  marginBottom: theme.spacing(3),
  scrollMarginTop: theme.spacing(10),
}));

export const StyledTabs = styled(Tabs)<{ $isSmallMobile: boolean }>(({ $isSmallMobile }) => ({
  "& .MuiTab-root": {
    minWidth: $isSmallMobile ? "auto" : 160,
    fontSize: $isSmallMobile ? "0.8125rem" : "0.875rem",
    padding: $isSmallMobile ? "10px 4px" : "12px 16px",
    whiteSpace: "nowrap",
    letterSpacing: $isSmallMobile ? 0 : undefined,
  },
}));
