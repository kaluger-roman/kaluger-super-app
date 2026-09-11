import { Alert, Typography } from "@mui/material";

import { styled } from "../../lib/styled.helpers";

export const StyledAlert = styled(Alert)(({ theme }) => ({
  marginBottom: theme.spacing(2),
}));

export const AlertTitle = styled(Typography)(({ theme }) => ({
  marginBottom: theme.spacing(1),
}));
