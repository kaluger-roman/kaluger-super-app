import type { FC } from "react";
import { useState } from "react";

import { Menu as MenuIcon } from "@mui/icons-material";
import { useGate, useUnit } from "effector-react";
import { Outlet } from "react-router-dom";

import { studentUserModel } from "@entities";
import { CallButton, callModel } from "@features";
import { StudentSidebar } from "@widgets";

import { DRAWER_WIDTH } from "./StudentCabinetLayout.constants";
import * as Styled from "./StudentCabinetLayout.styled";

export const StudentCabinetLayout: FC = () => {
  useGate(studentUserModel.StudentCabinetGate);
  const session = useUnit(studentUserModel.$studentSession);
  const callStarted = useUnit(callModel.callStarted);

  const [drawerOpen, setDrawerOpen] = useState(false);

  const tutorName = session?.tutor?.name ?? "Репетитор";
  const handleCall = () =>
    callStarted({ tutorId: "tutor", peerName: tutorName });

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
          {session?.tutor && (
            <Styled.HeaderCallButton>
              <CallButton
                label="Позвонить"
                variant="outlined"
                color="inherit"
                onClick={handleCall}
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
