import { Box } from "@mui/material";

import { styled } from "@shared";

export const DateTimeRow = styled(Box)<{ $isMobile: boolean }>(({ theme, $isMobile }) => ({
  display: "flex",
  flexDirection: $isMobile ? "column" : "row",
  gap: theme.spacing(2),
}));

export const AlertContainer = styled(Box)(({ theme }) => ({
  width: "100%",
  marginTop: theme.spacing(1),
}));

export const FieldsColumn = styled(Box)({
  display: "flex",
  flexDirection: "column",
  gap: 0,
});
