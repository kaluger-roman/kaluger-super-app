import type { FC } from "react";

import { Checkbox, FormControlLabel } from "@mui/material";

type RecurringCheckboxProps = {
  checked: boolean;
  disabled: boolean;
  onChange: (checked: boolean) => void;
};

export const RecurringCheckbox: FC<RecurringCheckboxProps> = ({ checked, disabled, onChange }) => (
  <FormControlLabel
    control={
      <Checkbox
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        disabled={disabled}
      />
    }
    label="Регулярное занятие (еженедельно)"
  />
);
