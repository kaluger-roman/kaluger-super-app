import { Fragment, memo, useCallback } from "react";
import type { MouseEvent } from "react";

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
  onToggle: (month: string) => void;
  onCardClick: (lesson: Lesson) => void;
  onMenuClick: (event: MouseEvent<HTMLElement>, lesson: Lesson) => void;
  type: LessonListType;
};

export const LessonsMonth = memo<LessonsMonthProps>(
  ({ month, monthData, isCollapsed, onToggle, onCardClick, onMenuClick }) => {
    const handleToggle = useCallback(() => {
      onToggle(month);
    }, [onToggle, month]);

    return (
      <Fragment>
        <Styled.MonthBox
          onClick={handleToggle}
          role="button"
          tabIndex={0}
          aria-expanded={!isCollapsed}
          aria-label={`${month}, ${isCollapsed ? "раскрыть" : "свернуть"}`}
          onKeyDown={handleActivationKey(handleToggle)}
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
  },
);

LessonsMonth.displayName = "LessonsMonth";
