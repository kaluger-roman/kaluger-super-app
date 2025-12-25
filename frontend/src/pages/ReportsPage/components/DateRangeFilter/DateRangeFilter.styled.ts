import { Card, Button, Box } from "@mui/material";

import { styled } from "@shared";

export const Container = styled(Card)(({ theme }) => ({
  marginBottom: theme.spacing(3),
}));

export const FilterBox = styled(Box)(({ theme }) => ({
  display: "flex",
  flexWrap: "wrap",
  gap: theme.spacing(2),
  alignItems: "center",
}));

export const DatePickerBox = styled(Box)({
  flex: "1",
  minWidth: 200,
});

export const UpdateButton = styled(Button)({
  height: 56,
  minWidth: 120,
});
