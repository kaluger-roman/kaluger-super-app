import type { FC } from "react";

import { Routes, Route } from "react-router-dom";

import { LoginForm, RegisterForm } from "@features/auth";
import { EmailVerificationForm } from "@features/emailVerification";
import {
  AdminPage,
  ReportsPage,
  ProfilePage,
  NewsPage,
  ForgotPasswordPage,
  ResetPasswordPage,
} from "@pages";
import { DashboardPage } from "@pages/dashboard";
import { LessonsPage } from "@pages/lessons";
import { StudentsPage } from "@pages/students";

import { AuthLayout } from "../AuthLayout";
import { AuthRoute } from "../AuthRoute";
import { ProtectedRoute } from "../ProtectedRoute";

type AppRoutesProps = {
  isLoggedIn: boolean;
};

export const AppRoutes: FC<AppRoutesProps> = ({ isLoggedIn }) => {
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
        path="/verify-email"
        element={
          <AuthRoute
            element={
              <AuthLayout>
                <EmailVerificationForm />
              </AuthLayout>
            }
            isLoggedIn={isLoggedIn}
          />
        }
      />
      <Route
        path="/dashboard"
        element={<ProtectedRoute element={<DashboardPage />} isLoggedIn={isLoggedIn} />}
      />
      <Route
        path="/lessons"
        element={<ProtectedRoute element={<LessonsPage />} isLoggedIn={isLoggedIn} />}
      />
      <Route
        path="/students"
        element={<ProtectedRoute element={<StudentsPage />} isLoggedIn={isLoggedIn} />}
      />
      <Route
        path="/reports"
        element={<ProtectedRoute element={<ReportsPage />} isLoggedIn={isLoggedIn} />}
      />
      <Route
        path="/news"
        element={<ProtectedRoute element={<NewsPage />} isLoggedIn={isLoggedIn} />}
      />
      <Route
        path="/profile"
        element={<ProtectedRoute element={<ProfilePage />} isLoggedIn={isLoggedIn} />}
      />
      <Route path="/admin" element={<AdminPage />} />
      <Route
        path="/forgot-password"
        element={
          <AuthLayout>
            <ForgotPasswordPage />
          </AuthLayout>
        }
      />
      <Route
        path="/reset-password"
        element={
          <AuthLayout>
            <ResetPasswordPage />
          </AuthLayout>
        }
      />
      <Route
        path="/"
        element={<ProtectedRoute element={<DashboardPage />} isLoggedIn={isLoggedIn} />}
      />
    </Routes>
  );
};
