import type { FC } from "react";

import { Box, Typography } from "@mui/material";

import type { Student } from "@shared";
import { CONTACT_METHOD_LABELS } from "@shared";

import * as Styled from "./StudentViewDialog.styled";

type StudentContactsProps = {
  student: Student;
};

export const StudentContacts: FC<StudentContactsProps> = ({ student }) => (
  <Box>
    <Styled.SectionTitle variant="subtitle2">
      <Styled.SectionEmoji aria-hidden>📞</Styled.SectionEmoji>
      Контакты
    </Styled.SectionTitle>
    {student.phone && (
      <Typography variant="body2" color="text.secondary">
        Телефон: {student.phone}
      </Typography>
    )}
    {student.contactMethod && (
      <Typography variant="body2" color="text.secondary" gutterBottom>
        {student.contactMethod === "TELEGRAM"
          ? `Telegram (${student.telegramNick})`
          : CONTACT_METHOD_LABELS[student.contactMethod]}
      </Typography>
    )}

    {student.parentPhone && (
      <Typography variant="body2" color="text.secondary">
        Родители: {student.parentName ? `${student.parentName} — ` : ""}
        {student.parentPhone} (
        {CONTACT_METHOD_LABELS[student.parentContactMethod ?? "WHATSAPP"]})
      </Typography>
    )}
    {student.parentContactMethod === "TELEGRAM" && student.parentTelegramNick && (
      <Typography variant="body2" color="text.secondary">
        Telegram (родители): @{student.parentTelegramNick}
      </Typography>
    )}
  </Box>
);
