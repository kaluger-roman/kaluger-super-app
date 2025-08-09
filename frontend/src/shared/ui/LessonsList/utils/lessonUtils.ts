import { Lesson } from "../../../types";

export type GroupedLessons = {
  [year: string]: {
    [month: string]: {
      [day: string]: Lesson[];
    };
  };
};

export const formatTime = (dateString: string): string => {
  return new Date(dateString).toLocaleTimeString("ru-RU", {
    hour: "2-digit",
    minute: "2-digit",
  });
};

export const getStatusColor = (status: string) => {
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

export const getStatusLabel = (status: string): string => {
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

export const filterLessonsByType = (
  lessons: Lesson[],
  type: "scheduled" | "completed"
): Lesson[] => {
  if (type === "scheduled") {
    return lessons.filter(
      (lesson) => lesson.status !== "COMPLETED" && lesson.status !== "CANCELLED"
    );
  } else {
    return lessons.filter(
      (lesson) => lesson.status === "COMPLETED" || lesson.status === "CANCELLED"
    );
  }
};

export const groupLessonsByDate = (
  lessons: Lesson[],
  type: "scheduled" | "completed"
): GroupedLessons => {
  const grouped: GroupedLessons = {};

  lessons.forEach((lesson) => {
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
              new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
            );
          } else {
            return (
              new Date(b.startTime).getTime() - new Date(a.startTime).getTime()
            );
          }
        });
      });
    });
  });

  return grouped;
};

export const sortYears = (
  years: string[],
  type: "scheduled" | "completed"
): string[] => {
  return years.sort((a, b) => {
    if (type === "scheduled") {
      return parseInt(a) - parseInt(b);
    } else {
      return parseInt(b) - parseInt(a);
    }
  });
};

export const sortMonths = (
  monthEntries: [string, any][],
  type: "scheduled" | "completed"
): [string, any][] => {
  return monthEntries.sort(([a], [b]) => {
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
  });
};
