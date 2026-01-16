import type { FC } from "react";

import { Box, Typography } from "@mui/material";

import { formatDateLong, StudentArchivedInfo } from "@shared";
import type { ArchiveReason } from "@shared";

import * as Styled from "./StudentViewDialog.styled";

type StudentMetaProps = {
  createdAt: string;
  updatedAt: string;
  archived?: boolean;
  archivedAt?: string | null;
  archiveReason?: ArchiveReason | null;
  archiveComment?: string | null;
};

export const StudentMeta: FC<StudentMetaProps> = ({
  createdAt,
  updatedAt,
  archived,
  archivedAt,
  archiveReason,
  archiveComment,
}) => (
  <Box>
    <Styled.SectionTitle variant="subtitle2">ℹ️ Информация</Styled.SectionTitle>
    <Typography variant="body2" color="text.secondary" gutterBottom>
      Добавлен: {formatDateLong(createdAt)}
    </Typography>
    <Typography variant="body2" color="text.secondary" gutterBottom>
      Обновлен: {formatDateLong(updatedAt)}
    </Typography>
    {archived && archivedAt && (
      <StudentArchivedInfo
        archivedAt={archivedAt}
        archiveReason={archiveReason}
        archiveComment={archiveComment}
      />
    )}
  </Box>
);
