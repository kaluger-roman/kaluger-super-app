import { Box, Paper, TextField } from "@mui/material";

import { styled } from "@shared";

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
