import type { FC } from "react";

import { IconButton, Tooltip, Typography } from "@mui/material";
import { useUnit } from "effector-react";

import type { Lesson } from "@shared";
import { ConfirmStatusDialog, getLessonDisplayName } from "@shared";

import { buildPaymentChange } from "./LessonStatusIcons.helpers";
import { usePaymentDate } from "./LessonStatusIcons.hooks";
import * as lessonStatusIconsModel from "./LessonStatusIcons.model";
import * as Styled from "./LessonStatusIcons.styled";
import * as lessonActionsModel from "../../models/lessonActions.model";
import { PaymentFields } from "../PaymentFields";

type Props = {
  lesson: Lesson;
};

export const LessonStatusIcons: FC<Props> = ({ lesson }) => {
  const openPaymentDialogFor = useUnit(lessonStatusIconsModel.$openPaymentDialogFor);
  const openHomeworkDialogFor = useUnit(lessonStatusIconsModel.$openHomeworkDialogFor);
  const receivedAmountInput = useUnit(lessonStatusIconsModel.$receivedAmountInput);
  const receivedAmountError = useUnit(lessonStatusIconsModel.$receivedAmountError);

  const actions = useUnit({
    lessonPaymentChanged: lessonActionsModel.lessonPaymentChanged,
    lessonHomeworkSentChanged: lessonActionsModel.lessonHomeworkSentChanged,
    paymentDialogOpened: lessonStatusIconsModel.paymentDialogOpened,
    paymentDialogClosed: lessonStatusIconsModel.paymentDialogClosed,
    receivedAmountChanged: lessonStatusIconsModel.receivedAmountChanged,
  });

  const paymentDialogOpen = openPaymentDialogFor === lesson.id;
  const homeworkDialogOpen = openHomeworkDialogFor === lesson.id;

  const { paymentDate, setPaymentDate } = usePaymentDate(lesson, paymentDialogOpen);
  const isPaymentConfirmBlocked = !lesson.isPaid && Boolean(receivedAmountError);

  const handlePaymentConfirm = () => {
    if (isPaymentConfirmBlocked) return;
    actions.paymentDialogClosed();
    actions.lessonPaymentChanged(buildPaymentChange(lesson, paymentDate, receivedAmountInput));
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
                actions.paymentDialogOpened({ lessonId: lesson.id, price: lesson.price });
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
            confirmDisabled={isPaymentConfirmBlocked}
            onClose={actions.paymentDialogClosed}
            onConfirm={handlePaymentConfirm}
          >
            {!lesson.isPaid && (
              <Styled.PaymentDateBox>
                <PaymentFields
                  paymentDate={paymentDate}
                  receivedAmount={receivedAmountInput}
                  receivedAmountError={receivedAmountError}
                  onPaymentDateChange={setPaymentDate}
                  onReceivedAmountChange={actions.receivedAmountChanged}
                />
              </Styled.PaymentDateBox>
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
