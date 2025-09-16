import React, { useState } from "react";
import {
  FormControlLabel,
  Switch,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
} from "@mui/material";
import { Lesson } from "../types";

type PaymentStatusProps = {
  lesson: Lesson;
  onPaymentChange: (lessonId: string, isPaid: boolean) => void;
  variant?: "checkbox" | "icon" | "inline" | "toggle";
  size?: "small" | "medium";
  showLabel?: boolean;
  needConfirm?: boolean;
};

export const PaymentStatus: React.FC<PaymentStatusProps> = ({
  lesson,
  onPaymentChange,
  size = "medium",
  showLabel = true,
  needConfirm = false,
}) => {
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [pendingPaymentStatus, setPendingPaymentStatus] = useState<
    boolean | null
  >(null);

  // Don't show payment toggle for free lessons — toggle should appear only when there's a price
  if (!lesson.price) return null;

  const handlePaymentToggle = (newStatus: boolean) => {
    setPendingPaymentStatus(newStatus);
    setConfirmDialogOpen(true);
  };

  const handleConfirmPayment = () => {
    if (pendingPaymentStatus !== null) {
      onPaymentChange(lesson.id, pendingPaymentStatus);
    }
    setConfirmDialogOpen(false);
    setPendingPaymentStatus(null);
  };

  const handleCancelPayment = () => {
    setConfirmDialogOpen(false);
    setPendingPaymentStatus(null);
  };

  return (
    <>
      <FormControlLabel
        onClick={(e) => e.stopPropagation()}
        control={
          <Switch
            checked={lesson.isPaid}
            onChange={(
              _e: React.ChangeEvent<HTMLInputElement>,
              next: boolean
            ) =>
              needConfirm
                ? handlePaymentToggle(next)
                : onPaymentChange(lesson.id, next)
            }
            size={size}
            color={lesson.isPaid ? "success" : "error"}
          />
        }
        label={
          showLabel ? (lesson.isPaid ? "Оплачено" : "Не оплачено") : undefined
        }
        sx={{
          ".MuiFormControlLabel-label": {
            color: lesson.isPaid ? "success.main" : "error.main",
            fontWeight: 500,
          },
        }}
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
          {pendingPaymentStatus
            ? "Отметить как оплачено"
            : "Отметить как неоплачено"}
        </DialogTitle>
        <DialogContent>
          <Box display="flex" flexDirection="column" gap={2}>
            <Typography>
              Вы уверены, что хотите отметить урок как{" "}
              <strong>
                {pendingPaymentStatus ? "оплаченный" : "неоплаченный"}
              </strong>
              ?
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Урок: <strong>{lesson.student?.name}</strong> •{" "}
              {lesson.price || 0} ₽
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
