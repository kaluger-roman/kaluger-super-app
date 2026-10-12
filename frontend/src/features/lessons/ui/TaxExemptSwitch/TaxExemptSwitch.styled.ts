import { FormControlLabel, FormHelperText, Switch as MuiSwitch } from "@mui/material";

import { styled, TAX_EXEMPT_COLOR } from "@shared";

export const Label = styled(FormControlLabel)<{ $isChecked: boolean }>(({ theme, $isChecked }) => ({
  ".MuiFormControlLabel-label": {
    color: $isChecked ? TAX_EXEMPT_COLOR : theme.palette.text.secondary,
    fontWeight: 500,
  },
}));

export const Switch = styled(MuiSwitch)({
  "& .MuiSwitch-switchBase.Mui-checked": {
    color: TAX_EXEMPT_COLOR,
  },
  "& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track": {
    backgroundColor: TAX_EXEMPT_COLOR,
  },
});

// Aligns the hint with the label text: 58px switch minus FormControlLabel's -11px offset.
export const Hint = styled(FormHelperText)({
  marginTop: -4,
  marginLeft: 47,
});
