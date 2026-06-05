import type { FC, ReactElement } from "react";

import {
  Dashboard as DashboardIcon,
  School as StudentsIcon,
  Schedule as LessonsIcon,
  Assessment as ReportsIcon,
  Newspaper as NewsIcon,
  Logout as LogoutIcon,
  Person as PersonIcon,
  VideoCall as VideoCallIcon,
} from "@mui/icons-material";
import {
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Divider,
  Badge,
} from "@mui/material";
import { useUnit } from "effector-react";
import { useNavigate, useLocation } from "react-router-dom";

import { newsModel, userModel } from "@entities";
import { logoutConfirmationModel } from "@features";

import * as Styled from "./Sidebar.styled";

type NavigationItem = {
  label: string;
  path: string;
  icon: ReactElement;
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
  {
    label: "История звонков",
    path: "/call/history",
    icon: <VideoCallIcon />,
  },
  {
    label: "Новости",
    path: "/news",
    icon: <NewsIcon />,
  },
  {
    label: "Настройки",
    path: "/profile",
    icon: <PersonIcon />,
  },
];

type SidebarProps = {
  drawerWidth: number;
  open: boolean;
  onClose: () => void;
};

export const Sidebar: FC<SidebarProps> = ({ drawerWidth, open, onClose }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const user = useUnit(userModel.$user);
  const hasUnreadNews = useUnit(newsModel.$hasUnread);

  const handleNavigate = (path: string) => {
    navigate(path);
    onClose();
  };

  const handleLogout = () => {
    logoutConfirmationModel.logoutRequested();
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
    <Styled.StyledDrawer
      variant="temporary"
      open={open}
      onClose={onClose}
      $drawerWidth={drawerWidth}
    >
      <Styled.StyledToolbar>
        <Styled.StyledTitle variant="h6" noWrap component="div">
          🎓 Kaluger Tutor
        </Styled.StyledTitle>
      </Styled.StyledToolbar>

      <Divider />

      <Styled.ContentBox>
        <List>
          {navigationItems.map((item) => (
            <ListItem key={item.path} disablePadding>
              <ListItemButton
                selected={location.pathname === item.path}
                onClick={() => handleNavigate(item.path)}
              >
                <ListItemIcon>
                  {item.path === "/news" ? (
                    <Badge color="error" variant="dot" invisible={!hasUnreadNews}>
                      {item.icon}
                    </Badge>
                  ) : (
                    item.icon
                  )}
                </ListItemIcon>
                <ListItemText primary={item.label} />
              </ListItemButton>
            </ListItem>
          ))}
        </List>
      </Styled.ContentBox>

      <Divider />

      <Styled.UserSection>
        {user && (
          <Styled.UserInfoBox>
            <Styled.StyledAvatar>{getInitials(user.name)}</Styled.StyledAvatar>
            <Styled.UserDetailsBox>
              <Styled.UserName variant="subtitle1">{user.name}</Styled.UserName>
              <Styled.UserEmail variant="body2" color="text.secondary">
                {user.email}
              </Styled.UserEmail>
            </Styled.UserDetailsBox>
          </Styled.UserInfoBox>
        )}

        <Styled.LogoutButton onClick={handleLogout}>
          <Styled.LogoutIcon>
            <LogoutIcon />
          </Styled.LogoutIcon>
          <ListItemText primary="Выйти" />
        </Styled.LogoutButton>
      </Styled.UserSection>
    </Styled.StyledDrawer>
  );
};
