import { Alert, Box, Button, Paper, Typography } from "@mui/material";

import { styled } from "@shared";

export const StyledWrapper = styled(Box)({
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  minHeight: "100vh",
  backgroundColor: "#f5f5f5",
});

export const StyledPaper = styled(Paper)({
  padding: "40px",
  maxWidth: "400px",
  width: "100%",
  borderRadius: "16px",
});

export const StyledTitle = styled(Typography)({
  fontWeight: 700,
  marginBottom: "24px",
  textAlign: "center",
});

export const StyledAlert = styled(Alert)({
  marginTop: "8px",
});

export const StyledButton = styled(Button)({
  marginTop: "16px",
});
