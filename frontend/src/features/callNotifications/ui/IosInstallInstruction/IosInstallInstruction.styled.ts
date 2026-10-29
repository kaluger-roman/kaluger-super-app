import { IosShare } from "@mui/icons-material";
import { Box, Typography } from "@mui/material";

import { styled } from "@shared";

export const Root = styled(Box)({
  display: "flex",
  flexDirection: "column",
  gap: 6,
});

export const Reason = styled(Typography)(({ theme }) => ({
  color: theme.palette.text.secondary,
}));

export const Steps = styled(Typography)(({ theme }) => ({
  color: theme.palette.text.primary,
  fontWeight: 500,
}));

export const ShareLabel = styled("span")({
  whiteSpace: "nowrap",
});

export const ShareIcon = styled(IosShare)(({ theme }) => ({
  fontSize: 18,
  marginLeft: 2,
  verticalAlign: "text-bottom",
  color: theme.palette.primary.main,
}));
