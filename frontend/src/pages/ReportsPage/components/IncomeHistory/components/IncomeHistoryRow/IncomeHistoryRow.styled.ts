import { Box, ListItemButton, Typography } from "@mui/material";

import { styled } from "@shared";

export const RowButton = styled(ListItemButton)(({ theme }) => ({
  display: "grid",
  gridTemplateColumns: "minmax(0, 1fr) auto",
  gridTemplateAreas: `"name amount" "meta extras"`,
  alignItems: "center",
  columnGap: theme.spacing(2),
  rowGap: theme.spacing(0.5),
  padding: theme.spacing(1.25, 2),
  borderRadius: 8,
  [theme.breakpoints.down("sm")]: {
    gridTemplateAreas: `"name amount" "meta meta" "extras extras"`,
    columnGap: theme.spacing(1),
    padding: theme.spacing(1.25, 1),
  },
}));

export const Name = styled(Box)(({ theme }) => ({
  gridArea: "name",
  display: "flex",
  alignItems: "center",
  gap: theme.spacing(1),
  minWidth: 0,
  "& .MuiChip-root": {
    flexShrink: 0,
  },
  [theme.breakpoints.down("sm")]: {
    flexWrap: "wrap",
    rowGap: theme.spacing(0.5),
  },
}));

export const StudentName = styled(Typography)(({ theme }) => ({
  fontWeight: 600,
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
  minWidth: 0,
  [theme.breakpoints.down("sm")]: {
    display: "-webkit-box",
    WebkitLineClamp: 2,
    WebkitBoxOrient: "vertical",
    whiteSpace: "normal",
    overflowWrap: "anywhere",
    lineHeight: 1.3,
  },
}));

export const Amount = styled(Box)(({ theme }) => ({
  gridArea: "amount",
  display: "flex",
  alignItems: "center",
  justifyContent: "flex-end",
  gap: theme.spacing(0.5),
}));

export const AmountValue = styled(Typography)({
  fontWeight: 700,
  whiteSpace: "nowrap",
});

export const Meta = styled(Box)(({ theme }) => ({
  gridArea: "meta",
  display: "flex",
  alignItems: "center",
  flexWrap: "wrap",
  gap: theme.spacing(0.75),
  minWidth: 0,
}));

export const MetaText = styled(Typography)({
  color: "rgba(0, 0, 0, 0.6)",
});

export const Extras = styled(Box)(({ theme }) => ({
  gridArea: "extras",
  display: "flex",
  alignItems: "center",
  justifyContent: "flex-end",
  flexWrap: "wrap",
  gap: theme.spacing(0.75),
  "&:empty": {
    display: "none",
  },
  [theme.breakpoints.down("sm")]: {
    justifyContent: "flex-start",
  },
}));
