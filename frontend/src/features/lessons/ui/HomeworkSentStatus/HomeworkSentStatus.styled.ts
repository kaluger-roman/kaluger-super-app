import { FormControlLabel } from "@mui/material";

import { styled } from "@shared";

type StyledFormControlLabelProps = {
  $isHomeworkSent: boolean;
};

export const StyledFormControlLabel = styled(FormControlLabel)<StyledFormControlLabelProps>(
  ({ theme, $isHomeworkSent }) => ({
    ".MuiFormControlLabel-label": {
      color: $isHomeworkSent ? theme.palette.success.main : theme.palette.error.main,
      fontWeight: 500,
    },
  })
);
