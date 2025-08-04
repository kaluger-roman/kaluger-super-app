import React, { useMemo } from "react";
import {
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Typography,
  Box,
  Chip,
  Card,
  CardContent,
  IconButton,
  Menu,
  MenuItem,
} from "@mui/material";
import {
  ExpandMore as ExpandMoreIcon,
  MoreVert as MoreVertIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
} from "@mui/icons-material";
import { Lesson, SUBJECT_LABELS, LESSON_TYPE_LABELS } from "../types";
import { formatDateTime } from "../lib/date";

type CompletedLessonsAccordionProps = {
  lessons: Lesson[];
  onEdit: (lesson: Lesson) => void;
  onDelete: (lesson: Lesson) => void;
};

type GroupedLessons = {
  [year: string]: {
    [month: string]: {
      [day: string]: Lesson[];
    };
  };
};

const getStatusColor = (status: string) => {
  switch (status) {
    case "COMPLETED":
      return "success";
    case "CANCELLED":
      return "error";
    default:
      return "default";
  }
};

const getStatusText = (status: string) => {
  switch (status) {
    case "COMPLETED":
      return "Завершен";
    case "CANCELLED":
      return "Отменен";
    default:
      return status;
  }
};

export const CompletedLessonsAccordion: React.FC<
  CompletedLessonsAccordionProps
> = ({ lessons, onEdit, onDelete }) => {
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);
  const [selectedLesson, setSelectedLesson] = React.useState<Lesson | null>(
    null
  );

  const completedLessons = lessons.filter(
    (lesson) => lesson.status === "COMPLETED" || lesson.status === "CANCELLED"
  );

  const groupedLessons = useMemo(() => {
    const grouped: GroupedLessons = {};

    completedLessons.forEach((lesson) => {
      const date = new Date(lesson.startTime);
      const year = date.getFullYear().toString();
      const month = date.toLocaleDateString("ru-RU", {
        month: "long",
        year: "numeric",
      });
      const day = date.toLocaleDateString("ru-RU", {
        weekday: "long",
        day: "numeric",
        month: "long",
      });

      if (!grouped[year]) grouped[year] = {};
      if (!grouped[year][month]) grouped[year][month] = {};
      if (!grouped[year][month][day]) grouped[year][month][day] = [];

      grouped[year][month][day].push(lesson);
    });

    // Сортируем уроки в каждом дне по времени (новые первыми)
    Object.values(grouped).forEach((yearData) => {
      Object.values(yearData).forEach((monthData) => {
        Object.values(monthData).forEach((dayLessons) => {
          dayLessons.sort(
            (a, b) =>
              new Date(b.startTime).getTime() - new Date(a.startTime).getTime()
          );
        });
      });
    });

    return grouped;
  }, [completedLessons]);

  const handleMenuClick = (
    event: React.MouseEvent<HTMLElement>,
    lesson: Lesson
  ) => {
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

  if (completedLessons.length === 0) {
    return null;
  }

  return (
    <>
      <Accordion defaultExpanded={false}>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography variant="h6">
            📚 Прошедшие уроки ({completedLessons.length})
          </Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Box display="flex" flexDirection="column" gap={2}>
            {Object.entries(groupedLessons)
              .sort(([a], [b]) => parseInt(b) - parseInt(a)) // Сортируем годы по убыванию
              .map(([year, yearData]) => (
                <Accordion key={year} defaultExpanded={false}>
                  <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Typography variant="h6">{year}</Typography>
                  </AccordionSummary>
                  <AccordionDetails>
                    <Box display="flex" flexDirection="column" gap={2}>
                      {Object.entries(yearData)
                        .sort(([a], [b]) => {
                          // Сортируем месяцы по убыванию
                          const monthOrder = [
                            "январь",
                            "февраль",
                            "март",
                            "апрель",
                            "май",
                            "июнь",
                            "июль",
                            "август",
                            "сентябрь",
                            "октябрь",
                            "ноябрь",
                            "декабрь",
                          ];
                          const aMonth = a.split(" ")[0].toLowerCase();
                          const bMonth = b.split(" ")[0].toLowerCase();
                          return (
                            monthOrder.indexOf(bMonth) -
                            monthOrder.indexOf(aMonth)
                          );
                        })
                        .map(([month, monthData]) => (
                          <Accordion key={month} defaultExpanded={false}>
                            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                              <Typography variant="subtitle1">
                                {month}
                              </Typography>
                            </AccordionSummary>
                            <AccordionDetails>
                              <Box
                                display="flex"
                                flexDirection="column"
                                gap={1}
                              >
                                {Object.entries(monthData)
                                  .sort(([a], [b]) => {
                                    // Сортируем дни по убыванию
                                    const aDate = new Date(a);
                                    const bDate = new Date(b);
                                    return bDate.getTime() - aDate.getTime();
                                  })
                                  .map(([day, dayLessons]) => (
                                    <Box key={day}>
                                      <Typography
                                        variant="subtitle2"
                                        sx={{
                                          mb: 1,
                                          fontWeight: 600,
                                          textTransform: "capitalize",
                                        }}
                                      >
                                        {day}
                                      </Typography>
                                      {dayLessons.map((lesson) => (
                                        <Card key={lesson.id} sx={{ mb: 1 }}>
                                          <CardContent
                                            sx={{
                                              py: 1.5,
                                              "&:last-child": { pb: 1.5 },
                                            }}
                                          >
                                            <Box
                                              display="flex"
                                              justifyContent="space-between"
                                              alignItems="flex-start"
                                            >
                                              <Box flex={1}>
                                                <Typography
                                                  variant="body2"
                                                  sx={{ fontWeight: 600 }}
                                                >
                                                  {
                                                    SUBJECT_LABELS[
                                                      lesson.subject
                                                    ]
                                                  }{" "}
                                                  •{" "}
                                                  {
                                                    LESSON_TYPE_LABELS[
                                                      lesson.lessonType
                                                    ]
                                                  }
                                                </Typography>
                                                <Typography
                                                  variant="caption"
                                                  color="text.secondary"
                                                >
                                                  {lesson.student?.name} •{" "}
                                                  {formatDateTime(
                                                    new Date(lesson.startTime)
                                                  )}
                                                </Typography>
                                                {lesson.price && (
                                                  <Typography
                                                    variant="caption"
                                                    color="text.secondary"
                                                  >
                                                    {" • "}
                                                    {lesson.price} ₽
                                                  </Typography>
                                                )}
                                              </Box>
                                              <Box
                                                display="flex"
                                                alignItems="center"
                                                gap={1}
                                              >
                                                <Chip
                                                  label={getStatusText(
                                                    lesson.status
                                                  )}
                                                  color={
                                                    getStatusColor(
                                                      lesson.status
                                                    ) as any
                                                  }
                                                  size="small"
                                                />
                                                <IconButton
                                                  size="small"
                                                  onClick={(e) =>
                                                    handleMenuClick(e, lesson)
                                                  }
                                                >
                                                  <MoreVertIcon />
                                                </IconButton>
                                              </Box>
                                            </Box>
                                          </CardContent>
                                        </Card>
                                      ))}
                                    </Box>
                                  ))}
                              </Box>
                            </AccordionDetails>
                          </Accordion>
                        ))}
                    </Box>
                  </AccordionDetails>
                </Accordion>
              ))}
          </Box>
        </AccordionDetails>
      </Accordion>

      {/* Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
      >
        <MenuItem onClick={handleEdit}>
          <EditIcon sx={{ mr: 1 }} />
          Редактировать
        </MenuItem>
        <MenuItem onClick={handleDelete} sx={{ color: "error.main" }}>
          <DeleteIcon sx={{ mr: 1 }} />
          Удалить
        </MenuItem>
      </Menu>
    </>
  );
};
