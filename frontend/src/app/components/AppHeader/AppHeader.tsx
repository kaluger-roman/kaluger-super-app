import type { FC } from "react";

import { Menu as MenuIcon } from "@mui/icons-material";

import * as Styled from "./AppHeader.styled";
import type { AppHeaderProps } from "../../types";
import { UserAvatar } from "../UserAvatar";

export const AppHeader: FC<AppHeaderProps> = ({ user, onMenuClick, onAvatarClick, isMobile }) => {
  return (
    <Styled.StyledAppBar position="fixed">
      <Styled.StyledToolbar>
        <Styled.MenuButton color="inherit" edge="start" onClick={onMenuClick}>
          <MenuIcon />
        </Styled.MenuButton>

        <Styled.TitleText variant={isMobile ? "h6" : "h5"} noWrap>
          <Styled.EmojiBox aria-label="graduation cap">🎓</Styled.EmojiBox>
          {isMobile ? "Kaluger" : <>Kaluger Tutor</>}
        </Styled.TitleText>

        <UserAvatar user={user} isMobile={isMobile} onClick={onAvatarClick} />
      </Styled.StyledToolbar>
    </Styled.StyledAppBar>
  );
};
