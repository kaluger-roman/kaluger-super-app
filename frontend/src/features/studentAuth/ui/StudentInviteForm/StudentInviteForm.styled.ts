import { Box, Paper, styled } from "@mui/material";

export const Wrapper = styled(Paper)({
  padding: "32px",
  maxWidth: "480px",
  width: "100%",
  display: "flex",
  flexDirection: "column",
  gap: "16px",
});

export const FieldsBox = styled(Box)({
  display: "flex",
  flexDirection: "column",
  gap: "12px",
});
