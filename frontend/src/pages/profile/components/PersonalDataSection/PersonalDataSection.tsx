import { TextField, Button } from "@mui/material";
import { useUnit } from "effector-react";

import { userModel } from "@entities";
import { formatDateTime } from "@shared";

import * as Styled from "./PersonalDataSection.styled";
import { profileModel } from "../../models";

export const PersonalDataSection = () => {
  const user = useUnit(userModel.$user);
  const name = useUnit(profileModel.$name);
  const taxRateInput = useUnit(profileModel.$taxRateInput);
  const isEditMode = useUnit(profileModel.$isEditMode);
  const error = useUnit(profileModel.$error);

  const actions = useUnit({
    editRequested: profileModel.editRequested,
    editCancelled: profileModel.editCancelled,
    nameChanged: profileModel.nameChanged,
    taxRateInputChanged: profileModel.taxRateInputChanged,
    saveRequested: profileModel.saveRequested,
  });

  if (!user) return null;

  const hasNameChanged = name.trim() !== user.name;
  const hasTaxRateChanged = taxRateInput !== String(user.taxRate);
  const hasChanges =
    (hasNameChanged || hasTaxRateChanged) && name.trim().length > 0;

  return (
    <Styled.SectionPaper elevation={0}>
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
        <Styled.InfoLabel variant="body2">Ставка налога (%)</Styled.InfoLabel>
        {isEditMode ? (
          <TextField
            fullWidth
            type="number"
            value={taxRateInput}
            onChange={(e) => actions.taxRateInputChanged(e.target.value)}
            inputProps={{ min: 0, max: 100, step: 0.1 }}
          />
        ) : (
          <Styled.InfoValue variant="body1">{user.taxRate}%</Styled.InfoValue>
        )}
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
    </Styled.SectionPaper>
  );
};
