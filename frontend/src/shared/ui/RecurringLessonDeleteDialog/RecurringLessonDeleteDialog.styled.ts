import { styled, Typography } from "@mui/material";

export const WarningText = styled(Typography)(({ theme }) => ({
  color: theme.palette.warning.main,
  marginBottom: theme.spacing(2),
}));
