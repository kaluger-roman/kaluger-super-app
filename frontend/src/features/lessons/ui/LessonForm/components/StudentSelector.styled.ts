import { Box } from "@mui/material";

import { styled } from "@shared";

export const OptionItem = styled("li")(({ theme }) => ({
  alignItems: "flex-start",
  paddingTop: theme.spacing(1),
  paddingBottom: theme.spacing(1),
}));

export const StudentInfoContainer = styled(Box)({
  display: "flex",
  flexDirection: "column",
  alignItems: "flex-start",
  whiteSpace: "normal",
  overflowWrap: "anywhere",
  width: "100%",
});

export const StudentName = styled("span")({
  fontWeight: 700,
});

export const ArchivedBadge = styled("span")(({ theme }) => ({
  fontSize: 12,
  color: theme.palette.text.secondary,
}));

export const StudentRate = styled("span")(({ theme }) => ({
  marginTop: 4,
  fontSize: 13,
  color: theme.palette.text.secondary,
}));
