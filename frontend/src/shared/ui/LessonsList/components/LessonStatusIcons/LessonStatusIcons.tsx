import type { FC } from "react";

import { IconButton, Tooltip, Typography } from "@mui/material";
import { useUnit } from "effector-react";

import * as lessonStatusIconsModel from "./lesson-status-icons.model";
import * as Styled from "./LessonStatusIcons.styled";
import type { Lesson } from "../../../../types";
import { ConfirmStatusDialog } from "../../../ConfirmStatusDialog";

type Props = {
  lesson: Lesson;
  onPaymentChange?: (lessonId: string, isPaid: boolean) => void;
  onHomeworkSentChange?: (lessonId: string, isSent: boolean) => void;
};

export const LessonStatusIcons: FC<Props> = ({ lesson, onPaymentChange, onHomeworkSentChange }) => {
  const paymentDialogOpen = useUnit(lessonStatusIconsModel.$isPaymentDialogOpen);
  const homeworkDialogOpen = useUnit(lessonStatusIconsModel.$isHomeworkDialogOpen);

  return (
    <Styled.Container>
      {lesson.price ? (
        <>
          <Tooltip title={lesson.isPaid ? "Оплачено" : "Не оплачено"}>
            <IconButton
              size="small"
              onClick={(e) => {
                e.stopPropagation();
                lessonStatusIconsModel.paymentDialogOpened();
              }}
            >
              <Styled.PaymentIcon $isPaid={lesson.isPaid} fontSize="small" />
            </IconButton>
          </Tooltip>

          <ConfirmStatusDialog
            open={paymentDialogOpen}
            title={lesson.isPaid ? "Отметить как неоплаченное" : "Отметить как оплачено"}
            description={
              <>
                Вы уверены, что хотите отметить урок как{" "}
                <strong>{lesson.isPaid ? "неоплаченный" : "оплаченный"}</strong>?
                <Styled.DialogContent>
                  <Typography variant="body2" color="text.secondary">
                    Урок: <strong>{lesson.student?.name}</strong> • {lesson.price || 0} ₽
                  </Typography>
                </Styled.DialogContent>
              </>
            }
            confirmColor={lesson.isPaid ? "warning" : "success"}
            onClose={lessonStatusIconsModel.paymentDialogClosed}
            onConfirm={() => {
              lessonStatusIconsModel.paymentDialogClosed();
              onPaymentChange?.(lesson.id, !lesson.isPaid);
            }}
          />
        </>
      ) : null}

      {lesson.homework !== undefined ? (
        <>
          <Tooltip title={lesson.isHomeworkSentByTeacher ? "ДЗ отправлено" : "ДЗ не отправлено"}>
            <IconButton
              size="small"
              onClick={(e) => {
                e.stopPropagation();
                lessonStatusIconsModel.homeworkDialogOpened();
              }}
            >
              <Styled.HomeworkIcon
                $isSent={Boolean(lesson.isHomeworkSentByTeacher)}
                fontSize="small"
              />
            </IconButton>
          </Tooltip>

          <ConfirmStatusDialog
            open={homeworkDialogOpen}
            title={
              lesson.isHomeworkSentByTeacher
                ? "Отметить ДЗ как неотправленное"
                : "Отметить ДЗ как отправленное"
            }
            description={
              <>
                Вы уверены, что хотите изменить статус домашнего задания для урока?
                <Styled.DialogContent>
                  <Typography variant="body2" color="text.secondary">
                    Урок: <strong>{lesson.student?.name}</strong> • {lesson.price || 0} ₽
                  </Typography>
                </Styled.DialogContent>
              </>
            }
            onClose={lessonStatusIconsModel.homeworkDialogClosed}
            onConfirm={() => {
              lessonStatusIconsModel.homeworkDialogClosed();
              onHomeworkSentChange?.(lesson.id, !Boolean(lesson.isHomeworkSentByTeacher));
            }}
            confirmColor={lesson.isHomeworkSentByTeacher ? "warning" : "primary"}
          />
        </>
      ) : null}
    </Styled.Container>
  );
};
