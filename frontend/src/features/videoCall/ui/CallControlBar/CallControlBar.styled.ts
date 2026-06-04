import { Box, IconButton } from "@mui/material";

import { styled } from "@shared";

export const BarBox = styled(Box)({
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 16,
  padding: "16px 12px",
  flexWrap: "wrap",
});

type ControlButtonProps = {
  $active: boolean;
};

export const ControlButton = styled(IconButton)<ControlButtonProps>(({ $active }) => ({
  width: 56,
  height: 56,
  color: "#ffffff",
  background: $active ? "rgba(255, 255, 255, 0.16)" : "rgba(211, 47, 47, 0.92)",
  "&:hover": {
    background: $active ? "rgba(255, 255, 255, 0.26)" : "rgba(211, 47, 47, 1)",
  },
}));

export const EndCallButton = styled(IconButton)({
  width: 64,
  height: 56,
  borderRadius: 28,
  color: "#ffffff",
  background: "#d32f2f",
  "&:hover": {
    background: "#b71c1c",
  },
});

type ScreenButtonProps = {
  $sharing: boolean;
};

export const ScreenButton = styled(IconButton)<ScreenButtonProps>(({ $sharing }) => ({
  width: 56,
  height: 56,
  color: "#ffffff",
  background: $sharing ? "rgba(46, 125, 71, 0.95)" : "rgba(255, 255, 255, 0.16)",
  "&:hover": {
    background: $sharing ? "rgba(46, 125, 71, 1)" : "rgba(255, 255, 255, 0.26)",
  },
}));
