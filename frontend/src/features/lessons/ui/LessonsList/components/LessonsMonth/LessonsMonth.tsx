import type { FC, MouseEvent } from "react";
import { Fragment } from "react";

import { Collapse } from "@mui/material";

import type { Lesson } from "@shared";
import { handleActivationKey } from "@shared";

import type { LessonListType } from "../../LessonsList.types";
import { LessonsDay } from "../LessonsDay";
import * as Styled from "./LessonsMonth.styled";

type LessonsMonthProps = {
  month: string;
  monthData: { [day: string]: Lesson[] };
  isCollapsed: boolean;
  onToggle: () => void;
  onCardClick: (lesson: Lesson) => void;
  onMenuClick: (event: MouseEvent<HTMLElement>, lesson: Lesson) => void;
  type: LessonListType;
};

export const LessonsMonth: FC<LessonsMonthProps> = ({
  month,
  monthData,
  isCollapsed,
  onToggle,
  onCardClick,
  onMenuClick,
}) => {
  return (
    <Fragment>
      <Styled.MonthBox
        onClick={onToggle}
        role="button"
        tabIndex={0}
        aria-expanded={!isCollapsed}
        aria-label={`${month}, ${isCollapsed ? "раскрыть" : "свернуть"}`}
        onKeyDown={handleActivationKey(onToggle)}
      >
        <Styled.MonthText variant="h6">📅&nbsp;&nbsp;&nbsp;{month}</Styled.MonthText>
        {isCollapsed ? <Styled.WhiteExpandMore /> : <Styled.WhiteExpandLess />}
      </Styled.MonthBox>
      <Collapse in={!isCollapsed} timeout="auto" unmountOnExit>
        {Object.entries(monthData).map(([day, dayLessons]) => (
          <LessonsDay
            key={day}
            day={day}
            lessons={dayLessons}
            onCardClick={onCardClick}
            onMenuClick={onMenuClick}
          />
        ))}
      </Collapse>
    </Fragment>
  );
};
