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

export const GradeBadge = styled("span")(({ theme }) => ({
  fontSize: 12,
  padding: `${theme.spacing(0.25)} ${theme.spacing(1)}`,
  borderRadius: theme.shape.borderRadius,
  backgroundColor: theme.palette.action.hover,
  color: theme.palette.text.secondary,
  whiteSpace: "nowrap",
}));

export const StudentRate = styled("span")(({ theme }) => ({
  marginTop: 4,
  fontSize: 13,
  color: theme.palette.text.secondary,
}));
