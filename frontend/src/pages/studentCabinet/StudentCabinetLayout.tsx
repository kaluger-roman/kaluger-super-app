import type { FC } from "react";
import { useState } from "react";

import { Menu as MenuIcon } from "@mui/icons-material";
import { Typography } from "@mui/material";
import { useGate, useUnit } from "effector-react";
import { Outlet } from "react-router-dom";

import { studentUserModel } from "@entities";
import { StudentSidebar } from "@widgets";

import { StudentEmailVerificationBanner } from "./components";
import { DRAWER_WIDTH } from "./StudentCabinetLayout.constants";
import * as Styled from "./StudentCabinetLayout.styled";

export const StudentCabinetLayout: FC = () => {
  useGate(studentUserModel.StudentCabinetGate);

  const [drawerOpen, setDrawerOpen] = useState(false);

  const session = useUnit(studentUserModel.$studentSession);

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
          <Typography variant="h6" component="div">
            Кабинет ученика
          </Typography>
        </Styled.StyledToolbar>
      </Styled.StyledAppBar>

      <StudentSidebar
        drawerWidth={DRAWER_WIDTH}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
      />

      <Styled.ContentBox>
        {session && !session.isEmailVerified && (
          <StudentEmailVerificationBanner />
        )}
        <Outlet />
      </Styled.ContentBox>
    </Styled.RootBox>
  );
};
