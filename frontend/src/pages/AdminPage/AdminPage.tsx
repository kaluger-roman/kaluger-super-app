import type { FC } from "react";

import { Button } from "@mui/material";
import { useGate, useUnit } from "effector-react";

import { AdminLogin, adminAuthModel, adminDataModel } from "@features/admin";

import * as Styled from "./AdminPage.styled";
import { OverviewSection, BackupSection } from "./components";

export const AdminPage: FC = () => {
  const isAuthenticated = useUnit(adminAuthModel.$isAdminAuthenticated);
  const tabIndex = useUnit(adminDataModel.$tabIndex);
  const actions = useUnit({
    logout: adminAuthModel.loggedOut,
    changeTab: adminDataModel.tabChanged,
  });

  useGate(adminDataModel.AdminPageGate);

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
        <Styled.StyledTabs
          value={tabIndex}
          onChange={(_, value) => actions.changeTab(value)}
        >
          <Styled.StyledTab label="Обзор" />
          <Styled.StyledTab label="Бэкапы" />
        </Styled.StyledTabs>

        {tabIndex === 0 && <OverviewSection />}
        {tabIndex === 1 && <BackupSection />}
      </Styled.StyledPaper>
    </Styled.StyledContainer>
  );
};
