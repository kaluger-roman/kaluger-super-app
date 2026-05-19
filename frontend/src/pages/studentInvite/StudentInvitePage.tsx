import type { FC } from "react";
import { useEffect } from "react";

import { Alert, Typography } from "@mui/material";
import { useGate, useUnit } from "effector-react";
import { useNavigate, useParams } from "react-router-dom";

import { studentUserModel, userModel } from "@entities";
import { StudentInviteForm, studentInviteModel } from "@features";
import { getTutorToken } from "@shared";

import * as Styled from "./StudentInvitePage.styled";

export const StudentInvitePage: FC = () => {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();

  useGate(studentInviteModel.StudentInviteGate, { token: token ?? "" });

  const validationState = useUnit(studentInviteModel.$validationState);
  const isValidating = useUnit(studentInviteModel.$isValidating);
  const studentSession = useUnit(studentUserModel.$studentSession);
  const tutorSession = useUnit(userModel.$user);

  useEffect(() => {
    if (studentSession) {
      navigate("/student/cabinet", { replace: true });
    }
  }, [studentSession, navigate]);

  const tutorIsActive = tutorSession !== null || getTutorToken() !== null;

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
              снова откройте ссылку. Это нужно, чтобы не смешивать разные роли в одной сессии.
            </Alert>
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
