import { TextField, Button } from "@mui/material";
import { useGate, useUnit } from "effector-react";

import { userModel } from "@entities";
import { formatDateTime } from "@shared";

import { profileModel } from "./models";
import * as Styled from "./ProfilePage.styled";

export const ProfilePage = () => {
  useGate(profileModel.ProfilePageGate);

  const user = useUnit(userModel.$user);
  const name = useUnit(profileModel.$name);
  const isEditMode = useUnit(profileModel.$isEditMode);
  const error = useUnit(profileModel.$error);

  const actions = useUnit({
    editRequested: profileModel.editRequested,
    editCancelled: profileModel.editCancelled,
    nameChanged: profileModel.nameChanged,
    saveRequested: profileModel.saveRequested,
  });

  if (!user) return null;

  const hasChanges = name.trim() !== user.name && name.trim().length > 0;

  return (
    <Styled.StyledContainer maxWidth="md">
      <Styled.HeaderBox>
        <Styled.StyledTitle variant="h4">Мои данные</Styled.StyledTitle>
      </Styled.HeaderBox>

      <Styled.StyledPaper elevation={0}>
        <Styled.InfoSection>
          <Styled.InfoLabel variant="body2">Имя</Styled.InfoLabel>
          {isEditMode ? (
            <TextField
              fullWidth
              value={name}
              onChange={(e) => actions.nameChanged(e.target.value)}
              error={!!error}
              helperText={error}
            />
          ) : (
            <Styled.InfoValue variant="body1">{user.name}</Styled.InfoValue>
          )}
        </Styled.InfoSection>

        <Styled.InfoSection>
          <Styled.InfoLabel variant="body2">Email</Styled.InfoLabel>
          <Styled.InfoValue variant="body1">{user.email}</Styled.InfoValue>
        </Styled.InfoSection>

        <Styled.InfoSection>
          <Styled.InfoLabel variant="body2">Дата регистрации</Styled.InfoLabel>
          <Styled.InfoValue variant="body1">{formatDateTime(user.createdAt)}</Styled.InfoValue>
        </Styled.InfoSection>

        <Styled.ButtonBox>
          {isEditMode ? (
            <>
              <Button variant="outlined" onClick={actions.editCancelled}>
                Отмена
              </Button>
              <Styled.SaveButton
                variant="contained"
                onClick={actions.saveRequested}
                disabled={!hasChanges}
              >
                Сохранить
              </Styled.SaveButton>
            </>
          ) : (
            <Button variant="contained" onClick={actions.editRequested}>
              Редактировать
            </Button>
          )}
        </Styled.ButtonBox>
      </Styled.StyledPaper>
    </Styled.StyledContainer>
  );
};
