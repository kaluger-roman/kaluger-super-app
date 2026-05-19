import { Box, Paper, TextField, styled } from "@mui/material";

export const Wrapper = styled(Paper)({
  padding: "16px",
  display: "flex",
  flexDirection: "column",
  gap: "12px",
});

export const Row = styled(Box)({
  display: "flex",
  gap: "8px",
  alignItems: "flex-start",
  flexWrap: "wrap",
});

export const CodeField = styled(TextField)({
  minWidth: "140px",
});
