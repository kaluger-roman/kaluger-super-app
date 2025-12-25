import { styled, Alert, Typography } from "@mui/material";

export const StyledAlert = styled(Alert)(({ theme }) => ({
  marginBottom: theme.spacing(2),
}));

export const AlertTitle = styled(Typography)(({ theme }) => ({
  marginBottom: theme.spacing(1),
}));
