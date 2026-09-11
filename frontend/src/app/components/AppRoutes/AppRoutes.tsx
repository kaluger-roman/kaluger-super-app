import { type FC, Suspense } from "react";

import { Routes, Route, Navigate } from "react-router-dom";

import { LoginForm, RegisterForm } from "@features/auth";
import { EmailVerificationForm } from "@features/emailVerification";

import {
  AdminPage,
  DashboardPage,
  ForgotPasswordPage,
  LessonsPage,
  NewsPage,
  ProfilePage,
  ReportsPage,
  ResetPasswordPage,
  StudentCabinetLayout,
  StudentInvitePage,
  StudentSchedulePage,
  StudentSettingsPage,
  StudentsPage,
  StudentVerifyEmailPage,
} from "./AppRoutes.constants";
import { AuthLayout } from "../AuthLayout";
import { AuthRoute } from "../AuthRoute";
import { ProtectedRoute } from "../ProtectedRoute";
import { RouteFallback } from "../RouteFallback";
import { StudentProtectedRoute } from "../StudentProtectedRoute";

type AppRoutesProps = {
  isLoggedIn: boolean;
};

export const AppRoutes: FC<AppRoutesProps> = ({ isLoggedIn }) => {
  return (
    <Suspense fallback={<RouteFallback />}>
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
        <Route path="/student-invite/:token" element={<StudentInvitePage />} />
        <Route path="/student/verify-email" element={<StudentVerifyEmailPage />} />
        <Route
          path="/student/cabinet"
          element={
            <StudentProtectedRoute element={<StudentCabinetLayout />} />
          }
        >
          <Route index element={<Navigate to="schedule" replace />} />
          <Route path="schedule" element={<StudentSchedulePage />} />
          <Route path="settings" element={<StudentSettingsPage />} />
        </Route>
        <Route
          path="/"
          element={<ProtectedRoute element={<DashboardPage />} isLoggedIn={isLoggedIn} />}
        />
      </Routes>
    </Suspense>
  );
};
