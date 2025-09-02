import type { User } from "../shared/types";

export type AppHeaderProps = {
  user: User;
  onLogout: () => void;
  onMenuClick: () => void;
  isMobile: boolean;
};

export type UserAvatarProps = {
  user: User;
  isMobile: boolean;
};

export type AuthLayoutProps = {
  children: React.ReactNode;
};

export type ProtectedRouteProps = {
  element: React.ReactElement;
  isLoggedIn: boolean;
};

export type AuthRouteProps = {
  element: React.ReactElement;
  isLoggedIn: boolean;
};
