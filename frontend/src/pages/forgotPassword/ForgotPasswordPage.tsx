import type { FC } from "react";

import { useNavigate } from "react-router-dom";

import { Button } from "@shared";

import * as Styled from "./ForgotPasswordPage.styled";

export const ForgotPasswordPage: FC = () => {
  const navigate = useNavigate();

  return (
    <Styled.Container>
      <Styled.Title variant="h4">Восстановление пароля</Styled.Title>
      <Styled.Description variant="body1">
        Эта функция находится в разработке. Пожалуйста, обратитесь в поддержку
        для смены пароля.
      </Styled.Description>
      <Button variant="contained" onClick={() => navigate(-1)}>
        Назад
      </Button>
    </Styled.Container>
  );
};
