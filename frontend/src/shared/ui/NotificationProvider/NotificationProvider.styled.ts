import { Snackbar, Alert } from "@mui/material";

import { styled } from "../../lib/styled.helpers";

export const StyledSnackbar = styled(Snackbar)(({ theme }) => ({
  marginTop: theme.spacing(8),
}));

export const StyledAlert = styled(Alert)(() => ({
  width: "100%",
}));
