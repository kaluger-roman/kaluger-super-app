import { Box, Typography } from "@mui/material";

import { styled } from "@shared";

type BannerBoxProps = {
  $variant: "info" | "error";
};

export const BannerBox = styled(Box)<BannerBoxProps>(({ $variant }) => ({
  display: "flex",
  alignItems: "center",
  gap: 10,
  padding: "10px 16px",
  borderRadius: 12,
  color: "#ffffff",
  background:
    $variant === "error" ? "rgba(211, 47, 47, 0.92)" : "rgba(245, 124, 0, 0.92)",
}));

export const BannerText = styled(Typography)({
  color: "#ffffff",
});
