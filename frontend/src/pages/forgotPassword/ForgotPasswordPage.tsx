import type { FC } from "react";

import { ForgotPasswordForm } from "@features/forgotPassword";

import * as Styled from "./ForgotPasswordPage.styled";

export const ForgotPasswordPage: FC = () => (
  <Styled.Container>
    <ForgotPasswordForm />
  </Styled.Container>
);
