import { Box, Card, CardContent, Divider, Typography } from "@mui/material";

import { styled } from "@shared";

const COMMISSION_COLOR = "#6A1B9A";
const PREPAID_COLOR = "#1565c0";

export const Section = styled(Box)(({ theme }) => ({
  marginBottom: theme.spacing(3),
}));

export const SectionDivider = styled(Divider)(({ theme }) => ({
  marginBottom: theme.spacing(2),
}));

export const Caption = styled(Typography)(({ theme }) => ({
  display: "block",
  marginBottom: theme.spacing(1),
  color: theme.palette.text.secondary,
  letterSpacing: "0.08em",
  lineHeight: 1.6,
}));

// The left accent ties the caption to the cards as one group, so a single card
// inside it does not read as an orphaned tile.
export const Group = styled(Box)(({ theme }) => ({
  paddingLeft: theme.spacing(2),
  borderLeft: `3px solid ${theme.palette.grey[200]}`,
  borderRadius: 2,
}));

export const Row = styled(Box)(({ theme }) => ({
  display: "flex",
  flexWrap: "wrap",
  gap: theme.spacing(3),
}));

export const StatBox = styled(Box)({
  flex: "0 1 340px",
  minWidth: 280,
});

export const PrepaidCard = styled(Card)({
  height: "100%",
  backgroundColor: "#e3f2fd",
});

export const PrepaidCardContent = styled(CardContent)(({ theme }) => ({
  "& .icon": {
    color: PREPAID_COLOR,
    marginRight: theme.spacing(1),
  },
}));

export const PrepaidTitle = styled(Typography)(({ theme }) => ({
  display: "flex",
  alignItems: "center",
  marginBottom: theme.spacing(2),
}));

export const PrepaidAmount = styled(Typography)(({ theme }) => ({
  color: PREPAID_COLOR,
  fontWeight: "bold",
  marginBottom: theme.spacing(1),
}));

export const SnapshotCard = styled(Card)({
  height: "100%",
  backgroundColor: "#FAF4FC",
  border: `1px dashed ${COMMISSION_COLOR}`,
});

export const SnapshotCardContent = styled(CardContent)(({ theme }) => ({
  "& .icon": {
    color: COMMISSION_COLOR,
    marginRight: theme.spacing(1),
  },
}));

export const SnapshotTitle = styled(Typography)(({ theme }) => ({
  display: "flex",
  alignItems: "center",
  marginBottom: theme.spacing(2),
}));

export const SnapshotAmount = styled(Typography)(({ theme }) => ({
  color: COMMISSION_COLOR,
  fontWeight: "bold",
  marginBottom: theme.spacing(1),
}));
