import { lazy } from "react";

export const AdminPage = lazy(() =>
  import("@pages/AdminPage").then((m) => ({ default: m.AdminPage }))
);
export const ReportsPage = lazy(() =>
  import("@pages/ReportsPage").then((m) => ({ default: m.ReportsPage }))
);
export const ProfilePage = lazy(() =>
  import("@pages/profile").then((m) => ({ default: m.ProfilePage }))
);
export const NewsPage = lazy(() => import("@pages/news").then((m) => ({ default: m.NewsPage })));
export const ForgotPasswordPage = lazy(() =>
  import("@pages/forgotPassword").then((m) => ({
    default: m.ForgotPasswordPage,
  }))
);
export const ResetPasswordPage = lazy(() =>
  import("@pages/resetPassword").then((m) => ({
    default: m.ResetPasswordPage,
  }))
);
export const DashboardPage = lazy(() =>
  import("@pages/dashboard").then((m) => ({ default: m.DashboardPage }))
);
export const LessonsPage = lazy(() =>
  import("@pages/lessons").then((m) => ({ default: m.LessonsPage }))
);
export const StudentsPage = lazy(() =>
  import("@pages/students").then((m) => ({ default: m.StudentsPage }))
);
export const StudentCabinetLayout = lazy(() =>
  import("@pages/studentCabinet").then((m) => ({
    default: m.StudentCabinetLayout,
  }))
);
export const StudentInvitePage = lazy(() =>
  import("@pages/studentInvite").then((m) => ({
    default: m.StudentInvitePage,
  }))
);
export const StudentSchedulePage = lazy(() =>
  import("@pages/studentSchedule").then((m) => ({
    default: m.StudentSchedulePage,
  }))
);
export const StudentSettingsPage = lazy(() =>
  import("@pages/studentSettings").then((m) => ({
    default: m.StudentSettingsPage,
  }))
);
export const StudentVerifyEmailPage = lazy(() =>
  import("@pages/studentVerifyEmail").then((m) => ({
    default: m.StudentVerifyEmailPage,
  }))
);
