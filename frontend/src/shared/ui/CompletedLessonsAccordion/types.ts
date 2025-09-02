import type { Lesson } from "../../types";

export type GroupedLessons = {
  [year: string]: {
    [month: string]: {
      [day: string]: Lesson[];
    };
  };
};

export type CompletedLessonsAccordionProps = {
  lessons: Lesson[];
  onEdit: (lesson: Lesson) => void;
  onDelete: (lesson: Lesson) => void;
};

export type LessonCardProps = {
  lesson: Lesson;
  onMenuClick: (event: React.MouseEvent<HTMLElement>, lesson: Lesson) => void;
};

export type LessonMenuProps = {
  anchorEl: HTMLElement | null;
  selectedLesson: Lesson | null;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
};

export type DayLessonsProps = {
  day: string;
  lessons: Lesson[];
  onMenuClick: (event: React.MouseEvent<HTMLElement>, lesson: Lesson) => void;
};

export type UseCompletedLessonsAccordionReturn = {
  expandedYears: Record<string, boolean>;
  expandedMonths: Record<string, boolean>;
  expandedDays: Record<string, boolean>;
  handleYearToggle: (year: string) => void;
  handleMonthToggle: (monthKey: string) => void;
  handleDayToggle: (dayKey: string) => void;
};
