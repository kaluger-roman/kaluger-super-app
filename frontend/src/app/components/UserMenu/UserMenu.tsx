import type { FC } from "react";

import { Menu } from "@mui/material";
import { useNavigate } from "react-router-dom";

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

  return (
    <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={onClose}>
      <Styled.StyledMenuItem onClick={() => onProfileClick()}>
        <Styled.StyledPersonIcon />
        Мои данные
      </Styled.StyledMenuItem>
    </Menu>
  );
};
