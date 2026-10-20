import { Box, Typography } from "@mui/material";
import { alpha } from "@mui/material/styles";

import { styled } from "@shared";

export const BannerBox = styled(Box)(({ theme }) => ({
  display: "flex",
  alignItems: "center",
  gap: 10,
  padding: "10px 16px",
  borderRadius: 12,
  color: theme.palette.common.white,
  background: alpha(theme.palette.warning.main, 0.92),
}));

export const BannerText = styled(Typography)(({ theme }) => ({
  color: theme.palette.common.white,
}));
