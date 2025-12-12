import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Box, Typography } from "@mui/material";
import { styled } from "@mui/material/styles";
import { LessonCell } from "./LessonCell";
import type { Lesson } from "../../../shared";

type ScheduleViewProps = {
  lessons: Record<string, Lesson[]>; // Уроки по дням (ключ - дата в формате YYYY-MM-DD)
  onLessonClick: (lesson: Lesson) => void;
  onLoadMoreDays: (startDate: Date, endDate: Date) => void;
};

const CELL_WIDTH = 180; // Ширина колонки дня
const CELL_HEIGHT = 116; // Высота временного слота

const ScheduleContainer = styled(Box)(({ theme }) => ({
  display: "flex",
  flexDirection: "column",
  border: `1px solid ${theme.palette.divider}`,
  borderRadius: theme.shape.borderRadius,
}));

const Header = styled(Box)(({ theme }) => ({
  display: "flex",
  backgroundColor: theme.palette.background.paper,
  borderBottom: `1px solid ${theme.palette.divider}`,
  position: "sticky",
  top: 64,
  zIndex: 3,
}));

const TimeColumn = styled(Box)(({ theme }) => ({
  width: "80px",
  backgroundColor: theme.palette.background.default,
  borderRight: `1px solid ${theme.palette.divider}`,
  flexShrink: 0,
}));

const ScrollContainer = styled(Box)({
  display: "flex",
  overflow: "visible",
  position: "relative",
});

const MainScrollArea = styled(Box)({
  display: "flex",
  overflowX: "auto",
  overflowY: "visible",
});

const TimeGrid = styled(Box)(({ theme }) => ({
  display: "flex",
  flexDirection: "column",
  width: "80px",
  flexShrink: 0,
  position: "sticky",
  left: 0,
  zIndex: 2,
  height: "fit-content",
  backgroundColor: theme.palette.background.default,
  borderRight: `1px solid ${theme.palette.divider}`,
}));

const DaysGrid = styled(Box)({
  display: "flex",
  flex: 1,
  overflowX: "auto",
  overflowY: "hidden", // Только горизонтальная прокрутка в заголовке
});

const ContentGrid = styled(Box)({
  display: "flex",
  minWidth: "fit-content",
  height: "fit-content",
});

const DayColumn = styled(Box)(({ theme }) => ({
  width: `${CELL_WIDTH}px`,
  minWidth: `${CELL_WIDTH}px`,
  borderRight: `1px solid ${theme.palette.divider}`,
  display: "flex",
  flexDirection: "column",
}));

const TimeSlot = styled(Box)(({ theme }) => ({
  height: `${CELL_HEIGHT}px`,
  minHeight: `${CELL_HEIGHT}px`,
  borderBottom: `1px solid ${theme.palette.divider}`,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  backgroundColor: theme.palette.background.default,
}));

const LessonSlot = styled(Box)(({ theme }) => ({
  height: `${CELL_HEIGHT}px`,
  minHeight: `${CELL_HEIGHT}px`,
  borderBottom: `1px solid ${theme.palette.divider}`,
  position: "relative",
  display: "flex",
  alignItems: "center",
  padding: "2px",
}));

const DayHeader = styled(Box)(({ theme }) => ({
  height: "80px",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  backgroundColor: theme.palette.background.paper,
  borderBottom: `1px solid ${theme.palette.divider}`,
  position: "sticky",
  top: 0,
  zIndex: 1,
  padding: "4px 2px",
}));

// Утилитарные функции
const generateTimeSlots = (startHour: number, endHour: number) => {
  const slots: string[] = [];
  for (let hour = startHour; hour < endHour; hour++) {
    slots.push(`${hour.toString().padStart(2, "0")}:00`);
  }
  return slots;
};

const generateDateRange = (centerDate: Date, daysAround: number = 30) => {
  const dates = [];
  for (let i = -daysAround; i <= daysAround; i++) {
    const date = new Date(centerDate);
    date.setDate(centerDate.getDate() + i);
    dates.push(date);
  }
  return dates;
};

const getDateKey = (date: Date) => {
  return date.toISOString().split("T")[0];
};

const formatDayHeader = (date: Date) => {
  const today = new Date();
  const isToday = getDateKey(date) === getDateKey(today);

  return {
    dayName: date.toLocaleDateString("ru", { weekday: "short" }),
    dayNumber: date.getDate(),
    monthName: date.toLocaleDateString("ru", { month: "short" }),
    isToday,
  };
};

// getLessonTimeSlot will be computed per-instance inside component (depends on startHour)

export const ScheduleView: React.FC<ScheduleViewProps> = ({
  lessons,
  onLessonClick,
  onLoadMoreDays,
}) => {
  const [centerDate] = useState(new Date());
  const [containerWidth, setContainerWidth] = useState(0);
  const headerScrollRef = React.useRef<HTMLDivElement>(null);
  const mainScrollRef = React.useRef<HTMLDivElement>(null);

  // Compute start and end hour dynamically from lessons
  const { startHour, endHour } = useMemo(() => {
    let minHour = 24;
    let maxHour = 0;
    Object.values(lessons).forEach((dayLessons) => {
      dayLessons.forEach((lesson) => {
        const s = new Date(lesson.startTime).getHours();
        const e = new Date(lesson.endTime).getHours();
        if (!Number.isNaN(s)) minHour = Math.min(minHour, s);
        if (!Number.isNaN(e)) maxHour = Math.max(maxHour, e);
      });
    });
    // fallback to full day if no lessons
    if (minHour === 24) minHour = 8;
    if (maxHour === 0) maxHour = 20;
    // ensure some padding
    const padBefore = 0;
    const padAfter = 0;
    const start = Math.max(0, minHour - padBefore);
    const end = Math.min(24, maxHour + padAfter);
    return { startHour: start, endHour: Math.max(start + 1, end) };
  }, [lessons]);

  const timeSlots = useMemo(
    () => generateTimeSlots(startHour, endHour),
    [startHour, endHour]
  );

  const dateRange = useMemo(() => generateDateRange(centerDate), [centerDate]);

  // Синхронизация прокрутки заголовка и основной области
  const handleHeaderScroll = useCallback(
    (event: React.UIEvent<HTMLDivElement>) => {
      const element = event.currentTarget;
      if (mainScrollRef.current) {
        mainScrollRef.current.scrollLeft = element.scrollLeft;
      }
    },
    []
  );

  const handleMainScroll = useCallback(
    (event: React.UIEvent<HTMLDivElement>) => {
      const element = event.currentTarget;

      // Синхронизация горизонтальной прокрутки с заголовком
      if (headerScrollRef.current) {
        headerScrollRef.current.scrollLeft = element.scrollLeft;
      }

      // Проверяем, нужно ли загрузить больше дней
      const scrollPercentage =
        element.scrollLeft / (element.scrollWidth - element.clientWidth);

      if (scrollPercentage > 0.8) {
        // Загружаем дни справа
        const lastDate = dateRange[dateRange.length - 1];
        const endDate = new Date(lastDate);
        endDate.setDate(lastDate.getDate() + 7);
        onLoadMoreDays(lastDate, endDate);
      } else if (scrollPercentage < 0.2) {
        // Загружаем дни слева
        const firstDate = dateRange[0];
        const startDate = new Date(firstDate);
        startDate.setDate(firstDate.getDate() - 7);
        onLoadMoreDays(startDate, firstDate);
      }
    },
    [dateRange, onLoadMoreDays]
  );

  // Группировка уроков по дням и временным слотам
  const lessonsByDayAndTime = useMemo(() => {
    const grouped: Record<string, Record<number, Lesson[]>> = {};

    Object.entries(lessons).forEach(([dateKey, dayLessons]) => {
      grouped[dateKey] = {};

      dayLessons.forEach((lesson) => {
        const startTime = new Date(lesson.startTime);
        const hour = startTime.getHours();
        const timeSlot = Math.max(0, hour - startHour);
        if (!grouped[dateKey][timeSlot]) {
          grouped[dateKey][timeSlot] = [];
        }
        grouped[dateKey][timeSlot].push(lesson);
      });
    });

    return grouped;
  }, [lessons, startHour]);

  // Инициализация центральной позиции прокрутки
  useEffect(() => {
    if (containerWidth > 0) {
      const todayIndex = dateRange.findIndex(
        (date) => getDateKey(date) === getDateKey(new Date())
      );
      if (todayIndex >= 0) {
        const initialScroll = Math.max(
          0,
          todayIndex * CELL_WIDTH - containerWidth / 2
        );

        // Синхронизируем прокрутку обоих элементов
        if (headerScrollRef.current) {
          headerScrollRef.current.scrollLeft = initialScroll;
        }
        if (mainScrollRef.current) {
          mainScrollRef.current.scrollLeft = initialScroll;
        }
      }
    }
  }, [containerWidth, dateRange]);

  return (
    <ScheduleContainer>
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

      <ScrollContainer>
        <MainScrollArea
          ref={(el: HTMLDivElement | null) => {
            mainScrollRef.current = el;
            if (el && containerWidth === 0) {
              setContainerWidth(el.clientWidth);
            }
          }}
          onScroll={handleMainScroll}
        >
          <TimeGrid>
            {timeSlots.map((time) => (
              <TimeSlot key={time}>
                <Typography variant="caption" color="text.secondary">
                  {time}
                </Typography>
              </TimeSlot>
            ))}
          </TimeGrid>

          <ContentGrid>
            {dateRange.map((date) => {
              const dateKey = getDateKey(date);
              const dayLessons = lessonsByDayAndTime[dateKey] || {};

              return (
                <DayColumn key={dateKey}>
                  {timeSlots.map((time, timeIndex) => {
                    const lessonsInSlot = dayLessons[timeIndex] || [];

                    return (
                      <LessonSlot key={`${dateKey}-${time}`}>
                        {lessonsInSlot.map((lesson, lessonIndex) => (
                          <Box
                            key={lesson.id}
                            position="absolute"
                            top={lessonIndex * 4}
                            left={lessonIndex * 4}
                            right={0}
                            zIndex={lessonsInSlot.length - lessonIndex}
                          >
                            <LessonCell
                              lesson={lesson}
                              onClick={onLessonClick}
                            />
                          </Box>
                        ))}
                      </LessonSlot>
                    );
                  })}
                </DayColumn>
              );
            })}
          </ContentGrid>
        </MainScrollArea>
      </ScrollContainer>
    </ScheduleContainer>
  );
};
