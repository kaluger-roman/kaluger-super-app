import { styled, Box, Typography } from "@mui/material";

export const InfoBox = styled(Box)(({ theme }) => ({
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  width: "100%",
  padding: theme.spacing(0, 2),
}));

export const InfoText = styled(Typography)(({ theme }) => ({
  textAlign: "center",
  whiteSpace: "normal",
  lineHeight: 1.4,
  maxWidth: "100%",
  padding: theme.spacing(2, 2, 1, 2),
  backgroundColor: "rgba(25, 118, 210, 0.08)",
  borderRadius: theme.spacing(1),
  border: "1px solid rgba(25, 118, 210, 0.23)",
  color: theme.palette.text.secondary,
  [theme.breakpoints.down("sm")]: {
    fontSize: "0.75rem",
  },
  [theme.breakpoints.up("sm")]: {
    fontSize: "0.875rem",
  },
}));
