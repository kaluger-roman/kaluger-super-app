import React, { useMemo, useState } from "react";
import { Accordion, AccordionSummary, AccordionDetails, Typography, Box } from "@mui/material";
import { ExpandMore } from "@mui/icons-material";
import type { Lesson } from "../../types";
import { CompletedLessonsAccordionProps } from "./types";
import { groupLessonsByDate } from "./groupLessons";
import { useCompletedLessonsAccordion } from "./useCompletedLessonsAccordion";
import { LessonMenu } from "./LessonMenu";
import { DayLessons } from "./DayLessons";
import { sortYears, sortMonths, sortDays } from "./utils";

export const CompletedLessonsAccordion = ({
  lessons,
  onEdit,
  onDelete,
}: CompletedLessonsAccordionProps) => {
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null);

  const groupedLessons = useMemo(() => groupLessonsByDate(lessons), [lessons]);

  const {
    expandedYears,
    expandedMonths,
    handleYearToggle,
    handleMonthToggle,
  } = useCompletedLessonsAccordion(groupedLessons);

  const completedLessonsCount = lessons.filter(
    (lesson) => lesson.status === "COMPLETED" || lesson.status === "CANCELLED"
  ).length;

  const handleMenuClick = (event: React.MouseEvent<HTMLElement>, lesson: Lesson) => {
    event.stopPropagation();
    setAnchorEl(event.currentTarget);
    setSelectedLesson(lesson);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedLesson(null);
  };

  const handleEdit = () => {
    if (selectedLesson) {
      onEdit(selectedLesson);
    }
    handleMenuClose();
  };

  const handleDelete = () => {
    if (selectedLesson) {
      onDelete(selectedLesson);
    }
    handleMenuClose();
  };

  if (completedLessonsCount === 0) {
    return null;
  }

  return (
    <>
      <Accordion defaultExpanded={false}>
        <AccordionSummary expandIcon={<ExpandMore />}>
          <Typography variant="h6">
            📚 Прошедшие уроки ({completedLessonsCount})
          </Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Box display="flex" flexDirection="column" gap={2}>
            {Object.entries(groupedLessons)
              .sort(sortYears)
              .map(([year, yearData]) => (
                <Accordion
                  key={year}
                  expanded={expandedYears[year] || false}
                  onChange={() => handleYearToggle(year)}
                >
                  <AccordionSummary expandIcon={<ExpandMore />}>
                    <Typography variant="h6">{year}</Typography>
                  </AccordionSummary>
                  <AccordionDetails>
                    <Box display="flex" flexDirection="column" gap={2}>
                      {Object.entries(yearData)
                        .sort(sortMonths)
                        .map(([month, monthData]) => {
                          const monthKey = `${year}-${month}`;
                          return (
                            <Accordion
                              key={monthKey}
                              expanded={expandedMonths[monthKey] || false}
                              onChange={() => handleMonthToggle(monthKey)}
                            >
                              <AccordionSummary expandIcon={<ExpandMore />}>
                                <Typography variant="subtitle1">{month}</Typography>
                              </AccordionSummary>
                              <AccordionDetails>
                                <Box display="flex" flexDirection="column" gap={1}>
                                  {Object.entries(monthData)
                                    .sort(sortDays)
                                    .map(([day, dayLessons]) => {
                                      const dayKey = `${monthKey}-${day}`;
                                      return (
                                        <DayLessons
                                          key={dayKey}
                                          day={day}
                                          lessons={dayLessons}
                                          onMenuClick={handleMenuClick}
                                        />
                                      );
                                    })}
                                </Box>
                              </AccordionDetails>
                            </Accordion>
                          );
                        })}
                    </Box>
                  </AccordionDetails>
                </Accordion>
              ))}
          </Box>
        </AccordionDetails>
      </Accordion>

      <LessonMenu
        anchorEl={anchorEl}
        selectedLesson={selectedLesson}
        onClose={handleMenuClose}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />
    </>
  );
};
