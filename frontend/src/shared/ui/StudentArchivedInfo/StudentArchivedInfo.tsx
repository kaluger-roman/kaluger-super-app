import type { FC } from "react";

import { Box, Typography } from "@mui/material";

import { ARCHIVE_REASON_LABELS } from "./StudentArchivedInfo.constants";
import * as Styled from "./StudentArchivedInfo.styled";
import { formatDateLong } from "../../lib";
import type { ArchiveReason } from "../../types";

type StudentArchivedInfoProps = {
  archivedAt: string;
  archiveReason?: ArchiveReason | null;
  archiveComment?: string | null;
  variant?: "default" | "compact";
};

export const StudentArchivedInfo: FC<StudentArchivedInfoProps> = ({
  archivedAt,
  archiveReason,
  archiveComment,
  variant = "default",
}) => {
  if (variant === "compact") {
    return (
      <Typography variant="body2" color="warning.main" fontWeight="medium">
        📦 В архиве с: {formatDateLong(archivedAt)}
        {archiveReason && ` • ${ARCHIVE_REASON_LABELS[archiveReason]}`}
      </Typography>
    );
  }

  return (
    <Box>
      <Typography variant="body2" color="warning.main" fontWeight="medium" gutterBottom>
        📦 В архиве с: {formatDateLong(archivedAt)}
      </Typography>
      {archiveReason && (
        <Typography variant="body2" color="warning.main" gutterBottom>
          Причина: {ARCHIVE_REASON_LABELS[archiveReason]}
        </Typography>
      )}
      {archiveComment && (
        <Styled.ArchiveComment variant="body2" color="warning.main">
          {archiveComment}
        </Styled.ArchiveComment>
      )}
    </Box>
  );
};
