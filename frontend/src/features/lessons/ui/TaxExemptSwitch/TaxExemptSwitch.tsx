import { useId } from "react";
import type { ChangeEvent, FC } from "react";

import { Box } from "@mui/material";

import { TAX_EXEMPT_LABEL } from "@shared";

import * as Styled from "./TaxExemptSwitch.styled";

type TaxExemptSwitchProps = {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  hint?: string;
};

export const TaxExemptSwitch: FC<TaxExemptSwitchProps> = ({
  checked,
  onChange,
  disabled = false,
  hint,
}) => {
  const hintId = useId();

  return (
    <Box>
      <Styled.Label
        onClick={(event) => event.stopPropagation()}
        $isChecked={checked}
        control={
          <Styled.Switch
            checked={checked}
            disabled={disabled}
            onChange={(_event: ChangeEvent<HTMLInputElement>, next: boolean) => onChange(next)}
            slotProps={{
              input: { role: "switch", "aria-describedby": hint ? hintId : undefined },
            }}
          />
        }
        label={TAX_EXEMPT_LABEL}
      />
      {hint ? <Styled.Hint id={hintId}>{hint}</Styled.Hint> : null}
    </Box>
  );
};
