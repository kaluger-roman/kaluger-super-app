export const generateTimeSlots = (startHour: number, endHour: number) => {
  const slots: string[] = [];
  for (let hour = startHour; hour < endHour; hour++) {
    slots.push(`${hour.toString().padStart(2, "0")}:00`);
  }
  return slots;
};

export const generateDateRange = (
  centerDate: Date,
  daysAround: number = 30
) => {
  const dates: Date[] = [];
  for (let i = -daysAround; i <= daysAround; i++) {
    const date = new Date(centerDate);
    date.setDate(centerDate.getDate() + i);
    dates.push(date);
  }
  return dates;
};

export const getDateKey = (date: Date) => date.toISOString().split("T")[0];

export const formatDayHeader = (date: Date) => {
  const today = new Date();
  const isToday = getDateKey(date) === getDateKey(today);

  return {
    dayName: date.toLocaleDateString("ru", { weekday: "short" }),
    dayNumber: date.getDate(),
    monthName: date.toLocaleDateString("ru", { month: "short" }),
    isToday,
  };
};
