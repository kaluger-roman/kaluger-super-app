import React from "react";
import {
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Toolbar,
  Typography,
  Divider,
  Box,
  Avatar,
} from "@mui/material";
import {
  Dashboard as DashboardIcon,
  School as StudentsIcon,
  Schedule as LessonsIcon,
  Assessment as ReportsIcon,
  Logout as LogoutIcon,
} from "@mui/icons-material";
import { useNavigate, useLocation } from "react-router-dom";
import { useStore } from "effector-react";
import { $user, logoutUser } from "../../entities";

type NavigationItem = {
  label: string;
  path: string;
  icon: React.ReactElement;
};

const navigationItems: NavigationItem[] = [
  {
    label: "Главная",
    path: "/",
    icon: <DashboardIcon />,
  },
  {
    label: "Ученики",
    path: "/students",
    icon: <StudentsIcon />,
  },
  {
    label: "Уроки",
    path: "/lessons",
    icon: <LessonsIcon />,
  },
  {
    label: "Отчеты",
    path: "/reports",
    icon: <ReportsIcon />,
  },
];

type SidebarProps = {
  drawerWidth: number;
  open: boolean;
  onClose: () => void;
};

export const Sidebar: React.FC<SidebarProps> = ({
  drawerWidth,
  open,
  onClose,
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const user = useStore($user);

  const handleNavigate = (path: string) => {
    navigate(path);
    onClose();
  };

  const handleLogout = () => {
    logoutUser();
    navigate("/login");
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <Drawer
      variant="temporary"
      open={open}
      onClose={onClose}
      sx={{
        width: drawerWidth,
        flexShrink: 0,
        "& .MuiDrawer-paper": {
          width: drawerWidth,
          boxSizing: "border-box",
        },
      }}
    >
      <Toolbar sx={{ minHeight: { xs: 56, sm: 64 } }}>
        <Typography
          variant="h6"
          noWrap
          component="div"
          sx={{
            fontWeight: 700,
            color: "primary.main",
            fontSize: { xs: "1.1rem", sm: "1.25rem" },
          }}
        >
          🎓 Kaluger Tutor
        </Typography>
      </Toolbar>

      <Divider />

      <Box sx={{ overflow: "auto", flex: 1 }}>
        <List>
          {navigationItems.map((item) => (
            <ListItem key={item.path} disablePadding>
              <ListItemButton
                selected={location.pathname === item.path}
                onClick={() => handleNavigate(item.path)}
              >
                <ListItemIcon>{item.icon}</ListItemIcon>
                <ListItemText primary={item.label} />
              </ListItemButton>
            </ListItem>
          ))}
        </List>
      </Box>

      <Divider />

      <Box sx={{ p: 2 }}>
        {user && (
          <Box sx={{ display: "flex", alignItems: "center", mb: 2, gap: 2 }}>
            <Avatar
              sx={{
                bgcolor: "primary.main",
                width: { xs: 36, sm: 40 },
                height: { xs: 36, sm: 40 },
                fontSize: { xs: "0.875rem", sm: "1rem" },
              }}
            >
              {getInitials(user.name)}
            </Avatar>
            <Box sx={{ minWidth: 0, flex: 1 }}>
              <Typography
                variant="subtitle1"
                sx={{
                  fontWeight: 600,
                  fontSize: { xs: "0.875rem", sm: "1rem" },
                }}
              >
                {user.name}
              </Typography>
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{
                  fontSize: { xs: "0.75rem", sm: "0.875rem" },
                }}
              >
                {user.email}
              </Typography>
            </Box>
          </Box>
        )}

        <ListItemButton
          onClick={handleLogout}
          sx={{
            m: 0,
            px: 1,
            "&:hover": {
              color: "error.contrastText",
            },
          }}
        >
          <ListItemIcon sx={{ minWidth: 36 }}>
            <LogoutIcon />
          </ListItemIcon>
          <ListItemText primary="Выйти" />
        </ListItemButton>
      </Box>
    </Drawer>
  );
};
