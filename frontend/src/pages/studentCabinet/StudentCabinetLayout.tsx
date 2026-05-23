import type { FC } from "react";
import { useState } from "react";

import { Menu as MenuIcon } from "@mui/icons-material";
import { useGate } from "effector-react";
import { Outlet } from "react-router-dom";

import { studentUserModel } from "@entities";
import { StudentSidebar } from "@widgets";

import { DRAWER_WIDTH } from "./StudentCabinetLayout.constants";
import * as Styled from "./StudentCabinetLayout.styled";

export const StudentCabinetLayout: FC = () => {
  useGate(studentUserModel.StudentCabinetGate);

  const [drawerOpen, setDrawerOpen] = useState(false);

  return (
    <Styled.RootBox>
      <Styled.StyledAppBar position="sticky" color="primary">
        <Styled.StyledToolbar>
          <Styled.MenuButton
            edge="start"
            aria-label="Открыть меню"
            onClick={() => setDrawerOpen(true)}
          >
            <MenuIcon />
          </Styled.MenuButton>
          <Styled.HeaderTitle variant="h6">
            Кабинет ученика
          </Styled.HeaderTitle>
        </Styled.StyledToolbar>
      </Styled.StyledAppBar>

      <StudentSidebar
        drawerWidth={DRAWER_WIDTH}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
      />

      <Styled.ContentBox>
        <Outlet />
      </Styled.ContentBox>
    </Styled.RootBox>
  );
};
