import { Box } from "@mui/material";

import { styled } from "@shared";

type AvatarCircleProps = {
  $size: number;
};

export const AvatarCircle = styled(Box)<AvatarCircleProps>(({ $size }) => ({
  width: $size,
  height: $size,
  borderRadius: "50%",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontWeight: 600,
  fontSize: $size * 0.38,
  color: "#ffffff",
  letterSpacing: "0.04em",
  background: "linear-gradient(135deg, #4CAF50 0%, #1B5E20 100%)",
  boxShadow: "0 8px 24px rgba(0, 0, 0, 0.35)",
  userSelect: "none",
}));
