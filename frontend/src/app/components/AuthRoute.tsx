import React from "react";
import { Navigate } from "react-router-dom";
import type { AuthRouteProps } from "../types";

export const AuthRoute: React.FC<AuthRouteProps> = ({
  element,
  isLoggedIn,
}) => {
  return isLoggedIn ? <Navigate to="/dashboard" replace /> : element;
};
