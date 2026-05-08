import { useState, useEffect } from "react";

import type { Lesson } from "@shared";
import { toDateKey } from "@shared";

const getDefaultPaymentDate = (lesson: Lesson): string =>
  lesson.paymentDate
    ? toDateKey(lesson.paymentDate)
    : toDateKey(lesson.startTime);

export const usePaymentDate = (lesson: Lesson, paymentDialogOpen: boolean) => {
  const [paymentDate, setPaymentDate] = useState(() =>
    getDefaultPaymentDate(lesson)
  );

  useEffect(() => {
    if (paymentDialogOpen) {
      setPaymentDate(getDefaultPaymentDate(lesson));
    }
  }, [paymentDialogOpen, lesson]);

  return { paymentDate, setPaymentDate } as const;
};
