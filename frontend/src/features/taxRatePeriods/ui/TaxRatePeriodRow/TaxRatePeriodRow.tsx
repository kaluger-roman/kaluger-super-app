import type { FC } from "react";

import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import { TextField, IconButton, Typography } from "@mui/material";

import { getCaptionAppearance } from "./TaxRatePeriodRow.helpers";
import * as Styled from "./TaxRatePeriodRow.styled";

type Props = {
  startDate: string;
  rate: number;
  isCurrent?: boolean;
  isFuture?: boolean;
  onStartDateChange: (value: string) => void;
  onRateChange: (value: number) => void;
  onRemove: () => void;
};

export const TaxRatePeriodRow: FC<Props> = ({
  startDate,
  rate,
  isCurrent,
  isFuture,
  onStartDateChange,
  onRateChange,
  onRemove,
}) => {
  const caption = getCaptionAppearance({ isCurrent, isFuture, startDate });

  return (
    <Styled.Row aria-current={isCurrent ? "true" : undefined}>
      <Styled.DateField>
        <TextField
          type="date"
          size="small"
          fullWidth
          value={startDate}
          onChange={(e) => onStartDateChange(e.target.value)}
          InputLabelProps={{ shrink: true }}
          label="Дата начала"
        />
        <Typography variant="caption" color={caption.color}>
          {caption.text}
        </Typography>
      </Styled.DateField>
      <Styled.RateField>
        <TextField
          type="number"
          size="small"
          fullWidth
          value={rate}
          onChange={(e) =>
            onRateChange(e.target.value === "" ? 0 : Number(e.target.value))
          }
          inputProps={{ min: 0, max: 100, step: 0.1 }}
          label="Ставка %"
        />
      </Styled.RateField>
      <IconButton aria-label="Удалить период" onClick={onRemove} size="small">
        <DeleteOutlineIcon fontSize="small" />
      </IconButton>
    </Styled.Row>
  );
};
