import { type FC, lazy, Suspense } from "react";

import { CircularProgress } from "@mui/material";
import { Routes, Route } from "react-router-dom";

import { LoginForm, RegisterForm } from "@features/auth";
import { EmailVerificationForm } from "@features/emailVerification";

import * as Styled from "./AppRoutes.styled";
import { AuthLayout } from "../AuthLayout";
import { AuthRoute } from "../AuthRoute";
import { ProtectedRoute } from "../ProtectedRoute";

const AdminPage = lazy(() =>
  import("@pages/AdminPage").then((m) => ({ default: m.AdminPage })),
);
const ReportsPage = lazy(() =>
  import("@pages/ReportsPage").then((m) => ({ default: m.ReportsPage })),
);
const ProfilePage = lazy(() =>
  import("@pages/profile").then((m) => ({ default: m.ProfilePage })),
);
const NewsPage = lazy(() =>
  import("@pages/news").then((m) => ({ default: m.NewsPage })),
);
const ScreenPage = lazy(() =>
  import("@pages/screen").then((m) => ({ default: m.ScreenPage })),
);
const ForgotPasswordPage = lazy(() =>
  import("@pages/forgotPassword").then((m) => ({
    default: m.ForgotPasswordPage,
  })),
);
const ResetPasswordPage = lazy(() =>
  import("@pages/resetPassword").then((m) => ({
    default: m.ResetPasswordPage,
  })),
);
const DashboardPage = lazy(() =>
  import("@pages/dashboard").then((m) => ({ default: m.DashboardPage })),
);
const LessonsPage = lazy(() =>
  import("@pages/lessons").then((m) => ({ default: m.LessonsPage })),
);
const StudentsPage = lazy(() =>
  import("@pages/students").then((m) => ({ default: m.StudentsPage })),
);

const RouteFallback: FC = () => (
  <Styled.FallbackContainer>
    <CircularProgress />
  </Styled.FallbackContainer>
);

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
        <Route
          path="/screen"
          element={<ProtectedRoute element={<ScreenPage />} isLoggedIn={isLoggedIn} />}
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
    </Suspense>
  );
};
