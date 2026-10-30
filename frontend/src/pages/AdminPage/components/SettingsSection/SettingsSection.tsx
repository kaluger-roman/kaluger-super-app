import type { FC } from "react";

import { SendOutlined } from "@mui/icons-material";
import { Button, FormControlLabel, Switch } from "@mui/material";
import { useUnit } from "effector-react";

import { adminSettingsModel } from "@features/admin";

import { EMAIL_HELPER_TEXT } from "./SettingsSection.constants";
import * as Styled from "./SettingsSection.styled";

export const SettingsSection: FC = () => {
  const alertEmail = useUnit(adminSettingsModel.$alertEmail);
  const alertEmailEnabled = useUnit(adminSettingsModel.$alertEmailEnabled);
  const savedAlertEmail = useUnit(adminSettingsModel.$savedAlertEmail);
  const emailError = useUnit(adminSettingsModel.$alertEmailError);
  const actions = useUnit({
    changeEmail: adminSettingsModel.alertEmailChanged,
    toggleEmail: adminSettingsModel.alertEmailToggled,
    save: adminSettingsModel.settingsSaved,
    sendTestEmail: adminSettingsModel.testEmailRequested,
  });

  return (
    <Styled.StyledSection>
      <Styled.StyledHeading variant="h6">Уведомления об алертах</Styled.StyledHeading>

      <Styled.StyledEmailField
        label="Email для уведомлений"
        type="email"
        placeholder="admin@example.com"
        value={alertEmail}
        onChange={(event) => actions.changeEmail(event.target.value)}
        error={Boolean(emailError)}
        helperText={emailError ?? EMAIL_HELPER_TEXT}
        slotProps={{ inputLabel: { shrink: true } }}
      />

      <FormControlLabel
        control={
          <Switch
            checked={alertEmailEnabled}
            onChange={(_event, checked) => actions.toggleEmail(checked)}
          />
        }
        label="Отправлять алерты на почту"
      />

      <Styled.StyledActions>
        <Button variant="contained" onClick={() => actions.save()}>
          Сохранить
        </Button>
        <Button
          variant="outlined"
          startIcon={<SendOutlined />}
          disabled={!savedAlertEmail}
          onClick={() => actions.sendTestEmail()}
        >
          Отправить тестовое письмо
        </Button>
      </Styled.StyledActions>
      <Styled.StyledHint variant="body2">
        Тестовое письмо уходит на сохранённый адрес, не чаще раза в минуту
      </Styled.StyledHint>
    </Styled.StyledSection>
  );
};
