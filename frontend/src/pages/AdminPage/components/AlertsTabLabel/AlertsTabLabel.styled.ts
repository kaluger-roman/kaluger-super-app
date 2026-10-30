import { Chip } from "@mui/material";

import { styled } from "@shared";

export const StyledLabel = styled("span")({
  display: "inline-flex",
  alignItems: "center",
  gap: "8px",
});

export const StyledCounter = styled(Chip)({
  height: "20px",
  minWidth: "20px",
  fontSize: "0.75rem",
  fontWeight: 700,
  "& .MuiChip-label": {
    padding: "0 6px",
  },
});
