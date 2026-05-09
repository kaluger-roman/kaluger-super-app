import type { FC } from "react";

import { Alert, Typography, useMediaQuery, useTheme } from "@mui/material";
import { useUnit } from "effector-react";

import { TextField, Button } from "@shared";

import * as Styled from "./ForgotPasswordForm.styled";
import { forgotPasswordModel } from "../../models";

export const ForgotPasswordForm: FC = () => {
  const email = useUnit(forgotPasswordModel.$email);
  const isLoading = useUnit(forgotPasswordModel.$isLoading);
  const isSent = useUnit(forgotPasswordModel.$isSent);
  const successMessage = useUnit(forgotPasswordModel.$successMessage);
  const error = useUnit(forgotPasswordModel.$error);

  const actions = useUnit({
    emailChanged: forgotPasswordModel.emailChanged,
    formSubmitted: forgotPasswordModel.formSubmitted,
  });

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const isSubmitDisabled = isLoading || email.trim().length === 0;

  return (
    <Styled.FormPaper elevation={3} $isMobile={isMobile}>
      <Styled.HeaderBox $isMobile={isMobile}>
        <Styled.TitleTypography variant={isMobile ? "h5" : "h4"} component="h1" gutterBottom>
          Восстановление пароля
        </Styled.TitleTypography>
        <Typography variant={isMobile ? "body2" : "body1"} color="text.secondary">
          Введите email, на который зарегистрирован аккаунт. Мы отправим письмо со ссылкой для сброса пароля.
        </Typography>
      </Styled.HeaderBox>

      {isSent ? (
        <Styled.SuccessBox>
          <Alert severity="success">
            {successMessage ??
              "Если адрес зарегистрирован, мы отправили на него письмо со ссылкой для сброса пароля"}
          </Alert>
          <Typography variant="body2" color="text.secondary">
            Проверьте папку «Спам», если письмо не пришло в течение нескольких минут.
          </Typography>
          <Styled.RouterLink to="/login">
            <Button fullWidth variant="text" size={isMobile ? "medium" : "large"}>
              Вернуться ко входу
            </Button>
          </Styled.RouterLink>
        </Styled.SuccessBox>
      ) : (
        <>
          <TextField
            fullWidth
            label="Email"
            type="email"
            value={email}
            onChange={(e) => actions.emailChanged(e.target.value)}
            margin="normal"
            required
            autoFocus
            size={isMobile ? "small" : "medium"}
          />

          {error && <Alert severity="error">{error}</Alert>}

          <Styled.ActionsBox>
            <Button
              fullWidth
              variant="contained"
              size={isMobile ? "medium" : "large"}
              disabled={isSubmitDisabled}
              onClick={() => actions.formSubmitted()}
            >
              {isLoading ? "Отправка..." : "Отправить"}
            </Button>
            <Styled.RouterLink to="/login">
              <Button fullWidth variant="text" size={isMobile ? "medium" : "large"}>
                Вернуться ко входу
              </Button>
            </Styled.RouterLink>
          </Styled.ActionsBox>
        </>
      )}
    </Styled.FormPaper>
  );
};
