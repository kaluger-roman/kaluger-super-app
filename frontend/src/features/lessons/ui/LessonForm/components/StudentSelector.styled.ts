import { Box } from "@mui/material";

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

export const StudentRate = styled("span")(({ theme }) => ({
  marginTop: 4,
  fontSize: 13,
  color: theme.palette.text.secondary,
}));
