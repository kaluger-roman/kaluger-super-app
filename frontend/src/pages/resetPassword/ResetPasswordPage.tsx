import type { FC } from "react";

import { useSearchParams } from "react-router-dom";

import { ResetPasswordForm } from "@features/resetPassword";
import { Button } from "@shared";

import * as Styled from "./ResetPasswordPage.styled";

export const ResetPasswordPage: FC = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") ?? "";

  if (!token) {
    return (
      <Styled.Container>
        <Styled.InvalidLinkAlert severity="error">
          Ссылка некорректна. Проверьте, что вы открыли её полностью из письма.
        </Styled.InvalidLinkAlert>
        <Styled.RouterLink to="/forgot-password">
          <Button variant="contained">Запросить новую ссылку</Button>
        </Styled.RouterLink>
      </Styled.Container>
    );
  }

  return (
    <Styled.Container>
      <ResetPasswordForm token={token} />
    </Styled.Container>
  );
};
