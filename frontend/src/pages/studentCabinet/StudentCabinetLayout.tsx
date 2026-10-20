import type { FC } from "react";
import { useState } from "react";

import { Menu as MenuIcon } from "@mui/icons-material";
import { useGate, useUnit } from "effector-react";
import { Outlet } from "react-router-dom";

import { studentUserModel } from "@entities";
import { CallButton } from "@features";
import { StudentSidebar } from "@widgets";

import { DRAWER_WIDTH } from "./StudentCabinetLayout.constants";
import * as studentCabinetLayoutModel from "./StudentCabinetLayout.model";
import * as Styled from "./StudentCabinetLayout.styled";

export const StudentCabinetLayout: FC = () => {
  useGate(studentUserModel.StudentCabinetGate);
  const session = useUnit(studentUserModel.$studentSession);
  const actions = useUnit({
    tutorCallRequested: studentCabinetLayoutModel.tutorCallRequested,
  });

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
          <Styled.HeaderTitle variant="h6">Кабинет ученика</Styled.HeaderTitle>
          {session?.tutor && (
            <Styled.HeaderCallButton>
              <CallButton
                label="Позвонить"
                variant="outlined"
                color="inherit"
                onClick={() => actions.tutorCallRequested()}
              />
            </Styled.HeaderCallButton>
          )}
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
