import React from "react";
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  CircularProgress,
} from "@mui/material";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";

type DateRangeFilterProps = {
  startDate: Date;
  endDate: Date;
  loading: boolean;
  onStartDateChange: (date: Date | null) => void;
  onEndDateChange: (date: Date | null) => void;
  onUpdate: () => void;
};

export const DateRangeFilter: React.FC<DateRangeFilterProps> = ({
  startDate,
  endDate,
  loading,
  onStartDateChange,
  onEndDateChange,
  onUpdate,
}) => {
  return (
    <Card sx={{ mb: 3 }}>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          📅 Период отчета
        </Typography>
        <Box display="flex" flexWrap="wrap" gap={2} alignItems="center">
          <Box flex="1" minWidth={200}>
            <DatePicker
              label="Дата начала"
              value={startDate}
              onChange={onStartDateChange}
              slotProps={{
                textField: { fullWidth: true },
              }}
            />
          </Box>
          <Box flex="1" minWidth={200}>
            <DatePicker
              label="Дата окончания"
              value={endDate}
              onChange={onEndDateChange}
              slotProps={{
                textField: { fullWidth: true },
              }}
            />
          </Box>
          <Box>
            <Button
              variant="contained"
              onClick={onUpdate}
              disabled={loading}
              sx={{ height: 56, minWidth: 120 }}
            >
              {loading ? <CircularProgress size={24} /> : "Обновить"}
            </Button>
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
};
