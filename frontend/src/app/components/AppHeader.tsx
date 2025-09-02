import React from "react";
import { AppBar, Toolbar, Typography, IconButton, Box } from "@mui/material";
import { Menu as MenuIcon } from "@mui/icons-material";
import { UserAvatar } from "./UserAvatar";
import type { AppHeaderProps } from "../types";

export const AppHeader: React.FC<AppHeaderProps> = ({
  user,
  onLogout,
  onMenuClick,
  isMobile,
}) => {
  return (
    <AppBar
      position="fixed"
      sx={{ zIndex: (theme) => theme.zIndex.drawer + 1 }}
    >
      <Toolbar sx={{ minHeight: { xs: 56, sm: 64 } }}>
        <IconButton
          color="inherit"
          edge="start"
          onClick={onMenuClick}
          sx={{ mr: { xs: 1, sm: 2 } }}
        >
          <MenuIcon />
        </IconButton>

        <Typography
          variant={isMobile ? "h6" : "h5"}
          noWrap
          component="div"
          sx={{
            flexGrow: 1,
            fontWeight: 700,
            letterSpacing: { xs: 1, sm: 2 },
            color: "white",
            textShadow: "0 2px 8px rgba(76, 110, 245, 0.18)",
            display: "flex",
            alignItems: "center",
            gap: { xs: 0.5, sm: 1 },
            userSelect: "none",
          }}
        >
          <Box
            component="span"
            sx={{
              fontSize: { xs: 24, sm: 32 },
              mr: { xs: 0.5, sm: 1 },
              filter: "drop-shadow(0 2px 4px #764ba2aa)",
            }}
            aria-label="graduation cap"
          >
            🎓
          </Box>
          {isMobile ? "Kaluger" : <>Kaluger Tutor</>}
        </Typography>

        <UserAvatar user={user} isMobile={isMobile} />
      </Toolbar>
    </AppBar>
  );
};
