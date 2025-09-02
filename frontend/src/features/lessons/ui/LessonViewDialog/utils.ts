export const formatDateTime = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleString("ru-RU", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
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
