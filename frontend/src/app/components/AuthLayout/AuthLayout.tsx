import type { FC } from "react";

import * as Styled from "./AuthLayout.styled";
import type { AuthLayoutProps } from "../../app.types";

export const AuthLayout: FC<AuthLayoutProps> = ({ children }) => {
  return <Styled.Container>{children}</Styled.Container>;
};
