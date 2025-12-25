import type { FC, MouseEvent } from "react";
import { Fragment } from "react";

import { Collapse } from "@mui/material";

import type { Lesson } from "../../../../types";
import { LessonsDay } from "../LessonsDay";
import * as Styled from "./LessonsMonth.styled";

type LessonsMonthProps = {
  month: string;
  monthData: { [day: string]: Lesson[] };
  isCollapsed: boolean;
  onToggle: () => void;
  onCardClick: (lesson: Lesson) => void;
  onMenuClick: (event: MouseEvent<HTMLElement>, lesson: Lesson) => void;
  onPaymentChange: (lessonId: string, isPaid: boolean) => void;
  onHomeworkSentChange?: (lessonId: string, isSent: boolean) => void;
  type: "scheduled" | "completed" | "cancelled" | "rescheduled";
};

export const LessonsMonth: FC<LessonsMonthProps> = ({
  month,
  monthData,
  isCollapsed,
  onToggle,
  onCardClick,
  onMenuClick,
  onPaymentChange,
  onHomeworkSentChange,
}) => {
  return (
    <Fragment>
      <Styled.MonthBox onClick={onToggle}>
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
            onPaymentChange={onPaymentChange}
            onHomeworkSentChange={onHomeworkSentChange}
          />
        ))}
      </Collapse>
    </Fragment>
  );
};
