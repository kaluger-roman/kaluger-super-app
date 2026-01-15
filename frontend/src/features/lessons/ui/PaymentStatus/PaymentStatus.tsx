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
  TextField,
} from "@mui/material";
import { useUnit } from "effector-react";

import type { Lesson } from "@shared";

import * as paymentStatusModel from "./payment-status.model";
import { usePaymentDate } from "./PaymentStatus.hooks";
import * as Styled from "./PaymentStatus.styled";
import { lessonPaymentChanged } from "../../models/lesson-actions.model";

type PaymentStatusProps = {
  lesson: Lesson;
  size?: "small" | "medium";
  showLabel?: boolean;
  onPaymentChange?: (lessonId: string, isPaid: boolean, paymentDate?: string) => void;
};

export const PaymentStatus: FC<PaymentStatusProps> = ({
  lesson,
  size = "medium",
  showLabel = true,
  onPaymentChange,
}) => {
  const confirmDialogOpen = useUnit(paymentStatusModel.$isOpen);
  const pendingPaymentStatus = useUnit(paymentStatusModel.$pendingStatus);

  const actions = useUnit({ lessonPaymentChanged });

  const { paymentDate, setPaymentDate } = usePaymentDate(lesson, confirmDialogOpen);

  if (!lesson.price) return null;

  const handlePaymentToggle = (newStatus: boolean) => {
    paymentStatusModel.confirmDialogOpened(newStatus);
  };

  const handleConfirmPayment = () => {
    if (pendingPaymentStatus !== null) {
      if (onPaymentChange) {
        onPaymentChange(
          lesson.id,
          pendingPaymentStatus,
          pendingPaymentStatus ? paymentDate : undefined
        );
      } else {
        actions.lessonPaymentChanged({
          lessonId: lesson.id,
          isPaid: pendingPaymentStatus,
          paymentDate: pendingPaymentStatus ? paymentDate : undefined,
        });
      }
    }
    paymentStatusModel.confirmDialogClosed();
  };

  const handleCancelPayment = () => {
    paymentStatusModel.confirmDialogClosed();
  };

  return (
    <>
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
              Урок: <strong>{lesson.student?.name}</strong> • {lesson.price || 0} ₽
            </Typography>
            {pendingPaymentStatus && (
              <TextField
                autoFocus
                margin="dense"
                label="Дата оплаты"
                type="date"
                fullWidth
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
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
          >
            Подтвердить
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};
