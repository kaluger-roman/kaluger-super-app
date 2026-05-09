import { useUnit } from "effector-react";

import { userModel } from "@entities";
import {
  ChangeEmailDialog,
  ChangePasswordDialog,
  changeEmailModel,
  changePasswordModel,
} from "@features";
import { Button } from "@shared";

import { PASSWORD_MASK } from "./SecuritySection.constants";
import * as Styled from "./SecuritySection.styled";

export const SecuritySection = () => {
  const user = useUnit(userModel.$user);

  const actions = useUnit({
    openEmailDialog: changeEmailModel.dialogOpened,
    openPasswordDialog: changePasswordModel.dialogOpened,
  });

  if (!user) return null;

  return (
    <Styled.SectionPaper elevation={0}>
      <Styled.Row>
        <Styled.RowContent>
          <Styled.RowLabel variant="body2">Email</Styled.RowLabel>
          <Styled.RowValue variant="body1">{user.email}</Styled.RowValue>
        </Styled.RowContent>
        <Button variant="outlined" onClick={() => actions.openEmailDialog()}>
          Изменить
        </Button>
      </Styled.Row>

      <Styled.Row>
        <Styled.RowContent>
          <Styled.RowLabel variant="body2">Пароль</Styled.RowLabel>
          <Styled.RowValue variant="body1">{PASSWORD_MASK}</Styled.RowValue>
        </Styled.RowContent>
        <Button variant="outlined" onClick={() => actions.openPasswordDialog()}>
          Изменить
        </Button>
      </Styled.Row>

      <ChangeEmailDialog />
      <ChangePasswordDialog />
    </Styled.SectionPaper>
  );
};
