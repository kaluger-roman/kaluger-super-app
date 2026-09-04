import { type FC, lazy, Suspense } from "react";

import { useGate } from "effector-react";
import { Routes, Route, Navigate } from "react-router-dom";

import { LoginForm, RegisterForm } from "@features/auth";
import { EmailVerificationForm } from "@features/emailVerification";

import { blockingModel } from "../../model";
import { AuthLayout } from "../AuthLayout";
import { AuthRoute } from "../AuthRoute";
import { ProtectedRoute } from "../ProtectedRoute";
import { StudentProtectedRoute } from "../StudentProtectedRoute";

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
const StudentCabinetLayout = lazy(() =>
  import("@pages/studentCabinet").then((m) => ({
    default: m.StudentCabinetLayout,
  })),
);
const StudentInvitePage = lazy(() =>
  import("@pages/studentInvite").then((m) => ({
    default: m.StudentInvitePage,
  })),
);
const StudentSchedulePage = lazy(() =>
  import("@pages/studentSchedule").then((m) => ({
    default: m.StudentSchedulePage,
  })),
);
const StudentSettingsPage = lazy(() =>
  import("@pages/studentSettings").then((m) => ({
    default: m.StudentSettingsPage,
  })),
);
const StudentVerifyEmailPage = lazy(() =>
  import("@pages/studentVerifyEmail").then((m) => ({
    default: m.StudentVerifyEmailPage,
  })),
);

// Renders nothing itself — mounting it raises RouteChunkGate, and the single
// blocking overlay in App covers the chunk load (a second Backdrop here
// stacked dim layers when a request ran while a chunk was loading).
const RouteFallback: FC = () => {
  useGate(blockingModel.RouteChunkGate);

  return null;
};

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
