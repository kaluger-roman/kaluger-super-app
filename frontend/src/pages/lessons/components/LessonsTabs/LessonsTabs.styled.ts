import { Box, Tabs } from "@mui/material";

import { styled } from "@shared";

export const Container = styled(Box)(({ theme }) => ({
  borderBottom: 1,
  borderColor: "divider",
  marginBottom: theme.spacing(3),
}));

export const StyledTabs = styled(Tabs)<{ $isSmallMobile: boolean }>(
  ({ theme, $isSmallMobile }) => ({
    "& .MuiTab-root": {
      minWidth: $isSmallMobile ? "auto" : 120,
      fontSize: $isSmallMobile ? "0.75rem" : "0.875rem",
      padding: $isSmallMobile ? "8px 12px" : "12px 16px",
    },
    "& .MuiTabs-scrollButtons": {
      color: theme.palette.action.active,
      opacity: 1,
    },
    "& .MuiTabs-scrollButtons.Mui-disabled": {
      color: theme.palette.grey[400],
      opacity: 1,
    },
  })
);
