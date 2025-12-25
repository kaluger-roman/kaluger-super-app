import type { FC } from "react";

import type { User } from "@shared";

import * as Styled from "./UserAvatar.styled";

type UserAvatarProps = {
  user: User;
  isMobile: boolean;
};

export const UserAvatar: FC<UserAvatarProps> = ({ user, isMobile }) => {
  return (
    <Styled.Container>
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
