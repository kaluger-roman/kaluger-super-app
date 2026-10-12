import type { FC } from "react";

import type { Lesson } from "@shared";

import { applyPaymentChange, getPaymentDialogPrice } from "./LessonStatusSection.helpers";
import * as Styled from "./LessonStatusSection.styled";
import { HomeworkSentStatus } from "../../../HomeworkSentStatus";
import { PaymentStatus } from "../../../PaymentStatus";
import type { LessonFormData } from "../../LessonForm.types";

type LessonStatusSectionProps = {
  lesson?: Lesson;
  formData: LessonFormData;
  setFormData: (updater: (prev: LessonFormData) => LessonFormData) => void;
};

export const LessonStatusSection: FC<LessonStatusSectionProps> = ({
  lesson,
  formData,
  setFormData,
}) => (
  <Styled.CheckboxContainer>
    {lesson && (
      <PaymentStatus
        lesson={{
          ...lesson,
          price: getPaymentDialogPrice(formData.price, lesson.price),
          isPaid: formData.isPaid,
          paymentDate: formData.paymentDate,
        }}
        onPaymentChange={(_lessonId, isPaid, paymentDate, receivedAmount) =>
          setFormData((prev) => applyPaymentChange(prev, isPaid, paymentDate, receivedAmount))
        }
      />
    )}
    {lesson && (
      <HomeworkSentStatus
        lesson={{
          ...lesson,
          isHomeworkSentByTeacher: formData.isHomeworkSentByTeacher,
        }}
        onHomeworkSentChange={(_lessonId: string, isSent: boolean) =>
          setFormData((prev) => ({
            ...prev,
            isHomeworkSentByTeacher: isSent,
          }))
        }
      />
    )}
  </Styled.CheckboxContainer>
);
