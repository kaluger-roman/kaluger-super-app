import { useState, useEffect } from "react";

import type { Lesson } from "@shared";
import { toDateKey } from "@shared";

const getDefaultPaymentDate = (lesson: Lesson): string =>
  lesson.paymentDate
    ? toDateKey(lesson.paymentDate)
    : toDateKey(lesson.startTime);

export const usePaymentDate = (lesson: Lesson, dialogOpen: boolean) => {
  const [paymentDate, setPaymentDate] = useState(() =>
    getDefaultPaymentDate(lesson)
  );

  useEffect(() => {
    if (dialogOpen) {
      setPaymentDate(getDefaultPaymentDate(lesson));
    }
  }, [dialogOpen, lesson]);

  return { paymentDate, setPaymentDate } as const;
};
