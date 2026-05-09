const NBSP = " ";

export type CaptionAppearance = {
  text: string;
  color: "primary" | "text.secondary";
};

export const getCaptionAppearance = ({
  isCurrent,
  isFuture,
  startDate,
}: {
  isCurrent?: boolean;
  isFuture?: boolean;
  startDate: string;
}): CaptionAppearance => {
  if (isFuture) {
    return {
      text: `вступит в силу с ${startDate}`,
      color: "text.secondary",
    };
  }
  if (isCurrent) {
    return { text: "текущая ставка", color: "primary" };
  }
  return { text: NBSP, color: "text.secondary" };
};
