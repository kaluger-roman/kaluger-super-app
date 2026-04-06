import type { FC } from "react";

import ClearIcon from "@mui/icons-material/Clear";
import {
  FormControlLabel,
  Switch,
  Chip,
  IconButton,
  Tooltip,
  Typography,
  Divider,
} from "@mui/material";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { useUnit } from "effector-react";

import { lessonsModel } from "@features";

import { PAYMENT_DATE_PRESETS } from "./LessonsFilters.constants";
import * as Styled from "./LessonsFilters.styled";

export const LessonsFilters: FC = () => {
  const onlyUnpaid = useUnit(lessonsModel.$onlyUnpaid);
  const onlyWithoutHomework = useUnit(lessonsModel.$onlyWithoutHomework);
  const paymentDateFrom = useUnit(lessonsModel.$paymentDateFrom);
  const paymentDateTo = useUnit(lessonsModel.$paymentDateTo);
  const paymentDatePreset = useUnit(lessonsModel.$paymentDatePreset);

  const actions = useUnit({
    setOnlyUnpaid: lessonsModel.setOnlyUnpaid,
    setOnlyWithoutHomework: lessonsModel.setOnlyWithoutHomework,
    setPaymentDateFrom: lessonsModel.setPaymentDateFrom,
    setPaymentDateTo: lessonsModel.setPaymentDateTo,
    setPaymentDatePreset: lessonsModel.setPaymentDatePreset,
    resetPaymentDateFilter: lessonsModel.resetPaymentDateFilter,
  });

  const isPaymentDateActive = paymentDateFrom !== null || paymentDateTo !== null;
  const isDateRangeInvalid =
    paymentDateFrom !== null && paymentDateTo !== null && paymentDateFrom > paymentDateTo;

  return (
    <Styled.Container>
      <Styled.Row>
        <FormControlLabel
          control={
            <Switch
              checked={onlyUnpaid}
              onChange={(e) => actions.setOnlyUnpaid(e.target.checked)}
              size="small"
            />
          }
          label="Только неоплаченные"
        />

        <FormControlLabel
          control={
            <Switch
              checked={onlyWithoutHomework}
              onChange={(e) => actions.setOnlyWithoutHomework(e.target.checked)}
              size="small"
            />
          }
          label="Только без Д/З"
        />
      </Styled.Row>

      <Divider />

      <Styled.Row>
        <Typography variant="body2" color="text.secondary" whiteSpace="nowrap">
          Оплата:
        </Typography>

        {PAYMENT_DATE_PRESETS.map(({ value, label }) => (
          <Chip
            key={value}
            label={label}
            color={paymentDatePreset === value ? "primary" : "default"}
            variant={paymentDatePreset === value ? "filled" : "outlined"}
            onClick={() => actions.setPaymentDatePreset(value)}
            disabled={onlyUnpaid}
            size="small"
          />
        ))}

        <Styled.DatePickerBox>
          <DatePicker
            label="С"
            value={paymentDateFrom}
            onChange={(date) => actions.setPaymentDateFrom(date)}
            disabled={onlyUnpaid}
            slotProps={{
              textField: {
                size: "small",
                fullWidth: true,
                error: isDateRangeInvalid,
              },
            }}
          />
        </Styled.DatePickerBox>

        <Styled.DatePickerBox>
          <DatePicker
            label="По"
            value={paymentDateTo}
            onChange={(date) => actions.setPaymentDateTo(date)}
            disabled={onlyUnpaid}
            slotProps={{
              textField: {
                size: "small",
                fullWidth: true,
                error: isDateRangeInvalid,
              },
            }}
          />
        </Styled.DatePickerBox>

        {isPaymentDateActive && (
          <Tooltip title="Сбросить">
            <IconButton onClick={() => actions.resetPaymentDateFilter()} size="small">
              <ClearIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        )}
      </Styled.Row>

      {isDateRangeInvalid && (
        <Typography variant="caption" color="error">
          Дата начала не может быть позже даты окончания
        </Typography>
      )}
    </Styled.Container>
  );
};
