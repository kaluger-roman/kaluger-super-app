import type { FC } from "react";

import { useUnit } from "effector-react";
import { Navigate } from "react-router-dom";

import { verificationModel } from "@entities";

import type { ProtectedRouteProps } from "../../types";

export const ProtectedRoute: FC<ProtectedRouteProps> = ({ element, isLoggedIn }) => {
  const verificationEmail = useUnit(verificationModel.$verificationEmail);

  if (!isLoggedIn) {
    return <Navigate to="/login" replace />;
  }

  if (verificationEmail) {
    return <Navigate to="/verify-email" replace />;
  }

  return element;
};
