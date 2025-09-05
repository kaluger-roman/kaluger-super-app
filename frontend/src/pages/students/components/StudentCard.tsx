import React from "react";
import {
  Box,
  Typography,
  Card,
  CardContent,
  IconButton,
  Divider,
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from "@mui/material";
import {
  MoreVert as MoreVertIcon,
  ExpandMore as ExpandMoreIcon,
} from "@mui/icons-material";
import type { Student } from "../../../shared";

type StudentCardProps = {
  student: Student;
  onStudentClick: (student: Student) => void;
  onMenuClick: (event: React.MouseEvent<HTMLElement>, student: Student) => void;
};

export const StudentCard: React.FC<StudentCardProps> = ({
  student,
  onStudentClick,
  onMenuClick,
}) => {
  return (
    <Card
      variant="outlined"
      sx={{ cursor: "pointer" }}
      onClick={() => onStudentClick(student)}
    >
      <CardContent sx={{ py: 2 }}>
        <Box
          display="flex"
          justifyContent="space-between"
          alignItems="flex-start"
        >
          <Box flex={1}>
            <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
              {student.name}
            </Typography>

            {student.phone && (
              <Typography variant="body2" color="text.secondary">
                {student.phone}
              </Typography>
            )}

            {student.contactMethod && (
              <Typography variant="body2" color="text.secondary">
                {student.contactMethod === "WHATSAPP" ? "WhatsApp" : "Telegram"}
                {student.contactMethod === "TELEGRAM" && student.telegramNick
                  ? ` (${student.telegramNick})`
                  : ""}
              </Typography>
            )}
          </Box>
          <IconButton size="small" onClick={(e) => onMenuClick(e, student)}>
            <MoreVertIcon />
          </IconButton>
        </Box>
        {/* Аккордеон подробностей по ученику */}
        {(student.notes || student.createdAt || student.updatedAt) && (
          <Accordion
            sx={{ mt: 2, boxShadow: "none" }}
            onClick={(e) => e.stopPropagation()}
          >
            <AccordionSummary
              expandIcon={<ExpandMoreIcon />}
              sx={{
                p: 0,
                minHeight: "auto",
                "& .MuiAccordionSummary-content": {
                  margin: "8px 0",
                },
              }}
            >
              <Typography variant="body2" color="primary">
                Подробности
              </Typography>
            </AccordionSummary>
            <AccordionDetails sx={{ p: 0 }}>
              {student.parentName && (
                <Typography variant="body2" color="text.secondary">
                  <b>Родители:</b>{" "}
                  {student.parentName ? `${student.parentName} ` : ""}
                  {student.parentPhone} (
                  {student.parentContactMethod === "WHATSAPP"
                    ? "WhatsApp"
                    : "Telegram"}
                  {student.parentTelegramNick &&
                    `: ${student.parentTelegramNick}`}
                  )
                </Typography>
              )}
              {student.notes && (
                <Box mb={1}>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    Заметки:
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {student.notes}
                  </Typography>
                </Box>
              )}
              <Divider sx={{ my: 1 }} />
              <Typography variant="body2" color="text.secondary">
                Добавлен:{" "}
                {new Date(student.createdAt).toLocaleDateString("ru-RU", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Обновлен:{" "}
                {new Date(student.updatedAt).toLocaleDateString("ru-RU", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </Typography>
            </AccordionDetails>
          </Accordion>
        )}
      </CardContent>
    </Card>
  );
};
