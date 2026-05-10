import { useMemo } from "react";
import type { FC, Ref, UIEvent } from "react";

import { Typography } from "@mui/material";

import type { Lesson } from "@shared";
import { toDateKey } from "@shared";

import { DayColumnView } from "../DayColumnView";
import * as Styled from "../ScheduleView.styled";

type ScheduleMainProps = {
  dateRange: Date[];
  timeSlots: string[];
  lessons: Record<string, Lesson[]>;
  mainScrollRef: Ref<HTMLDivElement>;
  onLessonClick: (lesson: Lesson) => void;
  handleMainScroll: (e: UIEvent<HTMLDivElement>) => void;
  startHour: number;
  activeCellHeight: number;
  compactMode?: boolean;
  now: Date;
  isLoading?: boolean;
};

export const ScheduleMain: FC<ScheduleMainProps> = ({
  dateRange,
  timeSlots,
  lessons,
  mainScrollRef,
  onLessonClick,
  handleMainScroll,
  startHour,
  activeCellHeight,
  now,
  compactMode = false,
  isLoading = false,
}) => {
  // Today's dateKey changes only when the day rolls over, not every minute.
  // Memoizing it ensures non-today DayColumnView instances receive stable
  // props and skip re-renders when `now` ticks.
  const todayKey = useMemo(() => toDateKey(now), [now]);

  return (
    <Styled.MainScrollArea ref={mainScrollRef} onScroll={handleMainScroll} $isLoading={isLoading}>
      <Styled.TimeGrid>
        {timeSlots.map((time) => (
          <Styled.TimeSlot key={time} $height={activeCellHeight}>
            <Typography variant="caption" color="text.secondary">
              {time}
            </Typography>
          </Styled.TimeSlot>
        ))}
      </Styled.TimeGrid>

      <Styled.ContentGrid>
        {dateRange.map((date) => {
          const dateKey = toDateKey(date);
          const isToday = dateKey === todayKey;
          return (
            <DayColumnView
              key={dateKey}
              dateKey={dateKey}
              timeSlots={timeSlots}
              lessons={lessons[dateKey] || []}
              startHour={startHour}
              activeCellHeight={activeCellHeight}
              onLessonClick={onLessonClick}
              compactMode={compactMode}
              isToday={isToday}
              nowForLine={isToday ? now : undefined}
            />
          );
        })}
      </Styled.ContentGrid>
    </Styled.MainScrollArea>
  );
};
