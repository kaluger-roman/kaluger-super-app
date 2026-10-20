import { Alert, Typography } from "@mui/material";

import { styled } from "@shared";

export const StyledStatusText = styled(Typography)(({ theme }) => ({
  color: theme.palette.text.secondary,
}));

export const StyledStatusAlert = styled(Alert)({
  alignItems: "center",
});
