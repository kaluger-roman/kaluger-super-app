import React from "react";
import { Routes, Route } from "react-router-dom";
import { LoginForm, RegisterForm } from "../../features/auth";
import { DashboardPage } from "../../pages/dashboard";
import { LessonsPage } from "../../pages/lessons";
import { StudentsPage } from "../../pages/students";
import { ReportsPage } from "../../pages";
import { ProtectedRoute } from "./ProtectedRoute";
import { AuthRoute } from "./AuthRoute";
import { AuthLayout } from "./AuthLayout";

type AppRoutesProps = {
  isLoggedIn: boolean;
};

export const AppRoutes: React.FC<AppRoutesProps> = ({ isLoggedIn }) => {
  return (
    <Routes>
      <Route
        path="/login"
        element={
          <AuthRoute
            element={
              <AuthLayout>
                <LoginForm />
              </AuthLayout>
            }
            isLoggedIn={isLoggedIn}
          />
        }
      />
      <Route
        path="/register"
        element={
          <AuthRoute
            element={
              <AuthLayout>
                <RegisterForm />
              </AuthLayout>
            }
            isLoggedIn={isLoggedIn}
          />
        }
      />
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute element={<DashboardPage />} isLoggedIn={isLoggedIn} />
        }
      />
      <Route
        path="/lessons"
        element={
          <ProtectedRoute element={<LessonsPage />} isLoggedIn={isLoggedIn} />
        }
      />
      <Route
        path="/students"
        element={
          <ProtectedRoute element={<StudentsPage />} isLoggedIn={isLoggedIn} />
        }
      />
      <Route
        path="/reports"
        element={
          <ProtectedRoute element={<ReportsPage />} isLoggedIn={isLoggedIn} />
        }
      />
      <Route
        path="/"
        element={
          <ProtectedRoute element={<DashboardPage />} isLoggedIn={isLoggedIn} />
        }
      />
    </Routes>
  );
};
