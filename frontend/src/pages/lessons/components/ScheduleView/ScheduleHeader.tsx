import React from "react";
import { Typography, Box } from "@mui/material";
import {
  Header,
  TimeColumn,
  DaysGrid,
  DayColumn,
  DayHeader,
} from "./ScheduleView.styled";
import { getDateKey, formatDayHeader } from "./ScheduleView.helpers";

type ScheduleHeaderProps = {
  dateRange: Date[];
  headerScrollRef: React.RefObject<HTMLDivElement | null>;
  handleHeaderScroll: (e: React.UIEvent<HTMLDivElement>) => void;
};

export const ScheduleHeader: React.FC<ScheduleHeaderProps> = ({
  dateRange,
  headerScrollRef,
  handleHeaderScroll,
}) => {
  return (
    <Header>
      <TimeColumn>
        <Box
          height="80px"
          display="flex"
          alignItems="center"
          justifyContent="center"
        >
          <Typography variant="caption" color="text.secondary">
            Время
          </Typography>
        </Box>
      </TimeColumn>
      <DaysGrid ref={headerScrollRef} onScroll={handleHeaderScroll}>
        {dateRange.map((date) => {
          const { dayName, dayNumber, monthName, isToday } =
            formatDayHeader(date);
          return (
            <DayColumn key={getDateKey(date)}>
              <DayHeader>
                <Typography
                  variant="caption"
                  color={isToday ? "primary.main" : "text.secondary"}
                  fontWeight="bold"
                  fontSize="10px"
                >
                  {monthName}
                </Typography>
                <Typography
                  variant="caption"
                  color={isToday ? "primary.main" : "text.secondary"}
                  fontWeight={isToday ? "bold" : "normal"}
                >
                  {dayName}
                </Typography>
                <Typography
                  variant="h6"
                  color={isToday ? "primary.main" : "text.primary"}
                  fontWeight={isToday ? "bold" : "normal"}
                >
                  {dayNumber}
                </Typography>
              </DayHeader>
            </DayColumn>
          );
        })}
      </DaysGrid>
    </Header>
  );
};
