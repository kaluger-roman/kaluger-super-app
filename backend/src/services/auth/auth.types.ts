export type PublicUser = {
  id: string;
  email: string;
  name: string;
  isEmailVerified: boolean;
  taxEnabled: boolean;
};

export type ProfileUser = PublicUser & { createdAt: Date };

export type RegisterUserInput = {
  email: string;
  password: string;
  name: string;
};

export type LoginUserInput = {
  email: string;
  password: string;
};

export type LoginUserResult = {
  token: string;
  user: PublicUser;
};

export type UpdateProfileInput = {
  name?: string;
  taxEnabled?: boolean;
};
