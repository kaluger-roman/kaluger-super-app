import type { FC } from "react";

import { Button, Typography, useMediaQuery, useTheme } from "@mui/material";
import { useUnit } from "effector-react";
import { Navigate } from "react-router-dom";

import { studentUserModel } from "@entities";
import { StudentEmailVerificationForm } from "@features";

import * as Styled from "./StudentVerifyEmailPage.styled";

export const StudentVerifyEmailPage: FC = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  const session = useUnit(studentUserModel.$studentSession);
  const isAuthenticated = useUnit(studentUserModel.$isStudentAuthenticated);

  const handleLogout = () => {
    studentUserModel.studentLoggedOut();
  };

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (session?.isEmailVerified) {
    return <Navigate to="/student/cabinet" replace />;
  }

  return (
    <Styled.Container>
      <Styled.StyledPaper elevation={3} $isMobile={isMobile}>
        <Styled.IconBox>📧</Styled.IconBox>

        <Typography
          variant={isMobile ? "h5" : "h4"}
          component="h1"
          textAlign="center"
          fontWeight={600}
        >
          Подтверждение email
        </Typography>

        {session?.email && (
          <Typography variant="body2" color="text.secondary" textAlign="center">
            Мы отправили код подтверждения на <strong>{session.email}</strong>
          </Typography>
        )}

        <StudentEmailVerificationForm />

        <Styled.Footer>
          <Button onClick={handleLogout} variant="text">
            Выйти
          </Button>
        </Styled.Footer>
      </Styled.StyledPaper>
    </Styled.Container>
  );
};
