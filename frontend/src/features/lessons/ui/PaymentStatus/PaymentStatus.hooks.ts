import { useState, useEffect, useMemo } from "react";

import type { Lesson } from "@shared";
import { toDateKey } from "@shared";

export const usePaymentDate = (lesson: Lesson, dialogOpen: boolean) => {
  const today = useMemo(() => toDateKey(new Date()), []);

  const [paymentDate, setPaymentDate] = useState(() =>
    lesson.paymentDate ? toDateKey(lesson.paymentDate) : today
  );

  useEffect(() => {
    if (dialogOpen) {
      setPaymentDate(lesson.paymentDate ? toDateKey(lesson.paymentDate) : today);
    }
  }, [dialogOpen, lesson.paymentDate, today]);

  return { paymentDate, setPaymentDate } as const;
};
