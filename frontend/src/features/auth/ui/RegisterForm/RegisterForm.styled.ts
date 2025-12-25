import { Paper } from "@mui/material";

import { styled } from "@shared";

export const StyledPaper = styled(Paper)<{ $isMobile: boolean }>(({ theme, $isMobile }) => ({
  padding: $isMobile ? theme.spacing(3) : theme.spacing(4),
  width: "100%",
  maxWidth: 440,
  borderRadius: theme.spacing(3),
  maxHeight: $isMobile ? "90vh" : "auto",
  overflow: "auto",
}));
