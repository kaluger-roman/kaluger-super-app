import { useState } from "react";
import type { FC } from "react";

import { Button, Tabs } from "@mui/material";
import { useGate, useUnit } from "effector-react";

import { AdminLogin, adminModel } from "@features/admin";

import * as Styled from "./AdminPage.styled";
import { OverviewSection, BackupSection } from "./components";

export const AdminPage: FC = () => {
  const isAuthenticated = useUnit(adminModel.$isAdminAuthenticated);
  const actions = useUnit({ logout: adminModel.loggedOut });
  const [tabIndex, setTabIndex] = useState(0);

  useGate(adminModel.AdminPageGate);

  if (!isAuthenticated) {
    return <AdminLogin />;
  }

  return (
    <Styled.StyledContainer maxWidth="lg">
      <Styled.StyledHeader>
        <Styled.StyledTitle variant="h4">Админ-панель</Styled.StyledTitle>
        <Button variant="outlined" onClick={() => actions.logout()}>
          Выход
        </Button>
      </Styled.StyledHeader>

      <Styled.StyledPaper>
        <Tabs
          value={tabIndex}
          onChange={(_, value) => setTabIndex(value)}
        >
          <Styled.StyledTab label="Обзор" />
          <Styled.StyledTab label="Бэкапы" />
        </Tabs>

        {tabIndex === 0 && <OverviewSection />}
        {tabIndex === 1 && <BackupSection />}
      </Styled.StyledPaper>
    </Styled.StyledContainer>
  );
};
