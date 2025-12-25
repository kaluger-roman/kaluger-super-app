import { Repeat as RepeatIcon } from "@mui/icons-material";
import { Chip } from "@mui/material";

import { styled } from "../../lib/styled.helpers";

export const StyledChip = styled(Chip)<{ $size: "small" | "medium" }>(({ $size }) => ({
  height: $size === "small" ? 20 : 24,
  fontSize: $size === "small" ? "0.7rem" : "0.75rem",
  "& .MuiChip-icon": {
    fontSize: $size === "small" ? 12 : 14,
  },
}));

export const StyledIcon = styled(RepeatIcon)<{ $size: "small" | "medium" }>(({ $size }) => ({
  fontSize: $size === "small" ? 16 : 20,
}));
