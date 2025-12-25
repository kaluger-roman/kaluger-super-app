import { FormControlLabel } from "@mui/material";

import { styled } from "../../lib/styled.helpers";

type StyledFormControlLabelProps = {
  $isPaid: boolean;
};

export const StyledFormControlLabel = styled(FormControlLabel)<StyledFormControlLabelProps>(
  ({ theme, $isPaid }) => ({
    ".MuiFormControlLabel-label": {
      color: $isPaid ? theme.palette.success.main : theme.palette.error.main,
      fontWeight: 500,
    },
  })
);
