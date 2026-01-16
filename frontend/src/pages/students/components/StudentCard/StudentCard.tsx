import type { FC } from "react";

import { MoreVert as MoreVertIcon, ExpandMore as ExpandMoreIcon } from "@mui/icons-material";
import {
  Typography,
  CardContent,
  IconButton,
  AccordionSummary,
  AccordionDetails,
} from "@mui/material";

import { studentsModel } from "@features/students";
import type { Student } from "@shared";
import { formatDateLong, StudentArchivedInfo } from "@shared";

import * as Styled from "./StudentCard.styled";

type StudentCardProps = {
  student: Student;
};

export const StudentCard: FC<StudentCardProps> = ({ student }) => {
  return (
    <Styled.StyledCard variant="outlined" onClick={() => studentsModel.viewDialogOpened(student)}>
      <CardContent>
        <Styled.CardContentBox>
          <Styled.HeaderBox>
            <Styled.ContentBox>
              <Styled.StudentName variant="h6">{student.name}</Styled.StudentName>

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

              {student.hourlyRate && (
                <Typography variant="body2" color="text.secondary">
                  💰 {student.hourlyRate} ₽/урок
                </Typography>
              )}

              {student.archived && student.archivedAt && (
                <StudentArchivedInfo
                  archivedAt={student.archivedAt}
                  archiveReason={student.archiveReason}
                  archiveComment={student.archiveComment}
                  variant="compact"
                />
              )}
            </Styled.ContentBox>
            <IconButton
              size="small"
              onClick={(e) => {
                e.stopPropagation();
                studentsModel.menuOpened({ anchorEl: e.currentTarget, student });
              }}
              aria-label="student-menu"
            >
              <MoreVertIcon />
            </IconButton>
          </Styled.HeaderBox>
          {/* Аккордеон подробностей по ученику */}
          {(student.notes || student.createdAt || student.updatedAt) && (
            <Styled.DetailsAccordion onClick={(e) => e.stopPropagation()}>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Styled.AccordionContent>
                  <Typography variant="body2" color="primary">
                    Подробности
                  </Typography>
                </Styled.AccordionContent>
              </AccordionSummary>
              <AccordionDetails>
                <Styled.AccordionDetailsBox>
                  {student.parentName && (
                    <Typography variant="body2" color="text.secondary">
                      <b>Родители:</b> {student.parentName ? `${student.parentName} ` : ""}
                      {student.parentPhone} (
                      {student.parentContactMethod === "WHATSAPP" ? "WhatsApp" : "Telegram"}
                      {student.parentTelegramNick && `: ${student.parentTelegramNick}`})
                    </Typography>
                  )}
                  {student.notes && (
                    <Styled.NotesBox>
                      <Styled.NotesLabel variant="body2">Заметки:</Styled.NotesLabel>
                      <Typography variant="body2" color="text.secondary">
                        {student.notes}
                      </Typography>
                    </Styled.NotesBox>
                  )}
                  <Styled.StyledDivider />
                  <Typography variant="body2" color="text.secondary">
                    Добавлен: {formatDateLong(student.createdAt)}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Обновлен: {formatDateLong(student.updatedAt)}
                  </Typography>
                </Styled.AccordionDetailsBox>
              </AccordionDetails>
            </Styled.DetailsAccordion>
          )}
        </Styled.CardContentBox>
      </CardContent>
    </Styled.StyledCard>
  );
};
