import type { FC } from "react";

import { useUnit } from "effector-react";
import { Navigate } from "react-router-dom";

import { userModel } from "@entities";

import type { AuthRouteProps } from "../../types";

export const AuthRoute: FC<AuthRouteProps> = ({ element, isLoggedIn }) => {
  const user = useUnit(userModel.$user);

  return isLoggedIn && user?.isEmailVerified ? <Navigate to="/dashboard" replace /> : element;
};
