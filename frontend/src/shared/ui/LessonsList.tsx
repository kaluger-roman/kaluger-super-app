import React, { useMemo, useState, Fragment, useEffect } from "react";
import {
  Box,
  Card,
  CardContent,
  Typography,
  Chip,
  IconButton,
  Menu,
  MenuItem,
  Collapse,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import {
  MoreVert as MoreVertIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Cancel as CancelIcon,
  Restore as RestoreIcon,
  Schedule as RescheduleIcon,
  ExpandLess,
  ExpandMore,
} from "@mui/icons-material";
import { Lesson, SUBJECT_LABELS, LESSON_TYPE_LABELS } from "../types";
import { RecurringLessonBadge } from "./RecurringLessonBadge";
import { PaymentStatus } from "./PaymentStatus";

type GroupedLessons = {
  [year: string]: {
    [month: string]: {
      [day: string]: Lesson[];
    };
  };
};

type LessonsListProps = {
  lessons: Lesson[];
  onEdit: (lesson: Lesson) => void;
  onDelete: (lesson: Lesson) => void;
  onCancel?: (lesson: Lesson) => void;
  onRestore?: (lesson: Lesson) => void;
  onReschedule?: (lesson: Lesson) => void;
  onPaymentChange: (lessonId: string, isPaid: boolean) => void;
  onCardClick: (lesson: Lesson) => void;
  type: "scheduled" | "completed";
};

export const LessonsList: React.FC<LessonsListProps> = ({
  lessons,
  onEdit,
  onDelete,
  onCancel,
  onRestore,
  onReschedule,
  onPaymentChange,
  onCardClick,
  type,
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null);

  // Collapsed state for years and months
  const [collapsedYears, setCollapsedYears] = useState<Record<string, boolean>>(
    {}
  );
  const [collapsedMonths, setCollapsedMonths] = useState<
    Record<string, boolean>
  >({});

  const filteredLessons = useMemo(() => {
    if (type === "scheduled") {
      return lessons.filter(
        (lesson) =>
          lesson.status !== "COMPLETED" && lesson.status !== "CANCELLED"
      );
    } else {
      return lessons.filter(
        (lesson) =>
          lesson.status === "COMPLETED" || lesson.status === "CANCELLED"
      );
    }
  }, [lessons, type]);

  const groupedLessons = useMemo(() => {
    const grouped: GroupedLessons = {};

    filteredLessons.forEach((lesson) => {
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

    // Sort lessons in each day by time
    Object.values(grouped).forEach((yearData) => {
      Object.values(yearData).forEach((monthData) => {
        Object.values(monthData).forEach((dayLessons) => {
          dayLessons.sort((a, b) => {
            if (type === "scheduled") {
              return (
                new Date(a.startTime).getTime() -
                new Date(b.startTime).getTime()
              );
            } else {
              return (
                new Date(b.startTime).getTime() -
                new Date(a.startTime).getTime()
              );
            }
          });
        });
      });
    });

    return grouped;
  }, [filteredLessons, type]);

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString("ru-RU", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "COMPLETED":
        return "success";
      case "CANCELLED":
        return "error";
      case "RESCHEDULED":
        return "warning";
      case "IN_PROGRESS":
        return "info";
      default:
        return "default";
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "COMPLETED":
        return "Завершен";
      case "CANCELLED":
        return "Отменен";
      case "RESCHEDULED":
        return "Перенесен";
      case "IN_PROGRESS":
        return "Идет сейчас";
      default:
        return "Запланирован";
    }
  };

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

  const handleCancel = () => {
    if (selectedLesson && onCancel) {
      onCancel(selectedLesson);
    }
    handleMenuClose();
  };

  const handleRestore = () => {
    if (selectedLesson && onRestore) {
      onRestore(selectedLesson);
    }
    handleMenuClose();
  };

  const handleReschedule = () => {
    if (selectedLesson && onReschedule) {
      onReschedule(selectedLesson);
    }
    handleMenuClose();
  };

  // Collapse/expand handlers
  const toggleYear = (year: string) => {
    setCollapsedYears((prev) => ({
      ...prev,
      [year]: !prev[year],
    }));
  };

  const toggleMonth = (year: string, month: string) => {
    const key = `${year}_${month}`;
    setCollapsedMonths((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  if (filteredLessons.length === 0) {
    return (
      <Box
        display="flex"
        flexDirection="column"
        alignItems="center"
        justifyContent="center"
        py={8}
        textAlign="center"
      >
        <Typography variant="h5" color="text.secondary" gutterBottom>
          {type === "scheduled"
            ? "📅 Нет запланированных уроков"
            : "📚 Нет прошедших уроков"}
        </Typography>
        <Typography color="text.secondary">
          {type === "scheduled"
            ? 'Добавьте новый урок, нажав на кнопку "+"'
            : "Прошедшие уроки будут отображаться здесь"}
        </Typography>
      </Box>
    );
  }

  const sortedYears = Object.keys(groupedLessons).sort((a, b) => {
    if (type === "scheduled") {
      return parseInt(a) - parseInt(b);
    } else {
      return parseInt(b) - parseInt(a);
    }
  });

  return (
    <Box display="flex" flexDirection="column" gap={2}>
      {sortedYears.map((year) => {
        const sortedMonths = Object.entries(groupedLessons[year]).sort(
          ([a], [b]) => {
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
            if (type === "scheduled") {
              return monthOrder.indexOf(aMonth) - monthOrder.indexOf(bMonth);
            } else {
              return monthOrder.indexOf(bMonth) - monthOrder.indexOf(aMonth);
            }
          }
        );

        const isYearCollapsed = collapsedYears[year] ?? false;

        return (
          <Fragment key={year}>
            <Box
              display="flex"
              alignItems="center"
              justifyContent="center"
              sx={{
                cursor: "pointer",
                mb: 3,
                p: 2,
                borderRadius: 2,
                background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                boxShadow: 2,
                transition: "all 0.3s ease",
                "&:hover": {
                  boxShadow: 4,
                  transform: "translateY(-2px)",
                },
              }}
              onClick={() => toggleYear(year)}
            >
              <Typography
                variant="h5"
                sx={{
                  fontWeight: 700,
                  color: "white",
                  textAlign: "center",
                  mr: 1,
                  textShadow: "0 2px 4px rgba(0,0,0,0.3)",
                }}
              >
                {year}
              </Typography>
              {isYearCollapsed ? (
                <ExpandMore sx={{ color: "white" }} />
              ) : (
                <ExpandLess sx={{ color: "white" }} />
              )}
            </Box>
            <Collapse in={!isYearCollapsed} timeout="auto" unmountOnExit>
              {sortedMonths.map(([month, monthData]) => {
                const monthKey = `${year}_${month}`;
                const isMonthCollapsed = collapsedMonths[monthKey] ?? false;
                const sortedDays = Object.entries(monthData).sort(
                  ([a], [b]) => {
                    const aDate = new Date(a);
                    const bDate = new Date(b);
                    if (type === "scheduled") {
                      return aDate.getTime() - bDate.getTime();
                    } else {
                      return bDate.getTime() - aDate.getTime();
                    }
                  }
                );

                return (
                  <Fragment key={month}>
                    <Box
                      display="flex"
                      alignItems="center"
                      sx={{
                        mb: 2,
                        p: 1.5,
                        borderRadius: 2,
                        background:
                          "linear-gradient(135deg, #42a5f5 0%, #7e57c2 100%)", // Синий → Фиолетовый
                        cursor: "pointer",
                        boxShadow: 1,
                        transition: "all 0.2s ease",
                        "&:hover": {
                          boxShadow: 2,
                          transform: "translateY(-1px)",
                          background:
                            "linear-gradient(135deg, #1976d2 0%, #512da8 100%)", // Более насыщенный при наведении
                        },
                      }}
                      onClick={() => toggleMonth(year, month)}
                    >
                      <Typography
                        variant="h6"
                        sx={{
                          flex: 1,
                          fontWeight: 600,
                          color: "white",
                          textShadow: "0 1px 2px rgba(0,0,0,0.3)",
                        }}
                      >
                        📅&nbsp;&nbsp;&nbsp;{month}
                      </Typography>
                      {isMonthCollapsed ? (
                        <ExpandMore sx={{ color: "white" }} />
                      ) : (
                        <ExpandLess sx={{ color: "white" }} />
                      )}
                    </Box>
                    <Collapse
                      in={!isMonthCollapsed}
                      timeout="auto"
                      unmountOnExit
                    >
                      {sortedDays.map(([day, dayLessons]) => (
                        <Box key={day} sx={{ mb: 3 }}>
                          <Typography
                            variant="subtitle1"
                            sx={{
                              mb: 1.5,
                              fontWeight: 600,
                              textTransform: "capitalize",
                              color: "text.secondary",
                              fontSize: "0.95rem",
                            }}
                          >
                            {day}
                          </Typography>
                          <Box display="flex" flexDirection="column" gap={1}>
                            {dayLessons.map((lesson) => (
                              <Card
                                key={lesson.id}
                                variant="outlined"
                                sx={{
                                  cursor: "pointer",
                                  transition: "all 0.2s ease-in-out",
                                  "&:hover": {
                                    boxShadow: 2,
                                    transform: "translateY(-1px)",
                                  },
                                }}
                                onClick={() => onCardClick(lesson)}
                              >
                                <CardContent sx={{ py: 2 }}>
                                  <Box
                                    display="flex"
                                    justifyContent="space-between"
                                    alignItems="flex-start"
                                  >
                                    <Box flex={1}>
                                      <Box
                                        display="flex"
                                        alignItems="center"
                                        gap={1}
                                        mb={1}
                                        flexWrap="wrap"
                                      >
                                        <Typography
                                          variant="h6"
                                          sx={{ fontWeight: 600 }}
                                        >
                                          {lesson.student?.name}
                                        </Typography>
                                        <Chip
                                          label={getStatusLabel(lesson.status)}
                                          color={getStatusColor(lesson.status)}
                                          size="small"
                                        />
                                        {lesson.isRecurring && (
                                          <RecurringLessonBadge
                                            size="small"
                                            variant="chip"
                                          />
                                        )}
                                      </Box>

                                      <Box
                                        display="flex"
                                        alignItems="center"
                                        gap={3}
                                        mb={1}
                                        flexWrap="wrap"
                                      >
                                        <Typography
                                          variant="body2"
                                          color="text.secondary"
                                        >
                                          ⏰ {formatTime(lesson.startTime)} -{" "}
                                          {formatTime(lesson.endTime)}
                                        </Typography>
                                        <Typography
                                          variant="body2"
                                          sx={{ fontWeight: 600 }}
                                        >
                                          💰{" "}
                                          {lesson.price
                                            ? `${lesson.price} ₽`
                                            : "Бесплатно"}
                                        </Typography>
                                      </Box>

                                      <Box
                                        display="flex"
                                        justifyContent="space-between"
                                        flexDirection={
                                          isMobile ? "column" : "row"
                                        }
                                        alignItems={
                                          isMobile ? "flex-start" : "center"
                                        }
                                        gap={1}
                                      >
                                        <Typography
                                          variant="body2"
                                          color="text.secondary"
                                        >
                                          📚 {SUBJECT_LABELS[lesson.subject]} •{" "}
                                          {
                                            LESSON_TYPE_LABELS[
                                              lesson.lessonType
                                            ]
                                          }
                                        </Typography>

                                        <Box
                                          sx={{
                                            minWidth: "fit-content",
                                            width: isMobile ? "100%" : "auto",
                                          }}
                                        >
                                          <PaymentStatus
                                            lesson={lesson}
                                            onPaymentChange={onPaymentChange}
                                          />
                                        </Box>
                                      </Box>
                                    </Box>

                                    <IconButton
                                      size="small"
                                      onClick={(e) =>
                                        handleMenuClick(e, lesson)
                                      }
                                    >
                                      <MoreVertIcon />
                                    </IconButton>
                                  </Box>
                                </CardContent>
                              </Card>
                            ))}
                          </Box>
                        </Box>
                      ))}
                    </Collapse>
                  </Fragment>
                );
              })}
            </Collapse>
          </Fragment>
        );
      })}
      {type === "scheduled" && (
        <Box
          display="flex"
          justifyContent="center"
          alignItems="center"
          width="100%"
          sx={{ px: 2 }}
        >
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{
              fontSize: { xs: "0.75rem", sm: "0.875rem" },
              textAlign: "center",
              whiteSpace: "normal",
              lineHeight: 1.4,
              maxWidth: "100%",
              px: 2,
              py: 1,
              backgroundColor: "rgba(25, 118, 210, 0.08)",
              borderRadius: 1,
              border: "1px solid rgba(25, 118, 210, 0.23)",
            }}
          >
            ℹ️ Регулярные уроки рассчитываются автоматически на три месяца
            вперед
          </Typography>
        </Box>
      )}

      {/* Context Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
      >
        <MenuItem onClick={handleEdit}>
          <EditIcon sx={{ mr: 1 }} />
          Редактировать
        </MenuItem>
        {onReschedule && (
          <MenuItem onClick={handleReschedule}>
            <RescheduleIcon sx={{ mr: 1 }} />
            Перенести урок
          </MenuItem>
        )}
        {selectedLesson?.status !== "CANCELLED" && onCancel && (
          <MenuItem onClick={handleCancel}>
            <CancelIcon sx={{ mr: 1 }} />
            Отменить урок
          </MenuItem>
        )}
        {selectedLesson?.status === "CANCELLED" && onRestore && (
          <MenuItem onClick={handleRestore}>
            <RestoreIcon sx={{ mr: 1 }} />
            Восстановить урок
          </MenuItem>
        )}
        <MenuItem onClick={handleDelete} sx={{ color: "error.main" }}>
          <DeleteIcon sx={{ mr: 1 }} />
          Удалить
        </MenuItem>
      </Menu>
    </Box>
  );
};
