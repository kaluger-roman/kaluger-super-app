export type CreateUserDto = {
  email: string;
  password: string;
  name: string;
};

export type LoginDto = {
  email: string;
  password: string;
};

export type JwtPayload = {
  userId: string;
  email: string;
};

export type VerifyEmailDto = {
  email: string;
  code: string;
};

export type ResendVerificationDto = {
  email: string;
};

export type ChangePasswordDto = {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
};

export type ChangeEmailDto = {
  newEmail: string;
  password: string;
};

export type VerifyEmailChangeDto = {
  code: string;
};

export type VerifyEmailChangeResult = {
  token: string;
  user: {
    id: string;
    email: string;
    name: string;
    createdAt: Date;
    isEmailVerified: boolean;
    taxEnabled: boolean;
  };
};

export type ForgotPasswordDto = {
  email: string;
};

export type VerifyResetTokenDto = {
  token: string;
};

export type ResetPasswordDto = {
  token: string;
  newPassword: string;
  confirmPassword: string;
};

export type UpdateProfileDto = {
  name?: string;
  taxEnabled?: boolean;
};
