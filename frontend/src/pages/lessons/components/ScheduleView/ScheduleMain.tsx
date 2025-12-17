import React from "react";
import { Typography } from "@mui/material";
import {
  MainScrollArea,
  TimeGrid,
  TimeSlot,
  ContentGrid,
} from "./ScheduleView.styled";
import type { Lesson } from "../../../../shared";
import { DayColumnView } from "./DayColumnView";

type ScheduleMainProps = {
  dateRange: Date[];
  timeSlots: string[];
  lessons: Record<string, Lesson[]>;
  mainScrollRef: React.Ref<HTMLDivElement>;
  onLessonClick: (lesson: Lesson) => void;
  handleMainScroll: (e: React.UIEvent<HTMLDivElement>) => void;
  startHour: number;
  activeCellHeight: number;
  compactMode?: boolean;
  now: Date;
  isLoading?: boolean;
};

export const ScheduleMain: React.FC<ScheduleMainProps> = ({
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
  return (
    <MainScrollArea
      ref={mainScrollRef}
      onScroll={handleMainScroll}
      style={{ pointerEvents: isLoading ? "none" : "auto" }}
    >
      <TimeGrid>
        {timeSlots.map((time) => (
          <TimeSlot
            key={time}
            style={{ height: activeCellHeight, minHeight: activeCellHeight }}
          >
            <Typography variant="caption" color="text.secondary">
              {time}
            </Typography>
          </TimeSlot>
        ))}
      </TimeGrid>

      <ContentGrid>
        {dateRange.map((date) => {
          const dateKey = date.toISOString().split("T")[0];
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
              now={now}
            />
          );
        })}
      </ContentGrid>
    </MainScrollArea>
  );
};
