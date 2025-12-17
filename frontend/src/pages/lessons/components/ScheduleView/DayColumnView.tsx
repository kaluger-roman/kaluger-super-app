import React from "react";
import { useTheme } from "@mui/material/styles";

import { DayColumn, LessonSlot } from "./ScheduleView.styled";
import type { Lesson } from "../../../../shared";
import { LessonBlock } from "./LessonBlock/LessonBlock";
import { NowLine } from "./NowLine/NowLine";
import { getDateKey } from "./ScheduleView.helpers";

type DayColumnViewProps = {
  dateKey: string;
  timeSlots: string[];
  lessons: Lesson[];
  startHour: number;
  activeCellHeight: number;
  onLessonClick: (lesson: Lesson) => void;
  now: Date;
  compactMode?: boolean;
};

export const DayColumnView: React.FC<DayColumnViewProps> = ({
  dateKey,
  timeSlots,
  lessons,
  startHour,
  activeCellHeight,
  onLessonClick,
  now,
  compactMode = false,
}) => {
  const theme = useTheme();
  const isToday = dateKey === getDateKey(now);

  return (
    <DayColumn
      key={dateKey}
      style={isToday ? { backgroundColor: theme.palette.action.hover } : undefined}
    >
      {timeSlots.map((time) => (
        <LessonSlot
          key={`${dateKey}-${time}`}
          style={{ height: activeCellHeight, minHeight: activeCellHeight }}
        />
      ))}
      {(lessons || [])
        .slice()
        .sort(
          (a, b) =>
            new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
        )
        .map((lesson, lessonIndex) => (
          <LessonBlock
            key={lesson.id}
            lesson={lesson}
            lessonIndex={lessonIndex}
            startHour={startHour}
            activeCellHeight={activeCellHeight}
            onLessonClick={onLessonClick}
            compact={compactMode}
          />
        ))}

      <NowLine
        now={now}
        startHour={startHour}
        activeCellHeight={activeCellHeight}
        timeSlotsCount={timeSlots.length}
        dateKey={dateKey}
      />
    </DayColumn>
  );
};
