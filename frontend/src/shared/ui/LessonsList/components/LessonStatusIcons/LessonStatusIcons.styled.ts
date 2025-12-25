import MenuBookIcon from "@mui/icons-material/MenuBook";
import MonetizationOnIcon from "@mui/icons-material/MonetizationOn";
import { Box } from "@mui/material";

import { styled } from "../../../../lib/styled.helpers";

export const Container = styled(Box)(({ theme }) => ({
  display: "flex",
  gap: theme.spacing(1),
  alignItems: "center",
}));

export const PaymentIcon = styled(MonetizationOnIcon)<{ $isPaid: boolean }>(
  ({ theme, $isPaid }) => ({
    color: $isPaid ? theme.palette.success.main : theme.palette.error.main,
  })
);

export const HomeworkIcon = styled(MenuBookIcon)<{ $isSent: boolean }>(({ theme, $isSent }) => ({
  color: $isSent ? theme.palette.success.main : theme.palette.error.main,
}));

export const DialogContent = styled(Box)(({ theme }) => ({
  marginTop: theme.spacing(1),
}));
