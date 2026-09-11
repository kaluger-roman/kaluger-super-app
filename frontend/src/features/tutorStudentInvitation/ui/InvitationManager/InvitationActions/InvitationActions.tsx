import type { FC } from "react";

import { Link as LinkIcon } from "@mui/icons-material";
import { Alert, Button } from "@mui/material";

import * as Styled from "./InvitationActions.styled";

type InvitationActionsProps = {
  issueVariant: "outlined" | "contained";
  studentArchived: boolean;
  isIssuing: boolean;
  isRevoking: boolean;
  onIssue: () => void;
  onRevoke: () => void;
};

export const InvitationActions: FC<InvitationActionsProps> = ({
  issueVariant,
  studentArchived,
  isIssuing,
  isRevoking,
  onIssue,
  onRevoke,
}) => (
  <>
    {studentArchived && (
      <Alert severity="warning">
        Ученик в архиве — новую ссылку выдать нельзя. Можно только отозвать текущую.
      </Alert>
    )}
    <Styled.ButtonsRow>
      <Button
        variant={issueVariant}
        startIcon={issueVariant === "contained" ? <LinkIcon /> : undefined}
        onClick={onIssue}
        disabled={isIssuing || studentArchived}
      >
        Создать новую (отозвать текущую)
      </Button>
      <Button variant="text" color="warning" onClick={onRevoke} disabled={isRevoking}>
        Отозвать
      </Button>
    </Styled.ButtonsRow>
  </>
);
