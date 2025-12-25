import { Box } from "@mui/material";

import { styled } from "@shared";

export const StatusChipBox = styled(Box)({
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
});

export const ActionsBox = styled(Box)(({ theme }) => ({
  padding: theme.spacing(3),
  paddingTop: theme.spacing(1),
}));
