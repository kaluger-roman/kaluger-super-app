import type { Lesson } from "@shared";

import { parseReceivedAmount } from "../../models";

export const buildPaymentChange = (
  lesson: Lesson,
  paymentDate: string,
  receivedAmountInput: string
) =>
  !lesson.isPaid && paymentDate
    ? {
        lessonId: lesson.id,
        isPaid: true,
        paymentDate,
        receivedAmount: parseReceivedAmount(receivedAmountInput),
      }
    : { lessonId: lesson.id, isPaid: false };
