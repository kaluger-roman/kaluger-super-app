import type { User } from "./user";

export type AuthRequest = {
  email: string;
  password: string;
};

export type RegisterRequest = AuthRequest & {
  name: string;
};

export type AuthResponse = {
  token?: string;
  user: User & { isEmailVerified?: boolean };
  message?: string;
};

export type VerifyEmailRequest = {
  email: string;
  code: string;
};

export type ResendVerificationRequest = {
  email: string;
};
