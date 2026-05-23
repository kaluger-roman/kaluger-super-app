import type { FC, ReactElement } from "react";

import { useUnit } from "effector-react";
import { Navigate } from "react-router-dom";

import { studentUserModel } from "@entities";

type StudentProtectedRouteProps = {
  element: ReactElement;
};

export const StudentProtectedRoute: FC<StudentProtectedRouteProps> = ({ element }) => {
  const isAuthenticated = useUnit(studentUserModel.$isStudentAuthenticated);
  const session = useUnit(studentUserModel.$studentSession);

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (session && !session.isEmailVerified) {
    return <Navigate to="/student/verify-email" replace />;
  }

  return element;
};
