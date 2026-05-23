import type { FC } from "react";

import { Alert, Box, Button, Typography } from "@mui/material";
import { useGate, useUnit } from "effector-react";
import { useParams } from "react-router-dom";

import { userModel } from "@entities";
import { StudentInviteForm, studentInviteModel } from "@features";
import { getTutorToken } from "@shared";

import * as Styled from "./StudentInvitePage.styled";

export const StudentInvitePage: FC = () => {
  const { token } = useParams<{ token: string }>();

  useGate(studentInviteModel.StudentInviteGate, { token: token ?? "" });

  const validationState = useUnit(studentInviteModel.$validationState);
  const isValidating = useUnit(studentInviteModel.$isValidating);
  const tutorSession = useUnit(userModel.$user);

  const tutorIsActive = tutorSession !== null || getTutorToken() !== null;

  const handleLogoutTutor = () => {
    userModel.tutorSessionCleared();
  };

  if (tutorIsActive) {
    return (
      <Styled.RootBox>
        <Styled.CenteredBox>
          <Styled.MessagePaper variant="outlined">
            <Typography variant="h5" component="h1" fontWeight={600}>
              Вы вошли как преподаватель
            </Typography>
            <Alert severity="warning">
              Чтобы зарегистрировать аккаунт ученика, выйдите из текущей сессии преподавателя и
              продолжите регистрацию. Это нужно, чтобы не смешивать разные роли в одной сессии.
            </Alert>
            <Box display="flex" justifyContent="flex-start">
              <Button variant="contained" color="warning" onClick={handleLogoutTutor}>
                Выйти из сессии преподавателя
              </Button>
            </Box>
          </Styled.MessagePaper>
        </Styled.CenteredBox>
      </Styled.RootBox>
    );
  }

  if (isValidating || validationState === null) {
    return <Styled.RootBox />;
  }

  if (!validationState.valid) {
    return (
      <Styled.RootBox>
        <Styled.CenteredBox>
          <Styled.MessagePaper variant="outlined">
            <Typography variant="h5" component="h1" fontWeight={600} gutterBottom>
              Ссылка недействительна
            </Typography>
            <Styled.SpacedAlert severity="error">
              Ссылка-приглашение недействительна — она могла быть уже использована или отозвана.
              Обратитесь к своему преподавателю за новой.
            </Styled.SpacedAlert>
          </Styled.MessagePaper>
        </Styled.CenteredBox>
      </Styled.RootBox>
    );
  }

  return (
    <Styled.RootBox>
      <Styled.CenteredBox>
        <StudentInviteForm />
      </Styled.CenteredBox>
    </Styled.RootBox>
  );
};
