import type { FC } from "react";

import {
  CheckCircle as RegisteredIcon,
  ContentCopy as CopyIcon,
  Link as LinkIcon,
} from "@mui/icons-material";
import {
  Alert,
  Button,
  IconButton,
  Tooltip,
  Typography,
} from "@mui/material";
import { useGate, useUnit } from "effector-react";

import { InvitationActions } from "./InvitationActions";
import * as Styled from "./InvitationManager.styled";
import { tutorStudentInvitationModel } from "../../model";
import { formatDate } from "../../model/tutor-student-invitation.helpers";

type InvitationManagerProps = {
  studentId: string;
  studentArchived?: boolean;
};

export const InvitationManager: FC<InvitationManagerProps> = ({
  studentId,
  studentArchived = false,
}) => {
  useGate(tutorStudentInvitationModel.InvitationManagerGate, { studentId });

  const status = useUnit(tutorStudentInvitationModel.$status);
  const ephemeralInviteUrl = useUnit(
    tutorStudentInvitationModel.$ephemeralInviteUrl
  );
  const error = useUnit(tutorStudentInvitationModel.$error);
  const isIssuing = useUnit(tutorStudentInvitationModel.$isIssuing);
  const isRevoking = useUnit(tutorStudentInvitationModel.$isRevoking);
  const copySuccess = useUnit(tutorStudentInvitationModel.$copySuccess);

  const handleIssue = () => {
    tutorStudentInvitationModel.issueInvitationFx(studentId);
  };

  const handleRevoke = () => {
    tutorStudentInvitationModel.revokeInvitationFx(studentId);
  };

  const handleCopy = () => {
    tutorStudentInvitationModel.inviteUrlCopyRequested();
  };

  return (
    <Styled.Wrapper variant="outlined">
      <Styled.HeaderRow>
        <Typography variant="subtitle1" fontWeight={600}>
          Личный кабинет ученика
        </Typography>
      </Styled.HeaderRow>

      {error && <Alert severity="error">{error}</Alert>}

      {status?.status === "registered" && (
        <Styled.RegisteredBox>
          <Styled.RegisteredChip
            color="success"
            icon={<RegisteredIcon />}
            label={`Ученик зарегистрирован • ${formatDate(status.registeredAt)}`}
          />
          <Typography variant="body2" color="text.secondary">
            Email аккаунта: <strong>{status.studentEmail}</strong>
          </Typography>
        </Styled.RegisteredBox>
      )}

      {status?.status === "not_issued" && !ephemeralInviteUrl && (
        <>
          <Typography variant="body2" color="text.secondary">
            Статус: ссылка не выдана.
          </Typography>
          {studentArchived && (
            <Alert severity="warning">
              Архивированному ученику нельзя выдать приглашение — снимите архивацию.
            </Alert>
          )}
          <Button
            variant="contained"
            startIcon={<LinkIcon />}
            onClick={handleIssue}
            disabled={isIssuing || studentArchived}
          >
            {isIssuing ? "Создаём…" : "Создать ссылку-приглашение"}
          </Button>
        </>
      )}

      {status?.status === "pending" && ephemeralInviteUrl && (
        <>
          <Typography variant="body2" color="text.secondary">
            Статус: ожидает регистрации.
          </Typography>
          <Styled.InfoAlert severity="info">
            Скопируйте ссылку и отправьте ученику. Повторно посмотреть её
            будет нельзя — только создать новую.
          </Styled.InfoAlert>
          <Styled.UrlBox>
            <Styled.ReadonlyField
              size="small"
              value={ephemeralInviteUrl}
              InputProps={{ readOnly: true }}
              onFocus={(e) => e.target.select()}
            />
            <Tooltip title={copySuccess ? "Скопировано" : "Копировать"}>
              <IconButton aria-label="Копировать ссылку" onClick={handleCopy} color="primary">
                <CopyIcon />
              </IconButton>
            </Tooltip>
          </Styled.UrlBox>
          <Typography variant="caption" color="text.secondary">
            Действительна до {formatDate(status.expiresAt)} или до первой регистрации.
          </Typography>
          <InvitationActions
            issueVariant="outlined"
            studentArchived={studentArchived}
            isIssuing={isIssuing}
            isRevoking={isRevoking}
            onIssue={handleIssue}
            onRevoke={handleRevoke}
          />
        </>
      )}

      {status?.status === "pending" && !ephemeralInviteUrl && (
        <>
          <Alert severity="info">
            Ссылка создана и ожидает регистрации ученика (с {formatDate(status.createdAt)}).
            Если ссылка потеряна, создайте новую — старая станет недействительной.
          </Alert>
          <InvitationActions
            issueVariant="contained"
            studentArchived={studentArchived}
            isIssuing={isIssuing}
            isRevoking={isRevoking}
            onIssue={handleIssue}
            onRevoke={handleRevoke}
          />
        </>
      )}
    </Styled.Wrapper>
  );
};
