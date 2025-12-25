import type { FC } from "react";

import { Typography, CardContent, CircularProgress } from "@mui/material";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";

import * as Styled from "./DateRangeFilter.styled";

type DateRangeFilterProps = {
  startDate: Date;
  endDate: Date;
  loading: boolean;
  onStartDateChange: (date: Date | null) => void;
  onEndDateChange: (date: Date | null) => void;
  onUpdate: () => void;
};

export const DateRangeFilter: FC<DateRangeFilterProps> = ({
  startDate,
  endDate,
  loading,
  onStartDateChange,
  onEndDateChange,
  onUpdate,
}) => {
  return (
    <Styled.Container>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          📅 Период отчета
        </Typography>
        <Styled.FilterBox>
          <Styled.DatePickerBox>
            <DatePicker
              label="Дата начала"
              value={startDate}
              onChange={onStartDateChange}
              slotProps={{
                textField: { fullWidth: true },
              }}
            />
          </Styled.DatePickerBox>
          <Styled.DatePickerBox>
            <DatePicker
              label="Дата окончания"
              value={endDate}
              onChange={onEndDateChange}
              slotProps={{
                textField: { fullWidth: true },
              }}
            />
          </Styled.DatePickerBox>
          <div>
            <Styled.UpdateButton variant="contained" onClick={onUpdate} disabled={loading}>
              {loading ? <CircularProgress size={24} /> : "Обновить"}
            </Styled.UpdateButton>
          </div>
        </Styled.FilterBox>
      </CardContent>
    </Styled.Container>
  );
};
