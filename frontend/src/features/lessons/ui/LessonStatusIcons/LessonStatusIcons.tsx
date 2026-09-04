import type { FC } from "react";

import { IconButton, Tooltip, Typography, TextField, Box } from "@mui/material";
import { useUnit } from "effector-react";

import type { Lesson } from "@shared";
import { ConfirmStatusDialog, getLessonDisplayName } from "@shared";

import * as lessonStatusIconsModel from "./lesson-status-icons.model";
import { usePaymentDate } from "./LessonStatusIcons.hooks";
import * as Styled from "./LessonStatusIcons.styled";
import { lessonPaymentChanged, lessonHomeworkSentChanged } from "../../models/lesson-actions.model";

type Props = {
  lesson: Lesson;
};

export const LessonStatusIcons: FC<Props> = ({ lesson }) => {
  const openPaymentDialogFor = useUnit(lessonStatusIconsModel.$openPaymentDialogFor);
  const openHomeworkDialogFor = useUnit(lessonStatusIconsModel.$openHomeworkDialogFor);

  const actions = useUnit({ lessonPaymentChanged, lessonHomeworkSentChanged });

  const paymentDialogOpen = openPaymentDialogFor === lesson.id;
  const homeworkDialogOpen = openHomeworkDialogFor === lesson.id;

  const { paymentDate, setPaymentDate } = usePaymentDate(lesson, paymentDialogOpen);

  const handlePaymentConfirm = () => {
    lessonStatusIconsModel.paymentDialogClosed();
    if (!lesson.isPaid && paymentDate) {
      actions.lessonPaymentChanged({ lessonId: lesson.id, isPaid: true, paymentDate });
    } else {
      actions.lessonPaymentChanged({ lessonId: lesson.id, isPaid: false });
    }
  };

  const handleHomeworkConfirm = () => {
    lessonStatusIconsModel.homeworkDialogClosed();
    actions.lessonHomeworkSentChanged({
      lessonId: lesson.id,
      isSent: !lesson.isHomeworkSentByTeacher,
    });
  };

  return (
    <Styled.Container>
      {lesson.price && lesson.status !== "CANCELLED" ? (
        <>
          <Tooltip title={lesson.isPaid ? "Оплачено" : "Не оплачено"}>
            <IconButton
              size="small"
              aria-label={
                lesson.isPaid
                  ? "Оплачено — нажмите чтобы изменить"
                  : "Не оплачено — нажмите чтобы отметить"
              }
              onClick={(e) => {
                e.stopPropagation();
                lessonStatusIconsModel.paymentDialogOpened(lesson.id);
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
                    Урок: <strong>{getLessonDisplayName(lesson)}</strong> • {lesson.price || 0} ₽
                  </Typography>
                </Styled.DialogContent>
              </>
            }
            confirmColor={lesson.isPaid ? "warning" : "success"}
            onClose={() => lessonStatusIconsModel.paymentDialogClosed()}
            onConfirm={handlePaymentConfirm}
          >
            {!lesson.isPaid && (
              <Box sx={{ mt: 2 }}>
                <TextField
                  autoFocus
                  margin="dense"
                  label="Дата оплаты"
                  type="date"
                  fullWidth
                  value={paymentDate}
                  onChange={(e) => setPaymentDate(e.target.value)}
                  InputLabelProps={{ shrink: true }}
                />
              </Box>
            )}
          </ConfirmStatusDialog>
        </>
      ) : null}

      {lesson.homework !== undefined ? (
        <>
          <Tooltip title={lesson.isHomeworkSentByTeacher ? "ДЗ отправлено" : "ДЗ не отправлено"}>
            <IconButton
              size="small"
              aria-label={
                lesson.isHomeworkSentByTeacher
                  ? "ДЗ отправлено — нажмите чтобы изменить"
                  : "ДЗ не отправлено — нажмите чтобы отметить"
              }
              onClick={(e) => {
                e.stopPropagation();
                lessonStatusIconsModel.homeworkDialogOpened(lesson.id);
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
                    Урок: <strong>{getLessonDisplayName(lesson)}</strong> • {lesson.price || 0} ₽
                  </Typography>
                </Styled.DialogContent>
              </>
            }
            onClose={() => lessonStatusIconsModel.homeworkDialogClosed()}
            onConfirm={handleHomeworkConfirm}
            confirmColor={lesson.isHomeworkSentByTeacher ? "warning" : "primary"}
          />
        </>
      ) : null}
    </Styled.Container>
  );
};
