import type { FC } from "react";

import { Logout as LogoutIcon } from "@mui/icons-material";
import {
  Divider,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
} from "@mui/material";
import { useUnit } from "effector-react";
import { useLocation, useNavigate } from "react-router-dom";

import { studentUserModel } from "@entities";

import { STUDENT_SIDEBAR_ITEMS } from "./StudentSidebar.constants";
import { getInitials } from "./StudentSidebar.helpers";
import * as Styled from "./StudentSidebar.styled";
import type { StudentSidebarProps } from "./StudentSidebar.types";

export const StudentSidebar: FC<StudentSidebarProps> = ({
  drawerWidth,
  open,
  onClose,
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const session = useUnit(studentUserModel.$studentSession);

  const handleNavigate = (path: string) => {
    navigate(path);
    onClose();
  };

  const handleLogout = () => {
    studentUserModel.studentLoggedOut();
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
          🎓 Личный кабинет
        </Styled.StyledTitle>
      </Styled.StyledToolbar>

      <Divider />

      <Styled.ContentBox>
        <List>
          {STUDENT_SIDEBAR_ITEMS.map((item) => (
            <ListItem key={item.path} disablePadding>
              <ListItemButton
                selected={location.pathname.startsWith(item.path)}
                onClick={() => handleNavigate(item.path)}
              >
                <ListItemIcon>{item.icon}</ListItemIcon>
                <ListItemText primary={item.label} />
              </ListItemButton>
            </ListItem>
          ))}
        </List>
      </Styled.ContentBox>

      <Divider />

      <Styled.UserSection>
        {session && (
          <Styled.UserInfoBox>
            <Styled.StyledAvatar>
              {getInitials(session.name)}
            </Styled.StyledAvatar>
            <Styled.UserDetailsBox>
              <Styled.UserName variant="subtitle1">
                {session.name}
              </Styled.UserName>
              <Styled.UserEmail variant="body2" color="text.secondary">
                {session.email}
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
