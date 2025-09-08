import React, { useState } from "react";
import { IconButton, Tooltip, Typography, Box } from "@mui/material";
import MonetizationOnIcon from "@mui/icons-material/MonetizationOn";
import MenuBookIcon from "@mui/icons-material/MenuBook";
import type { Lesson } from "../../../types";
import ConfirmStatusDialog from "../../ConfirmStatusDialog";

type Props = {
  lesson: Lesson;
  onPaymentChange?: (lessonId: string, isPaid: boolean) => void;
  onHomeworkSentChange?: (lessonId: string, isSent: boolean) => void;
};

const LessonStatusIcons: React.FC<Props> = ({
  lesson,
  onPaymentChange,
  onHomeworkSentChange,
}) => {
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [homeworkDialogOpen, setHomeworkDialogOpen] = useState(false);

  return (
    <Box display="flex" gap={1} alignItems="center">
      {lesson.price ? (
        <>
          <Tooltip title={lesson.isPaid ? "Оплачено" : "Не оплачено"}>
            <IconButton
              size="small"
              onClick={(e) => {
                e.stopPropagation();
                setPaymentDialogOpen(true);
              }}
            >
              <MonetizationOnIcon
                sx={{ color: lesson.isPaid ? "success.main" : "error.main" }}
                fontSize="small"
              />
            </IconButton>
          </Tooltip>

          <ConfirmStatusDialog
            open={paymentDialogOpen}
            title={
              lesson.isPaid
                ? "Отметить как неоплаченное"
                : "Отметить как оплачено"
            }
            description={
              <>
                Вы уверены, что хотите отметить урок как{" "}
                <strong>{lesson.isPaid ? "неоплаченный" : "оплаченный"}</strong>
                ?
                <Box mt={1}>
                  <Typography variant="body2" color="text.secondary">
                    Урок: <strong>{lesson.student?.name}</strong> •{" "}
                    {lesson.price || 0} ₽
                  </Typography>
                </Box>
              </>
            }
            confirmColor={lesson.isPaid ? "warning" : "success"}
            onClose={() => setPaymentDialogOpen(false)}
            onConfirm={() => {
              setPaymentDialogOpen(false);
              onPaymentChange?.(lesson.id, !lesson.isPaid);
            }}
          />
        </>
      ) : null}

      {lesson.homework !== undefined ? (
        <>
          <Tooltip
            title={
              lesson.isHomeworkSentByTeacher
                ? "ДЗ отправлено"
                : "ДЗ не отправлено"
            }
          >
            <IconButton
              size="small"
              onClick={(e) => {
                e.stopPropagation();
                setHomeworkDialogOpen(true);
              }}
            >
              <MenuBookIcon
                sx={{
                  color: lesson.isHomeworkSentByTeacher
                    ? "success.main"
                    : "error.main",
                }}
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
                Вы уверены, что хотите изменить статус домашнего задания для
                урока?
                <Box mt={1}>
                  <Typography variant="body2" color="text.secondary">
                    Урок: <strong>{lesson.student?.name}</strong> •{" "}
                    {lesson.price || 0} ₽
                  </Typography>
                </Box>
              </>
            }
            onClose={() => setHomeworkDialogOpen(false)}
            onConfirm={() => {
              setHomeworkDialogOpen(false);
              onHomeworkSentChange?.(
                lesson.id,
                !Boolean(lesson.isHomeworkSentByTeacher)
              );
            }}
            confirmColor={
              lesson.isHomeworkSentByTeacher ? "warning" : "primary"
            }
          />
        </>
      ) : null}
    </Box>
  );
};

export default LessonStatusIcons;
