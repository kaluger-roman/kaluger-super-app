import type { FC } from "react";

import * as Styled from "./NowLine.styled";
import { getDateKey } from "../ScheduleView.helpers";

type NowLineProps = {
  now: Date;
  startHour: number;
  activeCellHeight: number;
  timeSlotsCount: number;
  dateKey: string;
};

export const NowLine: FC<NowLineProps> = ({
  now,
  startHour,
  activeCellHeight,
  timeSlotsCount,
  dateKey,
}) => {
  // Only show line for today's column
  const isToday = dateKey === getDateKey(now);
  if (!isToday) return null;

  const nowHours = now.getHours() + now.getMinutes() / 60;
  const topPx = (nowHours - startHour) * activeCellHeight;

  if (topPx >= 0 && topPx <= timeSlotsCount * activeCellHeight) {
    return <Styled.NowLineBox key={`now-line-${dateKey}`} $top={topPx} />;
  }
  return null;
};
