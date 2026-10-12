import type { ChangeEvent, FC } from "react";

import {
  Switch,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
} from "@mui/material";
import { useUnit } from "effector-react";

import type { Lesson } from "@shared";
import { getLessonDisplayName } from "@shared";

import { usePaymentDate } from "./PaymentStatus.hooks";
import * as paymentStatusModel from "./PaymentStatus.model";
import * as Styled from "./PaymentStatus.styled";
import { parseReceivedAmount } from "../../models";
import * as lessonActionsModel from "../../models/lessonActions.model";
import { PaymentFields } from "../PaymentFields";

type PaymentStatusProps = {
  lesson: Lesson;
  size?: "small" | "medium";
  showLabel?: boolean;
  onPaymentChange?: (
    lessonId: string,
    isPaid: boolean,
    paymentDate?: string,
    receivedAmount?: number
  ) => void;
};

export const PaymentStatus: FC<PaymentStatusProps> = ({
  lesson,
  size = "medium",
  showLabel = true,
  onPaymentChange,
}) => {
  const confirmDialogOpen = useUnit(paymentStatusModel.$isOpen);
  const pendingPaymentStatus = useUnit(paymentStatusModel.$pendingStatus);
  const receivedAmountInput = useUnit(paymentStatusModel.$receivedAmountInput);
  const receivedAmountError = useUnit(paymentStatusModel.$receivedAmountError);

  const actions = useUnit({
    lessonPaymentChanged: lessonActionsModel.lessonPaymentChanged,
    confirmDialogOpened: paymentStatusModel.confirmDialogOpened,
    confirmDialogClosed: paymentStatusModel.confirmDialogClosed,
    receivedAmountChanged: paymentStatusModel.receivedAmountChanged,
  });

  const { paymentDate, setPaymentDate } = usePaymentDate(lesson, confirmDialogOpen);
  const isConfirmBlocked = Boolean(receivedAmountError);

  if (!lesson.price) return null;

  const handlePaymentToggle = (newStatus: boolean) => {
    actions.confirmDialogOpened({ isPaid: newStatus, price: lesson.price });
  };

  const handleConfirmPayment = () => {
    if (isConfirmBlocked) return;
    if (pendingPaymentStatus !== null) {
      const receivedAmount = pendingPaymentStatus
        ? parseReceivedAmount(receivedAmountInput)
        : undefined;
      const date = pendingPaymentStatus ? paymentDate : undefined;
      if (onPaymentChange) {
        onPaymentChange(lesson.id, pendingPaymentStatus, date, receivedAmount);
      } else {
        actions.lessonPaymentChanged({
          lessonId: lesson.id,
          isPaid: pendingPaymentStatus,
          paymentDate: date,
          receivedAmount,
        });
      }
    }
    actions.confirmDialogClosed();
  };

  const handleCancelPayment = () => {
    actions.confirmDialogClosed();
  };

  return (
    <>
      {lesson.status !== "CANCELLED" && (
        <Styled.StyledFormControlLabel
          onClick={(e) => e.stopPropagation()}
          $isPaid={lesson.isPaid}
          control={
            <Switch
              checked={lesson.isPaid}
              onChange={(_e: ChangeEvent<HTMLInputElement>, next: boolean) =>
                handlePaymentToggle(next)
              }
              size={size}
              color={lesson.isPaid ? "success" : "error"}
            />
          }
          label={showLabel ? (lesson.isPaid ? "Оплачено" : "Не оплачено") : undefined}
        />
      )}
      <Dialog
        onClick={(e) => e.stopPropagation()}
        open={confirmDialogOpen}
        onClose={handleCancelPayment}
        maxWidth="sm"
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            e.stopPropagation();
            handleConfirmPayment();
          }
        }}
      >
        <DialogTitle>
          {pendingPaymentStatus ? "Отметить как оплачено" : "Отметить как неоплачено"}
        </DialogTitle>
        <DialogContent>
          <Box display="flex" flexDirection="column" gap={2}>
            <Typography>
              Вы уверены, что хотите отметить урок как{" "}
              <strong>{pendingPaymentStatus ? "оплаченный" : "неоплаченный"}</strong>?
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Урок: <strong>{getLessonDisplayName(lesson)}</strong> • {lesson.price || 0} ₽
            </Typography>
            {pendingPaymentStatus && (
              <PaymentFields
                paymentDate={paymentDate}
                receivedAmount={receivedAmountInput}
                receivedAmountError={receivedAmountError}
                onPaymentDateChange={setPaymentDate}
                onReceivedAmountChange={actions.receivedAmountChanged}
              />
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCancelPayment}>Отмена</Button>
          <Button
            onClick={handleConfirmPayment}
            color={pendingPaymentStatus ? "success" : "warning"}
            variant="contained"
            disabled={isConfirmBlocked}
          >
            Подтвердить
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};
