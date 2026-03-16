export const formatInterval = (minutes: number): string => {
  if (minutes === 60) return "1 час";
  return `${minutes} мин`;
};
