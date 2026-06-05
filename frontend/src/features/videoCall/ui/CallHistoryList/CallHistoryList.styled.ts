import { Box, Typography } from "@mui/material";

import { styled, Card } from "@shared";

export const ListBox = styled(Box)({
  display: "flex",
  flexDirection: "column",
  gap: 12,
});

export const RowCard = styled(Card)({
  display: "flex",
  alignItems: "center",
  gap: 16,
  padding: "12px 16px",
});

type DirectionIconBoxProps = {
  $incoming: boolean;
};

export const DirectionIconBox = styled(Box)<DirectionIconBoxProps>(
  ({ theme, $incoming }) => ({
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    width: 40,
    height: 40,
    flexShrink: 0,
    borderRadius: "50%",
    color: $incoming ? theme.palette.primary.main : theme.palette.text.secondary,
    background: theme.palette.grey[100],
  }),
);

export const RowMain = styled(Box)({
  flex: 1,
  minWidth: 0,
  display: "flex",
  flexDirection: "column",
  gap: 2,
});

export const RowTopLine = styled(Box)({
  display: "flex",
  alignItems: "center",
  gap: 8,
  flexWrap: "wrap",
});

export const PeerName = styled(Typography)({
  fontWeight: 600,
});

export const RowMeta = styled(Box)({
  display: "flex",
  alignItems: "center",
  gap: 12,
  flexWrap: "wrap",
});

export const Duration = styled(Typography)({
  display: "flex",
  alignItems: "center",
  gap: 4,
});

export const EmptyBox = styled(Box)(({ theme }) => ({
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  gap: 12,
  padding: theme.spacing(8, 3),
  textAlign: "center",
  color: theme.palette.text.secondary,
}));
