import type { FC } from "react";

import { useUnit } from "effector-react";

import { adminModel } from "@features/admin";

import * as Styled from "./OverviewSection.styled";

const formatUptime = (seconds: number): string => {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  const parts: string[] = [];
  if (days > 0) parts.push(`${days}д`);
  if (hours > 0) parts.push(`${hours}ч`);
  parts.push(`${minutes}м`);

  return parts.join(" ");
};

export const OverviewSection: FC = () => {
  const overview = useUnit(adminModel.$overview);

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
