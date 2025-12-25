import type { FC } from "react";
import { useMemo } from "react";

import { Alert } from "@mui/material";

import type { Lesson } from "@shared";

import { getPastDateNoticeMessage } from "./PastDateNotice.helpers";

type Props = {
  startTime: Date;
  endTime: Date;
  lesson?: Lesson;
};

export const PastDateNotice: FC<Props> = ({ startTime, endTime, lesson }) => {
  const message = useMemo(
    () => getPastDateNoticeMessage(startTime, endTime, lesson),
    [startTime, endTime, lesson]
  );

  if (!message) return null;

  return <Alert severity="info">{message}</Alert>;
};
