import type { FC } from "react";

import type { Lesson } from "@shared";

import { LessonBlock } from "../LessonBlock";
import { NowLine } from "../NowLine";
import { getDateKey } from "../ScheduleView.helpers";
import * as Styled from "../ScheduleView.styled";

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

export const DayColumnView: FC<DayColumnViewProps> = ({
  dateKey,
  timeSlots,
  lessons,
  startHour,
  activeCellHeight,
  onLessonClick,
  now,
  compactMode = false,
}) => {
  const isToday = dateKey === getDateKey(now);

  return (
    <Styled.DayColumn key={dateKey} $isToday={isToday}>
      {timeSlots.map((time) => (
        <Styled.LessonSlot key={`${dateKey}-${time}`} $height={activeCellHeight} />
      ))}
      {(lessons || [])
        .slice()
        .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())
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
    </Styled.DayColumn>
  );
};
