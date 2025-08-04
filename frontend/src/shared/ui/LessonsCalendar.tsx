import React from "react";
import { Calendar, momentLocalizer } from "react-big-calendar";
import moment from "moment";
import "moment/locale/ru";
import "react-big-calendar/lib/css/react-big-calendar.css";
import { Box, useTheme } from "@mui/material";
import { Lesson, SUBJECT_LABELS, LESSON_TYPE_LABELS } from "../types";

moment.locale("ru");
const localizer = momentLocalizer(moment);

type LessonsCalendarProps = {
  lessons: Lesson[];
  onSelectEvent?: (event: any) => void;
  onSelectSlot?: (slotInfo: any) => void;
};

export const LessonsCalendar: React.FC<LessonsCalendarProps> = ({
  lessons,
  onSelectEvent,
  onSelectSlot,
}) => {
  const theme = useTheme();

  // Преобразуем уроки в формат календаря
  const events = lessons.map((lesson) => ({
    id: lesson.id,
    title: `${SUBJECT_LABELS[lesson.subject]} (${
      LESSON_TYPE_LABELS[lesson.lessonType]
    })`,
    start: new Date(lesson.startTime),
    end: new Date(lesson.endTime),
    resource: lesson,
  }));

  // Стили для событий в зависимости от статуса
  const eventStyleGetter = (event: any) => {
    const lesson = event.resource as Lesson;
    let backgroundColor = theme.palette.primary.main;

    switch (lesson.status) {
      case "COMPLETED":
        backgroundColor = theme.palette.success.main;
        break;
      case "CANCELLED":
        backgroundColor = theme.palette.error.main;
        break;
      case "RESCHEDULED":
        backgroundColor = theme.palette.warning.main;
        break;
      case "IN_PROGRESS":
        backgroundColor = theme.palette.primary.main;
        break;
      default:
        backgroundColor = theme.palette.info.main;
        break;
    }

    return {
      style: {
        backgroundColor,
        borderRadius: "8px",
        opacity: 0.8,
        color: "white",
        border: "0px",
        display: "block",
      },
    };
  };

  const messages = {
    allDay: "Весь день",
    previous: "←",
    next: "→",
    today: "Сегодня",
    month: "Месяц",
    week: "Неделя",
    day: "День",
    agenda: "Список",
    date: "Дата",
    time: "Время",
    event: "Урок",
    noEventsInRange: "Нет уроков в данном диапазоне",
    showMore: (total: number) => `+ еще ${total}`,
  };

  return (
    <Box sx={{ height: 600, p: 2 }}>
      <Calendar
        localizer={localizer}
        events={events}
        startAccessor="start"
        endAccessor="end"
        style={{ height: "100%" }}
        onSelectEvent={onSelectEvent}
        onSelectSlot={onSelectSlot}
        selectable
        eventPropGetter={eventStyleGetter}
        messages={messages}
        views={["month", "week", "day", "agenda"]}
        defaultView="week"
        step={30}
        timeslots={1}
        min={new Date(2025, 0, 1, 8, 0)} // 8:00 AM
        max={new Date(2025, 0, 1, 22, 0)} // 10:00 PM
        formats={{
          dayHeaderFormat: "DD MMM",
          dayRangeHeaderFormat: ({ start, end }: any) =>
            `${moment(start).format("DD MMM")} — ${moment(end).format(
              "DD MMM"
            )}`,
          agendaDateFormat: "DD MMM",
          agendaTimeFormat: "HH:mm",
          agendaTimeRangeFormat: ({ start, end }: any) =>
            `${moment(start).format("HH:mm")} — ${moment(end).format("HH:mm")}`,
        }}
        components={{
          event: ({ event }: any) => (
            <Box sx={{ p: 0.5, fontSize: "0.75rem" }}>
              <div>{event.title}</div>
              <div style={{ fontSize: "0.6rem", opacity: 0.8 }}>
                {event.resource.student?.name}
              </div>
            </Box>
          ),
        }}
      />
    </Box>
  );
};
