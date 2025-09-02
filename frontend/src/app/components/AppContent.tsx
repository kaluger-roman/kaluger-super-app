import React, { useState } from "react";
import { useLocation } from "react-router-dom";
import { Box, useMediaQuery, useTheme } from "@mui/material";
import { Sidebar } from "../../widgets";
import { AppHeader } from "./AppHeader";
import { AppRoutes } from "./AppRoutes";
import { logoutUser } from "../../entities";
import type { User } from "../../shared/types";

type AppContentProps = {
  isLoggedIn: boolean;
  user: User | null;
};

const DRAWER_WIDTH = 280;

export const AppContent: React.FC<AppContentProps> = ({ isLoggedIn, user }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  const isAuthPage = location.pathname === "/login";

  const handleLogout = () => {
    logoutUser();
  };

  if (isAuthPage) {
    return <AppRoutes isLoggedIn={isLoggedIn} />;
  }

  return (
    <Box sx={{ display: "flex", minHeight: "100vh" }}>
      {isLoggedIn && user && (
        <>
          <AppHeader
            user={user}
            onLogout={handleLogout}
            onMenuClick={() => setSidebarOpen(!sidebarOpen)}
            isMobile={isMobile}
          />
          <Sidebar
            drawerWidth={DRAWER_WIDTH}
            open={sidebarOpen}
            onClose={() => setSidebarOpen(false)}
          />
        </>
      )}

      <Box
        component="main"
        sx={{
          flexGrow: 1,
          width: "100%",
          mt: isLoggedIn && user ? { xs: 7, sm: 8 } : 0, // Account for AppBar height
        }}
      >
        <AppRoutes isLoggedIn={isLoggedIn} />
      </Box>
    </Box>
  );
};
