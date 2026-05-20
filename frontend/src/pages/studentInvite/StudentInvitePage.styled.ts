import { Alert, Box, Paper } from "@mui/material";

import { styled } from "@shared";

export const RootBox = styled(Box)(({ theme }) => ({
  minHeight: "100vh",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "24px",
  background: theme.palette.background.default,
}));

export const CenteredBox = styled(Box)({
  width: "100%",
  maxWidth: "480px",
  display: "flex",
  flexDirection: "column",
  gap: "16px",
});

export const MessagePaper = styled(Paper)({
  padding: "32px",
  display: "flex",
  flexDirection: "column",
  gap: "16px",
});

export const SpacedAlert = styled(Alert)({
  marginTop: "12px",
});
