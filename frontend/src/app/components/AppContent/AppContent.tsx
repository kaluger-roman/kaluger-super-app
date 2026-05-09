import type { FC } from "react";
import { useState } from "react";

import { useMediaQuery, useTheme } from "@mui/material";
import { useUnit } from "effector-react";
import { useLocation } from "react-router-dom";

import { LogoutConfirmationDialog, logoutConfirmationModel } from "@features";
import type { User } from "@shared/types";
import { Sidebar, sidebarModel } from "@widgets";

import * as Styled from "./AppContent.styled";
import { AppHeader } from "../AppHeader";
import { AppRoutes } from "../AppRoutes";
import { UserMenu } from "../UserMenu";

type AppContentProps = {
  isLoggedIn: boolean;
  user: User | null;
};

const DRAWER_WIDTH = 280;

export const AppContent: FC<AppContentProps> = ({ isLoggedIn, user }) => {
  const sidebarOpen = useUnit(sidebarModel.$isSidebarOpen);
  const location = useLocation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  const [userMenuAnchor, setUserMenuAnchor] = useState<null | HTMLElement>(null);

  const isAuthPage =
    location.pathname === "/login" ||
    location.pathname === "/register" ||
    location.pathname === "/verify-email" ||
    location.pathname === "/forgot-password";

  const handleLogout = () => {
    logoutConfirmationModel.logoutRequested();
  };

  if (isAuthPage) {
    return <AppRoutes isLoggedIn={isLoggedIn} />;
  }

  return (
    <Styled.Container>
      {isLoggedIn && user && (
        <>
          <AppHeader
            user={user}
            onLogout={handleLogout}
            onMenuClick={sidebarModel.sidebarToggled}
            onAvatarClick={(event: React.MouseEvent<HTMLElement>) =>
              setUserMenuAnchor(event.currentTarget)
            }
            isMobile={isMobile}
          />
          <Sidebar
            drawerWidth={DRAWER_WIDTH}
            open={sidebarOpen}
            onClose={sidebarModel.sidebarClosed}
          />
          <UserMenu anchorEl={userMenuAnchor} onClose={() => setUserMenuAnchor(null)} />
          <LogoutConfirmationDialog />
        </>
      )}

      <Styled.MainContent component="main" $isLoggedIn={isLoggedIn && !!user}>
        <AppRoutes isLoggedIn={isLoggedIn} />
      </Styled.MainContent>
    </Styled.Container>
  );
};
