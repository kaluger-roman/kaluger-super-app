import type { FC, KeyboardEvent, MouseEvent } from "react";

import type { User } from "@shared";

import * as Styled from "./UserAvatar.styled";

type UserAvatarProps = {
  user: User;
  isMobile: boolean;
  onClick?: (event: MouseEvent<HTMLElement> | KeyboardEvent<HTMLElement>) => void;
};

export const UserAvatar: FC<UserAvatarProps> = ({ user, isMobile, onClick }) => {
  const handleKeyDown = (event: KeyboardEvent<HTMLElement>): void => {
    if (!onClick) return;
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onClick(event);
    }
  };

  return (
    <Styled.Container
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      aria-label={onClick ? `Меню пользователя ${user.name}` : undefined}
      aria-haspopup={onClick ? "menu" : undefined}
      onKeyDown={onClick ? handleKeyDown : undefined}
    >
      <Styled.AvatarBox>
        {user.name
          ?.split(" ")
          .map((n) => n[0])
          .join("")
          .slice(0, 2)}
      </Styled.AvatarBox>
      {!isMobile && (
        <Styled.UserName variant="body1" title={user.name}>
          {user.name}
        </Styled.UserName>
      )}
    </Styled.Container>
  );
};
