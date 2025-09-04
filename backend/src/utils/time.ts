export const truncateToMinute = (date: Date) => {
  const d = new Date(date);
  d.setSeconds(0, 0);
  return d;
};
