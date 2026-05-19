import { Alert, Box, Chip, Paper, TextField, styled } from "@mui/material";

export const Wrapper = styled(Paper)({
  padding: "16px",
  display: "flex",
  flexDirection: "column",
  gap: "12px",
});

export const HeaderRow = styled(Box)({
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "8px",
});

export const RegisteredBox = styled(Box)({
  display: "flex",
  flexDirection: "column",
  gap: "8px",
});

export const RegisteredChip = styled(Chip)({
  alignSelf: "flex-start",
});

export const InfoAlert = styled(Alert)({
  fontSize: "0.85rem",
});

export const UrlBox = styled(Box)({
  display: "flex",
  gap: "8px",
  alignItems: "center",
});

export const ReadonlyField = styled(TextField)({
  flex: 1,
  "& input": { fontFamily: "monospace", fontSize: "0.85rem" },
});

export const ButtonsRow = styled(Box)({
  display: "flex",
  gap: "8px",
  flexWrap: "wrap",
});
