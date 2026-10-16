import { Typography } from "@mui/material";

import { styled } from "../../lib/styled.helpers";

export const WarningText = styled(Typography)(({ theme }) => ({
  color: theme.palette.warning.main,
  marginBottom: theme.spacing(2),
}));
