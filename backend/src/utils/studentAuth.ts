import jwt from "jsonwebtoken";
import type { StudentJwtPayload } from "../types";

const getStudentJwtSecret = (): string => {
  const secret = process.env.STUDENT_JWT_SECRET;
  if (!secret) {
    throw new Error("STUDENT_JWT_SECRET is not set");
  }
  return secret;
};

export const generateStudentToken = (
  payload: StudentJwtPayload
): string => {
  return jwt.sign(payload, getStudentJwtSecret(), { expiresIn: "7d" });
};

export const verifyStudentToken = (
  token: string
): StudentJwtPayload | null => {
  try {
    const payload = jwt.verify(
      token,
      getStudentJwtSecret()
    ) as StudentJwtPayload;
    if (!payload.isStudent) return null;
    return payload;
  } catch {
    return null;
  }
};
