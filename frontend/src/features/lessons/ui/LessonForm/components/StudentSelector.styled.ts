import { Box, MenuItem, Alert } from "@mui/material";

import { styled } from "@shared";

export const StudentInfoContainer = styled(Box)({
  display: "flex",
  flexDirection: "column",
  alignItems: "flex-start",
  whiteSpace: "normal",
  overflowWrap: "anywhere",
});

export const StudentName = styled("span")({
  fontWeight: 700,
});

export const StudentRate = styled("span")({
  marginTop: 4,
  fontSize: 13,
  color: "rgba(0,0,0,0.6)",
});

export const StyledMenuItem = styled(MenuItem)({
  alignItems: "flex-start",
});

export const ErrorAlert = styled(Alert)(({ theme }) => ({
  marginTop: theme.spacing(1),
}));
