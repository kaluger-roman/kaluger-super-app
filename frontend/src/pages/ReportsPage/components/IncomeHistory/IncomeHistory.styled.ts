import { Box, Card } from "@mui/material";

import { styled } from "@shared";

export const Section = styled(Card)(({ theme }) => ({
  padding: theme.spacing(3),
  [theme.breakpoints.down("sm")]: {
    padding: theme.spacing(2, 1.5),
  },
}));

export const Header = styled(Box)(({ theme }) => ({
  marginBottom: theme.spacing(2),
}));

export const DayList = styled(Box)(({ theme }) => ({
  display: "flex",
  flexDirection: "column",
  gap: theme.spacing(2.5),
  marginTop: theme.spacing(3),
}));
