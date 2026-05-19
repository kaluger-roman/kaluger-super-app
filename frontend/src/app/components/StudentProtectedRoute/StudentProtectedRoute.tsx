import type { FC, ReactElement } from "react";

import { useUnit } from "effector-react";
import { Navigate } from "react-router-dom";

import { studentUserModel } from "@entities";

type StudentProtectedRouteProps = {
  element: ReactElement;
};

export const StudentProtectedRoute: FC<StudentProtectedRouteProps> = ({
  element,
}) => {
  const isAuthenticated = useUnit(studentUserModel.$isStudentAuthenticated);

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return element;
};
