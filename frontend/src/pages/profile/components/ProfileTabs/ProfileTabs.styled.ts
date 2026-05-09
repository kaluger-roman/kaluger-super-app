import { Box, Tabs } from "@mui/material";

import { styled } from "@shared";

export const Container = styled(Box)(({ theme }) => ({
  borderBottom: `1px solid ${theme.palette.divider}`,
  marginBottom: theme.spacing(3),
}));

export const StyledTabs = styled(Tabs)<{ $isSmallMobile: boolean }>(
  ({ $isSmallMobile }) => ({
    "& .MuiTab-root": {
      minWidth: $isSmallMobile ? "auto" : 140,
      fontSize: $isSmallMobile ? "0.75rem" : "0.875rem",
      padding: $isSmallMobile ? "8px 12px" : "12px 16px",
    },
  }),
);
