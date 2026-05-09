import { TextField, Button, Switch, FormControlLabel } from "@mui/material";
import { useUnit } from "effector-react";

import { userModel } from "@entities";
import { TaxRatePeriodsList, taxRatePeriodsModalModel } from "@features";
import { formatDateTime } from "@shared";

import * as Styled from "./PersonalDataSection.styled";
import { profileModel } from "../../models";

export const PersonalDataSection = () => {
  const user = useUnit(userModel.$user);
  const name = useUnit(profileModel.$name);
  const taxEnabled = useUnit(profileModel.$taxEnabled);
  const isEditMode = useUnit(profileModel.$isEditMode);
  const error = useUnit(profileModel.$error);

  const actions = useUnit({
    editRequested: profileModel.editRequested,
    editCancelled: profileModel.editCancelled,
    nameChanged: profileModel.nameChanged,
    taxEnabledToggled: profileModel.taxEnabledToggled,
    saveRequested: profileModel.saveRequested,
    openModal: taxRatePeriodsModalModel.modalOpened,
  });

  if (!user) return null;

  const hasNameChanged = name.trim() !== user.name;
  const hasTaxEnabledChanged = taxEnabled !== user.taxEnabled;
  const hasChanges =
    (hasNameChanged || hasTaxEnabledChanged) && name.trim().length > 0;

  return (
    <Styled.SectionPaper elevation={0}>
      <Styled.InfoSection>
        <Styled.InfoLabel variant="body2">Имя</Styled.InfoLabel>
        {isEditMode ? (
          <TextField
            fullWidth
            value={name}
            onChange={(e) => actions.nameChanged(e.target.value)}
          />
        ) : (
          <Styled.InfoValue variant="body1">{user.name}</Styled.InfoValue>
        )}
      </Styled.InfoSection>

      <Styled.InfoSection>
        <Styled.InfoLabel variant="body2">Учитывать налог</Styled.InfoLabel>
        {isEditMode ? (
          <FormControlLabel
            control={
              <Switch
                checked={taxEnabled}
                onChange={(e) => actions.taxEnabledToggled(e.target.checked)}
              />
            }
            label={taxEnabled ? "включено" : "выключено"}
          />
        ) : (
          <Styled.InfoValue variant="body1">
            {user.taxEnabled ? "включено" : "выключено"}
          </Styled.InfoValue>
        )}
        {user.taxEnabled || taxEnabled ? <TaxRatePeriodsList /> : null}
        {isEditMode && taxEnabled ? (
          <Button
            variant="outlined"
            size="small"
            onClick={() => actions.openModal()}
          >
            Настроить ставки
          </Button>
        ) : null}
        {error ? (
          <Styled.FieldError variant="body2" role="alert">
            {error}
          </Styled.FieldError>
        ) : null}
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
