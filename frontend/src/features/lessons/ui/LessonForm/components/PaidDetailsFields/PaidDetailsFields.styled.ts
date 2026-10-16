import { Box } from "@mui/material";

import { styled } from "@shared";

export const Row = styled(Box)<{ $isMobile: boolean }>(({ theme, $isMobile }) => ({
  display: "grid",
  gridTemplateColumns: $isMobile ? "1fr" : "1fr 1fr",
  gap: $isMobile ? theme.spacing(2) : theme.spacing(3),
  marginTop: theme.spacing(0.5),
  "& .MuiFormControl-marginDense": {
    marginTop: 0,
    marginBottom: 0,
  },
}));
