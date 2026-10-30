import { MailOutline } from "@mui/icons-material";
import { Box } from "@mui/material";

import { styled } from "@shared";

export const StyledLine = styled(Box)<{ $isError: boolean }>(({ theme, $isError }) => ({
  display: "flex",
  alignItems: "flex-start",
  gap: "6px",
  marginTop: "4px",
  color: $isError ? theme.palette.error.main : theme.palette.text.secondary,
  overflowWrap: "anywhere",
}));

export const StyledIcon = styled(MailOutline)({
  fontSize: "16px",
  marginTop: "2px",
  flexShrink: 0,
});
