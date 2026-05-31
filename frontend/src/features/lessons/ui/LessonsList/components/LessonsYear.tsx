import { Fragment, memo, useCallback, useMemo } from "react";
import type { MouseEvent } from "react";

import { Collapse } from "@mui/material";

import type { Lesson } from "@shared";
import { handleActivationKey } from "@shared";

import type { LessonListType } from "../LessonsList.types";
import { LessonsMonth } from "./LessonsMonth";
import * as Styled from "./LessonsYear.styled";
import { sortMonths } from "../LessonsList.helpers";

type LessonsYearProps = {
  year: string;
  yearData: { [month: string]: { [day: string]: Lesson[] } };
  isCollapsed: boolean;
  collapsedMonths: Record<string, boolean>;
  onToggleYear: (year: string) => void;
  onToggleMonth: (year: string, month: string) => void;
  onCardClick: (lesson: Lesson) => void;
  onMenuClick: (event: MouseEvent<HTMLElement>, lesson: Lesson) => void;
  type: LessonListType;
};

export const LessonsYear = memo<LessonsYearProps>(
  ({
    year,
    yearData,
    isCollapsed,
    collapsedMonths,
    onToggleYear,
    onToggleMonth,
    onCardClick,
    onMenuClick,
    type,
  }) => {
    const sortedMonths = useMemo(
      () => sortMonths(Object.entries(yearData), type),
      [yearData, type],
    );

    const handleToggleYear = useCallback(() => {
      onToggleYear(year);
    }, [onToggleYear, year]);

    const handleToggleMonth = useCallback(
      (month: string) => {
        onToggleMonth(year, month);
      },
      [onToggleMonth, year],
    );

    return (
      <Fragment>
        <Styled.YearBox
          onClick={handleToggleYear}
          role="button"
          tabIndex={0}
          aria-expanded={!isCollapsed}
          aria-label={`${year}, ${isCollapsed ? "раскрыть" : "свернуть"}`}
          onKeyDown={handleActivationKey(handleToggleYear)}
        >
          <Styled.YearText variant="h5">{year}</Styled.YearText>
          {isCollapsed ? <Styled.WhiteExpandMore /> : <Styled.WhiteExpandLess />}
        </Styled.YearBox>
        <Collapse in={!isCollapsed} timeout="auto" unmountOnExit>
          {sortedMonths.map(([month, monthData]) => {
            const monthKey = `${year}_${month}`;
            const isMonthCollapsed = collapsedMonths[monthKey] ?? false;

            return (
              <LessonsMonth
                key={month}
                month={month}
                monthData={monthData}
                isCollapsed={isMonthCollapsed}
                onToggle={handleToggleMonth}
                onCardClick={onCardClick}
                onMenuClick={onMenuClick}
                type={type}
              />
            );
          })}
        </Collapse>
      </Fragment>
    );
  },
);

LessonsYear.displayName = "LessonsYear";
