import type { User } from "@prisma/client";
import type { PublicUser } from "./auth.types";

export const PROFILE_USER_SELECT = {
  id: true,
  email: true,
  name: true,
  createdAt: true,
  isEmailVerified: true,
  taxEnabled: true,
} as const;

export const toPublicUser = (user: User): PublicUser => ({
  id: user.id,
  email: user.email,
  name: user.name,
  isEmailVerified: user.isEmailVerified,
  taxEnabled: user.taxEnabled,
});
