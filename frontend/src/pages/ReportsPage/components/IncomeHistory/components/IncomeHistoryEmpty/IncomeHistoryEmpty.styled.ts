import { ReceiptLongOutlined } from "@mui/icons-material";
import { Box } from "@mui/material";

import { styled } from "@shared";

export const Container = styled(Box)(({ theme }) => ({
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  gap: theme.spacing(0.5),
  padding: theme.spacing(5, 2),
  textAlign: "center",
  borderRadius: 12,
  border: "1px dashed rgba(0, 0, 0, 0.16)",
}));

export const Icon = styled(ReceiptLongOutlined)(({ theme }) => ({
  fontSize: 40,
  color: "rgba(0, 0, 0, 0.3)",
  marginBottom: theme.spacing(1),
}));
