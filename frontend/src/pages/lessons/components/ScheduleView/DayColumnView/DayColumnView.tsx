import { memo, useMemo } from "react";

import type { Lesson } from "@shared";

import { sortByStartTime } from "./DayColumnView.helpers";
import { LessonBlock } from "../LessonBlock";
import { NowLine } from "../NowLine";
import * as Styled from "../ScheduleView.styled";

type DayColumnViewProps = {
  dateKey: string;
  timeSlots: string[];
  lessons: Lesson[];
  startHour: number;
  activeCellHeight: number;
  onLessonClick: (lesson: Lesson) => void;
  isToday: boolean;
  nowForLine?: Date;
  compactMode?: boolean;
};

export const DayColumnView = memo<DayColumnViewProps>(
  ({
    dateKey,
    timeSlots,
    lessons,
    startHour,
    activeCellHeight,
    onLessonClick,
    isToday,
    nowForLine,
    compactMode = false,
  }) => {
    const sortedLessons = useMemo(() => sortByStartTime(lessons || []), [lessons]);

    return (
      <Styled.DayColumn key={dateKey} $isToday={isToday}>
        {timeSlots.map((time) => (
          <Styled.LessonSlot key={`${dateKey}-${time}`} $height={activeCellHeight} />
        ))}
        {sortedLessons.map((lesson, lessonIndex) => (
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

        {nowForLine ? (
          <NowLine
            now={nowForLine}
            startHour={startHour}
            activeCellHeight={activeCellHeight}
            timeSlotsCount={timeSlots.length}
            dateKey={dateKey}
          />
        ) : null}
      </Styled.DayColumn>
    );
  },
);
DayColumnView.displayName = "DayColumnView";
