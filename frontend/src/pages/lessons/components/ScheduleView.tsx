import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
} from "react";
import {
  Box,
  Typography,
  CircularProgress,
  Checkbox,
  FormControlLabel,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import { styled } from "@mui/material/styles";
import { LessonCell } from "./LessonCell";
import type { Lesson } from "../../../shared";
import { useStore } from "effector-react";
import { loadScheduleLessonsFx } from "../../../entities/lesson/model/lesson";

type ScheduleViewProps = {
  lessons: Record<string, Lesson[]>; // Уроки по дням (ключ - дата в формате YYYY-MM-DD)
  onLessonClick: (lesson: Lesson) => void;
  onLoadMoreDays: (startDate: Date, endDate: Date) => void;
};

const CELL_WIDTH = 180; // Ширина колонки дня
const CELL_HEIGHT = 116; // Высота временного слота
const CELL_HEIGHT_COMPACT = 27; // Высота временного слота для краткой формы

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
  zIndex: 35,
  borderTopLeftRadius: theme.shape.borderRadius,
  borderTopRightRadius: theme.shape.borderRadius,
  overflow: "hidden",
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

const LoaderOverlay = styled(Box)(({ theme }) => ({
  position: "absolute",
  inset: 0,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  backgroundColor: "rgba(255,255,255,0.6)",
  zIndex: 20,
  pointerEvents: "auto",
}));

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
  zIndex: 30,
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
  position: "relative",
  overflow: "hidden",
}));

const TimeSlot = styled(Box)(({ theme }) => ({
  height: `${CELL_HEIGHT}px`,
  minHeight: `${CELL_HEIGHT}px`,
  borderBottom: `1px solid ${theme.palette.divider}`,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  zIndex: 30,
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
  const [compactMode, setCompactMode] = useState(false);
  const [containerWidth, setContainerWidth] = useState(0);
  const theme = useTheme();
  const headerScrollRef = React.useRef<HTMLDivElement>(null);
  const mainScrollRef = React.useRef<HTMLDivElement>(null);

  const [now, setNow] = useState<Date>(() => new Date());

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

  const activeCellHeight = compactMode ? CELL_HEIGHT_COMPACT : CELL_HEIGHT;

  // Track already requested ranges to avoid duplicate requests
  const requestedRangesRef = useRef<Set<string>>(new Set());

  // Compute currently loaded min/max dates from the lessons prop
  const { minLoadedDate, maxLoadedDate } = useMemo(() => {
    const keys = Object.keys(lessons || {});
    if (keys.length === 0) return { minLoadedDate: null, maxLoadedDate: null };
    const dates = keys.map((k) => new Date(k));
    const times = dates.map((d) => d.getTime());
    const min = new Date(Math.min(...times));
    const max = new Date(Math.max(...times));
    return { minLoadedDate: min, maxLoadedDate: max };
  }, [lessons]);

  // Build dateRange from loaded data when available, otherwise fallback to centerDate-based range
  const dateRange = useMemo(() => {
    if (minLoadedDate && maxLoadedDate) {
      const start = new Date(minLoadedDate);
      const end = new Date(maxLoadedDate);
      // add small buffer so user can scroll a bit beyond loaded range
      start.setDate(start.getDate() - 3);
      end.setDate(end.getDate() + 3);
      const dates: Date[] = [];
      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        dates.push(new Date(d));
      }
      return dates;
    }

    return generateDateRange(centerDate);
  }, [minLoadedDate, maxLoadedDate, centerDate]);

  // Tick every minute to update current time and refresh today's lessons
  useEffect(() => {
    const tick = () => setNow(new Date());
    const interval = window.setInterval(tick, 60 * 1000);
    // also update immediately at mount
    tick();
    return () => clearInterval(interval);
  }, []);

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

      // Проверяем, нужно ли загрузить больше дней — по расстоянию до краёв (150px)
      const distanceToRight =
        element.scrollWidth - element.clientWidth - element.scrollLeft;
      const distanceToLeft = element.scrollLeft;
      const EDGE_THRESHOLD = 150; // px

      if (distanceToRight < EDGE_THRESHOLD && maxLoadedDate) {
        // Загружаем дни справа
        const endDate = new Date(maxLoadedDate);
        endDate.setDate(maxLoadedDate.getDate() + 7);

        const key = `${maxLoadedDate.toISOString()}_${endDate.toISOString()}`;
        if (requestedRangesRef.current.has(key)) return;
        requestedRangesRef.current.add(key);

        onLoadMoreDays(maxLoadedDate, endDate);
      } else if (distanceToLeft < EDGE_THRESHOLD && minLoadedDate) {
        // Загружаем дни слева
        const startDate = new Date(minLoadedDate);
        startDate.setDate(minLoadedDate.getDate() - 7);

        const key = `${startDate.toISOString()}_${minLoadedDate.toISOString()}`;
        if (requestedRangesRef.current.has(key)) return;
        requestedRangesRef.current.add(key);

        onLoadMoreDays(startDate, minLoadedDate);
      }
    },
    [onLoadMoreDays, minLoadedDate, maxLoadedDate]
  );

  // Инициализация центральной позиции прокрутки
  const didInitialCenterRef = useRef(false);

  // Initial centering only once — do not recenter on subsequent data loads
  useEffect(() => {
    if (didInitialCenterRef.current) return;
    if (containerWidth > 0 && dateRange.length > 0) {
      const todayIndex = dateRange.findIndex(
        (date) => getDateKey(date) === getDateKey(new Date())
      );
      if (todayIndex >= 0 && Object.keys(lessons).length > 0) {
        const initialScroll = Math.max(
          0,
          todayIndex * CELL_WIDTH - containerWidth / 2 + 80
        );

        // Синхронизируем прокрутку обоих элементов
        if (headerScrollRef.current) {
          headerScrollRef.current.scrollLeft = initialScroll;
        }
        if (mainScrollRef.current) {
          mainScrollRef.current.scrollLeft = initialScroll;
        }
        didInitialCenterRef.current = true;
      }
    }
  }, [containerWidth, dateRange, lessons]);
  const isScheduleLoading = useStore(loadScheduleLessonsFx.pending);

  // Preserve scroll position when new days are prepended: if dateRange start moves earlier,
  // shift scrollLeft by number of added days * CELL_WIDTH so user's viewport stays in place.
  const prevStartRef = useRef<Date | null>(null);
  useEffect(() => {
    if (!mainScrollRef.current) {
      prevStartRef.current = dateRange[0] || null;
      return;
    }

    const prevStart = prevStartRef.current;
    const newStart = dateRange[0] || null;
    if (!prevStart || !newStart) {
      prevStartRef.current = newStart;
      return;
    }

    const msPerDay = 24 * 60 * 60 * 1000;
    const diffDays = Math.round(
      (prevStart.getTime() - newStart.getTime()) / msPerDay
    );
    if (diffDays > 0) {
      const deltaPx = diffDays * CELL_WIDTH;
      // adjust both header and main scrolls
      if (mainScrollRef.current) {
        mainScrollRef.current.scrollLeft =
          (mainScrollRef.current.scrollLeft || 0) + deltaPx;
      }
      if (headerScrollRef.current) {
        headerScrollRef.current.scrollLeft =
          (headerScrollRef.current.scrollLeft || 0) + deltaPx;
      }
    }

    prevStartRef.current = newStart;
  }, [dateRange]);

  return (
    <>
      <Box display="flex" alignItems="center" px={2}>
        <FormControlLabel
          control={
            <Checkbox
              size="small"
              checked={compactMode}
              onChange={(_, v) => setCompactMode(v)}
            />
          }
          label={<Typography variant="caption">Краткая форма</Typography>}
        />
      </Box>

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
          {isScheduleLoading && (
            <LoaderOverlay>
              <CircularProgress />
            </LoaderOverlay>
          )}
          <MainScrollArea
            ref={(el: HTMLDivElement | null) => {
              mainScrollRef.current = el;
              if (el && containerWidth === 0) {
                setContainerWidth(el.clientWidth);
              }
            }}
            onScroll={handleMainScroll}
            style={{ pointerEvents: isScheduleLoading ? "none" : "auto" }}
          >
            <TimeGrid>
              {timeSlots.map((time) => (
                <TimeSlot
                  key={time}
                  style={{
                    height: activeCellHeight,
                    minHeight: activeCellHeight,
                  }}
                >
                  <Typography variant="caption" color="text.secondary">
                    {time}
                  </Typography>
                </TimeSlot>
              ))}
            </TimeGrid>

            <ContentGrid>
              {dateRange.map((date) => {
                const dateKey = getDateKey(date);
                const isToday = dateKey === getDateKey(now);

                return (
                  <DayColumn
                    key={dateKey}
                    style={
                      isToday
                        ? { backgroundColor: theme.palette.action.hover }
                        : undefined
                    }
                  >
                    {timeSlots.map((time) => (
                      <LessonSlot
                        key={`${dateKey}-${time}`}
                        style={{
                          height: activeCellHeight,
                          minHeight: activeCellHeight,
                        }}
                      />
                    ))}

                    {/* Render lessons positioned by exact start/end time (minutes) */}
                    {(lessons[dateKey] || [])
                      .sort(
                        (a, b) =>
                          new Date(a.startTime).getTime() -
                          new Date(b.startTime).getTime()
                      )
                      .map((lesson, lessonIndex) => {
                        const start = new Date(lesson.startTime);
                        const end = new Date(lesson.endTime);
                        const minutesFromStartHour =
                          (start.getHours() - startHour) * 60 +
                          start.getMinutes();
                        const durationMinutes = Math.max(
                          15,
                          Math.round((end.getTime() - start.getTime()) / 60000)
                        );

                        const topPx =
                          (minutesFromStartHour / 60) * activeCellHeight;
                        const heightPx =
                          (durationMinutes / 60) * activeCellHeight;

                        return (
                          <Box
                            key={lesson.id}
                            position="absolute"
                            top={topPx}
                            left={0}
                            right={0}
                            height={Math.max(24, heightPx)}
                            zIndex={10 + (lessonIndex % 5)}
                            onClick={() => onLessonClick(lesson)}
                          >
                            <LessonCell
                              lesson={lesson}
                              onClick={onLessonClick}
                              compact={compactMode}
                            />
                          </Box>
                        );
                      })}
                    {(() => {
                      const nowHours = now.getHours() + now.getMinutes() / 60;
                      const topPx = (nowHours - startHour) * activeCellHeight;
                      if (
                        topPx >= 0 &&
                        topPx <= timeSlots.length * activeCellHeight
                      ) {
                        return (
                          <Box
                            key={`now-line-${dateKey}`}
                            position="absolute"
                            left={0}
                            right={0}
                            top={topPx}
                            height={2}
                            sx={{
                              backgroundColor: theme.palette.error.main,
                              zIndex: 5,
                            }}
                          />
                        );
                      }
                      return null;
                    })()}
                  </DayColumn>
                );
              })}
            </ContentGrid>
          </MainScrollArea>
        </ScrollContainer>
      </ScheduleContainer>
    </>
  );
};
