import type { FC } from "react";

import { useUnit } from "effector-react";

import { adminDataModel } from "@features/admin";

import { formatUptime } from "./OverviewSection.helpers";
import * as Styled from "./OverviewSection.styled";

export const OverviewSection: FC = () => {
  const overview = useUnit(adminDataModel.$overview);

  if (!overview) return null;

  return (
    <Styled.StyledGrid>
      <Styled.StyledCard>
        <Styled.StyledValue>{overview.usersCount}</Styled.StyledValue>
        <Styled.StyledLabel>Пользователей</Styled.StyledLabel>
      </Styled.StyledCard>
      <Styled.StyledCard>
        <Styled.StyledValue>{overview.studentsCount}</Styled.StyledValue>
        <Styled.StyledLabel>Студентов</Styled.StyledLabel>
      </Styled.StyledCard>
      <Styled.StyledCard>
        <Styled.StyledValue>{overview.lessonsCount}</Styled.StyledValue>
        <Styled.StyledLabel>Уроков</Styled.StyledLabel>
      </Styled.StyledCard>
      <Styled.StyledCard>
        <Styled.StyledValue>{formatUptime(overview.serverUptime)}</Styled.StyledValue>
        <Styled.StyledLabel>Аптайм сервера</Styled.StyledLabel>
      </Styled.StyledCard>
    </Styled.StyledGrid>
  );
};
