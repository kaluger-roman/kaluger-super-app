import React from "react";
import { Box } from "@mui/material";
import { useTheme } from "@mui/material/styles";
import { getDateKey } from "../ScheduleView.helpers";

type NowLineProps = {
  now: Date;
  startHour: number;
  activeCellHeight: number;
  timeSlotsCount: number;
  dateKey: string;
};

export const NowLine: React.FC<NowLineProps> = ({
  now,
  startHour,
  activeCellHeight,
  timeSlotsCount,
  dateKey,
}) => {
  const theme = useTheme();

  // Only show line for today's column
  const isToday = dateKey === getDateKey(now);
  if (!isToday) return null;

  const nowHours = now.getHours() + now.getMinutes() / 60;
  const topPx = (nowHours - startHour) * activeCellHeight;

  if (topPx >= 0 && topPx <= timeSlotsCount * activeCellHeight) {
    return (
      <Box
        key={`now-line-${dateKey}`}
        position="absolute"
        left={0}
        right={0}
        top={topPx}
        height={2}
        sx={{ backgroundColor: theme.palette.error.main, zIndex: 5 }}
      />
    );
  }
  return null;
};
