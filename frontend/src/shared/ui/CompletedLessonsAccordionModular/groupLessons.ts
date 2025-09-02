import type { Lesson } from "../../types";
import type { GroupedLessons } from "./types";

export const groupLessonsByDate = (lessons: Lesson[]): GroupedLessons => {
  const completedLessons = lessons.filter(
    (lesson) => lesson.status === "COMPLETED" || lesson.status === "CANCELLED"
  );

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
};
