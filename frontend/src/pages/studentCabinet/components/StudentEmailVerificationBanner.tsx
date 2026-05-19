import type { FC } from "react";

import { Alert } from "@mui/material";

import { StudentEmailVerificationForm } from "@features";

import * as Styled from "./StudentEmailVerificationBanner.styled";

export const StudentEmailVerificationBanner: FC = () => {
  return (
    <Styled.Wrapper>
      <Alert severity="warning">
        Подтвердите email — без подтверждения некоторые возможности кабинета
        могут быть ограничены.
      </Alert>
      <StudentEmailVerificationForm />
    </Styled.Wrapper>
  );
};
