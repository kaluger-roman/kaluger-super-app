import type { FC, RefObject, UIEvent } from "react";

import { Typography, Box } from "@mui/material";

import { getDateKey, formatDayHeader } from "../ScheduleView.helpers";
import * as Styled from "../ScheduleView.styled";

type ScheduleHeaderProps = {
  dateRange: Date[];
  headerScrollRef: RefObject<HTMLDivElement | null>;
  handleHeaderScroll: (e: UIEvent<HTMLDivElement>) => void;
};

export const ScheduleHeader: FC<ScheduleHeaderProps> = ({
  dateRange,
  headerScrollRef,
  handleHeaderScroll,
}) => {
  return (
    <Styled.Header>
      <Styled.TimeColumn>
        <Box height="80px" display="flex" alignItems="center" justifyContent="center">
          <Typography variant="caption" color="text.secondary">
            Время
          </Typography>
        </Box>
      </Styled.TimeColumn>
      <Styled.DaysGrid ref={headerScrollRef} onScroll={handleHeaderScroll}>
        {dateRange.map((date) => {
          const { dayName, dayNumber, monthName, isToday } = formatDayHeader(date);
          return (
            <Styled.DayColumn key={getDateKey(date)}>
              <Styled.DayHeader>
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
              </Styled.DayHeader>
            </Styled.DayColumn>
          );
        })}
      </Styled.DaysGrid>
    </Styled.Header>
  );
};
