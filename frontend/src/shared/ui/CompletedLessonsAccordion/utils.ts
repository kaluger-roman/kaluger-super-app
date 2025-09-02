export const getStatusColor = (status: string) => {
  switch (status) {
    case "COMPLETED":
      return "success";
    case "CANCELLED":
      return "error";
    default:
      return "default";
  }
};

export const getStatusText = (status: string) => {
  switch (status) {
    case "COMPLETED":
      return "Завершен";
    case "CANCELLED":
      return "Отменен";
    default:
      return status;
  }
};

export const monthOrder = [
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

export const sortYears = ([a]: [string, any], [b]: [string, any]) =>
  parseInt(b) - parseInt(a);

export const sortMonths = ([a]: [string, any], [b]: [string, any]) => {
  const aMonth = a.split(" ")[0].toLowerCase();
  const bMonth = b.split(" ")[0].toLowerCase();
  return monthOrder.indexOf(bMonth) - monthOrder.indexOf(aMonth);
};

export const sortDays = ([a]: [string, any], [b]: [string, any]) => {
  const aDate = new Date(a);
  const bDate = new Date(b);
  return bDate.getTime() - aDate.getTime();
};
