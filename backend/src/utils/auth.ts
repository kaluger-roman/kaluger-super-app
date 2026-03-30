import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import type { AdminJwtPayload, JwtPayload } from "../types";

export const hashPassword = async (password: string): Promise<string> => {
  const saltRounds = 12;
  return bcrypt.hash(password, saltRounds);
};

export const comparePassword = async (
  password: string,
  hashedPassword: string
): Promise<boolean> => {
  return bcrypt.compare(password, hashedPassword);
};

const getJwtSecret = (): string =>
  process.env.JWT_SECRET || "fallback-secret-key-jdjdjjdjdjdjdiiiipq";

export const generateToken = (payload: JwtPayload): string => {
  return jwt.sign(payload, getJwtSecret(), { expiresIn: "7d" });
};

export const generateAdminToken = (
  payload: AdminJwtPayload
): string => {
  return jwt.sign(payload, getJwtSecret(), { expiresIn: "24h" });
};

export const verifyToken = (token: string): JwtPayload | null => {
  try {
    return jwt.verify(token, getJwtSecret()) as JwtPayload;
  } catch {
    return null;
  }
};

export const verifyAdminToken = (
  token: string
): AdminJwtPayload | null => {
  try {
    const payload = jwt.verify(token, getJwtSecret()) as AdminJwtPayload;
    if (!payload.isAdmin) return null;
    return payload;
  } catch {
    return null;
  }
};

export const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export const validatePassword = (password: string): boolean => {
  // At least 8 characters, one uppercase, one lowercase, one digit
  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d@$!%*?&]{8,}$/;
  return passwordRegex.test(password);
};
