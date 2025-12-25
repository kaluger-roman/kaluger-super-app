import { Alert, Button } from "@mui/material";

import { styled } from "@shared";

export const StyledAlert = styled(Alert)(({ theme }) => ({
  marginTop: theme.spacing(2),
}));

export const SubmitButton = styled(Button)<{ $isMobile: boolean }>(({ theme, $isMobile }) => ({
  marginTop: $isMobile ? theme.spacing(2) : theme.spacing(3),
  paddingTop: $isMobile ? theme.spacing(1) : theme.spacing(1.5),
  paddingBottom: $isMobile ? theme.spacing(1) : theme.spacing(1.5),
  fontWeight: 600,
}));

export const LinkButton = styled(Button)<{ $isMobile: boolean }>(({ theme, $isMobile }) => ({
  marginTop: $isMobile ? theme.spacing(1) : theme.spacing(2),
  color: theme.palette.text.secondary,
  fontSize: $isMobile ? "0.875rem" : "1rem",
}));
