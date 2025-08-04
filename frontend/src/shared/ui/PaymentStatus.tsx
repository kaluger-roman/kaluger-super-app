import React, { useState } from "react";
import {
  FormControlLabel,
  Checkbox,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  IconButton,
  Tooltip,
} from "@mui/material";
import {
  Payment as PaymentIcon,
  PaymentOutlined as PaymentOutlinedIcon,
} from "@mui/icons-material";
import { Lesson } from "../types";

type PaymentStatusProps = {
  lesson: Lesson;
  onPaymentChange: (lessonId: string, isPaid: boolean) => void;
  variant?: "checkbox" | "icon" | "inline" | "toggle";
  size?: "small" | "medium";
  showLabel?: boolean;
};

export const PaymentStatus: React.FC<PaymentStatusProps> = ({
  lesson,
  onPaymentChange,
  variant = "checkbox",
  size = "medium",
  showLabel = true,
}) => {
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [pendingPaymentStatus, setPendingPaymentStatus] = useState<
    boolean | null
  >(null);

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
          <Checkbox
            checked={lesson.isPaid}
            onChange={() => handlePaymentToggle(!lesson.isPaid)}
            sx={{
              "& .MuiSvgIcon-root": {
                borderRadius: "16px",
                width: 40,
                height: 24,
                backgroundColor: lesson.isPaid ? "success.main" : "error.main",
                transition: "background-color 0.2s",
              },
              "& .Mui-checked .MuiSvgIcon-root": {
                backgroundColor: "success.main",
              },
              "& .MuiCheckbox-root": {
                padding: 0,
              },
            }}
            icon={
              <Box
                sx={{
                  width: 40,
                  height: 24,
                  borderRadius: "16px",
                  backgroundColor: "error.main",
                  position: "relative",
                  transition: "background-color 0.2s",
                }}
              >
                <Box
                  sx={{
                    position: "absolute",
                    left: 2,
                    top: 2,
                    width: 20,
                    height: 20,
                    borderRadius: "50%",
                    backgroundColor: "common.white",
                    boxShadow: 1,
                    transition: "left 0.2s",
                  }}
                />
              </Box>
            }
            checkedIcon={
              <Box
                sx={{
                  width: 40,
                  height: 24,
                  borderRadius: "16px",
                  backgroundColor: "success.main",
                  position: "relative",
                  transition: "background-color 0.2s",
                }}
              >
                <Box
                  sx={{
                    position: "absolute",
                    left: 18,
                    top: 2,
                    width: 20,
                    height: 20,
                    borderRadius: "50%",
                    backgroundColor: "common.white",
                    boxShadow: 1,
                    transition: "left 0.2s",
                  }}
                />
              </Box>
            }
            size={size}
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
