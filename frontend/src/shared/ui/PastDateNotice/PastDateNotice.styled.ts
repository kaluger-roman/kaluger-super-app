import { Alert } from "@mui/material";

import { styled } from "../../lib/styled.helpers";

export const StyledAlert = styled(Alert)(({ theme }) => ({
  marginBottom: theme.spacing(2),
}));
