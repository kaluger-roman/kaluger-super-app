import type { FC } from "react";

import { Divider, Menu } from "@mui/material";
import { useNavigate } from "react-router-dom";

import { logoutConfirmationModel } from "@features";

import * as Styled from "./UserMenu.styled";

type UserMenuProps = {
  anchorEl: HTMLElement | null;
  onClose: () => void;
};

export const UserMenu: FC<UserMenuProps> = ({ anchorEl, onClose }) => {
  const navigate = useNavigate();

  const onProfileClick = () => {
    navigate("/profile");
    onClose();
  };

  const onLogoutClick = () => {
    logoutConfirmationModel.logoutRequested();
    onClose();
  };

  return (
    <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={onClose}>
      <Styled.StyledMenuItem onClick={() => onProfileClick()}>
        <Styled.StyledPersonIcon />
        Мои данные
      </Styled.StyledMenuItem>
      <Divider />
      <Styled.StyledMenuItem onClick={() => onLogoutClick()}>
        <Styled.StyledLogoutIcon />
        Выйти
      </Styled.StyledMenuItem>
    </Menu>
  );
};
