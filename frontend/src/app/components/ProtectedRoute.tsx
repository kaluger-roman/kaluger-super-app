import React from "react";
import { Navigate } from "react-router-dom";
import type { ProtectedRouteProps } from "../types";

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  element,
  isLoggedIn,
}) => {
  return isLoggedIn ? element : <Navigate to="/login" replace />;
};
