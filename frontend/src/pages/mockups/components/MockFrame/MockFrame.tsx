import type { FC, ReactNode } from "react";

import { Menu as MenuIcon } from "@mui/icons-material";

import * as Styled from "./MockFrame.styled";

type MockFrameProps = {
  title: string;
  children?: ReactNode;
};

// A stand-in for the app header, since the real layouts need a signed-in session.
export const MockFrame: FC<MockFrameProps> = ({ title, children }) => (
  <Styled.RootBox>
    <Styled.StyledAppBar position="sticky" color="primary">
      <Styled.StyledToolbar>
        <Styled.MenuButton edge="start" aria-label="Открыть меню">
          <MenuIcon />
        </Styled.MenuButton>
        <Styled.HeaderTitle variant="h6">{title}</Styled.HeaderTitle>
      </Styled.StyledToolbar>
    </Styled.StyledAppBar>
    <Styled.ContentBox>{children}</Styled.ContentBox>
  </Styled.RootBox>
);
