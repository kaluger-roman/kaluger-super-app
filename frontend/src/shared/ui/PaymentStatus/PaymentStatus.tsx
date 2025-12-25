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

import * as paymentStatusModel from "./payment-status.model";
import * as Styled from "./PaymentStatus.styled";
import type { Lesson } from "../../types";

type PaymentStatusProps = {
  lesson: Lesson;
  onPaymentChange: (lessonId: string, isPaid: boolean) => void;
  variant?: "checkbox" | "icon" | "inline" | "toggle";
  size?: "small" | "medium";
  showLabel?: boolean;
  needConfirm?: boolean;
};

export const PaymentStatus: FC<PaymentStatusProps> = ({
  lesson,
  onPaymentChange,
  size = "medium",
  showLabel = true,
  needConfirm = false,
}) => {
  const confirmDialogOpen = useUnit(paymentStatusModel.$isOpen);
  const pendingPaymentStatus = useUnit(paymentStatusModel.$pendingStatus);

  if (!lesson.price) return null;

  const handlePaymentToggle = (newStatus: boolean) => {
    paymentStatusModel.confirmDialogOpened(newStatus);
  };

  const handleConfirmPayment = () => {
    if (pendingPaymentStatus !== null) {
      onPaymentChange(lesson.id, pendingPaymentStatus);
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
              needConfirm ? handlePaymentToggle(next) : onPaymentChange(lesson.id, next)
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
